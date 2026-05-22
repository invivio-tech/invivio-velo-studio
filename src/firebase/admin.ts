import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

export function initAdmin(): admin.app.App {
    // Return cached app if already initialized by this module
    if (adminApp) return adminApp;

    // If apps exist, try to get the default app.
    // On Cloud Run (Firebase Hosting), the framework may pre-initialize a NAMED app
    // (not the default), causing admin.app() to throw. We handle this gracefully.
    if (admin.apps.length > 0) {
        try {
            adminApp = admin.app(); // tries to get the [DEFAULT] app
            console.log('Firebase Admin: reusing existing default app');
            return adminApp;
        } catch {
            // No [DEFAULT] app exists even though other named apps do.
            // Fall through to initialize our own default app.
            console.log('Firebase Admin: apps exist but no default — initializing fresh');
        }
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

    let credential: admin.credential.Credential;

    // Option 1: Use explicit service account JSON (most reliable, works everywhere)
    const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            credential = admin.credential.cert(serviceAccount);
            console.log('Firebase Admin: using service account cert credential');
        } catch (e) {
            console.error('Firebase Admin: failed to parse SERVICE_ACCOUNT_JSON', e);
            credential = admin.credential.applicationDefault();
        }
    } else {
        // Option 2: Application Default Credentials (works on Cloud Run with correct IAM)
        credential = admin.credential.applicationDefault();
        console.log('Firebase Admin: using applicationDefault credential');
    }

    adminApp = admin.initializeApp({ credential, storageBucket, projectId });
    console.log(`Firebase Admin initialized: project=${projectId}, bucket=${storageBucket}`);
    return adminApp;
}

export const getAdminStorage = () => {
    const app = initAdmin();
    return admin.storage(app);
};

export const getAdminFirestore = () => {
    const app = initAdmin();
    return admin.firestore(app);
};

export const getAdminAuth = () => {
    const app = initAdmin();
    return admin.auth(app);
};
