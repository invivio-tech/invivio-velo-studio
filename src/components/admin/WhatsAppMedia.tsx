'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';

/**
 * Mídia recebida pelo WhatsApp, servida pelo velo-admin (proxy da Meta). Carrega com o token do
 * usuário; se falhar (ex.: admin ainda sem CORS), usa a URL direta como antes.
 */
export function WhatsAppMedia({ mediaId, mimeType }: { mediaId: string; mimeType?: string }) {
  const adminUrl = process.env.NEXT_PUBLIC_VELO_ADMIN_URL || 'https://invivio-velo-admin.web.app';
  const tenantId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const directUrl = `${adminUrl}/api/webhooks/whatsapp/media?mediaId=${mediaId}&tenantId=${tenantId}`;
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    authFetch(directUrl)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      })
      .catch(() => { if (!cancelled) setSrc(directUrl); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [directUrl]);

  if (!src) return <div className="mb-2 h-10 w-40 animate-pulse rounded bg-muted" />;

  return (
    <div className="mb-2">
      {mimeType?.startsWith('audio/') ? (
        <audio controls className="max-w-full h-10" src={src}>
          Seu navegador não suporta áudio.
        </audio>
      ) : mimeType?.startsWith('image/') ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="Imagem recebida" className="max-w-[200px] rounded cursor-pointer border border-border" onClick={() => window.open(src, '_blank')} />
      ) : mimeType?.startsWith('video/') ? (
        <video controls className="max-w-[200px] rounded border border-border" src={src} />
      ) : (
        <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary underline text-xs bg-primary/5 p-2 rounded-lg border border-primary/10">
          <FileText className="w-3.5 h-3.5" /> Abrir Anexo Documento
        </a>
      )}
    </div>
  );
}
