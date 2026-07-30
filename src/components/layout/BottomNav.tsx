'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useUserProfile } from '@/firebase';
import {
  Calendar,
  Users,
  Building,
  BarChart3,
  PlusCircle,
  Sparkles,
  ShoppingBag,
  FileText,
  User as UserIcon,
  Monitor
} from 'lucide-react';

const adminNavItems = [
  { href: '/dashboard', label: 'Início', icon: BarChart3 },
  { href: '/schedule', label: 'Agenda', icon: Calendar },
  { href: '/team', label: 'Equipe', icon: Users },
  { href: '/invoices', label: 'Finanças', icon: FileText },
  { href: '/establishment', label: 'Ajustes', icon: Building },
];

const professionalNavItems = [
  { href: '/schedule', label: 'Agenda', icon: Calendar },
  { href: '/agenda-view', label: 'Visão', icon: Monitor },
  { href: '/invoices', label: 'Finanças', icon: FileText },
  { href: '/account', label: 'Perfil', icon: UserIcon },
];

const clientNavItems = [
  { href: '/schedule', label: 'Agenda', icon: Calendar },
  { href: '/book-appointment', label: 'Agendar', icon: PlusCircle },
  { href: '/store', label: 'Loja', icon: ShoppingBag },
  { href: '/club', label: 'Clube', icon: Sparkles },
  { href: '/account', label: 'Perfil', icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  if (isUserLoading || isProfileLoading) {
    return null; // Do not render until user state is known
  }

  // If no user is logged in, do not show the bottom nav (they might be in guest booking flow)
  if (!user || !userProfile) {
    return null;
  }

  let navItems = clientNavItems;
  if (userProfile.role === 'admin') {
    navItems = adminNavItems;
  } else if (userProfile.role === 'professional') {
    navItems = professionalNavItems;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                  isActive ? 'bg-primary/10' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
