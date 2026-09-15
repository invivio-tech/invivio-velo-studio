'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useUserProfile, useDoc } from '@/firebase';
import type { UserProfile } from '@/firebase';
import { collection, query, orderBy, Timestamp, addDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Lock, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const prescriptionSchema = z.object({
  title: z.string().min(2, { message: 'O título/assunto é obrigatório.' }),
  medications: z.string().min(5, { message: 'Descreva os medicamentos e a posologia.' }),
  instructions: z.string().optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

interface PrescriptionRecord {
  id: string;
  title: string;
  medications: string;
  instructions: string;
  professionalId: string;
  professionalName: string;
  createdAt: Timestamp;
}

export default function PrescriptionsPage() {
  const params = useParams();
  const userId = params?.id as string;
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const { planLimits, isLoading: isPlanLoading } = usePlanLimits();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // User fetch for the print header
  const userRef = useMemo(() => {
    return firestore && userId ? doc(firestore, 'users', userId) : null;
  }, [firestore, userId]);
  const { data: clientData } = useDoc<UserProfile>(userRef);

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: { title: '', medications: '', instructions: '' },
  });

  const prescriptionsQuery = useMemo(() => {
    if (firestore && userId) {
      return query(
        collection(firestore, 'users', userId, 'prescriptions'),
        orderBy('createdAt', 'desc')
      );
    }
    return null;
  }, [firestore, userId]);

  const { data: prescriptions, isLoading: isPrescriptionsLoading } = useCollection<PrescriptionRecord>(prescriptionsQuery);

  if (isPlanLoading) return <Skeleton className="h-96 w-full" />;

  if (!planLimits?.clinical?.prescriptions) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold font-headline">Módulo de Prescrições Indisponível</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          O módulo de Receitas e Prescrições não está disponível no plano atual.
        </p>
      </div>
    );
  }

  const onSubmit = async (values: PrescriptionFormValues) => {
    if (!firestore || !userProfile || !userId) return;
    setIsSaving(true);
    
    try {
      const prescriptionsCol = collection(firestore, 'users', userId, 'prescriptions');
      
      await addDoc(prescriptionsCol, {
        title: values.title,
        medications: values.medications,
        instructions: values.instructions || '',
        professionalId: userProfile.id,
        professionalName: userProfile.name,
        createdAt: Timestamp.now(),
      });
      
      toast({ title: 'Prescrição salva!', description: 'A receita foi gerada com sucesso.' });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving prescription', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a prescrição.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (prescription: PrescriptionRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ variant: 'destructive', title: 'Erro de Pop-up', description: 'Por favor, permita pop-ups para imprimir a receita.'});
      return;
    }

    const patientName = clientData?.name || 'Paciente';
    const dateStr = prescription.createdAt?.toDate 
      ? format(prescription.createdAt.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) 
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receituário - ${patientName}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #2563eb; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
          .header p { margin: 5px 0 0 0; color: #666; }
          .patient-info { margin-bottom: 40px; font-size: 16px; }
          .patient-info strong { color: #111; }
          .content { min-height: 400px; }
          .medications { font-size: 18px; white-space: pre-wrap; margin-bottom: 30px; }
          .instructions { font-size: 16px; white-space: pre-wrap; color: #444; }
          .footer { margin-top: 60px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
          .signature-line { width: 300px; border-bottom: 1px solid #333; margin: 40px auto 10px auto; }
          .signature-name { font-weight: bold; font-size: 16px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Receituário</h1>
          <p>Prescrição Médica/Clínica</p>
        </div>
        
        <div class="patient-info">
          Para o(a) paciente: <strong>${patientName}</strong><br/>
          Data: ${dateStr}
        </div>

        <div class="content">
          <div class="medications"><strong>Uso:</strong><br/><br/>${prescription.medications}</div>
          ${prescription.instructions ? `<div class="instructions"><strong>Orientações Adicionais:</strong><br/><br/>${prescription.instructions}</div>` : ''}
        </div>

        <div class="footer">
          <div class="signature-line"></div>
          <div class="signature-name">${prescription.professionalName}</div>
          <p style="margin:5px 0 0 0; font-size: 14px; color:#666;">Assinatura do Profissional</p>
        </div>
        
        <div style="text-align: center; margin-top: 40px;" class="no-print">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">Imprimir Agora</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-500" />
            Receitas e Prescrições
          </h2>
          <p className="text-muted-foreground">Emissão de receitas, encaminhamentos e atestados.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nova Prescrição
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Criar Receituário
              </DialogTitle>
              <DialogDescription>
                Gere uma nova receita para o paciente. Você poderá imprimi-la logo após salvar.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título / Assunto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Receita Médica, Encaminhamento..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicamentos / Uso (Posologia)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Uso Oral:&#10;1. Medicamento X 500mg - Tomar 1 cp de 8/8h por 5 dias." 
                          className="min-h-[150px] resize-y" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orientações Adicionais (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Recomendações de dieta, repouso ou cuidados extras." 
                          className="min-h-[80px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {isSaving ? 'Salvando...' : 'Salvar e Gerar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {isPrescriptionsLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))
        ) : prescriptions && prescriptions.length > 0 ? (
          prescriptions.map((prescription) => (
            <Card key={prescription.id} className="hover:border-amber-200 transition-colors flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">{prescription.title}</CardTitle>
                <CardDescription>
                  Gerado em {prescription.createdAt?.toDate ? format(prescription.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : '-'} por {prescription.professionalName}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-3 opacity-80">
                  {prescription.medications}
                </div>
              </CardContent>
              <div className="p-4 pt-0 mt-auto border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-lg">
                <Button variant="outline" size="sm" onClick={() => handlePrint(prescription)} className="text-amber-700 hover:text-amber-800 hover:bg-amber-50">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            Nenhuma prescrição gerada para este paciente.
          </div>
        )}
      </div>
    </div>
  );
}
