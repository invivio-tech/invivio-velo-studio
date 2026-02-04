'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUserProfile } from '@/firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import type { UserProfile } from '@/firebase';
import type { ServiceWithId } from '@/app/services/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Users } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  role: z.enum(['client', 'professional', 'admin']),
  serviceIds: z.array(z.string()).optional(),
});

type UserManagementFormValues = z.infer<typeof formSchema>;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const userRef = useMemoFirebase(() => (firestore && userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
  const { data: user, isLoading: isUserLoading } = useDoc<UserProfile>(userRef);

  const servicesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: allServices, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  const form = useForm<UserManagementFormValues>({
    resolver: zodResolver(formSchema),
  });

  // Redirect if not admin
  useEffect(() => {
    if (!isAdminLoading && adminProfile?.role !== 'admin') {
      router.push('/customers');
    }
  }, [isAdminLoading, adminProfile, router]);
  
  // Populate form with user data once loaded
  useEffect(() => {
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
    
    const userToUpdateRef = doc(firestore, 'users', user.id);
    const updatedData: Partial<UserProfile> = {
      role: values.role,
      serviceIds: values.role === 'professional' ? values.serviceIds : [],
    };
    
    updateDoc(userToUpdateRef, updatedData)
      .then(() => {
        toast({
          title: 'Usuário atualizado!',
          description: `A função de ${user.name} foi atualizada.`,
        });
        router.push('/customers');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userToUpdateRef.path,
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
  
  const isLoading = isAdminLoading || isUserLoading || areServicesLoading;

  if (isLoading || !user || !allServices) {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4">
        <Users className="w-8 h-8 text-secondary"/>
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Editar Usuário
        </h1>
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline">Gerenciar {user.name}</CardTitle>
          <CardDescription>Altere a função e as permissões do usuário.</CardDescription>
        </CardHeader>
        <CardContent>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Serviços Habilitados</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Selecione os serviços que este profissional pode executar.
                        </p>
                      </div>
                      <ScrollArea className="h-48 rounded-md border p-4">
                        {allServices.map((service) => (
                           <FormItem key={service.id} className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                             <FormControl>
                               <Checkbox
                                 checked={field.value?.includes(service.id)}
                                 onCheckedChange={(checked) => {
                                   return checked
                                     ? field.onChange([...(field.value || []), service.id])
                                     : field.onChange(
                                         (field.value || []).filter(
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
                        ))}
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" asChild>
                    <Link href="/customers">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
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
