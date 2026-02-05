'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { startOfDay } from 'date-fns';

import { useUserProfile, useFirestore, useDoc, useCollection, useMemoFirebase, type UserProfile } from '@/firebase';
import type { ServiceWithId } from '@/app/services/page';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, Scissors, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Data types
interface Appointment {
  id: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  startTime: Timestamp;
  endTime: Timestamp;
}

interface AppointmentWithDetails extends Appointment {
    client?: UserProfile;
    service?: ServiceWithId;
}

export default function ProfessionalAppointmentsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
  const firestore = useFirestore();
  const [queryStartDate] = useState(() => startOfDay(new Date()));

  // Redirect if not admin
  useEffect(() => {
    if (!isAdminLoading && (!adminProfile || adminProfile.role !== 'admin')) {
      router.push('/schedule');
    }
  }, [adminProfile, isAdminLoading, router]);

  // Fetch professional's profile
  const professionalRef = useMemoFirebase(() => (firestore && userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
  const { data: professional, isLoading: isProfessionalLoading } = useDoc<UserProfile>(professionalRef);

  // Fetch professional's upcoming appointments
  const appointmentsQuery = useMemoFirebase(() => {
      if (!firestore || !userId) return null;
      return query(
          collection(firestore, 'appointments'),
          where('professionalId', '==', userId),
          where('startTime', '>=', queryStartDate),
          orderBy('startTime', 'asc')
      );
  }, [firestore, userId, queryStartDate]);
  const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  // Fetch all services and clients to enrich appointment data
  const servicesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const { data: allServices, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  const clientsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('role', '==', 'client')) : null, [firestore]);
  const { data: allClients, isLoading: areClientsLoading } = useCollection<UserProfile>(clientsQuery);

  // Memoize enriched and grouped appointments
  const groupedAppointments = useMemo(() => {
    if (!appointments || !allServices || !allClients) return [];

    const enriched = appointments.map(apt => ({
        ...apt,
        client: allClients.find(c => c.id === apt.customerId),
        service: allServices.find(s => s.id === apt.serviceId),
    }));

    const groups = enriched.reduce((acc, apt) => {
        const dateKey = format(apt.startTime.toDate(), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(apt);
        return acc;
    }, {} as Record<string, AppointmentWithDetails[]>);
    
    return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());

  }, [appointments, allServices, allClients]);
  
  const isLoading = isAdminLoading || isProfessionalLoading || areAppointmentsLoading || areServicesLoading || areClientsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-80" />
            </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!professional) {
    return (
        <div className="p-8">
            <Alert variant="destructive">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>Profissional não encontrado. <Link href="/customers" className="underline">Voltar para a lista de equipe</Link>.</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" asChild>
            <Link href="/customers">
                <ArrowLeft className="h-4 w-4" />
            </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">
                Agenda de {professional.name}
            </h1>
            <p className="text-muted-foreground">Próximos agendamentos para este profissional.</p>
        </div>
      </div>

      {groupedAppointments.length > 0 ? (
          <div className="space-y-8">
              {groupedAppointments.map(([date, apts]) => (
                  <div key={date}>
                      <h2 className="text-xl font-headline font-semibold mb-4 capitalize">
                          {format(new Date(date.replace(/-/g, '/')), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h2>
                      <div className="space-y-4">
                          {apts.map(apt => (
                              <Card key={apt.id}>
                                  <CardContent className="p-4 grid sm:grid-cols-3 items-center gap-4">
                                      <div className="flex items-center gap-3">
                                          <Clock className="w-5 h-5 text-primary shrink-0"/>
                                          <span className="font-bold text-lg">{format(apt.startTime.toDate(), 'HH:mm')}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <Scissors className="w-5 h-5 text-muted-foreground shrink-0"/>
                                          <div>
                                              <p className="font-semibold">{apt.service?.name || 'Serviço não encontrado'}</p>
                                              <p className="text-sm text-muted-foreground">{apt.service?.duration}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <Avatar className="w-9 h-9">
                                              <AvatarImage src={apt.client?.photoURL || ''} alt={apt.client?.name} />
                                              <AvatarFallback>{apt.client?.name.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                              <p className="font-semibold">{apt.client?.name || 'Cliente não encontrado'}</p>
                                              <p className="text-sm text-muted-foreground">{apt.client?.email}</p>
                                          </div>
                                      </div>
                                  </CardContent>
                              </Card>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      ) : (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>Nenhum Agendamento Futuro</CardTitle>
                <CardDescription>Este profissional não possui agendamentos marcados.</CardDescription>
            </CardHeader>
        </Card>
      )}

    </div>
  );
}
