import { NextResponse } from 'next/server';
import { optionalUser } from '@/lib/server-auth';
import { bookingErrorStatus, BookingError, createBooking } from '@/lib/booking-server';
import { checkTotemPin } from '@/lib/totem-server';

export const dynamic = 'force-dynamic';

/**
 * Cria um agendamento. Com login: cliente do app (preço e plano calculados aqui).
 * Sem login: visitante/totem, exige nome e telefone.
 */
export async function POST(request: Request) {
  const auth = await optionalUser(request);
  if (auth === 'invalid') return NextResponse.json({ error: 'Sessão inválida. Entre novamente.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { serviceId, professionalId, startTime, useSubscription, guest, kiosk, pin } = body || {};
  if (kiosk && !(await checkTotemPin(pin))) {
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
