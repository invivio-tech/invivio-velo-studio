'use client';

import { useEffect, useState } from 'react';

export function WebViewBanner() {
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isInstagram = userAgent.includes('instagram');
    const isFacebook = userAgent.includes('fban') || userAgent.includes('fbav');
    const isWhatsApp = userAgent.includes('whatsapp');

    if (isInstagram || isFacebook || isWhatsApp) {
      setIsWebView(true);
    }
  }, []);

  if (!isWebView) return null;

  return (
    <div className="bg-yellow-500 text-yellow-950 px-4 py-3 text-xs md:text-sm font-medium flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex-1">
        <p>Você está no navegador do aplicativo.</p>
        <p className="opacity-90 mt-0.5">Para não perder sua sessão de login e agendamentos, toque nos 3 pontinhos acima e escolha <strong>&quot;Abrir no Chrome/Safari&quot;</strong>.</p>
      </div>
    </div>
  );
}
