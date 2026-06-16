'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  CalendarCheck, 
  TrendingUp, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Smartphone,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function AboutLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      
      {/* HEADER / NAV */}
      <header className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">VELO</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Voltar ao Painel
            </Link>
            <Link href="https://invivio.com.br" target="_blank">
              <Button className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-full font-semibold px-6">
                Falar com Consultor
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              A Evolução Definitiva
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              A gestão do seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Negócio</span> no Piloto Automático
            </h1>
            <p className="text-lg md:text-2xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Transforme clientes em assinantes. Automatize agendamentos, garanta receita previsível e impulsione seu negócio com o sistema mais inteligente do mercado.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 w-full sm:w-auto transition-all hover:scale-105">
                Ver Demonstração <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold rounded-full border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white w-full sm:w-auto">
                Conhecer Recursos
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="py-24 bg-zinc-900/30 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 animate-in fade-in duration-700">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Um ecossistema completo para o seu negócio</h2>
            <p className="text-zinc-400 text-lg max-w-3xl mx-auto">
              Esqueça os sistemas que funcionam apenas como "caderninhos digitais". O Velo é uma plataforma robusta que unifica Agendamento, Pagamentos Recorrentes, Gestão Financeira avançada e Inteligência Artificial.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Clubes de Assinatura (MRR)</h3>
              <p className="text-zinc-400 leading-relaxed mb-6 flex-grow">
                Transforme serviços avulsos em receita recorrente garantida todo mês. Blinde seu caixa contra a sazonalidade e garanta previsibilidade financeira.
              </p>
              <ul className="space-y-2 mt-auto">
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" /> Planos ilimitados ou com limites de uso.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" /> Geração de faturas e cobrança automática.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" /> Dashboard em tempo real analisando o Lucro Bruto e a Saúde de cada plano.</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Agendamento & Autoatendimento</h3>
              <p className="text-zinc-400 leading-relaxed mb-6 flex-grow">
                Uma vitrine digital impecável para o seu cliente final. Ele agenda 24/7 sem precisar trocar uma única mensagem no WhatsApp com a recepção.
              </p>
              <ul className="space-y-2 mt-auto">
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> O sistema detecta assinantes e zera o preço do serviço automaticamente no checkout.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Prevenção inteligente contra choques de horário.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Design premium e responsivo para celular.</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Gestão Financeira & Comissões</h3>
              <p className="text-zinc-400 leading-relaxed mb-6 flex-grow">
                Nunca mais perca horas calculando o pagamento da equipe. O Velo resolve a matemática complexa de repasses de forma blindada e livre de erros.
              </p>
              <ul className="space-y-2 mt-auto">
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /> Rateio automático de comissões por profissional.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /> "Valor Base de Repasse" para assinaturas (protege sua margem).</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /> DRE completo: Serviços + Loja + Assinaturas vs Custos.</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Programa de Fidelidade (Rewards)</h3>
              <p className="text-zinc-400 leading-relaxed mb-6 flex-grow">
                Gamifique a relação com seu público. Acabe com os "cartõezinhos de papel" e faça o cliente voltar mais vezes para acumular benefícios.
              </p>
              <ul className="space-y-2 mt-auto">
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" /> Acúmulo 100% automatizado a cada serviço finalizado.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" /> Resgate de pontos direto pelo aplicativo do cliente.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" /> Loja integrada para troca por produtos físicos ou serviços VIP.</li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Marketing com Inteligência Artificial</h3>
              <p className="text-zinc-400 leading-relaxed mb-6 flex-grow">
                Uma agência de marketing embutida no seu sistema. O Velo possui Agentes de IA prontos para trabalhar a favor do faturamento do seu negócio.
              </p>
              <ul className="space-y-2 mt-auto">
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> Criação de Copy persuasiva para Promoções com 1 clique.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> Geração de descrições atraentes para novos planos de assinatura.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> Análise de dados e auditoria inteligente.</li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
              <div className="w-14 h-14 rounded-2xl bg-zinc-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 text-zinc-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Centro de Comando (Multi-Tenant)</h3>
              <p className="text-zinc-400 leading-relaxed mb-6 flex-grow">
                Gestão centralizada para redes. Se você tem mais de uma unidade ou opera franquias, o Velo oferece controle absoluto sobre o seu ecossistema.
              </p>
              <ul className="space-y-2 mt-auto">
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" /> Visão global de todas as unidades ativas e inativas.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" /> Monitoramento técnico e auditoria de logs centralizada.</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" /> Banco de dados totalmente isolado e seguro para cada filial.</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* HIGHLIGHT SECTION */}
      <section className="py-24 relative overflow-hidden animate-in fade-in duration-1000">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2 space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Criado para faturar <br />
                <span className="text-emerald-400">Todo Santo Mês.</span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Você já perdeu noites de sono fazendo contas de quanto ia entrar no mês para cobrir os custos fixos? Com o módulo de Clubes do Velo, você inicia o mês sabendo exatamente qual o seu faturamento mínimo (MRR).
              </p>
              
              <ul className="space-y-4">
                {[
                  'Crie planos de assinatura personalizados em 1 minuto.',
                  'Cobrança e faturas automáticas.',
                  'Comissões dos profissionais blindadas (Você define o repasse).',
                  'Dashboard em tempo real da saúde dos planos.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    <span className="text-zinc-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="w-full lg:w-1/2">
              {/* Mockup Dashboard Illustration */}
              <div className="relative rounded-2xl bg-gradient-to-tr from-zinc-900 to-zinc-800 border border-zinc-700 p-2 shadow-2xl shadow-emerald-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl" />
                <div className="bg-zinc-950 rounded-xl overflow-hidden relative z-10 border border-zinc-800/50">
                  <div className="h-10 border-b border-zinc-800 flex items-center px-4 gap-2 bg-zinc-900/50">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center mb-8">
                      <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-emerald-500/20 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-zinc-800/50 rounded-lg p-4 border border-zinc-800">
                        <div className="h-4 w-20 bg-zinc-700 rounded mb-4" />
                        <div className="h-8 w-24 bg-emerald-500/30 rounded" />
                      </div>
                      <div className="h-24 bg-zinc-800/50 rounded-lg p-4 border border-zinc-800">
                        <div className="h-4 w-20 bg-zinc-700 rounded mb-4" />
                        <div className="h-8 w-24 bg-zinc-700 rounded" />
                      </div>
                    </div>
                    <div className="h-40 bg-zinc-800/30 rounded-lg border border-zinc-800 mt-4 p-4 flex items-end gap-2 justify-between">
                      <div className="w-1/6 h-[40%] bg-emerald-500/40 rounded-t" />
                      <div className="w-1/6 h-[60%] bg-emerald-500/50 rounded-t" />
                      <div className="w-1/6 h-[30%] bg-emerald-500/30 rounded-t" />
                      <div className="w-1/6 h-[80%] bg-emerald-500/60 rounded-t" />
                      <div className="w-1/6 h-[100%] bg-emerald-500/80 rounded-t" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="py-24 border-t border-white/5 relative">
        <div className="absolute inset-0 bg-emerald-500/5" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Pronto para modernizar a sua gestão?</h2>
          <p className="text-zinc-400 text-lg mb-10">
            Junte-se à revolução na gestão de estabelecimentos. Menos tempo perdendo dinheiro em planilhas, mais tempo entregando a melhor experiência.
          </p>
          <Button size="lg" asChild className="h-16 px-10 text-lg font-semibold rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 transition-transform hover:scale-105">
            <Link href="https://invivio.com.br" target="_blank">Agendar Demonstração Gratuita</Link>
          </Button>
        </div>
      </section>
      
    </div>
  );
}
