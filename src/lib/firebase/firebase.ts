import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { env } from '@/lib/config/env';

const firebaseConfig = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  storageBucket: env.firebase.storageBucket,
  messagingSenderId: env.firebase.messagingSenderId,
  appId: env.firebase.appId
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
// Application product & category media is managed via Cloudinary (Stage 02D). Firebase Storage is disabled.
const storage = null;
const isLiveFirebase = env.firebase.isConfigured;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  if (app) {
    auth = getAuth(app);
    const dbId = env.firebase.databaseId || 'default';
    try {
      db = getFirestore(app, dbId);
    } catch {
      try {
        db = getFirestore(app);
      } catch (e) {
        console.warn('Firestore fallback init note:', e);
      }
    }
  }
} catch (error) {
  console.warn("MUETY: Running in local fallback mode (LocalStorage active)", error);
}

export { app, auth, db, storage, isLiveFirebase, firebaseConfig };
