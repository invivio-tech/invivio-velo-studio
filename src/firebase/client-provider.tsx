'use client';

import { initializeFirebase, FirebaseProvider } from './provider';
import { UserProvider } from './auth/use-user';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, firestore, auth } = initializeFirebase();

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      firestore={firestore}
      auth={auth}
    >
      <UserProvider>{children}</UserProvider>
    </FirebaseProvider>
  );
}
