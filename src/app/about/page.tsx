'use client';

import { 
  BarberPoleIcon 
} from '@/components/icons/barber-pole-icon';
import { 
  Calendar, 
  ShoppingBag, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  Scissors, 
  Zap,
  ArrowRight,
  ChevronRight,
  Package,
  Layers,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative py-20 px-4 md:px-8 border-b bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20 animate-fade-in">
            <Sparkles className="w-4 h-4" /> Versão 1.0 "Velo" Premium
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
            O Futuro da sua <span className="text-primary italic">Barbearia</span>, <br />
            em um só lugar.
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Uma plataforma completa que une a tradição da barbearia com a tecnologia de ponta, 
            proporcionando uma experiência inigualável para clientes e uma gestão poderosa para administradores.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-16 space-y-24">
        
        {/* ─── Seção 1: Gestão de Serviços ─────────────────────────── */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <Badge variant="outline" className="px-3 py-1 font-semibold uppercase tracking-wider text-[10px] text-primary border-primary/30">Experiência do Salão</Badge>
              <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                <Scissors className="text-primary h-8 w-8" /> Gestão de Serviços
              </h2>
              <p className="text-muted-foreground max-w-xl">Agendamentos rápidos, profissionais qualificados e um sistema de fidelidade que valoriza cada visita.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Calendar className="w-6 h-6" />}
              title="Agendamento Inteligente"
              description="Escolha de serviços, seleção de profissionais e visualização de horários livres em tempo real com confirmação imediata."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Gestão de Equipe"
              description="Painel específico para cada barbeiro visualizar sua produção, gerenciar sua agenda e acompanhar comissões."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6" />}
              title="Programa de Fidelidade"
              description="Acúmulo automático de pontos por atendimentos concluídos, trocáveis por descontos ou serviços gratuitos."
            />
          </div>
        </section>

        {/* ─── Seção 2: Loja Premium ───────────────────────────────── */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <Badge variant="outline" className="px-3 py-1 font-semibold uppercase tracking-wider text-[10px] text-secondary border-secondary/30">Vendas e Produtos</Badge>
              <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                <ShoppingBag className="text-secondary h-8 w-8" /> Loja Premium & E-commerce
              </h2>
              <p className="text-muted-foreground max-w-xl">Leve a barbearia para casa com uma vitrine moderna de produtos profissionais e reserva online inteligente.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              variant="secondary"
              icon={<Package className="w-6 h-6" />}
              title="Vitrine Digital"
              description="Catálogo de produtos elegante com filtros por categoria e busca otimizada."
            />
            <FeatureCard 
              variant="secondary"
              icon={<ChevronRight className="w-6 h-6" />}
              title="Reserva e Retirada"
              description="Clientes reservam produtos online e realizam o pagamento/retirada no balcão da barbearia."
            />
            <FeatureCard 
              variant="secondary"
              icon={<Layers className="w-6 h-6" />}
              title="Gestão de Estoque"
              description="Controle rigoroso de unidades disponíveis com baixa automática no momento da retirada."
            />
            <FeatureCard 
              variant="secondary"
              icon={<Sparkles className="w-6 h-6" />}
              title="IA de Produto"
              description="Geração automática de descrições comerciais persuasivas utilizando Inteligência Artificial."
            />
          </div>
        </section>

        {/* ─── Seção 3: Administração e Inteligência ─────────────────── */}
        <section className="relative p-8 md:p-12 rounded-[2rem] border bg-muted/30 overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <BarberPoleIcon className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-headline font-bold">Inteligência de Negócio</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nossa retaguarda foi projetada para dar ao administrador total controle financeiro e operacional. 
                Decisões baseadas em dados reais de faturamento de serviços e loja.
              </p>
              
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-primary/20 p-1 rounded-full"><TrendingUp className="w-4 h-4 text-primary" /></div>
                  <div>
                    <span className="font-bold">Dashboard Multi-Receita:</span> Visão separada de faturamento por profissionais e vendas da loja.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-primary/20 p-1 rounded-full"><FileText className="w-4 h-4 text-primary" /></div>
                  <div>
                    <span className="font-bold">Relatório Financeiro:</span> Extrato mensal de entradas com integração total de pedidos e serviços concluídos.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-primary/20 p-1 rounded-full"><ShieldCheck className="w-4 h-4 text-primary" /></div>
                  <div>
                    <span className="font-bold">Gestão de Invoices:</span> Controle de pagamentos, balanços e acerto de contas com a equipe.
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-4">
                 <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <span className="text-3xl font-bold text-primary">100%</span>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Integrado</p>
                 </div>
                 <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg shadow-primary/20">
                    <span className="text-3xl font-bold">IA</span>
                    <p className="text-xs opacity-70 uppercase font-bold tracking-tighter">Nativa</p>
                 </div>
               </div>
               <div className="pt-8 space-y-4">
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <span className="text-3xl font-bold text-foreground">Cloud</span>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Firebase Infrastructure</p>
                 </div>
                 <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <span className="text-xl font-bold">Segurança</span>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">RBCA Access</p>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* ─── Rodapé da Página ────────────────────────────────────── */}
        <section className="text-center py-12 border-t">
          <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
            Desenvolvido pela <span className="text-primary font-bold">Invivio Tecnologia</span> • v1.00056
          </p>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  variant = 'primary' 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string,
  variant?: 'primary' | 'secondary'
}) {
  const iconColor = variant === 'primary' ? 'text-primary' : 'text-secondary';
  const bgColor = variant === 'primary' ? 'bg-primary/5' : 'bg-secondary/5';
  
  return (
    <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 group hover:shadow-xl hover:shadow-primary/5">
      <CardContent className="pt-8">
        <div className={`w-12 h-12 rounded-xl ${bgColor} ${iconColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="font-headline font-bold text-lg mb-3">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
