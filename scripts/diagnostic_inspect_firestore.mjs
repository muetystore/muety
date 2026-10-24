import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

function loadEnvConfig() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      envVars[key] = val;
    }
  });
  return envVars;
}

async function run() {
  const env = loadEnvConfig();
  const projectId = env.VITE_FIREBASE_PROJECT_ID || 'muetystore-fdad2';

  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('\n--- FIRESTORE CATEGORIES ---');
  try {
    const catSnap = await getDocs(collection(db, 'categories'));
    console.log(`Found ${catSnap.size} category documents:`);
    catSnap.forEach(d => {
      const data = d.data();
      console.log(JSON.stringify({
        docId: d.id,
        name: data.name,
        slug: data.slug,
        categoryCode: data.categoryCode,
        itemCount: data.itemCount,
        active: data.active,
        createdAt: data.createdAt
      }, null, 2));
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
  }

  console.log('\n--- FIRESTORE CATEGORY CODES ---');
  try {
    const codeSnap = await getDocs(collection(db, 'categoryCodes'));
    console.log(`Found ${codeSnap.size} categoryCode documents:`);
    codeSnap.forEach(d => {
      console.log(JSON.stringify({ docId: d.id, ...d.data() }, null, 2));
    });
  } catch (err) {
    console.error('Error fetching categoryCodes:', err);
  }

  console.log('\n--- FIRESTORE PRODUCTS ---');
  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    console.log(`Found ${prodSnap.size} product documents:`);
    prodSnap.forEach(d => {
      const data = d.data();
      console.log(JSON.stringify({
        docId: d.id,
        name: data.name || data.title,
        sku: data.sku,
        categoryIds: data.categoryIds,
        primaryCategoryId: data.primaryCategoryId,
        categoryId: data.categoryId,
        category: data.category,
        categorySlug: data.categorySlug,
        published: data.published,
        status: data.status,
        availability: data.availability
      }, null, 2));
    });
  } catch (err) {
    console.error('Error fetching products:', err);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
