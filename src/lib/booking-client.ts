'use client';

import { Timestamp } from 'firebase/firestore';
import { authFetch } from '@/lib/auth-fetch';

/** Agendamento ocupado do dia, no formato que as telas de disponibilidade já usam. */
export type BusyAppointment = {
  id: string;
  professionalId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'scheduled';
};

/** Horários ocupados do dia, sem dados de clientes (a agenda não é lida direto do banco). */
export async function fetchBusyAppointments(day: Date): Promise<BusyAppointment[]> {
  const from = new Date(day); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + 1);
  const qs = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  const res = await fetch(`/api/booking/availability?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Não foi possível carregar a agenda.');
  const { busy } = await res.json();
  return (busy as any[])
    .filter((b) => b.kind === 'appointment')
    .map((b, i) => ({
      id: `busy-${i}`,
      professionalId: b.professionalId,
      startTime: Timestamp.fromDate(new Date(b.start)),
      endTime: Timestamp.fromDate(new Date(b.end)),
      status: 'scheduled' as const,
    }));
}

async function postJson(url: string, body: unknown, withAuth: boolean) {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const res = withAuth ? await authFetch(url, init) : await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}

/** Cria o agendamento no servidor (preço, plano e conflito de horário conferidos lá). */
export function createBookingRequest(body: {
  serviceId: string;
  professionalId: string;
  startTime: Date;
  useSubscription?: boolean;
  guest?: { name: string; phone: string };
  kiosk?: boolean;
  pin?: string;
}): Promise<{ id: string; isSubscriptionUsage: boolean }> {
  return postJson('/api/booking', { ...body, startTime: body.startTime.toISOString() }, !body.kiosk);
}

export function rescheduleBookingRequest(body: { appointmentId: string; startTime: Date; professionalId?: string }) {
  return postJson('/api/booking/reschedule', { ...body, startTime: body.startTime.toISOString() }, true);
}
