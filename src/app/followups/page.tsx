'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, MessageSquare, Search, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { decryptClinicalData } from '@/lib/encryption';

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhoneNumber?: string;
  professionalName: string;
  serviceName: string;
  completedAt?: Timestamp;
  followUpNeeded?: boolean;
  followUpDays?: number;
  completionNotes?: string;
}

export default function FollowupsPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isProfileLoading && userProfile && userProfile.role !== 'admin' && userProfile.role !== 'professional') {
      router.push('/schedule');
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  // Query completed appointments with followUpNeeded
  const followupsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'appointments'),
      where('status', '==', 'completed'),
      where('followUpNeeded', '==', true),
      orderBy('completedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: rawAppointments, isLoading: isAptsLoading, error, refetch } = useCollection<Appointment>(followupsQuery);
  const [scheduledAppointments, setScheduledAppointments] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Fetch all future scheduled appointments to check if patient already has a return scheduled
  useEffect(() => {
    if (!firestore || !rawAppointments || rawAppointments.length === 0) return;

    async function fetchScheduled() {
      setLoadingSchedule(true);
      try {
        const q = query(
          collection(firestore, 'appointments'),
          where('status', '==', 'scheduled'),
          where('startTime', '>=', Timestamp.now())
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => doc.data());
        setScheduledAppointments(list);
      } catch (err) {
        console.error("Erro ao carregar agendamentos futuros:", err);
      } finally {
        setLoadingSchedule(false);
      }
    }

    fetchScheduled();
  }, [firestore, rawAppointments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (refetch) await refetch();
    setIsRefreshing(false);
  };

  const followupList = useMemo(() => {
    if (!rawAppointments) return [];
    
    return rawAppointments.map(apt => {
      const completedDate = apt.completedAt?.toDate ? apt.completedAt.toDate() : new Date();
      const followUpDays = apt.followUpDays || 15;
      const targetDate = addDays(completedDate, followUpDays);
      const isOverdue = isBefore(targetDate, new Date());
      
      // Check if patient already scheduled a future return
      const hasScheduledReturn = scheduledAppointments.some(sched => sched.customerId === apt.customerId);

      return {
        ...apt,
        completedDate,
        targetDate,
        isOverdue,
        hasScheduledReturn
      };
    }).filter(apt => {
      const matchSearch = apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          apt.professionalName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [rawAppointments, scheduledAppointments, searchTerm]);

  const handleSendWhatsApp = (apt: any) => {
    if (!apt.customerPhoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Sem telefone',
        description: 'Paciente não tem um número de WhatsApp cadastrado.',
      });
      return;
    }

    const cleanPhone = apt.customerPhoneNumber.replace(/\D/g, '');
    const dateStr = format(apt.targetDate, "dd/MM/yyyy");
    const docName = apt.professionalName;
    const patientName = apt.customerName;

    const message = `Olá, ${patientName}! Tudo bem? Aqui é da clínica Invivio Care. 🩺\n\nGostaríamos de lembrar que o Dr(a). ${docName} sugeriu um retorno médico de acompanhamento por volta do dia ${dateStr}.\n\nGostaria de agendar seu horário? Você pode agendar de forma rápida pelo nosso assistente digital ou clicando no link abaixo:\n👉 https://invivio-care.web.app/book-appointment\n\nQualquer dúvida, estamos à disposição!`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const isLoading = isUserLoading || isProfileLoading || isAptsLoading || loadingSchedule;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-background min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground flex items-center gap-2">
            Gestão de Retornos & Acompanhamento
          </h1>
          <p className="text-muted-foreground">
            Acompanhe pacientes com consultas concluídas que necessitam de consulta de retorno.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por paciente ou especialista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? (
        <div className="p-6 border border-destructive/50 bg-destructive/10 rounded-2xl text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-semibold">Erro ao carregar retornos</p>
            <p className="opacity-80">{(error as any).message || 'Ocorreu um erro inesperado.'}</p>
          </div>
        </div>
      ) : followupList.length > 0 ? (
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Especialista</TableHead>
                  <TableHead>Consulta Original</TableHead>
                  <TableHead>Data Limite Retorno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followupList.map((apt) => (
                  <TableRow key={apt.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold">{apt.customerName}</TableCell>
                    <TableCell>{apt.professionalName}</TableCell>
                    <TableCell className="text-xs">
                      {format(apt.completedDate, "dd/MM/yyyy")}
                      <div className="text-[10px] text-muted-foreground">{apt.serviceName}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {format(apt.targetDate, "dd/MM/yyyy")}
                      <div className="text-[10px] text-muted-foreground">{apt.followUpDays} dias sugeridos</div>
                    </TableCell>
                    <TableCell>
                      {apt.hasScheduledReturn ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-none hover:bg-emerald-100 font-semibold rounded-full">
                          Retorno Agendado
                        </Badge>
                      ) : apt.isOverdue ? (
                        <Badge className="bg-red-100 text-red-800 border-none hover:bg-red-100 font-semibold rounded-full animate-pulse">
                          Atrasado
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-none hover:bg-blue-100 font-semibold rounded-full">
                          No Prazo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!apt.hasScheduledReturn && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleSendWhatsApp(apt)}
                          className="h-8 rounded-full border-green-500/30 text-green-600 hover:bg-green-50/50 gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Lembrar WhatsApp
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-20 bg-card/20 rounded-3xl border border-dashed flex flex-col items-center gap-3">
          <Clock className="h-12 w-12 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-bold text-slate-700">Tudo em dia</h3>
          <p className="text-slate-400 text-sm max-w-sm">
            Nenhum paciente pendente de retorno médico ou com prazo de acompanhamento vencido no momento.
          </p>
        </div>
      )}
    </div>
  );
}
