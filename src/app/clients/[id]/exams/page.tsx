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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FlaskConical, Plus, Lock, CheckCircle2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const examSchema = z.object({
  examName: z.string().min(2, { message: 'O nome ou tipo do exame é obrigatório.' }),
  status: z.enum(['requested', 'completed']),
  resultsText: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface ExamRecord {
  id: string;
  examName: string;
  status: 'requested' | 'completed';
  resultsText: string;
  professionalId: string;
  professionalName: string;
  createdAt: Timestamp;
}

export default function ExamsPage() {
  const params = useParams();
  const userId = params?.id as string;
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const { planLimits, isLoading: isPlanLoading } = usePlanLimits();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: { examName: '', status: 'requested', resultsText: '' },
  });

  const statusWatcher = form.watch('status');

  const examsQuery = useMemo(() => {
    if (firestore && userId) {
      return query(
        collection(firestore, 'users', userId, 'exams'),
        orderBy('createdAt', 'desc')
      );
    }
    return null;
  }, [firestore, userId]);

  const { data: exams, isLoading: isExamsLoading } = useCollection<ExamRecord>(examsQuery);

  if (isPlanLoading) return <Skeleton className="h-96 w-full" />;

  if (!planLimits?.clinical?.labResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold font-headline">Módulo de Exames Indisponível</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          O módulo de Pedidos e Laudos de Exames não está disponível no plano atual.
        </p>
      </div>
    );
  }

  const onSubmit = async (values: ExamFormValues) => {
    if (!firestore || !userProfile || !userId) return;
    setIsSaving(true);
    
    try {
      const examsCol = collection(firestore, 'users', userId, 'exams');
      
      await addDoc(examsCol, {
        examName: values.examName,
        status: values.status,
        resultsText: values.resultsText || '',
        professionalId: userProfile.id,
        professionalName: userProfile.name,
        createdAt: Timestamp.now(),
      });
      
      toast({ title: 'Exame registrado!', description: 'O registro foi salvo no sistema.' });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving exam', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar o exame.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-purple-500" />
            Exames
          </h2>
          <p className="text-muted-foreground">Pedidos de exames laboratoriais, imagem e laudos.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Exame
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-purple-600" />
                Novo Pedido / Laudo
              </DialogTitle>
              <DialogDescription>
                Registre um pedido de exame ou transcreva os resultados de um exame realizado.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="examName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exame Solicitado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Hemograma Completo, Raio-X Tórax..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="requested">Apenas Solicitado (Aguardando Realização)</SelectItem>
                          <SelectItem value="completed">Concluído (Laudo / Resultados em mãos)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {statusWatcher === 'completed' && (
                  <FormField
                    control={form.control}
                    name="resultsText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resultados / Laudo (Transcrição)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva os resultados, valores de referência ou conclusões do laudo..." 
                            className="min-h-[120px] resize-y" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <div className="text-xs text-muted-foreground pt-2">
                  Nota: O envio de arquivos em anexo (PDF/Imagens) estará disponível em breve.
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                    {isSaving ? 'Salvando...' : 'Salvar Registro'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {isExamsLoading ? (
          [...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))
        ) : exams && exams.length > 0 ? (
          exams.map((exam) => (
            <Card key={exam.id} className="hover:border-purple-200 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{exam.examName}</CardTitle>
                  <CardDescription>
                    Criado em {exam.createdAt?.toDate ? format(exam.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : '-'} por {exam.professionalName}
                  </CardDescription>
                </div>
                {exam.status === 'completed' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Laudo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Solicitado
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {exam.status === 'completed' && exam.resultsText ? (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap mt-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                    <span className="font-medium text-slate-900 block mb-1">Resultados transcritos:</span>
                    {exam.resultsText}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic mt-2">
                    Aguardando paciente realizar o exame.
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            Nenhum exame solicitado ou laudo anexado.
          </div>
        )}
      </div>
    </div>
  );
}
