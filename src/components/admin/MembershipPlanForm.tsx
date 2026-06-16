'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ServiceWithId } from '@/app/services/page';
import type { CategoryWithId } from '@/app/categories/page';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, Loader2, Copy, Upload } from 'lucide-react';
import { generateMembershipDescription } from '@/ai/flows/generate-membership-description';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/image-compression';

export interface MembershipPlan {
  name: string;
  description: string;
  price: number;
  includedServiceIds: string[];
  maxUsesPerMonth: number;
  commissionBaseValue: number;
  isActive: boolean;
  imageUrl?: string;
  imagePrompt?: string;
}

export type MembershipPlanWithId = MembershipPlan & { id: string };

interface MembershipPlanFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  plan: MembershipPlanWithId | null;
  onSave: (plan: MembershipPlan | MembershipPlanWithId) => Promise<void>;
}

export default function MembershipPlanForm({ isOpen, setIsOpen, plan, onSave }: MembershipPlanFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [commissionBaseValue, setCommissionBaseValue] = useState<number | ''>('');
  const [includedServiceIds, setIncludedServiceIds] = useState<string[]>([]);
  const [maxUsesPerMonth, setMaxUsesPerMonth] = useState<number | ''>(999);
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

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
        formData.append('folder', 'uploads/memberships');
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
      setImageUrl(uploadedUrl);
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

  const handleGenerateDescription = async () => {
    if (!name || price === '') {
      toast({
        title: 'Faltam informações',
        description: 'Preencha o Nome e Preço primeiro para que a IA possa gerar uma descrição.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGeneratingDesc(true);
    try {
      const limit = Number(maxUsesPerMonth);
      const limitText = limit === 999 ? 'Uso Ilimitado' : `Até ${limit} uso(s) por mês`;

      const result = await generateMembershipDescription({
        name,
        price: price.toString(),
        servicesCount: includedServiceIds.length,
        limitText
      });
      setDescription(result.description);
      if (result.imagePrompt) {
        setImagePrompt(result.imagePrompt);
      }
      toast({
        title: 'Gerado! ✨',
        description: 'A inteligência artificial criou a descrição e o prompt de imagem.',
      });
    } catch (e) {
      toast({
        title: 'Erro na geração',
        description: 'A IA não conseguiu gerar a descrição agora.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const firestore = useFirestore();
  const servicesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'services') : null),
    [firestore]
  );
  const { data: services } = useCollection<ServiceWithId>(servicesCollection);

  const categoriesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'serviceCategories') : null),
    [firestore]
  );
  const { data: categories } = useCollection<CategoryWithId>(categoriesCollection);

  const servicesByCategory = useMemo(() => {
    if (!services || !categories) return [];

    const categoryMap = new Map(categories.map(cat => [cat.id, { ...cat, services: [] as ServiceWithId[] }]));
    const uncategorized = { id: 'uncategorized', name: 'Outros Serviços', services: [] as ServiceWithId[] };

    services.forEach(service => {
      if (service.categoryId && categoryMap.has(service.categoryId)) {
        categoryMap.get(service.categoryId)!.services.push(service);
      } else {
        uncategorized.services.push(service);
      }
    });

    const result = Array.from(categoryMap.values()).filter(cat => cat.services.length > 0);
    if (uncategorized.services.length > 0) {
      result.push(uncategorized);
    }
    return result;
  }, [services, categories]);

  useEffect(() => {
    if (plan && isOpen) {
      setName(plan.name);
      setDescription(plan.description);
      setPrice(plan.price);
      setCommissionBaseValue(plan.commissionBaseValue ?? '');
      setIncludedServiceIds(plan.includedServiceIds || []);
      setMaxUsesPerMonth(plan.maxUsesPerMonth);
      setIsActive(plan.isActive);
      setImageUrl(plan.imageUrl || '');
      setImagePrompt(plan.imagePrompt || '');
    } else if (isOpen) {
      setName('');
      setDescription('');
      setPrice('');
      setCommissionBaseValue('');
      setIncludedServiceIds([]);
      setMaxUsesPerMonth(999);
      setIsActive(true);
      setImageUrl('');
      setImagePrompt('');
    }
  }, [plan, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price === '' || commissionBaseValue === '') return;

    setIsSaving(true);
    try {
      const planData: MembershipPlan = {
        name,
        description,
        price: Number(price),
        commissionBaseValue: Number(commissionBaseValue),
        includedServiceIds,
        maxUsesPerMonth: Number(maxUsesPerMonth),
        isActive,
        imageUrl,
        imagePrompt,
      };

      if (plan) {
        await onSave({ ...planData, id: plan.id });
      } else {
        await onSave(planData);
      }
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setIncludedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{plan ? 'Editar Plano' : 'Novo Plano de Assinatura'}</SheetTitle>
          <SheetDescription>
            Configure os detalhes do pacote e quais serviços estarão inclusos.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Plano</Label>
            <Input
              id="name"
              placeholder="Ex: Cabelo & Barba Premium"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Descrição</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                onClick={handleGenerateDescription}
              >
                {isGeneratingDesc ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Gerar com IA
              </Button>
            </div>
            <Textarea
              id="description"
              placeholder="Descreva os benefícios do plano"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço Mensal (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="120.00"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUsesPerMonth">Uso Máximo/Mês</Label>
              <Input
                id="maxUsesPerMonth"
                type="number"
                placeholder="999 para ilimitado"
                value={maxUsesPerMonth}
                onChange={(e) => setMaxUsesPerMonth(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2 p-3 bg-secondary/30 border border-secondary rounded-lg">
            <Label htmlFor="commissionBaseValue">Valor Unitário para Repasse (R$)</Label>
            <p className="text-xs text-muted-foreground mb-2">Este valor será a base para calcular a comissão do profissional. Ex: Se preencher 50, o barbeiro receberá sua % padrão em cima de R$ 50,00 por corte.</p>
            <Input
              id="commissionBaseValue"
              type="number"
              step="0.01"
              placeholder="Ex: 50.00"
              value={commissionBaseValue}
              onChange={(e) => setCommissionBaseValue(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>
          
          <div className="space-y-3">
            <Label>Serviços Inclusos (100% de Desconto)</Label>
            <div className="border rounded-md px-4 py-2 space-y-3 max-h-60 overflow-y-auto">
              {servicesByCategory.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {servicesByCategory.map((category) => {
                    const selectedCount = category.services.filter(s => includedServiceIds.includes(s.id)).length;
                    
                    return (
                      <AccordionItem key={category.id} value={category.id} className="border-b-0">
                        <AccordionTrigger className="py-2 hover:no-underline font-medium text-sm">
                          {category.name}
                          {selectedCount > 0 && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {selectedCount}
                            </span>
                          )}
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4 space-y-3 pl-2">
                          {category.services.map((service) => (
                            <div key={service.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`service-${service.id}`}
                                checked={includedServiceIds.includes(service.id)}
                                onCheckedChange={() => toggleService(service.id)}
                              />
                              <Label
                                htmlFor={`service-${service.id}`}
                                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                {service.name} (R$ {service.price.toFixed(2)})
                              </Label>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Nenhum serviço cadastrado.</p>
              )}
            </div>
          </div>

          <div className="space-y-4 border rounded-md p-4 bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="imagePrompt">Prompt Imagem IA</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(imagePrompt);
                    toast({
                      title: 'Copiado!',
                      description: 'Prompt copiado para a área de transferência.',
                    });
                  }}
                  disabled={!imagePrompt}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <Textarea
                id="imagePrompt"
                placeholder="Copie este texto e use em uma IA para gerar uma imagem do serviço (Midjourney, DALL-E, etc)."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="min-h-24 text-sm font-mono"
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Gerado automaticamente se usar a Sugestão IA.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="imageUrl">URL da Imagem ou Upload</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <div className="relative shrink-0">
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
              <p className="text-[0.8rem] text-muted-foreground">
                Cole a URL de uma imagem gerada por IA ou faça o upload direto do seu computador para ser a capa do plano.
              </p>
            </div>
            
            {imageUrl && (
              <div className="mt-4 relative flex-grow min-h-[140px] w-full rounded-md overflow-hidden bg-muted border">
                <img src={imageUrl} alt="Preview" className="object-cover w-full h-full" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border rounded-md p-4">
            <div className="space-y-0.5">
              <Label>Plano Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Clientes podem ver e assinar este plano
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Plano'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
