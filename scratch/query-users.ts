import { getAdminFirestore, initAdmin } from '../src/firebase/admin';
initAdmin();
const db = getAdminFirestore();
db.collection('users').where('role', '==', 'client').limit(5).get().then(s => {
  s.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
});
