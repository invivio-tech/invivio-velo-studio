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
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

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
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[] | null>(null);
  const [areUpcomingLoading, setAreUpcomingLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Don't fetch if auth is still loading or user/firestore isn't available
    if (isAuthLoading || !user || !firestore) {
      if (!isAuthLoading) {
        setAreUpcomingLoading(false);
      }
      return;
    }

    const fetchAppointments = async () => {
      setAreUpcomingLoading(true);
      setError(null);
      
      const upcomingAppointmentsQuery = query(
        collection(firestore, 'appointments'),
        where('customerId', '==', user.uid),
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
  }, [user, firestore, isAuthLoading, toast]);


  const isLoading = isAuthLoading || areUpcomingLoading;

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
          <CardDescription>Seus horários confirmados.</CardDescription>
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
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => (
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
