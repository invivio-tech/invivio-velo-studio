'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DollarSign, Users, CalendarCheck, Lock, User, Clock } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { UserProfile } from '@/firebase';
import type { ServiceWithId } from '../services/page';

// Type for global blocked times (for admin/pro dashboard)
interface BlockedTime {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
}

// Type for appointments, adding service and professional details
interface Appointment {
  id: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  startTime: Timestamp;
  endTime: Timestamp;
}

export default function SchedulePage() {
  const { user, isLoading: isUserLoading } = useUser();
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
  if (userProfile.role === 'admin' || userProfile.role === 'professional') {
    return <AdminProfessionalDashboard />;
  }

  if (userProfile.role === 'client') {
    return <ClientDashboard />;
  }

  // Fallback for any other case or if profile is still loading
  return null;
}

// Dashboard for Admin and Professional roles
function AdminProfessionalDashboard() {
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

// Dashboard for Client role
function ClientDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch upcoming appointments for the current user
  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'appointments'),
      where('customerId', '==', user.uid),
      where('startTime', '>=', new Date()),
      orderBy('startTime', 'asc')
    );
  }, [firestore, user?.uid]);
  const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  // Fetch all services to map serviceId to service details
  const servicesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const { data: allServices, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  // Fetch all professionals to map professionalId to professional details
  const professionalsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('role', '==', 'professional')) : null, [firestore]);
  const { data: allProfessionals, isLoading: areProfessionalsLoading } = useCollection<UserProfile>(professionalsQuery);
  
  const isLoading = areAppointmentsLoading || areServicesLoading || areProfessionalsLoading;

  const getServiceDetails = (serviceId: string) => allServices?.find(s => s.id === serviceId);
  const getProfessionalDetails = (professionalId: string) => allProfessionals?.find(p => p.id === professionalId);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Olá, {user?.displayName}!</h1>
        <Button asChild size="lg">
          <Link href="/book-appointment">Novo Agendamento</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><CalendarCheck/> Próximos Agendamentos</CardTitle>
          <CardDescription>Aqui estão seus horários confirmados.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : appointments && appointments.length > 0 ? (
             <div className="space-y-4">
              {appointments.map(apt => {
                const service = getServiceDetails(apt.serviceId);
                const professional = getProfessionalDetails(apt.professionalId);
                const startTime = apt.startTime.toDate();
                return (
                  <Card key={apt.id} className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="font-headline text-lg">{format(startTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}</CardTitle>
                        <CardDescription>
                            {service?.name || 'Serviço não encontrado'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground"/>
                          <span>Profissional: <strong>{professional?.name || 'Não encontrado'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground"/>
                        <span>Horário: <strong>{format(startTime, 'HH:mm')}</strong></span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
             </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">Você ainda não tem agendamentos futuros.</p>
              <Button asChild>
                <Link href="/book-appointment">Agendar meu primeiro horário</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}