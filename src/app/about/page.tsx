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
  ArrowRight,
  Bot,
  MessageSquare,
  Clock,
  Zap,
  Check,
  ShieldCheck,
  Flame,
  Send,
  Sliders,
  Tv
} from 'lucide-react';

export default function LPLandingPage() {
  const [activeTab, setActiveTab] = useState<'ia' | 'central'>('ia');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* ── HEADER DE NAVEGAÇÃO ── */}
      <header className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mr-2"
              title="Voltar para a barbearia"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight leading-none">VELO</span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Ecossistema do Dono</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#ia-whatsapp" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span>IA WhatsApp</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 font-bold">Novo</span>
            </a>
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#atalhos" className="hover:text-white transition-colors">Acesso Rápido</a>
            <Link href="/spec" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>Especificações</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-5 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105">
              <Link href="/dashboard">
                Acessar Painel <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        {/* Glow atmosférico */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs md:text-sm font-semibold mb-8 backdrop-blur-md">
            <Bot className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Módulo Atendente IA Oficial no WhatsApp & Central Unificada</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            A evolução da sua barbearia com <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              Inteligência Artificial Integrada
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Chega de mensagens acumuladas no WhatsApp, furos na agenda e cálculos intermináveis de comissão. O Velo centraliza atendimento autônomo 24/7, gestão de equipe e previsibilidade de caixa em uma única plataforma.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" asChild className="h-14 px-8 text-base md:text-lg font-bold rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-zinc-950 shadow-xl shadow-emerald-500/25 w-full sm:w-auto transition-all hover:scale-105">
              <Link href="/dashboard">
                Acessar Meu Painel <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <a href="#ia-whatsapp" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base md:text-lg font-semibold rounded-full border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-white w-full backdrop-blur-sm">
                Conhecer a IA no WhatsApp
              </Button>
            </a>
          </div>

          {/* Badges de Destaques Operacionais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left border-t border-white/5 pt-8">
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
                24/7
                <Bot className="w-5 h-5 text-emerald-400 inline" />
              </div>
              <div className="text-xs md:text-sm text-zinc-400 mt-1">Atendimento IA no WhatsApp</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-extrabold text-emerald-400">Zero</div>
              <div className="text-xs md:text-sm text-zinc-400 mt-1">Furos & Choques de Agenda</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-extrabold text-teal-400">100%</div>
              <div className="text-xs md:text-sm text-zinc-400 mt-1">Comissões Transparentes</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-extrabold text-purple-400">+Recorrente</div>
              <div className="text-xs md:text-sm text-zinc-400 mt-1">Clubes de Assinatura (MRR)</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO EXCLUSIVA: ATENDENTE VIRTUAL IA NO WHATSAPP ── */}
      <section id="ia-whatsapp" className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-900/50 to-zinc-950 relative overflow-hidden border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-14">
            
            {/* Texto Explicativo da IA */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>INTEGRAÇÃO OFICIAL WHATSAPP CLOUD API</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
                Um recepcionista de elite <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  que nunca dorme e não erra horários.
                </span>
              </h2>

              <p className="text-lg text-zinc-400 leading-relaxed">
                Esqueça respostas automáticas robóticas e menus travados de <i>"digite 1 para agendar"</i>. A Inteligência Artificial do Velo conversa com linguagem humana de verdade: consulta a grade do salão em tempo real, respeita a duração de cada serviço e fecha o agendamento em instantes.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Linguagem 100% natural:</strong> Entende gírias, nomes de barbeiros, pedidos combinados ("corte + barba") e preferências de horário.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Conexão direta com a sua Grade:</strong> Não permite sobreposição e aplica as folgas, intervalos e horários de trabalho de cada profissional.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Consciente de Fidelidade e Clube:</strong> Reconhece clientes com planos ativos e informa o saldo de pontos ou benefícios automaticamente.
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Button asChild className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700">
                  <Link href="/admin/mensagens">
                    Ver Central de Mensagens <MessageSquare className="w-4 h-4 ml-2 text-emerald-400" />
                  </Link>
                </Button>
                <Link href="/spec" className="text-sm font-semibold text-emerald-400 hover:underline">
                  Ver regras técnicas no manual →
                </Link>
              </div>
            </div>

            {/* Mockup Interativo do WhatsApp com IA */}
            <div className="w-full lg:w-1/2">
              <div className="relative mx-auto max-w-md rounded-3xl p-4 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 shadow-2xl">
                
                {/* Header do WhatsApp Mock */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-700/60 px-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-zinc-900 rounded-full" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Velo Barber Bot</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
                      </div>
                      <span className="text-[11px] text-emerald-400 font-medium">Online 24h • Atendente Inteligente</span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                    Meta Oficial
                  </div>
                </div>

                {/* Área de Conversa */}
                <div className="py-4 space-y-3.5 font-sans text-xs sm:text-sm">
                  {/* Mensagem Cliente 1 */}
                  <div className="flex justify-end">
                    <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-100 rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] shadow-sm">
                      <p>Opa, boa tarde! Queria agendar um corte com barba pro sábado de manhã com o Lucas.</p>
                      <span className="block text-[10px] text-emerald-400/70 text-right mt-1">14:32</span>
                    </div>
                  </div>

                  {/* Resposta IA 1 */}
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 border border-zinc-700/70 text-zinc-100 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[88%] shadow-sm space-y-1.5">
                      <p>
                        Fala, Gabriel! Tudo bom? 💈
                      </p>
                      <p>
                        Consultei aqui: o <strong>Lucas</strong> tem duas vagas perfeitas para você neste sábado:
                      </p>
                      <div className="p-2 rounded-lg bg-zinc-900/70 border border-white/5 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-zinc-200">
                          <span>✂️ Corte + Barba</span>
                          <span className="font-bold text-emerald-400">R$ 75,00</span>
                        </div>
                        <div className="text-zinc-400 text-[11px]">Duração estimada: 50 minutos</div>
                      </div>
                      <p className="text-zinc-300">
                        Os horários disponíveis são <strong>09:30</strong> ou <strong>11:00</strong>. Qual fica melhor para você?
                      </p>
                      <span className="block text-[10px] text-zinc-400 text-right mt-1">14:32 • Resposta em 2s</span>
                    </div>
                  </div>

                  {/* Mensagem Cliente 2 */}
                  <div className="flex justify-end">
                    <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-100 rounded-2xl rounded-tr-none px-4 py-2 max-w-[85%] shadow-sm">
                      <p>Pode ser às 09:30!</p>
                      <span className="block text-[10px] text-emerald-400/70 text-right mt-1">14:33</span>
                    </div>
                  </div>

                  {/* Resposta IA 2 */}
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 border border-emerald-500/30 text-zinc-100 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[88%] shadow-sm space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Agendamento Confirmado!</span>
                      </div>
                      <p className="text-zinc-200">
                        Pronto, Gabriel! Te esperamos no <strong>sábado às 09:30</strong> com o barbeiro <strong>Lucas</strong>.
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        🎁 Você acumulou <strong>+75 pontos de fidelidade</strong> com este agendamento!
                      </p>
                      <span className="block text-[10px] text-zinc-400 text-right mt-1">14:33 • Salvo no Studio</span>
                    </div>
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="mt-2 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 px-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Sincronizado com a Agenda do Salão
                  </span>
                  <span className="text-zinc-500">Sem aplicativo extra</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SEÇÃO: CENTRAL DE MENSAGENS & TRANSBORDO HUMANO ── */}
      <section className="py-24 bg-zinc-950 relative border-b border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-14">
            
            {/* Texto Explicativo */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>TRANSBORDO INTELIGENTE & CONTROLE TOTAL</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
                Assuma qualquer conversa <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                  no segundo em que desejar.
                </span>
              </h2>

              <p className="text-lg text-zinc-400 leading-relaxed">
                Você nunca fica refém da máquina. Pela **Central de Mensagens** do Velo, sua equipe acompanha todos os chats em tempo real. Se o barbeiro ou a recepção digitar uma resposta, a Inteligência Artificial entra em pausa imediata para não atrapalhar o atendimento humano.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Pausa Automática por Intervenção:</strong> Ao responder pelo painel, a IA é silenciada para aquele cliente sem necessidade de configurações extras.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Retomada Inteligente:</strong> A IA volta a responder automaticamente após um período de inatividade configurável, garantindo que o cliente nunca fique sem resposta de madrugada.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Histórico e Cadastro Centralizados:</strong> Cada conversa fica vinculada ao perfil do cliente, extrato de fidelidade e histórico de visitas.
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                  <Link href="/admin/mensagens">
                    Abrir Central de Mensagens (/admin/mensagens) <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Mockup do Transbordo no Painel */}
            <div className="w-full lg:w-1/2">
              <div className="rounded-3xl p-6 bg-zinc-900/60 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h4 className="text-base font-bold text-white">Central de Atendimento Unificada</h4>
                    <p className="text-xs text-zinc-400">Controle de automação e transbordo humano</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    Sistema Operando
                  </span>
                </div>

                {/* Card de Configuração de Status do Chat */}
                <div className="p-4 rounded-2xl bg-zinc-800/60 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Status do Atendente IA</div>
                        <div className="text-xs text-zinc-400">Atendimento ativo neste contato</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                      Ativo
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 text-xs text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>Timeout de Retomada:</span>
                    </span>
                    <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">4 horas de inatividade</span>
                  </div>
                </div>

                {/* Prévia de Conversa no Painel do Barbeiro */}
                <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2.5 text-xs">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Última Interação</div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                    <span className="text-emerald-400 font-bold block mb-0.5">Gabriel (Cliente VIP)</span>
                    "Vocês ainda tem aquela pomada modeladora matte?"
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Assumir e Responder
                    </Button>
                    <span className="text-[11px] text-zinc-500">IA silenciará automaticamente</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── PILARES OPERACIONAIS DO VELO ── */}
      <section id="recursos" className="py-24 bg-zinc-900/30 relative border-b border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Operação Completa</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-6">Tudo o que sua barbearia precisa em harmonia.</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Cada módulo foi desenvolvido para eliminar o retrabalho, evitar perdas financeiras e fidelizar seu cliente final.
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
                  Esqueça as anotações no caderno ou conflitos de horário. Além da IA no WhatsApp, o Velo conta com portal online de agendamento e painel de TV exclusivo para o salão acompanhar os cortes do dia em tempo real.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Painel de TV para recepção e salão com fila de atendimento em tempo real.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Clientes com plano de assinatura agendam sem cobrança adicional.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Permissões flexíveis: o barbeiro pode visualizar somente os próprios agendamentos.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild variant="outline" className="rounded-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                    <Link href="/schedule">Ver Grade da Agenda (/schedule) →</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/60 rounded-3xl p-6 border border-white/5 shadow-2xl">
                <div className="rounded-2xl bg-zinc-950/80 p-5 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-bold text-white">Visão da Agenda de Hoje</span>
                    </div>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full font-semibold">12 Agendamentos</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
                      <div>
                        <span className="text-xs font-bold text-white block">Rodrigo Alves</span>
                        <span className="text-[11px] text-zinc-400">Corte Degrade • com Lucas</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">09:30 - Confirmado</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
                      <div>
                        <span className="text-xs font-bold text-white block">Marcos Vinícius</span>
                        <span className="text-[11px] text-zinc-400">Barba Completa • com Rafael</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-500/20 text-amber-400">10:15 - Em Atendimento</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
                      <div>
                        <span className="text-xs font-bold text-white block">Felipe Santos</span>
                        <span className="text-[11px] text-zinc-400">Combo Cabelo + Sobrancelha</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-500/20 text-purple-400">Assinante Clube</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Finanças e Comissões */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-100">Fim da matemática de fim de mês</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Chega de fechar o caixa na ponta do lápis ou correr o risco de pagar comissão errada. No Velo, assim que um serviço é concluído, o sistema calcula o rateio, deduz custos de produtos e credita a comissão no extrato virtual do profissional.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Rateio automático e extrato transparente individual para cada barbeiro.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">DRE em tempo real: saiba seu faturamento bruto, custos operacionais e margem líquida.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Configuração de comissões diferenciadas por serviço e por profissional.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild variant="outline" className="rounded-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                    <Link href="/financial-report">Ver DRE Financeiro (/financial-report) →</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/60 rounded-3xl p-6 border border-white/5 shadow-2xl">
                <div className="rounded-2xl bg-zinc-950/80 p-5 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-sm font-bold text-white">Extrato Operacional da Barbearia</span>
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold">Tempo Real</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                      <span className="text-xs text-zinc-400 block">Faturamento Bruto</span>
                      <span className="text-xl font-bold text-emerald-400">R$ 18.450,00</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                      <span className="text-xs text-zinc-400 block">Comissões Devidas</span>
                      <span className="text-xl font-bold text-zinc-200">R$ 7.380,00</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/90 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Lucro Líquido da Casa</span>
                      <span className="text-[11px] text-zinc-400">Já descontadas comissões e taxas</span>
                    </div>
                    <span className="text-lg font-black text-emerald-400">R$ 11.070,00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Clube de Assinaturas */}
            <div className="flex flex-col md:flex-row items-center gap-12 group">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-100">Clube de Assinaturas (Receita Previsível)</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Transforme seu faturamento de uma montanha-russa para uma receita recorrente garantida no primeiro dia do mês. Crie planos de mensalidade onde o cliente tem cortes livres ou pacotes fechados. O sistema gerencia toda a recorrência.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Repasse Inteligente: pague comissão justa sem queimar o lucro do plano.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Dashboard de Saúde do Plano para acompanhar taxa de uso e retenção.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Cobrança e renovação automática de faturas todo mês.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild variant="outline" className="rounded-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                    <Link href="/club">Configurar Planos do Clube (/club) →</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/60 rounded-3xl p-6 border border-white/5 shadow-2xl">
                <div className="rounded-2xl bg-zinc-950/80 p-5 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-sm font-bold text-white">Métricas de Assinantes Ativos</span>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-semibold">MRR em Alta</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-purple-200 block">Receita Recorrente Mensal (MRR)</span>
                      <span className="text-2xl font-black text-white">R$ 9.890,00</span>
                    </div>
                    <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full">+18% este mês</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block">Assinantes Ativos</span>
                      <span className="font-bold text-white text-base">94 membros</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block">Churn Mensal</span>
                      <span className="font-bold text-emerald-400 text-base">1.8% (Baixo)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Fidelidade e Cashback */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Award className="w-7 h-7 text-pink-400" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-100">Fidelize e pare de perder clientes (Cashback)</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Sabe aquele cliente que marca horário e não aparece, deixando sua cadeira vazia? O programa de fidelidade do Velo premia quem é pontual e desconta pontos de quem dá "furo", educando sua base de forma inteligente.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Pontos injetados na conta do cliente automaticamente a cada serviço concluído.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Penalidade automática por falta injustificada (No-Show), protegendo seu faturamento.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">Resgate simplificado: o próprio cliente ou a recepção abatem o valor no checkout.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild variant="outline" className="rounded-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10">
                    <Link href="/rewards">Gerenciar Regras de Fidelidade (/rewards) →</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-1/2 bg-zinc-900/60 rounded-3xl p-6 border border-white/5 shadow-2xl">
                <div className="rounded-2xl bg-zinc-950/80 p-5 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-sm font-bold text-white">Cartão Fidelidade do Cliente</span>
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded font-semibold">Integrado</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-pink-500/30 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Cliente VIP</span>
                      <span className="text-xs font-bold text-pink-400">Nível Diamante</span>
                    </div>
                    <div className="text-3xl font-black text-white">450 <span className="text-sm font-normal text-zinc-400">pontos</span></div>
                    <div className="text-xs text-zinc-300 flex items-center justify-between pt-1 border-t border-zinc-800">
                      <span>Equivale a: <strong>R$ 45,00 em descontos</strong></span>
                      <span className="text-emerald-400 font-semibold">100% Presença</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ATALHOS RÁPIDOS PARA O DONO ── */}
      <section id="atalhos" className="py-20 bg-zinc-950 relative border-b border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Acesse as ferramentas do seu Studio</h2>
            <p className="text-zinc-400 mt-2">Navegue diretamente para qualquer área do sistema com um clique:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Link 
              href="/schedule" 
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-blue-500/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">Agenda e Grade de Horários</h4>
              <p className="text-xs text-zinc-400 mt-1">Veja os agendamentos do dia e gerencie a equipe de barbeiros.</p>
            </Link>

            <Link 
              href="/admin/mensagens" 
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-emerald-500/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">Central de Mensagens & IA</h4>
              <p className="text-xs text-zinc-400 mt-1">Acompanhe chats do WhatsApp e assuma atendimentos com 1 clique.</p>
            </Link>

            <Link 
              href="/financial-report" 
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-amber-500/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">Relatórios e Fechamento de Caixa</h4>
              <p className="text-xs text-zinc-400 mt-1">DRE automatizado, cálculo de comissões e margens líquidas.</p>
            </Link>

            <Link 
              href="/club" 
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-purple-500/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">Clube de Assinaturas</h4>
              <p className="text-xs text-zinc-400 mt-1">Configure planos mensais e garanta faturamento recorrente garantido.</p>
            </Link>

            <Link 
              href="/rewards" 
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-pink-500/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-pink-400 transition-colors">Programa de Fidelidade</h4>
              <p className="text-xs text-zinc-400 mt-1">Regras de pontuação, cashback e penalidades para faltas (No-Show).</p>
            </Link>

            <Link 
              href="/spec" 
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-teal-500/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-teal-400 transition-colors">Manual de Especificações Técnicas</h4>
              <p className="text-xs text-zinc-400 mt-1">Entenda em detalhes cada regra de negócio e cálculo do Velo.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER / CTA FINAL ── */}
      <footer className="py-20 relative bg-zinc-950">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-6">
            <Sparkles className="w-6 h-6 text-zinc-950" />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Pronto para acelerar sua barbearia?</h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Mais controle, mais previsibilidade e clientes atendidos 24 horas por dia. Acesse seu painel agora mesmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="h-16 px-10 text-lg font-bold rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 transition-all hover:scale-105">
              <Link href="/dashboard">Acessar Painel do Studio</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-16 px-8 text-base font-semibold rounded-full border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-white">
              <Link href="/">Ir para a Recepção (Home)</Link>
            </Button>
          </div>
          <div className="mt-14 pt-8 border-t border-white/5 text-xs text-zinc-500">
            © {new Date().getFullYear()} Velo Software. Todos os direitos reservados.
          </div>
        </div>
      </footer>
      
    </div>
  );
}
