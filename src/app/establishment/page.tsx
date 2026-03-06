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
import { Building, Loader2, Sparkles, Clock, Star, DollarSign, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { uploadImage } from '@/app/actions/uploadImage';
import { Switch } from '@/components/ui/switch';

export interface EstablishmentSettings {
  name: string;
  logoUrl?: string;
  about: string;
  aboutImageUrl?: string;
  aboutImagePrompt?: string;
  heroTitle: string;
  heroSubtitle: string;
  servicesTitle: string;
  servicesSubtitle: string;
  address: string;
  whatsapp?: string;
  instagram?: string;
  context?: string;
  cancellationTimeLimitHours?: number;
  loyaltyPercentage?: number;
  pointsPenaltyForNoShow?: number;
  professionalCommissionPercentage?: number;
  detailedAbout?: string;
  productImageDescription?: string;
  allowProfessionalToCompleteAppointment?: boolean;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  logoUrl: z.string().optional().or(z.literal('')),
  context: z.string().optional(),
  about: z.string().min(10, { message: 'O texto sobre deve ter pelo menos 10 caracteres.' }),
  aboutImageUrl: z.string().optional().or(z.literal('')),
  aboutImagePrompt: z.string().optional(),
  heroTitle: z.string().min(10, { message: 'O título principal é obrigatório.' }),
  heroSubtitle: z.string().min(10, { message: 'O subtítulo é obrigatório.' }),
  servicesTitle: z.string().min(5, { message: 'O título dos serviços é obrigatório.' }),
  servicesSubtitle: z.string().min(10, { message: 'O subtítulo dos serviços é obrigatório.' }),
  address: z.string().min(10, { message: 'O endereço é obrigatório.' }),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  cancellationTimeLimitHours: z.coerce.number().min(0, { message: 'O valor não pode ser negativo.' }).optional(),
  loyaltyPercentage: z.coerce.number().min(0, { message: 'O percentual não pode ser negativo.' }).max(100, { message: 'O máximo é 100%.' }).optional(),
  pointsPenaltyForNoShow: z.coerce.number().min(0, { message: 'A penalidade deve ser um valor positivo.' }).optional(),
  professionalCommissionPercentage: z.coerce.number().min(0, { message: 'A comissão não pode ser negativa.' }).max(100, { message: 'O máximo é 100%.' }).optional(),
  detailedAbout: z.string().optional(),
  productImageDescription: z.string().optional(),
  allowProfessionalToCompleteAppointment: z.boolean().optional(),
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
    logoUrl: '',
    about: 'Fundada em 2024, nossa barbearia nasceu com o propósito de resgatar a essência das barbearias clássicas, incorporando tecnologia para oferecer uma experiência única e conveniente. Nossos profissionais são artistas apaixonados, dedicados a entregar o melhor resultado para cada cliente. Utilizamos produtos de alta qualidade e as técnicas mais apuradas para garantir que seu cabelo e barba estejam sempre impecáveis. Venha nos visitar e descubra por que somos a escolha inteligente para o homem moderno.',
    aboutImageUrl: '',
    aboutImagePrompt: '',
    heroTitle: 'Estilo e Precisão em Cada Corte.',
    heroSubtitle: 'Experimente a combinação perfeita de tradição e modernidade. Na Barbearia Inteligente, cuidamos do seu visual com a maestria que você merece.',
    servicesTitle: 'Nossos Serviços Premium',
    servicesSubtitle: 'Do clássico ao contemporâneo, temos o serviço perfeito para você.',
    address: 'Rua da Barbearia, 123 - Centro, Sua Cidade',
    whatsapp: '',
    instagram: '',
    context: '',
    cancellationTimeLimitHours: 24,
    loyaltyPercentage: 10,
    pointsPenaltyForNoShow: 5,
    professionalCommissionPercentage: 25,
    detailedAbout: '',
    productImageDescription: 'Homem moderno, produtos de cuidado pessoal, alta resolução, estética minimalista e premium.',
    allowProfessionalToCompleteAppointment: true,
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
        logoUrl: settings.logoUrl || '',
        aboutImageUrl: settings.aboutImageUrl || '',
        aboutImagePrompt: settings.aboutImagePrompt || '',
        whatsapp: settings.whatsapp || '',
        instagram: settings.instagram || '',
        context: settings.context || '',
        cancellationTimeLimitHours: settings.cancellationTimeLimitHours === undefined ? 24 : settings.cancellationTimeLimitHours,
        loyaltyPercentage: settings.loyaltyPercentage === undefined ? 10 : settings.loyaltyPercentage,
        pointsPenaltyForNoShow: settings.pointsPenaltyForNoShow === undefined ? 5 : settings.pointsPenaltyForNoShow,
        professionalCommissionPercentage: settings.professionalCommissionPercentage === undefined ? 25 : settings.professionalCommissionPercentage,
        detailedAbout: settings.detailedAbout || '',
        productImageDescription: settings.productImageDescription || '',
        allowProfessionalToCompleteAppointment: settings.allowProfessionalToCompleteAppointment === undefined ? true : settings.allowProfessionalToCompleteAppointment,
      });
    }
  }, [settings, form]);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadImage(formData);

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        });
      } else if (result.url) {
        form.setValue('logoUrl', result.url, { shouldValidate: true });
        toast({
          title: 'Upload concluído',
          description: 'A logo foi salva com sucesso.',
        });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: 'Não foi possível enviar a logo.',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const [isUploadingAboutImage, setIsUploadingAboutImage] = useState(false);

  const handleAboutImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAboutImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadImage(formData);

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        });
      } else if (result.url) {
        form.setValue('aboutImageUrl', result.url, { shouldValidate: true });
        toast({
          title: 'Upload concluído',
          description: 'A imagem da seção Sobre foi salva com sucesso.',
        });
      }
    } catch (error) {
      console.error('Error uploading about image:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: 'Não foi possível enviar a imagem.',
      });
    } finally {
      setIsUploadingAboutImage(false);
    }
  };

  async function onSubmit(values: SettingsFormValues) {
    if (!settingsRef) return;
    setIsSaving(true);

    const settingsData = values;

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
        if (result.aboutImagePrompt) form.setValue('aboutImagePrompt', result.aboutImagePrompt, { shouldValidate: true });
        form.setValue('servicesTitle', result.servicesTitle, { shouldValidate: true });
        form.setValue('servicesSubtitle', result.servicesSubtitle, { shouldValidate: true });
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Informações e Marca</CardTitle>
              <CardDescription>
                Personalize os textos e o nome que aparecem para seus clientes na página inicial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Estabelecimento</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do seu negócio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="logoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Logotipo do Estabelecimento (Substitui o ícone padrão)</FormLabel>
                  <FormControl>
                    <div className="flex gap-4 items-center">
                      <div className="relative flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                        />
                        <Button type="button" variant="outline" className="w-full justify-start" disabled={isUploadingLogo}>
                          {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          {field.value ? 'Trocar Logotipo' : 'Fazer Upload do Logotipo'}
                        </Button>
                      </div>
                      {field.value && (
                        <div className="h-10 w-10 relative overflow-hidden rounded-md border bg-muted flex-shrink-0">
                          <img src={field.value} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => form.setValue('logoUrl', '', { shouldValidate: true })}
                        disabled={!field.value || isUploadingLogo}
                      >
                        Remover
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Se configurado, este logotipo aparecerá no menu principal e no cabeçalho do site.
                  </FormDescription>
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

              <FormField control={form.control} name="aboutImagePrompt" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Prompt Imagem IA ("Sobre")</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const v = form.getValues('aboutImagePrompt');
                        if (v) {
                          navigator.clipboard.writeText(v);
                          toast({ title: 'Copiado!', description: 'O texto do prompt foi copiado para sua área de transferência.' });
                        }
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea placeholder="Prompt gerado para criar a imagem da seção Sobre" className="min-h-24 text-sm font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="aboutImageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem da Seção "Sobre"</FormLabel>
                  <FormControl>
                    <div className="flex gap-4 items-center">
                      <div className="relative flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={handleAboutImageUpload}
                          disabled={isUploadingAboutImage}
                        />
                        <Button type="button" variant="outline" className="w-full justify-start" disabled={isUploadingAboutImage}>
                          {isUploadingAboutImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          {field.value ? 'Trocar Imagem' : 'Fazer Upload da Imagem'}
                        </Button>
                      </div>
                      {field.value && (
                        <div className="h-10 w-16 relative overflow-hidden rounded-md border bg-muted flex-shrink-0">
                          <img src={field.value} alt="About" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => form.setValue('aboutImageUrl', '', { shouldValidate: true })}
                        disabled={!field.value || isUploadingAboutImage}
                      >
                        Remover
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="detailedAbout" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada para o Site</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva os produtos e experiência em detalhes para o site" className="min-h-32" {...field} />
                  </FormControl>
                  <FormDescription>
                    Pode conter informações extras do seu negócio, os produtos que você utiliza, e uma história mais aprofundada para páginas extras.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="productImageDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição para Imagens IA de Produtos (Prompt)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva como devem ser as imagens dos produtos e ambiente" className="min-h-24" {...field} />
                  </FormControl>
                  <FormDescription>
                    Servirá como 'Prompt' (diretriz para Inteligência Artificial) caso use geração automática de banners ou imagens. Ex: "Fotografia realista de barbearia luxuosa iluminada..."
                  </FormDescription>
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
                <h3 className="text-lg font-medium">Informações de Contato</h3>
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
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="5511999998888" {...field} />
                    </FormControl>
                    <FormDescription>
                      Número para contato via WhatsApp. Será usado no link de contato. Insira apenas números.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="instagram" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="seu_negocio" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nome de usuário do Instagram (sem o @). Será usado no link do rodapé.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><Clock /> Regras de Agendamento</CardTitle>
              <CardDescription>
                Defina as políticas para cancelamento e reagendamento de horários pelos clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="cancellationTimeLimitHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Tempo para Cancelamento (em horas)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="ex: 24" {...field} />
                    </FormControl>
                    <FormDescription>
                      Com quantas horas de antecedência um cliente pode cancelar ou reagendar um horário? (Deixe 0 para permitir a qualquer momento).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowProfessionalToCompleteAppointment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Profissional Conclui Serviço</FormLabel>
                      <FormDescription>
                        Permite que os próprios barbeiros finalizem seus serviços e contabilizem o comissionamento. Se desativado, apenas o Administrador ou Recepção poderá dar baixa no caixa e no agendamento.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><DollarSign /> Financeiro</CardTitle>
              <CardDescription>
                Configure as comissões globais dos profissionais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="professionalCommissionPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão do Profissional (%)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="ex: 25" {...field} />
                    </FormControl>
                    <FormDescription>
                      Porcentagem do valor do serviço que será repassada ao profissional (padrão 25%).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><Star /> Programa de Fidelidade</CardTitle>
              <CardDescription>
                Configure o sistema de pontos para recompensar seus clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="loyaltyPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Fidelidade (%)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="ex: 10" {...field} />
                    </FormControl>
                    <FormDescription>
                      Porcentagem do valor do serviço que será convertida em pontos para o cliente (ex: 10% de R$50,00 = 5 pontos).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pointsPenaltyForNoShow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penalidade por Não Comparecimento (pontos a deduzir)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="ex: 5" {...field} />
                    </FormControl>
                    <FormDescription>
                      Pontos que o cliente perde se não comparecer ao agendamento.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>


          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSaving || isSuggesting}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Todas as Alterações
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
