// Regras de agendamento executadas no servidor (Admin SDK). Usado pelas rotas /api/booking*.
// Preço, uso do plano e conflito de horário são decididos aqui, nunca pelo navegador.

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { addMinutes } from 'date-fns';
import { getAdminFirestore } from '@/firebase/admin';
import { parseDuration } from '@/lib/utils';

export class BookingError extends Error {
  constructor(public code: 'INVALID' | 'NOT_FOUND' | 'SLOT_TAKEN' | 'FORBIDDEN', message: string) {
    super(message);
  }
}

export type BusyBlock = { kind: 'appointment' | 'blocked'; professionalId: string | null; start: string; end: string };

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Janela de busca em volta de um horário. O servidor roda em UTC, então "o dia" é sempre
 * definido pelo navegador (from/to) ou por uma janela larga, nunca pelo relógio do servidor.
 */
function windowAround(date: Date) {
  return {
    from: Timestamp.fromMillis(date.getTime() - DAY_MS),
    to: Timestamp.fromMillis(date.getTime() + DAY_MS),
  };
}

/** Horários ocupados entre from e to (sem dados de clientes). */
export async function getBusyBlocks(rangeStart: Date, rangeEnd: Date): Promise<BusyBlock[]> {
  const db = getAdminFirestore();
  const from = Timestamp.fromDate(rangeStart);
  const to = Timestamp.fromDate(rangeEnd);
  const [apts, blocked] = await Promise.all([
    db.collection('appointments').where('startTime', '>=', from).where('startTime', '<=', to).get(),
    db.collection('blockedTimes').where('startTime', '>=', from).where('startTime', '<=', to).get(),
  ]);

  const blocks: BusyBlock[] = [];
  for (const doc of apts.docs) {
    const a = doc.data();
    if (a.status === 'cancelled') continue;
    const s = toDate(a.startTime), e = toDate(a.endTime);
    if (s && e) blocks.push({ kind: 'appointment', professionalId: a.professionalId || null, start: s.toISOString(), end: e.toISOString() });
  }
  for (const doc of blocked.docs) {
    const b = doc.data();
    const s = toDate(b.startTime), e = toDate(b.endTime);
    if (s && e) blocks.push({ kind: 'blocked', professionalId: b.professionalId || null, start: s.toISOString(), end: e.toISOString() });
  }
  return blocks;
}

type Customer =
  | { kind: 'user'; uid: string }
  | { kind: 'guest'; name: string; phone: string; kiosk: boolean };

export type BookingRequest = {
  customer: Customer;
  serviceId: string;
  professionalId: string;
  startTime: string; // ISO
  useSubscription?: boolean;
};

