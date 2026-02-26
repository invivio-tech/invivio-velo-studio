'use client';

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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Pencil,
  Trash2,
  LayoutGrid,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import CategoryForm from '@/components/categories/CategoryForm';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface Category {
  name: string;
}

export type CategoryWithId = Category & { id: string };

export default function CategoriesPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const categoriesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'serviceCategories') : null),
    [firestore]
  );
  const {
    data: categories,
    isLoading: areCategoriesLoading,
    error,
  } = useCollection<CategoryWithId>(categoriesCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithId | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithId | null>(null);

  const handleSaveCategory = (categoryData: Category | CategoryWithId): Promise<void> => {
    if (!firestore) return Promise.reject(new Error("Firestore not available"));

    if ('id' in categoryData && categoryData.id) {
      // Update
      const categoryRef = doc(firestore, 'serviceCategories', categoryData.id);
      return updateDoc(categoryRef, categoryData as any)
        .then(() => {
          toast({
            title: 'Categoria atualizada!',
            description: `A categoria "${categoryData.name}" foi atualizada com sucesso.`,
          });
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: categoryRef.path,
            operation: 'update',
            requestResourceData: categoryData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
    } else {
      // Create
      const categoriesRef = collection(firestore, 'serviceCategories');
      return addDoc(categoriesRef, categoryData)
        .then(() => {
          toast({
            title: 'Categoria adicionada!',
            description: `A categoria "${categoryData.name}" foi adicionada com sucesso.`,
          });
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: categoriesRef.path,
            operation: 'create',
            requestResourceData: categoryData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
    }
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete || !firestore) return;

    const categoryRef = doc(firestore, 'serviceCategories', categoryToDelete.id);
    const categoryNameToDelete = categoryToDelete.name;

    deleteDoc(categoryRef)
      .then(() => {
        toast({
          title: 'Categoria excluída!',
          description: `A categoria "${categoryNameToDelete}" foi excluída.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: categoryRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao Excluir',
          description: 'Não foi possível excluir a categoria. Verifique suas permissões e se algum serviço ainda a utiliza.',
        });
      });

    setIsAlertOpen(false);
    setCategoryToDelete(null);
  };

  const openDeleteAlert = (category: CategoryWithId) => {
    setCategoryToDelete(category);
    setIsAlertOpen(true);
  };

  const openCategoryForm = (category?: CategoryWithId) => {
    setSelectedCategory(category || null);
    setIsFormOpen(true);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isLoading = isProfileLoading || areCategoriesLoading;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <LayoutGrid className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Categorias de Serviço
          </h1>
        </div>
        {isAdmin && (
          <Button onClick={() => openCategoryForm()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Gerenciar Categorias</CardTitle>
          <CardDescription>
            Agrupe seus serviços para facilitar o agendamento dos clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
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
            <p className="text-destructive text-center">
              Não foi possível carregar as categorias.
            </p>
          )}

          {!isLoading && !error && categories && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openCategoryForm(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openDeleteAlert(category)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Nenhuma categoria cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CategoryForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        category={selectedCategory}
        onSave={handleSaveCategory}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria "{categoryToDelete?.name}". Os serviços associados a ela precisarão de uma nova categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
