import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { checkTotemPin, getTotemPin } from '@/lib/totem-server';

export const dynamic = 'force-dynamic';

/** Só dígitos, sem o DDI 55. */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
}

/** Totem do estabelecimento: status do bloqueio, desbloqueio por PIN e check-in por telefone. */
export async function POST(request: Request) {
  const { action, pin, phone } = await request.json().catch(() => ({}));

  if (action === 'status') {
    return NextResponse.json({ locked: (await getTotemPin()).length > 0 });
  }

  if (!(await checkTotemPin(pin))) {
    return NextResponse.json({ error: 'PIN incorreto' }, { status: 403 });
  }
  if (action === 'unlock') return NextResponse.json({ ok: true });

  if (action === 'checkin') {
    const wanted = normalizePhone(String(phone || ''));
    if (wanted.length < 10) return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });

    // Janela em volta de agora (o servidor roda em UTC; "hoje" do servidor não é o do salão)
    const now = Date.now();
    const snap = await getAdminFirestore().collection('appointments')
      .where('startTime', '>=', Timestamp.fromMillis(now - 4 * 60 * 60 * 1000))
      .where('startTime', '<=', Timestamp.fromMillis(now + 12 * 60 * 60 * 1000))
      .get();
    const apt = snap.docs
      // Filtro em memória: evita índice composto telefone + horário nos bancos dos clientes
      .filter((d) => d.data().status === 'scheduled' && normalizePhone(String(d.data().customerPhoneNumber || '')) === wanted)
      .sort((a, b) => a.data().startTime.toMillis() - b.data().startTime.toMillis())[0];
    if (!apt) {
      return NextResponse.json({ error: 'Nenhum agendamento encontrado para hoje com este número.' }, { status: 404 });
    }
    await apt.ref.update({ customerArrived: true, arrivedAt: Timestamp.now() });
    const firstName = String(apt.data().customerName || 'Cliente').split(' ')[0];
    return NextResponse.json({ firstName });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
