import { initAdmin } from './src/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function setAdmin() {
    console.log("Setting admin role for invivio.tech@gmail.com...");
    const app = initAdmin();
    const db = getFirestore(app);

    // Find the user by email
    const usersSnapshot = await db.collection('users').where('email', '==', 'invivio.tech@gmail.com').get();
    
    if (usersSnapshot.empty) {
        console.log("User invivio.tech@gmail.com not found in database.");
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    await userDoc.ref.update({ role: 'admin' });
    console.log(`User ${userDoc.id} role updated to 'admin'.`);
}

setAdmin().then(() => process.exit(0)).catch(console.error);
