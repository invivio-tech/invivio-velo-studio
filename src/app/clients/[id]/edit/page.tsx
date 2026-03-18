'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, where, orderBy, Timestamp, doc, updateDoc, runTransaction, addDoc } from 'firebase/firestore';
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
import { Loader2, ArrowLeft, Calendar, Scissors, Clock, AlertCircle, Award, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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

interface LoyaltyTransaction {
  id: string;
  clientId: string;
  type: 'earned' | 'deducted' | 'redeemed';
  points: number;
  description: string;
  date: Timestamp;
}

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
    const currentPoints = client.loyaltyPoints || 0;
    const newPoints = values.loyaltyPoints || 0;
    
    const updatedData: Partial<UserProfile> = {
      name: values.name,
      phoneNumber: values.phoneNumber,
      birthDate: values.birthDate,
      address: values.address,
      notes: values.notes,
      loyaltyPoints: newPoints,
    };

    try {
      await runTransaction(firestore, async (transaction) => {
        if (currentPoints !== newPoints) {
          const diff = newPoints - currentPoints;
          const txRef = doc(collection(firestore, 'loyaltyTransactions'));
          transaction.set(txRef, {
            clientId: userId,
            type: diff > 0 ? 'earned' : 'deducted',
            points: Math.abs(diff),
            description: 'Ajuste Manual pelo Administrador',
            date: Timestamp.now()
          });
        }
        transaction.update(clientToUpdateRef, updatedData);
      });

      toast({
        title: 'Cliente atualizado!',
        description: `Os dados de ${client.name} foram atualizados.`,
      });
    } catch (serverError: any) {
      console.error('Error updating client:', serverError);
      const permissionError = new FirestorePermissionError({
        path: clientToUpdateRef.path,
        operation: 'update',
        requestResourceData: updatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: serverError.code === 'permission-denied' 
          ? 'Você não tem permissão para alterar este cliente.' 
          : 'Ocorreu um erro ao salvar as alterações.',
      });
    } finally {
      setIsSaving(false);
    }
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

  const { data: appointments, isLoading: areAppointmentsLoading, error: appointmentsError } = useCollection<Appointment>(appointmentsQuery);

  // Fetch Loyalty Transactions
  const loyaltyTransactionsQuery = useMemoFirebase(() => {
    if (firestore && userId) {
      return query(
        collection(firestore, 'loyaltyTransactions'),
        where('clientId', '==', userId),
        orderBy('date', 'desc')
      );
    }
    return null;
  }, [firestore, userId]);

  const { data: transactions, isLoading: areTransactionsLoading, error: transactionsError } = useCollection<LoyaltyTransaction>(loyaltyTransactionsQuery);

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
          <CardTitle className="font-headline flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            Extrato de Fidelidade (Pontos)
          </CardTitle>
          <CardDescription>
            Histórico de todas as movimentações de pontos deste cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {areTransactionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : transactionsError ? (
            <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-semibold">Erro ao carregar pontos</p>
                <p className="opacity-80">{(transactionsError as any).message || 'Ocorreu um erro inesperado.'}</p>
              </div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Tipo</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs">
                      {format(tx.date.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn(
                        "text-[10px] uppercase font-bold",
                        tx.type === 'earned' && "border-emerald-200 text-emerald-700 bg-emerald-50",
                        tx.type === 'deducted' && "border-red-200 text-red-700 bg-red-50",
                        tx.type === 'redeemed' && "border-blue-200 text-blue-700 bg-blue-50"
                      )}>
                        {tx.type === 'earned' ? 'Crédito' : tx.type === 'deducted' ? 'Débito' : 'Resgate'}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-bold",
                      tx.type === 'earned' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {tx.type === 'earned' ? '+' : '-'}{tx.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <Award className="h-8 w-8 opacity-20" />
              <p>Nenhuma movimentação de pontos encontrada.</p>
            </div>
          )}
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
          ) : appointmentsError ? (
            <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-semibold">Erro ao carregar agendamentos</p>
                <p className="opacity-80">{(appointmentsError as any).message || 'Ocorreu um erro inesperado.'}</p>
              </div>
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
