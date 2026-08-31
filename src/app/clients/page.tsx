'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUserProfile,
} from '@/firebase';
import { collection, query, where, doc, runTransaction, Timestamp, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ContactRound, Search, Gift, Brain, MessageCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { PasswordResetDialog } from '@/components/admin/PasswordResetDialog';
import { Key, PlusCircle } from 'lucide-react';
import { NewClientDialog } from '@/components/admin/NewClientDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMClientData extends UserProfile {
  id: string;
  lastVisitDate?: any | null; // Firestore Timestamp
  avgReturnDays?: number | null;
  daysSinceLastVisit?: number | null;
  crmStatus?: 'NO_PRAZO' | 'ATRASADO' | 'RISCO_PERDA' | 'SEM_DADOS';
}

export default function ClientsPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Loyalty Points State
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [redeemClient, setRedeemClient] = useState<{ id: string, name: string, points: number } | null>(null);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemDesc, setRedeemDesc] = useState('Resgate de Saldo/Serviço');

  // Password Reset State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string, name: string } | null>(null);

  // New Client State
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleOpenReset = (clientId: string, clientName: string) => {
    setResetTarget({ id: clientId, name: clientName });
    setIsResetOpen(true);
  };

  const clientsQuery = useMemoFirebase(
    () =>
      firestore && userProfile?.role === 'admin'
        ? query(collection(firestore, 'users'), where('role', '==', 'client'))
        : null,
    [firestore, userProfile]
  );
  const { data: clients, isLoading: areClientsLoading } = useCollection<UserProfile>(clientsQuery);

  // AI CRM Calculation (now derived directly from saved User profile data to avoid huge reads)
  const crmClients = useMemo<CRMClientData[]>(() => {
    if (!clients) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return clients.map((client: any) => {
      let daysSinceLastVisit = null;
      let crmStatus: 'NO_PRAZO' | 'ATRASADO' | 'RISCO_PERDA' | 'SEM_DADOS' = 'SEM_DADOS';

      if (client.lastVisitDate) {
        const lastVisit = client.lastVisitDate.toDate ? client.lastVisitDate.toDate() : new Date(client.lastVisitDate);
        const lastVisitDay = new Date(lastVisit.getFullYear(), lastVisit.getMonth(), lastVisit.getDate());
        daysSinceLastVisit = Math.floor((today.getTime() - lastVisitDay.getTime()) / (1000 * 60 * 60 * 24));

        if (client.avgReturnDays !== undefined && client.avgReturnDays !== null) {
          const tolerance = 3;
          if (daysSinceLastVisit <= client.avgReturnDays + tolerance) {
            crmStatus = 'NO_PRAZO';
          } else if (daysSinceLastVisit <= (client.avgReturnDays * 1.5)) {
            crmStatus = 'ATRASADO';
          } else {
            crmStatus = 'RISCO_PERDA';
          }
        } else {
          // Fallback if no avg return days
          if (daysSinceLastVisit <= 30) crmStatus = 'NO_PRAZO';
          else crmStatus = 'ATRASADO';
        }
      }

      return {
        ...client,
        daysSinceLastVisit,
        crmStatus
      } as CRMClientData;
    });
  }, [clients]);

  const handleRecalculateCRM = async () => {
    if (!firestore || !clients) return;
    setIsRecalculating(true);
    toast({ title: 'Recalculando CRM...', description: 'Aguarde, processando histórico (isso pode levar 1 minuto).' });
    
    try {
      // Manual fetch ONCE to save reads
      const apptsSnap = await getDocs(query(collection(firestore, 'appointments'), where('status', '==', 'completed')));
      const allAppointments = apptsSnap.docs.map(d => d.data());
      
      const now = new Date();
      
      const batchPromises = clients.map(async (client) => {
        const clientAppts = allAppointments
          .filter((a: any) => a.customerId === client.id)
          .sort((a: any, b: any) => a.startTime.seconds - b.startTime.seconds);

        if (clientAppts.length === 0) return;

        const lastVisit = clientAppts[clientAppts.length - 1].startTime.toDate();
        let avgReturnDays = null;
        
        if (clientAppts.length > 1) {
          let totalDays = 0;
          let intervals = 0;
          for (let i = 1; i < clientAppts.length; i++) {
            const prev = clientAppts[i-1].startTime.toDate();
            const curr = clientAppts[i].startTime.toDate();
            const prevDay = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
            const currDay = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate());
            const diffDays = Math.floor((currDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
              totalDays += diffDays;
              intervals++;
            }
          }
          if (intervals > 0) {
            avgReturnDays = Math.round(totalDays / intervals);
          }
        }
        
        // Update user doc with new CRM metrics
        await runTransaction(firestore, async (transaction) => {
          const clientRef = doc(firestore, 'users', client.id);
          transaction.update(clientRef, {
            lastVisitDate: Timestamp.fromDate(lastVisit),
            avgReturnDays: avgReturnDays
          });
        });
      });
      
      await Promise.all(batchPromises);
      toast({ title: 'Sucesso', description: 'Radar CRM atualizado com sucesso!' });
    } catch(e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao processar.', variant: 'destructive' });
    } finally {
      setIsRecalculating(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!crmClients) return [];
    return crmClients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [crmClients, searchTerm]);
  
  // Agrupamentos para o Radar
  const overdueClients = useMemo(() => {
    return crmClients
      .filter(c => c.crmStatus === 'ATRASADO' || c.crmStatus === 'RISCO_PERDA')
      .sort((a, b) => (b.daysSinceLastVisit || 0) - (a.daysSinceLastVisit || 0));
  }, [crmClients]);

  const onTrackClients = useMemo(() => {
    return crmClients
      .filter(c => c.crmStatus === 'NO_PRAZO')
      .sort((a, b) => (a.daysSinceLastVisit || 0) - (b.daysSinceLastVisit || 0));
  }, [crmClients]);


  useEffect(() => {
    if (!isProfileLoading && userProfile?.role !== 'admin') {
      router.push('/schedule');
    }
  }, [isProfileLoading, userProfile, router]);

  const handleOpenRedeem = (clientId: string, clientName: string, clientPoints: number) => {
    setRedeemClient({ id: clientId, name: clientName, points: clientPoints || 0 });
    setRedeemAmount('');
    setIsRedeemOpen(true);
  };

  const handleProcessRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !redeemClient) return;

    const qty = parseInt(redeemAmount);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Valor Inválido', description: 'Insira uma quantidade válida.', variant: 'destructive' });
      return;
    }
    if (qty > redeemClient.points) {
      toast({ title: 'Saldo Insuficiente', description: 'O cliente não possui pontos suficientes.', variant: 'destructive' });
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const clientRef = doc(firestore, 'users', redeemClient.id);
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists()) throw new Error("Cliente não encontrado");

        const currentPoints = clientDoc.data().loyaltyPoints || 0;
        if (currentPoints < qty) throw new Error("Saldo atualizado é menor que o esperado");

        transaction.update(clientRef, { loyaltyPoints: currentPoints - qty });

        const txRef = doc(collection(firestore, 'loyaltyTransactions'));
        transaction.set(txRef, {
          clientId: redeemClient.id,
          type: 'redeemed',
          points: qty,
          description: redeemDesc || 'Resgate',
          date: Timestamp.now(),
        });
      });

      toast({ title: 'Resgate Concluído!', description: `Foram debitados ${qty} pontos de ${redeemClient.name}.` });
      setIsRedeemOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao resgatar', description: 'Não foi possível processar o resgate.', variant: 'destructive' });
    }
  };

  const handleSendWhatsapp = (client: CRMClientData) => {
    if (!client.phoneNumber) {
      toast({ title: 'Sem WhatsApp', description: 'O cliente não tem um telefone cadastrado.', variant: 'destructive' });
      return;
    }
    const phone = client.phoneNumber.replace(/\D/g, '');
    const firstVisit = !client.avgReturnDays;
    let message = '';
    
    if (client.crmStatus === 'RISCO_PERDA') {
      message = `Olá ${client.name}! Faz um tempinho que não te vemos por aqui. Saudade do seu visual em dia! Vamos agendar seu próximo horário conosco?`;
    } else {
      message = `Fala ${client.name}! Vi aqui que já faz ${client.daysSinceLastVisit} dias do seu último corte, vamos agendar para essa semana?`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (isProfileLoading || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <ContactRound className="w-8 h-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Gestão de Clientes
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Todos os Clientes</CardTitle>
            <CardDescription>Carregando dados...</CardDescription>
          </CardHeader>
          <CardContent>
             <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoadingData = areClientsLoading;

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ContactRound className="w-8 h-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Gestão de Clientes
          </h1>
        </div>
        <Button onClick={() => setIsNewClientOpen(true)} className="w-full sm:w-auto">
          <PlusCircle className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Tabs defaultValue="todos" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="todos">Todos os Clientes</TabsTrigger>
          <TabsTrigger value="radar" className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            Radar Inteligente (CRM)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Todos os Clientes</CardTitle>
              <CardDescription>Base completa de clientes cadastrados no sistema.</CardDescription>
              <div className="relative pt-4 max-w-md">
                <Search className="absolute left-3 top-[calc(50%+8px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pontos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingData && [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingData && filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={client.photoURL ?? ''} alt={client.name} />
                            <AvatarFallback>{client.name ? client.name.charAt(0).toUpperCase() : 'C'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.phoneNumber || client.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.disabled ? 'outline' : 'secondary'}>{client.disabled ? 'Inativo' : 'Ativo'}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.floor(client.loyaltyPoints || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleOpenRedeem(client.id, client.name, client.loyaltyPoints || 0)}>
                              <Gift className="mr-2 h-4 w-4" />
                              Resgatar Pontos
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push(`/clients/${client.id}/edit`)}>
                              Gerenciar
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenReset(client.id, client.name)} className="text-amber-600 dark:text-amber-400">
                              <Key className="mr-2 h-4 w-4" />
                              Redefinir Senha
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingData && filteredClients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">O Radar inteligente processa o histórico de visitas e agrupa os clientes com base na sua própria média de retorno.</p>
            <Button variant="outline" size="sm" onClick={handleRecalculateCRM} disabled={isRecalculating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
              Recalcular Histórico
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="font-headline text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> 
                  Radar de Recuperação ({overdueClients.length})
                </CardTitle>
                <CardDescription>
                  Clientes que já passaram da própria média de retorno. É hora de enviar uma mensagem!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingData && <Skeleton className="h-32 w-full" />}
                {!isLoadingData && overdueClients.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    Todos os seus clientes estão dentro do prazo de retorno. Excelente!
                  </div>
                )}
                {!isLoadingData && overdueClients.map(client => (
                  <div key={client.id} className="bg-background border rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col gap-1">
                      <p className="font-bold">{client.name}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-transparent">
                          Faz {client.daysSinceLastVisit} dias
                        </Badge>
                        {client.avgReturnDays && (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Média: {client.avgReturnDays} dias
                          </Badge>
                        )}
                        {client.crmStatus === 'RISCO_PERDA' && (
                          <Badge variant="destructive">Risco de Perda</Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleSendWhatsapp(client)} className="bg-green-600 hover:bg-green-700 text-white shadow-sm flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Lembrar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-headline text-primary flex items-center gap-2">
                  <ContactRound className="w-5 h-5" /> 
                  No Prazo ({onTrackClients.length})
                </CardTitle>
                <CardDescription>
                  Clientes recentes que estão dentro do seu período médio de retorno.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {isLoadingData && <Skeleton className="h-32 w-full" />}
                {!isLoadingData && onTrackClients.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    Nenhum cliente ativo recente encontrado.
                  </div>
                )}
                {!isLoadingData && onTrackClients.map(client => (
                  <div key={client.id} className="bg-background border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-sm">{client.name}</p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="text-muted-foreground">
                          Última vez: {client.daysSinceLastVisit} dias atrás
                        </span>
                        {client.avgReturnDays && (
                          <span className="text-muted-foreground">
                            (Retorna em média a cada {client.avgReturnDays} dias)
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleSendWhatsapp(client)} title="Falar no WhatsApp">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    
    <PasswordResetDialog 
        isOpen={isResetOpen} 
        onOpenChange={setIsResetOpen}
        userId={resetTarget?.id || ''}
        userName={resetTarget?.name || ''}
    />
    <NewClientDialog
        isOpen={isNewClientOpen}
        onOpenChange={setIsNewClientOpen}
    />
    </>
  );
}
