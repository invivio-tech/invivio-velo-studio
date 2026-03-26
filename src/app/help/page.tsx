'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HelpCircle, Mail, Phone, ArrowRight, MessageCircle, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HelpPage() {
  const faqs = [
    {
      title: 'Como agendar um serviço?',
      content: 'Basta escolher o profissional desejado, o serviço e selecionar um horário disponível no calendário. Você receberá uma confirmação instantânea.'
    },
    {
      title: 'Esqueci minha senha, o que fazer?',
      content: 'Na página de login, clique em "Esqueci minha senha". Enviaremos um link de redefinição para o seu e-mail cadastrado.'
    },
    {
      title: 'Como cancelar um agendamento?',
      content: 'Acesse "Meus Agendamentos" no menu lateral, localize o compromisso que deseja cancelar e clique no botão correspondente.'
    },
    {
      title: 'Quais formas de pagamento são aceitas?',
      content: 'As formas de pagamento variam por estabelecimento. Geralmente são aceitos cartões, PIX e dinheiro diretamente no balcão.'
    }
  ];

  return (
    <div className="flex-1 space-y-10 p-8 pt-6 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground">Central de Ajuda</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Tire suas dúvidas, aprenda a usar as funcionalidades ou entre em contato com o suporte.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Primeiros Passos
            </CardTitle>
            <CardDescription className="text-slate-400">Dicas rápidas para começar a usar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/10">
              <div className="p-2 bg-primary/20 text-primary rounded text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-medium">Complete seu Perfil</p>
                <p className="text-xs text-muted-foreground">Adicione seu nome e telefone para agendamentos rápidos.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/10">
              <div className="p-2 bg-primary/20 text-primary rounded text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-medium">Explore os Serviços</p>
                <p className="text-xs text-muted-foreground">Veja a lista completa de profissionais e valores.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/10">
              <div className="p-2 bg-primary/20 text-primary rounded text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-medium">Agende em Segundos</p>
                <p className="text-xs text-muted-foreground">Escolha a data e horário que melhor se adapta a você.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertCircle className="h-5 w-5 text-primary" /> Problemas Comuns
            </CardTitle>
            <CardDescription className="text-slate-400">Soluções para dificuldades frequentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-1">Dificuldade em visualizar horários?</p>
              <p className="text-xs text-muted-foreground">Certifique-se de que selecionou o serviço e o profissional corretamente.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">E-mail de confirmação não chegou?</p>
              <p className="text-xs text-muted-foreground">Verifique sua caixa de spam ou lixo eletrônico.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">App não carrega?</p>
              <p className="text-xs text-muted-foreground">Limpe o cache do seu navegador ou tente uma aba anônima.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Perguntas Frequentes (FAQ)</h2>
        <div className="grid gap-4">
          {faqs.map((faq, index) => (
            <div key={index} className="p-5 border border-border/10 rounded-2xl bg-card/50 hover:bg-card/80 transition-all cursor-default group">
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="h-4 w-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="font-bold text-lg">{faq.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-7">{faq.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 border-2 border-dashed border-border/20 rounded-3xl bg-primary/5 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Ainda precisa de ajuda?</h2>
          <p className="text-muted-foreground">Nossa equipe de suporte está pronta para te atender.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild variant="outline" className="gap-2 bg-card/50">
            <Link href="mailto:invivio.tech@gmail.com">
              <Mail className="h-4 w-4" />
              E-mail
            </Link>
          </Button>
          <Button asChild variant="default" className="gap-2">
            <Link href="https://wa.me/5511988047106">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
