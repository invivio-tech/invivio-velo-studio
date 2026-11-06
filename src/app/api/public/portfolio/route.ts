import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

/** Trabalhos em destaque da landing page: só foto, serviço e profissional. */
export async function GET() {
  try {
    const snap = await getAdminFirestore().collection('appointments')
      .where('status', '==', 'completed')
      .where('isPortfolioFeatured', '==', true)
      .orderBy('startTime', 'desc')
      .limit(6)
      .get();
    const items = snap.docs
      .map((d) => {
        const a = d.data();
        return {
          id: d.id,
          serviceName: a.serviceName || '',
          professionalName: a.professionalName || '',
          completionPhotos: Array.isArray(a.completionPhotos) ? a.completionPhotos.slice(0, 3) : [],
        };
      })
      .filter((i) => i.completionPhotos.length > 0);
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (err) {
    console.error('[public/portfolio]', err);
    return NextResponse.json({ items: [] });
  }
}
