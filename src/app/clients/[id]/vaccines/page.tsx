'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, orderBy, Timestamp, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Syringe, Plus, Lock, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const vaccineSchema = z.object({
  name: z.string().min(2, { message: 'O nome da vacina é obrigatório.' }),
  dose: z.string().min(1, { message: 'A dose é obrigatória (ex: 1ª Dose, Reforço).' }),
  lotNumber: z.string().optional(),
  appliedDate: z.string().min(1, { message: 'A data de aplicação é obrigatória.' }),
  nextDueDate: z.string().optional(),
});

type VaccineFormValues = z.infer<typeof vaccineSchema>;

interface VaccineRecord {
  id: string;
  name: string;
  dose: string;
  lotNumber: string;
  appliedDate: string; // ISO format or YYYY-MM-DD
  nextDueDate: string; // ISO format or YYYY-MM-DD
  professionalId: string;
  professionalName: string;
  createdAt: Timestamp;
}

export default function VaccinesPage() {
  const params = useParams();
  const userId = params?.id as string;
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const { planLimits, isLoading: isPlanLoading } = usePlanLimits();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<VaccineFormValues>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: { name: '', dose: '', lotNumber: '', appliedDate: '', nextDueDate: '' },
  });

  const vaccinesQuery = useMemo(() => {
    if (firestore && userId) {
      return query(
        collection(firestore, 'users', userId, 'vaccines'),
        orderBy('appliedDate', 'desc')
      );
    }
    return null;
  }, [firestore, userId]);

  const { data: vaccines, isLoading: isVaccinesLoading } = useCollection<VaccineRecord>(vaccinesQuery);

  if (isPlanLoading) return <Skeleton className="h-96 w-full" />;

  if (!planLimits?.clinical?.vaccination) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold font-headline">Módulo de Vacinas Indisponível</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          O módulo de Caderneta de Vacinação não está disponível no plano atual da clínica.
        </p>
      </div>
    );
  }

  const onSubmit = async (values: VaccineFormValues) => {
    if (!firestore || !userProfile || !userId) return;
    setIsSaving(true);
    
    try {
      const vaccinesCol = collection(firestore, 'users', userId, 'vaccines');
      
      await addDoc(vaccinesCol, {
        name: values.name,
        dose: values.dose,
        lotNumber: values.lotNumber || '',
        appliedDate: values.appliedDate,
        nextDueDate: values.nextDueDate || '',
        professionalId: userProfile.id,
        professionalName: userProfile.name,
        createdAt: Timestamp.now(),
      });
      
      toast({ title: 'Vacina registrada!', description: 'O registro foi adicionado à caderneta.' });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving vaccine', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a vacina.' });
    } finally {
      setIsSaving(false);
    }
  };

  const parseDate = (dateString: string) => {
    if (!dateString) return '-';
    // dateString format is YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
            <Syringe className="h-6 w-6 text-emerald-500" />
            Caderneta de Vacinas
          </h2>
          <p className="text-muted-foreground">Histórico de imunizações e acompanhamento de doses.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Vacina
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5 text-emerald-600" />
                Nova Aplicação de Vacina
              </DialogTitle>
              <DialogDescription>
                Adicione um novo registro à caderneta de imunização do paciente.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Vacina</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: V10, Antirrábica, Gripe..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dose / Reforço</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1ª Dose" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lote (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: L-93822" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appliedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Aplicação</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextDueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Próxima Dose (Opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isSaving ? 'Salvando...' : 'Salvar Registro'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Vacina</TableHead>
                <TableHead>Dose e Lote</TableHead>
                <TableHead>Data de Aplicação</TableHead>
                <TableHead>Próxima Dose</TableHead>
                <TableHead>Profissional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isVaccinesLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : vaccines && vaccines.length > 0 ? (
                vaccines.map((vaccine) => (
                  <TableRow key={vaccine.id}>
                    <TableCell className="font-semibold">{vaccine.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{vaccine.dose}</span>
                        {vaccine.lotNumber && <span className="text-xs text-muted-foreground">Lote: {vaccine.lotNumber}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {parseDate(vaccine.appliedDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vaccine.nextDueDate ? (
                        <div className="flex items-center gap-2">
                          <CalendarPlus className="h-4 w-4 text-amber-500" />
                          {parseDate(vaccine.nextDueDate)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{vaccine.professionalName}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhuma vacina registrada na caderneta.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
