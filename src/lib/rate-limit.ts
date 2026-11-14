// Limite simples de requisições por chave (IP ou usuário), em memória de cada instância do servidor.
// Não é global entre instâncias, mas barra repetição automatizada contra as rotas públicas.
import { NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

/** IP do cliente (o Firebase Hosting/Cloud Run põe o original no início de x-forwarded-for). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || 'desconhecido';
}

/**
 * Conta uma ocorrência para `key`. Devolve uma resposta 429 se passou de `limit` dentro de `windowMs`,
 * ou null se pode seguir.
 */
export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  sweep(now);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  return NextResponse.json(
    { error: 'Muitas tentativas. Aguarde um pouco e tente novamente.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/** Só consulta, sem contar (para limitar apenas tentativas que falharam). */
export function isLimited(key: string, limit: number): NextResponse | null {
  const b = buckets.get(key);
  if (!b || b.resetAt <= Date.now() || b.count < limit) return null;
  const retryAfter = Math.max(1, Math.ceil((b.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Muitas tentativas. Aguarde um pouco e tente novamente.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
