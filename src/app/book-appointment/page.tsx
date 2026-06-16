'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { addMinutes, format, isAfter, isBefore, isEqual, parse, set, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addDoc, collection, query, where, getDocs, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, type UserProfile, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ServiceWithId } from '@/app/services/page';
import type { ScheduleSettings } from '@/components/schedule/ScheduleSettingsForm';
import type { EstablishmentSettings } from '@/app/establishment/page';
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
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface BlockedTime {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
  professionalId?: string;
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
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
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
      toast({ title: 'Acesso Negado', description: 'Você precisa fazer login para agendar um horário.', variant: 'destructive' });
      router.push('/login');
    }
  }, [user, isUserLoading, router, toast]);

  // Data fetching
  const servicesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const { data: services, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'serviceCategories') : null, [firestore]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesCollection);

  const professionalsQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'users'), where('role', '==', 'professional')) : null, [firestore, user]);
  const { data: allProfessionals, isLoading: areProfessionalsLoading } = useCollection<UserProfile>(professionalsQuery);

  const scheduleSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'scheduleSettings', 'main') : null, [firestore]);
  const { data: scheduleSettings, isLoading: areScheduleSettingsLoading } = useDoc<ScheduleSettings>(scheduleSettingsRef);

  const establishmentSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: establishmentSettings, isLoading: areEstablishmentSettingsLoading } = useDoc<EstablishmentSettings>(establishmentSettingsRef);

  // Membership Data
  const userMembershipsCollection = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, 'userMemberships'), where('userId', '==', user.uid), where('status', '==', 'active')) : null,
    [firestore, user]
  );
  const { data: userMemberships, isLoading: areMembershipsLoading } = useCollection<any>(userMembershipsCollection);

  const membershipPlansCollection = useMemoFirebase(
    () => firestore ? collection(firestore, 'membershipPlans') : null,
    [firestore]
  );
  const { data: membershipPlans, isLoading: arePlansLoading } = useCollection<any>(membershipPlansCollection);

  // State for daily data fetched via getDocs
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[] | null>(null);
  const [areAppointmentsLoading, setAreAppointmentsLoading] = useState(false);
  const [dailyBlockedTimes, setDailyBlockedTimes] = useState<BlockedTime[] | null>(null);
  const [areBlockedTimesLoading, setAreBlockedTimesLoading] = useState(false);

  // Fetch daily appointments and blocked times with getDocs for stability
  useEffect(() => {
    if (!firestore || !selectedDate) {
      return;
    }

    const fetchDailyData = async () => {
      setAreAppointmentsLoading(true);
      setAreBlockedTimesLoading(true);

      try {
        const startOfSelectedDay = startOfDay(selectedDate);
        const endOfSelectedDay = addDays(startOfSelectedDay, 1);

        // Fetch appointments
        const appointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('startTime', '>=', Timestamp.fromDate(startOfSelectedDay)),
          where('startTime', '<', Timestamp.fromDate(endOfSelectedDay))
        );
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        setDailyAppointments(appointmentsData);

        // Fetch blocked times
        const blockedTimesQuery = query(
          collection(firestore, 'blockedTimes'),
          where('startTime', '>=', Timestamp.fromDate(startOfSelectedDay)),
          where('startTime', '<', Timestamp.fromDate(endOfSelectedDay))
        );
        const blockedTimesSnapshot = await getDocs(blockedTimesQuery);
        const blockedTimesData = blockedTimesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlockedTime));
        setDailyBlockedTimes(blockedTimesData);

      } catch (error) {
        console.error("Error fetching daily data:", error);
        toast({
          title: "Erro ao carregar horários",
          description: "Não foi possível buscar os dados de agendamento para este dia.",
          variant: "destructive"
        });
        setDailyAppointments(null);
        setDailyBlockedTimes(null);
      } finally {
        setAreAppointmentsLoading(false);
        setAreBlockedTimesLoading(false);
      }
    };

    fetchDailyData();

  }, [firestore, selectedDate, toast]);

  const parseDuration = (durationStr: string): number => parseInt(durationStr, 10) || 30;

  // State for professional schedules
  const [professionalSchedules, setProfessionalSchedules] = useState<Record<string, ScheduleSettings>>({});

  // Fetch professional schedules when professionals are loaded or selected
  useEffect(() => {
    if (!firestore || !allProfessionals) return;

    const fetchSchedules = async () => {
      const schedules: Record<string, ScheduleSettings> = {};

      const profsToFetch = selectedProfessional && selectedProfessional !== 'any'
        ? [selectedProfessional]
        : allProfessionals;

      await Promise.all(profsToFetch.map(async (prof) => {
        try {
          const scheduleRef = doc(firestore, `users/${prof.id}/scheduleSettings/main`);
          const snapshot = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', prof.id))); // This is wrong, I need getDoc.
          // Correct way:
          const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(scheduleRef));

          if (docSnap.exists()) {
            schedules[prof.id] = docSnap.data() as ScheduleSettings;
          }
        } catch (e) {
          console.warn(`Could not fetch schedule for professional ${prof.id}`, e);
        }
      }));

      setProfessionalSchedules(prev => ({ ...prev, ...schedules }));
    };

    fetchSchedules();
  }, [firestore, allProfessionals, selectedProfessional]);

  // The core availability calculation logic
  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService || !selectedProfessional || !scheduleSettings || !allProfessionals || areAppointmentsLoading || areBlockedTimesLoading) return [];

    const serviceDuration = parseDuration(selectedService.duration);
    const dayOfWeek = format(selectedDate, 'eeee').toLowerCase() as keyof ScheduleSettings['workingHours'];

    const professionalsToCheck = selectedProfessional === 'any'
      ? allProfessionals.filter(p => p.serviceIds?.includes(selectedService.id))
      : [selectedProfessional];

    const slots: { time: string; professionalId: string; professionalName: string }[] = [];

    for (const prof of professionalsToCheck) {
      // Use professional schedule if available, otherwise establishment schedule
      const profSpecificSchedule = professionalSchedules[prof.id];
      const settingsToUse = profSpecificSchedule || scheduleSettings;

      const daySchedule = settingsToUse.workingHours[dayOfWeek];
      if (!daySchedule || !daySchedule.isOpen) continue;

      const workDayStart = parse(daySchedule.startTime, 'HH:mm', selectedDate);
      const workDayEnd = parse(daySchedule.endTime, 'HH:mm', selectedDate);

      const busyBlocks = [
        ...(dailyAppointments || []).filter(a => a.professionalId === prof.id && a.status !== 'cancelled').map(a => ({ start: a.startTime.toDate(), end: a.endTime.toDate() })),
        ...(dailyBlockedTimes || [])
          .filter(b => !b.professionalId || b.professionalId === prof.id)
          .map(b => ({ start: b.startTime.toDate(), end: b.endTime.toDate() })),
        ...(daySchedule.breaks?.map(b => ({ start: parse(b.startTime, 'HH:mm', selectedDate), end: parse(b.endTime, 'HH:mm', selectedDate) })) || [])
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

    return uniqueSlots;

  }, [selectedDate, selectedService, selectedProfessional, dailyAppointments, dailyBlockedTimes, scheduleSettings, allProfessionals, areAppointmentsLoading, areBlockedTimesLoading, professionalSchedules]);


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
    if (finalProf) {
      setFinalProfessional(finalProf);
    }
    setStep(4);
  }

  const activeMembership = userMemberships?.[0];
  const activePlan = membershipPlans?.find(p => p.id === activeMembership?.planId);
  const isServiceCovered = selectedService ? activePlan?.includedServiceIds?.includes(selectedService.id) : false;
  const hasUsageRemaining = activeMembership ? (activeMembership.maxUsesPerMonth === 999 || activeMembership.usageCount < activeMembership.maxUsesPerMonth) : false;
  const isCoveredByPlan = !!(isServiceCovered && hasUsageRemaining);

  const handleConfirmBooking = async () => {
    if (!user || !userProfile || !firestore || !selectedService || !selectedDate || !selectedTime || !finalProfessional) {
      toast({ title: 'Erro', description: 'Faltam informações para o agendamento.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = set(selectedDate, { hours, minutes, seconds: 0, milliseconds: 0 });
    const endTime = addMinutes(startTime, parseDuration(selectedService.duration));

    const finalPrice = isCoveredByPlan ? 0 : selectedService.price;

    const newAppointment = {
      customerId: user.uid,
      customerName: userProfile.name || user.displayName || 'Cliente',
      customerPhotoURL: userProfile.photoURL || user.photoURL || '',
      customerEmail: userProfile.email || user.email!,
      customerPhoneNumber: userProfile.phoneNumber || '',
      serviceId: selectedService.id,
      professionalId: finalProfessional.id,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      status: 'scheduled',
      notes: isCoveredByPlan ? 'Incluso no Clube de Assinaturas' : '',
      // Denormalized data
      serviceName: selectedService.name,
      professionalName: finalProfessional.name,
      serviceDuration: selectedService.duration,
      servicePrice: finalPrice,
      reminderSent: false,
    };

    try {
      const appointmentsRef = collection(firestore, 'appointments');
      await addDoc(appointmentsRef, newAppointment);
      
      // Update membership usage if covered
      if (isCoveredByPlan && activeMembership?.id) {
        const membershipRef = doc(firestore, 'userMemberships', activeMembership.id);
        await updateDoc(membershipRef, {
          usageCount: activeMembership.usageCount + 1
        });
      }

      toast({ title: 'Agendamento Confirmado!', description: `Seu horário para ${selectedService.name} às ${selectedTime} foi confirmado.` });
      router.push('/schedule');
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'appointments',
        operation: 'create',
        requestResourceData: newAppointment,
      }));
      toast({ title: 'Erro ao Agendar', description: 'Não foi possível confirmar seu agendamento. Tente novamente.', variant: 'destructive' });
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

  const areSlotsLoading = areAppointmentsLoading || areBlockedTimesLoading;
  const isLoading = isUserLoading || isProfileLoading || areServicesLoading || areProfessionalsLoading || areScheduleSettingsLoading || areEstablishmentSettingsLoading || areCategoriesLoading || areMembershipsLoading || arePlansLoading;

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
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-card border rounded-2xl flex items-center justify-center shadow-sm overflow-hidden">
          {establishmentSettings?.logoUrl ? (
            <img src={establishmentSettings.logoUrl} alt={establishmentSettings.name || 'Logo'} className="w-full h-full object-contain p-2" />
          ) : (
            <CalendarIcon className="w-10 h-10 text-primary" />
          )}
        </div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Novo Agendamento
        </h1>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Step 1: Select Service */}
        <StepHeader stepNum={1} title="Escolha a Categoria e o Serviço">
          <Accordion type="single" collapsible className="w-full">
            {areCategoriesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
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
                <Users className="w-10 h-10 mb-2 text-muted-foreground" />
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
            <div className="mt-6 flex justify-start">
              <Button variant="ghost" onClick={() => { setStep(1); setSelectedService(null); }} className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Voltar para Serviços
              </Button>
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
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}
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
            <div className="mt-6 flex justify-start">
              <Button variant="ghost" onClick={() => { setStep(2); setSelectedProfessional(null); setSelectedTime(null); }} className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Voltar para Profissionais
              </Button>
            </div>
          </StepHeader>
        )}

        {/* Step 4: Confirmation */}
        {step >= 4 && selectedService && selectedDate && selectedTime && finalProfessional && (
          <StepHeader stepNum={4} title="Confirme seu Agendamento">
            <Card>
              <CardHeader><CardTitle className="font-headline">Resumo do Agendamento</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <div className="flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" /><span><strong>Serviço:</strong> {selectedService.name}</span></div>
                <div className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /><span><strong>Profissional:</strong> {finalProfessional.name}</span></div>
                <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-primary" /><span><strong>Data:</strong> {format(selectedDate, 'PPP', { locale: ptBR })}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /><span><strong>Horário:</strong> {selectedTime}</span></div>
                
                {isCoveredByPlan ? (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="font-semibold text-primary mb-1">Benefício do Clube Aplicado 🎉</p>
                    <div className="flex justify-between items-center text-lg">
                      <span className="line-through text-muted-foreground">R$ {selectedService.price.toFixed(2).replace('.', ',')}</span>
                      <span className="font-bold text-primary">R$ 0,00</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex justify-between items-center text-lg">
                    <span className="font-semibold">Valor Total:</span>
                    <span className="font-bold">R$ {selectedService.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-4">
                <Button onClick={handleConfirmBooking} size="lg" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Agendamento
                </Button>
                <Button variant="ghost" onClick={() => { setStep(3); setSelectedTime(null); setFinalProfessional(null); }} className="flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Voltar para Data e Hora</Button>
              </CardFooter>
            </Card>
          </StepHeader>
        )}
      </div>
    </div>
  );
}
