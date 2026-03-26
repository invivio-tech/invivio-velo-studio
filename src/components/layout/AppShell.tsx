'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';

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
