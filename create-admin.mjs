import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/home/alberto/barber/studio/service-account.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

const email = 'teste@teste.com';
const password = 'password123'; // Let's use standard password

async function ensureAdmin() {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password });
    console.log(`User ${email} updated password.`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      user = await auth.createUser({ email, password, displayName: 'Admin E2E' });
      console.log(`User ${email} created.`);
    } else {
      throw e;
    }
  }

  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    email: user.email,
    name: 'Admin E2E',
    role: 'admin',
    disabled: false
  }, { merge: true });
  console.log(`User ${email} role set to admin.`);
}

ensureAdmin().catch(console.error);
