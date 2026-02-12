'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { DollarSign, Users, CalendarCheck, Lock, Calendar, MoreHorizontal, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, orderBy, Timestamp, getDocs, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { format, startOfDay, isBefore, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// Type for global blocked times (for admin/pro dashboard)
interface BlockedTime {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
}

// Type for appointments, now with denormalized data
interface Appointment {
  id: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  serviceName: string;
  professionalName: string;
  customerName: string;
  customerPhotoURL?: string;
  customerEmail?: string;
  customerPhoneNumber?: string;
  serviceDuration: string;
  servicePrice: number;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

export default function SchedulePage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading || !userProfile) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-96" />
          <Skeleton className="col-span-3 h-96" />
        </div>
      </div>
    );
  }

  // Render dashboard based on user role
  if (userProfile.role === 'admin') {
    return <AdminDashboard />;
  }
  
  if (userProfile.role === 'professional') {
    return <ProfessionalDashboard />;
  }

  if (userProfile.role === 'client') {
    return <ClientDashboard />;
  }

  // Fallback for any other case or if profile is still loading
  return null;
}

// Dashboard for Admin
function AdminDashboard() {
  const firestore = useFirestore();
  
  // Fetch global blocked times
  const blockedTimesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'blockedTimes'),
      where('startTime', '>=', new Date()),
      orderBy('startTime', 'asc')
    );
  }, [firestore]);

  const { data: blockedTimes, isLoading: areBlocksLoading } = useCollection<BlockedTime>(blockedTimesQuery);

  const calendarImage = PlaceHolderImages.find(p => p.id === 'dashboard-appointments');

  const stats = [
    { title: 'Receita de Hoje', value: 'R$1.250,00', icon: DollarSign, change: '+15% em relação a ontem' },
    { title: 'Agendamentos de Hoje', value: '22', icon: CalendarCheck, change: '+5 agendados' },
    { title: 'Novos Clientes', value: '4', icon: Users, change: '+1 esta semana' },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Painel</h1>
        <Button asChild><Link href="/book-appointment">Novo Agendamento</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className='font-headline'>Calendário de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <p className="text-muted-foreground mb-4">Gerencie seus agendamentos para a semana.</p>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              {calendarImage && (
                <Image src={calendarImage.imageUrl} alt={calendarImage.description} fill className="object-cover" data-ai-hint={calendarImage.imageHint} />
              )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
               <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-headline text-xl">Em Breve</h3>
                  <p>Funcionalidade de calendário interativo.</p>
               </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-4 md:col-span-3">
          <CardHeader>
            <CardTitle className='font-headline'>Próximos Bloqueios Gerais</CardTitle>
            <CardDescription>Períodos em que a agenda está indisponível para todos.</CardDescription>
          </CardHeader>
          <CardContent>
            {areBlocksLoading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : blockedTimes && blockedTimes.length > 0 ? (
                <div className="space-y-4">
                    {blockedTimes.map(block => (
                        <div key={block.id} className="flex items-center p-2 rounded-lg bg-muted/50">
                            <Lock className="h-5 w-5 mr-4 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-semibold">{block.reason}</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(block.startTime.toDate(), "dd/MM/yy 'às' HH:mm")} - {format(block.endTime.toDate(), "HH:mm")}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <p className="text-muted-foreground text-sm text-center py-4">Nenhum bloqueio de agenda futuro.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// NEW Dashboard for Professional role
function ProfessionalDashboard() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[] | null>(null);
  const [areUpcomingLoading, setAreUpcomingLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);

  useEffect(() => {
    if (!isAuthLoading && user && firestore) {
      const fetchAppointments = async () => {
        setAreUpcomingLoading(true);
        setError(null);
        
        const upcomingAppointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('professionalId', '==', user.uid),
          where('status', '==', 'scheduled'),
          where('startTime', '>=', startOfDay(new Date())),
          orderBy('startTime', 'asc')
        );

        try {
          const querySnapshot = await getDocs(upcomingAppointmentsQuery);
          const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          setUpcomingAppointments(appointments);
        } catch (err: any) {
          console.error("Error fetching professional appointments:", err);
          setError(err);
          toast({
            variant: 'destructive',
            title: 'Erro ao buscar agendamentos',
            description: 'Não foi possível carregar seus próximos agendamentos. Tente recarregar a página.',
          });
          setUpcomingAppointments(null);
        } finally {
          setAreUpcomingLoading(false);
        }
      };

      fetchAppointments();
    } else if (!isAuthLoading && !user) {
        setAreUpcomingLoading(false);
    }
  }, [user, firestore, isAuthLoading, toast]);

  const handleUpdateAppointmentStatus = async (
    appointment: Appointment,
    newStatus: 'completed' | 'no-show'
  ) => {
    if (!firestore || !settings) {
      toast({
        title: 'Erro',
        description: 'Configurações do sistema não carregadas.',
        variant: 'destructive',
      });
      return;
    }
    setIsUpdating(appointment.id);

    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    const clientProfileRef = doc(firestore, 'users', appointment.customerId);

    // DEBUGGING STEP: Temporarily breaking the transaction to pinpoint the error.
    try {
        // Step 1: Update Appointment Status
        await updateDoc(appointmentRef, { status: newStatus });
    } catch(e) {
        const permissionError = new FirestorePermissionError({
          path: appointmentRef.path,
          operation: 'update',
          requestResourceData: { status: newStatus },
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsUpdating(null);
        return; // Stop here if it fails
    }

    try {
        // Step 2: Update Loyalty Points
        // We need to re-fetch the document since we are not in a transaction
        const clientProfileDoc = await getDoc(clientProfileRef);
        if (!clientProfileDoc.exists()) {
            throw new Error("Client profile does not exist.");
        }

        const currentPoints = clientProfileDoc.data().loyaltyPoints || 0;
        let newPoints = currentPoints;

        if (newStatus === 'completed') {
            newPoints += settings.pointsForCompletion || 10;
        } else if (newStatus === 'no-show') {
            newPoints = Math.max(0, newPoints - (settings.pointsPenaltyForNoShow || 5));
        }
        
        await updateDoc(clientProfileRef, { loyaltyPoints: newPoints });

        // If both succeeded
        toast({
          title: 'Status Atualizado!',
          description: `O agendamento foi marcado como ${
            newStatus === 'completed' ? 'concluído' : 'não comparecimento'
          }.`,
        });
        setUpcomingAppointments(
          (prev) => prev?.filter((apt) => apt.id !== appointment.id) || null
        );

    } catch (e) {
        // If points update fails, we should ideally roll back the appointment status.
        // This is a temporary state for debugging.
        console.error("Failed to update points, data might be inconsistent.", e);
        await updateDoc(appointmentRef, { status: "scheduled" }); // Best-effort rollback

        const permissionError = new FirestorePermissionError({
          path: clientProfileRef.path,
          operation: 'update',
          requestResourceData: { loyaltyPoints: '...calculated value' },
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(null);
    }
  };
  
  const isLoading = isAuthLoading || areUpcomingLoading || areSettingsLoading;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          {isAuthLoading ? <Skeleton className="h-9 w-48" /> : `Olá, ${user?.displayName}!`}
        </h1>
        <p className="text-muted-foreground">Aqui estão seus próximos atendimentos.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Próximos Agendamentos</CardTitle>
          <CardDescription>Seus horários confirmados para hoje e os próximos dias.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-4">
              Não foi possível carregar seus agendamentos. Por favor, recarregue a página.
            </p>
          ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                            <Calendar className="h-6 w-6 text-primary" />
                            <div>
                                <p className="font-semibold">{apt.serviceName}</p>
                                <p className="text-sm text-muted-foreground capitalize">
                                    {format(apt.startTime.toDate(), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <Avatar>
                             <AvatarImage src={apt.customerPhotoURL || ''} alt={apt.customerName} />
                             <AvatarFallback>{apt.customerName?.charAt(0).toUpperCase()}</AvatarFallback>
                           </Avatar>
                           <div>
                                <p className="font-semibold">{apt.customerName}</p>
                                {apt.customerEmail ? (
                                    <a href={`mailto:${apt.customerEmail}`} className="text-sm text-muted-foreground hover:underline">
                                        {apt.customerEmail}
                                    </a>
                                ) : (
                                    <p className="block text-sm text-muted-foreground/70 italic">Email não informado</p>
                                )}
                                {apt.customerPhoneNumber ? (
                                    <a href={`tel:${apt.customerPhoneNumber}`} className="block text-sm text-muted-foreground hover:underline">
                                        {apt.customerPhoneNumber}
                                    </a>
                                ) : (
                                     <p className="block text-sm text-muted-foreground/70 italic">Telefone não informado</p>
                                )}
                           </div>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isUpdating === apt.id}>
                                    {isUpdating === apt.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(apt, 'completed')}>
                                    <Check className="mr-2 h-4 w-4" />
                                    Serviço Concluído
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(apt, 'no-show')} className="text-destructive focus:text-destructive">
                                    <X className="mr-2 h-4 w-4" />
                                    Não Compareceu
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Você não tem nenhum agendamento futuro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard for Client role
function ClientDashboard() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[] | null>(null);
  const [areUpcomingLoading, setAreUpcomingLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellableStates, setCancellableStates] = useState<Record<string, boolean>>({});

  // Fetch establishment settings
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);

  useEffect(() => {
    if (!isAuthLoading && user && firestore) {
      const fetchAppointments = async () => {
        setAreUpcomingLoading(true);
        setError(null);
        
        const upcomingAppointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('customerId', '==', user.uid),
          where('status', '==', 'scheduled'),
          where('startTime', '>=', startOfDay(new Date())),
          orderBy('startTime', 'asc')
        );

        try {
          const querySnapshot = await getDocs(upcomingAppointmentsQuery);
          const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          setUpcomingAppointments(appointments);
        } catch (err: any) {
          console.error("Error fetching upcoming appointments:", err);
          setError(err);
          toast({
            variant: 'destructive',
            title: 'Erro ao buscar agendamentos',
            description: 'Não foi possível carregar seus próximos agendamentos. Tente recarregar a página.',
          });
          setUpcomingAppointments(null);
        } finally {
          setAreUpcomingLoading(false);
        }
      };

      fetchAppointments();
    } else if (!isAuthLoading && !user) {
        setAreUpcomingLoading(false);
    }
  }, [user, firestore, isAuthLoading, toast]);
  
  useEffect(() => {
    if (!upcomingAppointments || areSettingsLoading) return;

    const timeLimitHours = settings?.cancellationTimeLimitHours ?? 24;
    const newStates: Record<string, boolean> = {};
    upcomingAppointments.forEach(apt => {
        const cancellationCutoff = subHours(apt.startTime.toDate(), timeLimitHours);
        newStates[apt.id] = isBefore(new Date(), cancellationCutoff);
    });
    setCancellableStates(newStates);
  }, [upcomingAppointments, settings, areSettingsLoading]);

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel || !firestore) return;

    setIsCancelling(true);
    const docRef = doc(firestore, 'appointments', appointmentToCancel.id);

    try {
        await updateDoc(docRef, { status: 'cancelled' });
        toast({
            title: 'Agendamento Cancelado!',
            description: 'Seu horário foi removido da agenda.'
        });
        setUpcomingAppointments(prev => prev?.filter(apt => apt.id !== appointmentToCancel.id) || null);
    } catch(e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { status: 'cancelled' }}));
        toast({
            title: 'Erro ao Cancelar',
            description: 'Não foi possível cancelar o agendamento. Pode ser tarde demais ou você não tem permissão.',
            variant: 'destructive'
        });
    } finally {
        setIsCancelling(false);
        setAppointmentToCancel(null);
    }
  };

  const handleReschedule = async (appointment: Appointment) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'appointments', appointment.id);
    try {
        await updateDoc(docRef, { status: 'cancelled' });
        toast({
            title: 'Horário Liberado',
            description: 'Seu agendamento anterior foi cancelado. Escolha um novo horário.'
        });
        router.push('/book-appointment');
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { status: 'cancelled' }}));
        toast({
            title: 'Erro ao Reagendar',
            description: 'Não foi possível cancelar o horário anterior. Verifique suas permissões.',
            variant: 'destructive'
        });
    }
  };

  const isLoading = isAuthLoading || areUpcomingLoading || areSettingsLoading;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          {isAuthLoading ? <Skeleton className="h-9 w-48" /> : `Olá, ${user?.displayName}!`}
        </h1>
        <Button asChild size="lg">
          <Link href="/book-appointment">Novo Agendamento</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Próximos Agendamentos</CardTitle>
          <CardDescription>Seus horários confirmados. Você pode cancelar ou reagendar com até {settings?.cancellationTimeLimitHours ?? 24} horas de antecedência.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-4">
              Não foi possível carregar seus agendamentos. Por favor, recarregue a página.
            </p>
          ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
            <TooltipProvider>
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => {
                  const canCancel = cancellableStates[apt.id] ?? false;
                  const tooltipMessage = canCancel ? '' : `Não é possível alterar com menos de ${settings?.cancellationTimeLimitHours ?? 24}h de antecedência.`;

                  return (
                      <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
                          <div className="flex items-center gap-4">
                          <Calendar className="h-6 w-6 text-primary" />
                          <div>
                              <p className="font-semibold">{apt.serviceName}</p>
                              <p className="text-sm text-muted-foreground">
                              Com {apt.professionalName}
                              </p>
                          </div>
                          </div>
                          <div className="text-left sm:text-right">
                          <p className="font-semibold capitalize">
                              {format(apt.startTime.toDate(), "EEEE, dd/MM", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                              às {format(apt.startTime.toDate(), "HH:mm")}
                          </p>
                          </div>
                          <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                  {/* This div is necessary to allow the tooltip to work on a disabled button */}
                                  <div> 
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" disabled={!canCancel}>
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                          <DropdownMenuItem onSelect={() => handleReschedule(apt)}>
                                              <Pencil className="mr-2 h-4 w-4" />
                                              Reagendar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => setAppointmentToCancel(apt)} className="text-destructive">
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Cancelar
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                  </div>
                              </TooltipTrigger>
                              {!canCancel && <TooltipContent><p>{tooltipMessage}</p></TooltipContent>}
                          </Tooltip>
                      </div>
                  )
                })}
              </div>
            </TooltipProvider>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Você não tem nenhum agendamento futuro.
            </p>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                <AlertDialogDescription>
                    Você tem certeza que deseja cancelar seu agendamento para <strong>{appointmentToCancel?.serviceName}</strong> no dia{' '}
                    <strong>{appointmentToCancel && format(appointmentToCancel.startTime.toDate(), "dd/MM 'às' HH:mm")}</strong>?
                    Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCancel} disabled={isCancelling}>
                    {isCancelling ? 'Cancelando...' : 'Sim, cancelar'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
