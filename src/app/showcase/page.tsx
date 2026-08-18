'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Sparkles, 
  CalendarDays, 
  Users, 
  TrendingUp, 
  CreditCard,
  ShoppingCart,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { BarberPoleIcon } from '@/components/icons/barber-pole-icon';

// Helper to trigger animations on scroll
function useOnScreen(ref: React.RefObject<Element | null>, rootMargin = '0px') {
  const [isIntersecting, setIntersecting] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIntersecting(true);
      },
      { rootMargin, threshold: 0.1 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref, rootMargin]);
  
  return isIntersecting;
}

function RevealSection({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref, '-50px');
  
  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6 flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <BarberPoleIcon className="h-8 w-8 text-emerald-500" />
            <span className="font-bold text-xl tracking-tight">Velo Studio</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
            <a href="#agenda" className="hover:text-emerald-400 transition-colors">Agenda</a>
            <a href="#clientes" className="hover:text-emerald-400 transition-colors">Gestão</a>
            <a href="#clube" className="hover:text-emerald-400 transition-colors">Clube</a>
            <a href="#pdv" className="hover:text-emerald-400 transition-colors">PDV</a>
            <a href="#financeiro" className="hover:text-emerald-400 transition-colors">Financeiro</a>
          </nav>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 shadow-lg shadow-emerald-900/20" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* 1. Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" /> A revolução na gestão de estúdios
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              A gestão inteligente que o <br className="hidden md:block" />
              seu negócio <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600">merece.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              O Velo Studio é a plataforma all-in-one para barbearias, salões e estúdios. 
              Da agenda ao financeiro, do clube de assinaturas ao balcão de vendas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-14 text-base w-full sm:w-auto shadow-lg shadow-emerald-900/40">
                Começar agora <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-base w-full sm:w-auto border-white/20 hover:bg-white/5 text-slate-950 bg-white">
                Falar com consultor
              </Button>
            </div>
          </div>

          <div className="container mx-auto px-4 md:px-6 mt-20 relative z-10">
            <div className="relative rounded-2xl md:rounded-[2.5rem] border border-white/10 bg-slate-900/50 p-2 md:p-4 backdrop-blur-sm shadow-2xl shadow-emerald-900/20 transform rotate-1 hover:rotate-0 transition-transform duration-700">
              <img 
                src="/showcase/step-03-dashboard-admin.png" 
                alt="Dashboard Velo Studio" 
                className="rounded-xl md:rounded-[2rem] w-full object-cover border border-white/5"
              />
            </div>
          </div>
        </section>

        {/* 2. Agenda Inteligente */}
        <section id="agenda" className="py-24 bg-slate-900 relative">
          <div className="container mx-auto px-4 md:px-6">
            <RevealSection>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium">
                    <CalendarDays className="w-4 h-4" /> Agenda Smart
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                    Agendamentos sem <br />dor de cabeça.
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Sua agenda de forma visual, fácil e intuitiva. Veja rapidamente a disponibilidade de toda a equipe e evite conflitos de horário.
                  </p>
                  <ul className="space-y-4 pt-4">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="text-slate-300">Visão completa em blocos de calendário e listagem.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="text-slate-300">Link público: seu cliente agenda 24h por dia.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="text-slate-300">Controle total sobre bloqueios e encaixes manuais.</span>
                    </li>
                  </ul>
                </div>
                <div className="relative">
                  <div className="relative z-10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <img src="/showcase/step-15-agenda-view.png" alt="Visão da Agenda" className="w-full" />
                  </div>
                  <div className="absolute -bottom-10 -left-10 z-20 w-3/4 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <img src="/showcase/step-22-guest-agendar-start.png" alt="Página Pública" className="w-full" />
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* 2.5 Bot WhatsApp */}
        <section className="py-24 bg-slate-950 border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <RevealSection>
              <div className="grid md:grid-cols-2 gap-12 items-center flex-col-reverse md:flex-row">
                <div className="relative p-6 bg-slate-900 rounded-3xl border border-white/10 shadow-2xl">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">🤖</div>
                      <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-tl-sm text-sm">
                        Olá! Bem-vindo à Barbearia Inteligente. Gostaria de agendar um horário hoje?
                      </div>
                    </div>
                    <div className="flex gap-4 flex-row-reverse">
                      <div className="bg-slate-700 text-white p-3 rounded-2xl rounded-tr-sm text-sm">
                        Sim! Quero cortar o cabelo com o Alberto às 15h.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">🤖</div>
                      <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-tl-sm text-sm">
                        Tudo certo! Seu agendamento para Corte de Cabelo com o Alberto às 15h foi confirmado. O sistema já foi atualizado!
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 md:pl-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                    <Sparkles className="w-4 h-4" /> Inteligência Artificial
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                    Bot Inteligente via <br />WhatsApp.
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Não perca mais tempo respondendo mensagens. Nosso bot de IA conversa com seus clientes pelo WhatsApp, entende o que eles querem e insere o agendamento direto na sua agenda, sem intervenção humana.
                  </p>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* 3. Gestão de Estúdio */}
        <section id="clientes" className="py-24 bg-slate-950">
          <div className="container mx-auto px-4 md:px-6">
            <RevealSection>
              <div className="grid md:grid-cols-2 gap-12 items-center flex-col-reverse md:flex-row">
                <div className="grid grid-cols-2 gap-4">
                  <img src="/showcase/step-16-team-list.png" alt="Equipe" className="rounded-xl border border-white/10 shadow-lg object-cover h-48 w-full" />
                  <img src="/showcase/step-04-services-list.png" alt="Serviços" className="rounded-xl border border-white/10 shadow-lg object-cover h-48 w-full translate-y-8" />
                  <img src="/showcase/step-08-clients-list.png" alt="Clientes" className="rounded-xl border border-white/10 shadow-lg object-cover col-span-2 mt-4" />
                </div>
                <div className="space-y-6 md:pl-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium">
                    <Users className="w-4 h-4" /> Gestão de Estúdio
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                    Equipe, Serviços e <br />Clientes num só lugar.
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Cadastros simplificados para manter a casa em ordem. Tenha o histórico dos seus clientes e controle as comissões de cada profissional com precisão cirúrgica.
                  </p>
                  <Button variant="link" className="text-purple-400 p-0 h-auto font-semibold hover:text-purple-300">
                    Conheça o módulo de gestão <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* 4. Clube de Assinaturas */}
        <section id="clube" className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-b border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <RevealSection>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium mb-6">
                  <CreditCard className="w-4 h-4" /> Clube de Assinaturas
                </div>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                  Gere receita recorrente <br />com pacotes mensais.
                </h2>
                <p className="text-slate-400 text-lg">
                  Transforme clientes eventuais em assinantes fiéis. Crie planos (como "Cabelo e Barba Ilimitado"), defina as regras de comissão e deixe o sistema gerenciar o uso.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
                <div className="w-full md:w-1/2 max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900 p-2">
                  <img src="/showcase/step-03-memberships-page.png" alt="Planos" className="w-full rounded-xl border border-white/5" />
                </div>
                <div className="w-full md:w-1/2 max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900 p-2">
                  <img src="/showcase/step-05-plan-form-filled.png" alt="Criar Plano" className="w-full rounded-xl border border-white/5" />
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* 5. PDV / Venda Balcão */}
        <section id="pdv" className="py-24 bg-slate-950">
          <div className="container mx-auto px-4 md:px-6">
            <RevealSection>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                    <ShoppingCart className="w-4 h-4" /> PDV Integrado
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                    Muito mais que <br />serviços.
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Venda pomadas, bebidas e produtos na sua loja. O Velo Studio traz um PDV (Venda Balcão) extremamente ágil. Em apenas dois passos, você seleciona o cliente e os produtos. O estoque é atualizado automaticamente.
                  </p>
                  <ul className="space-y-4 pt-4">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="text-slate-300">Cadastro fácil de produtos.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="text-slate-300">Aba rápida para Clientes Avulsos.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="text-slate-300">Gestão de entregas (Pedidos Retirados).</span>
                    </li>
                  </ul>
                </div>
                <div className="relative">
                  <div className="relative z-10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900 p-2">
                    <img src="/showcase/step-18-quicksale-filled.png" alt="Venda Balcão" className="w-full rounded-xl border border-white/5" />
                  </div>
                  <div className="absolute -top-6 -right-6 z-0 w-2/3 opacity-30 rounded-2xl border border-white/10 overflow-hidden">
                    <img src="/showcase/step-14-orders-page.png" alt="Pedidos" className="w-full" />
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* 5.5 Loja Virtual */}
        <section className="py-24 bg-slate-900 border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <RevealSection>
              <div className="grid md:grid-cols-2 gap-12 items-center flex-col-reverse md:flex-row">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium">
                    <ShoppingCart className="w-4 h-4" /> Loja Pública
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                    Sua Loja Virtual <br />aberta 24 horas.
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Todo produto que você adiciona no estoque do painel vai automaticamente para a sua vitrine online. Seus clientes podem acessar, comprar e optar pela retirada ou entrega, gerando vendas passivas.
                  </p>
                </div>
                <div className="relative">
                  {/* Imagem Base - Dita a altura do container */}
                  <div className="relative z-10 w-full sm:w-5/6 ml-auto rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950 p-2">
                    <img src="/showcase/step-01-store-home.png" alt="Loja Virtual" className="w-full rounded-xl border border-white/5" />
                  </div>
                  {/* Imagens Flutuantes */}
                  <div className="absolute top-1/4 -left-4 sm:left-0 z-20 w-2/3 sm:w-3/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950 p-2 transform -rotate-2">
                    <img src="/showcase/step-03-store-cart-open.png" alt="Carrinho" className="w-full rounded-xl border border-white/5" />
                  </div>
                  <div className="absolute -bottom-8 right-0 sm:-right-8 z-30 w-1/2 sm:w-2/5 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl bg-slate-950 p-1 transform rotate-3">
                    <img src="/showcase/step-06-store-order-success.png" alt="Sucesso" className="w-full rounded-xl" />
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* 6. Financeiro */}
        <section id="financeiro" className="py-32 bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <RevealSection>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-6">
                  <TrendingUp className="w-4 h-4" /> Relatórios Poderosos
                </div>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                  Domine os números do <br />seu negócio.
                </h2>
                <p className="text-slate-400 text-lg">
                  Saiba exatamente de onde vem o seu dinheiro. O relatório financeiro consolida serviços, produtos e assinaturas, calculando automaticamente as comissões devidas.
                </p>
              </div>

              <div className="max-w-5xl mx-auto rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950 p-2 md:p-4">
                <img src="/showcase/step-21-financial-report-part2.png" alt="Relatório Financeiro" className="w-full rounded-xl border border-white/5" />
              </div>
            </RevealSection>
          </div>
        </section>
        
        {/* CTA */}
        <section className="py-24 bg-emerald-600 relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para transformar sua barbearia?
            </h2>
            <p className="text-emerald-100 text-xl max-w-2xl mx-auto mb-10">
              Junte-se a milhares de estúdios e barbearias que já estão faturando mais com a ajuda do Velo Studio.
            </p>
            <Button size="lg" className="bg-slate-950 hover:bg-slate-900 text-white rounded-full px-10 h-16 text-lg shadow-2xl shadow-slate-950/20">
              Começar Teste Grátis
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-12 border-t border-white/10">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarberPoleIcon className="h-6 w-6 opacity-50" />
            <span className="font-bold tracking-tight">Velo Studio</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Invivio Tecnologia. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
