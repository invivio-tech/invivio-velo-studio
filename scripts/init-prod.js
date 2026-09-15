const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.production' });

const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupProduction() {
    try {
        const email = 'invivio.tech@gmail.com';
        const password = 'inviviosecure';
        console.log(`Setting up Admin: ${email} ...`);

        let adminCred;
        try {
            adminCred = await createUserWithEmailAndPassword(auth, email, password);
            console.log(`✅ Admin user created: ${adminCred.user.uid}`);
        } catch (createErr) {
            if (createErr.code === 'auth/email-already-in-use') {
                adminCred = await signInWithEmailAndPassword(auth, email, password);
                console.log(`✅ Logged in existing admin: ${adminCred.user.uid}`);
            } else {
                throw createErr;
            }
        }

        // Create admin profile
        await setDoc(doc(db, 'users', adminCred.user.uid), {
            email: email,
            name: 'Administrador Invivio',
            role: 'admin',
            loyaltyPoints: 0,
            createdAt: new Date()
        });
        console.log('✅ Admin user profile configured in Firestore!');

        // Initialize Establishment Settings
        await setDoc(doc(db, 'establishmentSettings', 'main'), {
            name: 'Invivio Care',
            about: 'Bem-vindo à Invivio Care. Nossa clínica oferece atendimento humanizado e de excelência, combinando profissionais altamente qualificados com tecnologia de ponta para proporcionar o melhor cuidado para você e para quem você ama.',
            heroTitle: 'Saúde e Bem-Estar em Boas Mãos.',
            heroSubtitle: 'Atendimento humanizado, profissionais especializados e agendamento online. Cuide-se com quem realmente entende do assunto.',
            servicesTitle: 'Nossos Procedimentos e Consultas',
            servicesSubtitle: 'Oferecemos uma ampla gama de serviços de saúde para cuidar de você e de quem você ama.',
            address: 'Seu Endereço Oficial, 123',
            businessCategory: 'general_practice',
            businessTone: 'friendly',
            cancellationTimeLimitHours: 24,
            loyaltyPercentage: 10,
            pointsPenaltyForNoShow: 5,
            professionalCommissionPercentage: 30,
            allowProfessionalToCompleteAppointment: true
        });
        console.log('✅ Establishment Settings configured in Firestore!');

        process.exit(0);
    } catch (e) {
        console.log('❌ Error:', e.message);
        process.exit(1);
    }
}

setupProduction();
