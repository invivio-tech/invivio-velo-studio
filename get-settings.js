const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({
  projectId: 'invivio-velo'
});

const clientDb = getFirestore(app, 'studiobarber');

async function getSettings() {
  const doc = await clientDb.collection('establishmentSettings').doc('main').get();
  console.log(JSON.stringify(doc.data(), null, 2));
}

getSettings().catch(console.error);
