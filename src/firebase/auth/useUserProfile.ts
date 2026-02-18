'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser } from '../provider';
import { useFirestore } from '../provider';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'client' | 'professional';
  serviceIds?: string[];
  disabled?: boolean;
  phoneNumber?: string;
  birthDate?: string;
  notes?: string;
  address?: string;
  loyaltyPoints?: number;
}

export function useUserProfile() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      setIsLoading(true);
      return;
    }
    if (!user || !firestore) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    const userRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setUserProfile(data);
        } else {
          setUserProfile(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching user profile:", error);
        // We could emit a global error here
        setUserProfile(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore, isUserLoading]);

  return { userProfile, isLoading };
}

