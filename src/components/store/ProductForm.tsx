'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { generateProductDescription } from '@/ai/flows/generate-product-description';
import { type EstablishmentSettings } from '@/app/establishment/page';
import { compressImage } from '@/lib/image-compression';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Box, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductCategory } from '@/types/store';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome do produto é obrigatório.' }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'O preço não pode ser negativo.' }),
  costPrice: z.coerce.number().min(0, { message: 'O custo não pode ser negativo.' }).optional(),
  stock: z.coerce.number().min(0, { message: 'O estoque não pode ser negativo.' }).int({ message: 'Estoque deve ser um número inteiro.' }),
  categoryId: z.string().min(1, { message: 'Selecione uma categoria.' }),
  imageURLs: z.array(z.string()).max(6, { message: 'Máximo de 6 imagens permitidas.' }),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof formSchema>;

type ProductFormProps = {
  initialData?: (Product & { id: string }) | null;
  onSave: (values: ProductFormValues) => Promise<void>;
};

export default function ProductForm({ initialData, onSave }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Fetch establishment settings for context
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  // Fetch categories for the select dropdown
  const categoriesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'productCategories') : null),
    [firestore]
  );
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<ProductCategory>(categoriesCollection);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || '',
      price: initialData.price,
      costPrice: initialData.costPrice || 0,
      stock: initialData.stock,
      categoryId: initialData.categoryId,
      imageURLs: initialData.imageURLs || (initialData.imageURL ? [initialData.imageURL] : []),
      active: initialData.active ?? true,
    } : {
      name: '',
      description: '',
      price: 0,
      costPrice: 0,
      stock: 0,
      categoryId: '',
      imageURLs: [],
      active: true,
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentImages = form.getValues('imageURLs');
    if (currentImages.length + files.length > 6) {
      toast({
        variant: 'destructive',
        title: 'Limite atingido',
        description: 'Você pode enviar no máximo 6 imagens.',
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('folder', 'uploads/products');
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = errorText;
          try {
            const errJson = JSON.parse(errorText);
            errorMessage = errJson.error || errorMessage;
          } catch (e) {}
          throw new Error(errorMessage);
        }
        const { url } = await response.json();
        newUrls.push(url as string);
      }

      form.setValue('imageURLs', [...currentImages, ...newUrls], { shouldValidate: true });
      
      toast({
        title: 'Upload concluído',
        description: `${newUrls.length} imagem(ns) enviada(s) com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error uploading product images:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: error?.message || 'Não foi possível enviar as imagens.',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const currentImages = form.getValues('imageURLs');
    form.setValue(
      'imageURLs',
      currentImages.filter((_, index) => index !== indexToRemove),
      { shouldValidate: true }
    );
  };

  const handleAI = async () => {
    const name = form.getValues('name');
    const price = form.getValues('price');
    const categoryId = form.getValues('categoryId');
    const categoryName = categories?.find(c => c.id === categoryId)?.name;

    if (!name || !price) {
      toast({
        variant: 'destructive',
        title: 'Dados insuficientes',
        description: 'Preencha o nome e o preço para gerar a descrição por IA.',
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const result = await generateProductDescription({
        name,
        price,
        categoryName,
        establishmentName: settings?.name || 'Nossa Barbearia',
        nicheContext: settings?.context || '',
      });

      if (result) {
        form.setValue('description', result.description, { shouldValidate: true });
        toast({
          title: 'Descrição Gerada!',
          description: 'A IA criou um anúncio persuasivo para seu produto.',
        });
      }
    } catch (error) {
       console.error(error);
       toast({
        variant: 'destructive',
        title: 'Erro na IA',
        description: 'Não foi possível conectar com o serviço de IA.',
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  async function onSubmit(values: ProductFormValues) {
    setIsSaving(true);
    try {
      await onSave(values);
    } catch (error) {
       console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Basic Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome do Produto</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Pomada Modeladora Matte" {...field} />
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
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                    {categories?.length === 0 && (
                       <SelectItem value="empty" disabled>Nenhuma categoria cadastrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Em qual aba da loja este produto deve aparecer.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Público (Ativo)</FormLabel>
                  <FormDescription>
                    Exibir ou ocultar da loja.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Venda (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="ex: 45.90" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor de Custo (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="ex: 20.00" {...field} />
                </FormControl>
                <FormDescription>Apenas para controle interno.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque Disponível</FormLabel>
                <FormControl>
                  <Input type="number" step="1" min="0" placeholder="ex: 15" {...field} />
                </FormControl>
                <FormDescription>Quantidade física na barbearia.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/20"
                    onClick={handleAI}
                    disabled={isGeneratingDescription}
                  >
                    {isGeneratingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Gerar com IA
                  </Button>
                </div>
                <FormControl>
                  <Textarea placeholder="Descreva os benefícios, modo de usar, aroma..." className="min-h-32" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Image Upload Section */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-headline font-semibold">Imagens do Produto</h3>
            </div>
            <span className="text-xs text-muted-foreground">Até 6 fotos</span>
          </div>
          
          <FormField control={form.control} name="imageURLs" render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="space-y-6">
                  {/* Image Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {field.value?.map((url: string, index: number) => (
                      <div key={index} className="aspect-square relative rounded-lg border bg-muted overflow-hidden group">
                        <img src={url} alt={`Produto ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    {(field.value?.length || 0) < 6 && (
                      <div className="aspect-square relative flex items-center justify-center rounded-lg border-2 border-dashed bg-muted hover:bg-muted/80 transition-colors">
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={handleImageUpload}
                          disabled={isUploadingImage}
                        />
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-2">
                          {isUploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                          <span className="text-[10px] mt-2 font-medium uppercase text-center">Add Foto</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {(!field.value || field.value.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl bg-muted/30">
                       <Box className="w-10 h-10 mb-2 opacity-20" />
                       <p className="text-sm text-muted-foreground">Nenhuma imagem enviada ainda.</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Recomendado: Imagens quadradas (1:1), fundo neutro, tamanho máx. 1MB por foto.
                  </p>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="ghost" onClick={() => router.push('/products')} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving || isUploadingImage}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Atualizar Produto' : 'Cadastrar Produto'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
