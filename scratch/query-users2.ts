import { getAdminFirestore, initAdmin } from '../src/firebase/admin';
initAdmin();
const db = getAdminFirestore();
db.collection('users').doc('linuxbarber5').get().then(d => {
  if (d.exists) {
    console.log(d.id, typeof d.data().birthDate, d.data().birthDate);
  } else {
    console.log("Not found");
  }
  process.exit(0);
});
