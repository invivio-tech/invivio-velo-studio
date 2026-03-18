'use client';

import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { EstablishmentSettings } from '@/app/establishment/page';

export function DynamicMetadata() {
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  useEffect(() => {
    if (settings?.name) {
      document.title = settings.name;
    }

    if (settings?.logoUrl) {
      // Update or create favicon
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.logoUrl;
    }
  }, [settings]);

  return null;
}
