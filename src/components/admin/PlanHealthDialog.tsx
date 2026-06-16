'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { MembershipPlanWithId } from '@/components/admin/MembershipPlanForm';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlanHealthDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MembershipPlanWithId | null;
  commissionPercentage: number;
}

export function PlanHealthDialog({ isOpen, onOpenChange, plan, commissionPercentage }: PlanHealthDialogProps) {
  const firestore = useFirestore();
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const monthName = format(new Date(), 'MMMM', { locale: ptBR });

  // Queries
  const activeMembershipsQ = useMemoFirebase(
    () => (firestore && plan) ? query(
      collection(firestore, 'userMemberships'),
      where('planId', '==', plan.id),
      where('status', '==', 'active')
    ) : null,
    [firestore, plan]
  );

  const invoicesQ = useMemoFirebase(
    () => (firestore && plan) ? query(
      collection(firestore, 'membershipInvoices'),
      where('planId', '==', plan.id),
      where('status', '==', 'paid')
    ) : null,
    [firestore, plan]
  );

  const appointmentsQ = useMemoFirebase(
    () => (firestore && plan) ? query(
      collection(firestore, 'appointments'),
      where('subscriptionPlanId', '==', plan.id),
      where('status', '==', 'completed'),
      where('startTime', '>=', Timestamp.fromDate(currentMonthStart)),
      where('startTime', '<=', Timestamp.fromDate(currentMonthEnd))
    ) : null,
    [firestore, plan]
  );

  const { data: activeMemberships, isLoading: isLoadingMemberships } = useCollection(activeMembershipsQ);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection(invoicesQ);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection(appointmentsQ);

  const isLoading = isLoadingMemberships || isLoadingInvoices || isLoadingAppointments;

  const metrics = useMemo(() => {
    if (!plan || !activeMemberships || !invoices || !appointments) return null;

    const activeCount = activeMemberships.length;
    const expectedRevenue = activeCount * plan.price;

    // Filter invoices by current month locally to avoid index issues
    const monthlyInvoices = invoices.filter(inv => {
      if (!inv.paidAt) return false;
      const date = inv.paidAt.toDate();
      return date.getTime() >= currentMonthStart.getTime() && date.getTime() <= currentMonthEnd.getTime();
    });
    
    const actualRevenue = monthlyInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

    const totalCosts = appointments.reduce((acc, apt) => {
      const baseValue = apt.commissionBaseValue !== undefined ? Number(apt.commissionBaseValue) : 0;
      return acc + (baseValue * (commissionPercentage / 100));
    }, 0);

    const profit = actualRevenue - totalCosts;
    const margin = actualRevenue > 0 ? (profit / actualRevenue) * 100 : 0;
    
    const usagesCount = appointments.length;
    const usagesPerUser = activeCount > 0 ? (usagesCount / activeCount).toFixed(1) : '0';

    return {
      activeCount,
      expectedRevenue,
      actualRevenue,
      totalCosts,
      profit,
      margin,
      usagesCount,
      usagesPerUser
    };
  }, [plan, activeMemberships, invoices, appointments, currentMonthStart, currentMonthEnd, commissionPercentage]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Saúde do Plano: {plan.name}
          </DialogTitle>
          <DialogDescription>
            Análise de rentabilidade e uso referente a <strong>{monthName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !metrics ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-purple-500/10 border-purple-500/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center justify-between">
                    Assinantes Ativos
                    <Users className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{metrics.activeCount}</div>
                  <p className="text-xs text-purple-700/80 mt-1">Taxa de Uso: {metrics.usagesPerUser}/usuário</p>
                </CardContent>
              </Card>

              <Card className={metrics.margin >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-destructive/10 border-destructive/20"}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className={`text-sm font-medium flex items-center justify-between ${metrics.margin >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-destructive'}`}>
                    Margem Bruta (Saúde)
                    <TrendingUp className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={`text-2xl font-bold ${metrics.margin >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-destructive'}`}>
                    {metrics.margin.toFixed(1)}%
                  </div>
                  <p className={`text-xs mt-1 ${metrics.margin >= 0 ? 'text-emerald-700/80' : 'text-destructive/80'}`}>
                    {metrics.margin >= 50 ? 'Excelente' : metrics.margin >= 20 ? 'Saudável' : metrics.margin >= 0 ? 'Alerta' : 'Prejuízo'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" /> Receita Esperada (MRR)
                  </p>
                  <p className="text-xs text-muted-foreground">Projeção com base nos ativos</p>
                </div>
                <div className="font-semibold">{formatCurrency(metrics.expectedRevenue)}</div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" /> Receita Real (Faturada)
                  </p>
                  <p className="text-xs text-muted-foreground">Faturas pagas neste mês</p>
                </div>
                <div className="font-semibold text-emerald-600">{formatCurrency(metrics.actualRevenue)}</div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-destructive" /> Custo Mensal Estimado
                  </p>
                  <p className="text-xs text-muted-foreground">Comissões pagas por uso</p>
                </div>
                <div className="font-semibold text-destructive">-{formatCurrency(metrics.totalCosts)}</div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted font-bold text-lg">
                <span>Lucro Bruto:</span>
                <span className={metrics.profit >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                  {formatCurrency(metrics.profit)}
                </span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              Os custos são baseados na taxa de comissão padrão de {commissionPercentage}% aplicada sobre o Valor Unitário para Repasse configurado no plano.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
