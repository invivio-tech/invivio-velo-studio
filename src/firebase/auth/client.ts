'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type User,
  getAuth,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '..';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../config';

const { auth, firestore: db } = initializeFirebase();

// --- Create account ---
export async function createAccount(name: string, email: string, pass: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName: name });

    const userRef = doc(db, 'users', user.uid);
    const role = 'client';

    const userData = {
      id: user.uid,
      name: name,
      email: user.email,
      photoURL: user.photoURL,
      role: role,
    };

    try {
      await setDoc(userRef, userData, { merge: true });
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'create',
        requestResourceData: userData,
      });
      errorEmitter.emit('permission-error', permissionError);
      throw serverError; // Re-throw to be caught by the outer catch
    }

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
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Self-healing: Check for and create profile if it's missing.
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Profile is missing, create it.
      const isAdmin = user.email === 'admin@barbearia.com';
      const isProfessional = user.email?.endsWith('@barbearia.com') && !isAdmin;
      const role = isAdmin ? 'admin' : isProfessional ? 'professional' : 'client';

      const userData = {
        id: user.uid,
        name: user.displayName || user.email, // Use email as fallback name
        email: user.email,
        photoURL: user.photoURL,
        role: role,
      };

      try {
        await setDoc(userRef, userData, { merge: true });
      } catch (serverError: any) {
          const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'create',
              requestResourceData: userData,
          });
          errorEmitter.emit('permission-error', permissionError);
          // Don't block login if self-healing fails, just log it.
          console.error("Failed to self-heal user profile:", serverError);
      }
    }
    
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

        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          // User profile already exists, do nothing to their role.
          return null;
        }

        // If user profile does not exist, create a new one as 'client'.
        const role = 'client';

        const userData = {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: role,
        };

        try {
          await setDoc(userRef, userData, { merge: true });
        } catch (serverError) {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create', // Using 'create' as it's an upsert
            requestResourceData: userData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        }

        return null;
    } catch (e: any) {
        console.error(e);
        return {
            code: e.code,
            message: e.message,
        };
    }
}

// --- Create account by Admin ---
export async function createAccountByAdmin(data: { name: string, email: string, pass: string, role: 'professional' | 'admin' | 'client', serviceIds?: string[] }) {
  const { name, email, pass, role, serviceIds } = data;
  
  // Use a temporary app instance to create the user without signing out the admin
  const tempAppName = `temp-user-creation-${Date.now()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, pass);
      const user = userCredential.user;

      // Now, use the main db instance to create the Firestore document
      const userRef = doc(db, 'users', user.uid);
      const userData = {
          id: user.uid,
          name: name,
          email: user.email,
          photoURL: null, // No photoURL when creating via email/pass
          role: role,
          serviceIds: role === 'professional' ? serviceIds || [] : [],
      };
      
      // This needs to be done with admin privileges, which the security rules should allow.
      await setDoc(userRef, userData);
      
      return { user: userData, error: null };
  } catch (e: any) {
      console.error('Error creating user by admin:', e);
      return { user: null, error: { code: e.code, message: e.message } };
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

// --- Password Reset ---
export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return null;
  } catch (e: any) {
    console.error(e);
    return {
      code: e.code,
      message: e.message,
    };
  }
}