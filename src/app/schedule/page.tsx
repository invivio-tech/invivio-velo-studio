'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, CalendarCheck } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SchedulePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);


  const calendarImage = PlaceHolderImages.find(p => p.id === 'dashboard-appointments');

  const stats = [
    {
      title: 'Receita de Hoje',
      value: 'R$1.250,00',
      icon: DollarSign,
      change: '+15% em relação a ontem',
    },
    {
      title: 'Agendamentos de Hoje',
      value: '22',
      icon: CalendarCheck,
      change: '+5 agendados',
    },
    {
      title: 'Novos Clientes',
      value: '4',
      icon: Users,
      change: '+1 esta semana',
    },
  ];

  if (isLoading || !user) {
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Painel
      </h1>
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
            <p className="text-muted-foreground mb-4">
              Gerencie seus agendamentos para a semana.
            </p>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              {calendarImage && (
                <Image
                  src={calendarImage.imageUrl}
                  alt={calendarImage.description}
                  fill
                  className="object-cover"
                  data-ai-hint={calendarImage.imageHint}
                />
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
            <CardTitle className='font-headline'>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Um registro de agendamentos e ações recentes aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
