'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  generatePromotionalOffers,
  type PromotionalOfferOutput,
} from '@/ai/flows/generate-promotional-offers';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Gift, Lightbulb, Loader2, Sparkles } from 'lucide-react';
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

export default function PromotionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PromotionalOfferOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceCatalog: 'Corte Clássico - R$50, Aparo de Barba - R$35, Barba com Toalha Quente - R$40. Também vendemos pomada para cabelo e óleo para barba.',
      customerHistory: 'A maioria dos clientes são regulares que vêm a cada 3-4 semanas para um corte. Clientes mais jovens (20-30 anos) frequentemente também aparam a barba. Vemos uma queda nos agendamentos no meio da semana (terça, quarta).',
      currentPromotions: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const output = await generatePromotionalOffers(values);
      setResult(output);
    } catch (error) {
      console.error('Error generating promotion:', error);
      toast({
        variant: 'destructive',
        title: 'Ocorreu um erro',
        description:
          'Falha ao gerar oferta promocional. Por favor, tente novamente mais tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Sparkles className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Gerador de Promoções com IA
        </h1>
      </div>
      <p className="text-muted-foreground">
        Deixe a IA criar a promoção perfeita para atrair mais clientes. Preencha os detalhes abaixo.
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Detalhes da Barbearia</CardTitle>
            <CardDescription>
              Forneça contexto para a IA gerar a melhor oferta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="serviceCatalog"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catálogo de Serviços</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="ex: Corte Clássico - R$50, Aparo de Barba - R$35..."
                          className="h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Liste seus serviços e preços.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comportamento do Cliente</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="ex: A maioria dos clientes são regulares... Temos pouco movimento às quartas..."
                          className="h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Descreva seu cliente típico e os períodos de maior/menor movimento.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentPromotions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promoções Atuais (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="ex: 10% de desconto para novos clientes."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar Oferta'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <h2 className="text-2xl font-headline font-bold">Sugestão da IA</h2>
          {isLoading ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in-50 duration-500">
              <Card className="bg-primary/10 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Gift className="text-primary" />
                    Sua Nova Oferta Promocional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{result.offer}</p>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    Sugestão de lançamento: <strong>{result.launchTimeSuggestion}</strong>
                  </p>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-lg">
                    <Lightbulb className="text-secondary" />
                    Raciocínio da IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{result.reasoning}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center text-center p-8 h-full">
              <CardContent className="space-y-2">
                <div className="mx-auto bg-secondary/20 p-4 rounded-full w-fit">
                    <Sparkles className="h-8 w-8 text-secondary" />
                </div>
                <p className="text-lg font-semibold">Pronto para uma ótima ideia?</p>
                <p className="text-muted-foreground">
                  Sua promoção gerada aparecerá aqui assim que você preencher os detalhes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
