import React, { useState, useEffect } from 'react';
import { useFirestore, useUser, useUserProfile } from '@/firebase';
import { isVetCategory } from '@/lib/care-terms';
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
  const [appointmentType, setAppointmentType] = useState<'presencial' | 'teleconsulta'>('presencial');
  const [paymentType, setPaymentType] = useState<'particular' | 'insurance'>('particular');
  const [healthInsurance, setHealthInsurance] = useState('');
  const [healthInsuranceCard, setHealthInsuranceCard] = useState('');
  
  // Veterinary booking states
  const [estCategory, setEstCategory] = useState<string>('general_practice');
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState('dog');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [isCreatingNewPet, setIsCreatingNewPet] = useState(false);
  const [myPets, setMyPets] = useState<any[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  
  // Subscription State
  const [activeMembershipPlan, setActiveMembershipPlan] = useState<any>(null);
  const [useSubscription, setUseSubscription] = useState(true);

  // Availability state
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([]);
  const [dailyBlockedTimes, setDailyBlockedTimes] = useState<BlockedTime[]>([]);
  const [establishmentSettings, setEstablishmentSettings] = useState<ScheduleSettings | null>(null);
  const [professionalSchedules, setProfessionalSchedules] = useState<Record<string, ScheduleSettings>>({});
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);

  const isVet = isVetCategory(estCategory);
  const totalSteps = isVet ? 4 : 3;

  // Pre-fill user info if logged in
  useEffect(() => {
    if (userProfile) {
      setContactInfo({
        name: userProfile.name || '',
        phone: userProfile.phoneNumber || ''
      });
    }
  }, [userProfile]);

  // Load Tutor's pets if vet clinic
  useEffect(() => {
    if (!firestore || !user || !isVet) return;

    async function fetchMyPets() {
      setLoadingPets(true);
      try {
        const q = query(collection(firestore, 'pets'), where('tutorId', '==', user.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyPets(list);
        if (list.length > 0) {
          setSelectedPet(list[0]);
          setIsCreatingNewPet(false);
        } else {
          setIsCreatingNewPet(true);
        }
      } catch (err) {
        console.error("Erro ao carregar pets:", err);
      } finally {
        setLoadingPets(false);
      }
    }
    fetchMyPets();
  }, [firestore, user, isVet]);

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

        // Fetch establishment settings
        const estSettingsSnap = await getDoc(doc(firestore, 'establishmentSettings', 'main'));
        if (estSettingsSnap.exists()) {
          const estData = estSettingsSnap.data();
          setEstCategory(estData?.businessCategory || 'general_practice');
        }

        // Fetch establishment schedule settings
        const settingsSnap = await getDoc(doc(firestore, 'scheduleSettings', 'main'));
        if (settingsSnap.exists()) {
          setEstablishmentSettings(settingsSnap.data() as ScheduleSettings);
        }

        // Fetch user membership if logged in
        if (user) {
          const membershipsQ = query(
            collection(firestore, 'userMemberships'),
            where('userId', '==', user.uid),
            where('status', '==', 'active')
          );
          const membershipsSnap = await getDocs(membershipsQ);
          if (!membershipsSnap.empty) {
            const membershipDoc = membershipsSnap.docs[0];
            const activeMembership = membershipDoc.data();
            const planDoc = await getDoc(doc(firestore, 'membershipPlans', activeMembership.planId));
            if (planDoc.exists()) {
              setActiveMembershipPlan({ 
                id: planDoc.id, 
                membershipDocId: membershipDoc.id,
                usageThisMonth: activeMembership.usageThisMonth || 0,
                ...planDoc.data() 
              } as any);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching booking data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [firestore, user]);

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
        notes: '',
        appointmentType: appointmentType,
        paymentType: paymentType,
        healthInsurance: paymentType === 'insurance' ? healthInsurance : '',
        healthInsuranceCard: paymentType === 'insurance' ? healthInsuranceCard : '',
      };

      if (isVet) {
        // Save pet details
        if (isCreatingNewPet && newPetName) {
          // If logged in tutor, create pet in db
          let petId = 'manual';
          if (user) {
            const petRef = await addDoc(collection(firestore, 'pets'), {
              name: newPetName,
              species: newPetSpecies,
              breed: newPetBreed,
              tutorId: user.uid,
              tutorName: contactInfo.name || userProfile?.name || 'Tutor',
              createdAt: Timestamp.now()
            });
            petId = petRef.id;
          }
          appointmentData.petId = petId;
          appointmentData.petName = newPetName;
          appointmentData.petSpecies = newPetSpecies;
          appointmentData.petBreed = newPetBreed;
        } else if (selectedPet) {
          appointmentData.petId = selectedPet.id;
          appointmentData.petName = selectedPet.name;
          appointmentData.petSpecies = selectedPet.species;
          appointmentData.petBreed = selectedPet.breed || '';
        }
      }

      const isServiceIncluded = activeMembershipPlan?.includedServiceIds?.includes(selectedService.id);
      if (user && activeMembershipPlan && useSubscription && isServiceIncluded) {
        appointmentData.isSubscriptionUsage = true;
        appointmentData.servicePrice = 0;
        const repassPct = (activeMembershipPlan as any).commissionRepassPercentage ?? 100;
        appointmentData.commissionBaseValue = (selectedService.price * repassPct) / 100;
        appointmentData.subscriptionPlanId = activeMembershipPlan.id;
      }

      if (user) {
        appointmentData.customerId = user.uid;
        appointmentData.customerEmail = user.email || '';
        if (userProfile?.photoURL) {
          appointmentData.customerPhotoURL = userProfile.photoURL;
        }
      }

      await addDoc(collection(firestore, 'appointments'), appointmentData);

      // Increment usage if subscription was used
      if (appointmentData.isSubscriptionUsage && activeMembershipPlan?.membershipDocId) {
         try {
           const membershipRef = doc(firestore, 'userMemberships', activeMembershipPlan.membershipDocId);
           await updateDoc(membershipRef, {
             usageThisMonth: (activeMembershipPlan.usageThisMonth || 0) + 1
           });
         } catch (err) {
           console.error("Erro ao abater limite de uso do plano:", err);
         }
      }

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

  const professionalsForService = React.useMemo(() => {
    if (!selectedService || !professionals) return [];
    return professionals.filter(p => p.serviceIds?.includes(selectedService.id));
  }, [selectedService, professionals]);

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
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const s = idx + 1;
          return (
            <div 
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step >= s ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
          );
        })}
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
            {professionalsForService.length > 0 ? (
              professionalsForService.map((prof) => (
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
              ))
            ) : (
              <div className="col-span-2 p-8 text-center bg-background rounded-2xl border border-dashed flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Não há profissionais disponíveis para o serviço selecionado. Por favor, volte e escolha outro serviço.</p>
              </div>
            )}
          </div>
          
          <button onClick={prevStep} className="flex items-center text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para serviços
          </button>
        </div>
      )}

      {/* Step 3: Pet Selection (Veterinary Only) */}
      {step === 3 && isVet && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              🐾 Qual pet será atendido?
            </h2>
            <p className="text-muted-foreground">Selecione ou cadastre o animal para a consulta</p>
          </div>

          {user && myPets.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-primary">Seus Pets Cadastrados</label>
              <div className="grid grid-cols-2 gap-3">
                {myPets.map(pet => (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => { setSelectedPet(pet); setIsCreatingNewPet(false); }}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      selectedPet?.id === pet.id && !isCreatingNewPet ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {pet.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{pet.name}</h4>
                      <p className="text-[10px] text-muted-foreground capitalize">{pet.species === 'dog' ? 'Cão' : pet.species === 'cat' ? 'Gato' : pet.species} • {pet.breed || 'SRD'}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-center py-2">
                <Button 
                  type="button" 
                  variant="link" 
                  onClick={() => setIsCreatingNewPet(true)}
                  className="text-xs text-primary font-semibold"
                >
                  + Cadastrar outro pet para esta consulta
                </Button>
              </div>
            </div>
          )}

          {(!user || isCreatingNewPet) && (
            <div className="space-y-4 p-5 border rounded-2xl bg-muted/20 animate-in fade-in duration-200">
              <h3 className="font-bold text-sm text-slate-800">Dados do Novo Pet</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome do Pet"
                  value={newPetName}
                  onChange={e => setNewPetName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
                <select
                  value={newPetSpecies}
                  onChange={e => setNewPetSpecies(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="dog">Cão</option>
                  <option value="cat">Gato</option>
                  <option value="bird">Ave</option>
                  <option value="reptile">Réptil</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Raça (opcional)"
                value={newPetBreed}
                onChange={e => setNewPetBreed(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
              {user && myPets.length > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsCreatingNewPet(false)}
                  className="text-xs text-muted-foreground w-full"
                >
                  Cancelar e selecionar pet existente
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={prevStep} className="flex-1 py-4 px-6 rounded-2xl border border-border font-bold hover:bg-muted transition-colors">
              Anterior
            </button>
            <button 
              onClick={nextStep}
              disabled={isCreatingNewPet ? !newPetName : !selectedPet}
              className="flex-1 py-4 px-6 rounded-2xl bg-primary text-white font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3 or 4: Date & Details */}
      {((step === 3 && !isVet) || (step === 4 && isVet)) && (
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

            {/* Guest Info & Subscription */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              {activeMembershipPlan && activeMembershipPlan.includedServiceIds?.includes(selectedService?.id) && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-purple-700 dark:text-purple-400">Assinante {activeMembershipPlan.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Este serviço está incluso no seu plano com 100% de desconto!</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={useSubscription}
                        onChange={(e) => setUseSubscription(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              )}
              
              <h4 className="font-bold flex items-center gap-2 px-1">Detalhes da Consulta</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Atendimento</label>
                  <select 
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-foreground"
                  >
                    <option value="presencial">Presencial (Clínica)</option>
                    <option value="teleconsulta">Teleconsulta (Vídeo/Online)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Pagamento</label>
                  <select 
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-foreground"
                  >
                    <option value="particular">Particular</option>
                    <option value="insurance">Plano / Convênio de Saúde</option>
                  </select>
                </div>
              </div>

              {paymentType === 'insurance' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <input
                    type="text"
                    placeholder="Nome do Convênio (ex: Unimed)"
                    value={healthInsurance}
                    onChange={(e) => setHealthInsurance(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Número da Carteirinha"
                    value={healthInsuranceCard}
                    onChange={(e) => setHealthInsuranceCard(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                    required
                  />
                </div>
              )}

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
              {isSubmitting ? 'Agendando...' : (
                useSubscription && activeMembershipPlan?.includedServiceIds?.includes(selectedService?.id) 
                  ? 'Agendar Gratuitamente (Clube)' 
                  : 'Finalizar Agendamento'
              )} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
