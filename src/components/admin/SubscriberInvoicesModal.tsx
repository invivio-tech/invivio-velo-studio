'use client';

import * as React from 'react';
import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, CheckCircle, Trash2, Paperclip, Download, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import type { UserMembershipWithId } from './SubscriberForm';
import { Input } from '@/components/ui/input';

export interface MembershipInvoice {
  id: string;
  membershipId: string;
  userId: string;
  planId: string;
  amount: number;
  dueDate: Timestamp;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: Timestamp | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: Timestamp;
}

type SubscriberInvoicesModalProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  membership: UserMembershipWithId | null;
};

export default function SubscriberInvoicesModal({ isOpen, setIsOpen, membership }: SubscriberInvoicesModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateQuantity, setGenerateQuantity] = useState(1);
  const [generateInitialDate, setGenerateInitialDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const invoicesCollection = useMemoFirebase(
    () => {
      if (!firestore || !membership?.id) return null;
      return query(
        collection(firestore, 'membershipInvoices'),
        where('membershipId', '==', membership.id)
      );
    },
    [firestore, membership?.id]
  );
  
  const { data: invoices, isLoading } = useCollection<MembershipInvoice>(invoicesCollection);

  const sortedInvoices = React.useMemo(() => {
    if (!invoices) return [];
    return [...invoices].sort((a, b) => b.dueDate.seconds - a.dueDate.seconds);
  }, [invoices]);

  const handleCreateInvoice = async () => {
    if (!firestore || !membership || !generateInitialDate || generateQuantity < 1) return;
    setIsCreating(true);
    try {
      const parts = generateInitialDate.split('-');
      const startYear = parseInt(parts[0], 10);
      const startMonth = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const startDay = parseInt(parts[2], 10);

      const promises = [];

      for (let i = 0; i < generateQuantity; i++) {
        // addMonths equivalent without timezone shifting issues
        const dueDate = new Date(startYear, startMonth + i, startDay, 23, 59, 59, 999);

        const newInvoice = {
          membershipId: membership.id,
          userId: membership.userId,
          planId: membership.planId,
          amount: membership.plan?.price || 0,
          dueDate: Timestamp.fromDate(dueDate),
          status: 'pending',
          createdAt: Timestamp.now(),
        };

        promises.push(addDoc(collection(firestore, 'membershipInvoices'), newInvoice));
      }

      await Promise.all(promises);

      toast({
        title: generateQuantity > 1 ? 'Faturas geradas!' : 'Fatura gerada!',
        description: `${generateQuantity} nova(s) fatura(s) adicionada(s) à lista.`,
      });
      
      setShowGenerateForm(false);
      setGenerateQuantity(1);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar fatura',
        description: e.message || 'Tente novamente.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'membershipInvoices', invoiceId), {
        status: 'paid',
        paidAt: Timestamp.now(),
      });
      toast({
        title: 'Fatura paga!',
        description: 'Baixa registrada com sucesso.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao dar baixa',
        description: e.message || 'Tente novamente.',
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!firestore) return;
    if (!confirm('Tem certeza que deseja excluir esta fatura?')) return;
    try {
      await deleteDoc(doc(firestore, 'membershipInvoices', invoiceId));
      toast({
        title: 'Fatura excluída',
        description: 'A fatura foi removida.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: e.message || 'Tente novamente.',
      });
    }
  };

  const handleFileUpload = async (invoiceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;

    setUploadingInvoiceId(invoiceId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'invoices');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro no upload');
      }

      const data = await res.json();
      
      await updateDoc(doc(firestore, 'membershipInvoices', invoiceId), {
        attachmentUrl: data.url,
        attachmentName: file.name,
      });

      toast({
        title: 'Anexo salvo!',
        description: 'O arquivo foi vinculado à fatura com sucesso.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: e.message || 'Verifique o tamanho do arquivo ou a conexão.',
      });
    } finally {
      setUploadingInvoiceId(null);
      // reset input value
      event.target.value = '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Paga</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-amber-500 border-amber-500">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faturas de {membership?.user?.name || 'Cliente'}</DialogTitle>
          <DialogDescription>
            Plano: {membership?.plan?.name} ({formatCurrency(membership?.plan?.price || 0)}/mês)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col mb-4 mt-2 border rounded-md p-4 bg-muted/20">
          {!showGenerateForm ? (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Adicione faturas pendentes para este cliente.</span>
              <Button onClick={() => setShowGenerateForm(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Gerar Faturas
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Configurar Faturas</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowGenerateForm(false)}>Cancelar</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Data do 1º Vencimento</label>
                  <Input 
                    type="date" 
                    value={generateInitialDate} 
                    onChange={(e) => setGenerateInitialDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Quantidade (Meses)</label>
                  <Input 
                    type="number" 
                    min={1}
                    max={120}
                    value={generateQuantity} 
                    onChange={(e) => setGenerateQuantity(parseInt(e.target.value) || 1)} 
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleCreateInvoice} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar e Gerar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Anexo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Carregando faturas...
                  </TableCell>
                </TableRow>
              ) : sortedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Nenhuma fatura gerada para este assinante.
                  </TableCell>
                </TableRow>
              ) : (
                sortedInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {format(inv.dueDate.toDate(), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{formatCurrency(inv.amount)}</TableCell>
                    <TableCell>
                      {getStatusBadge(inv.status)}
                      {inv.status === 'paid' && inv.paidAt && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          em {format(inv.paidAt.toDate(), 'dd/MM/yy')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {inv.attachmentUrl ? (
                        <a href={inv.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-blue-500 hover:underline">
                          <Download className="h-3 w-3 mr-1" />
                          {inv.attachmentName || 'Baixar Boleto'}
                        </a>
                      ) : (
                        <div className="text-xs text-muted-foreground">Sem anexo</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* Botão de Upload customizado disfarçado de Label */}
                        <label className={`cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 ${uploadingInvoiceId === inv.id ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="application/pdf,image/*"
                            onChange={(e) => handleFileUpload(inv.id, e)}
                          />
                          {uploadingInvoiceId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        </label>

                        {inv.status !== 'paid' && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleMarkAsPaid(inv.id)}
                            title="Dar baixa"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteInvoice(inv.id)}
                          title="Excluir fatura"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
