'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';

import { useUserProfile, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateEstablishmentTexts } from '@/ai/flows/generate-establishment-texts';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Building, Loader2, Sparkles } from 'lucide-react';

// This interface can be shared if needed
export interface EstablishmentSettings {
  name: string;
  about: string;
  heroTitle: string;
  heroSubtitle: string;
  servicesTitle: string;
  servicesSubtitle: string;
  address: string;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  context: z.string().optional(),
  about: z.string().min(10, { message: 'O texto sobre deve ter pelo menos 10 caracteres.' }),
  heroTitle: z.string().min(10, { message: 'O título principal é obrigatório.' }),
  heroSubtitle: z.string().min(10, { message: 'O subtítulo é obrigatório.' }),
  servicesTitle: z.string().min(5, { message: 'O título dos serviços é obrigatório.' }),
  servicesSubtitle: z.string().min(10, { message: 'O subtítulo dos serviços é obrigatório.' }),
  address: z.string().min(10, { message: 'O endereço é obrigatório.' }),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export default function EstablishmentPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isProfileLoading && (!userProfile || userProfile.role !== 'admin')) {
      router.push('/schedule');
    }
  }, [userProfile, isProfileLoading, router]);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);
  
  const defaultValues: SettingsFormValues = {
    name: 'Barbearia Inteligente',
    about: 'Fundada em 2024, nossa barbearia nasceu com o propósito de resgatar a essência das barbearias clássicas, incorporando tecnologia para oferecer uma experiência única e conveniente. Nossos profissionais são artistas apaixonados, dedicados a entregar o melhor resultado para cada cliente. Utilizamos produtos de alta qualidade e as técnicas mais apuradas para garantir que seu cabelo e barba estejam sempre impecáveis. Venha nos visitar e descubra por que somos a escolha inteligente para o homem moderno.',
    heroTitle: 'Estilo e Precisão em Cada Corte.',
    heroSubtitle: 'Experimente a combinação perfeita de tradição e modernidade. Na Barbearia Inteligente, cuidamos do seu visual com a maestria que você merece.',
    servicesTitle: 'Nossos Serviços Premium',
    servicesSubtitle: 'Do clássico ao contemporâneo, temos o serviço perfeito para você.',
    address: 'Rua da Barbearia, 123 - Centro, Sua Cidade',
    context: '',
  };

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Load data into the form once it's fetched
  useEffect(() => {
    if (settings) {
      form.reset({
        ...defaultValues,
        ...settings,
      });
    }
  }, [settings, form]);

  async function onSubmit(values: SettingsFormValues) {
    if (!settingsRef) return;
    setIsSaving(true);
    
    const { context, ...settingsData } = values;

    setDoc(settingsRef, settingsData, { merge: true })
      .then(() => {
        toast({
          title: 'Configurações salvas!',
          description: 'As informações do estabelecimento foram atualizadas.',
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'update',
          requestResourceData: settingsData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar',
            description: 'Você não tem permissão para alterar as configurações.',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  }
  
  const handleSuggestTexts = async () => {
    const name = form.getValues('name');
    const context = form.getValues('context');
    if (!name || name.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Nome do estabelecimento necessário',
        description: 'Por favor, preencha o nome do estabelecimento para obter uma sugestão.'
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await generateEstablishmentTexts({ name, context });
      if (result) {
        form.setValue('heroTitle', result.heroTitle, { shouldValidate: true });
        form.setValue('heroSubtitle', result.heroSubtitle, { shouldValidate: true });
        form.setValue('about', result.about, { shouldValidate: true });
        toast({
            title: 'Sugestões aplicadas!',
            description: 'Novos textos foram gerados e preenchidos no formulário.'
        });
      }
    } catch (error) {
      console.error('Error suggesting texts:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao sugerir',
        description: 'Não foi possível gerar uma sugestão. Tente novamente.'
      });
    } finally {
      setIsSuggesting(false);
    }
  }

  const isLoading = isProfileLoading || areSettingsLoading;
  
  if (isLoading || !userProfile || userProfile.role !== 'admin') {
     return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-24 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Building className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Gestão do Estabelecimento
        </h1>
      </div>
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="font-headline">Informações e Marca</CardTitle>
          <CardDescription>
            Personalize os textos e o nome que aparecem para seus clientes na página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Nome do Estabelecimento</FormLabel>
                      <FormControl>
                          <Input placeholder="Nome do seu negócio" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )} />

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Textos da Página Inicial (Seção Principal)</h3>
                 <FormField control={form.control} name="context" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Comentários para a IA</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Ex: Somos uma barbearia de luxo para o público jovem, com um ambiente descolado e música ao vivo nos finais de semana." {...field} />
                        </FormControl>
                        <FormDescription>
                            Forneça contexto extra para a IA, como público-alvo, diferenciais ou o tom desejado.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestTexts} disabled={isSuggesting}>
                    {isSuggesting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Sugerir Textos com IA
                </Button>
              </div>

               <FormField control={form.control} name="heroTitle" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Título Principal</FormLabel>
                      <FormControl>
                          <Input placeholder="Sua chamada principal" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
                <FormField control={form.control} name="heroSubtitle" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Subtítulo</FormLabel>
                      <FormControl>
                          <Textarea placeholder="Um texto complementar para a chamada principal" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
               <FormField control={form.control} name="about" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Seção "Sobre"</FormLabel>
                      <FormControl>
                          <Textarea placeholder="Conte a história do seu estabelecimento" className="min-h-32" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
              
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Textos da Seção de Serviços</h3>
                 <FormField control={form.control} name="servicesTitle" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Título da Seção de Serviços</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Nossos Serviços Premium" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="servicesSubtitle" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Subtítulo da Seção de Serviços</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Ex: Do clássico ao contemporâneo, temos o serviço perfeito para você." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>

                <div className="border-t pt-6 space-y-4">
                    <h3 className="text-lg font-medium">Informações do Rodapé</h3>
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                                <Input placeholder="Endereço completo do estabelecimento" {...field} />
                            </FormControl>
                            <FormDescription>
                                Este endereço será exibido no rodapé da página inicial.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>


              <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSaving || isSuggesting}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    