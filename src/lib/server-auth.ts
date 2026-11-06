import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';

export type StaffRole = 'admin' | 'professional';

type Guard =
  | { ok: true; uid: string; role: StaffRole; token: string }
  | { ok: false; response: NextResponse };

export type StaffTokenCheck =
  | { ok: true; uid: string; role: StaffRole }
  | { ok: false; reason: 'invalid' | 'forbidden' };

/**
 * Valida o ID token e o papel em users/{uid} DESTE banco.
 * O Auth é compartilhado entre todos os studios, então estar logado não basta.
 */
export async function verifyStaffToken(
  idToken: string,
  roles: StaffRole[] = ['admin', 'professional'],
): Promise<StaffTokenCheck> {
  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const profile = await getAdminFirestore().doc(`users/${uid}`).get();
  const data = profile.data();
  if (profile.exists && roles.includes(data?.role) && data?.disabled !== true) {
    return { ok: true, uid, role: data!.role };
  }
  return { ok: false, reason: 'forbidden' };
}

/** Versão para rotas de API: lê o token do header Authorization: Bearer. */
export async function requireStaff(request: Request, roles: StaffRole[] = ['admin', 'professional']): Promise<Guard> {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };

  try {
    const result = await verifyStaffToken(match[1], roles);
    if (result.ok) return { ok: true, uid: result.uid, role: result.role, token: match[1] };
    if (result.reason === 'invalid') {
      return { ok: false, response: NextResponse.json({ error: 'Sessão inválida' }, { status: 401 }) };
    }
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Sessão inválida' }, { status: 401 }) };
  }
  return { ok: false, response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) };
}
