'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection } from 'firebase/firestore';
import { createAccountByAdmin } from '@/firebase/auth/client';
import type { ServiceWithId } from '@/app/services/page';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório e deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres.' }),
  role: z.enum(['client', 'professional', 'admin']),
  serviceIds: z.array(z.string()).optional(),
  phoneNumber: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type NewUserFormValues = z.infer<typeof formSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const servicesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: allServices, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'professional',
      serviceIds: [],
      phoneNumber: '',
      birthDate: '',
      address: '',
      notes: '',
    },
  });

  // Redirect if not admin
  useEffect(() => {
    if (!isAdminLoading && adminProfile?.role !== 'admin') {
      router.push('/schedule');
    }
  }, [isAdminLoading, adminProfile, router]);

  const watchedRole = form.watch('role');

  async function onSubmit(values: NewUserFormValues) {
    setIsSaving(true);
    const { error } = await createAccountByAdmin({
      name: values.name,
      email: values.email,
      pass: values.password,
      role: values.role as 'professional' | 'admin' | 'client',
      serviceIds: values.role === 'professional' ? values.serviceIds : [],
      phoneNumber: values.phoneNumber,
      birthDate: values.birthDate,
      address: values.address,
      notes: values.notes,
    });

    setIsSaving(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar membro',
        description: error.code === 'auth/email-already-in-use' ? 'Este e-mail já está em uso.' : 'Não foi possível criar o membro.',
      });
    } else {
      toast({
        title: 'Membro criado!',
        description: `O membro ${values.name} foi criado com sucesso.`,
      });
      router.push('/team');
    }
  }

  const isLoading = isAdminLoading || areServicesLoading;

  if (isLoading || !adminProfile || adminProfile.role !== 'admin' || !allServices) {
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
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
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
        <UserPlus className="w-8 h-8 text-secondary" />
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Adicionar Novo Membro
        </h1>
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline">Dados do Membro</CardTitle>
          <CardDescription>Crie uma conta para um novo profissional, administrador ou cliente.</CardDescription>
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
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Senha com no mínimo 6 caracteres" {...field} />
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
                        <SelectItem value="professional">Profissional</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(watchedRole === 'client' || watchedRole === 'professional') && (
                <div className="space-y-6 rounded-md border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Dados Pessoais (Opcional)</h3>
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(99) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Endereço completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedRole === 'client' && (
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas Internas sobre o Cliente</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Preferências, alergias, ou outras anotações sobre o cliente." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

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
                  <Link href="/team">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Membro
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
