'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  addDoc, 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp, 
  query, 
  where 
} from 'firebase/firestore';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUserProfile, useFirestore, useCollection, useMemoFirebase, type WithId, type UserProfile } from '@/firebase';
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
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  CalendarIcon, 
  Loader2, 
  Pencil, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Calendar as CalendarViewIcon,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BlockedTime {
  id?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
  professionalId?: string;
}

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
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Redireciona se não for admin
  useEffect(() => {
    if (!isProfileLoading && (!userProfile || userProfile.role !== 'admin')) {
      router.push('/schedule');
    }
  }, [userProfile, isProfileLoading, router]);

  // Consulta todos os bloqueios cadastrados no banco
  const blockedTimesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'blockedTimes');
  }, [firestore]);
  const { data: rawBlockedTimes, isLoading: areBlocksLoading } = useCollection<BlockedTime>(blockedTimesQuery);

  // Consulta profissionais para identificar bloqueios específicos
  const professionalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'professional'));
  }, [firestore]);
  const { data: professionals } = useCollection<UserProfile>(professionalsQuery);

  // Ordena os bloqueios por data mais recente
  const blockedTimes = (rawBlockedTimes || []).slice().sort((a, b) => {
    const timeA = a.startTime?.toMillis ? a.startTime.toMillis() : 0;
    const timeB = b.startTime?.toMillis ? b.startTime.toMillis() : 0;
    return timeB - timeA;
  });

  const form = useForm<BlockTimeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      startTime: '12:00',
      endTime: '13:00',
      reason: 'Almoço'
    }
  });

  // Preenche o formulário para edição
  const handleStartEdit = (block: WithId<BlockedTime>) => {
    setEditingBlockId(block.id);
    const startDate = block.startTime.toDate();
    const endDate = block.endTime.toDate();

    const startH = String(startDate.getHours()).padStart(2, '0');
    const startM = String(startDate.getMinutes()).padStart(2, '0');
    const endH = String(endDate.getHours()).padStart(2, '0');
    const endM = String(endDate.getMinutes()).padStart(2, '0');

    form.reset({
      date: startDate,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      reason: block.reason || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancela a edição
  const handleCancelEdit = () => {
    setEditingBlockId(null);
    form.reset({
      date: new Date(),
      startTime: '12:00',
      endTime: '13:00',
      reason: 'Almoço'
    });
  };

  // Salva ou atualiza o bloqueio
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

    const blockData: any = {
      startTime: Timestamp.fromDate(startDateTime),
      endTime: Timestamp.fromDate(endDateTime),
      reason: reason.trim(),
    };

    if (editingBlockId) {
      // Atualização
      const blockRef = doc(firestore, 'blockedTimes', editingBlockId);
      updateDoc(blockRef, blockData)
        .then(() => {
          toast({
            title: 'Bloqueio atualizado!',
            description: 'As alterações foram salvas e a agenda foi sincronizada.',
          });
          handleCancelEdit();
        })
        .catch((serverError) => {
          console.error(serverError);
          const permissionError = new FirestorePermissionError({
            path: blockRef.path,
            operation: 'update',
            requestResourceData: blockData,
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: 'destructive',
            title: 'Erro ao atualizar',
            description: 'Não foi possível salvar as alterações.',
          });
        })
        .finally(() => {
          setIsSaving(false);
        });
    } else {
      // Novo bloqueio geral
      const blockedTimesRef = collection(firestore, 'blockedTimes');
      addDoc(blockedTimesRef, blockData)
        .then(() => {
          toast({
            title: 'Agenda bloqueada!',
            description: 'O período foi marcado como indisponível no sistema.',
          });
          handleCancelEdit();
        })
        .catch((serverError) => {
          console.error(serverError);
          const permissionError = new FirestorePermissionError({
            path: blockedTimesRef.path,
            operation: 'create',
            requestResourceData: blockData,
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
  }

  // Remove um bloqueio
  const handleDeleteBlock = async (blockId: string) => {
    if (!firestore) return;

    if (!confirm('Deseja realmente remover este bloqueio? O horário voltará a ficar disponível para agendamento.')) {
      return;
    }

    setDeletingId(blockId);
    const blockRef = doc(firestore, 'blockedTimes', blockId);

    deleteDoc(blockRef)
      .then(() => {
        toast({
          title: 'Bloqueio removido!',
          description: 'O horário foi liberado novamente na agenda.',
        });
        if (editingBlockId === blockId) {
          handleCancelEdit();
        }
      })
      .catch((err) => {
        console.error(err);
        const permissionError = new FirestorePermissionError({
          path: blockRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao remover',
          description: 'Não foi possível remover o bloqueio.',
        });
      })
      .finally(() => {
        setDeletingId(null);
      });
  };

  const getProfessionalName = (profId?: string) => {
    if (!profId) return 'Geral (Todo o Estabelecimento)';
    const found = professionals?.find(p => p.id === profId);
    return found?.name || 'Profissional Específico';
  };

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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold tracking-tight text-foreground">
              Bloquear Horários & Agenda
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Defina intervalos indisponíveis para a barbearia e gerencie todos os bloqueios ativos.
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={() => router.push('/schedule')}
          className="text-xs font-medium border-border hover:bg-muted"
        >
          <CalendarViewIcon className="w-4 h-4 mr-1.5 text-primary" />
          Voltar para a Agenda
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: FORMULÁRIO DE BLOQUEIO / EDIÇÃO (5 colunas no desktop) */}
        <div className="lg:col-span-5">
          <Card className={cn(
            "w-full transition-all border shadow-sm bg-card",
            editingBlockId ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20" : "border-border"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-headline flex items-center gap-2 text-foreground">
                  {editingBlockId ? (
                    <>
                      <Pencil className="w-4 h-4 text-amber-500" />
                      Editar Bloqueio
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-primary" />
                      Novo Bloqueio Geral
                    </>
                  )}
                </CardTitle>
                {editingBlockId && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-medium">
                    Modo Edição
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                {editingBlockId 
                  ? 'Altere a data, horários ou o motivo deste bloqueio.' 
                  : 'O horário definido aqui ficará bloqueado para agendamentos online e no WhatsApp.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs font-medium text-foreground">Data do Bloqueio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal border-border justify-start",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                ) : (
                                  <span>Escolha uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-foreground">Hora de Início</FormLabel>
                          <FormControl>
                            <Input type="time" className="border-border" {...field} />
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
                          <FormLabel className="text-xs font-medium text-foreground">Hora de Término</FormLabel>
                          <FormControl>
                            <Input type="time" className="border-border" {...field} />
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
                        <FormLabel className="text-xs font-medium text-foreground">Motivo do Bloqueio</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3}
                            placeholder="Ex: Almoço, Manutenção, Treinamento, Feriado..." 
                            className="resize-none border-border" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] text-muted-foreground">
                          Identificação interna do motivo da indisponibilidade.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className={cn(
                        "flex-1 font-medium",
                        editingBlockId 
                          ? "bg-amber-600 hover:bg-amber-500 text-white" 
                          : ""
                      )}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingBlockId ? 'Salvar Alterações' : 'Bloquear Horário'}
                    </Button>

                    {editingBlockId && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: LISTA DE BLOQUEIOS ATIVOS & HISTÓRICO (7 colunas no desktop) */}
        <div className="lg:col-span-7">
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Bloqueios de Horário Cadastrados
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Todos os períodos travados no sistema de agendamento.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {blockedTimes.length} {blockedTimes.length === 1 ? 'bloqueio' : 'bloqueios'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {areBlocksLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : blockedTimes.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed rounded-2xl border-border bg-muted/10">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Nenhum bloqueio cadastrado</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    A agenda está totalmente livre para agendamentos nos horários normais de funcionamento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedTimes.map((block) => {
                    const blockId = block.id;
                    const startDate = block.startTime.toDate();
                    const endDate = block.endTime.toDate();
                    const isFinished = isPast(endDate);
                    const isGeneral = !block.professionalId;
                    const isCurrentEditing = editingBlockId === blockId;

                    return (
                      <div
                        key={blockId}
                        className={cn(
                          "flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all gap-4",
                          isCurrentEditing
                            ? "border-amber-500/60 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/20"
                            : isFinished 
                            ? "bg-muted/10 border-border/30 opacity-60 hover:opacity-100" 
                            : "bg-muted/20 hover:bg-muted/40 border-border shadow-sm"
                        )}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground text-sm capitalize">
                              {format(startDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </span>

                            {isGeneral ? (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[11px] font-medium">
                                Geral (Estabelecimento)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[11px] font-medium">
                                {getProfessionalName(block.professionalId)}
                              </Badge>
                            )}

                            {isFinished ? (
                              <Badge variant="outline" className="text-muted-foreground border-border/40 text-[10px]">
                                Passado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-medium">
                                Ativo
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {format(startDate, 'HH:mm')} às {format(endDate, 'HH:mm')}
                            </span>
                            
                            <span className="truncate max-w-xs text-muted-foreground" title={block.reason}>
                              Motivo: <strong className="text-foreground font-medium">{block.reason || 'Não informado'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(block)}
                            className={cn(
                              "h-8 px-2.5 text-xs font-medium rounded-lg",
                              isCurrentEditing 
                                ? "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title="Editar bloqueio"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1 text-amber-500" />
                            Editar
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBlock(blockId)}
                            disabled={deletingId === blockId}
                            className="h-8 px-2.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                            title="Excluir bloqueio e liberar horário"
                          >
                            {deletingId === blockId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
                                Remover
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
