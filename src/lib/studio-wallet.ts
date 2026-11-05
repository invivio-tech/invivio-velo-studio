'use client';

import { authFetch } from '@/lib/auth-fetch';

export type AICreditCategory = 'GEMINI_COPYWRITING' | 'GEMINI_MARKETING' | 'GEMINI_CHATBOT';

export interface WalletCheckResult {
  allowed: boolean;
  balance: number;
  isExempt?: boolean;
  reason?: string;
}

/**
 * Consulta se o estabelecimento possui saldo suficiente ou isenção para usar IA.
 */
export async function checkWalletCredits(): Promise<WalletCheckResult> {
  const adminUrl = process.env.NEXT_PUBLIC_VELO_ADMIN_URL || 'https://invivio-velo-admin.web.app';
  const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  try {
    const res = await authFetch(`${adminUrl}/api/studio/wallet/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        databaseId,
        dryRun: true,
      }),
    });

    if (res.status === 402) {
      return { allowed: false, balance: 0, reason: 'INSUFFICIENT_CREDITS' };
    }

    if (!res.ok) {
      console.warn('[Studio Wallet] Verificação retornou status', res.status);
      return { allowed: true, balance: 0 };
    }

    const data = await res.json();
    return {
      allowed: data.allowed !== false,
      balance: data.balance ?? 0,
      isExempt: data.isExempt,
      reason: data.reason,
    };
  } catch (err) {
    console.warn('[Studio Wallet] Erro de rede ao verificar créditos:', err);
    // Em caso de falha de rede temporária no check, permite para não travar a operação
    return { allowed: true, balance: 0 };
  }
}

/**
 * Registra o consumo atômico de créditos da IA na carteira do cliente no Velo Admin.
 */
export async function consumeWalletCredits(params: {
  category: AICreditCategory;
  units: number;
  description: string;
}): Promise<void> {
  const adminUrl = process.env.NEXT_PUBLIC_VELO_ADMIN_URL || 'https://invivio-velo-admin.web.app';
  const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  try {
    const res = await authFetch(`${adminUrl}/api/studio/wallet/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        databaseId,
        category: params.category,
        units: params.units,
        description: params.description,
        dryRun: false,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[Studio Wallet] Resposta de consumo não-ok:', res.status, err);
    }
  } catch (err) {
    console.warn('[Studio Wallet] Erro ao debitar créditos de IA:', err);
  }
}

/**
 * Envolve a execução de uma chamada de IA com pré-checagem de saldo e débito posterior.
 */
export async function withWalletGuard<T>(options: {
  category: AICreditCategory;
  description: string;
  estimatedTokens?: number;
  action: () => Promise<T>;
}): Promise<T> {
  // 1. Pré-checagem de saldo
  const check = await checkWalletCredits();
  if (!check.allowed) {
    throw new Error('Saldo de créditos insuficiente. Acesse o Portal do Assinante para realizar uma recarga de créditos e continuar usando a inteligência artificial.');
  }

  // 2. Executa a ação de IA
  const result = await options.action();

  // 3. Debita os créditos consumidos em background
  const tokens = options.estimatedTokens || 450;
  consumeWalletCredits({
    category: options.category,
    units: tokens,
    description: options.description,
  }).catch((e) => console.warn('[Studio Wallet] Erro no débito assíncrono:', e));

  return result;
}
