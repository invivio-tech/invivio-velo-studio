import React, { useState, useEffect } from 'react';
import { useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, getDocs, getDoc, doc, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { format, addDays, isSameDay, addMinutes, parse, isBefore, isEqual, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Calendar, User, Scissors, Clock, ArrowRight, ArrowLeft, Loader2, Search, Star } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: string | number;
  description?: string;
}

interface Professional {
  id: string;
  name: string;
  active?: boolean;
  photoURL?: string;
  role?: string;
  disabled?: boolean;
  serviceIds?: string[];
}

interface Appointment {
  id: string;
  professionalId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: string;
}

interface BlockedTime {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  professionalId?: string;
}

interface ScheduleSettings {
  workingHours: {
    [key: string]: {
      isOpen: boolean;
      startTime: string;
      endTime: string;
      breaks?: { startTime: string; endTime: string }[];
    };
  };
}

function isAfter(date1: Date, date2: Date) {
  return date1.getTime() > date2.getTime();
}

const parseDuration = (duration: string | number): number => {
  if (typeof duration === 'number') return duration;
  return parseInt(duration, 10) || 30;
};

interface StepBookingProps {
  onComplete?: () => void;
}

export default function StepBooking({ onComplete }: StepBookingProps) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile } = useUserProfile();

  // Selection state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Availability state
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([]);
  const [dailyBlockedTimes, setDailyBlockedTimes] = useState<BlockedTime[]>([]);
  const [establishmentSettings, setEstablishmentSettings] = useState<ScheduleSettings | null>(null);
  const [professionalSchedules, setProfessionalSchedules] = useState<Record<string, ScheduleSettings>>({});
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);

  // Pre-fill user info if logged in
  useEffect(() => {
    if (userProfile) {
      setContactInfo({
        name: userProfile.name || '',
        phone: userProfile.phoneNumber || ''
      });
    }
  }, [userProfile]);

  useEffect(() => {
    async function fetchData() {
      if (!firestore) return;
      try {
        // Fetch services
        const servSnapshot = await getDocs(collection(firestore, 'services'));
        const servList = servSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(servList);

        // Fetch professionals
        const profSnapshot = await getDocs(query(collection(firestore, 'users'), where('role', '==', 'professional')));
        const profList = profSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Professional))
          .filter(p => !p.disabled);
        setProfessionals(profList);

        // Fetch establishment schedule settings
        const settingsSnap = await getDoc(doc(firestore, 'scheduleSettings', 'main'));
        if (settingsSnap.exists()) {
          setEstablishmentSettings(settingsSnap.data() as ScheduleSettings);
        }
      } catch (error) {
        console.error("Error fetching booking data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [firestore]);

  // Fetch daily data (appointments, blocked times)
  useEffect(() => {
    if (!firestore || !selectedDate) return;

    async function fetchDailyData() {
      setIsFetchingSlots(true);
      try {
        const start = startOfDay(selectedDate);
        const end = addDays(start, 1);

        const qApts = query(
          collection(firestore, 'appointments'),
          where('startTime', '>=', Timestamp.fromDate(start)),
          where('startTime', '<', Timestamp.fromDate(end))
        );
        const qBlocked = query(
          collection(firestore, 'blockedTimes'),
          where('startTime', '>=', Timestamp.fromDate(start)),
          where('startTime', '<', Timestamp.fromDate(end))
        );

        const [aptsSnap, blockedSnap] = await Promise.all([getDocs(qApts), getDocs(qBlocked)]);
        setDailyAppointments(aptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
        setDailyBlockedTimes(blockedSnap.docs.map(d => ({ id: d.id, ...d.data() } as BlockedTime)));

        // If a professional is selected, fetch their specific schedule
        if (selectedProfessional) {
          const profScheduleRef = doc(firestore, `users/${selectedProfessional.id}/scheduleSettings/main`);
          const profScheduleSnap = await getDoc(profScheduleRef);
          if (profScheduleSnap.exists()) {
            setProfessionalSchedules(prev => ({ ...prev, [selectedProfessional.id]: profScheduleSnap.data() as ScheduleSettings }));
          }
        }
      } catch (error) {
        console.error("Error fetching daily data:", error);
      } finally {
        setIsFetchingSlots(false);
      }
    }

    fetchDailyData();
  }, [firestore, selectedDate, selectedProfessional]);

  // Calculate available slots
  const availableSlots = React.useMemo(() => {
    if (!selectedService || !selectedProfessional || !establishmentSettings || isFetchingSlots) return [];

    const serviceDuration = parseDuration(selectedService.duration);
    const dayOfWeek = format(selectedDate, 'eeee').toLowerCase();
    const profSpecificSchedule = professionalSchedules[selectedProfessional.id];
    const settingsToUse = profSpecificSchedule || establishmentSettings;

    const daySchedule = settingsToUse.workingHours[dayOfWeek];
    if (!daySchedule || !daySchedule.isOpen) return [];

    const workDayStart = parse(daySchedule.startTime, 'HH:mm', selectedDate);
    const workDayEnd = parse(daySchedule.endTime, 'HH:mm', selectedDate);

    const busyBlocks = [
      ...dailyAppointments.filter(a => a.professionalId === selectedProfessional.id && a.status !== 'cancelled').map(a => ({ start: a.startTime.toDate(), end: a.endTime.toDate() })),
      ...dailyBlockedTimes.filter(b => !b.professionalId || b.professionalId === selectedProfessional.id).map(b => ({ start: b.startTime.toDate(), end: b.endTime.toDate() })),
      ...(daySchedule.breaks?.map(b => ({ start: parse(b.startTime, 'HH:mm', selectedDate), end: parse(b.endTime, 'HH:mm', selectedDate) })) || [])
    ];

    const slots: string[] = [];
    let currentTime = workDayStart;

    while (isBefore(addMinutes(currentTime, serviceDuration), workDayEnd) || isEqual(addMinutes(currentTime, serviceDuration), workDayEnd)) {
      const slotStart = currentTime;
      const slotEnd = addMinutes(slotStart, serviceDuration);

      const isOverlapping = busyBlocks.some(block => isBefore(slotStart, block.end) && isAfter(slotEnd, block.start));

      if (!isOverlapping && isAfter(slotStart, new Date())) {
        slots.push(format(slotStart, 'HH:mm'));
      }
      currentTime = addMinutes(currentTime, 15);
    }

    return slots;
  }, [selectedService, selectedProfessional, selectedDate, dailyAppointments, dailyBlockedTimes, establishmentSettings, professionalSchedules, isFetchingSlots]);



  const handleBooking = async () => {
    if (!selectedService || !selectedProfessional || !selectedTime || !contactInfo.name || !contactInfo.phone || !firestore) return;
    
    setIsSubmitting(true);
    try {
      // Create timestamp for booking
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTimeDate = new Date(selectedDate);
      startTimeDate.setHours(hours, minutes, 0, 0);

      const durationMinutes = parseDuration(selectedService.duration);
      const endTimeDate = addMinutes(startTimeDate, durationMinutes);

      const appointmentData: any = {
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        professionalId: selectedProfessional.id,
        professionalName: selectedProfessional.name,
        customerName: contactInfo.name,
        customerPhoneNumber: contactInfo.phone,
        startTime: Timestamp.fromDate(startTimeDate),
        endTime: Timestamp.fromDate(endTimeDate),
        status: 'scheduled',
        type: user ? 'client' : 'guest',
        createdAt: Timestamp.now(),
        servicePrice: selectedService.price,
        serviceDuration: String(selectedService.duration),
        reminderSent: false,
        notes: ''
      };

      if (user) {
        appointmentData.customerId = user.uid;
        appointmentData.customerEmail = user.email || '';
        if (userProfile?.photoURL) {
          appointmentData.customerPhotoURL = userProfile.photoURL;
        }
      }

      await addDoc(collection(firestore, 'appointments'), appointmentData);

      setBookingSuccess(true);
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Ops! Ocorreu um erro ao salvar seu agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Carregando opções...</p>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="text-center p-10 space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold">Agendamento Solicitado!</h2>
        <p className="text-muted-foreground max-w-xs mx-auto">
          {contactInfo.name}, recebemos seu pedido para {selectedService?.name} com {selectedProfessional?.name}. 
          Te aguardamos em breve!
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:scale-105 transition-transform"
        >
          Fazer novo agendamento
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-10"></div>
        {[1, 2, 3].map((s) => (
          <div 
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              step >= s ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-muted text-muted-foreground'
            }`}
          >
            {step > s ? <Check className="w-5 h-5" /> : s}
          </div>
        ))}
      </div>

      {/* Step 1: Services */}
      {step === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Scissors className="w-6 h-6" /> O que vamos fazer hoje?
            </h2>
            <p className="text-muted-foreground">Escolha o serviço desejado</p>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por serviço (ex: Corte, Barba...)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
            />
          </div>
          
          {searchTerm === '' && services.length > 4 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                <Star className="w-3 h-3 fill-primary" /> Sugestões Populares
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {services.slice(0, 3).map(service => (
                  <button
                    key={`popular-${service.id}`}
                    onClick={() => { setSelectedService(service); nextStep(); }}
                    className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-medium hover:border-primary transition-colors"
                  >
                    {service.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services
              .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.description?.toLowerCase().includes(searchTerm.toLowerCase())))
              .map((service) => (
              <button
                key={service.id}
                onClick={() => { setSelectedService(service); nextStep(); }}
                className={`p-6 rounded-2xl border-2 text-left transition-all hover:border-primary group ${
                  selectedService?.id === service.id ? 'border-primary bg-primary/5 shadow-inner' : 'border-border'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{service.name}</h3>
                  <span className="font-mono text-primary font-bold">R$ {service.price}</span>
                </div>
                {service.description && <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>}
                <div className="mt-4 flex items-center text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" /> {service.duration} min
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Professional */}
      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              <User className="w-6 h-6" /> Com quem você gostaria de agendar?
            </h2>
            <p className="text-muted-foreground">Escolha um de nossos especialistas</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {professionals.map((prof) => (
              <button
                key={prof.id}
                onClick={() => { setSelectedProfessional(prof); nextStep(); }}
                className={`p-6 rounded-2xl border-2 text-center transition-all hover:border-primary ${
                  selectedProfessional?.id === prof.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden border border-border">
                  {prof.photoURL ? (
                    <img src={prof.photoURL} alt={prof.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-bold">{prof.name}</h3>
              </button>
            ))}
          </div>
          
          <button onClick={prevStep} className="flex items-center text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para serviços
          </button>
        </div>
      )}

      {/* Step 3: Date & Details */}
      {step === 3 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Calendar className="w-6 h-6" /> Para quando?
            </h2>
          </div>

          <div className="space-y-6 bg-muted/30 p-6 rounded-3xl border border-border">
            {/* Simple Date Select (Next 7 days) */}
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none">
              {[0, 1, 2, 3, 4, 5, 6].map((days) => {
                const date = addDays(new Date(), days);
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <button
                    key={days}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      isSelected ? 'bg-primary text-white shadow-lg' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <span className="text-xs uppercase opacity-80">{format(date, 'EEE', { locale: ptBR })}</span>
                    <span className="text-xl font-bold">{format(date, 'dd')}</span>
                  </button>
                );
              })}
            </div>

            {/* Time Grid */}
            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2 px-1">
                <Clock className="w-4 h-4" /> Horários disponíveis
              </h4>
              
              {isFetchingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-3 rounded-xl border font-medium transition-all ${
                        selectedTime === time ? 'bg-primary text-white border-primary shadow-md' : 'border-border bg-background hover:border-primary/50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-sm text-muted-foreground bg-background rounded-xl border border-dashed">
                  Nenhum horário disponível para este dia.
                </p>
              )}
            </div>

            {/* Guest Info */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h4 className="font-bold flex items-center gap-2 px-1">Seus dados para contato</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Seu Nome completo"
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                />
                <input
                  type="text"
                  placeholder="Seu WhatsApp"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={prevStep} className="flex-1 py-4 px-6 rounded-2xl border border-border font-bold hover:bg-muted transition-colors">
              Anterior
            </button>
            <button 
              disabled={!selectedTime || !contactInfo.name || !contactInfo.phone || isSubmitting}
              onClick={handleBooking}
              className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Agendando...' : 'Finalizar Agendamento'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
