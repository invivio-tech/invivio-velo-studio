import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, text } = body;

    // Use environment variable for the Admin API, fallback to production URL
    const adminUrl = process.env.NEXT_PUBLIC_VELO_ADMIN_URL || 'https://invivio-velo-admin.web.app';
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!databaseId) {
      return NextResponse.json({ error: 'Missing databaseId configuration' }, { status: 500 });
    }

    const response = await fetch(`${adminUrl}/api/webhooks/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        databaseId,
        to,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Studio] Erro ao disparar mensagem via Velo Admin:', errorText);
      return NextResponse.json({ error: 'Falha ao enviar mensagem' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Studio API chat/send]', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
