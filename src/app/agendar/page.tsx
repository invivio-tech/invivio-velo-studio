'use client';

import React, { useState } from 'react';
import StepBooking from '@/components/booking/StepBooking';
import { BarberPoleIcon } from '@/components/icons/barber-pole-icon';
import { Calendar } from 'lucide-react';
import { useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { doc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface EstablishmentSettings {
  name: string;
  context?: string;
  logoUrl?: string;
  cancellationTimeLimitHours?: number;
}

export default function AgendarPage() {
  const firestore = useFirestore();
  const router = useRouter();

  // Buscar configurações do estabelecimento
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);
  const { user } = useUser();
  const [userAppointments, setUserAppointments] = useState<any[]>([]);

  React.useEffect(() => {
    if (user && firestore) {
      const q = query(
        collection(firestore, 'appointments'),
        where('customerId', '==', user.uid),
        where('status', '==', 'scheduled'),
        orderBy('startTime', 'asc'),
        limit(3)
      );
      getDocs(q).then(snap => {
        setUserAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [user, firestore]);

  const displayName = settings?.name || 'Agendamento Online';
  const displayContext = settings?.context || 'Sua Barbearia Premium';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-start p-4 md:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 -mt-20 -ml-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 -mb-20 -mr-20 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

      {/* Floating Logo/Header */}
      <div className="mt-8 mb-6 text-center flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={displayName} className="w-full h-full object-contain p-2" />
          ) : (
            <BarberPoleIcon className="w-10 h-10 text-primary" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-headline font-bold tracking-tight">{displayName}</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-medium opacity-60">{displayContext}</p>
        </div>
      </div>

      {/* User Current Appointments Section */}
      {user && userAppointments.length > 0 && (
        <div className="w-full max-w-2xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> SEUS AGENDAMENTOS
            </h3>
            <div className="space-y-2">
              {userAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5 hover:border-primary/30 transition-colors">
                  <div>
                    <p className="text-xs font-bold">{apt.serviceName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(apt.startTime.toDate()).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às {new Date(apt.startTime.toDate()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => router.push('/schedule')}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    GERENCIAR
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700 delay-300 fill-mode-both min-h-[500px]">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden p-2">
          <StepBooking />
        </div>
      </div>

      {/* Footer Support Info */}
      <div className="mt-8 text-center text-[10px] text-muted-foreground/40 max-w-xs leading-relaxed">
        Agendamento rápido via formulário visual.
        <br />
        <span className="mt-2 block font-medium">© {new Date().getFullYear()} Invivio Tecnologia</span>
      </div>
    </div>
  );
}
