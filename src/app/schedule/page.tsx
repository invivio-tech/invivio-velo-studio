'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, CalendarCheck, Lock, Calendar as CalendarIcon, MoreHorizontal, Pencil, Trash2, Check, X, Loader2, AlertCircle, Filter, Download, RefreshCw, BarChart, ChevronLeft, ChevronRight, Star } from 'lucide-react';
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
import { collection, query, where, orderBy, Timestamp, getDocs, doc, updateDoc, runTransaction, getDoc, limit } from 'firebase/firestore';
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
import { CompleteServiceDialog } from '@/components/admin/CompleteServiceDialog';


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
  completionNotes?: string;
  completionPhotos?: string[];
  isPortfolioFeatured?: boolean;
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
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

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

  const handleUpdateStatus = async (
    appointment: Appointment, 
    newStatus: 'completed' | 'no-show' | 'cancelled',
    completionData?: { notes?: string; photos?: string[] }
  ) => {
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
          updatedBy: user.uid,
          completionNotes: completionData?.notes || '',
          completionPhotos: completionData?.photos || []
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

  const handleCompleteClick = (apt: Appointment) => {
    setAppointmentToComplete(apt);
    setIsCompletionDialogOpen(true);
  };

  const handleConfirmCompletion = async (notes: string, photos: string[]) => {
    if (!appointmentToComplete) return;
    await handleUpdateStatus(appointmentToComplete, 'completed', { notes, photos });
    setAppointmentToComplete(null);
  };

  const handleTogglePortfolioFeatured = async (appointment: Appointment) => {
    if (!firestore) return;
    const isFeatured = !appointment.isPortfolioFeatured;
    try {
      await updateDoc(doc(firestore, 'appointments', appointment.id), {
        isPortfolioFeatured: isFeatured
      });
      toast({ 
        title: isFeatured ? 'Adicionado à Galeria!' : 'Removido da Galeria',
        description: isFeatured ? 'Este serviço agora aparece na sua página oficial.' : 'O serviço não será mais exibido publicamente.'
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o destaque.' });
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
    onCompleteClick: handleCompleteClick,
    onUpdateStatus: handleUpdateStatus,
    onTogglePortfolioFeatured: handleTogglePortfolioFeatured,
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

      <CompleteServiceDialog 
        isOpen={isCompletionDialogOpen}
        onOpenChange={setIsCompletionDialogOpen}
        customerName={appointmentToComplete?.customerName || ''}
        serviceName={appointmentToComplete?.serviceName || ''}
        onConfirm={handleConfirmCompletion}
      />
    </>
  );
}

function AdminDashboard({ 
  onEditAppointment, 
  onCancelClick,
  onCompleteClick,
  onUpdateStatus,
  onTogglePortfolioFeatured,
  professionals,
  services,
  settings 
}: { 
  onEditAppointment: (apt: Appointment) => void;
  onCancelClick: (apt: Appointment) => void;
  onCompleteClick: (apt: Appointment) => void;
  onUpdateStatus: (apt: Appointment, status: 'completed' | 'no-show' | 'cancelled') => Promise<boolean>;
  onTogglePortfolioFeatured: (apt: Appointment) => void;
  professionals: UserProfile[] | undefined;
  services: Service[] | undefined;
  settings: EstablishmentSettings | undefined;
}) {
  const firestore = useFirestore();
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
  const [periodType, setPeriodType] = useState<'day' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [showPending, setShowPending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

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
    const constraints: any[] = [
      where('status', '==', 'completed'),
      where('startTime', '>=', start),
      where('startTime', '<=', end),
      orderBy('startTime', 'desc')
    ];
    if (selectedProfessionalId !== 'all') constraints.push(where('professionalId', '==', selectedProfessionalId));
    return query(collectionRef, ...constraints);
  }, [firestore, selectedProfessionalId, periodType, selectedDate, selectedMonth]);

  const upcomingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const collectionRef = collection(firestore, 'appointments');
    const constraints: any[] = [
      where('status', '==', 'scheduled'),
      where('startTime', '>=', startOfDay(new Date())),
      orderBy('startTime', 'asc')
    ];
    if (selectedProfessionalId !== 'all') constraints.push(where('professionalId', '==', selectedProfessionalId));
    return query(collectionRef, ...constraints);
  }, [firestore, selectedProfessionalId]);

  const pendingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const constraints: any[] = [
      where('status', '==', 'scheduled'),
      where('startTime', '<', startOfDay(new Date())),
      orderBy('startTime', 'asc')
    ];
    if (selectedProfessionalId !== 'all') constraints.push(where('professionalId', '==', selectedProfessionalId));
    return query(collection(firestore, 'appointments'), ...constraints);
  }, [firestore, selectedProfessionalId]);

  const { data: appointments, isLoading: areStatsLoading } = useCollection<Appointment>(statsQuery);
  const { data: upcomingAppointments, isLoading: isUpcomingLoading } = useCollection<Appointment>(upcomingQuery);
  const { data: pendingAppointments, isLoading: isPendingLoading } = useCollection<Appointment>(pendingQuery);

  const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.servicePrice || 0), 0) || 0;
  const totalAppointments = appointments?.length || 0;
  const uniqueClients = new Set(appointments?.map(a => a.customerId)).size || 0;

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const filteredHistory = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(apt => {
      const matchesSearch = apt.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = selectedService === 'all' || apt.serviceName === selectedService;
      return matchesSearch && matchesService;
    });
  }, [appointments, searchTerm, selectedService]);

  const uniqueServices = useMemo(() => {
    if (!appointments) return [];
    return Array.from(new Set(appointments.map(a => a.serviceName)));
  }, [appointments]);

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
        return [format(date, 'dd/MM/yyyy'), format(date, 'HH:mm'), `"${apt.customerName}"`, `"${apt.serviceName}"`, `"${apt.professionalName}"`, price.toFixed(2), commission.toFixed(2)].join(',');
      })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_admin_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
  };

  const wrapUpdateStatus = async (apt: Appointment, status: 'completed' | 'no-show' | 'cancelled') => {
    setIsUpdatingStatus(apt.id);
    await onUpdateStatus(apt, status);
    setIsUpdatingStatus(null);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">Visão geral do desempenho do estabelecimento.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os Profissionais" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Profissionais</SelectItem>
              {professionals?.map(pro => <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={periodType} onValueChange={(v: 'day' | 'month') => setPeriodType(v)}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="day">Diário</SelectItem><SelectItem value="month">Mensal</SelectItem></SelectContent>
          </Select>
          {periodType === 'day' ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus /></PopoverContent>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Faturamento Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>{areStatsLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>}<p className="text-xs text-muted-foreground capitalize mt-1">Período: {periodType === 'day' ? format(selectedDate, "dd/MM/yyyy") : format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Agendamentos</CardTitle><CalendarCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>{areStatsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{totalAppointments}</div>}<p className="text-xs text-muted-foreground mt-1">Concluídos no período</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>{areStatsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{uniqueClients}</div>}<p className="text-xs text-muted-foreground mt-1">Clientes únicos</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Agenda de Atendimentos</CardTitle><CardDescription>Gerencie os horários marcados.</CardDescription></div>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
              <Button variant={!showPending ? "secondary" : "ghost"} size="sm" onClick={() => setShowPending(false)} className="h-8">Próximos ({upcomingAppointments?.length || 0})</Button>
              <Button variant={showPending ? "secondary" : "ghost"} size="sm" onClick={() => setShowPending(true)} className={cn("h-8 text-orange-600 transition-all", pendingAppointments && pendingAppointments.length > 0 && !showPending && "ring-2 ring-orange-500 animate-pulse font-bold")}>Pendentes ({pendingAppointments?.length || 0})</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isUpcomingLoading || isPendingLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-[120px] w-full" /><Skeleton className="h-[120px] w-full" /><Skeleton className="h-[120px] w-full" /></div> : (showPending ? pendingAppointments : upcomingAppointments)?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(showPending ? pendingAppointments : upcomingAppointments)?.map((apt) => (
                <div key={apt.id} className={cn("flex flex-col p-4 border rounded-lg hover:border-primary transition-colors gap-3 bg-card/50", showPending && "border-orange-200 bg-orange-50/30")}>
                  <div className="flex items-center justify-between">
                    <Badge variant={showPending ? "destructive" : "outline"} className="capitalize">{format(apt.startTime.toDate(), "EEEE, dd/MM", { locale: ptBR })}</Badge>
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-primary">{format(apt.startTime.toDate(), "HH:mm")}</span>
                       <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => onCompleteClick(apt)} disabled={!!isUpdatingStatus}>
                         <Check className="h-4 w-4" /> Concluir
                       </Button>
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1"><span className="hidden sm:inline">Opções</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onSelect={() => onCompleteClick(apt)}><Check className="h-4 w-4 mr-2 text-emerald-600" /> Forçar Concluir</DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => wrapUpdateStatus(apt, 'no-show')}><AlertCircle className="h-4 w-4 mr-2 text-orange-600" /> Não Compareceu</DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => onTogglePortfolioFeatured(apt)}><Star className={cn("h-4 w-4 mr-2", apt.isPortfolioFeatured ? "text-amber-500 fill-amber-500" : "")} /> {apt.isPortfolioFeatured ? 'Remover da Galeria' : 'Exibir na Galeria'}</DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => onEditAppointment(apt)}><Pencil className="h-4 w-4 mr-2" /> Editar Agendamento</DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => onCancelClick(apt)} className="text-destructive focus:text-destructive"><X className="h-4 w-4 mr-2" /> Rejeitar Agendamento</DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarImage src={apt.customerPhotoURL} /><AvatarFallback>{apt.customerName?.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0"><p className="font-medium truncate text-sm">{apt.customerName}</p><p className="text-[10px] text-muted-foreground truncate">{apt.serviceName}</p></div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg"><CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-20" /><p>{showPending ? "Nenhum pendente." : "Nenhum agendamento futuro."}</p></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico Recente</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredHistory.slice(0, 10).map(apt => (
              <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8"><AvatarImage src={apt.customerPhotoURL} /><AvatarFallback>{apt.customerName?.charAt(0)}</AvatarFallback></Avatar>
                  <div><p className="font-medium text-sm">{apt.customerName}</p><p className="text-[10px] text-muted-foreground">{apt.serviceName} • {apt.professionalName}</p></div>
                  {apt.completionPhotos && apt.completionPhotos.length > 0 && (
                    <div className="h-8 w-8 relative flex-shrink-0 rounded-md overflow-hidden border ml-2">
                       <img src={apt.completionPhotos[0]} alt="Serviço" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="text-sm font-bold text-emerald-600">{formatCurrency(apt.servicePrice || 0)}</p><p className="text-[10px] text-muted-foreground">{format(apt.startTime.toDate(), "dd/MM HH:mm")}</p></div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onTogglePortfolioFeatured(apt)}>
                        <Star className={cn("h-4 w-4 mr-2", apt.isPortfolioFeatured ? "text-amber-500 fill-amber-500" : "")} />
                        {apt.isPortfolioFeatured ? 'Remover da Galeria' : 'Exibir na Galeria'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <footer className="p-8 text-center text-slate-600 mt-auto opacity-40">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium">Powered by <span className="font-bold text-primary">Invivio Tecnologia</span></p>
          <p className="text-[10px] font-bold text-primary">Invivio Velo v1.00054</p>
        </div>
      </footer>
    </div>
  );
}

function ProfessionalDashboard({ 
  userProfile, 
  onEditAppointment, 
  onCancelClick, 
  onCompleteClick,
  onUpdateStatus,
  onTogglePortfolioFeatured 
}: { 
  userProfile: UserProfile, 
  onEditAppointment: (apt: Appointment) => void, 
  onCancelClick: (apt: Appointment) => void,
  onCompleteClick: (apt: Appointment) => void,
  onUpdateStatus: (apt: Appointment, status: 'completed' | 'no-show' | 'cancelled') => Promise<boolean>,
  onTogglePortfolioFeatured: (apt: Appointment) => void
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[] | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[] | null>(null);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[] | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      const qUpcoming = query(collection(firestore, 'appointments'), where('professionalId', '==', user.uid), where('status', '==', 'scheduled'), where('startTime', '>=', startOfDay(new Date())), orderBy('startTime', 'asc'));
      const qPending = query(collection(firestore, 'appointments'), where('professionalId', '==', user.uid), where('status', '==', 'scheduled'), where('startTime', '<', startOfDay(new Date())), orderBy('startTime', 'asc'));
      const qCompleted = query(collection(firestore, 'appointments'), where('professionalId', '==', user.uid), where('status', '==', 'completed'), orderBy('startTime', 'desc'), limit(10));
      
      Promise.all([getDocs(qUpcoming), getDocs(qPending), getDocs(qCompleted)]).then(([up, pen, comp]) => {
        setUpcomingAppointments(up.docs.map(d => ({id: d.id, ...d.data()} as Appointment)));
        setPendingAppointments(pen.docs.map(d => ({id: d.id, ...d.data()} as Appointment)));
        setCompletedAppointments(comp.docs.map(d => ({id: d.id, ...d.data()} as Appointment)));
      });
    }
  }, [user, firestore, isUserLoading]);

  const wrapComplete = async (apt: Appointment) => {
    setIsUpdating(apt.id);
    await onCompleteClick(apt);
    setIsUpdating(null);
  };

  const AppointmentItem = ({ appointment }: { appointment: Appointment }) => (
    <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
      <div className="flex items-center gap-4">
        <Avatar><AvatarImage src={appointment.customerPhotoURL} /><AvatarFallback>{appointment.customerName?.charAt(0)}</AvatarFallback></Avatar>
        <div><p className="font-semibold">{appointment.customerName}</p><p className="text-sm text-muted-foreground">{appointment.serviceName} • {format(appointment.startTime.toDate(), "HH:mm")}</p></div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => wrapComplete(appointment)} disabled={isUpdating === appointment.id}>
          {isUpdating === appointment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Concluir
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
             <DropdownMenuItem onSelect={() => onTogglePortfolioFeatured(appointment)}><Star className={cn("h-4 w-4 mr-2", appointment.isPortfolioFeatured ? "text-amber-500 fill-amber-500" : "")} /> {appointment.isPortfolioFeatured ? 'Remover da Galeria' : 'Exibir na Galeria'}</DropdownMenuItem>
             <DropdownMenuItem onSelect={() => onUpdateStatus(appointment, 'no-show')} className="text-orange-600"><AlertCircle className="h-4 w-4 mr-2" /> Não Compareceu</DropdownMenuItem>
             <DropdownMenuItem onSelect={() => onCancelClick(appointment)} className="text-destructive"><X className="h-4 w-4 mr-2" /> Cancelar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
       <h1 className="text-3xl font-headline font-bold">Olá, {userProfile.name}!</h1>
       <Card><CardHeader><CardTitle>Ações Necessárias</CardTitle><CardDescription>Agendamentos passados pendentes.</CardDescription></CardHeader><CardContent><div className="space-y-4">{pendingAppointments?.length ? pendingAppointments.map(a => <AppointmentItem key={a.id} appointment={a} />) : <p className="text-muted-foreground text-center">Tudo em dia!</p>}</div></CardContent></Card>
       <Card><CardHeader><CardTitle>Próximos Horários</CardTitle></CardHeader><CardContent><div className="space-y-4">{upcomingAppointments?.length ? upcomingAppointments.map(a => <AppointmentItem key={a.id} appointment={a} />) : <p className="text-muted-foreground text-center">Nenhum agendamento para hoje.</p>}</div></CardContent></Card>
       
       <Card>
         <CardHeader>
           <CardTitle>Histórico de Serviços</CardTitle>
           <CardDescription>Seus últimos atendimentos realizados.</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             {completedAppointments?.length ? completedAppointments.map(apt => (
               <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                 <div className="flex items-center gap-3">
                   <Avatar className="h-8 w-8"><AvatarImage src={apt.customerPhotoURL} /><AvatarFallback>{apt.customerName?.charAt(0)}</AvatarFallback></Avatar>
                   <div>
                     <p className="font-medium text-sm">{apt.customerName}</p>
                     <p className="text-[10px] text-muted-foreground">{apt.serviceName} • {format(apt.startTime.toDate(), "dd/MM 'às' HH:mm")}</p>
                   </div>
                   {apt.completionPhotos && apt.completionPhotos.length > 0 && (
                     <div className="h-8 w-8 relative flex-shrink-0 rounded-md overflow-hidden border ml-2">
                        <img src={apt.completionPhotos[0]} alt="Serviço" className="h-full w-full object-cover" />
                     </div>
                   )}
                 </div>
                 <div className="flex items-center gap-2">
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem onSelect={() => onTogglePortfolioFeatured(apt)}>
                         <Star className={cn("h-4 w-4 mr-2", apt.isPortfolioFeatured ? "text-amber-500 fill-amber-500" : "")} />
                         {apt.isPortfolioFeatured ? 'Remover da Galeria' : 'Exibir na Galeria'}
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 </div>
               </div>
             )) : <p className="text-muted-foreground text-center py-4">Nenhum histórico encontrado.</p>}
           </div>
         </CardContent>
       </Card>
       <footer className="p-8 text-center text-slate-600 mt-auto opacity-40">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium">Powered by <span className="font-bold text-primary">Invivio Tecnologia</span></p>
          <p className="text-[10px] font-bold text-primary">Invivio Velo v1.00054</p>
        </div>
      </footer>
    </div>
  );
}

function ClientDashboard({ userProfile }: { userProfile: UserProfile }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  
  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      const q = query(collection(firestore, 'appointments'), where('customerId', '==', user.uid), where('status', '==', 'scheduled'), orderBy('startTime', 'asc'));
      getDocs(q).then(snap => setAppointments(snap.docs.map(d => ({id: d.id, ...d.data()} as Appointment))));
    }
  }, [user, firestore, isUserLoading]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex justify-between items-center"><h1 className="text-3xl font-headline font-bold">Olá, {userProfile.name}!</h1><Button asChild><Link href="/book-appointment">Novo Agendamento</Link></Button></div>
      <Card><CardHeader><CardTitle>Seus Agendamentos</CardTitle></CardHeader><CardContent><div className="space-y-4">{appointments?.length ? appointments.map(apt => (
        <div key={apt.id} className="p-4 border rounded-lg flex justify-between items-center">
          <div><p className="font-bold">{apt.serviceName}</p><p className="text-sm text-muted-foreground">{format(apt.startTime.toDate(), "EEEE, dd/MM 'às' HH:mm", {locale: ptBR})}</p></div>
          <Badge>Confirmado</Badge>
        </div>
      )) : <p className="text-muted-foreground text-center py-8">Você não tem agendamentos ativos.</p>}</div></CardContent></Card>
      <footer className="p-8 text-center text-slate-600 mt-auto opacity-40">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium">Powered by <span className="font-bold text-primary">Invivio Tecnologia</span></p>
          <p className="text-[10px] font-bold text-primary">Invivio Velo v1.00054</p>
        </div>
      </footer>
    </div>
  );
}
