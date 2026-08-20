import { getAdminFirestore, initAdmin } from '../src/firebase/admin';

async function setup() {
  console.log('Seeding Multi-Professional Data...');
  initAdmin();
  const db = getAdminFirestore();

  // 1. Create a specific service "Tratamento VIP"
  const serviceVipRef = await db.collection('services').add({
    name: 'Tratamento VIP',
    description: 'Tratamento estético facial completo.',
    price: 150,
    duration: '60',
    categoryId: 'uncategorized'
  });
  const serviceVipId = serviceVipRef.id;
  console.log(`Created service 'Tratamento VIP' with ID: ${serviceVipId}`);

  // 2. Create service "Corte" explicitly
  const corteRef = await db.collection('services').add({
    name: 'Corte de Cabelo (Seeder)',
    description: 'Corte padrão',
    price: 50,
    duration: '30',
    categoryId: 'uncategorized'
  });
  const corteServiceId = corteRef.id;
  console.log(`Created service 'Corte de Cabelo' with ID: ${corteServiceId}`);

  // 3. Create 'Thiago' (professional) and assign him ONLY 'Corte'
  const thiagoRef = await db.collection('users').add({
    name: 'Thiago Barbeiro',
    email: 'thiago@velostudio.com',
    role: 'professional',
    disabled: false,
    serviceIds: [corteServiceId]
  });
  const thiagoId = thiagoRef.id;
  console.log(`Created Thiago with ID ${thiagoId}, serving only ${corteServiceId}`);

  // 4. Create 'Pedro' (professional) and assign him ONLY 'Tratamento VIP'
  const pedroRef = await db.collection('users').add({
    name: 'Pedro Especialista',
    email: 'pedro@velostudio.com',
    role: 'professional',
    disabled: false,
    serviceIds: [serviceVipId]
  });
  const pedroId = pedroRef.id;
  console.log(`Created Pedro with ID ${pedroId}, serving only ${serviceVipId}`);

  console.log('Data setup complete.');
}

setup().then(() => process.exit(0)).catch(console.error);
