import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { 
  getAuth as getClientAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  getFirestore as getClientFirestore, 
  doc, 
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc
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

const CANONICAL_ADMINS = [
  {
    role: 'superadmin',
    roles: ['superadmin', 'admin'],
    email: 'superadmin@muety.in',
    password: process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@2026',
    displayName: 'MUETY Executive Super Admin'
  },
  {
    role: 'admin',
    roles: ['admin'],
    email: 'admin@muety.in',
    password: process.env.ADMIN_PASSWORD || 'AdminUser@2026',
    displayName: 'MUETY Store Admin'
  },
  {
    role: 'catalog_manager',
    roles: ['catalog_manager'],
    email: 'catalog@muety.in',
    password: process.env.CATALOG_PASSWORD || 'CatalogManager@2026',
    displayName: 'MUETY Catalog Manager'
  }
];

async function bootstrap() {
  console.log('===========================================================');
  console.log('🚀 MUETY STORE: CANONICAL IDENTITY & ROLE BOOTSTRAPPER');
  console.log('===========================================================');
  console.log(`Target Firebase Project: ${firebaseConfig.projectId}\n`);

  const clientApp = getClientApps().length ? getClientApps()[0] : initClientApp(firebaseConfig);
  const auth = getClientAuth(clientApp);
  const db = getClientFirestore(clientApp);

  const results = [];

  for (const acc of CANONICAL_ADMINS) {
    console.log(`Processing Canonical Account: [${acc.role}] -> ${acc.email}`);
    let user = null;
    let authStatus = '';

    try {
      const cred = await createUserWithEmailAndPassword(auth, acc.email, acc.password);
      user = cred.user;
      await updateProfile(user, { displayName: acc.displayName });
      authStatus = 'Created new Firebase Auth account';
      console.log(`  ✓ Created Firebase Auth User (UID: ${user.uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          const cred = await signInWithEmailAndPassword(auth, acc.email, acc.password);
          user = cred.user;
          authStatus = 'Authenticated existing account';
          console.log(`  ✓ Signed in existing Firebase Auth User (UID: ${user.uid})`);
        } catch (signInErr) {
          authStatus = `Failed sign-in: ${signInErr.message}`;
          console.warn(`  ⚠️ Sign in error: ${signInErr.message}`);
        }
      } else {
        authStatus = `Auth Error: ${err.message}`;
        console.error(`  ❌ Auth Error: ${err.message}`);
      }
    }

    if (user) {
      // Sync Firestore user profile document
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: acc.email,
          displayName: acc.displayName,
          role: acc.role,
          roles: acc.roles,
          status: 'active',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`  ✓ Updated Firestore user document for UID: ${user.uid}`);
      } catch (dbErr) {
        console.warn(`  ⚠️ Firestore setDoc note: ${dbErr.message}`);
      }

      results.push({ email: acc.email, role: acc.role, uid: user.uid, status: 'SUCCESS', details: authStatus });
    } else {
      results.push({ email: acc.email, role: acc.role, uid: 'N/A', status: 'FAILED', details: authStatus });
    }
    console.log('');
  }

  // Deactivate legacy superadmin accounts in Firestore if present
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', 'in', ['super_admin', 'superadmin']));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (docSnap) => {
      const data = docSnap.data();
      if (data.email && data.email !== 'superadmin@muety.in') {
        console.log(`⚠️ Demoting legacy Super Admin account: ${data.email}`);
        await updateDoc(docSnap.ref, {
          role: 'admin',
          roles: ['admin'],
          updatedAt: new Date().toISOString()
        });
      }
    });
  } catch (cleanErr) {
    console.warn('Note on legacy cleanup in Firestore:', cleanErr.message);
  }

  console.log('===========================================================');
  console.log('📋 BOOTSTRAP SUMMARY');
  console.log('===========================================================');
  results.forEach(r => {
    console.log(`Email    : ${r.email}`);
    console.log(`Role     : ${r.role}`);
    console.log(`UID      : ${r.uid}`);
    console.log(`Status   : ${r.status}`);
    console.log(`Details  : ${r.details}`);
    console.log('-----------------------------------------------------------');
  });
  console.log('===========================================================\n');
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('Fatal Bootstrap Error:', err);
  process.exit(1);
});
