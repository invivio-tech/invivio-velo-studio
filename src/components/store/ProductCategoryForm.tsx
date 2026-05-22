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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { type ProductCategory } from '@/types/store';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome da categoria deve ter pelo menos 2 caracteres.' }),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

type ProductCategoryFormProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  category?: ProductCategory | null;
  onSave: (category: Partial<ProductCategory>) => Promise<void>;
};

export default function ProductCategoryForm({ isOpen, setIsOpen, category, onSave }: ProductCategoryFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: category ? { 
      name: category.name, 
      description: category.description || '', 
      active: category.active ?? true 
    } : { 
      name: '', 
      description: '', 
      active: true 
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        form.reset(category ? { 
          name: category.name, 
          description: category.description || '', 
          active: category.active ?? true 
        } : { 
          name: '', 
          description: '', 
          active: true 
        });
    }
  }, [category, isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      const categoryData = category ? { ...category, ...values } : values;
      await onSave(categoryData);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{category ? 'Editar Categoria de Produto' : 'Nova Categoria de Produto'}</DialogTitle>
          <DialogDescription>
            {category ? 'Atualize os dados da categoria.' : 'Crie uma nova categoria para organizar seus produtos na loja.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Pomadas" {...field} />
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
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Breve descrição da categoria" {...field} />
                  </FormControl>
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
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription>
                      Exibir esta categoria na loja
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

            <DialogFooter className="mt-6">
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
