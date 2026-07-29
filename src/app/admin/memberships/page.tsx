'use client';

import Link from 'next/link';

import { useState } from 'react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import MembershipPlanForm, { MembershipPlan, MembershipPlanWithId } from '@/components/admin/MembershipPlanForm';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PlanHealthDialog } from '@/components/admin/PlanHealthDialog';
import { Activity } from 'lucide-react';
import { useDoc } from '@/firebase';
import type { EstablishmentSettings } from '@/app/establishment/page';

export default function AdminMembershipsPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const plansCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'membershipPlans') : null),
    [firestore]
  );
  const {
    data: plans,
    isLoading: arePlansLoading,
    error,
  } = useCollection<MembershipPlanWithId>(plansCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isHealthDialogOpen, setIsHealthDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanWithId | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlanWithId | null>(null);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);
  const commissionPercentage = settings?.professionalCommissionPercentage || 25;

  const handleSavePlan = (planData: MembershipPlan | MembershipPlanWithId): Promise<void> => {
    if (!firestore) return Promise.reject(new Error("Firestore not available"));

    if ('id' in planData && planData.id) {
      // Update
      const planRef = doc(firestore, 'membershipPlans', planData.id);
      return updateDoc(planRef, { ...planData } as Record<string, any>)
        .then(() => {
          toast({
            title: 'Plano atualizado!',
            description: `O plano "${planData.name}" foi atualizado com sucesso.`,
          });
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: planRef.path,
            operation: 'update',
            requestResourceData: planData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
    } else {
      // Create
      const plansRef = collection(firestore, 'membershipPlans');
      return addDoc(plansRef, planData)
        .then(() => {
          toast({
            title: 'Plano criado!',
            description: `O plano "${planData.name}" foi criado com sucesso.`,
          });
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: plansRef.path,
            operation: 'create',
            requestResourceData: planData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
    }
  };

  const handleDeletePlan = () => {
    if (!planToDelete || !firestore) return;

    const planRef = doc(firestore, 'membershipPlans', planToDelete.id);
    const planNameToDelete = planToDelete.name;

    deleteDoc(planRef)
      .then(() => {
        toast({
          title: 'Plano excluído!',
          description: `O plano "${planNameToDelete}" foi excluído permanentemente.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: planRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao Excluir',
          description: 'Ocorreu um erro ao excluir o plano. Verifique suas permissões.',
        });
      });

    setIsAlertOpen(false);
    setPlanToDelete(null);
  };

  const openDeleteAlert = (plan: MembershipPlanWithId) => {
    setPlanToDelete(plan);
    setIsAlertOpen(true);
  };

  const openPlanForm = (plan?: MembershipPlanWithId) => {
    setSelectedPlan(plan || null);
    setIsFormOpen(true);
  };

  const openHealthDialog = (plan: MembershipPlanWithId) => {
    setSelectedPlan(plan);
    setIsHealthDialogOpen(true);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isLoading = isProfileLoading || arePlansLoading;

  if (!isLoading && !isAdmin) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h1 className="text-3xl font-headline font-bold text-destructive">Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Sparkles className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Planos de Assinatura
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30">
            <Link href="/admin/memberships/dashboard">
              <Activity className="mr-2 h-4 w-4" />
              Dashboard Completo
            </Link>
          </Button>
          <Button onClick={() => openPlanForm()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Plano
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">
        Crie pacotes recorrentes (Clubes de Vantagem) para fidelizar seus clientes e garantir receita mensal.
      </p>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && error && (
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              Não foi possível carregar os planos. Por favor, tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && plans && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col overflow-hidden ${!plan.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="p-0 relative">
                {plan.imageUrl ? (
                  <div className="relative aspect-[16/9] w-full">
                    <img
                      src={plan.imageUrl}
                      alt={plan.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] w-full bg-muted" />
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button size="icon" variant="secondary" onClick={() => openHealthDialog(plan)} title="Ver Saúde do Plano" className="text-purple-600">
                    <Activity className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => openPlanForm(plan)} title="Editar Plano">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => openDeleteAlert(plan)} title="Excluir Plano">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {!plan.isActive && (
                  <Badge variant="destructive" className="absolute top-2 left-2 flex items-center gap-1 border-destructive">Inativo</Badge>
                )}
                {plan.isActive && (
                  <Badge variant="secondary" className="absolute top-2 left-2 flex items-center gap-1 border-primary bg-primary/10 text-primary">Ativo</Badge>
                )}
              </CardHeader>
              <div className="flex flex-col flex-grow p-6">
                <CardTitle className="font-headline text-2xl pr-8 mb-2">{plan.name}</CardTitle>
                <CardDescription className="flex-grow">{plan.description}</CardDescription>
              </div>
              
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-primary font-headline">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Serviços Inclusos:</p>
                    <div className="flex flex-wrap gap-1">
                      {plan.includedServiceIds?.length > 0 ? (
                        <Badge variant="outline">{plan.includedServiceIds.length} selecionados</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nenhum serviço</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Limite de Uso Mensal:</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.maxUsesPerMonth === 999 ? 'Ilimitado' : `${plan.maxUsesPerMonth} agendamentos por mês`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {plans.length === 0 && (
            <Card className="col-span-full text-center p-8 border-dashed">
              <CardContent>
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Nenhum plano criado</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Crie o primeiro plano de assinaturas para a sua barbearia (ex: "Cabelo e Barba Ilimitados").
                </p>
                <Button className="mt-4" onClick={() => openPlanForm()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Primeiro Plano
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <MembershipPlanForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        plan={selectedPlan}
        onSave={handleSavePlan}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Excluir o plano "{planToDelete?.name}" afetará a visualização dele no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanHealthDialog 
        isOpen={isHealthDialogOpen}
        onOpenChange={setIsHealthDialogOpen}
        plan={selectedPlan}
        commissionPercentage={commissionPercentage}
      />
    </div>
  );
}
