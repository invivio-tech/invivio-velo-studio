'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useUserProfile, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { FileText, DollarSign, Wallet, ArrowLeft, ArrowRight, Printer, PlusCircle, TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  value: number;
  date: Timestamp;
}

interface ProfessionalTransaction {
  id: string;
  professionalId: string;
  professionalName: string;
  amount: number;
  type: 'payout' | 'adjustment';
  date: Timestamp;
}

interface Appointment {
  id: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  serviceName: string;
  professionalName: string;
  customerName: string;
  servicePrice: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

interface EstablishmentSettings {
  professionalCommissionPercentage?: number;
  name?: string;
}

export default function InvoicesPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());

  // Form State
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseValue, setExpenseValue] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutProfId, setPayoutProfId] = useState('');
  const [payoutProfName, setPayoutProfName] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Handle month navigation
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Determine time range for the current month view
  const startOfCurrentMonth = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const endOfCurrentMonth = useMemo(() => endOfMonth(currentDate), [currentDate]);

  // Firestore Refs
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  // We query by date range to avoid needing multiple composite indexes
  const appointmentsRef = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let q = query(
        collection(firestore, 'appointments'),
        where('startTime', '>=', Timestamp.fromDate(startOfCurrentMonth)),
        where('startTime', '<=', Timestamp.fromDate(endOfCurrentMonth))
      );
      return q;
    },
    [firestore, startOfCurrentMonth, endOfCurrentMonth]
  );
  const { data: appointmentsRaw, isLoading: appointmentsLoading } = useCollection<Appointment>(appointmentsRef);

  const expensesRef = useMemoFirebase(
    () => {
      if (!firestore || userProfile?.role !== 'admin') return null;
      let q = query(
        collection(firestore, 'expenses'),
        where('date', '>=', Timestamp.fromDate(startOfCurrentMonth)),
        where('date', '<=', Timestamp.fromDate(endOfCurrentMonth))
      );
      return q;
    },
    [firestore, startOfCurrentMonth, endOfCurrentMonth, userProfile?.role]
  );
  const { data: expensesRaw, isLoading: expensesLoading } = useCollection<Expense>(expensesRef);

  const recurringExpensesRef = useMemoFirebase(
    () => {
      if (!firestore || userProfile?.role !== 'admin') return null;
      return collection(firestore, 'recurringExpenses');
    },
    [firestore, userProfile?.role]
  );
  const { data: recurringExpensesRaw, isLoading: recurringExpensesLoading } = useCollection<Expense>(recurringExpensesRef);

  // --- Virtual Account Queries ---
  const allAppointmentsRef = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let q = query(
        collection(firestore, 'appointments'),
        where('status', '==', 'completed')
      );
      if (userProfile?.role === 'professional' && user?.uid) {
        q = query(q, where('professionalId', '==', user.uid));
      }
      return q;
    },
    [firestore, userProfile?.role, user?.uid]
  );
  const { data: allAppointmentsRaw, isLoading: allApptsLoading } = useCollection<Appointment>(allAppointmentsRef);

  const transactionsRef = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let q: any = collection(firestore, 'professionalTransactions');
      if (userProfile?.role === 'professional' && user?.uid) {
        q = query(q, where('professionalId', '==', user.uid));
      }
      return q;
    },
    [firestore, userProfile?.role, user?.uid]
  );
  const { data: transactionsRaw, isLoading: txsLoading } = useCollection<ProfessionalTransaction>(transactionsRef);

  // Default commission to 25% if not set
  const commissionPercentage = settings?.professionalCommissionPercentage ?? 25;

  // --- Virtual Account Calculations ---
  const virtualAccounts = useMemo(() => {
    const acc: Record<string, { professionalId: string, name: string, totalEarned: number, totalPaid: number, balance: number }> = {};

    allAppointmentsRaw?.forEach(apt => {
      const pId = apt.professionalId;
      if (!acc[pId]) acc[pId] = { professionalId: pId, name: apt.professionalName || 'Desconhecido', totalEarned: 0, totalPaid: 0, balance: 0 };
      acc[pId].totalEarned += Number(apt.servicePrice) * (commissionPercentage / 100);
    });

    transactionsRaw?.forEach(tx => {
      const pId = tx.professionalId;
      if (!acc[pId]) acc[pId] = { professionalId: pId, name: tx.professionalName || 'Desconhecido', totalEarned: 0, totalPaid: 0, balance: 0 };
      acc[pId].totalPaid += tx.amount;
    });

    Object.values(acc).forEach(v => v.balance = v.totalEarned - v.totalPaid);
    return acc;
  }, [allAppointmentsRaw, transactionsRaw, commissionPercentage]);

  const isLoading = isUserLoading || isProfileLoading || appointmentsLoading || expensesLoading || recurringExpensesLoading || allApptsLoading || txsLoading;

  if (isLoading || !userProfile) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Common formatting helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Base Data Processing
  // For standard revenue, we compute based on "completed" status appointments
  // For no-show we could (if we charged a fee), but currently only completed has full price guaranteed.
  const completedAppointments = appointmentsRaw?.filter(a => a.status === 'completed') || [];

  // Filter based on user role
  const role = userProfile.role;

  let viewData = completedAppointments;
  if (role === 'professional') {
    viewData = completedAppointments.filter(a => a.professionalId === user?.uid);
  } else if (role === 'client') {
    // Clients shouldn't access this page anymore based on user request, but just in case:
    viewData = [];
  }

  // --- Calculations for Admin ---
  const rawExpenses = expensesRaw?.map(e => ({ ...e, isRecurring: false })) || [];
  const rawRecurring = recurringExpensesRaw || [];

  // Project recurring expenses onto current month
  const projectedRecurring = rawRecurring
    .filter(re => re.date.seconds <= endOfCurrentMonth.getTime() / 1000)
    .map(re => {
      const reDate = re.date.toDate();
      const virtualDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), reDate.getDate());
      return {
        ...re,
        date: Timestamp.fromDate(virtualDate),
        isRecurring: true,
      };
    });

  const allExpenses = [...rawExpenses, ...projectedRecurring].sort((a, b) => b.date.seconds - a.date.seconds);

  const totalRevenue = viewData.reduce((acc, apt) => acc + Number(apt.servicePrice), 0);
  const totalExpenses = allExpenses.reduce((acc, exp) => acc + Number(exp.value), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Calculate commissions grouped by professional
  const commissionsByProfessional = viewData.reduce((acc, apt) => {
    const profName = apt.professionalName || 'Desconhecido';
    const profId = apt.professionalId;
    if (!acc[profId]) {
      acc[profId] = {
        name: profName,
        totalServices: 0,
        totalRevenue: 0,
        commissionToPay: 0,
      };
    }
    acc[profId].totalServices += 1;
    acc[profId].totalRevenue += Number(apt.servicePrice);
    acc[profId].commissionToPay += Number(apt.servicePrice) * (commissionPercentage / 100);
    return acc;
  }, {} as Record<string, { name: string, totalServices: number, totalRevenue: number, commissionToPay: number }>);

  const handlePrintReceipt = (tx: ProfessionalTransaction) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const estabName = settings?.name || 'Barbearia';

    const html = `
      <html>
        <head>
          <title>Recibo - ${tx.professionalName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { color: #666; }
            .content { line-height: 1.6; font-size: 16px; margin-bottom: 50px; }
            .value { font-size: 20px; font-weight: bold; background: #f9f9f9; padding: 15px; text-align: center; border: 1px dashed #ccc; margin: 30px 0; }
            .signatures { display: flex; justify-content: space-around; margin-top: 80px; }
            .sig-line { width: 40%; border-top: 1px solid #333; text-align: center; padding-top: 10px; color: #666; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="title">${estabName}</div>
            <div class="subtitle">Recibo de Pagamento de Comissão</div>
          </div>
          
          <div class="content">
            <p>Recebi de <strong>${estabName}</strong>, a importância de:</p>
            <div class="value">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
            </div>
            <p>Referente ao saque/acerto de comissões por serviços prestados.</p>
            <p><strong>Data de Pagamento do Saque:</strong> ${format(tx.date.toDate(), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}</p>
          </div>

          <div class="signatures">
            <div class="sig-line">
              <strong>${tx.professionalName}</strong><br>
              Profissional
            </div>
            <div class="sig-line">
              <strong>${estabName}</strong><br>
              Administração
            </div>
          </div>
          
          <div class="footer">
            Documento gerado eletronicamente pelo sistema de gestão. ID: ${tx.id}
          </div>
        </body>
      </html>
    `;

    receiptWindow.document.write(html);
    receiptWindow.document.close();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !expenseDesc || !expenseValue || !expenseDate) return;

    setIsSubmittingExpense(true);
    try {
      const parts = expenseDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

      if (editingExpenseId) {
        const targetColl = isRecurring ? 'recurringExpenses' : 'expenses';
        const expenseRef = doc(firestore, targetColl, editingExpenseId);
        await updateDoc(expenseRef, {
          description: expenseDesc,
          value: parseFloat(expenseValue),
          date: Timestamp.fromDate(d)
        });
        toast({
          title: 'Despesa Atualizada',
          description: 'A despesa foi editada com sucesso.',
        });
      } else {
        const targetColl = isRecurring ? 'recurringExpenses' : 'expenses';
        const expensesColl = collection(firestore, targetColl);
        await addDoc(expensesColl, {
          description: expenseDesc,
          value: parseFloat(expenseValue),
          date: Timestamp.fromDate(d)
        });
        toast({
          title: 'Despesa Adicionada',
          description: isRecurring ? 'A despesa fixa foi cadastrada e será deduzida todos os meses.' : 'O valor foi registrado com sucesso e deduzido do caixa.',
        });
      }

      setIsExpenseOpen(false);
      setEditingExpenseId(null);
      setExpenseDesc('');
      setExpenseValue('');
      setExpenseDate(() => format(new Date(), 'yyyy-MM-dd'));
      setIsRecurring(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar despesa',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleEditExpense = (expense: Expense & { isRecurring: boolean }) => {
    setEditingExpenseId(expense.id);
    setExpenseDesc(expense.description);
    setExpenseValue(expense.value.toString());
    setExpenseDate(format(expense.date.toDate(), 'yyyy-MM-dd'));
    setIsRecurring(expense.isRecurring);
    setIsExpenseOpen(true);
  };

  const handleDeleteExpense = async (id: string, desc: string, isFromRecurring: boolean) => {
    if (!firestore) return;
    const msg = isFromRecurring
      ? `Tem certeza que deseja excluir a despesa fixa "${desc}"?\nLembrando que excluí-la afetará o faturamento de todos os meses, passados e futuros.`
      : `Tem certeza que deseja excluir a despesa "${desc}"?`;

    if (!window.confirm(msg)) return;
    try {
      const targetColl = isFromRecurring ? 'recurringExpenses' : 'expenses';
      await deleteDoc(doc(firestore, targetColl, id));
      toast({
        title: 'Despesa Excluída',
        description: 'A despesa foi removida do sistema.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir esta despesa.',
      });
    }
  };

  const handleOpenNewExpense = () => {
    setEditingExpenseId(null);
    setExpenseDesc('');
    setExpenseValue('');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRecurring(false);
    setIsExpenseOpen(true);
  };

  const handleOpenPayout = (profId: string, profName: string, balance: number) => {
    setPayoutProfId(profId);
    setPayoutProfName(profName);
    setPayoutAmount(balance.toFixed(2));
    setIsPayoutOpen(true);
  };

  const handleProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !payoutProfId || !payoutAmount) return;

    try {
      await addDoc(collection(firestore, 'professionalTransactions'), {
        professionalId: payoutProfId,
        professionalName: payoutProfName,
        amount: parseFloat(payoutAmount),
        type: 'payout',
        date: Timestamp.now(),
      });
      toast({ title: 'Pagamento Registrado', description: 'O saldo da conta virtual foi atualizado.' });
      setIsPayoutOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível registrar o pagamento.' });
    }
  };

  // --- View Renders ---

  const renderMonthNavigation = () => (
    <div className="flex items-center justify-between bg-card border rounded-md p-2 mb-6">
      <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Mês Anterior
      </Button>
      <h2 className="text-lg font-headline font-semibold capitalize">
        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
      </h2>
      <Button variant="ghost" size="sm" onClick={handleNextMonth}>
        Próximo Mês
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  const renderAdminView = () => (
    <Tabs defaultValue="cashflow" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="cashflow">Fluxo de Caixa Mensal</TabsTrigger>
        <TabsTrigger value="virtualaccount">Contas Virtuais (Comissões)</TabsTrigger>
      </TabsList>

      <TabsContent value="cashflow" className="space-y-4">
        <div className="flex justify-end mb-4">
          <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
            <Button onClick={handleOpenNewExpense}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Despesa
            </Button>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingExpenseId ? 'Editar Despesa' : 'Registrar Nova Despesa'}</DialogTitle>
                <DialogDescription>
                  Insira os detalhes técnicos da despesa para subtraí-la do faturamento.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data da Despesa</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Descrição</Label>
                  <Input
                    id="desc"
                    placeholder="Ex: Aluguel, Produtos, Energia..."
                    required
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="val">Valor (R$)</Label>
                  <Input
                    id="val"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50.00"
                    required
                    value={expenseValue}
                    onChange={(e) => setExpenseValue(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2 pb-2">
                  <Switch
                    id="isRecurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    disabled={!!editingExpenseId}
                  />
                  <Label htmlFor="isRecurring" className="cursor-pointer">Despesa Fixa (Todo mês)</Label>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={isSubmittingExpense}>
                    {isSubmittingExpense ? 'Salvando...' : 'Salvar Despesa'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-emerald-50 text-emerald-900 border-b border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50">
              <CardTitle className="text-sm font-medium">Entradas (Faturamento)</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{viewData.length} Serviços concluídos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-destructive/10 text-destructive border-b border-destructive/20">
              <CardTitle className="text-sm font-medium">Saídas (Despesas)</CardTitle>
              <TrendingDown className="h-4 w-4" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">{allExpenses.length} Transações registradas</p>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm border-0 font-medium">Lucro Líquido Parcial</CardTitle>
              <DollarSign className="h-4 w-4 opacity-75" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{formatCurrency(netProfit)}</div>
              <p className="text-xs opacity-75 mt-1">Sem considerar repasses e impostos extra</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Receitas (Mês Atual)</CardTitle>
              <CardDescription>Resumo de todos os serviços prestados que geraram caixa.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhum serviço faturado este mês.</TableCell>
                    </TableRow>
                  ) : (
                    // Sort by most recent inside the month
                    [...viewData].sort((a, b) => b.startTime.seconds - a.startTime.seconds).map(apt => (
                      <TableRow key={apt.id}>
                        <TableCell className="font-medium">{format(apt.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell>{apt.serviceName}</TableCell>
                        <TableCell>{apt.professionalName}</TableCell>
                        <TableCell>{apt.customerName}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-semibold dark:text-emerald-400">{formatCurrency(apt.servicePrice)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Despesas</CardTitle>
              <CardDescription>Resumo dos custos mensais declarados.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhuma despesa para este mês.</TableCell>
                    </TableRow>
                  ) : (
                    allExpenses.map(exp => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{format(exp.date.toDate(), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>
                          {exp.description}
                          {exp.isRecurring && <Badge variant="outline" className="ml-2 bg-secondary/50 text-[10px]">Fixa</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-destructive font-semibold">-{formatCurrency(exp.value)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => handleEditExpense(exp)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteExpense(exp.id, exp.description, exp.isRecurring)} className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="virtualaccount" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Carteira dos Profissionais</CardTitle>
            <CardDescription>O saldo na "Conta Virtual" não zera a não ser que você realize pagamentos (Saques/Acertos). Mantenha o controle do quanto cada um acumulou e precisa receber.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Geração Total Histórica</TableHead>
                  <TableHead>Total Pago (Saques)</TableHead>
                  <TableHead className="text-right">Saldo Atual (A Pagar)</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(virtualAccounts).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhum profissional com histórico de comissões.</TableCell>
                  </TableRow>
                ) : (
                  Object.values(virtualAccounts).map((prof, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{prof.name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(prof.totalEarned)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(prof.totalPaid)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400 text-lg">{formatCurrency(prof.balance)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenPayout(prof.professionalId, prof.name, prof.balance)} disabled={prof.balance <= 0}>Realizar Saque</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Realizar Pagamento (Saque)</DialogTitle>
              <DialogDescription>
                Você está prestes a transferir o saldo virtual de <strong>{payoutProfName}</strong>.
                Ao confirmar, este valor será descontado da conta dele, registrando que você realizou o pagamento.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProcessPayout} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="payoutAmt">Valor a Pagar / Sacar (R$)</Label>
                <Input
                  id="payoutAmt"
                  type="number"
                  step="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsPayoutOpen(false)}>Cancelar</Button>
                <Button type="submit">Confirmar Saque</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card className="mt-8 border-dashed bg-muted/20">
          <CardHeader>
            <CardTitle className="text-sm">Produção Limitada a este mês ({format(currentDate, "MMMM yyyy", { locale: ptBR })})</CardTitle>
            <CardDescription>Apenas a título de curiosidade, veja o quanto eles geraram **estritamente neste mês focado**. Mas pague eles pelo botão de "Saque" acima baseando-se no **Saldo Atual**.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Comissão Gerada no Mês {format(currentDate, "MM/yyyy")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(commissionsByProfessional).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-12 text-muted-foreground text-xs">Sem produção no mês selecionado.</TableCell>
                  </TableRow>
                ) : (
                  Object.values(commissionsByProfessional).map((prof, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{prof.name}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(prof.commissionToPay)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </TabsContent>
    </Tabs>
  );

  const renderProfessionalView = () => {
    const totalComission = totalRevenue * (commissionPercentage / 100);
    const profWallet = virtualAccounts[user!.uid];
    const balance = profWallet ? profWallet.balance : 0;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Seu Saldo Total (Conta Virtual)</CardTitle>
              <Wallet className="h-4 w-4 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{formatCurrency(balance)}</div>
              <p className="text-xs opacity-75 mt-1">Este é o valor acumulado que a barbearia lhe deve atualmente.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balanço do Mês Aberto</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalComission)}</div>
              <p className="text-xs text-muted-foreground mt-1">Estimativa de ganhos referentes apenas ao mês que você filtrou na tela.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Extrato de Serviços</CardTitle>
              <CardDescription>Atendimentos finalizados por você (Ganhos).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Sua Parte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nenhum serviço realizado ainda.</TableCell>
                    </TableRow>
                  ) : (
                    [...viewData].sort((a, b) => b.startTime.seconds - a.startTime.seconds).map(apt => (
                      <TableRow key={apt.id}>
                        <TableCell className="font-medium">{format(apt.startTime.toDate(), "dd/MM", { locale: ptBR })}</TableCell>
                        <TableCell className="truncate max-w-[120px]" title={apt.serviceName}>{apt.serviceName}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">+{formatCurrency(Number(apt.servicePrice) * (commissionPercentage / 100))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extrato de Pagamentos</CardTitle>
              <CardDescription>Saques transferidos para você pela barbearia.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data do Saque</TableHead>
                    <TableHead className="text-right">Valor Recebido</TableHead>
                    <TableHead className="text-right">Comprovante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!transactionsRaw || transactionsRaw.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Você ainda não possui pagamentos emitidos.</TableCell>
                    </TableRow>
                  ) : (
                    [...transactionsRaw].sort((a, b) => b.date.seconds - a.date.seconds).map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{format(tx.date.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell className="text-right text-blue-600 font-bold">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Ver Recibo" onClick={() => handlePrintReceipt(tx)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };


  if (role === 'client') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Wallet className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h1 className="text-2xl font-headline font-bold tracking-tight text-center">Acesso Restrito</h1>
        <p className="text-muted-foreground text-center max-w-md">
          A seção de faturamento está disponível apenas para a administração e profissionais do estabelecimento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Faturamento e Recibos</h1>
      </div>

      {renderMonthNavigation()}

      {role === 'admin' && renderAdminView()}
      {role === 'professional' && renderProfessionalView()}
    </div>
  );
}

