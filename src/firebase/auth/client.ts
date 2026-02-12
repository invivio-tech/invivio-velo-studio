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
      disabled: false,
      phoneNumber: '',
      birthDate: '',
      address: '',
      notes: '',
      loyaltyPoints: 0,
      serviceIds: [],
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
    // The error is returned to be handled by the UI, no need to log it here.
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

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
       if (userDoc.data().disabled) {
        await signOut(auth);
        return {
          code: 'auth/user-disabled',
          message: 'Esta conta de usuário foi desativada.',
        };
      }
    } else {
      // Self-healing: If a user profile is missing, create a new one with the 'client' role.
      // Role elevation (to professional or admin) must be done by an existing admin.
      const role = 'client';

      const userData = {
        id: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        photoURL: user.photoURL,
        role: role,
        disabled: false,
        phoneNumber: user.phoneNumber || '',
        birthDate: '',
        address: '',
        notes: '',
        loyaltyPoints: 0,
        serviceIds: [],
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
      }
    }
    
    return null;
  } catch (e: any) {
    // The error is returned to be handled by the UI, no need to log it here.
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
          if (userDoc.data().disabled) {
            await signOut(auth);
            return {
              code: 'auth/user-disabled',
              message: 'Esta conta de usuário foi desativada.',
            };
          }
          return null;
        }

        const role = 'client';

        const userData = {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: role,
            disabled: false,
            phoneNumber: user.phoneNumber || '',
            birthDate: '',
            address: '',
            notes: '',
            loyaltyPoints: 0,
            serviceIds: [],
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
          throw serverError;
        }

        return null;
    } catch (e: any) {
        // The error is returned to be handled by the UI, no need to log it here.
        return {
            code: e.code,
            message: e.message,
        };
    }
}

// --- Create account by Admin ---
export async function createAccountByAdmin(data: { name: string, email: string, pass: string, role: 'professional' | 'admin' | 'client', serviceIds?: string[], phoneNumber?: string, birthDate?: string, notes?: string, address?: string }) {
  const { name, email, pass, role, serviceIds, phoneNumber, birthDate, notes, address } = data;
  
  const tempAppName = `temp-user-creation-${Date.now()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, pass);
      const user = userCredential.user;

      const userRef = doc(db, 'users', user.uid);
      const userData = {
          id: user.uid,
          name: name,
          email: user.email,
          photoURL: null,
          role: role,
          serviceIds: role === 'professional' ? serviceIds || [] : [],
          disabled: false,
          phoneNumber: phoneNumber || '',
          birthDate: birthDate || '',
          notes: notes || '',
          address: address || '',
          loyaltyPoints: 0,
      };
      
      await setDoc(userRef, userData);
      
      return { user: userData, error: null };
  } catch (e: any) {
      // The error is returned to be handled by the UI, no need to log it here.
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
    // The error is returned to be handled by the UI, no need to log it here.
    return {
      code: e.code,
      message: e.message,
    };
  }
}
