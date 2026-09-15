import { initAdmin } from './src/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function seedLocal() {
    console.log("Seeding local database...", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    const app = initAdmin();
    // In local development, the client connects to the default (or specified) db of the demo project.
    const db = getFirestore(app);

    const defaultPlanLimits = {
      tier: 'pro',
      maxProfessionals: 6,
      modules: {
        landingPage: true,
        clinicalRecord: true,
        scheduling: true,
        schedulingWhatsApp: true,
        financial: true,
        marketing: true
      }
    };

    await db.collection('establishmentSettings').doc('main').set({
        name: 'Clínica Demo Local',
        businessCategory: 'psychology',
        heroTitle: 'Bem-vindo à Clínica Demo Local',
        heroSubtitle: 'Atendimento e Cuidado com Especialistas.',
        primaryColor: '217 91% 60%',
        hostingUrl: 'http://localhost:9000',
        planLimits: defaultPlanLimits,
        createdAt: new Date()
    });

    console.log("Seeded establishmentSettings/main");
}

seedLocal().then(() => process.exit(0)).catch(console.error);
