'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUserProfile } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isToggling, setIsToggling] = useState(false);

  const userRef = useMemoFirebase(() => {
    if (firestore && userId) {
      return doc(firestore, 'users', userId);
    }
    return null;
  }, [firestore, userId]);
  
  const { data: client, isLoading: isClientLoading, error: clientError } = useDoc<UserProfile>(userRef);

  useEffect(() => {
    if (!isAdminLoading && adminProfile?.role !== 'admin') {
      router.push('/schedule');
    }
     if (!isClientLoading && client && client.role !== 'client') {
      // If the user ID does not belong to a client, redirect
      router.push('/clients');
    }
  }, [isAdminLoading, adminProfile, router, isClientLoading, client]);
  
  const handleToggleDisable = async () => {
    if (!firestore || !client) return;
    setIsToggling(true);
    const clientToUpdateRef = doc(firestore, 'users', client.id);
    const newDisabledState = !client.disabled;
    
    updateDoc(clientToUpdateRef, { disabled: newDisabledState })
      .then(() => {
        toast({
          title: `Cliente ${newDisabledState ? 'Desativado' : 'Reativado'}`,
          description: `${client.name} foi ${newDisabledState ? 'desativado' : 'reativado'} com sucesso.`,
        });
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: clientToUpdateRef.path,
          operation: 'update',
          requestResourceData: { disabled: newDisabledState },
        }));
        toast({
          variant: 'destructive',
          title: 'Erro na operação',
          description: 'Você não tem permissão para alterar o status deste cliente.',
        });
      })
      .finally(() => {
        setIsToggling(false);
      });
  };
  
  const isLoading = isAdminLoading || isClientLoading;

  if (isLoading || !client || adminProfile?.role !== 'admin') {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (clientError) {
     return <div className="p-8 text-center text-destructive">Erro ao carregar os dados do cliente. Verifique suas permissões.</div>;
  }
  
  if (!client && !isClientLoading) {
    return <div className="p-8 text-center text-destructive">Cliente não encontrado.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4 mb-4">
             <Button variant="outline" size="icon" asChild>
                <Link href="/clients">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-3xl font-headline font-bold tracking-tight">
                Gerenciar Cliente
            </h1>
        </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={client.photoURL ?? ''} alt={client.name} />
              <AvatarFallback>{client.name ? client.name.charAt(0).toUpperCase() : 'C'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-headline text-2xl">{client.name}</CardTitle>
              <CardDescription>{client.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Future content like points, recent activity can go here */}
          <p className="text-sm text-muted-foreground">Em breve: histórico de agendamentos, pontos de fidelidade e mais.</p>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mt-6">
        <CardHeader>
          <CardTitle className="font-headline">Status da Conta</CardTitle>
          <CardDescription>
            Ative ou desative o acesso do cliente à plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <div>
              <h3 className="font-semibold">
                {client.disabled ? 'Reativar Conta' : 'Desativar Conta'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {client.disabled ? 'Permitir que este cliente faça login novamente.' : 'Impedir que este cliente faça login.'}
              </p>
            </div>
            <Button variant={client.disabled ? 'secondary' : 'outline'} onClick={handleToggleDisable} disabled={isToggling}>
              {isToggling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {client.disabled ? 'Reativar' : 'Desativar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
