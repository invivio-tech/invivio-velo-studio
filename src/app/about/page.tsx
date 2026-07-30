'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Sparkles, 
  Shield, 
  TrendingUp, 
  Smartphone,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Activity,
  ShoppingBag,
  Award,
  ArrowRight
} from 'lucide-react';

export default function LPLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mr-4">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">VELO</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/spec" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors hidden sm:block">
              Ver Especificações Técnicas
            </Link>
            <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              Feito para Donos de Barbearia
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              A evolução da gestão do seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Negócio</span>
            </h1>
            <p className="text-lg md:text-2xl text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              O Invivio Velo foi criado para resolver as dores reais do seu dia a dia. Chega de planilhas confusas, furos na agenda e cálculos intermináveis de comissão. Automatize sua operação e foque no que importa: crescer.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="h-14 px-8 text-lg font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 w-full sm:w-auto transition-all hover:scale-105">
                <Link href="/">Acessar Meu Painel <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES */}
      <section className="py-24 bg-zinc-900/30 relative border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Tudo que você precisa, operando em harmonia.</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Cada módulo do sistema foi pensado para se conectar ao outro, economizando horas do seu tempo e garantindo que nenhum centavo passe despercebido.
            </p>
          </div>

          <div className="space-y-24">
            
            {/* Feature 1: Agenda */}
            <div className="flex flex-col md:flex-row items-center gap-12 group">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Calendar className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-100">Agenda que trabalha por você</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Esqueça as mensagens perdidas no WhatsApp. O Velo oferece um portal de autoatendimento onde seu cliente agenda sozinho, 24 horas por dia. Nossa agenda bloqueia conflitos de horário automaticamente e avisa a equipe em tempo real.
                </p>
                <ul className="space-y-3 pt-4">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /><span className="text-zinc-300">Painel de TV para a barbearia acompanhar os status do dia.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /><span className="text-zinc-300">Os clientes que possuem assinatura não precisam pagar na hora de agendar.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /><span className="text-zinc-300">Cada barbeiro só enxerga a própria agenda (se você desejar).</span></li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/50 rounded-3xl p-8 border border-white/5 shadow-2xl">
                <div className="h-64 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex flex-col justify-center items-center text-zinc-500">
                  [Ilustração Visual da Agenda]
                </div>
              </div>
            </div>

            {/* Feature 2: Finanças */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-100">Fim da matemática de fim de mês</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Chega de fechar o caixa na caneta ou correr o risco de pagar errado. No Velo, assim que um corte é finalizado, a comissão do barbeiro é congelada e guardada no extrato virtual dele, de forma totalmente segura.
                </p>
                <ul className="space-y-3 pt-4">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /><span className="text-zinc-300">Rateio automático e conta virtual individual para cada barbeiro.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /><span className="text-zinc-300">Relatório financeiro claro: Saiba seu lucro líquido, tirando os custos.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /><span className="text-zinc-300">Você pode ajustar a porcentagem de comissão de cada pessoa da equipe.</span></li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/50 rounded-3xl p-8 border border-white/5 shadow-2xl">
                <div className="h-64 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex flex-col justify-center items-center text-zinc-500">
                  [Ilustração Visual do DRE e Extratos]
                </div>
              </div>
            </div>

            {/* Feature 3: Club */}
            <div className="flex flex-col md:flex-row items-center gap-12 group">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-100">Clube de Assinaturas (Faturamento Previsível)</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Transforme seu faturamento de uma montanha-russa para um piso garantido. Crie planos de assinatura onde seu cliente paga um valor fixo mensal e consome pacotes fechados de serviços. O sistema gerencia toda a cobrança sozinho.
                </p>
                <ul className="space-y-3 pt-4">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /><span className="text-zinc-300">Configure um Repasse Inteligente: pague comissão apenas em cima da margem justa do plano.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /><span className="text-zinc-300">Dashboard próprio para mostrar a "Saúde do Plano" e garantir que ele dá lucro.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /><span className="text-zinc-300">Renovações automáticas de faturas mensais.</span></li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/50 rounded-3xl p-8 border border-white/5 shadow-2xl">
                <div className="h-64 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex flex-col justify-center items-center text-zinc-500">
                  [Ilustração Visual do Clube de Assinaturas]
                </div>
              </div>
            </div>

            {/* Feature 4: CRM */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Award className="w-7 h-7 text-pink-400" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-100">Fidelize e pare de perder clientes (Cashback)</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Sabe aquele cliente que marca horário e não aparece, deixando sua cadeira vazia? O Velo possui um programa de fidelidade onde clientes ganham pontos por comparecer e perdem pontos se derem "furo".
                </p>
                <ul className="space-y-3 pt-4">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0" /><span className="text-zinc-300">Pontos injetados na conta do cliente automaticamente a cada corte pago.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0" /><span className="text-zinc-300">Penalidade automática por faltas (No-Show), educando seu público.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0" /><span className="text-zinc-300">Estratégias de Marketing para enviar ofertas exclusivas para sua base.</span></li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/50 rounded-3xl p-8 border border-white/5 shadow-2xl">
                <div className="h-64 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex flex-col justify-center items-center text-zinc-500">
                  [Ilustração Visual do Cartão de Fidelidade]
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Pronto para dar o próximo passo?</h2>
          <p className="text-zinc-400 text-lg mb-10">
            Mais controle, mais previsibilidade e menos dor de cabeça. Entre e comece a utilizar todas essas funcionalidades no seu painel hoje mesmo.
          </p>
          <Button size="lg" asChild className="h-16 px-10 text-lg font-semibold rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 transition-all hover:scale-105">
            <Link href="/">Voltar ao Dashboard Operacional</Link>
          </Button>
        </div>
      </section>
      
    </div>
  );
}
