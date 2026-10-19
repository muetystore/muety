import dotenv from 'dotenv';
dotenv.config();

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey && privateKey.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

const banners = [
  {
    id: 'diwali-hero',
    title: 'Heritage Pure Mulberry Silk',
    subtitle: 'Salem Pit-Loom Weaves Handcrafted with Certified Tested Gold Zari',
    image: '/diwali_hero_banner.jpg',
    link: '/products',
    alt: 'MUETY Pure Mulberry Silk & Certified Gold Zari Sarees',
    buttonText: 'Shop Handlooms',
    badgeText: 'SILK MARK CERTIFIED',
    objectPosition: 'center 35%',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function seed() {
  console.log('Seeding banners to Firestore...');
  for (const b of banners) {
    await db.collection('banners').doc(b.id).set(b, { merge: true });
    console.log(`Saved banner: ${b.title} (${b.id})`);
  }
  
  // If dasara-campaign exists in Firestore, delete or deactivate it
  try {
    const dasaraDoc = db.collection('banners').doc('dasara-campaign');
    const snap = await dasaraDoc.get();
    if (snap.exists) {
      await dasaraDoc.delete();
      console.log('Removed obsolete dasara-campaign from Firestore');
    }
  } catch (err) {
    console.warn('Note on dasara cleanup:', err);
  }

  console.log('Done!');
}

seed().then(() => process.exit(0)).catch(err => {
  console.error('Error seeding:', err);
  process.exit(1);
});
