// Uso no servidor (server actions de IA). Não é um arquivo 'use server': nada aqui é
// exposto ao navegador diretamente.

import { verifyStaffToken, type StaffRole } from '@/lib/server-auth';
import type { AICreditCategory, AIGuardError } from '@/lib/ai-guard-types';

function adminUrl() {
  return process.env.NEXT_PUBLIC_VELO_ADMIN_URL || 'https://invivio-velo-admin.web.app';
}

function databaseId() {
  return process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

async function callWallet(idToken: string, body: Record<string, unknown>) {
  return fetch(`${adminUrl()}/api/studio/wallet/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ databaseId: databaseId(), ...body }),
    cache: 'no-store',
  });
}

/** Exige usuário logado com papel de equipe neste estabelecimento. */
export async function requireStaffSession(
  idToken: unknown,
  roles: StaffRole[] = ['admin', 'professional'],
): Promise<{ uid: string } | AIGuardError> {
  if (typeof idToken !== 'string' || !idToken) return { aiError: 'UNAUTHENTICATED' };
  const result = await verifyStaffToken(idToken, roles);
  if (result.ok) return { uid: result.uid };
  return { aiError: result.reason === 'invalid' ? 'UNAUTHENTICATED' : 'FORBIDDEN' };
}

/**
 * Executa uma geração de IA exigindo sessão de equipe e créditos na carteira do Velo Admin.
 * Categoria, descrição e estimativa são definidas no servidor (não vêm do navegador).
 */
export async function runGuardedAI<T>(
  idToken: unknown,
  billing: { category: AICreditCategory; description: string; estimatedTokens: number },
  generate: () => Promise<T>,
): Promise<T | AIGuardError> {
  const session = await requireStaffSession(idToken);
  if ('aiError' in session) return session;
  const token = idToken as string;

  // Pré-checagem de saldo. Só 402 bloqueia; indisponibilidade do admin não trava o uso.
  try {
    const res = await callWallet(token, { dryRun: true });
    if (res.status === 402) return { aiError: 'INSUFFICIENT_CREDITS' };
    if (!res.ok) console.warn('[AI Guard] Pré-checagem da carteira retornou', res.status);
  } catch (err) {
    console.warn('[AI Guard] Carteira indisponível na pré-checagem:', err);
  }

  const output = await generate();

  // Débito aguardado (em ambiente serverless, trabalho em segundo plano pode ser interrompido).
  try {
    const res = await callWallet(token, {
      category: billing.category,
      units: billing.estimatedTokens,
      description: billing.description.slice(0, 200),
    });
    if (!res.ok) console.warn('[AI Guard] Débito da carteira retornou', res.status);
  } catch (err) {
    console.warn('[AI Guard] Falha ao debitar a carteira:', err);
  }

  return output;
}
