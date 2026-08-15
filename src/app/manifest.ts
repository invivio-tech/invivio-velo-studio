import type { MetadataRoute } from 'next';
import { getAdminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = 'Barbearia Inteligente';
  let short_name = 'Barbearia';
  let description = 'Sistema de Agendamento Inteligente';
  let iconUrl = '/icons/icon-192x192.png';
  let iconUrl512 = '/icons/icon-512x512.png';

  try {
    const db = getAdminFirestore();
    const doc = await db.collection('establishmentSettings').doc('main').get();
    
    if (doc.exists) {
      const data = doc.data();
      if (data?.name) {
        name = data.name;
        short_name = data.name.substring(0, 12);
      }
      if (data?.description) {
        description = data.description;
      }
      if (data?.logoUrl) {
        iconUrl = data.logoUrl;
        iconUrl512 = data.logoUrl;
      }
    }
  } catch (error) {
    console.error('Error fetching manifest data:', error);
  }

  return {
    name,
    short_name,
    description,
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: iconUrl512,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
