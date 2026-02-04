'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { addMinutes, format, isAfter, isBefore, isEqual, parse, set, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addDoc, collection, query, where, getDocs, Timestamp, doc } from 'firebase/firestore';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, type UserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ServiceWithId } from '@/app/services/page';
import type { ScheduleSettings } from '@/components/schedule/ScheduleSettingsForm';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Clock, Users, Scissors, User, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Types for data used in this page
interface Appointment {
  id: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  startTime: Timestamp;
  endTime: Timestamp;
}

interface BlockedTime {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
}

interface Category {
  id: string;
  name: string;
}

// Main component
export default function BookAppointmentPage() {
  // Hooks
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // State management for the booking flow
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceWithId | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<UserProfile | 'any' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [finalProfessional, setFinalProfessional] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      toast({ title: 'Acesso Negado', description: 'Você precisa fazer login para agendar um horário.', variant: 'destructive'});
      router.push('/login');
    }
  }, [user, isUserLoading, router, toast]);

  // Data fetching
  const servicesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const { data: services, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'serviceCategories') : null, [firestore]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesCollection);

  const professionalsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('role', '==', 'professional')) : null, [firestore]);
  const { data: allProfessionals, isLoading: areProfessionalsLoading } = useCollection<UserProfile>(professionalsQuery);

  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([]);
  const [dailyBlockedTimes, setDailyBlockedTimes] = useState<BlockedTime[]>([]);
  const [areSlotsLoading, setAreSlotsLoading] = useState(false);
  
  // This effect fetches all appointments and blocked times for the selected date
  useEffect(() => {
    if (!selectedDate || !firestore) return;

    const fetchDailyData = async () => {
      setAreSlotsLoading(true);

      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = addMinutes(startOfSelectedDay, 24 * 60 -1);

      // Fetch appointments
      const aptQuery = query(
        collection(firestore, 'appointments'),
        where('startTime', '>=', Timestamp.fromDate(startOfSelectedDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfSelectedDay))
      );
      const aptsSnapshot = await getDocs(aptQuery);
      const appointments = aptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setDailyAppointments(appointments);
      
      // Fetch blocked times (general and all professionals for that day)
      const btQuery = query(
        collection(firestore, 'blockedTimes'),
        where('startTime', '>=', Timestamp.fromDate(startOfSelectedDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfSelectedDay))
      );
      const btSnapshot = await getDocs(btQuery);
      const blockedTimes = btSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlockedTime));
      
      // TODO: Also fetch professional specific blocked times...
      
      setDailyBlockedTimes(blockedTimes);
      setAreSlotsLoading(false);
    };

    fetchDailyData();

  }, [selectedDate, firestore]);
  
  const establishmentSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'scheduleSettings', 'main') : null, [firestore]);
  const { data: establishmentSettings, isLoading: areEstablishmentSettingsLoading } = useDoc<ScheduleSettings>(establishmentSettingsRef);
  
  const professionalSchedules = useMemo(() => {
      // TODO: In a real app, this would fetch all professional schedules.
      return {};
  }, []);

  const parseDuration = (durationStr: string): number => parseInt(durationStr, 10) || 30;

  // The core availability calculation logic
  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService || !selectedProfessional || !establishmentSettings || !allProfessionals) return [];
    setAreSlotsLoading(true);

    const serviceDuration = parseDuration(selectedService.duration);
    const dayOfWeek = format(selectedDate, 'eeee').toLowerCase() as keyof ScheduleSettings['workingHours'];
    
    const professionalsToCheck = selectedProfessional === 'any' 
      ? allProfessionals.filter(p => p.serviceIds?.includes(selectedService.id)) 
      : [selectedProfessional];

    const slots: { time: string; professionalId: string; professionalName: string }[] = [];

    for (const prof of professionalsToCheck) {
      // Simplified: using establishment schedule for all professionals
      const profSchedule = establishmentSettings.workingHours[dayOfWeek];
      if (!profSchedule || !profSchedule.isOpen) continue;

      const workDayStart = parse(profSchedule.startTime, 'HH:mm', selectedDate);
      const workDayEnd = parse(profSchedule.endTime, 'HH:mm', selectedDate);

      const busyBlocks = [
        ...dailyAppointments.filter(a => a.professionalId === prof.id).map(a => ({ start: a.startTime.toDate(), end: a.endTime.toDate() })),
        ...dailyBlockedTimes.map(b => ({ start: b.startTime.toDate(), end: b.endTime.toDate() })),
        ...(profSchedule.breaks?.map(b => ({ start: parse(b.startTime, 'HH:mm', selectedDate), end: parse(b.endTime, 'HH:mm', selectedDate) })) || [])
      ];

      let currentTime = workDayStart;
      while (isBefore(addMinutes(currentTime, serviceDuration), workDayEnd) || isEqual(addMinutes(currentTime, serviceDuration), workDayEnd)) {
        const slotStart = currentTime;
        const slotEnd = addMinutes(slotStart, serviceDuration);

        const isOverlapping = busyBlocks.some(block => isBefore(slotStart, block.end) && isAfter(slotEnd, block.start));

        if (!isOverlapping && isAfter(slotStart, new Date())) { // Check if slot is in the future
          slots.push({
            time: format(slotStart, 'HH:mm'),
            professionalId: prof.id,
            professionalName: prof.name
          });
        }
        currentTime = addMinutes(currentTime, 15); // Check every 15 minutes
      }
    }
    
    // Deduplicate slots if "any" was selected, keeping the first available professional for each time
    const uniqueSlots = Array.from(new Map(slots.map(s => [s.time, s])).values());
    uniqueSlots.sort((a, b) => a.time.localeCompare(b.time));

    setAreSlotsLoading(false);
    return uniqueSlots;

  }, [selectedDate, selectedService, selectedProfessional, dailyAppointments, dailyBlockedTimes, establishmentSettings, allProfessionals]);
  
  const professionalsForService = useMemo(() => {
    if (!selectedService || !allProfessionals) return [];
    return allProfessionals.filter(p => p.serviceIds?.includes(selectedService.id));
  }, [selectedService, allProfessionals]);

  const servicesByCategory = useMemo(() => {
    if (!services || !categories) return [];
    
    const categoryMap = new Map(categories.map(cat => [cat.id, { ...cat, services: [] as ServiceWithId[] }]));

    services.forEach(service => {
        if (service.categoryId && categoryMap.has(service.categoryId)) {
            categoryMap.get(service.categoryId)!.services.push(service);
        }
    });

    return Array.from(categoryMap.values()).filter(cat => cat.services.length > 0);
  }, [services, categories]);


  const handleSelectService = (service: ServiceWithId) => {
    setSelectedService(service);
    setStep(2);
  };
  
  const handleSelectProfessional = (prof: UserProfile | 'any') => {
    setSelectedProfessional(prof);
    setStep(3);
  };

  const handleSelectTime = (time: string, profId: string) => {
    setSelectedTime(time);
    const finalProf = allProfessionals?.find(p => p.id === profId);
    if(finalProf){
        setFinalProfessional(finalProf);
    }
    setStep(4);
  }

  const handleConfirmBooking = async () => {
      if (!user || !firestore || !selectedService || !selectedDate || !selectedTime || !finalProfessional) {
        toast({ title: 'Erro', description: 'Faltam informações para o agendamento.', variant: 'destructive'});
        return;
      }
      setIsSubmitting(true);
      
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = set(selectedDate, { hours, minutes, seconds: 0, milliseconds: 0 });
      const endTime = addMinutes(startTime, parseDuration(selectedService.duration));

      const newAppointment = {
        customerId: user.uid,
        serviceId: selectedService.id,
        professionalId: finalProfessional.id,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        notes: '',
      };

      try {
        await addDoc(collection(firestore, 'appointments'), newAppointment);
        toast({ title: 'Agendamento Confirmado!', description: `Seu horário para ${selectedService.name} às ${selectedTime} foi confirmado.`});
        router.push('/schedule');
      } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'appointments',
            operation: 'create',
            requestResourceData: newAppointment,
        }));
        toast({ title: 'Erro ao Agendar', description: 'Não foi possível confirmar seu agendamento. Tente novamente.', variant: 'destructive'});
      } finally {
        setIsSubmitting(false);
      }
  }

  const StepHeader = ({ stepNum, title, children }: { stepNum: number, title: string, children: React.ReactNode }) => (
    <div className={`p-4 border rounded-lg ${step > stepNum ? 'border-primary' : ''} ${step === stepNum ? 'border-accent' : 'border-border'}`}>
        <h2 className="text-xl font-headline font-semibold flex items-center gap-2">
            {step > stepNum ? <Check className="w-6 h-6 text-primary" /> : <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">{stepNum}</div>}
            {title}
        </h2>
        {step === stepNum && <div className="mt-4">{children}</div>}
    </div>
  );

  const isLoading = isUserLoading || areServicesLoading || areProfessionalsLoading || areEstablishmentSettingsLoading || areCategoriesLoading;

  if (isLoading) {
      return (
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
              <h1 className="text-3xl font-headline font-bold tracking-tight">Novo Agendamento</h1>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Novo Agendamento
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-6">
          {/* Step 1: Select Service */}
          <StepHeader stepNum={1} title="Escolha o Serviço">
             <Accordion type="multiple" className="w-full" defaultValue={categories?.map(c => c.id)}>
                {areCategoriesLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full"/>
                        <Skeleton className="h-12 w-full"/>
                    </div>
                ) : servicesByCategory.length > 0 ? (
                    servicesByCategory.map(category => (
                        <AccordionItem value={category.id} key={category.id}>
                            <AccordionTrigger className="text-xl font-headline hover:no-underline">{category.name}</AccordionTrigger>
                            <AccordionContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {category.services.map(service => (
                                        <Card key={service.id} onClick={() => handleSelectService(service)} className="cursor-pointer hover:border-primary transition-colors">
                                            <CardHeader>
                                                <CardTitle className="font-headline text-lg">{service.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{service.description}</p>
                                            </CardContent>
                                            <CardFooter className="flex justify-between text-sm">
                                                <span className="font-bold text-primary">{`R$${service.price.toFixed(2).replace('.', ',')}`}</span>
                                                <span className="text-muted-foreground">{service.duration}</span>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-4">Nenhum serviço encontrado. Peça para um administrador adicionar serviços e categorias.</p>
                )}
             </Accordion>
          </StepHeader>

          {/* Step 2: Select Professional */}
          {step >= 2 && selectedService && (
            <StepHeader stepNum={2} title="Escolha o Profissional">
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <Card onClick={() => handleSelectProfessional('any')} className="cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center p-4">
                      <Users className="w-10 h-10 mb-2 text-muted-foreground"/>
                      <p className="font-semibold text-center">Qualquer um disponível</p>
                  </Card>
                  {professionalsForService.map(prof => (
                      <Card key={prof.id} onClick={() => handleSelectProfessional(prof)} className="cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center p-4">
                          <Avatar className="w-12 h-12 mb-2">
                              <AvatarImage src={prof.photoURL || ''} alt={prof.name} />
                              <AvatarFallback>{prof.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-center">{prof.name}</p>
                      </Card>
                  ))}
              </div>
            </StepHeader>
          )}

          {/* Step 3: Select Date and Time */}
           {step >= 3 && selectedProfessional && (
                <StepHeader stepNum={3} title="Escolha a Data e o Horário">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < startOfDay(new Date())}
                                className="rounded-md border"
                                locale={ptBR}
                            />
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <h3 className="font-semibold text-lg mb-4 text-center">
                                Horários Disponíveis para {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}
                            </h3>
                            {areSlotsLoading ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10"/>)}
                                </div>
                            ) : availableSlots.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {availableSlots.map(slot => (
                                        <Button key={slot.time} variant="outline" onClick={() => handleSelectTime(slot.time, slot.professionalId)}>
                                            {slot.time}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-4">Nenhum horário disponível para esta data.</p>
                            )}
                        </div>
                    </div>
                </StepHeader>
           )}

           {/* Step 4: Confirmation */}
            {step >= 4 && selectedService && selectedDate && selectedTime && finalProfessional && (
                 <StepHeader stepNum={4} title="Confirme seu Agendamento">
                     <Card>
                         <CardHeader><CardTitle className="font-headline">Resumo do Agendamento</CardTitle></CardHeader>
                         <CardContent className="space-y-4 text-muted-foreground">
                             <div className="flex items-center gap-2"><Scissors className="w-5 h-5 text-primary"/><span><strong>Serviço:</strong> {selectedService.name}</span></div>
                             <div className="flex items-center gap-2"><User className="w-5 h-5 text-primary"/><span><strong>Profissional:</strong> {finalProfessional.name}</span></div>
                             <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-primary"/><span><strong>Data:</strong> {format(selectedDate, 'PPP', { locale: ptBR })}</span></div>
                             <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary"/><span><strong>Horário:</strong> {selectedTime}</span></div>
                         </CardContent>
                         <CardFooter className="flex-col items-start gap-4">
                             <Button onClick={handleConfirmBooking} size="lg" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Confirmar Agendamento
                            </Button>
                             <Button variant="ghost" onClick={() => { setStep(3); setSelectedTime(null); setFinalProfessional(null); }} className="flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> Voltar</Button>
                         </CardFooter>
                     </Card>
                 </StepHeader>
            )}
      </div>
    </div>
  );
}

    