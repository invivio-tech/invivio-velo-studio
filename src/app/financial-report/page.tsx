'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useUserProfile, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc } from 'firebase/firestore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfDay, 
  endOfDay, 
  subDays,
  startOfToday,
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  ArrowLeft, 
  ArrowRight, 
  Calendar as CalendarIcon,
  ShoppingBag,
  Scissors,
  Receipt,
  PieChart as PieChartIcon
} from 'lucide-react';

// Types from our database structure
interface Expense {
  id: string;
  description: string;
  value: number;
  date: Timestamp;
}

interface Appointment {
  id: string;
  serviceName: string;
  servicePrice: number;
  startTime: Timestamp;
  status: string;
}

interface Order {
  id: string;
  totalValue: number;
  status: string;
  createdAt: string;
}

interface EstablishmentSettings {
  professionalCommissionPercentage?: number;
  name?: string;
}

interface MembershipInvoice {
  id: string;
  membershipId: string;
  amount: number;
  dueDate: Timestamp;
  status: string;
  paidAt?: Timestamp | null;
  createdAt: Timestamp;
}

export default function FinancialReportPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();

  const [period, setPeriod] = useState<string>('month');
  const [currentDate] = useState(new Date());

  // Generate last 12 months options
  const last12Months = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      months.push({
        label: format(d, 'MMMM yyyy', { locale: ptBR }),
        value: format(d, 'yyyy-MM'),
        start: startOfMonth(d),
        end: endOfMonth(d)
      });
    }
    return months;
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Determine time range based on selected period
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date = endOfDay(new Date());

    // Check if period is a specific month (yyyy-MM)
    const monthMatch = last12Months.find(m => m.value === period);
    if (monthMatch) {
      return { start: monthMatch.start, end: monthMatch.end };
    }

    switch (period) {
      case 'today':
        start = startOfToday();
        break;
      case 'week':
        start = startOfDay(subDays(new Date(), 7));
        break;
      case 'month':
        start = startOfMonth(new Date());
        break;
      case 'lastMonth':
        const lastMonth = subMonths(new Date(), 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        start = startOfMonth(new Date());
    }
    return { start, end };
  }, [period, last12Months]);

  // Firestore Refs
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);
  const commissionPercentage = settings?.professionalCommissionPercentage ?? 25;

  // Fetch Appointments
  const appointmentsRef = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;
      return query(
        collection(firestore, 'appointments'),
        where('startTime', '>=', Timestamp.fromDate(dateRange.start)),
        where('startTime', '<=', Timestamp.fromDate(dateRange.end)),
        where('status', '==', 'completed')
      );
    },
    [firestore, user, dateRange]
  );
  const { data: appointments, isLoading: appointmentsLoading } = useCollection<Appointment>(appointmentsRef);

  // Fetch Orders
  const ordersRef = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;
      // Note: createdAt is stored as ISO string in orders
      return query(
        collection(firestore, 'orders'),
        where('createdAt', '>=', dateRange.start.toISOString()),
        where('createdAt', '<=', dateRange.end.toISOString())
      );
    },
    [firestore, user, dateRange]
  );
  const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersRef);

  // Fetch Expenses
  const expensesRef = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;
      return query(
        collection(firestore, 'expenses'),
        where('date', '>=', Timestamp.fromDate(dateRange.start)),
        where('date', '<=', Timestamp.fromDate(dateRange.end))
      );
    },
    [firestore, user, dateRange]
  );
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesRef);

  // Fetch Invoices
  const membershipInvoicesRef = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;
      return query(
        collection(firestore, 'membershipInvoices'),
        where('status', '==', 'paid')
      );
    },
    [firestore, user]
  );
  const { data: membershipInvoicesRaw, isLoading: membershipInvoicesLoading } = useCollection<MembershipInvoice>(membershipInvoicesRef);

  // Calculations
  const stats = useMemo(() => {
    const serviceRevenue = appointments?.reduce((acc, apt) => acc + Number(apt.servicePrice), 0) || 0;
    const productRevenue = orders?.filter(o => o.status === 'completed' || o.status === 'paid')
                                 .reduce((acc, o) => acc + Number(o.totalValue), 0) || 0;
    
    // Filter invoices locally
    const subscriptionRevenue = (membershipInvoicesRaw || []).filter(inv => {
      if (!inv.paidAt) return false;
      const date = inv.paidAt.toDate();
      return date.getTime() >= dateRange.start.getTime() && date.getTime() <= dateRange.end.getTime();
    }).reduce((acc, inv) => acc + Number(inv.amount), 0);
    
    const grossRevenue = serviceRevenue + productRevenue + subscriptionRevenue;
    
    const manualExpenses = expenses?.reduce((acc, exp) => acc + Number(exp.value), 0) || 0;
    
    // Calculate commissions correctly, respecting commissionBaseValue for subscriptions
    const commissions = appointments?.reduce((acc, apt) => {
      const baseValue = apt.isSubscriptionUsage && apt.commissionBaseValue !== undefined
        ? Number(apt.commissionBaseValue)
        : Number(apt.servicePrice || 0);
      return acc + (baseValue * (commissionPercentage / 100));
    }, 0) || 0;
    
    const totalOutflows = manualExpenses + commissions;
    const netProfit = grossRevenue - totalOutflows;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      serviceRevenue,
      productRevenue,
      subscriptionRevenue,
      grossRevenue,
      manualExpenses,
      commissions,
      totalOutflows,
      netProfit,
      profitMargin
    };
  }, [appointments, orders, expenses, membershipInvoicesRaw, commissionPercentage, dateRange]);

  // Chart Data
  const revenueChartData = [
    { name: 'Serviços', value: stats.serviceRevenue, color: '#10b981' },
    { name: 'Produtos', value: stats.productRevenue, color: '#3b82f6' },
    { name: 'Assinaturas', value: stats.subscriptionRevenue, color: '#a855f7' }
  ].filter(d => d.value > 0);

  const profitChartData = [
    { name: 'Lucro Líquido', value: Math.max(0, stats.netProfit), color: '#10b981' },
    { name: 'Despesas/Comissões', value: stats.totalOutflows, color: '#f43f5e' }
  ];

  const isLoading = isUserLoading || isProfileLoading || appointmentsLoading || ordersLoading || expensesLoading || membershipInvoicesLoading;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Relatório Financeiro</h1>
          <p className="text-muted-foreground">Visão geral de saúde financeira e lucratividade.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Filtros Rápidos
              </div>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="lastMonth">Mês Passado</SelectItem>
              
              <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-slate-100 dark:border-slate-800">
                Histórico Mensal
              </div>
              {last12Months.slice(2).map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.grossRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de entradas no período</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOutflows)}</div>
            <p className="text-xs text-muted-foreground mt-1">Despesas + Comissões</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-primary text-primary-foreground overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.netProfit)}</div>
            <p className="text-xs opacity-70 mt-1">O que sobra no bolso</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <PieChartIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profitMargin.toFixed(1)}%</div>
            <Badge variant={stats.profitMargin > 30 ? "default" : "secondary"} className="mt-1">
              {stats.profitMargin > 30 ? 'Saudável' : 'Atenção'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Chart */}
        <Card className="lg:col-span-4 border shadow-sm">
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
            <CardDescription>Comparação entre o que entrou e o que saiu no período.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Entradas', valor: stats.grossRevenue, fill: '#10b981' },
                  { name: 'Saídas', valor: stats.totalOutflows, fill: '#f43f5e' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [formatCurrency(val), 'Valor']}
                  />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="lg:col-span-3 border-none shadow-md">
          <CardHeader>
            <CardTitle>Origem da Receita</CardTitle>
            <CardDescription>Distribuição entre serviços e vendas de produtos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenueChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                       formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum dado no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Breakdown Details */}
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle>Detalhamento Financeiro</CardTitle>
            <CardDescription>Onde o dinheiro está sendo gasto e gerado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Serviços Realizados</span>
                </div>
                <span className="font-semibold">{formatCurrency(stats.serviceRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Vendas de Produtos</span>
                </div>
                <span className="font-semibold">{formatCurrency(stats.productRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Mensalidades de Assinatura</span>
                </div>
                <span className="font-semibold">{formatCurrency(stats.subscriptionRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Despesas Declaradas</span>
                </div>
                <span className="font-semibold">{formatCurrency(stats.manualExpenses)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Comissões Geradas ({commissionPercentage}%)</span>
                </div>
                <span className="font-semibold">{formatCurrency(stats.commissions)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between">
                 <span className="font-bold">Resultado Líquido Estimado</span>
                 <span className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {formatCurrency(stats.netProfit)}
                 </span>
               </div>
               <p className="text-[10px] text-muted-foreground mt-2 italic">
                 * Este relatório é uma indicação baseada nos lançamentos e agendamentos concluídos. Não possui rigor contábil oficial.
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Tips */}
        <Card className="border-none shadow-md bg-slate-900 text-slate-50">
          <CardHeader>
            <CardTitle className="text-white">Insights Financeiros</CardTitle>
            <CardDescription className="text-slate-400">Dicas baseadas no seu desempenho.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
              <p className="text-xs font-medium text-emerald-400 mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Ponto Positivo
              </p>
              <p className="text-xs text-slate-300">
                Seu ticket médio de serviços é saudável. Considere criar combos com produtos para aumentar o lucro por cliente.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
              <p className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" /> Oportunidade
              </p>
              <p className="text-xs text-slate-300">
                A venda de produtos representa {((stats.productRevenue / (stats.grossRevenue || 1)) * 100).toFixed(0)}% do seu faturamento. Aumentar isso para 20% dobrará sua margem.
              </p>
            </div>

            <Button variant="outline" className="w-full bg-transparent border-slate-700 hover:bg-slate-800 text-white" asChild>
              <button onClick={() => window.print()}>
                <Receipt className="mr-2 h-4 w-4" /> Imprimir Relatório
              </button>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
