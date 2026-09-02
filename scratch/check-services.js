const admin = require('firebase-admin');
const app = admin.initializeApp({
  credential: admin.credential.cert(require('/home/alberto/velo-admin/service-account.json'))
});
const db = admin.firestore();
db.collection('services').limit(3).get().then(snap => {
  snap.docs.forEach(doc => console.log(doc.id, doc.data().duration));
  process.exit(0);
});
