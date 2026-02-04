'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDoc, collection, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUserProfile, useFirestore, useDoc, useCollection, useMemoFirebase, type UserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import ScheduleSettingsForm, { type ScheduleSettings, scheduleSettingsSchema } from '@/components/schedule/ScheduleSettingsForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Clock, Lock, User, Trash2, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BlockedTime {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
}

const blockTimeFormSchema = z.object({
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

type BlockTimeFormValues = z.infer<typeof blockTimeFormSchema>;

export default function ProfessionalSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch professional's profile
  const userRef = useMemoFirebase(() => (firestore && userId && adminProfile?.role === 'admin' ? doc(firestore, 'users', userId) : null), [firestore, userId, adminProfile]);
  const { data: professional, isLoading: isProfessionalLoading } = useDoc<UserProfile>(userRef);

  // Fetch establishment-wide settings
  const establishmentSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'scheduleSettings', 'main') : null), [firestore]);
  const { data: establishmentSettings, isLoading: areEstablishmentSettingsLoading } = useDoc<ScheduleSettings>(establishmentSettingsRef);
  
  // Fetch professional's blocked times
  const blockedTimesCollectionRef = useMemoFirebase(() => (firestore && userId ? collection(firestore, `users/${userId}/blockedTimes`) : null), [firestore, userId]);
  const { data: blockedTimes, isLoading: areBlocksLoading } = useCollection<BlockedTime>(blockedTimesCollectionRef);
  
  const blockForm = useForm<BlockTimeFormValues>({
    resolver: zodResolver(blockTimeFormSchema),
    defaultValues: {
        date: new Date(),
        startTime: '12:00',
        endTime: '13:00',
        reason: 'Almoço'
    }
  });

  useEffect(() => {
    if (!isAdminLoading && (!adminProfile || adminProfile.role !== 'admin')) {
      router.push('/schedule');
    }
    if (!isProfessionalLoading && professional && professional.role !== 'professional') {
        toast({ variant: 'destructive', title: 'Usuário Inválido', description: 'Esta página é apenas para gerenciar a agenda de profissionais.' });
        router.push('/customers');
    }
  }, [adminProfile, isAdminLoading, professional, isProfessionalLoading, router, toast]);

  async function onBlockSubmit(values: BlockTimeFormValues) {
    if (!firestore || !userId) return;
    setIsSavingBlock(true);
    
    const { date, startTime, endTime, reason } = values;
    const startDateTime = new Date(date.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]), 0, 0));
    const endDateTime = new Date(date.setHours(parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]), 0, 0));

    const newBlock = {
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        reason,
    };
    
    addDoc(collection(firestore, `users/${userId}/blockedTimes`), newBlock)
      .then(() => {
        toast({ title: 'Horário bloqueado!', description: 'O período foi marcado como indisponível para este profissional.' });
        blockForm.reset();
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${userId}/blockedTimes`, operation: 'create', requestResourceData: newBlock }));
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível bloquear o horário.' });
      })
      .finally(() => setIsSavingBlock(false));
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!firestore || !userId) return;
    setIsDeleting(blockId);
    
    const blockRef = doc(firestore, `users/${userId}/blockedTimes`, blockId);
    deleteDoc(blockRef)
      .then(() => {
        toast({ title: 'Bloqueio removido!', description: 'O horário está disponível novamente.' });
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: blockRef.path, operation: 'delete' }));
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o bloqueio.' });
      })
      .finally(() => setIsDeleting(null));
  }
  
  const isLoading = isAdminLoading || isProfessionalLoading || areEstablishmentSettingsLoading;
  
  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-3/4" />
        <div className="space-y-6">
          <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!professional) {
    return <div className="p-8">Profissional não encontrado. <Link href="/customers" className="underline">Voltar para a lista</Link>.</div>
  }

  const formatDayHours = (day: { isOpen: boolean; startTime: string; endTime: string; }) => {
    return day.isOpen ? `${day.startTime} - ${day.endTime}` : 'Fechado';
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <User className="h-8 w-8 text-secondary" />
        <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">
                Agenda de {professional.name}
            </h1>
            <p className="text-muted-foreground">Gerencie o horário de trabalho e os bloqueios específicos deste profissional.</p>
        </div>
      </div>
      
      {establishmentSettings && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Horário do Estabelecimento</AlertTitle>
          <AlertDescription>
            Lembre-se que o horário do profissional deve estar dentro do horário de funcionamento geral.
            <ul className="text-xs grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2">
                <li>Dom: {formatDayHours(establishmentSettings.workingHours.sunday)}</li>
                <li>Seg: {formatDayHours(establishmentSettings.workingHours.monday)}</li>
                <li>Ter: {formatDayHours(establishmentSettings.workingHours.tuesday)}</li>
                <li>Qua: {formatDayHours(establishmentSettings.workingHours.wednesday)}</li>
                <li>Qui: {formatDayHours(establishmentSettings.workingHours.thursday)}</li>
                <li>Sex: {formatDayHours(establishmentSettings.workingHours.friday)}</li>
                <li>Sáb: {formatDayHours(establishmentSettings.workingHours.saturday)}</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Clock /> Horário de Trabalho do Profissional</CardTitle>
          <CardDescription>Defina os dias e horários em que este profissional está disponível.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleSettingsForm settingsPath={`users/${userId}/scheduleSettings/main`} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Lock /> Bloqueios na Agenda</CardTitle>
          <CardDescription>Adicione ou remova períodos indisponíveis para este profissional.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
            <div>
                <h3 className="font-semibold mb-4">Novo Bloqueio</h3>
                 <Form {...blockForm}>
                    <form onSubmit={blockForm.handleSubmit(onBlockSubmit)} className="space-y-6">
                        <FormField control={blockForm.control} name="date" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Data</FormLabel>
                                <Popover><PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent></Popover><FormMessage />
                            </FormItem>
                        )} />
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={blockForm.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Início</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={blockForm.control} name="endTime" render={({ field }) => (<FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={blockForm.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Motivo</FormLabel><FormControl><Textarea placeholder="ex: Almoço, Reunião, Feriado..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" disabled={isSavingBlock}>{isSavingBlock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Bloquear Horário</Button>
                    </form>
                </Form>
            </div>
             <div>
                <h3 className="font-semibold mb-4">Próximos Bloqueios</h3>
                {areBlocksLoading ? (
                    <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : blockedTimes && blockedTimes.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {blockedTimes.map(block => (
                            <div key={block.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div>
                                    <p className="font-medium text-sm">{block.reason}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(block.startTime.toDate(), "dd/MM/yy 'das' HH:mm")} às {format(block.endTime.toDate(), "HH:mm")}
                                    </p>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteBlock(block.id)} disabled={isDeleting === block.id}>
                                    {isDeleting === block.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive" />}
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum bloqueio futuro encontrado para este profissional.</p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
