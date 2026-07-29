'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/BottomNav';

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
  '/rewards',
  '/store',
  '/products',
  '/product-categories',
  '/orders',
  '/sales-dashboard',
  '/financial-report',
  '/admin',
  '/club',
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


  if (isAppPage) {
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
