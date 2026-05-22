'use client';

import { useRouter, useParams } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUserProfile, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import ProductForm from '@/components/store/ProductForm';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/types/store';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const productRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'products', id) : null),
    [firestore, id]
  );
  
  const { data: product, isLoading: isProductLoading, error } = useDoc<Product>(productRef);

  useEffect(() => {
    if (!isProfileLoading && (!userProfile || userProfile.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [userProfile, isProfileLoading, router]);

  const handleSave = async (values: any) => {
    if (!firestore || !productRef) return;

    try {
      await updateDoc(productRef, {
         ...values,
         updatedAt: new Date().toISOString()
      });
      
      toast({
        title: 'Produto Atualizado!',
        description: `O produto "${values.name}" foi salvo com sucesso.`,
      });
      router.push('/products');
    } catch (serverError) {
      console.error(serverError);
      const permissionError = new FirestorePermissionError({
        path: productRef.path,
        operation: 'update',
        requestResourceData: values,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Falha ao Atualizar',
        description: 'Verifique se você tem permissão ou tente novamente mais tarde.'
      });
    }
  };

  const isLoading = isProfileLoading || isProductLoading || !userProfile || userProfile.role !== 'admin';

  if (!isLoading && error) {
    return (
       <div className="flex-1 p-8 text-center text-destructive">
          Não foi possível carregar as informações do produto.
       </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push('/products')}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Editar Produto</h1>
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
      ) : product ? (
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="font-headline">Ajustar os Detalhes</CardTitle>
            <CardDescription>
              Modifique preços, suba novas fotos ou altere o status de exibição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm initialData={product} onSave={handleSave} />
          </CardContent>
        </Card>
      ) : (
         <p>Produto inexistente.</p>
      )}
    </div>
  );
}
