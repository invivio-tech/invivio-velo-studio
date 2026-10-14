'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lock, 
  ArrowLeft, 
  MessageCircle, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';
import { EstablishmentSettings } from '@/app/establishment/page';

export type PlanModuleKey = 'store' | 'club' | 'rewards' | 'marketing' | 'financial' | 'whatsappBot';

interface PlanGateProps {
  module: PlanModuleKey;
  children: ReactNode;
}

const MODULE_INFO: Record<PlanModuleKey, {
  name: string;
  tagline: string;
  description: string;
  recommendedPlan: string;
  features: string[];
}> = {
  financial: {
    name: 'Módulo Financeiro & DRE',
    tagline: 'Controle total das finanças da sua barbearia',
    description: 'Acompanhe faturamento em tempo real, despesas, fluxo de caixa diário/mensal e comissões detalhadas de cada profissional da equipe.',
    recommendedPlan: 'Plano Solo ou Studio',
    features: [
      'Fluxo de caixa detalhado e gráficos de evolução',
      'Cálculo e controle automático de comissões por barbeiro',
      'DRE e demonstrativo de resultados do mês',
      'Relatórios de despesas e categorias'
    ]
  },
  club: {
    name: 'Clube de Assinaturas & Recorrência',
    tagline: 'Receita previsível e garantida todo mês',
    description: 'Transforme clientes casuais em assinantes mensais (cortes ilimitados, barbas, combos) com cobrança recorrente automatizada.',
    recommendedPlan: 'Plano Studio ou Velo',
    features: [
      'Criação de planos personalizados de assinatura',
      'Gestão de assinantes ativos e frequência de uso',
      'Métricas de faturamento recorrente garantido',
      'Controle automático de status de pagamento'
    ]
  },
  rewards: {
    name: 'Programa de Fidelidade & Recompensas',
    tagline: 'Fidelize seus clientes com pontuação automática',
    description: 'Incentive seus clientes a voltarem com maior frequência acumulando pontos a cada serviço realizado para trocar por prêmios.',
    recommendedPlan: 'Plano Studio ou Velo',
    features: [
      'Pontuação automática a cada atendimento concluído',
      'Catálogo de prêmios e resgates configurável',
      'Extrato de pontuação no perfil do cliente',
      'Maior retenção e frequência média de visitas'
    ]
  },
  marketing: {
    name: 'Campanhas de Marketing & Promoções com IA',
    tagline: 'Preencha horários ociosos com ofertas inteligentes',
    description: 'Gere promoções inteligentes sugeridas por inteligência artificial e crie campanhas direcionadas para dias de menor movimento.',
    recommendedPlan: 'Plano Studio ou Velo',
    features: [
      'Geração de ofertas promocionais com Inteligência Artificial',
      'Campanhas direcionadas para preenchimento de horários vazios',
      'Mensagens prontas para disparo via WhatsApp',
      'Aumento imediato da taxa de ocupação da barbearia'
    ]
  },
  store: {
    name: 'Catálogo de Produtos & Loja Integrada',
    tagline: 'Venda de produtos e controle de estoque',
    description: 'Gerencie seu catálogo de pomadas, óleos e cosméticos, com controle de estoque no balcão e vitrine online para seus clientes.',
    recommendedPlan: 'Plano Solo ou Studio',
    features: [
      'Controle de estoque e alerta de reposição',
      'Venda de itens combinada ao pagamento do corte',
      'Catálogo digital visível no agendamento do cliente',
      'Relatório de produtos mais vendidos'
    ]
  },
  whatsappBot: {
    name: 'Atendente Virtual WhatsApp com IA',
    tagline: 'Agendamentos automáticos 24h por dia',
    description: 'Atendimento humanizado e agendamento automático 24/7 direto pelo WhatsApp Oficial da sua barbearia com inteligência artificial.',
    recommendedPlan: 'Plano WhatsApp ou Add-on IA',
    features: [
      'Agendamento autônomo sem precisar responder mensagens',
      'Confirmação e lembretes automáticos de agendamento',
      'WhatsApp Oficial Meta Cloud API sem risco de bloqueio de chip',
      'Atendimento 24 horas por dia, fins de semana e feriados'
    ]
  }
};

export function PlanGate({ module, children }: PlanGateProps) {
  const router = useRouter();
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );

  const { data: settings, isLoading } = useDoc<EstablishmentSettings>(settingsRef);

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // Se o módulo estiver explicitamente desativado pelo plano (enabled === false)
  const isModuleDisabled = settings?.planLimits?.[module]?.enabled === false;

  if (isModuleDisabled) {
    const info = MODULE_INFO[module];
    const establishmentName = settings?.name || 'sua barbearia';
    const whatsappMessage = `Olá! Sou da ${establishmentName} e gostaria de fazer o upgrade do meu plano para liberar o ${info.name}.`;
    const whatsappUrl = `https://wa.me/5511988047106?text=${encodeURIComponent(whatsappMessage)}`;

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-border/40 shadow-xl bg-card relative overflow-hidden rounded-3xl">
          {/* Top highlight gradient */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600" />
          
          <CardContent className="pt-8 pb-8 px-6 sm:px-10 space-y-6">
            
            {/* Header com ícone e badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {info.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {info.tagline}
                  </p>
                </div>
              </div>

              <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/5 px-3 py-1 text-xs shrink-0 font-medium">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Disponível no {info.recommendedPlan}
              </Badge>
            </div>

            {/* Descrição */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 text-sm text-muted-foreground leading-relaxed">
              {info.description}
            </div>

            {/* Lista de Vantagens */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Recursos inclusos com o upgrade:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {info.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 border-t border-border/30 flex flex-col sm:flex-row items-center gap-3">
              <Button asChild className="w-full sm:flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md rounded-xl h-11 font-medium">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com Suporte e Fazer Upgrade
                  <ArrowUpRight className="w-4 h-4 ml-1 opacity-70" />
                </a>
              </Button>

              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto rounded-xl h-11 border-border/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Painel
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    );
  }

  // Se o módulo estiver ativo, renderiza o conteúdo normalmente
  return <>{children}</>;
}
