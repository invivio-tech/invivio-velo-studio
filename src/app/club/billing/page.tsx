'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CheckCircle2, AlertCircle, Download, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MembershipInvoice {
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
  paymentLink?: string | null;
  createdAt: Timestamp;
}

export default function ClubBillingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const invoicesCollection = useMemoFirebase(
    () => {
      if (!firestore || !user?.uid) return null;
      return query(
        collection(firestore, 'membershipInvoices'),
        where('userId', '==', user.uid)
      );
    },
    [firestore, user?.uid]
  );
  
  const { data: invoices, isLoading: areInvoicesLoading } = useCollection<MembershipInvoice>(invoicesCollection);

  const sortedInvoices = useMemo(() => {
    if (!invoices) return [];
    return [...invoices].sort((a, b) => b.dueDate.seconds - a.dueDate.seconds);
  }, [invoices]);

  const pendingInvoices = useMemo(() => sortedInvoices.filter(inv => inv.status === 'pending'), [sortedInvoices]);
  const nextInvoice = pendingInvoices.length > 0 ? pendingInvoices[pendingInvoices.length - 1] : null;

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handlePayNow = () => {
    if (nextInvoice?.paymentLink) {
      window.open(nextInvoice.paymentLink, '_blank');
      return;
    }
    toast({
      title: 'Pagamento Presencial',
      description: 'Por favor, realize o pagamento no balcão da barbearia para que possamos dar baixa no sistema.',
    });
  };

  const isLoading = isUserLoading || areInvoicesLoading;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Receipt className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-tight">Meus Pagamentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie as faturas do seu Clube de Vantagens.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Status Panel */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Próximo Vencimento</CardTitle>
              </CardHeader>
              <CardContent>
                {nextInvoice ? (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      R$ {nextInvoice.amount.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground gap-1">
                      <Clock className="w-4 h-4" /> 
                      Vence em {format(nextInvoice.dueDate.toDate(), "dd 'de' MMMM", { locale: ptBR })}
                    </div>
                    <Button onClick={handlePayNow} className="w-full mt-4">
                      {nextInvoice.paymentLink ? 'Pagar Online' : 'Como Pagar'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center space-y-2 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
                    <p>Você não possui faturas pendentes no momento.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-none">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Os pagamentos da sua assinatura são processados via PIX ou Cartão diretamente no balcão da barbearia. Os comprovantes digitais aparecerão aqui após a baixa.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* History Panel */}
          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Histórico de Faturas</CardTitle>
                <CardDescription>Todas as faturas geradas para o seu plano</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedInvoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma fatura encontrada no seu histórico.</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Comprovante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {format(invoice.dueDate.toDate(), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              R$ {invoice.amount.toFixed(2).replace('.', ',')}
                            </TableCell>
                            <TableCell>
                              {invoice.status === 'paid' && <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">Pago</Badge>}
                              {invoice.status === 'pending' && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pendente</Badge>}
                              {invoice.status === 'cancelled' && <Badge variant="secondary">Cancelado</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {invoice.paymentLink && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDownload(invoice.paymentLink!)}
                                    className="text-primary hover:text-primary border-primary"
                                  >
                                    Pagar Online
                                  </Button>
                                )}
                                {invoice.attachmentUrl && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDownload(invoice.attachmentUrl!)}
                                    className="text-primary hover:text-primary"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Baixar Boleto
                                  </Button>
                                )}
                                {!invoice.attachmentUrl && !invoice.paymentLink && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
