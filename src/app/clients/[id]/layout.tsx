'use client';

import { useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase, useUserProfile } from '@/firebase';
import type { UserProfile } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ArrowLeft, Activity, Syringe, FileText, FlaskConical, Settings, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePlanLimits } from '@/hooks/usePlanLimits';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const userId = params?.id as string;
  const router = useRouter();
  const pathname = usePathname();

  const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
  const firestore = useFirestore();
  const { planLimits, isLoading: isPlanLoading } = usePlanLimits();

  const userRef = useMemoFirebase(() => {
    if (firestore && userId && adminProfile?.role === 'admin') {
      return doc(firestore, 'users', userId);
    }
    return null;
  }, [firestore, userId, adminProfile]);

  const { data: client, isLoading: isClientLoading } = useDoc<UserProfile>(userRef);

  useEffect(() => {
    if (!isAdminLoading && adminProfile?.role !== 'admin') {
      router.push('/schedule');
    }
    if (!isClientLoading && client && client.role !== 'client') {
      router.push('/clients');
    }
  }, [isAdminLoading, adminProfile, router, isClientLoading, client]);

  const isLoading = isAdminLoading || isClientLoading || isPlanLoading;

  if (isLoading || !client) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full mt-4" />
        <div className="mt-8">
            <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const tabs = [
    { name: 'Resumo', href: `/clients/${userId}`, icon: UserRound, exact: true },
  ];

  if (planLimits?.clinical?.healthRecords) {
    tabs.push({ name: 'Prontuário', href: `/clients/${userId}/records`, icon: Activity, exact: false });
  }
  if (planLimits?.clinical?.vaccination) {
    tabs.push({ name: 'Vacinas', href: `/clients/${userId}/vaccines`, icon: Syringe, exact: false });
  }
  if (planLimits?.clinical?.prescriptions) {
    tabs.push({ name: 'Prescrições', href: `/clients/${userId}/prescriptions`, icon: FileText, exact: false });
  }
  if (planLimits?.clinical?.labResults) {
    tabs.push({ name: 'Exames', href: `/clients/${userId}/exams`, icon: FlaskConical, exact: false });
  }
  
  tabs.push({ name: 'Configurações', href: `/clients/${userId}/edit`, icon: Settings, exact: false });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      <div className="border-b bg-white px-4 md:px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-slate-100">
              <AvatarImage src={client.photoURL ?? ''} alt={client.name} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-headline font-bold tracking-tight text-slate-900">
                {client.name}
              </h1>
              <p className="text-slate-500">{client.email} {client.phoneNumber ? `• ${client.phoneNumber}` : ''}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mb-6">
          {tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-t-lg border-b-2 whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 md:p-8 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
