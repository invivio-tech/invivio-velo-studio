'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  useSidebar,
} from '@/components/ui/sidebar';
import { BarberPoleIcon } from '@/components/icons/barber-pole-icon';
import {
  Calendar,
  Users,
  BookOpen,
  FileText,
  Sparkles,
  PanelLeft,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const menuItems = [
  { href: '/schedule', label: 'Agendamentos', icon: Calendar },
  { href: '/services', label: 'Serviços', icon: BookOpen },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/invoices', label: 'Faturamento', icon: FileText },
  { href: '/promotions', label: 'Promoções', icon: Sparkles },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, isMobile } = useSidebar();

  if (isMobile === undefined) {
    return null;
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
            <Link href="/" className="flex items-center gap-2">
              <BarberPoleIcon className="w-8 h-8 text-primary" />
              <span className="font-headline text-xl font-semibold">
                Barbearia Inteligente
              </span>
            </Link>
          </SidebarHeader>
          <SidebarMenu>
            {menuItems.map((item) => (
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
        </SidebarContent>
      </Sidebar>
    </>
  );
}
