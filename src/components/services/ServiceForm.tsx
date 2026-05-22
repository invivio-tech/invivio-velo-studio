'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type Service, type ServiceWithId } from '@/app/services/page';
import { Loader2, Sparkles, Copy, Upload } from 'lucide-react';
import { useState } from 'react';
import { generateServiceDescription } from '@/ai/flows/generate-service-description';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Checkbox } from '../ui/checkbox';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { compressImage } from '@/lib/image-compression';

interface Category {
  id: string;
  name: string;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome do serviço deve ter pelo menos 2 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  price: z.coerce.number().positive({ message: 'O preço deve ser um número positivo.' }),
  duration: z.string().min(2, { message: 'A duração é obrigatória.' }),
  imageUrl: z.string().optional().or(z.literal('')),
  categoryId: z.string().min(1, { message: 'A categoria é obrigatória.' }),
  featured: z.boolean().default(false),
  imagePrompt: z.string().optional(),
});

type ServiceFormProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  service?: ServiceWithId | null;
  onSave: (service: Service | ServiceWithId) => Promise<void>;
};

export default function ServiceForm({ isOpen, setIsOpen, service, onSave }: ServiceFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const firestore = useFirestore();
  const categoriesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'serviceCategories') : null),
    [firestore]
  );
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesCollection);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: '',
      imageUrl: '',
      categoryId: '',
      featured: false,
      imagePrompt: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset(service ? {
        ...service,
        imageUrl: service.imageUrl || '',
        featured: service.featured || false,
        imagePrompt: service.imagePrompt || '',
      } : {
        name: '',
        description: '',
        price: 0,
        duration: '',
        imageUrl: '',
        categoryId: '',
        featured: false,
        imagePrompt: '',
      });
    }
  }, [service, isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      const serviceData = service ? { ...service, ...values } : values;
      await onSave(serviceData as Service | ServiceWithId);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      let uploadedUrl = '';
      for (const file of Array.from(files)) {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('folder', 'uploads/services');
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = errorText;
          try {
            const errJson = JSON.parse(errorText);
            errorMessage = errJson.error || errorMessage;
          } catch (e) {
            // Not a JSON response, fallback to text
          }
          throw new Error(errorMessage);
        }
        const { url } = await response.json();
        uploadedUrl = url as string;
      }
      form.setValue('imageUrl', uploadedUrl, { shouldValidate: true });
      toast({
        title: 'Upload concluído',
        description: 'A imagem foi salva no servidor com sucesso.',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: error?.message || 'Não foi possível enviar a imagem.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSuggestDescription = async () => {
    const { name, price, duration } = form.getValues();
    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Nome do serviço necessário',
        description: 'Por favor, preencha o nome do serviço para obter uma sugestão.'
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await generateServiceDescription({
        name,
        price: String(price),
        duration,
        establishmentName: settings?.name || '',
        nicheContext: settings?.context || settings?.about || '',
        imageStylePrompt: settings?.productImageDescription || '',
      });
      if (result.description) {
        form.setValue('description', result.description, { shouldValidate: true });
      }
      if (result.imagePrompt) {
        form.setValue('imagePrompt', result.imagePrompt, { shouldValidate: true });
      }
    } catch (error) {
      console.error('Error suggesting description:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao sugerir',
        description: 'Não foi possível gerar uma sugestão. Tente novamente.'
      });
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{service ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          <DialogDescription>
            {service ? 'Atualize os detalhes do serviço.' : 'Adicione um novo serviço ao seu catálogo.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Corte Moderno" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areCategoriesLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={areCategoriesLoading ? 'Carregando...' : 'Selecione uma categoria'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="ex: 55.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: 45 min" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Destaque na Página Inicial
                        </FormLabel>
                        <FormDescription>
                          Marque para exibir este serviço na página inicial.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-4 flex flex-col">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Descrição</FormLabel>
                        <Button type="button" variant="ghost" size="sm" onClick={handleSuggestDescription} disabled={isSuggesting}>
                          {isSuggesting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">Sugerir com IA</span>
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea placeholder="Descreva o serviço em detalhes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imagePrompt"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Prompt Imagem IA</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const v = form.getValues('imagePrompt');
                            if (v) {
                              navigator.clipboard.writeText(v);
                              toast({ title: 'Copiado!', description: 'O texto do prompt foi copiado para sua área de transferência.' });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea placeholder="Copie este texto e use em uma IA para gerar uma imagem do serviço (Midjourney, DALL-E, etc)." className="min-h-24 text-sm font-mono" {...field} />
                      </FormControl>
                      <FormDescription>
                        Gerado automaticamente se usar a Sugestão IA.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem do Serviço</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              onChange={handleImageUpload}
                              disabled={isUploading}
                            />
                            <Button type="button" variant="outline" disabled={isUploading}>
                              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2 hidden sm:block" /> Upload</>}
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <div className="mt-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue('imageUrl', '', { shouldValidate: true })}
                          disabled={!field.value || isUploading}
                        >
                          Limpar Imagem
                        </Button>
                      </div>
                      <FormDescription>
                        Cole a URL da imagem ou faça o upload direto do seu dispositivo para uso no site.
                      </FormDescription>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-4 relative flex-grow min-h-[140px] w-full rounded-md overflow-hidden bg-muted border">
                          {/* Using standard img to avoid Next.js Image domain config issues for arbitrary URLs */}
                          <img
                            src={field.value}
                            alt="Preview do serviço"
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t mt-6">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
