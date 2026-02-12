'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUserProfile,
} from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Users, PlusCircle, Search } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

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
  const [searchTerm, setSearchTerm] = useState('');

  const usersQuery = useMemoFirebase(
    () => (firestore && userProfile?.role === 'admin' ? query(collection(firestore, 'users'), where('role', 'in', ['admin', 'professional'])) : null),
    [firestore, userProfile]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) {
      return [];
    }
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

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
              <CardTitle className="font-headline">Membros da Equipe</CardTitle>
              <CardDescription>Gerencie as funções e permissões dos administradores e profissionais.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
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
            <CardTitle className="font-headline">Membros da Equipe</CardTitle>
            <CardDescription>Gerencie as funções e permissões dos administradores e profissionais.</CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-1/2 lg:w-1/3"
              />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
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
              {!(isProfileLoading || areUsersLoading) && filteredUsers.map((user) => (
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
                          Gerenciar Membro
                        </DropdownMenuItem>
                        {user.role === 'professional' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => router.push(`/customers/${user.id}/schedule`)}>
                              Gerenciar Agenda
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => router.push(`/customers/${user.id}/appointments`)}>
                              Ver Agenda
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!areUsersLoading && filteredUsers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum membro da equipe encontrado.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
