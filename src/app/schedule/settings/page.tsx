'use client';

import { useUserProfile } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ScheduleSettingsForm from '@/components/schedule/ScheduleSettingsForm';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ScheduleSettingsPage() {
  const { userProfile, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!userProfile || userProfile.role !== 'admin')) {
        // Redirect to schedule page if not an admin
        router.push('/schedule');
    }
  }, [userProfile, isLoading, router]);


  if (isLoading || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-8">
            {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
            ))}
            <div className="flex justify-end">
                <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Settings className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Configurações da Agenda
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Horário de Funcionamento</CardTitle>
          <CardDescription>
            Defina os dias e horários em que o estabelecimento está aberto para agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleSettingsForm settingsPath="scheduleSettings/main" />
        </CardContent>
      </Card>
    </div>
  );
}
