import { NextResponse } from 'next/server';
import { optionalUser } from '@/lib/server-auth';
import { bookingErrorStatus, BookingError, createBooking } from '@/lib/booking-server';
import { checkTotemPin } from '@/lib/totem-server';
import { clientIp, isLimited, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Cria um agendamento. Com login: cliente do app (preço e plano calculados aqui).
 * Sem login: visitante/totem, exige nome e telefone.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`booking:${ip}`, 15, 10 * 60_000);
  if (limited) return limited;
  const auth = await optionalUser(request);
  if (auth === 'invalid') return NextResponse.json({ error: 'Sessão inválida. Entre novamente.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { serviceId, professionalId, startTime, useSubscription, guest, kiosk, pin } = body || {};
  if (kiosk) {
    const blocked = isLimited(`totem-pin:${ip}`, 10);
    if (blocked) return blocked;
  }
  if (kiosk && !(await checkTotemPin(pin))) {
    rateLimit(`totem-pin:${ip}`, 10, 15 * 60_000);
    return NextResponse.json({ error: 'Totem bloqueado. Peça ao estabelecimento para liberar.' }, { status: 403 });
  }

  try {
    const result = await createBooking({
      customer: auth && !kiosk
        ? { kind: 'user', uid: auth.uid }
        : { kind: 'guest', name: String(guest?.name || ''), phone: String(guest?.phone || ''), kiosk: !!kiosk },
      serviceId: String(serviceId || ''),
      professionalId: String(professionalId || ''),
      startTime: String(startTime || ''),
      useSubscription: useSubscription !== false,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (!(err instanceof BookingError)) console.error('[booking]', err);
    const message = err instanceof BookingError ? err.message : 'Não foi possível confirmar o agendamento.';
    return NextResponse.json({ error: message }, { status: bookingErrorStatus(err) });
  }
}
