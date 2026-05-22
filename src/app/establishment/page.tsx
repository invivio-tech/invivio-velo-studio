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
import { generateBirthdayMessage } from '@/ai/flows/generate-birthday-message';
import { generateThemePalette } from '@/ai/flows/generate-theme-palette';
import { hexToTailwindHsl, tailwindHslToHex } from '@/lib/color-utils';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Building, Loader2, Sparkles, Clock, Star, DollarSign, Upload, Bell, Palette, Undo2, Globe, Settings2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  birthdayTitle?: string;
  birthdayMessage?: string;
  businessCategory: 'barbershop' | 'beauty_salon' | 'clinic' | 'petshop' | 'other';
  businessTone: 'formal' | 'casual' | 'luxury' | 'friendly';
  retargetingActive?: boolean;
  retargetingDays?: number;
  retargetingTitle?: string;
  retargetingBody?: string;
  primaryColor?: string;
  primaryForegroundColor?: string;
  secondaryColor?: string;
  secondaryForegroundColor?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  cardColor?: string;
  accentColor?: string;
  borderColor?: string;
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
  birthdayTitle: z.string().optional(),
  birthdayMessage: z.string().optional(),
  businessCategory: z.enum(['barbershop', 'beauty_salon', 'clinic', 'petshop', 'other'], {
    required_error: 'A categoria do negócio é obrigatória.',
  }),
  businessTone: z.enum(['formal', 'casual', 'luxury', 'friendly'], {
    required_error: 'O tom de voz é obrigatório.',
  }),
  retargetingActive: z.boolean().optional(),
  retargetingDays: z.coerce.number().min(1, { message: 'O valor mínimo é 1 dia.' }).optional(),
  retargetingTitle: z.string().optional(),
  retargetingBody: z.string().optional(),
  primaryColor: z.string().optional().or(z.literal('')),
  primaryForegroundColor: z.string().optional().or(z.literal('')),
  secondaryColor: z.string().optional().or(z.literal('')),
  secondaryForegroundColor: z.string().optional().or(z.literal('')),
  backgroundColor: z.string().optional().or(z.literal('')),
  foregroundColor: z.string().optional().or(z.literal('')),
  cardColor: z.string().optional().or(z.literal('')),
  accentColor: z.string().optional().or(z.literal('')),
  borderColor: z.string().optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export default function EstablishmentPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestingBirthday, setIsSuggestingBirthday] = useState(false);

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
    birthdayTitle: 'Feliz Aniversário! 🎂',
    birthdayMessage: 'A equipe da Barbearia East Side te deseja um dia incrível e muito sucesso!',
    businessCategory: 'barbershop',
    businessTone: 'friendly',
    retargetingActive: false,
    retargetingDays: 30,
    retargetingTitle: 'Saudades de você! 👋',
    retargetingBody: 'Já faz [DIAS] dias desde a sua última visita. Acreditamos que já está na hora de dar aquele trato no visual! Toque aqui para agendar.',
    primaryColor: '',
    primaryForegroundColor: '',
    secondaryColor: '',
    secondaryForegroundColor: '',
    backgroundColor: '',
    foregroundColor: '',
    cardColor: '',
    accentColor: '',
    borderColor: '',
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
        birthdayTitle: settings.birthdayTitle || 'Feliz Aniversário! 🎂',
        birthdayMessage: settings.birthdayMessage || 'A equipe da Barbearia East Side te deseja um dia incrível e muito sucesso!',
        businessCategory: settings.businessCategory || 'barbershop',
        businessTone: settings.businessTone || 'friendly',
        retargetingActive: settings.retargetingActive === undefined ? false : settings.retargetingActive,
        retargetingDays: settings.retargetingDays === undefined ? 30 : settings.retargetingDays,
        retargetingTitle: settings.retargetingTitle || 'Saudades de você! 👋',
        retargetingBody: settings.retargetingBody || 'Já faz [DIAS] dias desde a sua última visita. Acreditamos que já está na hora de dar aquele trato no visual! Toque aqui para agendar.',
        primaryColor: settings.primaryColor || '',
        primaryForegroundColor: settings.primaryForegroundColor || '',
        secondaryColor: settings.secondaryColor || '',
        secondaryForegroundColor: settings.secondaryForegroundColor || '',
        backgroundColor: settings.backgroundColor || '',
        foregroundColor: settings.foregroundColor || '',
        cardColor: settings.cardColor || '',
        accentColor: settings.accentColor || '',
        borderColor: settings.borderColor || '',
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
      formData.append('folder', 'uploads/establishment/logo');
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falha no upload');
      }
      const { url } = await response.json();
      form.setValue('logoUrl', url, { shouldValidate: true });
      toast({ title: 'Upload concluído', description: 'A logo foi salva com sucesso.' });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({ variant: 'destructive', title: 'Erro no Upload', description: error?.message || 'Não foi possível enviar a logo.' });
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
      formData.append('folder', 'uploads/establishment/about');
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falha no upload');
      }
      const { url } = await response.json();
      form.setValue('aboutImageUrl', url, { shouldValidate: true });
      toast({ title: 'Upload concluído', description: 'A imagem da seção Sobre foi salva com sucesso.' });
    } catch (error: any) {
      console.error('Error uploading about image:', error);
      toast({ variant: 'destructive', title: 'Erro no Upload', description: error?.message || 'Não foi possível enviar a imagem.' });
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
        toast({ title: 'Configurações salvas!', description: 'As informações do estabelecimento foram atualizadas.' });
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'update',
          requestResourceData: settingsData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: 'Você não tem permissão para alterar as configurações.' });
      })
      .finally(() => { setIsSaving(false); });
  }

  const handleSuggestTexts = async () => {
    const name = form.getValues('name');
    const context = form.getValues('context');
    if (!name || name.length < 2) {
      toast({ variant: 'destructive', title: 'Nome do estabelecimento necessário', description: 'Por favor, preencha o nome do estabelecimento para obter uma sugestão.' });
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
        toast({ title: 'Sugestões aplicadas!', description: 'Novos textos foram gerados e preenchidos no formulário.' });
      }
    } catch (error) {
      console.error('Error suggesting texts:', error);
      toast({ variant: 'destructive', title: 'Erro ao sugerir', description: 'Não foi possível gerar uma sugestão. Tente novamente.' });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSuggestBirthday = async () => {
    const name = form.getValues('name');
    const context = form.getValues('context');
    setIsSuggestingBirthday(true);
    try {
      const result = await generateBirthdayMessage({ name, context });
      if (result) {
        form.setValue('birthdayTitle', result.birthdayTitle, { shouldValidate: true });
        form.setValue('birthdayMessage', result.birthdayMessage, { shouldValidate: true });
        toast({ title: 'Sugestão aplicada!', description: 'A mensagem de aniversário foi preenchida.' });
      }
    } catch (error) {
      console.error('Error suggesting birthday message:', error);
      toast({ variant: 'destructive', title: 'Erro ao sugerir', description: 'Não foi possível gerar a sugestão de aniversário.' });
    } finally {
      setIsSuggestingBirthday(false);
    }
  };

  const [isSuggestingColors, setIsSuggestingColors] = useState(false);

  const handleSuggestColors = async () => {
    const logoUrl = form.getValues('logoUrl');
    const businessCategory = form.getValues('businessCategory');
    const businessTone = form.getValues('businessTone');
    if (!logoUrl) {
      toast({ variant: 'destructive', title: 'Logo necessária', description: 'Por favor, envie um logotipo primeiro para que a IA possa analisar as cores.' });
      return;
    }
    setIsSuggestingColors(true);
    try {
      const result = await generateThemePalette({ logoUrl, businessCategory, businessTone });
      if (result) {
        form.setValue('primaryColor', result.primaryColor, { shouldValidate: true });
        form.setValue('primaryForegroundColor', result.primaryForegroundColor, { shouldValidate: true });
        form.setValue('secondaryColor', result.secondaryColor, { shouldValidate: true });
        form.setValue('secondaryForegroundColor', result.secondaryForegroundColor, { shouldValidate: true });
        form.setValue('backgroundColor', result.backgroundColor, { shouldValidate: true });
        form.setValue('foregroundColor', result.foregroundColor, { shouldValidate: true });
        form.setValue('cardColor', result.cardColor, { shouldValidate: true });
        form.setValue('accentColor', result.accentColor, { shouldValidate: true });
        form.setValue('borderColor', result.borderColor, { shouldValidate: true });
        toast({ title: 'Sugestão de cores aplicada!', description: result.reasoning || 'As cores sugeridas foram aplicadas no formulário.' });
      }
    } catch (error) {
      console.error('Error suggesting colors:', error);
      toast({ variant: 'destructive', title: 'Erro ao sugerir cores', description: 'Não foi possível analisar a logo e gerar as cores. Verifique a imagem e tente novamente.' });
    } finally {
      setIsSuggestingColors(false);
    }
  };

  const handleClearTheme = () => {
    form.setValue('primaryColor', '', { shouldValidate: true });
    form.setValue('primaryForegroundColor', '', { shouldValidate: true });
    form.setValue('secondaryColor', '', { shouldValidate: true });
    form.setValue('secondaryForegroundColor', '', { shouldValidate: true });
    form.setValue('backgroundColor', '', { shouldValidate: true });
    form.setValue('foregroundColor', '', { shouldValidate: true });
    form.setValue('cardColor', '', { shouldValidate: true });
    form.setValue('accentColor', '', { shouldValidate: true });
    form.setValue('borderColor', '', { shouldValidate: true });
    toast({ title: 'Tema restaurado', description: 'As cores customizadas foram removidas e o tema padrão foi restaurado.' });
  };

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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-secondary" />
              <h1 className="text-3xl font-headline font-bold tracking-tight">
                Gestão do Estabelecimento
              </h1>
            </div>
            <Button type="submit" disabled={isSaving || isSuggesting}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>

          {/* ── Tabs ── */}
          <Tabs defaultValue="identity" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="identity" className="flex items-center gap-1.5">
                <Building className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate">Identidade</span>
              </TabsTrigger>
              <TabsTrigger value="site" className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate">Site / LP</span>
              </TabsTrigger>
              <TabsTrigger value="visual" className="flex items-center gap-1.5">
                <Palette className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate">Visual</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="flex items-center gap-1.5">
                <Settings2 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate">Operações</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1.5">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate">Notificações</span>
              </TabsTrigger>
            </TabsList>

            {/* ══════════════════════════════════════════
                TAB 1 — Identidade
            ══════════════════════════════════════════ */}
            <TabsContent value="identity">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Identidade do Estabelecimento</CardTitle>
                  <CardDescription>
                    Configure o nome, logotipo e o perfil do seu negócio. Essas informações são usadas pela IA para personalizar textos e sugestões.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="businessCategory" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria do Negócio</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="barbershop">Barbearia</option>
                            <option value="beauty_salon">Salão de Beleza / Estética</option>
                            <option value="clinic">Clínica / Saúde</option>
                            <option value="petshop">Pet Shop</option>
                            <option value="other">Outros Serviços</option>
                          </select>
                        </FormControl>
                        <FormDescription>Define o nicho para que a IA e a interface se adaptem.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="businessTone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tom de Voz da Comunicação</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="friendly">Amigável e Próximo</option>
                            <option value="casual">Casual e Moderno</option>
                            <option value="formal">Formal e Profissional</option>
                            <option value="luxury">Luxuoso e Exclusivo</option>
                          </select>
                        </FormControl>
                        <FormDescription>Como a IA deve escrever seus textos.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

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
                      <FormLabel>Logotipo do Estabelecimento</FormLabel>
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
                        Aparecerá no menu principal, no cabeçalho do site e habilita a sugestão de cores com IA na aba <strong>Visual</strong>.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════
                TAB 2 — Site / LP
            ══════════════════════════════════════════ */}
            <TabsContent value="site">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Conteúdo do Site e Landing Page</CardTitle>
                  <CardDescription>
                    Personalize os textos e informações que seus clientes veem na página inicial pública.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Contexto IA + botão */}
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
                    {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Sugerir Textos com IA
                  </Button>

                  <Separator />

                  {/* Seção Hero */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Seção Principal (Hero)</h3>
                    <FormField control={form.control} name="heroTitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título Principal</FormLabel>
                        <FormControl><Input placeholder="Sua chamada principal" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="heroSubtitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtítulo</FormLabel>
                        <FormControl><Textarea placeholder="Um texto complementar para a chamada principal" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  {/* Seção Sobre */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Seção &quot;Sobre&quot;</h3>
                    <FormField control={form.control} name="about" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto Sobre o Estabelecimento</FormLabel>
                        <FormControl><Textarea placeholder="Conte a história do seu estabelecimento" className="min-h-32" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="aboutImagePrompt" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Prompt Imagem IA (&quot;Sobre&quot;)</FormLabel>
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
                        <FormLabel>Imagem da Seção &quot;Sobre&quot;</FormLabel>
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
                        <FormControl><Textarea placeholder="Descreva os produtos e experiência em detalhes para o site" className="min-h-32" {...field} /></FormControl>
                        <FormDescription>
                          Pode conter informações extras do seu negócio, os produtos que você utiliza, e uma história mais aprofundada para páginas extras.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="productImageDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição para Imagens IA de Produtos (Prompt)</FormLabel>
                        <FormControl><Textarea placeholder="Descreva como devem ser as imagens dos produtos e ambiente" className="min-h-24" {...field} /></FormControl>
                        <FormDescription>
                          Servirá como diretriz para IA ao gerar banners ou imagens. Ex: &quot;Fotografia realista de barbearia luxuosa iluminada...&quot;
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  {/* Seção Serviços */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Seção de Serviços</h3>
                    <FormField control={form.control} name="servicesTitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Seção de Serviços</FormLabel>
                        <FormControl><Input placeholder="Ex: Nossos Serviços Premium" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="servicesSubtitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtítulo da Seção de Serviços</FormLabel>
                        <FormControl><Textarea placeholder="Ex: Do clássico ao contemporâneo, temos o serviço perfeito para você." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  {/* Contato */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informações de Contato</h3>
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl><Input placeholder="Endereço completo do estabelecimento" {...field} /></FormControl>
                        <FormDescription>Este endereço será exibido no rodapé da página inicial.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="whatsapp" render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl><Input placeholder="5511999998888" {...field} /></FormControl>
                          <FormDescription>Apenas números. Usado no link de contato do site.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="instagram" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl><Input placeholder="seu_negocio" {...field} /></FormControl>
                          <FormDescription>Nome de usuário sem @. Usado no link do rodapé.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════
                TAB 3 — Visual
            ══════════════════════════════════════════ */}
            <TabsContent value="visual">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Palette className="h-5 w-5 text-secondary" />
                    Identidade Visual e Cores
                  </CardTitle>
                  <CardDescription>
                    Personalize as cores de destaque e de fundo da sua Landing Page e Painel. Envie um logotipo na aba <strong>Identidade</strong> para habilitar a sugestão automática.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSuggestColors}
                      disabled={isSuggestingColors || !form.watch('logoUrl')}
                      className="flex items-center gap-2"
                    >
                      {isSuggestingColors ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
                      )}
                      Sugerir Cores com IA
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleClearTheme}
                      disabled={!form.watch('primaryColor') && !form.watch('backgroundColor')}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                    >
                      <Undo2 className="h-4 w-4" />
                      Restaurar Cores Padrão
                    </Button>
                  </div>

                  {!form.watch('logoUrl') && (
                    <p className="text-xs text-muted-foreground">
                      💡 Envie um logotipo na aba <strong>Identidade</strong> para habilitar a sugestão de paleta de cores automática com IA.
                    </p>
                  )}

                  {/* Live Preview */}
                  <div className="border rounded-xl p-4 bg-slate-950/40 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Visualização em Tempo Real (Preview)
                    </h4>
                    <div
                      className="border rounded-lg p-4 md:p-6 space-y-4 max-w-md mx-auto transition-colors duration-300"
                      style={{
                        backgroundColor: `hsl(${form.watch('backgroundColor') || '220 15% 6%'})`,
                        borderColor: `hsl(${form.watch('borderColor') || '210 15% 25%'})`,
                        color: `hsl(${form.watch('foregroundColor') || '210 20% 95%'})`,
                      }}
                    >
                      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: `hsl(${form.watch('borderColor') || '210 15% 25%'})` }}>
                        <div className="flex items-center gap-1.5">
                          {form.watch('logoUrl') ? (
                            <img src={form.watch('logoUrl')} alt="Logo" className="h-5 w-auto object-contain" />
                          ) : (
                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${form.watch('primaryColor') || '217 91% 60%'})` }} />
                          )}
                          <span className="font-bold text-xs">{form.watch('name') || 'Estabelecimento'}</span>
                        </div>
                        <span className="text-[10px] opacity-75 font-mono">Mockup Site</span>
                      </div>

                      <div
                        className="rounded-lg p-3 space-y-2 border"
                        style={{
                          backgroundColor: `hsl(${form.watch('cardColor') || '222 47% 11%'})`,
                          borderColor: `hsl(${form.watch('borderColor') || '210 15% 25%'})`,
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold">Corte Masculino Premium</span>
                          <span className="text-xs font-bold" style={{ color: `hsl(${form.watch('primaryColor') || '217 91% 60%'})` }}>
                            R$ 55,00
                          </span>
                        </div>
                        <p className="text-[10px] opacity-70">Um corte sofisticado que alinha tradição, estilo e acabamento perfeito.</p>
                        <div
                          className="w-full text-center py-1.5 rounded text-[10px] font-bold mt-2 select-none"
                          style={{
                            backgroundColor: `hsl(${form.watch('primaryColor') || '217 91% 60%'})`,
                            color: `hsl(${form.watch('primaryForegroundColor') || '0 0% 100%'})`,
                          }}
                        >
                          Reservar Horário
                        </div>
                        <div
                          className="w-full text-center py-1.5 rounded text-[10px] font-bold border select-none"
                          style={{
                            borderColor: `hsl(${form.watch('borderColor') || '210 15% 25%'})`,
                            backgroundColor: `hsl(${form.watch('secondaryColor') || '210 10% 65%'})`,
                            color: `hsl(${form.watch('secondaryForegroundColor') || '220 15% 6%'})`,
                          }}
                        >
                          Ver Detalhes do Profissional
                        </div>
                      </div>

                      <div className="flex gap-2 justify-center">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `hsl(${form.watch('accentColor') || '215 60% 20%'})`,
                            borderColor: `hsl(${form.watch('borderColor') || '210 15% 25%'})`,
                            color: `hsl(${form.watch('foregroundColor') || '210 20% 95%'})`,
                          }}
                        >
                          Fidelidade: +5 pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Color Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                    {(
                      [
                        { name: 'primaryColor' as const, label: 'Cor Primária (Destaque)', default: '217 91% 60%', desc: 'Botões principais e elementos em foco.' },
                        { name: 'primaryForegroundColor' as const, label: 'Texto sobre Primária', default: '0 0% 100%', desc: 'Texto sobre o fundo primário.' },
                        { name: 'secondaryColor' as const, label: 'Cor Secundária', default: '210 10% 65%', desc: 'Elementos secundários e de apoio.' },
                        { name: 'secondaryForegroundColor' as const, label: 'Texto sobre Secundária', default: '220 15% 6%', desc: 'Texto sobre o fundo secundário.' },
                        { name: 'backgroundColor' as const, label: 'Cor de Fundo (Página)', default: '220 15% 6%', desc: 'Fundo principal (preferencialmente escuro).' },
                        { name: 'foregroundColor' as const, label: 'Cor do Texto', default: '210 20% 95%', desc: 'Cor principal para textos de leitura.' },
                        { name: 'cardColor' as const, label: 'Cor dos Cards', default: '222 47% 11%', desc: 'Fundo de cartões, menus e modais.' },
                        { name: 'accentColor' as const, label: 'Cor de Destaque (Accent)', default: '215 60% 20%', desc: 'Badges de fidelidade e micro-elementos.' },
                        { name: 'borderColor' as const, label: 'Cor das Bordas', default: '210 15% 25%', desc: 'Divisores e contornos de inputs.' },
                      ] as const
                    ).map(({ name, label, default: def, desc }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>{label}</FormLabel>
                            <div className="flex gap-2 items-center">
                              <div className="relative h-10 w-10 overflow-hidden rounded-md border flex-shrink-0">
                                <input
                                  type="color"
                                  value={tailwindHslToHex(field.value || def)}
                                  className="absolute inset-0 cursor-pointer w-full h-full p-0 border-0 opacity-0"
                                  onChange={(e) => form.setValue(name, hexToTailwindHsl(e.target.value), { shouldValidate: true })}
                                />
                                <div className="w-full h-full rounded" style={{ backgroundColor: tailwindHslToHex(field.value || def) }} />
                              </div>
                              <Input
                                type="text"
                                placeholder={def}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="font-mono text-xs flex-1"
                              />
                            </div>
                            <FormDescription className="text-[11px] leading-tight">{desc}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════
                TAB 4 — Operações
            ══════════════════════════════════════════ */}
            <TabsContent value="operations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Regras de Agendamento
                  </CardTitle>
                  <CardDescription>
                    Defina as políticas para cancelamento e reagendamento de horários pelos clientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cancellationTimeLimitHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Tempo para Cancelamento (em horas)</FormLabel>
                        <FormControl><Input type="number" placeholder="ex: 24" {...field} /></FormControl>
                        <FormDescription>
                          Com quantas horas de antecedência um cliente pode cancelar ou reagendar? (0 = a qualquer momento).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allowProfessionalToCompleteAppointment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Profissional Conclui Serviço</FormLabel>
                          <FormDescription>
                            Permite que os próprios barbeiros finalizem seus serviços e contabilizem o comissionamento. Se desativado, apenas o Administrador poderá dar baixa.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> Financeiro
                  </CardTitle>
                  <CardDescription>Configure as comissões globais dos profissionais.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="professionalCommissionPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comissão do Profissional (%)</FormLabel>
                        <FormControl><Input type="number" placeholder="ex: 25" {...field} /></FormControl>
                        <FormDescription>
                          Porcentagem do valor do serviço repassada ao profissional (padrão 25%).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Star className="h-5 w-5" /> Programa de Fidelidade
                  </CardTitle>
                  <CardDescription>Configure o sistema de pontos para recompensar seus clientes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="loyaltyPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentual de Fidelidade (%)</FormLabel>
                        <FormControl><Input type="number" placeholder="ex: 10" {...field} /></FormControl>
                        <FormDescription>
                          Porcentagem do valor do serviço convertida em pontos (ex: 10% de R$50,00 = 5 pontos).
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
                        <FormControl><Input type="number" placeholder="ex: 5" {...field} /></FormControl>
                        <FormDescription>
                          Pontos que o cliente perde se não comparecer ao agendamento.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════
                TAB 5 — Notificações
            ══════════════════════════════════════════ */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">🎂 Notificação de Aniversário</CardTitle>
                  <CardDescription>
                    Configure a mensagem automática que seus clientes recebem no dia do aniversário.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={handleSuggestBirthday} disabled={isSuggestingBirthday}>
                      {isSuggestingBirthday ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Sugerir com IA
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name="birthdayTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Notificação</FormLabel>
                        <FormControl><Input placeholder="ex: Feliz Aniversário! 🎂" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthdayMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem</FormLabel>
                        <FormControl>
                          <Textarea placeholder="A equipe te deseja um dia incrível..." className="min-h-20" {...field} />
                        </FormControl>
                        <FormDescription>
                          Mencione o nome da barbearia para reforçar o carinho com o cliente.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Bell className="h-5 w-5" /> Automação de Retenção (Oi Sumido)
                  </CardTitle>
                  <CardDescription>
                    Configure mensagens automáticas (Push) para clientes que estão há muito tempo sem agendar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="retargetingActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativar Notificações de Retenção</FormLabel>
                          <FormDescription>
                            Se ativado, o sistema enviará notificações automáticas para tentar recuperar o cliente.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="retargetingDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dias de Gatilho</FormLabel>
                          <FormControl><Input type="number" placeholder="ex: 30" {...field} /></FormControl>
                          <FormDescription>Disparar após quantos dias do último agendamento?</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="retargetingTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título da Notificação</FormLabel>
                          <FormControl><Input placeholder="Saudades de você! 👋" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="retargetingBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto da Mensagem</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Já faz [DIAS] dias desde a sua última visita..." className="min-h-24" {...field} />
                        </FormControl>
                        <FormDescription>
                          Use <strong className="text-primary">[NOME]</strong> para o nome do cliente e <strong className="text-primary">[DIAS]</strong> para os dias sem visita.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
