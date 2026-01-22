'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';

const appRoutes = [
    '/schedule',
    '/services',
    '/customers',
    '/invoices',
    '/promotions',
    '/account'
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppPage = appRoutes.some(route => pathname.startsWith(route));

  if (isAppPage) {
    return (
      <SidebarProvider>
        <div className="flex">
          <AppSidebar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // This is for landing page ('/'), '/login', and '/signup'
  return <>{children}</>;
}
