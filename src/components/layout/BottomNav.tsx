'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useUserProfile, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { EstablishmentSettings } from '@/app/establishment/page';
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
  Monitor,
  Menu
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

const adminNavItems = [
  { href: '/dashboard', label: 'Início', icon: BarChart3 },
  { href: '/schedule', label: 'Agenda', icon: Calendar },
  { href: '/team', label: 'Equipe', icon: Users },
  { href: '/invoices', label: 'Finanças', icon: FileText },
  { href: '#menu', label: 'Menu', icon: Menu, isTrigger: true },
];

const professionalNavItems = [
  { href: '/schedule', label: 'Agenda', icon: Calendar },
  { href: '/agenda-view', label: 'Visão', icon: Monitor },
  { href: '/invoices', label: 'Finanças', icon: FileText },
  { href: '#menu', label: 'Menu', icon: Menu, isTrigger: true },
];

const clientNavItems = [
  { href: '/schedule', label: 'Agenda', icon: Calendar },
  { href: '/book-appointment', label: 'Agendar', icon: PlusCircle },
  { href: '/store', label: 'Loja', icon: ShoppingBag },
  { href: '/club', label: 'Clube', icon: Sparkles },
  { href: '#menu', label: 'Menu', icon: Menu, isTrigger: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { setOpenMobile } = useSidebar();

  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

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
  } else {
    // Client - Apply filters based on settings
    const storeEnabled = settings?.planLimits?.store?.enabled ?? true;
    const clubEnabled = settings?.planLimits?.club?.enabled ?? true;
    
    navItems = clientNavItems.filter(item => {
      if (!storeEnabled && item.href === '/store') return false;
      if (!clubEnabled && item.href === '/club') return false;
      return true;
    });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
          const Icon = item.icon;

          if (item.isTrigger) {
            return (
              <button
                key={item.label}
                onClick={() => setOpenMobile(true)}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-muted-foreground hover:text-primary"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full transition-all bg-transparent">
                  <Icon className="w-5 h-5 stroke-2" />
                </div>
                <span className="text-[10px] font-medium">
                  {item.label}
                </span>
              </button>
            );
          }

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
