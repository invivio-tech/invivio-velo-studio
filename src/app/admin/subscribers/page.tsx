'use client';

import { useState, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUserProfile,
} from '@/firebase';
import type { UserProfile } from '@/firebase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Users,
  Search
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import SubscriberForm, { UserMembership, UserMembershipWithId } from '@/components/admin/SubscriberForm';
import SubscriberInvoicesModal from '@/components/admin/SubscriberInvoicesModal';
import type { MembershipPlanWithId } from '@/components/admin/MembershipPlanForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign } from 'lucide-react';

export default function AdminSubscribersPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');

  // Fetch memberships
  const membershipsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'userMemberships') : null),
    [firestore]
  );
  const {
    data: memberships,
    isLoading: areMembershipsLoading,
  } = useCollection<UserMembershipWithId>(membershipsCollection);

  // Fetch users for joining
  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollection);

  // Fetch plans for joining
  const plansCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'membershipPlans') : null),
    [firestore]
  );
  const { data: plans, isLoading: arePlansLoading } = useCollection<MembershipPlanWithId>(plansCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInvoicesOpen, setIsInvoicesOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<UserMembershipWithId | null>(null);
  const [selectedInvoicesMembership, setSelectedInvoicesMembership] = useState<UserMembershipWithId | null>(null);
  const [membershipToDelete, setMembershipToDelete] = useState<UserMembershipWithId | null>(null);

  // Join data
  const fullMemberships = useMemo(() => {
    if (!memberships || !users || !plans) return [];

    return memberships.map(m => {
      const user = users.find(u => u.id === m.userId);
      const plan = plans.find(p => p.id === m.planId);
      return {
        ...m,
        user,
        plan
      };
    }).filter(m => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return m.user?.name?.toLowerCase().includes(term) || 
             m.user?.email?.toLowerCase().includes(term) ||
             m.plan?.name?.toLowerCase().includes(term);
    }).sort((a, b) => {
      // Sort by status (active first) then by name
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (a.user?.name || '').localeCompare(b.user?.name || '');
    });
  }, [memberships, users, plans, searchTerm]);


  const handleSaveMembership = async (data: UserMembership | (UserMembership & { id: string })) => {
    if (!firestore) throw new Error("Firestore not available");

    if ('id' in data && data.id) {
      // Update
      const ref = doc(firestore, 'userMemberships', data.id);
      await updateDoc(ref, { ...data } as Record<string, any>);
      toast({
        title: 'Assinatura atualizada!',
        description: `Os dados da assinatura foram salvos com sucesso.`,
      });
    } else {
      // Create
      const colRef = collection(firestore, 'userMemberships');
      await addDoc(colRef, data);
      toast({
        title: 'Assinatura criada!',
        description: `A assinatura manual foi registrada.`,
      });
    }
  };

  const handleDeleteMembership = async () => {
    if (!membershipToDelete || !firestore) return;

    const ref = doc(firestore, 'userMemberships', membershipToDelete.id);

    try {
      await deleteDoc(ref);
      toast({
        title: 'Assinatura excluída!',
        description: `O registro foi removido permanentemente.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Excluir',
        description: 'Verifique as permissões do banco de dados.',
      });
    }

    setIsAlertOpen(false);
    setMembershipToDelete(null);
  };

  const openDeleteAlert = (m: UserMembershipWithId) => {
    setMembershipToDelete(m);
    setIsAlertOpen(true);
  };

  const openForm = (m?: UserMembershipWithId) => {
    setSelectedMembership(m || null);
    setIsFormOpen(true);
  };

  const openInvoices = (m: UserMembershipWithId) => {
    setSelectedInvoicesMembership(m);
    setIsInvoicesOpen(true);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isLoading = isProfileLoading || areMembershipsLoading || areUsersLoading || arePlansLoading;

  if (!isLoading && !isAdmin) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h1 className="text-3xl font-headline font-bold text-destructive">Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Ativo</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="text-amber-500 border-amber-500">Vencido</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Users className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Assinantes
          </h1>
        </div>
        <Button onClick={() => openForm()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Assinante Manual
        </Button>
      </div>
      <p className="text-muted-foreground">
        Gerencie os clientes que fazem parte do seu Clube de Vantagens.
      </p>

      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input 
          type="text" 
          placeholder="Buscar por nome ou plano..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button type="submit" variant="ghost" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4 mt-8">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!isLoading && fullMemberships && (
        <div className="grid gap-4 mt-8">
          {fullMemberships.map((m) => (
            <Card key={m.id} className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={m.user?.photoURL || ''} alt={m.user?.name || 'User'} />
                  <AvatarFallback className="font-headline font-bold">{m.user?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-headline font-bold text-lg">{m.user?.name || 'Usuário Removido'}</h3>
                  <p className="text-sm text-muted-foreground">{m.user?.email || m.userId}</p>
                </div>
              </div>

              <div className="flex-1 w-full sm:w-auto sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Plano</p>
                  <p className="font-medium truncate">{m.plan?.name || 'Plano Excluído'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Validade</p>
                  <p className="font-medium">{formatDate(m.currentPeriodEnd)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Usos este Mês</p>
                  <p className="font-medium">{m.usageThisMonth || 0} / {m.plan?.maxUsesPerMonth === 999 ? 'Ilimitado' : m.plan?.maxUsesPerMonth}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <div className="mt-1">{getStatusBadge(m.status)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button size="icon" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openInvoices(m)} title="Faturas">
                  <DollarSign className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => openForm(m)} title="Editar Assinatura">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => openDeleteAlert(m)} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          
          {fullMemberships.length === 0 && (
            <Card className="text-center p-12 border-dashed">
              <CardContent className="pt-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Nenhum assinante encontrado</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  {searchTerm ? 'Nenhum resultado para essa busca.' : 'Você ainda não tem assinantes no Clube de Vantagens. Clique em "Adicionar" para registrar manualmente.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <SubscriberForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        membership={selectedMembership}
        onSave={handleSaveMembership}
      />

      <SubscriberInvoicesModal
        isOpen={isInvoicesOpen}
        setIsOpen={setIsInvoicesOpen}
        membership={selectedInvoicesMembership}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o registro de assinatura deste cliente. 
              Ele perderá o acesso imediato aos benefícios do plano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMembership} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
