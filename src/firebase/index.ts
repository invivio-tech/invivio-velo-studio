'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

let cachedSdks: ReturnType<typeof createSdks> | null = null;

export function hasStoredAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('firebase:authUser:')) {
        const val = window.localStorage.getItem(k);
        if (val && val !== 'null') return true;
      }
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (typeof window !== 'undefined' && cachedSdks) {
    return cachedSdks;
  }

  const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const sdks = getSdks(firebaseApp);

  if (typeof window !== 'undefined') {
    cachedSdks = sdks;
  }

  return sdks;
}

function createSdks(firebaseApp: FirebaseApp) {
  // Prioriza browserLocalPersistence (localStorage síncrono e estável em PWAs mobile)
  // com fallback/migração automática do indexedDBLocalPersistence.
  let auth: Auth;
  if (typeof window !== 'undefined') {
    try {
      auth = initializeAuth(firebaseApp, {
        persistence: [browserLocalPersistence, indexedDBLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch {
      auth = getAuth(firebaseApp);
    }
  } else {
    auth = getAuth(firebaseApp);
  }
  auth.useDeviceLanguage();

  // Normalize storage bucket URL to gs:// format for maximum compatibility
  let bucketUrl = firebaseConfig.storageBucket;
  if (bucketUrl && !bucketUrl.startsWith('gs://')) {
    bucketUrl = `gs://${bucketUrl}`;
  }

  return {
    firebaseApp,
    auth,
    firestore: firebaseConfig.databaseId
      ? initializeFirestore(firebaseApp, {}, firebaseConfig.databaseId)
      : getFirestore(firebaseApp),
    storage: getStorage(firebaseApp, bucketUrl),
    functions: getFunctions(firebaseApp, 'southamerica-east1'),
    httpsCallable
  };
}

export function getSdks(firebaseApp: FirebaseApp) {
  if (typeof window !== 'undefined' && cachedSdks) {
    return cachedSdks;
  }
  return createSdks(firebaseApp);
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