/** Cria o agendamento em transação: dois clientes não ficam com o mesmo horário. */
export async function createBooking(req: BookingRequest): Promise<{ id: string; isSubscriptionUsage: boolean }> {
  const db = getAdminFirestore();
  const start = toDate(req.startTime);
  if (!start || !req.serviceId || !req.professionalId) throw new BookingError('INVALID', 'Dados do agendamento incompletos.');
  if (start.getTime() < Date.now() - 5 * 60_000) throw new BookingError('INVALID', 'Escolha um horário no futuro.');

  const [serviceSnap, profSnap] = await Promise.all([
    db.doc(`services/${req.serviceId}`).get(),
    db.doc(`users/${req.professionalId}`).get(),
  ]);
  const service = serviceSnap.data();
  const prof = profSnap.data();
  if (!service) throw new BookingError('NOT_FOUND', 'Serviço não encontrado.');
  if (!prof || !['professional', 'admin'].includes(prof.role) || prof.disabled === true) {
    throw new BookingError('NOT_FOUND', 'Profissional não encontrado.');
  }
  if (Array.isArray(prof.serviceIds) && prof.serviceIds.length > 0 && !prof.serviceIds.includes(req.serviceId)) {
    throw new BookingError('INVALID', 'Este profissional não realiza o serviço escolhido.');
  }

  const duration = parseDuration(service.duration);
  const end = addMinutes(start, duration);
  const price = Number(service.price) || 0;

  // Dados do cliente
  let customerData: Record<string, any>;
  let membership: { ref: FirebaseFirestore.DocumentReference; usage: number; plan: any } | null = null;
  if (req.customer.kind === 'user') {
    const userSnap = await db.doc(`users/${req.customer.uid}`).get();
    const u = userSnap.data();
    if (!u) throw new BookingError('FORBIDDEN', 'Complete seu cadastro antes de agendar.');
    customerData = {
      customerId: req.customer.uid,
      customerName: u.name || 'Cliente',
      customerEmail: u.email || '',
      customerPhoneNumber: u.phoneNumber || '',
      customerPhotoURL: u.photoURL || '',
      type: 'client',
    };

    if (req.useSubscription !== false) {
      const ms = await db.collection('userMemberships')
        .where('userId', '==', req.customer.uid).where('status', '==', 'active').limit(1).get();
      if (!ms.empty) {
        const m = ms.docs[0];
        const planSnap = await db.doc(`membershipPlans/${m.data().planId}`).get();
        const plan = planSnap.data();
        if (plan?.includedServiceIds?.includes(req.serviceId)) {
          membership = { ref: m.ref, usage: 0, plan: { id: planSnap.id, ...plan } };
        }
      }
    }
  } else {
    const name = req.customer.name.trim().slice(0, 80);
    const phone = req.customer.phone.replace(/\D/g, '');
    if (!name || phone.length < 10 || phone.length > 13) throw new BookingError('INVALID', 'Informe nome e telefone válidos.');
    customerData = { customerName: name, customerPhoneNumber: req.customer.phone.trim().slice(0, 20), type: 'guest' };
  }

  const aptRef = db.collection('appointments').doc();
  let usedSubscription = false;

  await db.runTransaction(async (t) => {
    const [dayApts, dayBlocked] = await Promise.all([
      t.get(db.collection('appointments')
        .where('startTime', '>=', windowAround(start).from)
        .where('startTime', '<=', windowAround(start).to)),
      t.get(db.collection('blockedTimes')
        .where('startTime', '>=', windowAround(start).from)
        .where('startTime', '<=', windowAround(start).to)),
    ]);

    const taken = dayApts.docs.some((d) => {
      const a = d.data();
      if (a.status === 'cancelled' || a.professionalId !== req.professionalId) return false;
      const s = toDate(a.startTime), e = toDate(a.endTime);
      return !!(s && e && overlaps(start, end, s, e));
    }) || dayBlocked.docs.some((d) => {
      const b = d.data();
      if (b.professionalId && b.professionalId !== req.professionalId) return false;
      const s = toDate(b.startTime), e = toDate(b.endTime);
      return !!(s && e && overlaps(start, end, s, e));
    });
    if (taken) throw new BookingError('SLOT_TAKEN', 'Este horário acabou de ser ocupado. Escolha outro.');

    // Uso do plano conferido dentro da transação
    let subscription: Record<string, any> = {};
    if (membership) {
      const mSnap = await t.get(membership.ref);
      const m = mSnap.data() || {};
      const usage = Number(m.usageThisMonth ?? m.usageCount ?? 0);
      const max = Number(membership.plan.maxUsesPerMonth || 0);
      if (m.status === 'active' && (max === 999 || usage < max)) {
        usedSubscription = true;
        const repassPct = membership.plan.commissionRepassPercentage ?? 100;
        subscription = {
          isSubscriptionUsage: true,
          commissionBaseValue: (price * repassPct) / 100,
          subscriptionPlanId: membership.plan.id,
        };
        t.update(membership.ref, { usageThisMonth: usage + 1, usageCount: usage + 1 });
      }
    }

    t.set(aptRef, {
      ...customerData,
      serviceId: req.serviceId,
      serviceName: service.name || '',
      serviceDuration: String(service.duration ?? duration),
      servicePrice: usedSubscription ? 0 : price,
      priceOnRequest: service.priceOnRequest || false,
      professionalId: req.professionalId,
      professionalName: prof.name || '',
      startTime: Timestamp.fromDate(start),
      endTime: Timestamp.fromDate(end),
      status: 'scheduled',
      notes: usedSubscription ? 'Incluso no Clube de Assinaturas' : '',
      reminderSent: false,
      source: req.customer.kind === 'guest' && req.customer.kiosk ? 'totem' : 'app',
      createdAt: FieldValue.serverTimestamp(),
      ...subscription,
    });
  });

  return { id: aptRef.id, isSubscriptionUsage: usedSubscription };
}

