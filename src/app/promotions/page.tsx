'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  generatePromotionalOffers,
  analyzeBusinessData,
  type PromotionalOfferOutput,
} from '@/ai/flows/generate-promotional-offers';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Gift,
  Lightbulb,
  Loader2,
  Sparkles,
  Bell,
  Send,
  Megaphone,
  Clock,
  ChevronRight,
  Rocket,
  Calendar,
  History,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  serviceCatalog: z
    .string()
    .min(50, { message: 'Por favor, detalhe mais seus serviços.' }),
  customerHistory: z
    .string()
    .min(50, { message: 'Por favor, detalhe mais o histórico de clientes.' }),
  currentPromotions: z.string().optional(),
});

interface CampaignLog {
  id: string;
  offer: string;
  launchTimeSuggestion: string;
  reasoning: string;
  pushTitle: string;
  pushBody: string;
  createdAt: any;
}

interface PushLog {
  id: string;
  title: string;
  body: string;
  createdAt: any;
  scheduledFor: any | null;
  status: 'sent' | 'pending' | 'failed';
  sentCount: number;
  failureCount: number;
  note?: string;
}

export default function PromotionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [result, setResult] = useState<PromotionalOfferOutput | null>(null);
  const { toast } = useToast();

  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  
  // Scheduling states
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledTime, setScheduledTime] = useState('');

  // Firestore Queries for History
  const firestore = useFirestore();

  const campaignsQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'campaigns'),
      orderBy('createdAt', 'desc'),
      limit(5)
    ) : null
  , [firestore]);

  const pushLogsQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'pushLogs'),
      orderBy('createdAt', 'desc'),
      limit(5)
    ) : null
  , [firestore]);

  const { data: campaignHistory, isLoading: isCampaignsHistoryLoading } = useCollection<CampaignLog>(campaignsQuery);
  const { data: pushHistory, isLoading: isPushHistoryLoading } = useCollection<PushLog>(pushLogsQuery);

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) return;

    if (scheduleMode === 'later' && !scheduledTime) {
      toast({
        variant: 'destructive',
        title: 'Data Necessária',
        description: 'Por favor, selecione uma data e hora para o agendamento.',
      });
      return;
    }

    setIsSendingPush(true);
    try {
      const payload: any = { 
        title: pushTitle, 
        body: pushBody 
      };

      if (scheduleMode === 'later') {
        payload.scheduledFor = new Date(scheduledTime).toISOString();
      }

      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao processar a notificação');

      if (payload.scheduledFor) {
        toast({
          title: 'Agendamento Concluído! 📅',
          description: `Disparo agendado com sucesso para ${format(new Date(scheduledTime), "dd/MM 'às' HH:mm", { locale: ptBR })}.`,
        });
      } else {
        toast({
          title: 'Disparo Concluído! 🚀',
          description: `Mensagem enviada para ${data.sentCount} dispositivos.`,
        });
      }
      setPushTitle('');
      setPushBody('');
      setScheduledTime('');
      setScheduleMode('now');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Operação',
        description: error.message || 'Houve um problema ao processar o envio.',
      });
    } finally {
      setIsSendingPush(false);
    }
  };

  const handleAnalyzeBusiness = async () => {
    setIsAnalyzing(true);
    try {
      const data = await analyzeBusinessData();

      if (data.error) {
        toast({
          variant: 'destructive',
          title: 'Erro na Análise (Diagnóstico)',
          description: data.error,
        });
        return;
      }

      form.setValue('serviceCatalog', data.serviceCatalog);
      form.setValue('customerHistory', data.customerHistory);
      toast({
        title: 'Análise Concluída! 📊',
        description: 'Catálogo e comportamento preenchidos com dados reais.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Análise',
        description: error.message || 'Não foi possível buscar as informações.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceCatalog:
        'Corte Clássico - R$50, Aparo de Barba - R$35, Barba com Toalha Quente - R$40. Também vendemos pomada para cabelo e óleo para barba.',
      customerHistory:
        'A maioria dos clientes são regulares que vêm a cada 3-4 semanas para um corte. Clientes mais jovens (20-30 anos) frequentemente também aparam a barba. Vemos uma queda nos agendamentos no meio da semana (terça, quarta).',
      currentPromotions: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const output = await generatePromotionalOffers(values);
      setResult(output);
      
      // Pre-fill push form with AI suggestion
      if (output.pushTitle) setPushTitle(output.pushTitle);
      if (output.pushBody) setPushBody(output.pushBody);
      
      toast({
        title: 'Campanha Gerada e Salva! 🌟',
        description: 'A oferta e a sugestão de push foram gravadas no histórico.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ocorreu um erro',
        description: 'Falha ao gerar oferta. Por favor, tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Format firestore timestamps helper
  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-secondary/10">
            <Megaphone className="h-7 w-7 text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">
              Central de Marketing
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Crie campanhas inteligentes com IA, agende lançamentos estratégicos e dispare notificações.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout: 2 columns */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* LEFT: Input Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-base">
                    Contexto do Negócio
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Dados reais ou manuais para a IA criar a campanha.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/5 text-xs h-8 px-3 shrink-0"
                  onClick={handleAnalyzeBusiness}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Preencher com IA
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="serviceCatalog"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Catálogo de Serviços
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="ex: Corte Clássico - R$50, Aparo de Barba - R$35..."
                            className="h-24 text-sm resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Comportamento dos Clientes
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="ex: Clientes regulares a cada 3-4 semanas. Queda de movimento às quartas..."
                            className="h-24 text-sm resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentPromotions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Promoções Ativas{' '}
                          <span className="normal-case font-normal text-muted-foreground/60">
                            (opcional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="ex: 10% de desconto para novos clientes."
                            className="h-16 text-sm resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando campanha...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Gerar Campanha com IA
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Results + Push */}
        <div className="lg:col-span-3 space-y-4">

          {/* AI Campaign Result */}
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-16 w-full mt-2" />
              </CardContent>
            </Card>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              {/* Offer Card */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Gift className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-base">Oferta Gerada</CardTitle>
                    <Badge variant="secondary" className="ml-auto text-xs">Pronta para disparar</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-base font-semibold leading-relaxed">{result.offer}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Melhor momento: <strong className="text-foreground">{result.launchTimeSuggestion}</strong></span>
                  </div>
                </CardContent>
              </Card>

              {/* Reasoning Card */}
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-secondary" />
                    <CardTitle className="font-headline text-sm text-muted-foreground">
                      Raciocínio da IA
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.reasoning}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed flex flex-col items-center justify-center text-center p-10">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-muted-foreground">Sua campanha aparecerá aqui</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-64">
                Preencha os dados à esquerda e clique em "Gerar Campanha com IA". A sugestão do push será carregada abaixo.
              </p>
            </Card>
          )}

          {/* Push Notification Dispatch — always visible */}
          <Card className={result ? 'border-primary/20 shadow-sm' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${result ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Bell className={`h-4 w-4 ${result ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <CardTitle className="font-headline text-base">
                    Disparo de Notificação Push
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {result
                      ? 'Recomenda-se disparar no horário sugerido pela IA.'
                      : 'Envie um aviso para todos os clientes com permissão ativa.'}
                  </CardDescription>
                </div>
                {result && (
                  <Badge className="ml-auto text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    IA preencheu ✓
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendPush} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Título
                  </label>
                  <Input
                    placeholder="Ex: Promoção exclusiva hoje!"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    maxLength={50}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground text-right">{pushTitle.length}/50</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mensagem
                  </label>
                  <Textarea
                    placeholder="Escreva a mensagem para seus clientes..."
                    className="min-h-20 text-sm resize-none"
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground text-right">{pushBody.length}/150</p>
                </div>

                {/* Scheduling Selection */}
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">
                    Programar Envio
                  </span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        name="scheduleMode" 
                        value="now"
                        checked={scheduleMode === 'now'}
                        onChange={() => setScheduleMode('now')}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Enviar Agora</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        name="scheduleMode" 
                        value="later"
                        checked={scheduleMode === 'later'}
                        onChange={() => setScheduleMode('later')}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Agendar para depois</span>
                    </label>
                  </div>
                  
                  {scheduleMode === 'later' && (
                    <div className="space-y-1.5 pt-2 animate-in fade-in-30 slide-in-from-top-1 duration-200">
                      <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Selecione a data e hora do envio:
                      </label>
                      <Input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="text-sm max-w-xs"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      {result && result.launchTimeSuggestion && (
                        <p className="text-xs text-amber-500 flex items-center gap-1 mt-1 leading-relaxed">
                          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Sugestão da IA: <strong>{result.launchTimeSuggestion}</strong></span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isSendingPush || !pushTitle || !pushBody}
                >
                  {isSendingPush ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : scheduleMode === 'now' ? (
                    <>
                      <Rocket className="h-4 w-4" />
                      Enviar para Todos os Clientes
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Confirmar Agendamento de Envio
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* BOTTOM SECTION: History Logs */}
      <div className="border-t pt-8 space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-headline font-semibold">Histórico de Campanhas & Notificações</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* AI Campaigns History */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Últimas Campanhas Sugeridas</CardTitle>
              <CardDescription className="text-xs">Registro das ideias geradas pela IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCampaignsHistoryLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : campaignHistory && campaignHistory.length > 0 ? (
                campaignHistory.map((camp) => (
                  <div key={camp.id} className="p-3 rounded-lg border bg-background text-sm space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTimestamp(camp.createdAt)}</span>
                      <Badge variant="outline" className="text-[10px] py-0">IA Campaign</Badge>
                    </div>
                    <p className="font-medium text-foreground line-clamp-2">{camp.offer}</p>
                    <div className="pt-1.5 border-t border-dashed flex justify-between gap-2 text-xs">
                      <span className="text-muted-foreground line-clamp-1">Push: {camp.pushTitle}</span>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-primary text-xs shrink-0"
                        onClick={() => {
                          setResult({
                            offer: camp.offer,
                            launchTimeSuggestion: camp.launchTimeSuggestion,
                            reasoning: camp.reasoning,
                            pushTitle: camp.pushTitle,
                            pushBody: camp.pushBody
                          });
                          setPushTitle(camp.pushTitle);
                          setPushBody(camp.pushBody);
                          toast({
                            title: 'Campanha Restaurada! ⚡',
                            description: 'A oferta e a sugestão de push foram trazidas de volta ao painel.'
                          });
                        }}
                      >
                        Carregar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma campanha registrada no histórico.</p>
              )}
            </CardContent>
          </Card>

          {/* Push Logs History */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Envios & Agendamentos</CardTitle>
              <CardDescription className="text-xs">Log de status dos disparos de notificação push.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPushHistoryLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : pushHistory && pushHistory.length > 0 ? (
                pushHistory.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-background text-sm space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatTimestamp(log.createdAt)}</span>
                      <div className="flex items-center gap-1.5">
                        {log.status === 'sent' && (
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Enviado ({log.sentCount})
                          </Badge>
                        )}
                        {log.status === 'pending' && (
                          <Badge variant="default" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] py-0 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Agendado
                          </Badge>
                        )}
                        {log.status === 'failed' && (
                          <Badge variant="destructive" className="text-[10px] py-0 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Falhou
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-xs text-foreground">🔔 {log.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{log.body}</p>
                    {log.scheduledFor && (
                      <div className="pt-1.5 border-t border-dashed text-[10px] text-amber-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Agendado para: {formatTimestamp(log.scheduledFor)}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum envio registrado no histórico.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
