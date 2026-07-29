import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'invivio-velo-dev' });
}
const db = admin.firestore();

async function seed() {
  const auth = admin.auth();
  const user = await auth.getUserByEmail('alberto@barbearia.com');
  const uid = user.uid;

  console.log('Alberto UID:', uid);

  // Criar Plano
  const planId = 'plano-ouro-mrr';
  await db.collection('membershipPlans').doc(planId).set({
    name: 'Plano Ouro (Mensal)',
    price: 150,
    commissionBaseValue: 60,
    maxUsesPerMonth: 4,
    includedServiceIds: ['corte-e-barba-id'],
    isActive: true
  });

  // Criar Serviço
  await db.collection('services').doc('corte-e-barba-id').set({
    name: 'Corte e Barba Premium',
    price: 80,
    duration: '60 min'
  });

  // Criar Assinatura para o Alberto
  await db.collection('userMemberships').doc('alberto-membership').set({
    userId: uid,
    planId: planId,
    status: 'active',
    currentPeriodStart: admin.firestore.Timestamp.now(),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
    usageThisMonth: 0
  });

  console.log('Dados populados com sucesso para Alberto usar a assinatura!');
  process.exit(0);
}
seed().catch(console.error);
