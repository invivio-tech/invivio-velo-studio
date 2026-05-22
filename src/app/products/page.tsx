'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUserProfile } from '@/firebase';
import { useEffect } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { 
  PlusCircle, 
  Pencil, 
  Trash2, 
  ShoppingBag, 
  Image as ImageIcon,
  Tag,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Product, ProductCategory } from '@/types/store';

export default function ProductsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  
  const categoriesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'productCategories') : null),
    [firestore]
  );
  
  const { data: products, isLoading: areProductsLoading, error } = useCollection<Product>(productsCollection);
  const { data: categories } = useCollection<ProductCategory>(categoriesCollection);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);

  const getCategoryName = (categoryId: string) => {
    if (!categories) return 'Carregando...';
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : 'Categoria Removida';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const handleDeleteProduct = () => {
    if (!productToDelete || !firestore) return;

    const productRef = doc(firestore, 'products', productToDelete.id);
    const productName = productToDelete.name;

    deleteDoc(productRef)
      .then(() => {
        toast({
          title: 'Produto excluído!',
          description: `O produto "${productName}" foi removido do catálogo.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: productRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao Excluir',
          description: 'Não foi possível excluir o produto. Verifique suas permissões.',
        });
      });

    setIsAlertOpen(false);
    setProductToDelete(null);
  };

  const openDeleteAlert = (product: Product) => {
    setProductToDelete(product);
    setIsAlertOpen(true);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isLoading = isProfileLoading || areProductsLoading;

  // Group products by category
  const groupedProducts = (products || []).reduce((acc, product) => {
    const categoryId = product.categoryId || 'uncategorized';
    if (!acc[categoryId]) acc[categoryId] = [];
    acc[categoryId].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Sort categories by name
  const sortedCategoryIds = Object.keys(groupedProducts).sort((a, b) => {
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    const nameA = getCategoryName(a);
    const nameB = getCategoryName(b);
    return nameA.localeCompare(nameB);
  });

  // Auto-expand on first load
  useEffect(() => {
    if (products && products.length > 0 && !hasInitializedExpanded) {
      setExpandedCategories(sortedCategoryIds);
      setHasInitializedExpanded(true);
    }
  }, [products, sortedCategoryIds, hasInitializedExpanded]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ShoppingBag className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Catálogo de Produtos
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {products && products.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (expandedCategories.length === sortedCategoryIds.length) {
                  setExpandedCategories([]);
                } else {
                  setExpandedCategories(sortedCategoryIds);
                }
              }}
            >
              {expandedCategories.length === sortedCategoryIds.length ? 'Recolher Todos' : 'Expandir Todos'}
            </Button>
          )}
          {isAdmin && (
            <Button asChild>
               <Link href="/products/new">
                 <PlusCircle className="mr-2 h-4 w-4" />
                 Novo Produto
               </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Seu Estoque e Prateleira</CardTitle>
          <CardDescription>
            Gerencie os produtos físicos que os clientes podem comprar na loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead>Nome e Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell>
                       <Skeleton className="h-5 w-40 mb-2" />
                       <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right space-x-2">
                       <Skeleton className="h-8 w-8 inline-block" />
                       <Skeleton className="h-8 w-8 inline-block" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && error && (
            <p className="text-destructive text-center py-6">
              Ocorreu um erro ao carregar o catálogo de produtos.
            </p>
          )}

          {!isLoading && !error && products && products.length > 0 ? (
            <Accordion 
              type="multiple" 
              value={expandedCategories} 
              onValueChange={setExpandedCategories}
              className="w-full space-y-4"
            >
              {sortedCategoryIds.map((catId) => (
                <AccordionItem key={catId} value={catId} className="border rounded-xl px-4 bg-muted/20">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Tag className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <span className="font-headline font-bold text-lg">
                          {catId === 'uncategorized' ? 'Sem Categoria' : getCategoryName(catId)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {groupedProducts[catId].length} {groupedProducts[catId].length === 1 ? 'produto' : 'produtos'}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6">
                    <div className="rounded-xl border bg-card overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[80px]">Foto</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead>Estoque</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedProducts[catId].map((product) => (
                            <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                {(product.imageURLs?.[0] || product.imageURL) ? (
                                  <img 
                                    src={product.imageURLs?.[0] || product.imageURL} 
                                    alt={product.name} 
                                    className="w-10 h-10 object-cover rounded-md border shadow-sm" 
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-muted rounded-md border flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-muted-foreground opacity-50" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-sm">{product.name}</div>
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {formatPrice(product.price)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {product.stock > 0 ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${product.stock < 5 ? 'bg-orange-500' : 'bg-green-500'}`} />
                                    {product.stock} un.
                                  </span>
                                ) : (
                                  <span className="text-destructive font-bold flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                    Esgotado
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {product.active ? (
                                  <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 text-[10px] uppercase font-bold tracking-wider">Na Vitrine</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-[10px] uppercase font-bold tracking-wider">Oculto</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-secondary/10 hover:text-secondary" onClick={() => router.push(`/products/${product.id}/edit`)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => openDeleteAlert(product)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            !isLoading && !error && (
              <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/30">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-headline font-semibold text-muted-foreground">O catálogo está vazio</h3>
                <p className="text-muted-foreground text-sm mt-2 mb-6 max-w-sm mx-auto">
                  Adicione seus primeiros produtos para que eles apareçam organizados por categoria aqui.
                </p>
                {isAdmin && (
                  <Button asChild variant="secondary">
                    <Link href="/products/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Novo Produto
                    </Link>
                  </Button>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão do produto "{productToDelete?.name}" é definitiva. 
              Ao confirmar, ele desaparecerá totalmente do catálogo e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
               Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
