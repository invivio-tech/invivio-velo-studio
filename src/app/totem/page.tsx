'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { VirtualKeypad } from '@/components/totem/VirtualKeypad';
import StepBooking from '@/components/booking/StepBooking';
import { Scissors, UserCheck, ArrowLeft, CheckCircle2, AlertCircle, Calendar, Lock } from 'lucide-react';

async function totemApi(body: Record<string, unknown>) {
  const res = await fetch('/api/totem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro no totem');
  return data;
}

type TotemMode = 'home' | 'checkin' | 'booking' | 'success_checkin' | 'success_booking';

// Function to format phone for display (e.g., (11) 99999-9999)
const formatPhone = (val: string) => {
  const v = val.replace(/\D/g, '');
  if (v.length <= 2) return v;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
};

export default function TotemPage() {
  const [mode, setMode] = useState<TotemMode>('home');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  // O PIN fica no servidor; aqui só sabemos se o totem exige desbloqueio
  const [requiresPin, setRequiresPin] = useState(false);
  useEffect(() => {
    totemApi({ action: 'status' })
      .then((d) => setRequiresPin(!!d.locked))
      .catch(() => setRequiresPin(false));
  }, []);

  // Reset after success
  useEffect(() => {
    if (mode === 'success_checkin' || mode === 'success_booking') {
      const t = setTimeout(() => {
        setMode('home');
        setPhone('');
        setError('');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('totem_unlocked') === 'true') {
        setIsLocked(false);
      }
    }
  }, []);

  const handlePinEnter = async () => {
    try {
      await totemApi({ action: 'unlock', pin: pinInput });
      setIsLocked(false);
      sessionStorage.setItem('totem_unlocked', 'true');
      sessionStorage.setItem('totem_pin', pinInput);
      setError('');
    } catch {
      setError('PIN Incorreto');
    } finally {
      setPinInput('');
    }
  };

  const handleCheckinSearch = async () => {
    if (phone.length < 10) {
      setError('Telefone inválido');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Check-in feito no servidor: o totem não lê a agenda dos clientes
      const data = await totemApi({ action: 'checkin', phone, pin: sessionStorage.getItem('totem_pin') || '' });
      setClientName(data.firstName || 'Cliente');
      setMode('success_checkin');
    } catch (err: any) {
      setError(err?.message || 'Erro ao buscar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (requiresPin && isLocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
        <div className="max-w-xl w-full space-y-8 animate-in fade-in duration-500">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Totem Bloqueado</h1>
            <p className="text-xl text-muted-foreground">Digite o PIN do estabelecimento para liberar</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
            <div className="text-center">
              <div className="text-5xl font-bold tracking-widest text-primary h-16 flex items-center justify-center">
                {pinInput.split('').map(() => '•').join('') || <span className="text-white/20">____</span>}
              </div>
              {error && (
                <p className="text-red-500 mt-4 flex items-center justify-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5" /> {error}
                </p>
              )}
            </div>
            
            <VirtualKeypad 
              value={pinInput} 
              onChange={(val) => { setPinInput(val); setError(''); }}
              onEnter={handlePinEnter}
              maxLength={4}
            />
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'success_checkin') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
        <div className="w-32 h-32 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        </div>
        <h1 className="text-5xl font-bold mb-4 text-center">Tudo certo, {clientName}!</h1>
        <p className="text-2xl text-muted-foreground text-center max-w-2xl">
          Seu profissional já foi avisado que você chegou. Pode aguardar um instante que ele já vai te chamar.
        </p>
      </div>
    );
  }

  if (mode === 'success_booking') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
        <div className="w-32 h-32 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        </div>
        <h1 className="text-5xl font-bold mb-4 text-center">Agendado com Sucesso!</h1>
        <p className="text-2xl text-muted-foreground text-center max-w-2xl">
          Seu horário foi confirmado. Pode aguardar um instante na recepção!
        </p>
      </div>
    );
  }

  if (mode === 'booking') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-6 flex items-center justify-between bg-white/5 border-b border-white/10">
          <button 
            onClick={() => setMode('home')}
            className="flex items-center gap-2 text-xl font-bold p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
          >
            <ArrowLeft className="w-6 h-6" /> Voltar
          </button>
          <div className="text-2xl font-bold">{settings?.name || 'Velo Studio'}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
           <StepBooking kioskMode={true} onComplete={() => setMode('success_booking')} />
        </div>
      </div>
    );
  }

  if (mode === 'checkin') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
        <button 
          onClick={() => { setMode('home'); setError(''); setPhone(''); }}
          className="absolute top-8 left-8 flex items-center gap-2 text-xl font-bold p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-6 h-6" /> Voltar
        </button>
        
        <div className="max-w-xl w-full space-y-8 animate-in slide-in-from-bottom-8 duration-500">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCheck className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Qual o seu Telefone?</h1>
            <p className="text-xl text-muted-foreground">Digite para confirmar sua chegada</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
            <div className="text-center">
              <div className="text-5xl font-bold tracking-widest text-primary h-16">
                {formatPhone(phone) || <span className="text-white/20">(__) _____-____</span>}
              </div>
              {error && (
                <p className="text-red-500 mt-4 flex items-center justify-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5" /> {error}
                </p>
              )}
            </div>
            
            <VirtualKeypad 
              value={phone} 
              onChange={(val) => { setPhone(val); setError(''); }}
              onEnter={handleCheckinSearch}
              maxLength={11}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
      
      <div className="z-10 max-w-4xl w-full space-y-16 animate-in fade-in duration-1000">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-black tracking-tight">
            Bem-vindo ao <span className="text-primary">{settings?.name || 'Studio'}</span>
          </h1>
          <p className="text-2xl text-muted-foreground">Como podemos ajudar você hoje?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => setMode('checkin')}
            className="group relative p-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserCheck className="w-48 h-48 -mr-12 -mt-12 text-primary" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                <UserCheck className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-bold">Fazer Check-in</h2>
              <p className="text-xl text-muted-foreground">Já tenho um horário agendado</p>
            </div>
          </button>
          
          <button
            onClick={() => setMode('booking')}
            className="group relative p-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar className="w-48 h-48 -mr-12 -mt-12 text-blue-500" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-500">
                <Calendar className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-bold">Agendar Agora</h2>
              <p className="text-xl text-muted-foreground">Cheguei agora e quero cortar</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
