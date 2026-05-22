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
  Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ShoppingBag, TrendingUp, Package, BarChart3, ChevronDown, Calendar, CalendarCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EstablishmentSettings } from '@/app/establishment/page';
import type { Product, ProductCategory } from '@/types/store';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
}

interface Order {
  id: string;
  totalValue: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  createdAt: string;
  items: OrderItem[];
}

export default function SalesDashboardPage() {
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

  const ordersQuery = useMemoFirebase(() => 
    firestore ? query(
      collection(firestore, 'orders'),
      where('createdAt', '>=', start.toISOString()),
      where('createdAt', '<=', end.toISOString()),
      orderBy('createdAt', 'desc')
    ) : null
  , [firestore, start, end]);

  const { data: recentOrders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  const productsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'products') : null
  , [firestore]);
  const { data: products } = useCollection<Product>(productsQuery);

  const categoriesQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'productCategories') : null
  , [firestore]);
  const { data: categories } = useCollection<ProductCategory>(categoriesQuery);
  
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  const stats = useMemo(() => {
    if (!recentOrders) return null;

    const completedOrders = recentOrders.filter(o => o.status === 'completed' || o.status === 'paid');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
    
    // Dynamic chart data based on time range
    const intervalDays = eachDayOfInterval({ start, end });

    const revenueData = intervalDays.map(day => {
      const dayOrders = completedOrders.filter(o => isSameDay(new Date(o.createdAt), day));
      return {
        name: format(day, intervalDays.length > 7 ? 'dd/MM' : 'EEE', { locale: ptBR }),
        revenue: dayOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0),
        count: dayOrders.length
      };
    });

    // Product distribution
    const productMap = new Map<string, number>();
    completedOrders.forEach(o => {
      o.items?.forEach(item => {
        productMap.set(item.productName, (productMap.get(item.productName) || 0) + item.quantity);
      });
    });
    const productData = Array.from(productMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Category distribution
    const categoryMap = new Map<string, number>();
    completedOrders.forEach(o => {
      o.items?.forEach(item => {
        const product = products?.find(p => p.id === item.productId);
        const category = categories?.find(c => c.id === product?.categoryId);
        const catName = category?.name || 'Outros';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + item.quantity);
      });
    });
    const categoryData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalRevenue,
      totalOrders: completedOrders.length,
      avgTicket: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
      revenueData,
      productData,
      categoryData,
      cancelledCount: recentOrders.filter(o => o.status === 'cancelled').length
    };
  }, [recentOrders, products, categories]);

  if (isUserLoading || isProfileLoading || isOrdersLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Dashboard Vendas</h1>
          <p className="text-muted-foreground">
            Desempenho da loja em <span className="text-primary font-bold">{label}</span>.
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
            <Link href="/orders">
              <ShoppingBag className="h-4 w-4" />
              Pedidos
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2 bg-card/50 border-border/10">
            <Link href="/products">
              <Package className="h-4 w-4" />
              Produtos
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Loja</CardTitle>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><DollarSign className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total em vendas concluídas</p>
          </CardContent>
        </Card>
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm overflow-hidden border-l-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume de Pedidos</CardTitle>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><ShoppingBag className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalOrders}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Quantidade de pedidos realizados</p>
          </CardContent>
        </Card>
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio (Venda)</CardTitle>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><TrendingUp className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.avgTicket || 0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Valor médio por pedido</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border border-border/10 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-foreground">Faturamento {filterMode === 'month' ? 'Mensal' : 'Diário'}</CardTitle>
            <CardDescription className="text-slate-400">Receita de vendas em {label}.</CardDescription>
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
            <CardTitle className="text-foreground">Categorias de Produtos</CardTitle>
            <CardDescription className="text-slate-400">Distribuição por volume de itens.</CardDescription>
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

        <Card className="col-span-7 border border-border/10 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-foreground">Produtos Mais Vendidos</CardTitle>
            <CardDescription className="text-slate-400">Top itens por quantidade em {label}.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.productData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11}} 
                  width={150}
                />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <footer className="py-8 text-center text-slate-600 mt-auto opacity-40">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium">Invivio Velo Sales Dashboard v1.00001</p>
          <p className="text-[10px]">Powered by Invivio Tecnologia</p>
        </div>
      </footer>
    </div>
  );
}
