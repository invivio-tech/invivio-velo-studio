// PIN do totem guardado fora do documento público (establishmentPrivate/main, só admin/servidor).
import { timingSafeEqual } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';

export async function getTotemPin(): Promise<string> {
  const db = getAdminFirestore();
  const priv = (await db.doc('establishmentPrivate/main').get()).data();
  if (typeof priv?.totemPin === 'string') return priv.totemPin;
  // Compatibilidade: PIN salvo antes da mudança, ainda no documento público
  const legacy = (await db.doc('establishmentSettings/main').get()).data();
  return typeof legacy?.totemPin === 'string' ? legacy.totemPin : '';
}

export async function checkTotemPin(pin: unknown): Promise<boolean> {
  const expected = await getTotemPin();
  if (!expected) return true; // totem sem PIN configurado
  const given = typeof pin === 'string' ? pin : '';
  const a = Buffer.from(given.padEnd(16).slice(0, 16));
  const b = Buffer.from(expected.padEnd(16).slice(0, 16));
  return given.length === expected.length && timingSafeEqual(a, b);
}

/** Salva o PIN no documento privado e remove a cópia do documento público. */
export async function setTotemPin(pin: string): Promise<void> {
  const db = getAdminFirestore();
  const clean = pin.replace(/\D/g, '').slice(0, 4);
  await db.doc('establishmentPrivate/main').set({ totemPin: clean, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.doc('establishmentSettings/main').set(
    { totemPin: FieldValue.delete(), totemPinEnabled: clean.length > 0 },
    { merge: true },
  );
}
