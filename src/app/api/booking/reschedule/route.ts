import { NextResponse } from 'next/server';
import { optionalUser } from '@/lib/server-auth';
import { bookingErrorStatus, BookingError, rescheduleBooking } from '@/lib/booking-server';

export const dynamic = 'force-dynamic';

/** Cliente remarca o próprio agendamento (serviço e preço não mudam). */
export async function POST(request: Request) {
  const auth = await optionalUser(request);
  if (!auth || auth === 'invalid') return NextResponse.json({ error: 'Entre na sua conta para remarcar.' }, { status: 401 });

  const { appointmentId, startTime, professionalId } = await request.json().catch(() => ({}));
  try {
    await rescheduleBooking({
      uid: auth.uid,
      appointmentId: String(appointmentId || ''),
      startTime: String(startTime || ''),
      professionalId: professionalId ? String(professionalId) : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (!(err instanceof BookingError)) console.error('[booking/reschedule]', err);
    const message = err instanceof BookingError ? err.message : 'Não foi possível remarcar.';
    return NextResponse.json({ error: message }, { status: bookingErrorStatus(err) });
  }
}
