// Tipos compartilhados entre as server actions de IA e o cliente.

export type AICreditCategory = 'GEMINI_COPYWRITING' | 'GEMINI_MARKETING' | 'GEMINI_CHATBOT';

export type AIGuardErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INSUFFICIENT_CREDITS';

/**
 * As server actions devolvem este objeto em vez de lançar erro: em produção o Next
 * substitui a mensagem de erros lançados por um texto genérico.
 */
export type AIGuardError = { aiError: AIGuardErrorCode };

export function isAIGuardError(value: unknown): value is AIGuardError {
  return typeof value === 'object' && value !== null && 'aiError' in value;
}

export const AI_GUARD_MESSAGES: Record<AIGuardErrorCode, string> = {
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente para usar a inteligência artificial.',
  FORBIDDEN: 'Seu usuário não tem permissão para usar a inteligência artificial deste estabelecimento.',
  INSUFFICIENT_CREDITS:
    'Saldo de créditos insuficiente. Acesse o Portal do Assinante para realizar uma recarga de créditos e continuar usando a inteligência artificial.',
};
