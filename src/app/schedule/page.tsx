'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DollarSign, Users, CalendarCheck, Lock, Calendar } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
  serviceDuration: string;
  servicePrice: number;
  notes: string;
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
  const { user, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Query for ALL appointments (for total count)
  const allAppointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'appointments'), where('customerId', '==', user.uid));
  }, [firestore, user]);

  const { data: allAppointments, isLoading: areAllAppointmentsLoading } = useCollection<Appointment>(allAppointmentsQuery);
  
  // Query for UPCOMING appointments
  const upcomingAppointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'appointments'),
      where('customerId', '==', user.uid),
      where('startTime', '>=', startOfDay(new Date())),
      orderBy('startTime', 'asc')
    );
  }, [firestore, user]);

  const { data: upcomingAppointments, isLoading: areUpcomingAppointmentsLoading } = useCollection<Appointment>(upcomingAppointmentsQuery);

  const isLoading = isAuthLoading || areAllAppointmentsLoading || areUpcomingAppointmentsLoading;


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
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-12" />
                ) : (
                    <div className="text-2xl font-bold">
                        {allAppointments?.length ?? 0}
                    </div>
                )}
                <p className="text-xs text-muted-foreground">O número total de horários que você já agendou.</p>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Próximos Agendamentos</CardTitle>
                <CardDescription>Seus próximos compromissos.</CardDescription>
            </CardHeader>
            <CardContent>
                {areUpcomingAppointmentsLoading ? (
                    <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-2 rounded-lg border p-4">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                            </div>
                        ))}
                    </div>
                ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {upcomingAppointments.map((apt) => (
                            <div key={apt.id} className="flex flex-col gap-1 rounded-lg border p-3 text-xs font-mono bg-muted/20">
                                <p><strong>serviceName:</strong> {apt.serviceName}</p>
                                <p><strong>professionalName:</strong> {apt.professionalName}</p>
                                <p><strong>startTime:</strong> {apt.startTime.toDate().toString()}</p>
                                <p><strong>endTime:</strong> {apt.endTime.toDate().toString()}</p>
                                <p><strong>servicePrice:</strong> {apt.servicePrice}</p>
                                <p><strong>serviceDuration:</strong> "{apt.serviceDuration}"</p>
                                <p><strong>customerId:</strong> {apt.customerId}</p>
                                <p><strong>professionalId:</strong> {apt.professionalId}</p>
                                <p><strong>serviceId:</strong> {apt.serviceId}</p>
                                <p><strong>notes:</strong> "{apt.notes}"</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4 text-sm">Você não tem agendamentos futuros.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
