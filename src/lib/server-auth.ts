import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';

export type StaffRole = 'admin' | 'professional';

type Guard =
  | { ok: true; uid: string; role: StaffRole; token: string }
  | { ok: false; response: NextResponse };

/**
 * Valida o ID token (Authorization: Bearer) e o papel em users/{uid} DESTE banco.
 * O Auth é compartilhado entre todos os studios, então estar logado não basta.
 */
export async function requireStaff(request: Request, roles: StaffRole[] = ['admin', 'professional']): Promise<Guard> {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };

  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    const profile = await getAdminFirestore().doc(`users/${decoded.uid}`).get();
    const data = profile.data();
    if (profile.exists && roles.includes(data?.role) && data?.disabled !== true) {
      return { ok: true, uid: decoded.uid, role: data!.role, token: match[1] };
    }
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Sessão inválida' }, { status: 401 }) };
  }
  return { ok: false, response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) };
}
