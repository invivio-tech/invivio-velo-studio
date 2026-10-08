const { Firestore } = require('@google-cloud/firestore');

async function listDbs() {
  // Using Admin SDK logic to just check if we can query it
  const firestore = new Firestore({
    projectId: 'invivio-velo',
    databaseId: 'studiobarber'
  });
  
  try {
    const doc = await firestore.collection('establishmentSettings').doc('main').get();
    console.log(doc.data());
  } catch (e) {
    console.error(e);
  }
}
listDbs();
