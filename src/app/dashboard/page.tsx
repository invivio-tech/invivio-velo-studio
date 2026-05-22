'use client';

import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, limit, Timestamp, doc } from 'firebase/firestore';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Users, CalendarCheck, TrendingUp, Scissors, UserCheck, Plus, Calendar, FileText, LayoutDashboard, ChevronDown, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserProfile } from '@/firebase';
import type { EstablishmentSettings } from '@/app/establishment/page';
import type { ServiceWithId } from '@/app/services/page';
import type { CategoryWithId } from '@/app/categories/page';

interface Appointment {
  id: string;
  serviceName: string;
  servicePrice: number;
  startTime: Timestamp | { toDate: () => Date };
  status: 'completed' | 'cancelled' | 'no-show' | 'scheduled';
  professionalName: string;
  professionalId: string;
}

interface Order {
  id: string;
  totalValue: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  createdAt: string;
}

const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isProfileLoading && userProfile && userProfile.role !== 'admin') {
      router.push('/schedule');
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  const [filterMode, setFilterMode] = useState<'range' | 'month'>('range');
  const [timeRange, setTimeRange] = useState<7 | 15 | 30>(30);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const { start, end, label } = useMemo(() => {
    if (filterMode === 'range') {
      const s = startOfDay(subDays(new Date(), timeRange));
      const e = endOfDay(new Date());
      return { 
        start: s, 
        end: e, 
        label: `Últimos ${timeRange} dias` 
      };
    } else {
      const s = startOfMonth(selectedMonth);
      const e = endOfMonth(selectedMonth);
      return { 
        start: s, 
        end: e, 
        label: format(selectedMonth, 'MMMM yyyy', { locale: ptBR }) 
      };
    }
  }, [filterMode, timeRange, selectedMonth]);

  const historyQuery = useMemoFirebase(() => 
    firestore ? query(
      collection(firestore, 'appointments'),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      orderBy('startTime', 'desc')
    ) : null
  , [firestore, start, end]);

  const { data: recentAppointments, isLoading: isHistoryLoading } = useCollection<Appointment>(historyQuery);

  const ordersQuery = useMemoFirebase(() => 
    firestore ? query(
      collection(firestore, 'orders'),
      where('createdAt', '>=', start.toISOString()),
      where('createdAt', '<=', end.toISOString()),
      orderBy('createdAt', 'desc')
    ) : null
  , [firestore, start, end]);

  const { data: recentOrders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  const servicesQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'services') : null
  , [firestore]);
  const { data: services } = useCollection<ServiceWithId>(servicesQuery);

  const categoriesQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'serviceCategories') : null
  , [firestore]);
  const { data: categories } = useCollection<CategoryWithId>(categoriesQuery);
  
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  const stats = useMemo(() => {
    if (!recentAppointments) return null;

    const completed = recentAppointments.filter(a => a.status === 'completed');
    const completedOrders = recentOrders?.filter(o => o.status === 'completed' || o.status === 'paid') || [];
    
    const serviceRevenue = completed.reduce((sum, a) => sum + (a.servicePrice || 0), 0);
    const productRevenue = completedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
    const totalRevenue = serviceRevenue + productRevenue;
    
    // Dynamic chart data based on time range
    const intervalDays = eachDayOfInterval({
      start,
      end
    });

    const revenueData = intervalDays.map(day => {
      const dayCompletedServices = completed.filter(a => isSameDay((a.startTime as any).toDate ? (a.startTime as any).toDate() : new Date(a.startTime as any), day));
      const dayCompletedOrders = completedOrders.filter(o => isSameDay(new Date(o.createdAt), day));
      
      const dayServiceRev = dayCompletedServices.reduce((sum, a) => sum + (a.servicePrice || 0), 0);
      const dayProductRev = dayCompletedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      return {
        name: format(day, intervalDays.length > 7 ? 'dd/MM' : 'EEE', { locale: ptBR }),
        revenue: dayServiceRev + dayProductRev,
        count: dayCompletedServices.length + dayCompletedOrders.length
      };
    });

    // Service distribution
    const serviceMap = new Map<string, number>();
    completed.forEach(a => {
      serviceMap.set(a.serviceName, (serviceMap.get(a.serviceName) || 0) + 1);
    });
    const serviceData = Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Category distribution
    const categoryMap = new Map<string, number>();
    completed.forEach(a => {
      const service = services?.find(s => s.name === a.serviceName);
      const category = categories?.find(c => c.id === service?.categoryId);
      const catName = category?.name || 'Outros';
      categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
    });
    const categoryData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Professional performance (Revenue and Count)
    const proMap = new Map<string, { revenue: number, count: number }>();
    completed.forEach(a => {
      const current = proMap.get(a.professionalName) || { revenue: 0, count: 0 };
      proMap.set(a.professionalName, { 
        revenue: current.revenue + (a.servicePrice || 0),
        count: current.count + 1
      });
    });
    const proData = Array.from(proMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      serviceRevenue,
      productRevenue,
      totalCompleted: completed.length,
      avgTicket: completed.length > 0 ? totalRevenue / completed.length : 0,
      revenueData,
      serviceData,
      categoryData,
      proData,
      cancelledCount: recentAppointments.filter(a => a.status === 'cancelled').length,
      noShowCount: recentAppointments.filter(a => a.status === 'no-show').length
    };
  }, [recentAppointments]);

  if (isUserLoading || isProfileLoading || isHistoryLoading || isOrdersLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-96" />
          <Skeleton className="col-span-3 h-96" />
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Dashboard Serviços</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Aqui está como o <span className="text-primary font-bold">{settings?.name || 'seu estabelecimento'}</span> está indo em <span className="text-primary font-bold">{label}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-card/50 border-border/10">
                <Calendar className="h-4 w-4" />
                {label}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border/10 max-h-[300px] overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Períodos Relativos</div>
              <DropdownMenuItem onClick={() => { setFilterMode('range'); setTimeRange(7); }}>Últimos 7 dias</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFilterMode('range'); setTimeRange(15); }}>Últimos 15 dias</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFilterMode('range'); setTimeRange(30); }}>Últimos 30 dias</DropdownMenuItem>
              
              <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border/10 pt-2">Mensal</div>
              {[0, 1, 2, 3, 4, 5, 6].map((m) => {
                const date = subMonths(new Date(), m);
                return (
                  <DropdownMenuItem key={m} onClick={() => { setFilterMode('month'); setSelectedMonth(date); }}>
                    {format(date, 'MMMM yyyy', { locale: ptBR })}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="default" className="gap-2">
            <Link href="/schedule">
              <CalendarCheck className="h-4 w-4" />
              Ver Agenda
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="gap-2 bg-card/50 border-border/10">
            <Link href="/clients">
              <Users className="h-4 w-4" />
              Clientes
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><DollarSign className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Soma de Serviços e Vendas</p>
          </CardContent>
        </Card>
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm overflow-hidden border-l-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Loja</CardTitle>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><ShoppingBag className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency((stats as any)?.productRevenue || 0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Vendas de produtos retirados</p>
          </CardContent>
        </Card>
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Serviços</CardTitle>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Scissors className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency((stats as any)?.serviceRevenue || 0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Receita de atendimentos concluídos</p>
          </CardContent>
        </Card>
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Concluídos</CardTitle>
            <div className="p-2 bg-primary/10 text-primary rounded-lg"><CalendarCheck className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalCompleted}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Agendamentos finalizados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border border-border/10 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-foreground">Faturamento {filterMode === 'month' ? 'Mensal' : 'Diário'}</CardTitle>
            <CardDescription className="text-slate-400">Receita gerada em {label}.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 border border-border/10 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-foreground">Tipos de Serviço</CardTitle>
            <CardDescription className="text-slate-400">Distribuição por categorias.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats?.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {stats?.categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-4 border border-border/10 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-foreground">Serviços mais Procurados</CardTitle>
            <CardDescription className="text-slate-400">Top 5 serviços realizados.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.serviceData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10}} 
                  width={100}
                />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 border border-border/10 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-foreground">Faturamento por Profissional</CardTitle>
            <CardDescription className="text-slate-400">Receita total por integrante.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats?.proData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="revenue"
                  stroke="none"
                >
                  {stats?.proData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${((index + 2) % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-7 border border-border/10 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-foreground">Desempenho da Equipe</CardTitle>
            <CardDescription className="text-slate-400">Faturamento gerado por cada profissional em {label}.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats?.proData.map((pro: any, i: number) => (
                <div key={i} className="flex items-center p-4 border border-border/20 rounded-xl gap-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="p-3 bg-card/80 shadow-sm rounded-full text-primary">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-foreground">{pro.name}</p>
                    <p className="text-sm text-emerald-500 font-medium">{formatCurrency(pro.revenue)} acumulados</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-normal border-border/50 text-slate-400">
                      {Math.round((pro.revenue / (stats?.totalRevenue || 1)) * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
              {(!stats?.proData || stats?.proData.length === 0) && (
                <div className="col-span-3 py-10 text-center text-muted-foreground border-2 border-dashed border-border/20 rounded-xl">
                  Nenhum dado de profissional encontrado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="py-8 text-center text-slate-600 mt-auto opacity-40">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium">Invivio Velo Dashboard v1.00056</p>
          <p className="text-[10px]">Powered by Invivio Tecnologia</p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ children, className, variant = 'default' }: any) {
  const variants: any = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-input bg-background',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
