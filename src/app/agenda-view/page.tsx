'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  useUser, 
  useUserProfile, 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useDoc,
  type UserProfile 
} from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  doc,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  isPast, 
  addMinutes,
  differenceInMinutes,
  addDays,
  subDays,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  Timer, 
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  RefreshCw,
  MoreHorizontal,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { CompleteServiceDialog } from '@/components/admin/CompleteServiceDialog';
import { useToast } from '@/hooks/use-toast';

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
  serviceDuration: string;
  servicePrice: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

export default function AgendaViewPage() {
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const isToday = isSameDay(selectedDate, new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  // Fetch Settings
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  // Query scheduled appointments for selected date
  const agendaQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'appointments'),
      where('status', '==', 'scheduled'),
      where('startTime', '>=', startOfDay(selectedDate)),
      where('startTime', '<=', endOfDay(selectedDate)),
      orderBy('startTime', 'asc')
    );
  }, [firestore, selectedDate]);

  const { data: appointments, isLoading } = useCollection<Appointment>(agendaQuery);

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleGoToToday = () => setSelectedDate(new Date());

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleUpdateStatus = async (
    appointment: Appointment, 
    newStatus: 'completed' | 'no-show' | 'cancelled',
    completionData?: { notes?: string; photos?: string[] }
  ) => {
    if (!firestore || !userProfile) return;
    setIsUpdating(appointment.id);
    
    try {
      const appointmentRef = doc(firestore, 'appointments', appointment.id);

      await runTransaction(firestore, async (transaction) => {
        const appointmentDoc = await transaction.get(appointmentRef);
        if (!appointmentDoc.exists()) throw new Error('Agendamento não encontrado');

        const updateData: any = {
          status: newStatus,
          updatedAt: Timestamp.now(),
          updatedBy: userProfile.id,
          completionNotes: completionData?.notes || '',
          completionPhotos: completionData?.photos || []
        };

        transaction.update(appointmentRef, updateData);
      });

      toast({ 
        title: 'Sucesso', 
        description: `Agendamento marcado como ${newStatus === 'completed' ? 'concluído' : newStatus}.` 
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCompleteClick = (apt: Appointment) => {
    setAppointmentToComplete(apt);
    setIsCompletionDialogOpen(true);
  };

  const handleConfirmCompletion = async (notes: string, photos: string[]) => {
    if (!appointmentToComplete) return;
    await handleUpdateStatus(appointmentToComplete, 'completed', { notes, photos });
    setAppointmentToComplete(null);
  };

  if (userProfile && userProfile.role === 'client') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Acesso restrito para administradores e profissionais.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-50 transition-all duration-500",
      isFullscreen && "fixed inset-0 z-[100] p-6 lg:p-12 overflow-y-auto"
    )}>
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-8 px-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-2xl">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-headline font-bold tracking-tight">Visão Geral</h1>
            <div className="flex items-center gap-2 group">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevDay}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex flex-col items-center min-w-[180px]">
                <p className="text-slate-50 font-bold capitalize text-lg">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                {!isToday && (
                  <button 
                    onClick={handleGoToToday}
                    className="text-[10px] uppercase tracking-wider text-primary font-bold hover:underline mt-0.5"
                  >
                    Voltar para Hoje
                  </button>
                )}
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextDay}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center gap-8 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">
              {isToday ? 'Hora Atual' : 'Horário'}
            </span>
            <div className="flex items-center gap-3">
              <Clock className={cn("h-5 w-5", isToday ? "text-primary animate-pulse" : "text-slate-600")} />
              <span className="text-4xl font-headline font-black tabular-nums">
                {format(currentTime, 'HH:mm')}
              </span>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-800 hidden md:block" />
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Pendente</span>
            <span className="text-4xl font-headline font-black text-primary">
              {appointments?.length || 0}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-slate-500 hover:text-white hover:bg-slate-800 rounded-full"
            >
              {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Grid Content */}
      <main className="flex-1 px-4 max-w-[1600px] mx-auto w-full">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 w-full rounded-3xl bg-slate-900" />
            ))}
          </div>
        ) : appointments && appointments.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-12">
            {appointments.map((apt, index) => {
              const start = apt.startTime.toDate();
              const isHappeningNow = isToday && isPast(start) && !isPast(apt.endTime.toDate());
              const isNext = index === 0 && !isHappeningNow;

              return (
                <Card 
                  key={apt.id} 
                  className={cn(
                    "relative overflow-hidden border-0 transition-all duration-300 group",
                    isHappeningNow 
                      ? "bg-primary/10 ring-2 ring-primary shadow-[0_0_30px_rgba(var(--primary),0.2)]" 
                      : "bg-slate-900/40 hover:bg-slate-900/60 shadow-xl",
                    isNext && "ring-1 ring-slate-700"
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    isHappeningNow ? "bg-primary" : "bg-slate-800 group-hover:bg-slate-700"
                  )} />

                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
                          <Clock className={cn("h-4 w-4", isHappeningNow ? "text-primary animate-spin-slow" : "text-slate-500")} />
                          <span className="text-lg font-bold tabular-nums">
                            {format(start, 'HH:mm')}
                          </span>
                        </div>
                        {isHappeningNow && (
                          <div className="flex items-center gap-2 bg-primary/20 px-3 py-1 rounded-full animate-pulse">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Ativo</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all h-8 gap-1"
                          onClick={() => handleCompleteClick(apt)}
                          disabled={isUpdating === apt.id}
                        >
                          <Check className="h-3 w-3" />
                          Concluir
                        </Button>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" disabled={isUpdating === apt.id}>
                                {isUpdating === apt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                              <DropdownMenuItem onClick={() => handleCompleteClick(apt)} className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                                <Check className="h-4 w-4 mr-2 text-emerald-500" />
                                Baixa de Serviço
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(apt, 'no-show')} className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer text-amber-500">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Marcar Falta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all">
                        <AvatarImage src={apt.customerPhotoURL} />
                        <AvatarFallback className="bg-slate-800 text-lg font-bold whitespace-nowrap overflow-hidden">
                          {apt.customerName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold truncate group-hover:text-primary transition-colors">
                          {apt.customerName}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Scissors className="h-3 w-3" />
                          <span className="text-sm font-medium truncate">{apt.serviceName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        <span className="font-semibold">{apt.professionalName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Timer className="h-3 w-3" />
                        <span>{apt.serviceDuration} min</span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Scissors className="h-24 w-24 rotate-12" />
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-slate-900 p-8 rounded-full mb-6 border border-slate-800">
              <CheckCircle2 className="h-16 w-16 text-slate-700" />
            </div>
            <h2 className="text-2xl font-headline font-bold mb-2 text-slate-300">
              {isToday ? 'Tudo em dia!' : 'Sem agendamentos'}
            </h2>
            <p className="text-slate-500 max-w-xs">
              {isToday 
                ? 'Todos os agendamentos agendados para hoje foram concluídos ou não há horários marcados.'
                : 'Não existem agendamentos pendentes para esta data.'}
            </p>
          </div>
        )}
      </main>

      <footer className="p-8 text-center text-slate-600 mt-auto opacity-40">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium">
            Powered by <span className="font-bold text-primary">Invivio Tecnologia</span>
          </p>
          <p className="text-[10px] font-bold text-primary">Invivio Velo v1.00056 • Modo Painel Ativo</p>
        </div>
      </footer>

      <CompleteServiceDialog 
        isOpen={isCompletionDialogOpen}
        onOpenChange={setIsCompletionDialogOpen}
        customerName={appointmentToComplete?.customerName || ''}
        serviceName={appointmentToComplete?.serviceName || ''}
        onConfirm={handleConfirmCompletion}
      />

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
