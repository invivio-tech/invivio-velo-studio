'use client';

import { useEffect } from 'react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUserProfile,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Users, PlusCircle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const roleDisplay: Record<UserProfile['role'], string> = {
  admin: 'Admin',
  professional: 'Profissional',
  client: 'Cliente',
};

const roleVariant: Record<UserProfile['role'], 'default' | 'secondary' | 'outline'> = {
    admin: 'default',
    professional: 'secondary',
    client: 'outline',
};

export default function UsersPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();

  const usersCollection = useMemoFirebase(
    () => (firestore && userProfile?.role === 'admin' ? collection(firestore, 'users') : null),
    [firestore, userProfile]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollection);

  useEffect(() => {
    if (!isProfileLoading && userProfile?.role !== 'admin') {
      router.push('/schedule');
    }
  }, [isProfileLoading, userProfile, router]);


  if (isProfileLoading || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 text-secondary"/>
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Gestão de Equipe
          </h1>
        </div>
        <Card>
          <CardHeader>
              <CardTitle className="font-headline">Todos os Usuários</CardTitle>
              <CardDescription>Gerencie as funções e permissões de todos os usuários do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 text-secondary"/>
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Gestão de Equipe
          </h1>
        </div>
        {userProfile?.role === 'admin' && (
            <Button asChild>
                <Link href="/customers/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Membro
                </Link>
            </Button>
        )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Todos os Usuários</CardTitle>
            <CardDescription>Gerencie as funções e permissões de todos os usuários do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isProfileLoading || areUsersLoading) && [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!(isProfileLoading || areUsersLoading) && users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.photoURL ?? ''} alt={user.name} />
                        <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[user.role] || 'outline'}>{roleDisplay[user.role] || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => router.push(`/customers/${user.id}/edit`)}>
                          Gerenciar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
