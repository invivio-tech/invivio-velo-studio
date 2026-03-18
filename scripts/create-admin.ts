
import * as admin from 'firebase-admin';

export function setupAdmin() {
    if (admin.apps.length > 0) return admin.app();

    // Tentar inicialização manual se os containers/applicationDefault falharem no ambiente local
    const config = {
        projectId: 'invivio-velo',
        storageBucket: 'invivio-velo.firebasestorage.app',
    };

    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            ...config
        });
    } catch (e) {
        // Fallback para quando estamos rodando scripts locais sem ADC configurado perfeitamente
        admin.initializeApp(config);
    }
    return admin.app();
}

async function createAdminUser(email: string, name: string) {
  try {
    const app = setupAdmin();
    const db = admin.firestore(app);
    const auth = admin.auth(app);

    console.log(`Buscando ou criando usuário para: ${email}`);

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`Usuário já existe no Auth: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: email,
          displayName: name,
          password: 'temp-password-123',
        });
        console.log(`Novo usuário criado no Auth: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }

    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      id: userRecord.uid,
      name: name,
      email: email,
      role: 'admin',
      disabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Perfil de Administrador atualizado no Firestore para ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Erro detalhado:', error);
    process.exit(1);
  }
}

createAdminUser('araujodacostalucas14@gmail.com', 'Lucas Costa');
