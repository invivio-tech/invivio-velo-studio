'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/firebase/auth/client';

const appRoutes = [
  '/dashboard',
  '/schedule',
  '/services',
  '/team',
  '/clients',
  '/invoices',
  '/promotions',
  '/account',
  '/establishment',
  '/categories',
  '/book-appointment',
  '/followups',
  '/pets',
  '/admin',
  '/onboarding',
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check if the current path starts with any of the app routes or matches a dynamic route pattern
  const isAppPage = appRoutes.some(route => {
    if (pathname.startsWith(route) && route.length > 1) {
      return true;
    }
    // Handle root path separately
    if (route === '/' && pathname === '/') {
      return true;
    }
    return false;
  }) || /^\/team\/[^/]+\/(edit|schedule|appointments)$/.test(pathname) || /^\/clients\/[^/]+\/edit$/.test(pathname)

  // A more specific check for the root to not include it in the app shell
  if (pathname === '/') {
    return <>{children}</>;
  }

  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings, isLoading } = useDoc<EstablishmentSettings>(settingsRef);
  
  // Need router for redirect
  const { useRouter } = require('next/navigation');
  const router = useRouter();

  // Redirect to onboarding if not completed
  if (isAppPage && !isLoading && settings && settings.onboardingCompleted === false && pathname !== '/onboarding') {
    // Small delay to prevent render flashing
    setTimeout(() => {
      router.push('/onboarding');
    }, 0);
  }

  if (isAppPage) {
    if (!isLoading && settings?.accountStatus === 'suspended') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full border border-red-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Suspenso</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              O acesso ao sistema da sua clínica foi temporariamente bloqueado. Por favor, regularize sua situação para retomar o acesso a todos os recursos.
            </p>
            <Button onClick={logout} variant="outline" className="w-full">
              Sair
            </Button>
          </div>
        </div>
      );
    }

    return (
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 w-full relative flex flex-col min-h-svh max-w-full overflow-x-hidden pt-4 pb-20 md:pt-0 md:pb-0">
          <div className="hidden md:flex items-center h-14 px-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger />
          </div>
          {children}
        </main>
        <BottomNav />
      </SidebarProvider>
    );
  }

  // This is for landing page ('/'), '/login', and '/signup'
  return <>{children}</>;
}
