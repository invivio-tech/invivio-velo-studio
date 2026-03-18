'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
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
  BookOpen,
  Star,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ServiceForm from '@/components/services/ServiceForm';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { CategoryWithId } from '@/app/categories/page';

export interface Service {
  name: string;
  description: string;
  price: number;
  duration: string;
  imageUrl?: string;
  categoryId: string;
  featured?: boolean;
  imagePrompt?: string;
}

export type ServiceWithId = Service & { id: string };

export default function ServicesPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const servicesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'services') : null),
    [firestore]
  );
  const {
    data: services,
    isLoading: areServicesLoading,
    error,
  } = useCollection<ServiceWithId>(servicesCollection);

  const categoriesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'serviceCategories') : null),
    [firestore]
  );
  const { data: categories, isLoading: areCategoriesLoading, error: categoriesError } = useCollection<CategoryWithId>(categoriesCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithId | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceWithId | null>(null);

  const servicesByCategory = useMemo(() => {
    if (!services || !categories) return [];

    const categoryMap = new Map(categories.map(cat => [cat.id, { ...cat, services: [] as ServiceWithId[] }]));
    const uncategorized = { id: 'uncategorized', name: 'Sem Categoria', services: [] as ServiceWithId[] };

    services.forEach(service => {
      if (service.categoryId && categoryMap.has(service.categoryId)) {
        categoryMap.get(service.categoryId)!.services.push(service);
      } else {
        uncategorized.services.push(service);
      }
    });

    const result = Array.from(categoryMap.values()).filter(cat => cat.services.length > 0);
    if (uncategorized.services.length > 0) {
      result.push(uncategorized);
    }
    return result;
  }, [services, categories]);


  const handleSaveService = (serviceData: Service | ServiceWithId): Promise<void> => {
    if (!firestore) return Promise.reject(new Error("Firestore not available"));

    if ('id' in serviceData && serviceData.id) {
      // Update
      const serviceRef = doc(firestore, 'services', serviceData.id);
      return updateDoc(serviceRef, { ...serviceData } as Record<string, any>)
        .then(() => {
          toast({
            title: 'Serviço atualizado!',
            description: `O serviço "${serviceData.name}" foi atualizado com sucesso.`,
          });
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: serviceRef.path,
            operation: 'update',
            requestResourceData: serviceData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
    } else {
      // Create
      const servicesRef = collection(firestore, 'services');
      return addDoc(servicesRef, serviceData)
        .then(() => {
          toast({
            title: 'Serviço adicionado!',
            description: `O serviço "${serviceData.name}" foi adicionado com sucesso.`,
          });
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: servicesRef.path,
            operation: 'create',
            requestResourceData: serviceData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
    }
  };

  const handleDeleteService = () => {
    if (!serviceToDelete || !firestore) return;

    const serviceRef = doc(firestore, 'services', serviceToDelete.id);
    const serviceNameToDelete = serviceToDelete.name;

    deleteDoc(serviceRef)
      .then(() => {
        toast({
          title: 'Serviço excluído!',
          description: `O serviço "${serviceNameToDelete}" foi excluído.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: serviceRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Erro ao Excluir',
          description: 'Ocorreu um erro ao excluir o serviço. Verifique suas permissões e tente novamente.',
        });
      });

    setIsAlertOpen(false);
    setServiceToDelete(null);
  };

  const openDeleteAlert = (service: ServiceWithId) => {
    setServiceToDelete(service);
    setIsAlertOpen(true);
  };

  const openServiceForm = (service?: ServiceWithId) => {
    setSelectedService(service || null);
    setIsFormOpen(true);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isLoading = isProfileLoading || areServicesLoading || areCategoriesLoading;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BookOpen className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Nossos Serviços
          </h1>
        </div>
        {isAdmin && (
          <Button onClick={() => openServiceForm()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Serviço
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Explore nossa gama de serviços de barbearia profissional.
      </p>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && (error || categoriesError) && (
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              Não foi possível carregar os serviços ou categorias. Por favor, tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && !categoriesError && services && servicesByCategory && (
        <>
          {services.length > 0 && categories ? (
            <Accordion type="multiple" className="w-full" defaultValue={(categories?.map(c => c.id) || []).concat(['uncategorized'])}>
              {servicesByCategory.map(category => (
                <AccordionItem value={category.id} key={category.id}>
                  <AccordionTrigger className="text-2xl font-headline hover:no-underline">{category.name} ({category.services.length})</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                      {category.services.map((service) => {
                        const image = service.imageUrl;
                        return (
                          <Card key={service.id} className="flex flex-col overflow-hidden">
                            <CardHeader className="p-0 relative">
                              {image ? (
                                <div className="relative aspect-[16/9] w-full">
                                  <img
                                    src={image}
                                    alt={service.name}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-[16/9] w-full bg-muted" />
                              )}
                              {isAdmin && (
                                <div className="absolute top-2 right-2 flex gap-2">
                                  <Button size="icon" variant="secondary" onClick={() => openServiceForm(service)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="destructive" onClick={() => openDeleteAlert(service)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              {service.featured && (
                                <Badge variant="secondary" className="absolute top-2 left-2 flex items-center gap-1 border-primary bg-primary/10 text-primary">
                                  <Star className="h-3 w-3" />
                                  Destaque
                                </Badge>
                              )}
                            </CardHeader>
                            <div className="flex flex-col flex-grow p-6">
                              <CardTitle className="font-headline text-2xl mb-2">{service.name}</CardTitle>
                              <CardDescription className="flex-grow">{service.description}</CardDescription>
                            </div>
                            <CardFooter className="flex justify-between items-center">
                              <span className="text-xl font-bold font-headline text-primary">
                                {`R$${service.price.toFixed(2).replace('.', ',')}`}
                              </span>
                              <Badge variant="secondary">{service.duration}</Badge>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card className="text-center p-8">
              <CardContent>
                <p className="text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
                {isAdmin && <p className="text-muted-foreground mt-2">Clique em "Novo Serviço" para começar.</p>}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ServiceForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        service={selectedService}
        onSave={handleSaveService}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o serviço "{serviceToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

