'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUserProfile,
} from '@/firebase';
import { collection, query, where, doc, runTransaction, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ContactRound, Search, Gift } from "lucide-react";
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
import { Key } from 'lucide-react';

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

  const filteredClients = useMemo(() => {
    if (!clients) {
      return [];
    }
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

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
            <CardDescription>Gerencie o acesso e visualize os detalhes dos seus clientes.</CardDescription>
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
                {[...Array(3)].map((_, i) => (
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ContactRound className="w-8 h-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Gestão de Clientes
          </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Todos os Clientes</CardTitle>
          <CardDescription>Gerencie o acesso e visualize os detalhes dos seus clientes.</CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
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
              {(isProfileLoading || areClientsLoading) && [...Array(3)].map((_, i) => (
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
              {!(isProfileLoading || areClientsLoading) && filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={client.photoURL ?? ''} alt={client.name} />
                        <AvatarFallback>{client.name ? client.name.charAt(0).toUpperCase() : 'C'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
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
              {!areClientsLoading && filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resgatar Pontos</DialogTitle>
            <DialogDescription>
              O cliente <strong>{redeemClient?.name}</strong> possui <strong>{redeemClient?.points} pontos</strong> disponíveis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProcessRedeem} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rdmQty">Quantidade de Pontos a Resgatar/Descontar</Label>
              <Input
                id="rdmQty"
                type="number"
                step="1"
                min="1"
                required
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdmDesc">Justificativa (Aparecerá no extrato dele)</Label>
              <Input
                id="rdmDesc"
                type="text"
                required
                value={redeemDesc}
                onChange={(e) => setRedeemDesc(e.target.value)}
                placeholder="Ex. 1x Pomada Modeladora"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsRedeemOpen(false)}>Cancelar</Button>
              <Button type="submit">Confirmar Resgate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    <PasswordResetDialog 
        isOpen={isResetOpen} 
        onOpenChange={setIsResetOpen}
        userId={resetTarget?.id || ''}
        userName={resetTarget?.name || ''}
    />
    </>
  );
}
