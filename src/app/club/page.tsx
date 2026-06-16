'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MembershipPlanWithId } from '@/components/admin/MembershipPlanForm';

export default function ClubPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);

  // Load Active Plans
  const plansCollection = useMemoFirebase(
    () => {
      if (!firestore) return null;
      return query(collection(firestore, 'membershipPlans'), where('isActive', '==', true));
    },
    [firestore]
  );
  const { data: plans, isLoading: arePlansLoading } = useCollection<MembershipPlanWithId>(plansCollection);

  // Load User's Memberships
  const userMembershipsCollection = useMemoFirebase(
    () => {
      if (!firestore || !user?.uid) return null;
      return query(collection(firestore, 'userMemberships'), where('userId', '==', user.uid));
    },
    [firestore, user?.uid]
  );
  const { data: userMemberships, isLoading: areMembershipsLoading } = useCollection<any>(userMembershipsCollection);

  const handleSubscribe = async (plan: MembershipPlanWithId) => {
    if (!user || !firestore) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para assinar um plano.',
        variant: 'destructive',
      });
      return;
    }

    setSubscribingTo(plan.id);
    try {
      const now = new Date();
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      await addDoc(collection(firestore, 'userMemberships'), {
        userId: user.uid,
        planId: plan.id,
        planName: plan.name,
        startDate: Timestamp.fromDate(now),
        nextBillingDate: Timestamp.fromDate(nextBilling),
        status: 'pending_payment',
        usageCount: 0,
        maxUsesPerMonth: plan.maxUsesPerMonth,
      });

      toast({
        title: 'Assinatura Registrada!',
        description: 'Procure o balcão da barbearia para realizar o pagamento (Sinal PIX) e ativar seu plano.',
      });
    } catch (error) {
      console.error("Erro ao assinar:", error);
      toast({
        title: 'Erro ao assinar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setSubscribingTo(null);
    }
  };

  const isLoading = isUserLoading || arePlansLoading || areMembershipsLoading;

  // Filter to find active/pending memberships for the current user
  const activeOrPendingMembership = userMemberships?.find(
    (m) => m.status === 'active' || m.status === 'pending_payment'
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 text-center justify-center flex-col md:flex-row mb-10">
        <Sparkles className="h-12 w-12 text-primary" />
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight">
            Clube de Vantagens
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Assine um de nossos planos e garanta seu visual impecável o mês inteiro.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      )}

      {!isLoading && activeOrPendingMembership && (
        <Card className="mb-10 bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              {activeOrPendingMembership.status === 'active' ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              )}
              <CardTitle>Sua Assinatura: {activeOrPendingMembership.planName}</CardTitle>
            </div>
            <CardDescription>
              {activeOrPendingMembership.status === 'active' 
                ? 'Sua assinatura está ativa! Agende seus serviços inclusos com 100% de desconto.' 
                : 'Sua assinatura está aguardando pagamento. Por favor, acerte no balcão da barbearia para ativá-la.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              Uso Mensal: {activeOrPendingMembership.usageCount} / {activeOrPendingMembership.maxUsesPerMonth === 999 ? 'Ilimitado' : activeOrPendingMembership.maxUsesPerMonth}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && plans && plans.length > 0 && !activeOrPendingMembership && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col relative overflow-hidden transition-all hover:shadow-lg border-2 hover:border-primary/50">
              {/* Image background if exists */}
              {plan.imageUrl && (
                <div className="w-full h-48 relative overflow-hidden">
                  <img src={plan.imageUrl} alt={plan.name} className="object-cover w-full h-full opacity-90 transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>
              )}
              
              {/* Highlight best value */}
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                Recomendado
              </div>
              
              <CardHeader className={`text-center pb-4 relative z-10 ${plan.imageUrl ? 'pt-0 -mt-12' : 'pt-8'}`}>
                <CardTitle className="font-headline text-3xl">{plan.name}</CardTitle>
                <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 text-center">
                <div className="flex justify-center items-baseline gap-1 mb-6">
                  <span className="text-5xl font-bold font-headline text-primary">R${plan.price.toFixed(2).replace('.', ',')}</span>
                  <span className="text-muted-foreground font-medium">/mês</span>
                </div>
                
                <ul className="space-y-3 text-sm text-left mx-auto max-w-[250px]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{plan.maxUsesPerMonth === 999 ? 'Uso Ilimitado' : `Até ${plan.maxUsesPerMonth} atendimentos por mês`}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>Desconto automático no agendamento</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>Prioridade na agenda</span>
                  </li>
                </ul>
              </CardContent>
              
              <CardFooter className="pt-4 pb-8">
                <Button 
                  className="w-full text-lg h-12" 
                  onClick={() => handleSubscribe(plan)}
                  disabled={subscribingTo === plan.id}
                >
                  {subscribingTo === plan.id ? 'Processando...' : 'Assinar no Balcão'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && plans?.length === 0 && (
        <div className="text-center py-20">
          <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-headline font-semibold">Nenhum plano disponível</h2>
          <p className="text-muted-foreground mt-2">A barbearia ainda não configurou os planos do clube.</p>
        </div>
      )}
    </div>
  );
}
