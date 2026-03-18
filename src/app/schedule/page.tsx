
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, CalendarCheck, Lock, Calendar as CalendarIcon, MoreHorizontal, Pencil, Trash2, Check, X, Loader2, AlertCircle, Filter, Download, RefreshCw, BarChart, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase, useDoc, type UserProfile } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, orderBy, Timestamp, getDocs, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { format, startOfDay, isBefore, subHours, startOfMonth, endOfMonth, endOfDay, addMonths, subMonths, isSameMonth, addMinutes } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Service } from '@/app/services/page';


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

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isUpdatingAppointment, setIsUpdatingAppointment] = useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

  // Fetch Professionals and Services for Dialogs
  const professionalsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), where('role', '==', 'professional')) : null
    , [firestore]);
  const { data: professionals } = useCollection<UserProfile>(professionalsQuery);

  const allServicesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'services'), orderBy('name', 'asc')) : null
    , [firestore]);
  const { data: services } = useCollection<Service>(allServicesQuery);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  const handleEditAppointment = (apt: Appointment) => {
    setEditingAppointment({ ...apt });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStatus = async (appointment: Appointment, newStatus: 'completed' | 'no-show' | 'cancelled') => {
    if (!firestore || !settings || !user) return false;

    try {
      const appointmentRef = doc(firestore, 'appointments', appointment.id);
      const clientProfileRef = doc(firestore, 'users', appointment.customerId);

      await runTransaction(firestore, async (transaction) => {
        const clientDoc = await transaction.get(clientProfileRef);
        if (!clientDoc.exists()) throw new Error("Perfil do cliente não encontrado.");

        const currentPoints = clientDoc.data().loyaltyPoints || 0;
        let newPoints = currentPoints;

        if (newStatus === 'completed') {
          const price = appointment.servicePrice || 0;
          const percentage = settings.loyaltyPercentage || 10;
          const pointsToAward = Math.round((price * percentage) / 100);
          newPoints += pointsToAward;

          const txRef = doc(collection(firestore, 'loyaltyTransactions'));
          transaction.set(txRef, {
            clientId: appointment.customerId,
            type: 'earned',
            points: pointsToAward,
            description: `Serviço Concluído: ${appointment.serviceName}`,
            date: Timestamp.now(),
            appointmentId: appointment.id
          });
        } else if (newStatus === 'no-show') {
          const penalty = settings.pointsPenaltyForNoShow || 5;
          newPoints = Math.max(0, currentPoints - penalty);

          if (currentPoints > 0) {
            const deductAmount = Math.min(currentPoints, penalty);
            const txRef = doc(collection(firestore, 'loyaltyTransactions'));
            transaction.set(txRef, {
              clientId: appointment.customerId,
              type: 'deducted',
              points: deductAmount,
              description: 'Penalidade: Não Comparecimento',
              date: Timestamp.now(),
              appointmentId: appointment.id
            });
          }
        }

        transaction.update(clientProfileRef, { loyaltyPoints: newPoints });
        transaction.update(appointmentRef, { 
          status: newStatus,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid 
        });
      });

      toast({
        title: 'Status Atualizado!',
        description: `O agendamento foi marcado como ${newStatus === 'completed' ? 'concluído' : newStatus === 'no-show' ? 'não comparecimento' : 'cancelado'}.`,
      });
      
      return true;
    } catch (e: any) {
      console.error("Error updating status", e);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status.',
      });
      return false;
    }
  };

  const handleCancelClick = (apt: Appointment) => {
    setAppointmentToCancel(apt);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!firestore || !appointmentToCancel) return;
    setIsUpdatingAppointment(true);
    try {
      const success = await handleUpdateStatus(appointmentToCancel, 'cancelled');
      if (success) {
        setIsCancelDialogOpen(false);
      }
    } finally {
      setIsUpdatingAppointment(false);
      setAppointmentToCancel(null);
    }
  };

  const handleUpdateAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingAppointment) return;

    setIsUpdatingAppointment(true);
    const { id, ...data } = editingAppointment;

    try {
      const selectedPro = professionals?.find(p => p.id === editingAppointment.professionalId);
      const selectedSvc = services?.find(s => (s as any).id === editingAppointment.serviceId);

      const updateData: any = {
        professionalId: editingAppointment.professionalId,
        serviceId: editingAppointment.serviceId,
        startTime: editingAppointment.startTime,
        serviceName: selectedSvc?.name || editingAppointment.serviceName,
        servicePrice: selectedSvc?.price || editingAppointment.servicePrice,
        professionalName: selectedPro?.name || editingAppointment.professionalName,
      };

      const duration = parseInt(selectedSvc?.duration || editingAppointment.serviceDuration || '30', 10);
      const start = editingAppointment.startTime.toDate();
      const end = addMinutes(start, duration);
      updateData.endTime = Timestamp.fromDate(end);
      updateData.serviceDuration = String(duration);

      await updateDoc(doc(firestore, 'appointments', id), updateData);
      toast({ title: 'Sucesso', description: 'Agendamento atualizado com sucesso.' });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao atualizar o agendamento.', variant: 'destructive' });
    } finally {
      setIsUpdatingAppointment(false);
    }
  };

  if (isLoading || !userProfile) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  const dashboardProps = { 
    onEditAppointment: handleEditAppointment,
    onCancelClick: handleCancelClick,
    onUpdateStatus: handleUpdateStatus,
  };

  const dashComponent = () => {
    if (userProfile.role === 'admin') return <AdminDashboard {...dashboardProps} professionals={professionals || undefined} services={services || undefined} settings={settings || undefined} />;
    if (userProfile.role === 'professional') return <ProfessionalDashboard userProfile={userProfile} {...dashboardProps} />;
    if (userProfile.role === 'client') return <ClientDashboard userProfile={userProfile} />;
    return null;
  };

  return (
    <>
      {dashComponent()}
      
      {/* Edit Appointment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Altere os detalhes do agendamento para {editingAppointment?.customerName}.
            </DialogDescription>
          </DialogHeader>
          {editingAppointment && (
            <form onSubmit={handleUpdateAppointmentSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select 
                  value={editingAppointment.professionalId} 
                  onValueChange={(val) => setEditingAppointment({...editingAppointment, professionalId: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals?.map(pro => (
                      <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select 
                  value={editingAppointment.serviceId} 
                  onValueChange={(val) => setEditingAppointment({...editingAppointment, serviceId: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map(svc => (
                      <SelectItem key={svc.id} value={svc.id}>{svc.name} ({svc.duration})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(editingAppointment.startTime.toDate(), "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar 
                        mode="single" 
                        selected={editingAppointment.startTime.toDate()} 
                        onSelect={(date) => {
                          if (!date) return;
                          const current = editingAppointment.startTime.toDate();
                          const newDate = new Date(date);
                          newDate.setHours(current.getHours(), current.getMinutes());
                          setEditingAppointment({...editingAppointment, startTime: Timestamp.fromDate(newDate)});
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input 
                    type="time" 
                    value={format(editingAppointment.startTime.toDate(), "HH:mm")}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newDate = new Date(editingAppointment.startTime.toDate());
                      newDate.setHours(hours, minutes);
                      setEditingAppointment({...editingAppointment, startTime: Timestamp.fromDate(newDate)});
                    }}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isUpdatingAppointment}>
                  {isUpdatingAppointment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Appointment Alert */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente cancelar o agendamento de <strong>{appointmentToCancel?.customerName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isUpdatingAppointment}
            >
              {isUpdatingAppointment ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AdminDashboard({ 
  onEditAppointment, 
  onCancelClick,
  onUpdateStatus,
  professionals,
  services,
  settings 
}: { 
  onEditAppointment: (apt: Appointment) => void;
  onCancelClick: (apt: Appointment) => void;
  onUpdateStatus: (apt: Appointment, status: 'completed' | 'no-show' | 'cancelled') => Promise<boolean>;
  professionals: UserProfile[] | undefined;
  services: Service[] | undefined;
  settings: EstablishmentSettings | undefined;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
  const [periodType, setPeriodType] = useState<'day' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [showPending, setShowPending] = useState(false);


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

  // Upcoming Appointments Query
  const upcomingQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    const collectionRef = collection(firestore, 'appointments');
    const startOfToday = startOfDay(new Date());

    const constraints: any[] = [
      where('status', '==', 'scheduled'),
      where('startTime', '>=', startOfToday),
      orderBy('startTime', 'asc')
    ];

    if (selectedProfessionalId !== 'all') {
      constraints.push(where('professionalId', '==', selectedProfessionalId));
    }

    return query(collectionRef, ...constraints);
  }, [firestore, selectedProfessionalId]);

  const { data: appointments, isLoading: areStatsLoading } = useCollection<Appointment>(statsQuery);
  const { data: upcomingAppointments, isLoading: isUpcomingLoading } = useCollection<Appointment>(upcomingQuery);

  // Pending Appointments Query (Scheduled but in the past)
  const pendingQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    const collectionRef = collection(firestore, 'appointments');
    const startOfToday = startOfDay(new Date());

    const constraints: any[] = [
      where('status', '==', 'scheduled'),
      where('startTime', '<', startOfToday),
      orderBy('startTime', 'asc')
    ];

    if (selectedProfessionalId !== 'all') {
      constraints.push(where('professionalId', '==', selectedProfessionalId));
    }

    return query(collectionRef, ...constraints);
  }, [firestore, selectedProfessionalId]);

  const { data: pendingAppointments, isLoading: isPendingLoading } = useCollection<Appointment>(pendingQuery);

  // Calculate Metrics
  const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.servicePrice || 0), 0) || 0;
  const totalAppointments = appointments?.length || 0;
  const uniqueClients = new Set(appointments?.map(a => a.customerId)).size || 0;

  // Format Currency
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Derived state for filtered history
  const filteredHistory = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(apt => {
      const matchesSearch = apt.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = selectedService === 'all' || apt.serviceName === selectedService;
      return matchesSearch && matchesService;
    });
  }, [appointments, searchTerm, selectedService]);

  // Unique services for the filter dropdown
  const uniqueServices = useMemo(() => {
    if (!appointments) return [];
    return Array.from(new Set(appointments.map(a => a.serviceName)));
  }, [appointments]);

  // Month Navigation
  const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  const handleExportCSV = () => {
    if (!filteredHistory || filteredHistory.length === 0) return;

    const commissionRate = (settings?.professionalCommissionPercentage || 25) / 100;

    const headers = ['Data', 'Hora', 'Cliente', 'Serviço', 'Profissional', 'Valor (R$)', 'Comissão Profissional (R$)'];
    const csvContent = [
      headers.join(','),
      ...filteredHistory.map(apt => {
        const date = apt.startTime.toDate();
        const price = apt.servicePrice || 0;
        const commission = price * commissionRate;
        return [
          format(date, 'dd/MM/yyyy'),
          format(date, 'HH:mm'),
          `"${apt.customerName}"`,
          `"${apt.serviceName}"`,
          `"${apt.professionalName}"`,
          price.toFixed(2),
          commission.toFixed(2)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_admin_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">Visão geral do desempenho do estabelecimento.</p>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agenda de Atendimentos</CardTitle>
              <CardDescription>Gerencie os horários marcados do estabelecimento.</CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
              <Button 
                variant={!showPending ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setShowPending(false)}
                className="h-8"
              >
                Próximos ({upcomingAppointments?.length || 0})
              </Button>
              <Button 
                variant={showPending ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setShowPending(true)}
                className={cn(
                  "h-8 text-orange-600 transition-all",
                  pendingAppointments && pendingAppointments.length > 0 && !showPending && "ring-2 ring-orange-500 animate-pulse font-bold"
                )}
              >
                Pendentes ({pendingAppointments?.length || 0})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isUpcomingLoading || isPendingLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-[120px] w-full" />
            </div>
          ) : (showPending ? pendingAppointments : upcomingAppointments)?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(showPending ? pendingAppointments : upcomingAppointments)?.map((apt) => (
                <div key={apt.id} className={cn(
                  "flex flex-col p-4 border rounded-lg hover:border-primary transition-colors gap-3 bg-card/50",
                  showPending && "border-orange-200 bg-orange-50/30"
                )}>
                  <div className="flex items-center justify-between">
                    <Badge variant={showPending ? "destructive" : "outline"} className="capitalize">
                      {format(apt.startTime.toDate(), "EEEE, dd/MM", { locale: ptBR })}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        {format(apt.startTime.toDate(), "HH:mm")}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1">
                            <span className="hidden sm:inline">Opções</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onUpdateStatus(apt, 'completed')}>
                            <Check className="h-4 w-4 mr-2 text-emerald-600" />
                            Concluir Atendimento
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onUpdateStatus(apt, 'no-show')}>
                            <AlertCircle className="h-4 w-4 mr-2 text-orange-600" />
                            Não Compareceu
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onEditAppointment(apt)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar Agendamento
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onSelect={() => onCancelClick(apt)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rejeitar Agendamento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={apt.customerPhotoURL} />
                      <AvatarFallback>{apt.customerName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{apt.serviceName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="truncate">Profissional: {apt.professionalName}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>{showPending ? "Nenhum agendamento pendente." : "Nenhum agendamento futuro encontrado."}</p>
            </div>
          )}
        </CardContent>
      </Card>


      <Card className="col-span-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Serviços</CardTitle>
            <div className="flex items-center gap-4">
              {!areStatsLoading && filteredHistory && filteredHistory.length > 0 && (
                <div className="text-sm text-muted-foreground mr-2">
                  {filteredHistory.length} registros encontrados
                </div>
              )}
              <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!filteredHistory || filteredHistory.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
            </div>
          </div>
          <CardDescription>Lista detalhada de serviços realizados.</CardDescription>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Filtrar por serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os serviços</SelectItem>
                {uniqueServices.map(service => (
                  <SelectItem key={service} value={service}>{service}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {areStatsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredHistory && filteredHistory.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredHistory.map(apt => (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={apt.customerPhotoURL} />
                        <AvatarFallback>{apt.customerName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{apt.customerName}</p>
                        <p className="text-xs text-muted-foreground">{apt.serviceName}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span>Prof: {apt.professionalName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:self-auto">
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(apt.servicePrice || 0)}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{format(apt.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1 px-3">
                          <span>Opções</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEditAppointment(apt)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => onCancelClick(apt)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover/Rejeitar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
              <CalendarCheck className="h-10 w-10 mb-2 opacity-20" />
              <p>Nenhum serviço encontrado com os filtros selecionados.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfessionalDashboard({ 
  userProfile, 
  onEditAppointment, 
  onCancelClick,
  onUpdateStatus
}: { 
  userProfile: UserProfile, 
  onEditAppointment: (apt: Appointment) => void, 
  onCancelClick: (apt: Appointment) => void,
  onUpdateStatus: (apt: Appointment, status: 'completed' | 'no-show' | 'cancelled') => Promise<boolean>
}) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[] | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[] | null>(null);
  const [monthCompletedAppointments, setMonthCompletedAppointments] = useState<Appointment[] | null>(null);

  // Filters for the history
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
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
          where('startTime', '>=', startOfMonth(selectedMonth)),
          where('startTime', '<=', endOfMonth(selectedMonth)),
          orderBy('startTime', 'desc')
        );

        try {
          const [upcomingSnapshot, pendingSnapshot, monthStatsSnapshot] = await Promise.all([
            getDocs(upcomingQuery),
            getDocs(pendingQuery),
            getDocs(monthStatsQuery)
          ]);

          const upcoming = upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          const pending = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          const monthCompleted = monthStatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

          setUpcomingAppointments(upcoming);
          setPendingAppointments(pending);
          setMonthCompletedAppointments(monthCompleted);

          // Calculate Stats
          let dayRev = 0;
          let monthRev = 0;
          let dayCount = 0;

          const commissionRate = (settings.professionalCommissionPercentage || 25) / 100;

          monthCompleted.forEach(data => {
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
  }, [user, firestore, isAuthLoading, settings, selectedMonth]);

  // Derived state for filtered history
  const filteredHistory = useMemo(() => {
    if (!monthCompletedAppointments) return [];
    return monthCompletedAppointments.filter(apt => {
      const matchesSearch = apt.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = selectedService === 'all' || apt.serviceName === selectedService;
      return matchesSearch && matchesService;
    });
  }, [monthCompletedAppointments, searchTerm, selectedService]);

  // Unique services for the filter dropdown
  const uniqueServices = useMemo(() => {
    if (!monthCompletedAppointments) return [];
    return Array.from(new Set(monthCompletedAppointments.map(a => a.serviceName)));
  }, [monthCompletedAppointments]);

  const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  const handleExportCSV = () => {
    if (!filteredHistory || filteredHistory.length === 0) return;

    const headers = ['Data', 'Hora', 'Cliente', 'Serviço', 'Comissão (R$)', 'Valor Total (R$)'];
    const csvContent = [
      headers.join(','),
      ...filteredHistory.map(apt => {
        const date = apt.startTime.toDate();
        const price = apt.servicePrice || 0;
        const commission = price * ((settings?.professionalCommissionPercentage || 25) / 100);
        return [
          format(date, 'dd/MM/yyyy'),
          format(date, 'HH:mm'),
          `"${apt.customerName}"`,
          `"${apt.serviceName}"`,
          commission.toFixed(2),
          price.toFixed(2)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `minhas_comissoes_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateAppointmentStatus = async (
    appointment: Appointment,
    newStatus: 'completed' | 'no-show' | 'cancelled'
  ) => {
    setIsUpdating(appointment.id);
    const success = await onUpdateStatus(appointment, newStatus);
    
    if (success) {
      setUpcomingAppointments(prev => prev?.filter(apt => apt.id !== appointment.id) || null);
      setPendingAppointments(prev => prev?.filter(apt => apt.id !== appointment.id) || null);

      if (newStatus === 'completed') {
        const price = appointment.servicePrice || 0;
        const commissionRate = (settings?.professionalCommissionPercentage || 25) / 100;

        setTodayRevenue(prev => prev + price);
        setMonthRevenue(prev => prev + price);
        setTodayCommission(prev => prev + (price * commissionRate));
        setMonthCommission(prev => prev + (price * commissionRate));
        setTodayAppointmentsCount(prev => prev + 1);

        const completedAppointment = { ...appointment, status: 'completed' as const };
        setMonthCompletedAppointments(prev => prev ? [completedAppointment, ...prev].sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis()) : [completedAppointment]);
      }
    }
    setIsUpdating(null);
  };

  const isLoading = isAuthLoading || areUpcomingLoading || areSettingsLoading || arePendingLoading || areStatsLoading;

  // Extremely robust name check
  const getSafeDisplayName = () => {
    const profileName = userProfile?.name;
    const authName = user?.displayName;

    const isValid = (val: any) => {
      if (!val) return false;
      const s = String(val).trim().toLowerCase();
      return s !== '' && s !== 'null' && s !== 'undefined';
    };

    if (isValid(profileName)) return String(profileName).trim();
    if (isValid(authName)) return String(authName).trim();

    // Forced fallback for Alberto to verify if we are even hitting this code
    if (user?.email === 'linuxstring@gmail.com' || user?.uid === 'dX0V5L0tiLe77dBA3euE6dpfUe02') {
      return 'Alberto Messias';
    }

    return 'usuário';
  };

  const displayName = getSafeDisplayName();

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
      {(userProfile?.role === 'admin' || settings?.allowProfessionalToCompleteAppointment !== false) && (
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
            {userProfile?.role === 'admin' && (
              <DropdownMenuItem onSelect={() => onEditAppointment(appointment)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar (como Admin)
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(appointment, 'no-show')} className="text-destructive focus:text-destructive">
              <X className="mr-2 h-4 w-4" />
              Não Compareceu
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(appointment, 'cancelled')} className="text-destructive focus:text-destructive">
              <X className="mr-2 h-4 w-4" />
              Rejeitar/Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          {isLoading ? <Skeleton className="h-9 w-48" /> : `Olá, ${displayName}!`}
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

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline">Histórico de Serviços</CardTitle>
              <CardDescription>
                Detalhes dos serviços em {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}. Total ganho: R$ {monthCommission.toFixed(2).replace('.', ',')}
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!filteredHistory || filteredHistory.length === 0} className="mr-2">
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
              <div className="flex items-center gap-2 border rounded-md p-1 bg-background">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium w-[120px] text-center capitalize">{format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8" disabled={isSameMonth(selectedMonth, new Date())}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Filtrar por serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os serviços</SelectItem>
                {uniqueServices.map(service => (
                  <SelectItem key={service} value={service}>{service}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {areStatsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredHistory && filteredHistory.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredHistory.map(apt => (
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
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-emerald-600">
                      + R$ {((apt.servicePrice || 0) * ((settings?.professionalCommissionPercentage || 25) / 100)).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Serviço: R$ {(apt.servicePrice || 0).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {format(apt.startTime.toDate(), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {userProfile?.role === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1 px-3">
                          <span>Opções</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEditAppointment(apt)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Detalhes (Admin)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => onCancelClick(apt)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover/Rejeitar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
              <CalendarCheck className="h-10 w-10 mb-2 opacity-20" />
              <p>Nenhum serviço encontrado com os filtros selecionados.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientDashboard({ userProfile }: { userProfile: UserProfile }) {
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

  // Extremely robust name check
  const getSafeDisplayName = () => {
    const profileName = userProfile?.name;
    const authName = user?.displayName;

    const isValid = (val: any) => {
      if (!val) return false;
      const s = String(val).trim().toLowerCase();
      return s !== '' && s !== 'null' && s !== 'undefined';
    };

    if (isValid(profileName)) return String(profileName).trim();
    if (isValid(authName)) return String(authName).trim();
    return 'usuário';
  };

  const displayName = getSafeDisplayName();

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          {isLoading ? <Skeleton className="h-9 w-48" /> : `Olá, ${displayName && displayName !== 'null' ? displayName : 'usuário'}!`}
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
