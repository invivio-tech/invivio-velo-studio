'use client';

import { useState } from 'react';
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
  useUserProfile,
  useMemoFirebase,
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
  PlaceHolderImages,
  type ImagePlaceholder,
} from '@/lib/placeholder-images';
import {
  PlusCircle,
  Pencil,
  Trash2,
  BookOpen,
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

export interface Service {
  name: string;
  description: string;
  price: number;
  duration: string;
  imageId?: string;
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
  } = useCollection<Service>(servicesCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithId | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceWithId | null>(null);

  const handleSaveService = (serviceData: Service | ServiceWithId): Promise<void> => {
    if (!firestore) return Promise.reject(new Error("Firestore not available"));

    if ('id' in serviceData && serviceData.id) {
      // Update
      const serviceRef = doc(firestore, 'services', serviceData.id);
      return updateDoc(serviceRef, serviceData as Service)
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

  const imagesMap = new Map<string, ImagePlaceholder>(
    PlaceHolderImages.map((img) => [img.id, img])
  );
  const isAdmin = userProfile?.role === 'admin';
  const isLoading = isProfileLoading || areServicesLoading;

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-0">
                <Skeleton className="aspect-[16/9] w-full" />
              </CardHeader>
              <div className="p-6">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <CardFooter>
                <Skeleton className="h-6 w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              Não foi possível carregar os serviços. Por favor, tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && services && (
        <>
          {services.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => {
                const image = service.imageId ? imagesMap.get(service.imageId) : null;
                return (
                  <Card key={service.id} className="flex flex-col overflow-hidden">
                    <CardHeader className="p-0 relative">
                      {image && (
                        <div className="relative aspect-[16/9] w-full">
                          <Image
                            src={image.imageUrl}
                            alt={image.description}
                            fill
                            className="object-cover"
                            data-ai-hint={image.imageHint}
                          />
                        </div>
                      )}
                      {!image && <div className="aspect-[16/9] w-full bg-muted" />}
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
