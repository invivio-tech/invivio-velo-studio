import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

const email = 'teste@teste.com';
const password = 'password123'; // wait I was using 123456 in e2e-test-part2.mjs

async function ensureAdmin() {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password: 'password123' });
    console.log(`User ${email} updated password.`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      user = await auth.createUser({ email, password: 'password123', displayName: 'Admin Dev' });
      console.log(`User ${email} created.`);
    } else {
      throw e;
    }
  }

  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    email: user.email,
    name: 'Admin Dev',
    role: 'admin',
    disabled: false
  }, { merge: true });
  console.log(`User ${email} role set to admin.`);
}

ensureAdmin().catch(console.error);
