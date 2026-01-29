'use client';

import { useState } from 'react';
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
import { MoreHorizontal, Users } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/firebase/auth/useUserProfile';
import type { ServiceWithId } from '@/app/services/page';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserManagementDialog from '@/components/users/UserManagementDialog';
import { useRouter } from 'next/navigation';

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

  const servicesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'services') : null),
    [firestore]
  );
  const { data: services, isLoading: areServicesLoading } = useCollection<ServiceWithId>(servicesCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const handleManageUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };
  
  const isLoading = isProfileLoading || areUsersLoading || areServicesLoading;

  if (!isProfileLoading && userProfile?.role !== 'admin') {
    router.push('/schedule');
    return null; 
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Users className="w-8 h-8 text-secondary"/>
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          Gestão de Usuários
        </h1>
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Usuários Cadastrados</CardTitle>
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
              {isLoading && [...Array(3)].map((_, i) => (
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
              {!isLoading && users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.photoURL} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
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
                        <DropdownMenuItem onSelect={() => handleManageUser(user)}>
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
      {selectedUser && (
        <UserManagementDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          user={selectedUser}
          allServices={services || []}
        />
      )}
    </div>
  );
}