/** Cliente remarca o próprio agendamento: mantém o serviço e o preço, troca horário/profissional. */
export async function rescheduleBooking(params: {
  uid: string;
  appointmentId: string;
  startTime: string;
  professionalId?: string;
}): Promise<void> {
  const db = getAdminFirestore();
  const start = toDate(params.startTime);
  if (!start || start.getTime() < Date.now() - 5 * 60_000) throw new BookingError('INVALID', 'Escolha um horário no futuro.');
  const ref = db.doc(`appointments/${params.appointmentId}`);

  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const apt = snap.data();
    if (!apt || apt.customerId !== params.uid) throw new BookingError('NOT_FOUND', 'Agendamento não encontrado.');
    if (apt.status !== 'scheduled') throw new BookingError('INVALID', 'Só é possível remarcar agendamentos ativos.');

    // Antecedência mínima parametrizada por estabelecimento (mesma regra do cancelamento)
    const settings = (await t.get(db.doc('establishmentSettings/main'))).data() || {};
    const limitHours = Number(settings.cancellationTimeLimitHours ?? 24);
    const currentStart = toDate(apt.startTime);
    if (currentStart && currentStart.getTime() - Date.now() < limitHours * 60 * 60 * 1000) {
      throw new BookingError(
        'FORBIDDEN',
        `Alterações só podem ser feitas com até ${limitHours} hora(s) de antecedência. Fale com o estabelecimento.`,
      );
    }

    const professionalId = params.professionalId || apt.professionalId;
    let professionalName = apt.professionalName;
    if (professionalId !== apt.professionalId) {
      const p = (await t.get(db.doc(`users/${professionalId}`))).data();
      if (!p || !['professional', 'admin'].includes(p.role) || p.disabled === true) {
        throw new BookingError('NOT_FOUND', 'Profissional não encontrado.');
      }
      if (Array.isArray(p.serviceIds) && p.serviceIds.length > 0 && !p.serviceIds.includes(apt.serviceId)) {
        throw new BookingError('INVALID', 'Este profissional não realiza o serviço.');
      }
      professionalName = p.name || '';
    }

    const end = addMinutes(start, parseDuration(apt.serviceDuration));
    const dayApts = await t.get(db.collection('appointments')
      .where('startTime', '>=', windowAround(start).from)
      .where('startTime', '<=', windowAround(start).to));
    const taken = dayApts.docs.some((d) => {
      if (d.id === params.appointmentId) return false;
      const a = d.data();
      if (a.status === 'cancelled' || a.professionalId !== professionalId) return false;
      const s = toDate(a.startTime), e = toDate(a.endTime);
      return !!(s && e && overlaps(start, end, s, e));
    });
    if (taken) throw new BookingError('SLOT_TAKEN', 'Este horário já está ocupado. Escolha outro.');

    t.update(ref, {
      startTime: Timestamp.fromDate(start),
      endTime: Timestamp.fromDate(end),
      professionalId,
      professionalName,
      reminderSent: false,
    });
  });
}

export function bookingErrorStatus(err: unknown): number {
  if (!(err instanceof BookingError)) return 500;
  return { INVALID: 400, NOT_FOUND: 404, SLOT_TAKEN: 409, FORBIDDEN: 403 }[err.code];
}
