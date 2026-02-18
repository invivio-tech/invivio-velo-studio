
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkUser() {
    const email = 'barbeiro@teste.com';
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('Auth User:', userRecord.uid, userRecord.email);

    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (!userDoc.exists) {
        console.log('User document does NOT exist in Firestore!');
    } else {
        console.log('User Document Data:', JSON.stringify(userDoc.data(), null, 2));
    }
}

checkUser().catch(console.error);
