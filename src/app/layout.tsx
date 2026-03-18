import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { AppShell } from '@/components/layout/AppShell';
import { DynamicMetadata } from '@/components/layout/DynamicMetadata';
import { NotificationManager } from '@/components/NotificationManager';

export const metadata: Metadata = {
  title: 'Barbearia Inteligente',
  description: 'Sistema de gestão para o seu estabelecimento',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=PT+Sans&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#020617" />
      </head>
      <body className={cn('font-body antialiased min-h-screen')}>
        <FirebaseClientProvider>
          <DynamicMetadata />
          <AppShell>{children}</AppShell>
          <Toaster />
          <NotificationManager />
          <FirebaseErrorListener />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
