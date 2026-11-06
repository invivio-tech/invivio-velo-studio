import { NextResponse } from 'next/server';
import { getBusyBlocks } from '@/lib/booking-server';

export const dynamic = 'force-dynamic';

/** Horários ocupados do dia (sem dados de clientes). Público: usado pela tela de agendamento. */
export async function GET(request: Request) {
  // from/to: início e fim do dia no fuso do navegador (o servidor roda em UTC)
  const params = new URL(request.url).searchParams;
  const from = new Date(params.get('from') || '');
  const to = new Date(params.get('to') || '');
  const span = to.getTime() - from.getTime();
  if (isNaN(span) || span <= 0 || span > 2 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
  }
  try {
    return NextResponse.json({ busy: await getBusyBlocks(from, to) });
  } catch (err) {
    console.error('[booking/availability]', err);
    return NextResponse.json({ error: 'Não foi possível carregar a agenda' }, { status: 500 });
  }
}
