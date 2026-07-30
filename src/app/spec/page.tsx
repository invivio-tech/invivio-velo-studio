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
  Settings
} from 'lucide-react';

type ModuleKey = 'overview' | 'agenda' | 'finance' | 'club' | 'pos' | 'loyalty' | 'tenant';

export default function DetailedSpecAboutPage() {
  const [activeTab, setActiveTab] = useState<ModuleKey>('overview');

  const menuItems = [
    { id: 'overview', label: 'Visão Geral (Arquitetura)', icon: BookOpen, color: 'text-emerald-400 bg-emerald-500/10' },
    { id: 'agenda', label: 'Agenda & Fluxo Operacional', icon: Calendar, color: 'text-blue-400 bg-blue-500/10' },
    { id: 'finance', label: 'Engenharia Financeira (ERP)', icon: DollarSign, color: 'text-amber-400 bg-amber-500/10' },
    { id: 'club', label: 'Assinaturas (MRR & Lógica)', icon: Activity, color: 'text-purple-400 bg-purple-500/10' },
    { id: 'pos', label: 'PDV & Controle de Estoque', icon: ShoppingBag, color: 'text-rose-400 bg-rose-500/10' },
    { id: 'loyalty', label: 'Gamificação & Marketing', icon: Award, color: 'text-pink-400 bg-pink-500/10' },
    { id: 'tenant', label: 'Painel Admin (Multi-Tenant)', icon: Shield, color: 'text-indigo-400 bg-indigo-500/10' },
  ] as const;

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
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">Manual de Especificações v2.0</span>
          </div>
          <div>
            <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 pt-32 pb-24">
        
        {/* HERO INTRO */}
        <div className="max-w-4xl mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Documentação Profunda do Sistema
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Especificações, Arquitetura &<br />Regras de Negócio
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Esta página serve como a "Bíblia" do Invivio Velo. Abaixo você encontra as diretrizes de código, a modelagem de banco de dados no Firestore e as engenharias financeiras complexas que garantem que o sistema opere livre de gargalos transacionais, suportando operações de alto volume.
          </p>
        </div>

        {/* INTERACTIVE SPECIFICATION SECTION */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="lg:col-span-4 space-y-2 bg-zinc-900/40 p-4 rounded-3xl border border-white/5 backdrop-blur-sm">
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500 px-3 mb-4">Módulos Profundos</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all ${
                    isActive 
                      ? 'bg-zinc-800 text-white shadow-lg border border-white/5' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90 text-zinc-300' : 'text-zinc-600'}`} />
                </button>
              );
            })}
          </div>

          {/* DYNAMIC CONTENT AREA */}
          <div className="lg:col-span-8 bg-zinc-900/20 border border-white/5 rounded-3xl p-8 min-h-[600px] backdrop-blur-sm animate-in fade-in duration-300">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                  <BookOpen className="w-6 h-6" /> Visão Geral do Ecossistema
                </h2>
                <p className="text-zinc-300 leading-relaxed text-justify">
                  O Invivio Velo não é um simples "caderninho digital". Trata-se de um ERP (Enterprise Resource Planning) verticalizado para o setor de beleza e bem-estar. A arquitetura foi desenvolvida utilizando Next.js (App Router) no front-end e Firebase Firestore no back-end, adotando princípios pesados de **denormalização de dados** para garantir buscas rápidas (O(1) ou queries diretas).
                </p>
                <p className="text-zinc-300 leading-relaxed text-justify">
                  Sempre que um agendamento é salvo na coleção `appointments`, ele já leva consigo strings estáticas como o nome do profissional (`professionalName`), nome do serviço (`serviceName`) e preço no momento do agendamento (`servicePrice`). Isso evita que os relatórios financeiros tenham que executar "JOINs" caros entre a coleção de agendamentos e a coleção de usuários para descobrir qual era a comissão vigente ou quem executou o serviço.
                </p>
                
                <div className="mt-8 border-t border-white/5 pt-6">
                  <h3 className="font-bold text-zinc-200 mb-4">Princípios Fundamentais Implementados</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                      <h4 className="text-emerald-400 font-semibold mb-2">1. Imutabilidade Transacional</h4>
                      <p className="text-sm text-zinc-400">Em operações críticas (como fechamento de conta ou geração de fatura de assinatura), o sistema utiliza o `runTransaction` do Firebase para garantir que pontuações de fidelidade e comissões sejam calculadas e gravadas no banco simultaneamente, prevenindo inconsistências em caso de queda de rede.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                      <h4 className="text-emerald-400 font-semibold mb-2">2. Single Page de Autoatendimento</h4>
                      <p className="text-sm text-zinc-400">Fluxos desenhados para não causarem "choque de estado". A tela `/agendar` valida os horários do profissional consultando o banco em tempo real antes de prosseguir a etapa de confirmação, mitigando agendamentos duplos na mesma janela de 30 minutos.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AGENDA & APPOINTMENTS */}
            {activeTab === 'agenda' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <Calendar className="w-6 h-6" /> Agenda & Fluxo Operacional
                </h2>
                <p className="text-zinc-300 text-justify">
                  A espinha dorsal operacional da barbearia. O Velo separa a visualização do agendamento em múltiplas interfaces (Dashboard de Recepção, Visão de Profissional e Painel de TV) que consomem a mesma coleção de dados (`appointments`), garantindo total sincronia.
                </p>
                
                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Comportamento Dinâmico de Escala (`/schedule`)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      A visualização principal gera colunas iteráveis baseadas na carga de `users` com o `role: professional`. O sistema varre todos os agendamentos do dia ativo e os aloca visualmente respeitando o timestamp. 
                      Para profissionais logados (`useAuth`), o sistema impõe filtros rígidos: eles só conseguem enxergar a própria coluna e o botão "Novo Agendamento" é bloqueado para horários já comprometidos, gerindo o "overbooking".
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Polling e Websockets no Painel TV (`/agenda-view`)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      O painel desenhado para ficar rodando em uma Smart TV na barbearia consulta o Firebase utilizando `onSnapshot`, ou seja, qualquer cliente que agenda do celular, atualiza a tela da TV da barbearia em menos de 100 milissegundos. Além de exibir status, esta tela possui ações transacionais rápidas (Dar baixa, Marcar Falta).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Injeção Inteligente de Assinaturas no Checkout</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      Quando a rota `/book-appointment` detecta que o cliente atrelado possui um `activeMembership` válido, ela verifica a propriedade `includedServiceIds` do plano. Se houver *match*, o formulário sobreescreve a entidade: a flag `isSubscriptionUsage = true` é injetada, o `servicePrice` é forçado a `0`, e a inteligência percentual de comissão já injeta o `commissionBaseValue` baseada no preço integral.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FINANCE & COMMISSIONS */}
            {activeTab === 'finance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                  <DollarSign className="w-6 h-6" /> Engenharia Financeira (ERP)
                </h2>
                <p className="text-zinc-300 text-justify">
                  É aqui que o Invivio Velo brilha. Para não corromper relatórios financeiros no longo prazo devido a ajustes salariais ou tabelas de preços, o sistema executa um "congelamento de estado", técnica fundamental em sistemas contábeis avançados (ERPs).
                </p>

                <div className="space-y-6 mt-6">
                  <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20">
                    <h4 className="font-bold text-amber-400 mb-3">O Algoritmo de Congelamento de Comissões</h4>
                    <p className="text-sm text-zinc-300 text-justify leading-relaxed mb-4">
                      Em sistemas amadores, a comissão de um mês passado é calculada pegando a % atual do barbeiro vezes o valor do serviço. Mas, e se a % dele aumentar amanhã? Todos os gráficos dos meses anteriores mudariam retroativamente.
                    </p>
                    <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
                      <li>O Velo possui uma <strong>Transaction Firestore</strong> amarrada ao botão "Concluir Serviço".</li>
                      <li>Neste milissegundo, ele intercepta a porcentagem customizada real do barbeiro naquele dia (`commissionPercentageVigente`).</li>
                      <li>Ele faz o cálculo absoluto financeiro (Ex: 50% de R$60 = R$30) e injeta esse valor bruto diretamente na ficha do agendamento (campo `commissionAmount`).</li>
                      <li>Todas as telas de DRE (`/financial-report`) e Faturas (`/invoices`) abandonam os cálculos de multiplicação e simplesmente rodam um <code>reduce()</code> somando o <code>commissionAmount</code> já garantido, protegendo as estatísticas do passado perpetuamente.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Rateio em Tempo Real e DRE Completo</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      O relatório financeiro consolida três vetores independentes: (1) O saldo das comissões devidas vs saques já solicitados pelos profissionais. (2) A venda direta de produtos no balcão (`orders`), que conta como entrada de capital imediato. (3) O MRR faturado pelas faturas de assinaturas (`membershipInvoices`) no período. Com isso, o estúdio possui clareza sobre o verdadeiro <strong>Lucro Líquido Operacional</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MEMBERSHIP CLUB */}
            {activeTab === 'club' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <Activity className="w-6 h-6" /> Assinaturas (MRR & Lógica)
                </h2>
                <p className="text-zinc-300 text-justify">
                  O módulo mais lucrativo do sistema. Transformar a volatilidade das cadeiras de um salão em um fluxo de caixa previsível e recorrente (MRR - Monthly Recurring Revenue).
                </p>

                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Percentual Fixo de Repasse (A Margem Segura)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      Como um corte no clube não tem pagamento na hora, a barbearia precisava de uma forma segura de repassar a comissão ao barbeiro sem ficar no prejuízo. Para isso, o admin configura o <code>commissionRepassPercentage</code> no plano (ex: 70%). Quando o cliente corta o cabelo (Valor Real R$50), o sistema calcula 70% deste valor (R$35) e o barbeiro tira a sua comissão (ex: 50%) em cima de R$35, garantindo que o custo de execução nunca exceda a fatura paga pelo cliente.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Saúde do Plano (Unit Economics)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      A janela interativa <code>PlanHealthDialog</code> analisa dinamicamente cada plano cruzando os <code>appointments</code> filtrados por <code>subscriptionPlanId</code> (Custo de Execução/Uso) contra os <code>membershipInvoices</code> pagos (Receita Arrecadada) naquele mês. Esse diagnóstico devolve a "Margem Bruta", categorizando a saúde do plano como Excelente (&gt; 50%), Saudável (&gt; 20%), Alerta (&gt; 0%) ou Prejuízo (quando os assinantes usaram mais do que o valor do plano sustenta).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Processamento de Faturas e Ciclo de Uso</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      O ciclo de cada assinante possui limites (`maxUsesPerMonth`). Cada agendamento detectado no mês reduz a franquia do usuário. As faturas são geradas e devem ser sinalizadas como pagas para que a flag `status: active` no perfil do assinante seja mantida; caso contrário, os 100% de desconto são revogados automaticamente pela inteligência de agendamento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* POS & INVENTORY */}
            {activeTab === 'pos' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-rose-400 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6" /> PDV & Controle de Estoque
                </h2>
                <p className="text-zinc-300 text-justify">
                  O módulo de Ponto de Venda (`/orders`) atua isolado da esteira de serviços para garantir agilidade no balcão (venda de pomadas, minoxidil, cervejas, etc.).
                </p>

                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Entidade `Order` vs `Appointment`</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      Enquanto atendimentos lidam com agendamentos de tempo e agendas de funcionários, o módulo POS lida com a coleção `orders`. Um pedido carrega uma matriz de `items` (com preço e quantidade). O caixa pode engatar múltiplos produtos e gerar um pagamento instantâneo.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Gatilhos de Baixa de Estoque</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      Atualmente projetado para abater automaticamente as unidades do inventário central assim que a `Order` é despachada como `completed` ou `paid`. Esse estoque abastece também a tela de catálogo visual `/store`, bloqueando itens esgotados e orientando a equipe em compras de reposição através do Dashboard de Vendas (`/sales-dashboard`).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* LOYALTY & CRM */}
            {activeTab === 'loyalty' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                  <Award className="w-6 h-6" /> Gamificação & Marketing
                </h2>
                <p className="text-zinc-300 text-justify">
                  Sistemas complexos de acúmulo financeiro para estimular a retenção extrema da base de clientes e punir gargalos na agenda.
                </p>

                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Matemática de Loyalty (Pontos Base)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      A regra contábil é definida globalmente (ex: `loyaltyPercentage = 5%`). Se o cliente consome um serviço de R$ 100,00, a transação converte esse cashback em pontos (1 Ponto = R$ 1,00 gasto), depositando no documento do usuário em `users -&gt; loyaltyPoints`.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">A Tática de "Loss Aversion" (No-Show)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      O Velo incorpora penalidades comportamentais ao negócio. Se a recepcionista ou o profissional marcar o status de um serviço como `no-show` (o cliente faltou sem avisar e deixou buraco na cadeira), o sistema debita do histórico do cliente os pontos previamente acumulados usando o parâmetro `pointsPenaltyForNoShow`. Isso educa a base e aumenta o comprometimento no comparecimento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SAAS PANELS */}
            {activeTab === 'tenant' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-2">
                  <Shield className="w-6 h-6" /> Painel SaaS (Multi-Tenant)
                </h2>
                <p className="text-zinc-300 text-justify">
                  O projeto Admin do Velo (`velo-admin`) garante o isolamento de instâncias corporativas (Tenants) para gerenciar centenas de barbearias distintas no mesmo cluster.
                </p>

                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Provisionamento de Banco Automático (Onboarding)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      Quando uma nova barbearia fecha contrato, a rota `/new-client` não cria apenas um login, mas engatilha a injeção completa de esqueleto: cria as Rules (Regras de Segurança) e injeta as coleções bases (`services`, `categories`, `establishment_settings`, etc.).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2">Logs Isolados (`/audit`)</h4>
                    <p className="text-sm text-zinc-400 text-justify leading-relaxed">
                      A estrutura garante que os administradores da Invivio Tecnologia possam auditar bugs de permissão e erros de acesso rodando em silos (cada cliente tem seus dados isolados pelas roles de Firebase Rules), suportando a expansão B2B do sistema sem risco de vazamento cruzado.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* CTA FOOTER */}
      <section className="py-20 border-t border-white/5 relative">
        <div className="absolute inset-0 bg-emerald-500/5" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">Pronto para retornar à gestão?</h2>
          <p className="text-zinc-400 text-sm mb-8">
            Todas as regras e arquiteturas listadas acima estão ativamente blindando os dados do seu estúdio.
          </p>
          <Button size="lg" asChild className="h-14 px-8 text-base font-semibold rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 transition-all hover:scale-105">
            <Link href="/">Voltar ao Dashboard Operacional</Link>
          </Button>
        </div>
      </section>
      
    </div>
  );
}
