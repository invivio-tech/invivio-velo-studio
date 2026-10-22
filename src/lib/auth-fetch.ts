'use client';

import { initializeFirebase } from '@/firebase';

/** fetch que envia o ID token do usuário logado; as rotas validam no servidor (src/lib/server-auth.ts). */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const user = initializeFirebase().auth.currentUser;
  if (user) {
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  }
  return fetch(input, { ...init, headers });
}
