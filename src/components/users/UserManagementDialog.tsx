'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UserProfile } from '@/firebase';
import type { ServiceWithId } from '@/app/services/page';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  role: z.enum(['client', 'professional', 'admin']),
  serviceIds: z.array(z.string()).optional(),
});

type UserManagementFormValues = z.infer<typeof formSchema>;

type UserManagementDialogProps = {
  user: UserProfile | null;
  onClose: () => void;
  allServices: ServiceWithId[];
};

export default function UserManagementDialog({
  user,
  onClose,
  allServices,
}: UserManagementDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<UserManagementFormValues>({
    resolver: zodResolver(formSchema),
  });
  
  React.useEffect(() => {
    if (user) {
      form.reset({
        role: user.role,
        serviceIds: user.serviceIds || [],
      });
    }
  }, [user, form]);
  
  const watchedRole = form.watch('role');

  async function onSubmit(values: UserManagementFormValues) {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    const userRef = doc(firestore, 'users', user.id);
    const updatedData: Partial<UserProfile> = {
      role: values.role,
      serviceIds: values.role === 'professional' ? values.serviceIds : [],
    };
    
    updateDoc(userRef, updatedData)
      .then(() => {
        toast({
          title: 'Usuário atualizado!',
          description: `A função de ${user.name} foi atualizada.`,
        });
        onClose();
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar',
          description: 'Você não tem permissão para alterar este usuário.',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <Dialog open={!!user} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Gerenciar {user?.name}</DialogTitle>
          <DialogDescription>
            Altere a função e as permissões do usuário.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função do Usuário</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRole === 'professional' && (
              <FormField
                control={form.control}
                name="serviceIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Serviços Habilitados</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Selecione os serviços que este profissional pode executar.
                      </p>
                    </div>
                    <ScrollArea className="h-48 rounded-md border p-4">
                        {allServices.map((service) => (
                        <FormField
                            key={service.id}
                            control={form.control}
                            name="serviceIds"
                            render={({ field }) => {
                            return (
                                <FormItem
                                key={service.id}
                                className="flex flex-row items-start space-x-3 space-y-0 mb-4"
                                >
                                <FormControl>
                                    <Checkbox
                                    checked={field.value?.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                        ? field.onChange([...(field.value || []), service.id])
                                        : field.onChange(
                                            field.value?.filter(
                                                (value) => value !== service.id
                                            )
                                            );
                                    }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    {service.name}
                                </FormLabel>
                                </FormItem>
                            );
                            }}
                        />
                        ))}
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
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
