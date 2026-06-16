'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useDoc, useUserProfile, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format } from 'date-fns';
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
  LineChart,
  Line,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import type { MembershipPlanWithId } from '@/components/admin/MembershipPlanForm';
import type { EstablishmentSettings } from '@/app/establishment/page';

export default function MembershipsDashboardPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const currentMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const currentMonthEnd = useMemo(() => endOfMonth(new Date()), []);
  const monthName = useMemo(() => format(new Date(), 'MMMM', { locale: ptBR }), []);

  const settingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null), [firestore]);
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);
  const commissionPercentage = settings?.professionalCommissionPercentage || 25;

  const { data: plans, isLoading: plansLoading } = useCollection<MembershipPlanWithId>(
    useMemoFirebase(() => firestore ? collection(firestore, 'membershipPlans') : null, [firestore])
  );

  const { data: activeMemberships, isLoading: membershipsLoading } = useCollection(
    useMemoFirebase(() => firestore ? query(collection(firestore, 'userMemberships'), where('status', '==', 'active')) : null, [firestore])
  );

  const { data: invoices, isLoading: invoicesLoading } = useCollection(
    useMemoFirebase(() => firestore ? query(collection(firestore, 'membershipInvoices'), where('status', '==', 'paid')) : null, [firestore])
  );

  const { data: appointments, isLoading: appointmentsLoading } = useCollection(
    useMemoFirebase(() => firestore ? query(
      collection(firestore, 'appointments'),
      where('status', '==', 'completed'),
      where('isSubscriptionUsage', '==', true),
      where('startTime', '>=', Timestamp.fromDate(currentMonthStart)),
      where('startTime', '<=', Timestamp.fromDate(currentMonthEnd))
    ) : null, [firestore, currentMonthStart, currentMonthEnd])
  );

  const isLoading = isProfileLoading || plansLoading || membershipsLoading || invoicesLoading || appointmentsLoading;
  const isAdmin = userProfile?.role === 'admin';

  const metrics = useMemo(() => {
    if (!plans || !activeMemberships || !invoices || !appointments) return null;

    // Filter invoices locally by month
    const monthlyInvoices = invoices.filter(inv => {
      if (!inv.paidAt) return false;
      const date = inv.paidAt.toDate();
      return date.getTime() >= currentMonthStart.getTime() && date.getTime() <= currentMonthEnd.getTime();
    });

    const planMetrics = plans.map(plan => {
      const activeCount = activeMemberships.filter(m => m.planId === plan.id).length;
      const expectedRevenue = activeCount * plan.price;
      
      const actualRevenue = monthlyInvoices
        .filter(inv => inv.planId === plan.id)
        .reduce((acc, inv) => acc + Number(inv.amount), 0);

      const planAppointments = appointments.filter(apt => apt.subscriptionPlanId === plan.id);
      
      const totalCosts = planAppointments.reduce((acc, apt) => {
        const baseValue = apt.commissionBaseValue !== undefined ? Number(apt.commissionBaseValue) : 0;
        return acc + (baseValue * (commissionPercentage / 100));
      }, 0);

      const profit = actualRevenue - totalCosts;
      const margin = actualRevenue > 0 ? (profit / actualRevenue) * 100 : 0;
      const usagesCount = planAppointments.length;
      const usagesPerUser = activeCount > 0 ? (usagesCount / activeCount) : 0;

      return {
        id: plan.id,
        name: plan.name,
        activeCount,
        expectedRevenue,
        actualRevenue,
        totalCosts,
        profit,
        margin,
        usagesCount,
        usagesPerUser
      };
    });

    const globalActiveCount = planMetrics.reduce((acc, p) => acc + p.activeCount, 0);
    const globalExpectedRevenue = planMetrics.reduce((acc, p) => acc + p.expectedRevenue, 0);
    const globalActualRevenue = planMetrics.reduce((acc, p) => acc + p.actualRevenue, 0);
    const globalTotalCosts = planMetrics.reduce((acc, p) => acc + p.totalCosts, 0);
    const globalProfit = globalActualRevenue - globalTotalCosts;
    const globalMargin = globalActualRevenue > 0 ? (globalProfit / globalActualRevenue) * 100 : 0;

    return {
      planMetrics: planMetrics.sort((a, b) => b.activeCount - a.activeCount),
      global: {
        activeCount: globalActiveCount,
        expectedRevenue: globalExpectedRevenue,
        actualRevenue: globalActualRevenue,
        totalCosts: globalTotalCosts,
        profit: globalProfit,
        margin: globalMargin
      }
    };
  }, [plans, activeMemberships, invoices, appointments, currentMonthStart, currentMonthEnd, commissionPercentage]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (!isLoading && !isAdmin) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h1 className="text-3xl font-headline font-bold text-destructive">Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-3">
              <Link href="/admin/memberships">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Planos
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Activity className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-headline font-bold tracking-tight">
              Dashboard do Clube
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground hidden sm:block">
          Métricas referentes a <span className="font-semibold capitalize">{monthName}</span>
        </p>
      </div>

      {isLoading || !metrics ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="col-span-full h-96" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300">Total de Assinantes</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{metrics.global.activeCount}</div>
                <p className="text-xs text-purple-700/80 mt-1">Clientes com planos ativos</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/10 border-emerald-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Receita Real (Mês)</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {formatCurrency(metrics.global.actualRevenue)}
                </div>
                <p className="text-xs text-emerald-700/80 mt-1">
                  MRR Esperado: {formatCurrency(metrics.global.expectedRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-destructive/10 border-destructive/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Custos com Comissões</CardTitle>
                <Activity className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  -{formatCurrency(metrics.global.totalCosts)}
                </div>
                <p className="text-xs text-destructive/80 mt-1">Estimativa de repasse</p>
              </CardContent>
            </Card>

            <Card className={metrics.global.margin >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-destructive/10 border-destructive/20"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${metrics.global.margin >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-destructive'}`}>Margem de Lucro</CardTitle>
                <TrendingUp className={`h-4 w-4 ${metrics.global.margin >= 0 ? 'text-emerald-600' : 'text-destructive'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.global.margin >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-destructive'}`}>
                  {metrics.global.margin.toFixed(1)}%
                </div>
                <p className={`text-xs mt-1 ${metrics.global.margin >= 0 ? 'text-emerald-700/80' : 'text-destructive/80'}`}>
                  Lucro Bruto: {formatCurrency(metrics.global.profit)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Receita vs Custo (Por Plano)</CardTitle>
                <CardDescription>Comparativo financeiro mensal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.planMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `R$ ${val}`} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="actualRevenue" name="Receita Real" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalCosts" name="Custo de Comissão" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Margem de Lucro (%)</CardTitle>
                <CardDescription>Quais planos geram mais saúde financeira</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.planMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Bar dataKey="margin" name="Margem Bruta">
                        {metrics.planMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.margin >= 0 ? "#10b981" : "#ef4444"} radius={[4, 4, 0, 0]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detalhamento dos Planos</CardTitle>
              <CardDescription>Visão tabular da performance individual neste mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Plano</th>
                      <th className="px-4 py-3 text-center">Ativos</th>
                      <th className="px-4 py-3 text-right">MRR Esperado</th>
                      <th className="px-4 py-3 text-right">Receita (Mês)</th>
                      <th className="px-4 py-3 text-right">Custos (Comissão)</th>
                      <th className="px-4 py-3 text-right">Lucro Bruto</th>
                      <th className="px-4 py-3 text-center">Margem</th>
                      <th className="px-4 py-3 text-center rounded-tr-lg">Usos/Mês (Média)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.planMetrics.map((plan) => (
                      <tr key={plan.id} className="border-b border-muted/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 font-medium">{plan.name}</td>
                        <td className="px-4 py-4 text-center">{plan.activeCount}</td>
                        <td className="px-4 py-4 text-right text-muted-foreground">{formatCurrency(plan.expectedRevenue)}</td>
                        <td className="px-4 py-4 text-right text-emerald-600 font-medium">{formatCurrency(plan.actualRevenue)}</td>
                        <td className="px-4 py-4 text-right text-destructive font-medium">-{formatCurrency(plan.totalCosts)}</td>
                        <td className="px-4 py-4 text-right font-bold">{formatCurrency(plan.profit)}</td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant={plan.margin >= 0 ? "secondary" : "destructive"} className={plan.margin >= 0 ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20" : ""}>
                            {plan.margin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center text-muted-foreground">{plan.usagesPerUser.toFixed(1)}</td>
                      </tr>
                    ))}
                    {metrics.planMetrics.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum plano para analisar no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
