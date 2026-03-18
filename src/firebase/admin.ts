import * as admin from 'firebase-admin';

export function initAdmin() {
    console.log('initAdmin: Checking admin.apps.length:', admin.apps.length);
    if (admin.apps.length > 0) {
        console.log('initAdmin: Returning existing admin.app()');
        return admin.app();
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'invivio-velo';
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket,
            projectId,
        });
        console.log('Firebase Admin initialized with applicationDefault');
    } catch (error) {
        console.error('Firebase Admin init error with applicationDefault:', error);

        try {
            admin.initializeApp({
                storageBucket,
                projectId,
            });
            console.log('Firebase Admin initialized with container defaults');
        } catch (error2) {
            console.error('Firebase Admin fallback init error:', error2);
            throw error2;
        }
    }
    return admin.app();
}

export const getAdminStorage = () => {
    initAdmin();
    return admin.storage();
};

export const getAdminFirestore = () => {
    initAdmin();
    return admin.firestore();
};

export const getAdminAuth = () => {
    initAdmin();
    return admin.auth();
};
