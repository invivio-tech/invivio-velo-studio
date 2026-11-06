'use client';

import React, { ReactNode } from 'react';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  MessageCircle, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionGuardProps {
  children: ReactNode;
}

function formatFriendlyDate(dateStr?: string | null) {
  if (!dateStr) return '';
  try {
    const clean = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    return format(parseISO(clean), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<any>(settingsRef);

  // Clientes isentos (cortesia/teste/parceiros) nunca são bloqueados
  if (settings?.isExempt === true) {
    return <>{children}</>;
  }

  const isExplicitlySuspended = 
    settings?.status === 'suspended' || 
    settings?.subscriptionStatus === 'suspended' || 
    settings?.isSuspended === true;

  let isPastGraceDeadline = false;
  if (settings?.gracePeriodUntil) {
    const [gYear, gMonth, gDay] = settings.gracePeriodUntil.split('-').map(Number);
    const deadlineTime = new Date(gYear, gMonth - 1, gDay, 23, 59, 59).getTime();
    if (Date.now() > deadlineTime) {
      isPastGraceDeadline = true;
    }
  }

  const isSuspended = isExplicitlySuspended || isPastGraceDeadline;
  const isInGracePeriod = !isSuspended && (settings?.subscriptionStatus === 'in_grace_period' || settings?.inGracePeriod === true);

  const invoiceUrl = settings?.latestInvoiceUrl;
  const supportPhone = '5511988047106';
  const supportMessage = encodeURIComponent(
    `Olá, gostaria de regularizar a assinatura da barbearia ${settings?.name || ''} para restabelecer o acesso.`
  );
  const supportWhatsappUrl = `https://wa.me/${supportPhone}?text=${supportMessage}`;

  // 1. Tela de Suspensão por Carência Expirada
  if (isSuspended) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[85vh] p-4 sm:p-8 bg-background">
        <Card className="max-w-xl w-full border-destructive/30 shadow-2xl overflow-hidden">
          <div className="bg-destructive/10 border-b border-destructive/20 p-6 sm:p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center text-destructive mb-4 shadow-inner">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-destructive">
              Acesso Temporariamente Suspenso
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-md">
              A mensalidade da sua barbearia ultrapassou o período de carência de 10 dias.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="rounded-xl bg-muted/50 p-4 border text-sm space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Vencimento original:</span>
                <span className="font-semibold text-foreground">
                  {formatFriendlyDate(settings?.latestDueDate) || 'Pendente'}
                </span>
              </div>
              {settings?.gracePeriodUntil && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Carência encerrada em:</span>
                  <span className="font-semibold text-destructive">
                    {formatFriendlyDate(settings.gracePeriodUntil)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Status da Assinatura:</span>
                <span className="font-semibold text-destructive">Suspenso</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Para desbloquear seu sistema imediatamente, efetue o pagamento da fatura em aberto. 
              Ao pagar por PIX ou Cartão, a liberação ocorre de forma automática em instantes.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {invoiceUrl && (
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-12 text-sm shadow-md"
                  onClick={() => window.open(invoiceUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Pagar Fatura Agora
                </Button>
              )}
              <Button 
                variant="outline" 
                className={`flex-1 h-12 text-sm ${!invoiceUrl ? 'w-full' : ''}`}
                onClick={() => window.open(supportWhatsappUrl, '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" /> Falar com o Suporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Banner de Carência Ativa (Tolerância de 10 dias)
  return (
    <>
      {isInGracePeriod && (
        <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 text-amber-950 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              <span>
                <strong>Aviso de Faturamento:</strong> A mensalidade venceu em{' '}
                <strong>{formatFriendlyDate(settings?.latestDueDate) || 'recente'}</strong>. 
                Você está no período de tolerância de 10 dias (carência até{' '}
                <strong>{formatFriendlyDate(settings?.gracePeriodUntil) || 'breve'}</strong>).
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              {invoiceUrl && (
                <Button
                  size="sm"
                  className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 shadow-sm"
                  onClick={() => window.open(invoiceUrl, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Pagar Fatura
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-amber-500/40 hover:bg-amber-500/10"
                onClick={() => window.open(supportWhatsappUrl, '_blank')}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Suporte
              </Button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
