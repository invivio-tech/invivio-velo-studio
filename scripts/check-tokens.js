const admin = require('firebase-admin');
const serviceAccount = require('./.firebase/invivio-velo/functions/invivio-velo-firebase-adminsdk.json'); // Might not be there, I'll try to find the key

// Let's try to initialize with ADC or look for a key
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'invivio-velo'
  });
}

const db = admin.firestore();

async function checkUserTokens(email) {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      console.log('No user found with email:', email);
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('User ID:', doc.id);
      console.log('FCM Tokens:', data.fcmTokens || 'MISSING');
      console.log('Notifications Enabled:', data.notificationsEnabled);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserTokens('invivio.tech@gmail.com');
