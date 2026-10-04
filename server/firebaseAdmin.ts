import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let firebaseAdminApp: App | null = null;

export function getFirebaseAdminApp(): App | null {
  if (firebaseAdminApp) return firebaseAdminApp;

  const activeApps = getApps();
  if (activeApps.length > 0) {
    firebaseAdminApp = activeApps[0]!;
    return firebaseAdminApp;
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'muetystore-fdad2';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  try {
    if (clientEmail && privateKey) {
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    } else {
      firebaseAdminApp = initializeApp({
        projectId
      });
    }
    return firebaseAdminApp;
  } catch (err) {
    console.warn('[FirebaseAdmin] Initialization note:', err);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  try {
    return getAuth(app);
  } catch {
    return null;
  }
}

export function getAdminFirestore(): Firestore | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch {
    return null;
  }
}

export async function verifyIdTokenAndGetClaims(authHeader?: string): Promise<{ uid: string; email?: string; roles: string[] } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) return null;

  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifyIdToken(idToken);
    let roles: string[] = ['customer'];
    if (Array.isArray(decoded.roles)) {
      roles = decoded.roles as string[];
    } else if (typeof decoded.role === 'string') {
      roles = [decoded.role];
    }
    return {
      uid: decoded.uid,
      email: decoded.email,
      roles
    };
  } catch (err) {
    console.warn('[FirebaseAdmin] ID Token verification failed:', err);
    return null;
  }
}
