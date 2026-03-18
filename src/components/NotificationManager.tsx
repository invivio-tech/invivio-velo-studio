
'use client';

import { useEffect } from 'react';
import { useUser, useUserProfile } from '@/firebase';
import { requestNotificationPermission, onMessageListener } from '@/firebase/messaging';
import { useToast } from '@/hooks/use-toast';

export function NotificationManager() {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    // Tenta ativar notificações para qualquer usuário logado que ainda não as tenha ativas
    const hasTokens = userProfile?.fcmTokens && userProfile.fcmTokens.length > 0;
    const isEnabled = userProfile?.notificationsEnabled;

    if (user && userProfile && (!hasTokens || !isEnabled)) {
      const setupNotifications = async () => {
        try {
          console.log('Iniciando configuração de notificações...');
          const token = await requestNotificationPermission(user.uid);
          if (token) {
            console.log('Notificações ativadas com sucesso!');
            toast({
              title: "Notificações Ativadas",
              description: "Você receberá lembretes de agendamentos neste dispositivo.",
            });
          } else {
            console.warn('Configuração de notificações falhou ou foi negada');
            // Não exibimos toast se retornar null (permissão negada/fechada)
          }
        } catch (error: any) {
          console.error('Erro no setup de notificações:', error);
          toast({
            variant: "destructive",
            title: "Erro nas Notificações",
            description: error.message || "Não foi possível configurar os lembretes. Verifique o console.",
          });
        }
      };

      // Pequeno delay para não impactar o carregamento inicial
      const timer = setTimeout(setupNotifications, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, userProfile]);

  useEffect(() => {
    // Listener para mensagens em primeiro plano
    if (user) {
      onMessageListener().then((payload: any) => {
        toast({
          title: payload.notification?.title || 'Nova Notificação',
          description: payload.notification?.body || '',
        });
      }).catch(err => console.log('Erro no listener de mensagens:', err));
    }
  }, [user, toast]);

  return null; // Componente sem interface, apenas lógica
}
