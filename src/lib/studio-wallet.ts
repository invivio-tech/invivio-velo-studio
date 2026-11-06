'use client';

import { initializeFirebase } from '@/firebase';
import { AI_GUARD_MESSAGES, isAIGuardError, type AIGuardError } from '@/lib/ai-guard-types';

export type { AICreditCategory } from '@/lib/ai-guard-types';

/**
 * Chama uma server action de IA passando o ID token do usuário logado.
 * Sessão, saldo e débito da carteira são validados no servidor (src/lib/ai-guard.ts);
 * aqui só convertemos a resposta de bloqueio em um erro com mensagem amigável.
 */
export async function withWalletGuard<T>(action: (idToken: string) => Promise<T | AIGuardError>): Promise<T> {
  const user = initializeFirebase().auth.currentUser;
  if (!user) throw new Error(AI_GUARD_MESSAGES.UNAUTHENTICATED);

  const result = await action(await user.getIdToken());
  if (isAIGuardError(result)) throw new Error(AI_GUARD_MESSAGES[result.aiError]);
  return result;
}
