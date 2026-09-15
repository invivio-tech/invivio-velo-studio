'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, orderBy, Timestamp, addDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { encryptClinicalData, decryptClinicalData } from '@/lib/encryption';
import { Activity, Lock, Plus, Calendar, User, FileEdit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const recordSchema = z.object({
  content: z.string().min(10, { message: 'A evolução precisa ter pelo menos 10 caracteres.' }),
});

type RecordFormValues = z.infer<typeof recordSchema>;

interface ClinicalRecord {
  id: string;
  content: string; // encrypted
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
}

export default function RecordsPage() {
  const params = useParams();
  const userId = params?.id as string;
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const { planLimits, isLoading: isPlanLoading } = usePlanLimits();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: { content: '' },
  });

  // Query subcollection users/{userId}/records
  const recordsQuery = useMemo(() => {
    if (firestore && userId) {
      return query(
        collection(firestore, 'users', userId, 'records'),
        orderBy('createdAt', 'desc')
      );
    }
    return null;
  }, [firestore, userId]);

  const { data: records, isLoading: isRecordsLoading } = useCollection<ClinicalRecord>(recordsQuery);

  if (isPlanLoading) return <Skeleton className="h-96 w-full" />;

  if (!planLimits?.clinical?.healthRecords) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold font-headline">Prontuário Indisponível</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          O módulo de Prontuário Clínico não está disponível no plano atual da clínica.
        </p>
      </div>
    );
  }

  const onSubmit = async (values: RecordFormValues) => {
    if (!firestore || !userProfile || !userId) return;
    setIsSaving(true);
    
    try {
      const recordsCol = collection(firestore, 'users', userId, 'records');
      const encryptedContent = encryptClinicalData(values.content) || '';
      
      await addDoc(recordsCol, {
        content: encryptedContent,
        authorId: userProfile.id,
        authorName: userProfile.name,
        createdAt: Timestamp.now(),
      });
      
      toast({ title: 'Evolução salva!', description: 'O registro foi adicionado ao prontuário.' });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving record', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a evolução.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Prontuário Clínico
          </h2>
          <p className="text-muted-foreground">Histórico de evoluções, anamneses e registros médicos.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Evolução
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-primary" />
                Registrar Evolução
              </DialogTitle>
              <DialogDescription>
                Este registro será salvo de forma segura e criptografada (Padrão HIPAA/LGPD).
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        Anotações Clínicas
                        <Badge variant="outline" className="text-xs font-normal border-green-200 bg-green-50 text-green-700">
                          <Lock className="mr-1 h-3 w-3" /> Criptografado
                        </Badge>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite as notas da sessão, observações, queixas, conduta, etc..." 
                          className="min-h-[250px] resize-y" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Assinar e Salvar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 mt-8 space-y-8">
        {isRecordsLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="pl-8 relative">
              <span className="absolute -left-[11px] top-2 h-5 w-5 rounded-full bg-slate-200 animate-pulse ring-4 ring-white" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
              </Card>
            </div>
          ))
        ) : records && records.length > 0 ? (
          records.map((record) => (
            <div key={record.id} className="pl-6 md:pl-10 relative">
              <span className="absolute -left-[11px] top-4 h-5 w-5 rounded-full bg-primary ring-4 ring-slate-50 flex items-center justify-center shadow-sm">
                <div className="h-2 w-2 rounded-full bg-white" />
              </span>
              <Card className="hover:shadow-md transition-shadow border-slate-200/60">
                <CardHeader className="pb-3 flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {record.createdAt?.toDate ? format(record.createdAt.toDate(), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR }) : 'Data desconhecida'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 text-primary/80 font-medium">
                      <User className="h-3 w-3" />
                      Por: {record.authorName}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">
                    <Lock className="mr-1 h-3 w-3" /> Seguro
                  </Badge>
                </CardHeader>
                <CardContent className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {decryptClinicalData(record.content)}
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <div className="pl-8 text-muted-foreground flex flex-col gap-2 pt-4">
            <p>Nenhuma evolução registrada ainda.</p>
            <Button variant="link" className="w-fit p-0 h-auto" onClick={() => setIsDialogOpen(true)}>
              Criar o primeiro registro
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
