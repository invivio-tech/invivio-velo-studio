
const admin = require('firebase-admin');

// Load environment variables manually if needed or assume serviceAccountKey.json is present/env var set
// Using the trick from before to load credentials
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testQueries() {
    try {
        console.log('--- Testing Query for ALL Professionals ---');
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of month

        console.log(`Period: ${start.toISOString()} to ${end.toISOString()}`);

        const allQuery = db.collection('appointments')
            .where('status', '==', 'completed')
            .where('startTime', '>=', start)
            .where('startTime', '<=', end);

        const allSnapshot = await allQuery.get();
        console.log(`ALL Query Results: ${allSnapshot.size} documents`);
        let allTotal = 0;
        allSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, Prof: ${data.professionalName} (${data.professionalId}), Price: ${data.servicePrice}`);
            allTotal += (data.servicePrice || 0);
        });
        console.log(`ALL Total Calculated: ${allTotal}`);


        console.log('\n--- Testing Query for SPECIFIC Professional ---');
        // Let's find a professional ID from the previous results or list users
        const usersSnapshot = await db.collection('users').where('role', '==', 'professional').limit(1).get();
        if (!usersSnapshot.empty) {
            const prof = usersSnapshot.docs[0];
            const profId = prof.id;
            console.log(`Testing for Professional: ${prof.data().name} (${profId})`);

            const profQuery = db.collection('appointments')
                .where('status', '==', 'completed')
                .where('professionalId', '==', profId)
                .where('startTime', '>=', start)
                .where('startTime', '<=', end);

            const profSnapshot = await profQuery.get();
            console.log(`PROF Query Results: ${profSnapshot.size} documents`);
            let profTotal = 0;
            profSnapshot.forEach(doc => {
                profTotal += (doc.data().servicePrice || 0);
            });
            console.log(`PROF Total Calculated: ${profTotal}`);
        } else {
            console.log('No professionals found to test specific query.');
        }

    } catch (error) {
        console.error('Error executing queries:', error);
    }
}

testQueries();
