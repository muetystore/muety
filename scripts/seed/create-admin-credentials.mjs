import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
}

loadEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const accountsToCreate = [
  {
    role: 'super_admin',
    email: 'superadmin@muety.in',
    password: 'SuperAdmin@2026',
    displayName: 'MUETY Executive Super Admin'
  },
  {
    role: 'admin',
    email: 'admin@muety.in',
    password: 'AdminUser@2026',
    displayName: 'MUETY Store Admin'
  },
  {
    role: 'catalog_manager',
    email: 'catalog@muety.in',
    password: 'CatalogManager@2026',
    displayName: 'MUETY Catalog Manager'
  },
  {
    role: 'super_admin',
    email: 'superadmin@muetystore.com',
    password: 'SuperAdmin@2026',
    displayName: 'MUETY Executive Super Admin'
  },
  {
    role: 'admin',
    email: 'admin@muetystore.com',
    password: 'AdminUser@2026',
    displayName: 'MUETY Store Admin'
  },
  {
    role: 'catalog_manager',
    email: 'catalog@muetystore.com',
    password: 'CatalogManager@2026',
    displayName: 'MUETY Catalog Manager'
  },
  {
    role: 'super_admin',
    email: process.env.BOOTSTRAP_ADMIN_EMAIL || 'kalvimohan03@gmail.com',
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Nms@2026',
    displayName: 'MUETY Executive Concierge'
  }
];

async function seedAccounts() {
  console.log('🚀 Initializing Firebase Auth & Firestore Account Creation...');
  console.log(`📌 Project ID: ${firebaseConfig.projectId}\n`);

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const summary = [];

  for (const acc of accountsToCreate) {
    console.log(`Processing [${acc.role}] -> ${acc.email}...`);
    let user = null;
    let actionTaken = '';

    try {
      const cred = await createUserWithEmailAndPassword(auth, acc.email, acc.password);
      user = cred.user;
      await updateProfile(user, { displayName: acc.displayName });
      actionTaken = 'Created new Firebase Auth account';
      console.log(`  ✓ Auth user created successfully (UID: ${user.uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          const cred = await signInWithEmailAndPassword(auth, acc.email, acc.password);
          user = cred.user;
          actionTaken = 'Authenticated existing account';
          console.log(`  ✓ Account already exists & logged in (UID: ${user.uid})`);
        } catch (signInErr) {
          actionTaken = `Account exists but password mismatch: ${signInErr.message}`;
          console.warn(`  ⚠️ Account exists: ${signInErr.message}`);
        }
      } else {
        actionTaken = `Auth creation error: ${err.message}`;
        console.error(`  ❌ Auth Error: ${err.message}`);
      }
    }

    if (user) {
      summary.push({
        role: acc.role,
        email: acc.email,
        password: acc.password,
        uid: user.uid,
        status: 'SUCCESS',
        details: actionTaken
      });
    } else {
      summary.push({
        role: acc.role,
        email: acc.email,
        password: acc.password,
        uid: 'N/A',
        status: 'FAILED',
        details: actionTaken
      });
    }
    console.log('');
  }

  console.log('===========================================================');
  console.log('📋 CREATED LOGIN CREDENTIALS SUMMARY');
  console.log('===========================================================');
  summary.forEach(s => {
    console.log(`Role        : ${s.role}`);
    console.log(`Email       : ${s.email}`);
    console.log(`Password    : ${s.password}`);
    console.log(`UID         : ${s.uid}`);
    console.log(`Status      : ${s.status}`);
    console.log(`Details     : ${s.details}`);
    console.log('-----------------------------------------------------------');
  });
  console.log('===========================================================\n');
  process.exit(0);
}

seedAccounts().catch(err => {
  console.error('Fatal Script Error:', err);
  process.exit(1);
});
