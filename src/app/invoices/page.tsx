'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useUserProfile, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Wallet, ArrowLeft, ArrowRight, Printer } from 'lucide-react';

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
  servicePrice: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

interface EstablishmentSettings {
  professionalCommissionPercentage?: number;
  name?: string;
}

export default function InvoicesPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Handle month navigation
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Determine time range for the current month view
  const startOfCurrentMonth = startOfMonth(currentDate);
  const endOfCurrentMonth = endOfMonth(currentDate);

  // Firestore Refs
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  // We query by date range to avoid needing multiple composite indexes
  const appointmentsRef = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let q = query(
        collection(firestore, 'appointments'),
        where('startTime', '>=', Timestamp.fromDate(startOfCurrentMonth)),
        where('startTime', '<=', Timestamp.fromDate(endOfCurrentMonth))
      );
      return q;
    },
    [firestore, startOfCurrentMonth, endOfCurrentMonth]
  );

  const { data: appointmentsRaw, isLoading: appointmentsLoading } = useCollection<Appointment>(appointmentsRef);

  // Default commission to 25% if not set
  const commissionPercentage = settings?.professionalCommissionPercentage ?? 25;

  const isLoading = isUserLoading || isProfileLoading || appointmentsLoading;

  if (isLoading || !userProfile) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Common formatting helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Base Data Processing
  // For standard revenue, we compute based on "completed" status appointments
  // For no-show we could (if we charged a fee), but currently only completed has full price guaranteed.
  const completedAppointments = appointmentsRaw?.filter(a => a.status === 'completed') || [];

  // Filter based on user role
  const role = userProfile.role;

  let viewData = completedAppointments;
  if (role === 'professional') {
    viewData = completedAppointments.filter(a => a.professionalId === user?.uid);
  } else if (role === 'client') {
    // Clients shouldn't access this page anymore based on user request, but just in case:
    viewData = [];
  }

  // --- Calculations for Admin ---
  const totalRevenue = viewData.reduce((acc, apt) => acc + Number(apt.servicePrice), 0);

  // Calculate commissions grouped by professional
  const commissionsByProfessional = viewData.reduce((acc, apt) => {
    const profName = apt.professionalName || 'Desconhecido';
    const profId = apt.professionalId;
    if (!acc[profId]) {
      acc[profId] = {
        name: profName,
        totalServices: 0,
        totalRevenue: 0,
        commissionToPay: 0,
      };
    }
    acc[profId].totalServices += 1;
    acc[profId].totalRevenue += Number(apt.servicePrice);
    acc[profId].commissionToPay += Number(apt.servicePrice) * (commissionPercentage / 100);
    return acc;
  }, {} as Record<string, { name: string, totalServices: number, totalRevenue: number, commissionToPay: number }>);

  // --- View Renders ---

  const renderMonthNavigation = () => (
    <div className="flex items-center justify-between bg-card border rounded-md p-2 mb-6">
      <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Mês Anterior
      </Button>
      <h2 className="text-lg font-headline font-semibold capitalize">
        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
      </h2>
      <Button variant="ghost" size="sm" onClick={handleNextMonth}>
        Próximo Mês
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  const renderAdminView = () => (
    <Tabs defaultValue="cashflow" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
        <TabsTrigger value="commissions">Comissões (Fechamento)</TabsTrigger>
      </TabsList>

      <TabsContent value="cashflow" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm border-0 font-medium">Receita Total do Mês</CardTitle>
              <DollarSign className="h-4 w-4 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs opacity-75 mt-1">Serviços concluídos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atendimentos Bem-sucedidos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{viewData.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Receitas (Mês Atual)</CardTitle>
            <CardDescription>Resumo de todos os serviços prestados que geraram caixa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhum serviço faturado este mês.</TableCell>
                  </TableRow>
                ) : (
                  // Sort by most recent inside the month
                  [...viewData].sort((a, b) => b.startTime.seconds - a.startTime.seconds).map(apt => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">{format(apt.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>{apt.serviceName}</TableCell>
                      <TableCell>{apt.professionalName}</TableCell>
                      <TableCell>{apt.customerName}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold dark:text-emerald-400">{formatCurrency(apt.servicePrice)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="commissions" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Fechamento de Comissões</CardTitle>
            <CardDescription>Repasse dos serviços baseados no percentual configurado do estabelecimento ({commissionPercentage}%).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Total de Serviços</TableHead>
                  <TableHead>Receita Gerada</TableHead>
                  <TableHead className="text-right">Comissão a Pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(commissionsByProfessional).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum profissional com receita este mês.</TableCell>
                  </TableRow>
                ) : (
                  Object.values(commissionsByProfessional).map((prof, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{prof.name}</TableCell>
                      <TableCell>{prof.totalServices}</TableCell>
                      <TableCell>{formatCurrency(prof.totalRevenue)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(prof.commissionToPay)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const renderProfessionalView = () => {
    const totalComission = totalRevenue * (commissionPercentage / 100);
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sua Comissão Estimada</CardTitle>
              <Wallet className="h-4 w-4 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalComission)}</div>
              <p className="text-xs opacity-75 mt-1">Baseado nos {commissionPercentage}% pré-definidos.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Serviços Executados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{viewData.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Extrato de Serviços</CardTitle>
            <CardDescription>Todos os atendimentos finalizados por você neste mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Sua Parte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum serviço realizado ainda.</TableCell>
                  </TableRow>
                ) : (
                  [...viewData].sort((a, b) => b.startTime.seconds - a.startTime.seconds).map(apt => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">{format(apt.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>{apt.serviceName}</TableCell>
                      <TableCell>{apt.customerName}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(Number(apt.servicePrice) * (commissionPercentage / 100))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };


  if (role === 'client') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Wallet className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h1 className="text-2xl font-headline font-bold tracking-tight text-center">Acesso Restrito</h1>
        <p className="text-muted-foreground text-center max-w-md">
          A seção de faturamento está disponível apenas para a administração e profissionais do estabelecimento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Faturamento e Recibos</h1>
      </div>

      {renderMonthNavigation()}

      {role === 'admin' && renderAdminView()}
      {role === 'professional' && renderProfessionalView()}
    </div>
  );
}

