/**
 * MUETYSTORE — Live Firestore Product Catalog Verification Script (Stage 02D.3)
 * 
 * Target Project: muetystore-fdad2
 * Collection: /products
 * 
 * Verifies live Firestore connectivity, /products query authority, and firestore.rules security enforcement:
 * 1. LIVE FIRESTORE READ & QUERY — Reads products from live /products collection.
 * 2. FIRESTORE.RULES WRITE ENFORCEMENT — Verifies that unauthenticated/non-admin writes are strictly DENIED by security rules.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  limit 
} from 'firebase/firestore';
import fs from 'fs';

function loadEnvConfig() {
  const envPath = '.env';
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file missing!');
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
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

async function runLiveFirestoreVerification() {
  console.log('\n=============================================================');
  console.log('🧪 MUETYSTORE — LIVE FIRESTORE PRODUCT VERIFICATION (STAGE 02D.3)');
  console.log('=============================================================\n');

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

  console.log(` 📌 Connecting to Live Firebase Project: \x1b[36m${projectId}\x1b[0m`);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const results = {
    readCatalog: false,
    documentCount: 0,
    writeProtectionEnforced: false,
    error: null
  };

  // 1. LIVE FIRESTORE CATALOG QUERY
  try {
    console.log('\n 1️⃣ QUERYING Live Firestore [/products] Collection...');
    const qSnap = await getDocs(query(collection(db, 'products'), limit(10)));
    results.readCatalog = true;
    results.documentCount = qSnap.size;
    console.log(`    ✅ Retrieved ${qSnap.size} document(s) from live Firestore /products collection.`);

    qSnap.forEach(d => {
      const p = d.data();
      console.log(`       • [ID: ${d.id}] "${p.title || p.name}" — Price: ₹${p.price} | Stock: ${p.stock ?? p.inventory}`);
    });
  } catch (err) {
    console.error('    ❌ Live Firestore catalog query error:', err.message);
  }

  // 2. FIRESTORE.RULES SECURITY ENFORCEMENT VERIFICATION
  try {
    console.log('\n 2️⃣ TESTING firestore.rules Write Protection on [/products/unauthorized_test_id]...');
    const testDocRef = doc(db, 'products', `unauthorized_test_${Date.now()}`);
    
    // Attempt write without catalog_manager custom claim
    await setDoc(testDocRef, { test: 'unauthorized_write' });
    console.error('    ❌ UNEXPECTED: Write succeeded without catalog_manager role!');
  } catch (ruleErr) {
    if (ruleErr.code === 'permission-denied' || ruleErr.message?.includes('PERMISSION_DENIED')) {
      results.writeProtectionEnforced = true;
      console.log('    ✅ Verified firestore.rules WRITE PROTECTION: Unauthenticated/non-catalog_manager write correctly DENIED.');
    } else {
      console.warn('    ⚠️ Unexpected error during rule check:', ruleErr);
    }
  }

  console.log('\n=============================================================');
  console.log('🎉 LIVE FIRESTORE VERIFICATION COMPLETE');
  console.log('=============================================================\n');

  return results;
}

runLiveFirestoreVerification().then(res => {
  if (res.readCatalog && res.writeProtectionEnforced) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
