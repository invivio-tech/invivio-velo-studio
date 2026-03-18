
'use client';

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { initializeFirebase } from './index';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function requestNotificationPermission(userId: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('Este navegador não suporta notificações desktop');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Permissão concedida!');
      return await getAndSaveToken(userId);
    } else {
      console.log('Permissão negada ou fechada. Status:', permission);
      return null;
    }
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificação:', error);
    return null;
  }
}

async function getAndSaveToken(userId: string) {
  const { firebaseApp, firestore } = initializeFirebase();
  const messaging = getMessaging(firebaseApp);

  try {
    console.log('FCM: Registrando Service Worker...');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('FCM: Service Worker registrado:', registration.scope);
    
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log('FCM: Obtendo token com VAPID Key:', vapidKey ? 'Configurada' : 'NÃO CONFIGURADA');

    if (!vapidKey) {
      throw new Error('Chave VAPID não encontrada no ambiente (.env)');
    }

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('FCM: Token gerado com sucesso:', currentToken);
      
      try {
        const userRef = doc(firestore, 'users', userId);
        console.log('FCM: Salvando token no Firestore para o usuário:', userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken),
          notificationsEnabled: true,
          updatedAt: new Date()
        });
        console.log('FCM: Token salvo com sucesso no Firestore');
      } catch (saveError: any) {
        console.error('FCM: Erro ao salvar token no Firestore:', saveError);
        throw new Error(`Erro ao salvar no Firestore: ${saveError.message}`);
      }
      
      return currentToken;
    } else {
      console.warn('FCM: Nenhum token de registro disponível. Verifique as configurações do VAPID.');
      throw new Error('Nenhum token foi retornado (permissão negada ou erro de configuração)');
    }
  } catch (error: any) {
    console.error('FCM: Erro crítico na etapa de obtenção do token FCM:', error);
    throw error; // Rethrow to let the UI handle it with a toast
  }
}

export function onMessageListener() {
  const { firebaseApp } = initializeFirebase();
  const messaging = getMessaging(firebaseApp);
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Mensagem recebida em primeiro plano:', payload);
      resolve(payload);
    });
  });
}
