import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/server-auth';
import { getTotemPin, setTotemPin } from '@/lib/totem-server';

export const dynamic = 'force-dynamic';

/** PIN do totem: só o dono lê e altera. */
export async function GET(request: Request) {
  const guard = await requireStaff(request, ['admin']);
  if (!guard.ok) return guard.response;
  return NextResponse.json({ pin: await getTotemPin() });
}

export async function POST(request: Request) {
  const guard = await requireStaff(request, ['admin']);
  if (!guard.ok) return guard.response;
  const { pin } = await request.json().catch(() => ({}));
  if (typeof pin !== 'string' || !/^\d{0,4}$/.test(pin)) {
    return NextResponse.json({ error: 'O PIN deve ter até 4 dígitos.' }, { status: 400 });
  }
  await setTotemPin(pin);
  return NextResponse.json({ success: true });
}
