// firebase.js - Firebase v10 modular SDK setup and auto-seed logic
// Replace the config placeholders with your Firebase project config.

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA31A3akROESw4-ZyqS_Vfci_Qp_JNyrt4",
  authDomain: "mnr-constructions-de647.firebaseapp.com",
  projectId: "mnr-constructions-de647",
  storageBucket: "mnr-constructions-de647.firebasestorage.app",
  messagingSenderId: "972625665715",
  appId: "1:972625665715:web:fe662a5994e5b00c709ac6"
};

// initialize app and firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Auto-seed function: creates stats and sample projects if they don't exist
export async function autoSeedIfNeeded() {
  try {
    const statsRef = doc(db, 'meta', 'statsRow');
    const statsSnap = await getDoc(statsRef);
    if (!statsSnap.exists()) {
      // create a stats document
      await setDoc(statsRef, { total_clients: 12, total_projects: 8, years_experience: 4, seeded: true });
      // create sample projects collection
      const sample = [
        { name: 'Home Build', category: 'Residential', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800' },
        { name: 'Interior Work', category: 'Interior', image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800' },
        { name: 'Land Sale', category: 'Land', image: 'https://images.unsplash.com/photo-1599423300746-b62533397364?w=800' }
      ];
      for (const p of sample) {
        await addDoc(collection(db, 'projects'), p);
      }
      console.log('Firestore seeded with sample data.');
    } else {
      console.log('Firestore already seeded.');
    }
  } catch (err) {
    console.error('Auto-seed error:', err);
  }
}

export { db };
