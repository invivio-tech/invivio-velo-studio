import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Trabalhos em destaque da landing page: só foto, serviço e profissional. */
export async function GET(request: Request) {
  const limited = rateLimit(`portfolio:${clientIp(request)}`, 60, 60_000);
  if (limited) return limited;
  try {
    // Só igualdade em um campo (sem índice composto); status e ordem tratados em memória
    const snap = await getAdminFirestore().collection('appointments')
      .where('isPortfolioFeatured', '==', true)
      .limit(100)
      .get();
    const items = snap.docs
      .filter((d) => d.data().status === 'completed')
      .sort((a, b) => (b.data().startTime?.toMillis?.() ?? 0) - (a.data().startTime?.toMillis?.() ?? 0))
      .slice(0, 6)
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
