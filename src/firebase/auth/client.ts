'use client';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '../config';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

const auth = getAuth(app);
const db = getFirestore(app);

// --- Crate account ---
export async function createAccount(name: string, email: string, pass: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    // Update profile
    await updateProfile(user, { displayName: name });

    // Create user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userData = {
      name: name,
      email: user.email,
      photoURL: user.photoURL,
    };

    setDoc(userRef, userData, { merge: true }).catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'create',
        requestResourceData: userData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    return null;
  } catch (e: any) {
    console.error(e);
    return {
      code: e.code,
      message: e.message,
    };
  }
}

// --- Login with email and password ---
export async function loginWithEmail(email: string, pass: string) {
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    return null;
  } catch (e: any) {
    console.error(e);
    return {
      code: e.code,
      message: e.message,
    };
  }
}

// --- Sign in with Google ---
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Create or update user document in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userData = {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
        };

        setDoc(userRef, userData, { merge: true }).catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create', // or 'update' depending on your logic
            requestResourceData: userData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

        return null;
    } catch (e: any) {
        console.error(e);
        return {
            code: e.code,
            message: e.message,
        };
    }
}


// --- Logout ---
export function logout() {
  return signOut(auth);
}

// --- Auth State Observer ---
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
