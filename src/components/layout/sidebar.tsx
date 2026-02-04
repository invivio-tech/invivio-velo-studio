'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  useSidebar,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { BarberPoleIcon } from '@/components/icons/barber-pole-icon';
import {
  Calendar,
  Users,
  BookOpen,
  FileText,
  Sparkles,
  PanelLeft,
  LogIn,
  UserPlus,
  LogOut,
  Settings,
  Lock,
  ContactRound,
  Building,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUser, useUserProfile, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { logout } from '@/firebase/auth/client';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { EstablishmentSettings } from '@/app/establishment/page';

const adminMenuItems = [
  { href: '/schedule', label: 'Painel', icon: Calendar },
  { href: '/services', label: 'Serviços', icon: BookOpen },
  { href: '/customers', label: 'Equipe', icon: Users },
  { href: '/clients', label: 'Clientes', icon: ContactRound },
  { href: '/invoices', label: 'Faturas', icon: FileText },
  { href: '/promotions', label: 'Marketing com IA', icon: Sparkles },
  { href: '/establishment', label: 'Estabelecimento', icon: Building },
  { href: '/schedule/settings', label: 'Horário do Estabelecimento', icon: Settings },
  { href: '/schedule/block', label: 'Bloquear Agenda (Geral)', icon: Lock },
];

const professionalMenuItems = [
  { href: '/schedule', label: 'Painel', icon: Calendar },
  { href: '/services', label: 'Serviços', icon: BookOpen },
];

const clientMenuItems = [
  { href: '/schedule', label: 'Painel', icon: Calendar },
  { href: '/services', label: 'Serviços', icon: BookOpen },
];

const unauthenticatedMenuItems = [
  { href: '/login', label: 'Login', icon: LogIn },
  { href: '/signup', label: 'Cadastrar', icon: UserPlus },
];


export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar, isMobile } = useSidebar();
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);
  const establishmentName = settings?.name || 'Barbearia Inteligente';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  }

  if (isMobile === undefined) {
    return null;
  }
  
  let menuItems = clientMenuItems;
  if (userProfile?.role === 'admin') {
    menuItems = adminMenuItems;
  } else if (userProfile?.role === 'professional') {
    menuItems = professionalMenuItems;
  }


  return (
    <>
      <div className="md:hidden p-2 absolute top-2 left-2 z-50">
        <Button size="icon" variant="ghost" onClick={toggleSidebar}>
          <PanelLeft className="h-6 w-6" />
        </Button>
      </div>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarHeader className="h-20 flex items-center justify-center">
            <Link href="/schedule" className="flex items-center gap-2 p-2">
              <BarberPoleIcon className="w-8 h-8 text-primary shrink-0" />
              {areSettingsLoading ? (
                <Skeleton className="h-6 w-36" />
              ) : (
                <span className="font-headline text-xl font-semibold truncate">
                  {establishmentName}
                </span>
              )}
            </Link>
          </SidebarHeader>

          {(isUserLoading || isProfileLoading) ? (
            <div className='p-2 flex flex-col gap-2'>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : user && userProfile ? (
            <SidebarMenu className="flex-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          ) : (
             <SidebarMenu>
              {unauthenticatedMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}


        </SidebarContent>
        <SidebarFooter>
          <SidebarSeparator />
           {(isUserLoading || isProfileLoading) ? (
             <div className="flex items-center gap-2 p-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
             </div>
           ) : user ? (
            <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Minha Conta">
                    <Link href="/account">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL ?? ''} />
                        <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className='truncate'>{user.displayName}</span>
                    </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
                    <LogOut />
                    <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
           ) : (
            <div className="p-2 text-xs text-center text-muted-foreground">
              {areSettingsLoading ? (
                <Skeleton className="h-4 w-32 mx-auto" />
              ) : (
                <p>&copy; 2024 {establishmentName}</p>
              )}
            </div>
           )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
