
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function clearCollection(collectionName: string) {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log(`Collection ${collectionName} is already empty.`);
        return;
    }

    const batchSize = 500;
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;

        if (count % batchSize === 0) {
            await batch.commit();
            batch = db.batch();
            console.log(`Deleted ${count} documents from ${collectionName}...`);
        }
    }

    if (count % batchSize !== 0) {
        await batch.commit();
    }

    console.log(`Deleted total ${count} documents from ${collectionName}.`);
}

async function resetLoyaltyPoints() {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('loyaltyPoints', '>', 0).get();

    if (snapshot.empty) {
        console.log('No users with loyalty points found.');
        return;
    }

    const batchSize = 500;
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.update(doc.ref, { loyaltyPoints: 0 });
        count++;

        if (count % batchSize === 0) {
            await batch.commit();
            batch = db.batch();
            console.log(`Reset loyalty points for ${count} users...`);
        }
    }

    if (count % batchSize !== 0) {
        await batch.commit();
    }

    console.log(`Reset loyalty points for total ${count} users.`);
}


async function main() {
    console.log('Starting database cleanup...');

    try {
        await clearCollection('appointments');
        await clearCollection('blockedTimes');
        await resetLoyaltyPoints();
        console.log('Database cleanup completed successfully.');
    } catch (error) {
        console.error('Error cleaning database:', error);
    }
}

main();
