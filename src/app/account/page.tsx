'use client';

import { useUser, logout } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Minha Conta
      </h1>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="font-headline">Informações do Perfil</CardTitle>
          <CardDescription>
            Aqui estão os detalhes da sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : user ? (
            <>
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Avatar do usuário'} />
                  <AvatarFallback>
                    {user.displayName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{user.displayName}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button onClick={handleLogout} className="w-full">
                Sair
              </Button>
            </>
          ) : (
             <p className="text-muted-foreground text-center">Nenhum usuário logado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
