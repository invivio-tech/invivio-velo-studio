'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUserProfile } from '@/firebase';
import { doc, updateDoc, collection, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/firebase';
import type { ServiceWithId } from '@/app/services/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
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
  const [isDisabling, setIsDisabling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const userRef = useMemoFirebase(() => {
    // Only create the reference if we know the current user is an admin
    if (firestore && userId && adminProfile?.role === 'admin') {
      return doc(firestore, 'users', userId);
    }
    return null;
  }, [firestore, userId, adminProfile]);
  
  const { data: user, isLoading: isUserLoading, error: userError } = useDoc<UserProfile>(userRef);

  const servicesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: allServices, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  const form = useForm<UserManagementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      role: 'client',
      serviceIds: [],
    },
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
        name: user.name,
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
      name: values.name,
      role: values.role,
      serviceIds: values.role === 'professional' ? values.serviceIds : [],
    };
    
    updateDoc(userToUpdateRef, updatedData)
      .then(() => {
        toast({
          title: 'Usuário atualizado!',
          description: `Os dados de ${user.name} foram atualizados.`,
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

  const handleToggleDisable = async () => {
    if (!firestore || !user) return;
    setIsDisabling(true);
    const userToUpdateRef = doc(firestore, 'users', user.id);
    const newDisabledState = !user.disabled;
    
    updateDoc(userToUpdateRef, { disabled: newDisabledState })
      .then(() => {
        toast({
          title: `Usuário ${newDisabledState ? 'Desativado' : 'Reativado'}`,
          description: `${user.name} foi ${newDisabledState ? 'desativado' : 'reativado'} com sucesso.`,
        });
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userToUpdateRef.path,
          operation: 'update',
          requestResourceData: { disabled: newDisabledState },
        }));
        toast({
          variant: 'destructive',
          title: 'Erro na operação',
          description: 'Você não tem permissão para alterar o status deste usuário.',
        });
      })
      .finally(() => {
        setIsDisabling(false);
      });
  };

  const handleDeleteUser = async () => {
    if (!firestore || !user) return;
    setIsDeleting(true);

    const userToDeleteRef = doc(firestore, 'users', user.id);
    deleteDoc(userToDeleteRef)
      .then(() => {
        toast({
          title: 'Usuário Excluído!',
          description: `Os dados de ${user.name} foram removidos do sistema.`,
        });
        router.push('/customers');
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userToDeleteRef.path,
          operation: 'delete',
        }));
        toast({
          variant: 'destructive',
          title: 'Erro ao Excluir',
          description: 'Você não tem permissão para excluir este usuário.',
        });
      })
      .finally(() => {
        setIsDeleting(false);
        setIsAlertOpen(false);
      });
  };
  
  const isLoading = isAdminLoading || (adminProfile?.role === 'admin' && (isUserLoading || areServicesLoading));

  if (isLoading || !adminProfile) {
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
  
  if (userError) {
     return <div className="p-8 text-center text-destructive">Erro ao carregar os dados do usuário. Verifique suas permissões.</div>;
  }
  
  if (!user && adminProfile?.role === 'admin' && !isUserLoading) {
    return <div className="p-8 text-center text-destructive">Usuário não encontrado.</div>;
  }
  
  // Need to make sure `user` is loaded before rendering the form
  if (!user) {
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
          <CardDescription>Altere o nome, função e as permissões do usuário.</CardDescription>
        </CardHeader>
        <CardContent>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                          <Input placeholder="Nome do usuário" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
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

              {watchedRole === 'professional' && allServices && (
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

      <Card className="mt-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="font-headline text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>
            Estas ações são permanentes e devem ser usadas com cuidado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <div>
              <h3 className="font-semibold">
                {user.disabled ? 'Reativar Usuário' : 'Desativar Usuário'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {user.disabled ? 'Permitir que este usuário faça login novamente.' : 'Impedir que este usuário faça login.'}
              </p>
            </div>
            <Button variant={user.disabled ? 'secondary' : 'outline'} onClick={handleToggleDisable} disabled={isDisabling}>
              {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user.disabled ? 'Reativar' : 'Desativar'}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-dashed border-destructive p-4">
            <div>
              <h3 className="font-semibold text-destructive">Excluir Usuário</h3>
              <p className="text-sm text-muted-foreground">
                Excluir permanentemente os dados deste usuário do aplicativo.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente os dados do usuário da aplicação (perfil, etc.), mas não removerá sua conta de autenticação. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
