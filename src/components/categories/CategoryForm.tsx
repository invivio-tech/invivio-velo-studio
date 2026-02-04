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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type Category, type CategoryWithId } from '@/app/categories/page';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome da categoria deve ter pelo menos 2 caracteres.' }),
});

type CategoryFormProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  category?: CategoryWithId | null;
  onSave: (category: Category | CategoryWithId) => Promise<void>;
};

export default function CategoryForm({ isOpen, setIsOpen, category, onSave }: CategoryFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: category ? { name: category.name } : { name: '' },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        form.reset(category ? { name: category.name } : { name: '' });
    }
  }, [category, isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
        const categoryData = category ? { ...category, ...values } : values;
        await onSave(categoryData as Category | CategoryWithId);
        setIsOpen(false);
    } catch(err) {
        console.error("Erro ao salvar categoria:", err);
    } finally {
        setIsSaving(false);
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          <DialogDescription>
            {category ? 'Atualize o nome da categoria.' : 'Crie uma nova categoria para seus serviços.'}
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
                    <Input placeholder="ex: Cabelo" {...field} />
                  </FormControl>
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

    