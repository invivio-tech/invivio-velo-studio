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
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { generateServiceDescription } from '@/ai/flows/generate-service-description';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome do serviço deve ter pelo menos 2 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  price: z.coerce.number().positive({ message: 'O preço deve ser um número positivo.' }),
  duration: z.string().min(2, { message: 'A duração é obrigatória.' }),
  imageUrl: z.string().url({ message: 'Por favor, insira uma URL válida.' }).optional().or(z.literal('')),
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
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: service ? {
      ...service,
    } : {
      name: '',
      description: '',
      price: 0,
      duration: '',
      imageUrl: '',
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        form.reset(service ? { ...service, imageUrl: service.imageUrl || '' } : {
        name: '',
        description: '',
        price: 0,
        duration: '',
        imageUrl: '',
        });
    }
  }, [service, isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
        const serviceData = service ? { ...service, ...values } : values;
        await onSave(serviceData as Service | ServiceWithId);
        setIsOpen(false);
    } catch(err) {
        console.error("Erro ao salvar serviço:", err);
    } finally {
        setIsSaving(false);
    }
  }

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
        const result = await generateServiceDescription({ name, price: String(price), duration });
        if (result.description) {
            form.setValue('description', result.description, { shouldValidate: true });
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{service ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          <DialogDescription>
            {service ? 'Atualize os detalhes do serviço.' : 'Adicione um novo serviço ao seu catálogo.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                  </FormControl>
                  <FormDescription>
                    Cole a URL de uma imagem da web.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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

    