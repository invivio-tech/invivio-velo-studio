importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAIFi1J1Swd9BwoD41RI5g9DAhrPEnM8So",
  authDomain: "invivio-velo.firebaseapp.com",
  projectId: "invivio-velo",
  storageBucket: "invivio-velo.firebasestorage.app",
  messagingSenderId: "1025476530851",
  appId: "1:1025476530851:web:6eb91fc499d7b95bcfa516",
  measurementId: "G-DNY8KLF7BG"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
