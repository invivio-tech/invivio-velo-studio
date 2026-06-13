'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  auth.useDeviceLanguage();
  
  // Normalize storage bucket URL to gs:// format for maximum compatibility
  let bucketUrl = firebaseConfig.storageBucket;
  if (bucketUrl && !bucketUrl.startsWith('gs://')) {
    bucketUrl = `gs://${bucketUrl}`;
  }

  return {
    firebaseApp,
    auth,
    firestore: getFirestore(firebaseApp, process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID),
    storage: getStorage(firebaseApp, bucketUrl),
    functions: getFunctions(firebaseApp, 'southamerica-east1'),
    httpsCallable
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './auth/useUserProfile';
