
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { DollarSign, Users, CalendarCheck, Lock, Calendar as CalendarIcon, MoreHorizontal, Pencil, Trash2, Check, X, Loader2, AlertCircle, Filter, Download, RefreshCw, BarChart, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase, useDoc, type UserProfile } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, orderBy, Timestamp, getDocs, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { format, startOfDay, isBefore, subHours, startOfMonth, endOfMonth, endOfDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface BlockedTime {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
}

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
  customerEmail?: string;
  customerPhoneNumber?: string;
  serviceDuration: string;
  servicePrice: number;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
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

  if (userProfile.role === 'admin') {
    return <AdminDashboard />;
  }

  if (userProfile.role === 'professional') {
    return <ProfessionalDashboard />;
  }

  if (userProfile.role === 'client') {
    return <ClientDashboard />;
  }

  return null;
}

function AdminDashboard() {
  const firestore = useFirestore();
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
  const [periodType, setPeriodType] = useState<'day' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  // Fetch Professionals
  const professionalsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), where('role', '==', 'professional')) : null
    , [firestore]);
  const { data: professionals } = useCollection<UserProfile>(professionalsQuery);

  // Stats Query with Explicit Construction
  const statsQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    const collectionRef = collection(firestore, 'appointments');
    let start, end;

    if (periodType === 'day') {
      start = startOfDay(selectedDate);
      end = endOfDay(selectedDate);
    } else {
      start = startOfMonth(selectedMonth);
      end = endOfMonth(selectedMonth);
    }

    // Base query constraints
    const constraints: any[] = [
      where('status', '==', 'completed'),
      where('startTime', '>=', start),
      where('startTime', '<=', end),
      orderBy('startTime', 'desc')
    ];

    if (selectedProfessionalId !== 'all') {
      constraints.push(where('professionalId', '==', selectedProfessionalId));
    }

    return query(collectionRef, ...constraints);
  }, [firestore, selectedProfessionalId, periodType, selectedDate, selectedMonth]);

  const { data: appointments, isLoading: areStatsLoading } = useCollection<Appointment>(statsQuery);

  // Calculate Metrics
  const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.servicePrice || 0), 0) || 0;
  const totalAppointments = appointments?.length || 0;
  const uniqueClients = new Set(appointments?.map(a => a.customerId)).size || 0;

  // Format Currency
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Month Navigation
  const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">Visão geral do desempenho do estúdio.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Professional Filter */}
          <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os Profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Profissionais</SelectItem>
              {professionals?.map(pro => (
                <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period Type Filter */}
          <Select value={periodType} onValueChange={(v: 'day' | 'month') => setPeriodType(v)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Diário</SelectItem>
              <SelectItem value="month">Mensal</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Controls */}
          {periodType === 'day' ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-2 border rounded-md p-1 bg-background">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium w-[150px] text-center capitalize">{format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {areStatsLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground capitalize mt-1">
              Período: {periodType === 'day' ? format(selectedDate, "dd/MM/yyyy") : format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {areStatsLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{totalAppointments}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Concluídos no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {areStatsLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{uniqueClients}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Clientes únicos</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Agendamentos</CardTitle>
            {!areStatsLoading && appointments && appointments.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {appointments.length} registros encontrados
              </div>
            )}
          </div>
          <CardDescription>Lista detalhada de serviços realizados.</CardDescription>
        </CardHeader>
        <CardContent>
          {areStatsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {appointments.map(apt => (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={apt.customerPhotoURL} />
                      <AvatarFallback>{apt.customerName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{apt.serviceName}</p>
                      <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:gap-2">
                        <span>Cliente: {apt.customerName}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Prof: {apt.professionalName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(apt.servicePrice || 0)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{format(apt.startTime.toDate(), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
              <CalendarCheck className="h-10 w-10 mb-2 opacity-20" />
              <p>Nenhum agendamento concluído encontrado para este período.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfessionalDashboard() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[] | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[] | null>(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [todayCommission, setTodayCommission] = useState(0);
  const [monthCommission, setMonthCommission] = useState(0);
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);

  const [areUpcomingLoading, setAreUpcomingLoading] = useState(true);
  const [arePendingLoading, setArePendingLoading] = useState(true);
  const [areStatsLoading, setAreStatsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);

  useEffect(() => {
    if (!isAuthLoading && user && firestore && settings) {
      const fetchAppointments = async () => {
        setAreUpcomingLoading(true);
        setArePendingLoading(true);
        setAreStatsLoading(true);

        const now = new Date();
        const startOfToday = startOfDay(now);
        const startOfCurrentMonth = startOfMonth(now);

        const upcomingQuery = query(
          collection(firestore, 'appointments'),
          where('professionalId', '==', user.uid),
          where('status', '==', 'scheduled'),
          where('startTime', '>=', startOfToday),
          orderBy('startTime', 'asc')
        );

        const pendingQuery = query(
          collection(firestore, 'appointments'),
          where('professionalId', '==', user.uid),
          where('status', '==', 'scheduled'),
          where('startTime', '<', startOfToday),
          orderBy('startTime', 'asc')
        );

        const monthStatsQuery = query(
          collection(firestore, 'appointments'),
          where('professionalId', '==', user.uid),
          where('status', '==', 'completed'),
          where('startTime', '>=', startOfCurrentMonth)
        );

        try {
          const [upcomingSnapshot, pendingSnapshot, monthStatsSnapshot] = await Promise.all([
            getDocs(upcomingQuery),
            getDocs(pendingQuery),
            getDocs(monthStatsQuery)
          ]);

          const upcoming = upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          const pending = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

          setUpcomingAppointments(upcoming);
          setPendingAppointments(pending);

          // Calculate Stats
          let dayRev = 0;
          let monthRev = 0;
          let dayCount = 0;

          const commissionRate = (settings.professionalCommissionPercentage || 25) / 100;

          monthStatsSnapshot.docs.forEach(doc => {
            const data = doc.data() as Appointment;
            const price = data.servicePrice || 0;
            const date = data.startTime.toDate();

            monthRev += price;

            if (date >= startOfToday) {
              dayRev += price;
              dayCount++;
            }
          });

          setTodayRevenue(dayRev);
          setMonthRevenue(monthRev);
          setTodayCommission(dayRev * commissionRate);
          setMonthCommission(monthRev * commissionRate);
          setTodayAppointmentsCount(dayCount);

        } catch (err: any) {
          console.error("Error fetching dashboard data", err);
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'appointments',
            operation: 'list'
          }));
          setUpcomingAppointments(null);
          setPendingAppointments(null);
        } finally {
          setAreUpcomingLoading(false);
          setArePendingLoading(false);
          setAreStatsLoading(false);
        }
      };

      fetchAppointments();
    } else if (!isAuthLoading && !user) {
      setAreUpcomingLoading(false);
      setArePendingLoading(false);
      setAreStatsLoading(false);
    }
  }, [user, firestore, isAuthLoading, settings]);

  const handleUpdateAppointmentStatus = async (
    appointment: Appointment,
    newStatus: 'completed' | 'no-show'
  ) => {
    if (!firestore || !settings || !user) return;

    setIsUpdating(appointment.id);

    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    const clientProfileRef = doc(firestore, 'users', appointment.customerId);
    const professionalProfileRef = doc(firestore, 'users', user.uid);

    try {
      await runTransaction(firestore, async (transaction) => {
        const [profDoc, clientDoc] = await Promise.all([
          transaction.get(professionalProfileRef),
          transaction.get(clientProfileRef)
        ]);

        if (!profDoc.exists()) throw new Error("Perfil do profissional não encontrado.");
        if (!clientDoc.exists()) throw new Error("Perfil do cliente não encontrado.");

        const currentPoints = clientDoc.data().loyaltyPoints || 0;
        let newPoints = currentPoints;

        if (newStatus === 'completed') {
          const price = appointment.servicePrice || 0;
          const percentage = settings.loyaltyPercentage || 10;
          const pointsToAward = Math.round((price * percentage) / 100);
          newPoints += pointsToAward;
        } else if (newStatus === 'no-show') {
          newPoints = Math.max(0, currentPoints - (settings.pointsPenaltyForNoShow || 5));
        }

        transaction.update(appointmentRef, { status: newStatus });
        transaction.update(clientProfileRef, { loyaltyPoints: newPoints });
      });

      toast({
        title: 'Status Atualizado!',
        description: `O agendamento foi marcado como ${newStatus === 'completed' ? 'concluído' : 'não comparecimento'}.`,
      });

      setUpcomingAppointments(prev => prev?.filter(apt => apt.id !== appointment.id) || null);
      setPendingAppointments(prev => prev?.filter(apt => apt.id !== appointment.id) || null);

      if (newStatus === 'completed') {
        const price = appointment.servicePrice || 0;
        const commissionRate = (settings.professionalCommissionPercentage || 25) / 100;

        setTodayRevenue(prev => prev + price);
        setMonthRevenue(prev => prev + price);
        setTodayCommission(prev => prev + (price * commissionRate));
        setMonthCommission(prev => prev + (price * commissionRate));
        setTodayAppointmentsCount(prev => prev + 1);
      }

    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `appointments/${appointment.id}`,
        operation: 'update'
      }));
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status.',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const isLoading = isAuthLoading || areUpcomingLoading || areSettingsLoading || arePendingLoading || areStatsLoading;

  const AppointmentItem = ({ appointment }: { appointment: Appointment }) => (
    <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
      <div className="flex items-center gap-4">
        <CalendarIcon className="h-6 w-6 text-primary" />
        <div>
          <p className="font-semibold">{appointment.serviceName}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {format(appointment.startTime.toDate(), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground">
            {appointment.servicePrice ? `R$ ${appointment.servicePrice.toFixed(2)}` : 'Preço não disponível'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={appointment.customerPhotoURL || ''} alt={appointment.customerName} />
          <AvatarFallback>{appointment.customerName?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{appointment.customerName}</p>
          {appointment.customerEmail && (
            <a href={`mailto:${appointment.customerEmail}`} className="text-sm text-muted-foreground hover:underline">
              {appointment.customerEmail}
            </a>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isUpdating === appointment.id}>
            {isUpdating === appointment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(appointment, 'completed')}>
            <Check className="mr-2 h-4 w-4" />
            Serviço Concluído
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(appointment, 'no-show')} className="text-destructive focus:text-destructive">
            <X className="mr-2 h-4 w-4" />
            Não Compareceu
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          {isAuthLoading ? <Skeleton className="h-9 w-48" /> : `Olá, ${user?.displayName}!`}
        </h1>
        <p className="text-muted-foreground">Aqui está o resumo do seu dia.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {areStatsLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold">R$ {todayRevenue.toFixed(2).replace('.', ',')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {todayAppointmentsCount} atendimentos hoje
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sua Comissão Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {areStatsLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold text-emerald-600">R$ {todayCommission.toFixed(2).replace('.', ',')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings?.professionalCommissionPercentage || 25}% do faturamento
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão do Mês</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {areStatsLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">R$ {monthCommission.toFixed(2).replace('.', ',')}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Acumulado mensal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Cliente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {arePendingLoading || areUpcomingLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-xl font-bold truncate">
                {upcomingAppointments && upcomingAppointments.length > 0
                  ? upcomingAppointments[0].customerName
                  : (pendingAppointments && pendingAppointments.length > 0 ? pendingAppointments[0].customerName : 'Nenhum')}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {upcomingAppointments && upcomingAppointments.length > 0
                ? `Às ${format(upcomingAppointments[0].startTime.toDate(), 'HH:mm')}`
                : 'Sem agendamentos próximos'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <AlertCircle className="text-amber-500" />
            Ações Necessárias
          </CardTitle>
          <CardDescription>Agendamentos passados que precisam de baixa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : pendingAppointments && pendingAppointments.length > 0 ? (
            <div className="space-y-4">
              {pendingAppointments.map((apt) => <AppointmentItem key={apt.id} appointment={apt} />)}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhuma ação pendente.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Próximos Agendamentos</CardTitle>
          <CardDescription>Seus horários confirmados para os próximos dias.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => <AppointmentItem key={apt.id} appointment={apt} />)}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Você não tem nenhum agendamento futuro.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientDashboard() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[] | null>(null);
  const [areUpcomingLoading, setAreUpcomingLoading] = useState(true);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellableStates, setCancellableStates] = useState<Record<string, boolean>>({});

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);

  useEffect(() => {
    if (!isAuthLoading && user && firestore) {
      const fetchAppointments = async () => {
        setAreUpcomingLoading(true);
        const upcomingAppointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('customerId', '==', user.uid),
          where('status', '==', 'scheduled'),
          where('startTime', '>=', startOfDay(new Date())),
          orderBy('startTime', 'asc')
        );

        try {
          const querySnapshot = await getDocs(upcomingAppointmentsQuery);
          const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          setUpcomingAppointments(appointments);
        } catch (err: any) {
          setUpcomingAppointments(null);
        } finally {
          setAreUpcomingLoading(false);
        }
      };
      fetchAppointments();
    } else if (!isAuthLoading && !user) {
      setAreUpcomingLoading(false);
    }
  }, [user, firestore, isAuthLoading]);

  useEffect(() => {
    if (!upcomingAppointments || areSettingsLoading) return;
    const timeLimitHours = settings?.cancellationTimeLimitHours ?? 24;
    const newStates: Record<string, boolean> = {};
    upcomingAppointments.forEach(apt => {
      const cancellationCutoff = subHours(apt.startTime.toDate(), timeLimitHours);
      newStates[apt.id] = isBefore(new Date(), cancellationCutoff);
    });
    setCancellableStates(newStates);
  }, [upcomingAppointments, settings, areSettingsLoading]);

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel || !firestore) return;
    setIsCancelling(true);
    const docRef = doc(firestore, 'appointments', appointmentToCancel.id);
    try {
      await updateDoc(docRef, { status: 'cancelled' });
      toast({ title: 'Agendamento Cancelado!', description: 'Seu horário foi removido da agenda.' });
      setUpcomingAppointments(prev => prev?.filter(apt => apt.id !== appointmentToCancel.id) || null);
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { status: 'cancelled' } }));
    } finally {
      setIsCancelling(false);
      setAppointmentToCancel(null);
    }
  };

  const handleReschedule = async (appointment: Appointment) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'appointments', appointment.id);
    try {
      await updateDoc(docRef, { status: 'cancelled' });
      toast({ title: 'Horário Liberado', description: 'Seu agendamento anterior foi cancelado. Escolha um novo horário.' });
      router.push('/book-appointment');
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { status: 'cancelled' } }));
    }
  };

  const isLoading = isAuthLoading || areUpcomingLoading || areSettingsLoading;

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
          <CardDescription>Sua agenda confirmada. Limite de alteração: {settings?.cancellationTimeLimitHours ?? 24}h.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
          ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
            <TooltipProvider>
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => {
                  const canCancel = cancellableStates[apt.id] ?? false;
                  return (
                    <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                        <div>
                          <p className="font-semibold">{apt.serviceName}</p>
                          <p className="text-sm text-muted-foreground">Com {apt.professionalName}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold capitalize">{format(apt.startTime.toDate(), "EEEE, dd/MM", { locale: ptBR })}</p>
                        <p className="text-sm text-muted-foreground">às {format(apt.startTime.toDate(), "HH:mm")}</p>
                      </div>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!canCancel}><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => handleReschedule(apt)}><Pencil className="mr-2 h-4 w-4" />Reagendar</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setAppointmentToCancel(apt)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Cancelar</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipTrigger>
                        {!canCancel && <TooltipContent><p>Não é possível alterar com menos de {settings?.cancellationTimeLimitHours ?? 24}h de antecedência.</p></TooltipContent>}
                      </Tooltip>
                    </div>
                  )
                })}
              </div>
            </TooltipProvider>
          ) : (
            <p className="text-muted-foreground text-center py-4">Você não tem nenhum agendamento futuro.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja cancelar seu agendamento para <strong>{appointmentToCancel?.serviceName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} disabled={isCancelling}>{isCancelling ? 'Cancelando...' : 'Sim, cancelar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
