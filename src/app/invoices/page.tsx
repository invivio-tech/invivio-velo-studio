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
import { useToast } from '@/hooks/use-toast';
import { FileText, DollarSign, Wallet, ArrowLeft, ArrowRight, Printer, PlusCircle, TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  value: number;
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
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

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

  // Default commission to 25% if not set
  const commissionPercentage = settings?.professionalCommissionPercentage ?? 25;

  const isLoading = isUserLoading || isProfileLoading || appointmentsLoading || expensesLoading;

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
  const expenses = expensesRaw || [];
  const totalRevenue = viewData.reduce((acc, apt) => acc + Number(apt.servicePrice), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.value), 0);
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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !expenseDesc || !expenseValue || !expenseDate) return;

    setIsSubmittingExpense(true);
    try {
      const parts = expenseDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

      if (editingExpenseId) {
        const expenseRef = doc(firestore, 'expenses', editingExpenseId);
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
        const expensesColl = collection(firestore, 'expenses');
        await addDoc(expensesColl, {
          description: expenseDesc,
          value: parseFloat(expenseValue),
          date: Timestamp.fromDate(d)
        });
        toast({
          title: 'Despesa Adicionada',
          description: 'O valor foi registrado com sucesso e deduzido do caixa.',
        });
      }

      setIsExpenseOpen(false);
      setEditingExpenseId(null);
      setExpenseDesc('');
      setExpenseValue('');
      setExpenseDate(() => format(new Date(), 'yyyy-MM-dd'));
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

  const handleEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseDesc(expense.description);
    setExpenseValue(expense.value.toString());
    setExpenseDate(format(expense.date.toDate(), 'yyyy-MM-dd'));
    setIsExpenseOpen(true);
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (!firestore || !window.confirm(`Tem certeza que deseja excluir a despesa "${desc}"?`)) return;
    try {
      await deleteDoc(doc(firestore, 'expenses', id));
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
    setIsExpenseOpen(true);
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
        <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
        <TabsTrigger value="commissions">Comissões (Fechamento)</TabsTrigger>
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
              <p className="text-xs text-muted-foreground mt-1">{expenses.length} Transações registradas</p>
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
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nenhuma despesa registrada este mês.</TableCell>
                    </TableRow>
                  ) : (
                    [...expenses].sort((a, b) => b.date.seconds - a.date.seconds).map(exp => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{format(exp.date.toDate(), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">-{formatCurrency(exp.value)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => handleEditExpense(exp)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteExpense(exp.id, exp.description)} className="h-8 w-8 text-destructive">
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

      <TabsContent value="commissions" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Fechamento de Comissões</CardTitle>
            <CardDescription>Repasse dos serviços baseados no percentual configurado do estabelecimento ({commissionPercentage}%).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Total de Serviços</TableHead>
                  <TableHead>Receita Gerada</TableHead>
                  <TableHead className="text-right">Comissão a Pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(commissionsByProfessional).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum profissional com receita este mês.</TableCell>
                  </TableRow>
                ) : (
                  Object.values(commissionsByProfessional).map((prof, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{prof.name}</TableCell>
                      <TableCell>{prof.totalServices}</TableCell>
                      <TableCell>{formatCurrency(prof.totalRevenue)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(prof.commissionToPay)}</TableCell>
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
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sua Comissão Estimada</CardTitle>
              <Wallet className="h-4 w-4 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalComission)}</div>
              <p className="text-xs opacity-75 mt-1">Baseado nos {commissionPercentage}% pré-definidos.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Serviços Executados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{viewData.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Extrato de Serviços</CardTitle>
            <CardDescription>Todos os atendimentos finalizados por você neste mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Sua Parte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum serviço realizado ainda.</TableCell>
                  </TableRow>
                ) : (
                  [...viewData].sort((a, b) => b.startTime.seconds - a.startTime.seconds).map(apt => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">{format(apt.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>{apt.serviceName}</TableCell>
                      <TableCell>{apt.customerName}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(Number(apt.servicePrice) * (commissionPercentage / 100))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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

