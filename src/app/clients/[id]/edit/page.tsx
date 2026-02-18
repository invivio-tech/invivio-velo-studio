'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, where, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUserProfile, useCollection } from '@/firebase';
import type { UserProfile } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Calendar, Scissors, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  phoneNumber: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  loyaltyPoints: z.coerce.number().min(0, { message: 'Os pontos não podem ser negativos.' }).optional(),
});

type ClientFormValues = z.infer<typeof formSchema>;

interface Appointment {
  id: string;
  serviceName: string;
  professionalName: string;
  startTime: Timestamp;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  price: number;
}


export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const userRef = useMemoFirebase(() => {
    if (firestore && userId && adminProfile?.role === 'admin') {
      return doc(firestore, 'users', userId);
    }
    return null;
  }, [firestore, userId, adminProfile]);

  const { data: client, isLoading: isClientLoading, error: clientError } = useDoc<UserProfile>(userRef);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      birthDate: '',
      address: '',
      notes: '',
      loyaltyPoints: 0,
    },
  });

  useEffect(() => {
    if (!isAdminLoading && adminProfile?.role !== 'admin') {
      router.push('/schedule');
    }
    if (!isClientLoading && client && client.role !== 'client') {
      router.push('/clients');
    }
  }, [isAdminLoading, adminProfile, router, isClientLoading, client]);

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || '',
        phoneNumber: client.phoneNumber || '',
        birthDate: client.birthDate || '',
        address: client.address || '',
        notes: client.notes || '',
        loyaltyPoints: client.loyaltyPoints || 0,
      });
    }
  }, [client, form]);

  async function onSubmit(values: ClientFormValues) {
    if (!firestore || !client) return;
    setIsSaving(true);

    const clientToUpdateRef = doc(firestore, 'users', client.id);
    const updatedData: Partial<UserProfile> = {
      name: values.name,
      phoneNumber: values.phoneNumber,
      birthDate: values.birthDate,
      address: values.address,
      notes: values.notes,
      loyaltyPoints: values.loyaltyPoints,
    };

    updateDoc(clientToUpdateRef, updatedData)
      .then(() => {
        toast({
          title: 'Cliente atualizado!',
          description: `Os dados de ${client.name} foram atualizados.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: clientToUpdateRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar',
          description: 'Você não tem permissão para alterar este cliente.',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const handleToggleDisable = async () => {
    if (!firestore || !client) return;
    setIsToggling(true);
    const clientToUpdateRef = doc(firestore, 'users', client.id);
    const newDisabledState = !client.disabled;

    updateDoc(clientToUpdateRef, { disabled: newDisabledState })
      .then(() => {
        toast({
          title: `Cliente ${newDisabledState ? 'Desativado' : 'Reativado'}`,
          description: `${client.name} foi ${newDisabledState ? 'desativado' : 'reativado'} com sucesso.`,
        });
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: clientToUpdateRef.path,
          operation: 'update',
          requestResourceData: { disabled: newDisabledState },
        }));
        toast({
          variant: 'destructive',
          title: 'Erro na operação',
          description: 'Você não tem permissão para alterar o status deste cliente.',
        });
      })
      .finally(() => {
        setIsToggling(false);
      });
  };

  // Fetch Appointments
  const appointmentsQuery = useMemoFirebase(() => {
    if (firestore && userId) {
      return query(
        collection(firestore, 'appointments'),
        where('customerId', '==', userId),
        orderBy('startTime', 'desc')
      );
    }
    return null;
  }, [firestore, userId]);

  const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      completed: 'bg-green-100 text-green-800 hover:bg-green-100',
      cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
      'no-show': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    };
    const labels: Record<string, string> = {
      scheduled: 'Agendado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      'no-show': 'Não Compareceu',
    };
    return <Badge className={styles[status] || styles.scheduled} variant="outline">{labels[status] || status}</Badge>;
  };

  const isLoading = isAdminLoading || isClientLoading;

  if (isLoading || !client || adminProfile?.role !== 'admin') {
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (clientError) {
    return <div className="p-8 text-center text-destructive">Erro ao carregar os dados do cliente. Verifique suas permissões.</div>;
  }

  if (!client && !isClientLoading) {
    return <div className="p-8 text-center text-destructive">Cliente não encontrado.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Gerenciar Cliente
        </h1>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline">Editar Dados do Cliente</CardTitle>
          <CardDescription>
            Atualize as informações de {client.name}. O e-mail não pode ser alterado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={client.email || ''} readOnly disabled />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <Input placeholder="Endereço do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Internas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Preferências, alergias, ou outras anotações sobre o cliente." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Card className="mt-6 border-secondary/20 bg-secondary/5">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-secondary" />
                    Programa de Fidelidade
                  </CardTitle>
                  <CardDescription>
                    Gerencie os pontos de fidelidade deste cliente manualmente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="loyaltyPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pontos Atuais</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mt-6">
        <CardHeader>
          <CardTitle className="font-headline">Status da Conta</CardTitle>
          <CardDescription>
            Ative ou desative o acesso do cliente à plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <div>
              <h3 className="font-semibold">
                {client.disabled ? 'Reativar Conta' : 'Desativar Conta'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {client.disabled ? 'Permitir que este cliente faça login novamente.' : 'Impedir que este cliente faça login.'}
              </p>
            </div>
            <Button variant={client.disabled ? 'secondary' : 'outline'} onClick={handleToggleDisable} disabled={isToggling}>
              {isToggling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {client.disabled ? 'Reativar' : 'Desativar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Agendamentos
          </CardTitle>
          <CardDescription>
            Visualize o histórico completo de serviços deste cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {areAppointmentsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {format(appointment.startTime.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{appointment.serviceName}</TableCell>
                    <TableCell>{appointment.professionalName}</TableCell>
                    <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <Calendar className="h-8 w-8 opacity-20" />
              <p>Nenhum agendamento encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
