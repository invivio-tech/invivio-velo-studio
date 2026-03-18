'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUserProfile, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { logout, resetPassword } from '@/firebase/auth/client';
import { Loader2 } from 'lucide-react';
import ProfessionalScheduleSettings from '@/components/schedule/ProfessionalScheduleSettings';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  phoneNumber: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export default function AccountPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      birthDate: '',
      address: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || '',
        phoneNumber: userProfile.phoneNumber || '',
        birthDate: userProfile.birthDate || '',
        address: userProfile.address || '',
      });
    }
  }, [userProfile, form]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!firestore || !user) return;
    setIsSaving(true);

    const userRef = doc(firestore, 'users', user.uid);
    const updatedData: Partial<UserProfile> = {
      name: values.name,
      phoneNumber: values.phoneNumber,
      birthDate: values.birthDate,
      address: values.address,
    };

    // Update Firestore document
    const updateFirestorePromise = updateDoc(userRef, updatedData)
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // Re-throw to be handled by Promise.all
      });

    const promises = [updateFirestorePromise];

    // Update Firebase Auth profile if name changed
    if (user.displayName !== values.name) {
      const auth = getAuth();
      if (auth.currentUser) {
        const updateAuthProfilePromise = updateProfile(auth.currentUser, { displayName: values.name });
        promises.push(updateAuthProfilePromise);
      }
    }

    try {
      await Promise.all(promises);
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar suas informações. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    setIsResettingPassword(true);
    const error = await resetPassword(user.email);
    setIsResettingPassword(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar e-mail',
        description: 'Não foi possível enviar o link de redefinição. Tente novamente.',
      });
    } else {
      toast({
        title: 'E-mail enviado!',
        description: 'Enviamos um link de redefinição para o seu e-mail cadastrado.',
      });
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Minha Conta
      </h1>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline">Informações do Perfil</CardTitle>
          <CardDescription>
            Atualize seus dados pessoais. O e-mail não pode ser alterado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ) : user && userProfile ? (
            <>
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Avatar do usuário'} />
                  <AvatarFallback>
                    {userProfile.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{userProfile.name}</p>
                  <p className="text-muted-foreground">{userProfile.email}</p>
                </div>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(99) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu endereço completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={handleResetPassword} variant="secondary" className="w-full sm:w-auto" type="button" disabled={isResettingPassword}>
                        {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Redefinir Senha
                      </Button>
                      <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto" type="button">
                        Sair da Conta
                      </Button>
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          ) : (
            <p className="text-muted-foreground text-center">Nenhum usuário logado.</p>
          )}
        </CardContent>
      </Card>

      {userProfile?.role === 'professional' && (
        <div className="w-full max-w-2xl mx-auto mt-6">
          <ProfessionalScheduleSettings />
        </div>
      )}
    </div>
  );
}
