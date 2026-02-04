'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

import { useUserProfile, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lock, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  date: z.date({
    required_error: "A data é obrigatória.",
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (ex: 09:00)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (ex: 18:00)"),
  reason: z.string().min(2, { message: 'O motivo é obrigatório.' }).max(100, { message: 'O motivo é muito longo.' }),
}).refine(data => {
    return data.startTime < data.endTime;
}, {
    message: 'A hora de início deve ser anterior à hora de término.',
    path: ['startTime'],
});

type BlockTimeFormValues = z.infer<typeof formSchema>;

export default function BlockSchedulePage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isProfileLoading && (!userProfile || userProfile.role !== 'admin')) {
      router.push('/schedule');
    }
  }, [userProfile, isProfileLoading, router]);

  const form = useForm<BlockTimeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        date: new Date(),
        startTime: '12:00',
        endTime: '13:00',
        reason: 'Almoço'
    }
  });

  async function onSubmit(values: BlockTimeFormValues) {
    if (!firestore) return;
    setIsSaving(true);

    const { date, startTime, endTime, reason } = values;
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const startDateTime = new Date(date);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const endDateTime = new Date(date);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    const newBlock = {
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        reason: reason,
    };
    
    const blockedTimesRef = collection(firestore, 'blockedTimes');

    addDoc(blockedTimesRef, newBlock)
      .then(() => {
        toast({
          title: 'Agenda bloqueada!',
          description: 'O período foi marcado como indisponível.',
        });
        router.push('/schedule');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: blockedTimesRef.path,
          operation: 'create',
          requestResourceData: newBlock,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao bloquear',
          description: 'Você não tem permissão para realizar esta ação.',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  if (isProfileLoading || !userProfile || userProfile.role !== 'admin') {
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
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Lock className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Bloquear Agenda
        </h1>
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline">Definir Período Indisponível</CardTitle>
          <CardDescription>
            Marque um horário na sua agenda para compromissos pessoais, feriados ou outros eventos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Escolha uma data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hora de Início</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hora de Fim</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <FormControl>
                            <Textarea placeholder="ex: Almoço, Reunião, Feriado..." {...field} />
                        </FormControl>
                        <FormDescription>
                            Este motivo será exibido na agenda.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Bloquear Horário
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
