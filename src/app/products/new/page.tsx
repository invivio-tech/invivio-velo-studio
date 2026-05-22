'use client';

import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { useFirestore, useUserProfile } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import ProductForm from '@/components/store/ProductForm';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewProductPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  useEffect(() => {
    if (!isProfileLoading && (!userProfile || userProfile.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [userProfile, isProfileLoading, router]);

  const handleSave = async (values: any) => {
    if (!firestore) return;

    try {
      const productsRef = collection(firestore, 'products');
      await addDoc(productsRef, {
         ...values,
         createdAt: new Date().toISOString()
      });
      
      toast({
        title: 'Produto Adicionado!',
        description: `O produto "${values.name}" está agora no catálogo.`,
      });
      router.push('/products');
    } catch (serverError) {
      console.error(serverError);
      const permissionError = new FirestorePermissionError({
        path: 'products',
        operation: 'create',
        requestResourceData: values,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Falha ao Salvar',
        description: 'Verifique se você tem permissão ou tente novamente mais tarde.'
      });
    }
  };

  const isLoading = isProfileLoading || !userProfile || userProfile.role !== 'admin';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push('/products')}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Criar Produto</h1>
      </div>
      
      {isLoading ? (
        <Card className="w-full max-w-4xl">
           <CardHeader>
             <Skeleton className="h-6 w-32 mb-2" />
             <Skeleton className="h-4 w-64" />
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full md:col-span-2" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full md:col-span-2" />
             </div>
           </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="font-headline">Detalhes do Novo Item</CardTitle>
            <CardDescription>
              Preencha título, preços, estoque e fotos para adicionar o produto à loja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm onSave={handleSave} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
