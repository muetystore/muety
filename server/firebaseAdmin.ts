import dotenv from 'dotenv';
import { getApps, initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Explicitly load root .env before reading process.env
dotenv.config();

process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('NO_ADC_FOUND') || reason?.message?.includes('default credentials') || reason?.code === 'ETIMEDOUT' || reason?.code === 'ENOTFOUND') {
    console.warn('[FirebaseAdmin] Suppressed background GCP Auth lookup note:', reason?.message || reason);
    return;
  }
});

let firebaseAdminApp: App | null = null;
let diagnosticLogged = false;

function logDiagnostic(app: App | null, clientEmail?: string, privateKey?: string, projectId?: string) {
  if (diagnosticLogged) return;
  diagnosticLogged = true;

  const clientEmailConfigured = !!(clientEmail || process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const privateKeyConfigured = !!(privateKey || process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const projectIdConfigured = !!(projectId || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID);
  const initialized = !!app;

  console.log(`[FirebaseAdmin] Configuration:
  clientEmailConfigured: ${clientEmailConfigured}
  privateKeyConfigured: ${privateKeyConfigured}
  projectIdConfigured: ${projectIdConfigured}
  initialized: ${initialized}`);
}

export function getFirebaseAdminApp(): App | null {
  if (firebaseAdminApp) return firebaseAdminApp;

  // Ensure dotenv is loaded
  dotenv.config();

  const activeApps = getApps();
  if (activeApps.length > 0) {
    firebaseAdminApp = activeApps[0]!;
    logDiagnostic(firebaseAdminApp);
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const googleAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const isEmulator = !!(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    if (googleAppCreds) {
      firebaseAdminApp = initializeApp({
        credential: applicationDefault(),
        projectId
      });
    } else if (clientEmail && privateKey) {
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    } else if (isEmulator) {
      firebaseAdminApp = initializeApp({ projectId });
    } else {
      firebaseAdminApp = null;
    }
  } catch (err: any) {
    console.warn('[FirebaseAdmin] Initialization note:', err?.message || err);
    firebaseAdminApp = null;
  }

  logDiagnostic(firebaseAdminApp, clientEmail, privateKey, projectId);
  return firebaseAdminApp;
}

// Automatically invoke getFirebaseAdminApp() on module load so startup diagnostic prints
getFirebaseAdminApp();

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  try {
    return getAuth(app);
  } catch {
    return null;
  }
}

let adminFirestoreInstance: Firestore | null = null;

export function getAdminFirestore(): Firestore | null {
  const isTest = typeof process !== 'undefined' && Boolean(process.env?.NODE_ENV === 'test' || Boolean((process.env as any)?.VITEST));
  const isEmulator = !!(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
  if (isTest && !isEmulator) {
    return null;
  }

  if (adminFirestoreInstance) return adminFirestoreInstance;

  const app = getFirebaseAdminApp();
  if (!app) return null;
  try {
    const db = getFirestore(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {}
    adminFirestoreInstance = db;
    return adminFirestoreInstance;
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

  let uid = '';
  let email = '';
  let roles: string[] = [];

  const isTest = typeof process !== 'undefined' && Boolean(process.env?.NODE_ENV === 'test' || Boolean((process.env as any)?.VITEST));
  const isDev = typeof process !== 'undefined' && (process.env?.NODE_ENV !== 'production' || process.env?.VITE_DEV_MODE === 'true');
  const auth = getAdminAuth();
  if (auth && !isTest) {
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
      email = (decoded.email || '').toLowerCase();
      if (Array.isArray(decoded.roles)) {
        roles = decoded.roles as string[];
      } else if (typeof decoded.role === 'string') {
        roles = [decoded.role];
      }
    } catch (err: any) {
      // In development mode or test environments, allow decoding fallback session tokens
      if (isDev || isTest) {
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson);
            if (payload) {
              if (!uid) uid = payload.uid || payload.user_id || payload.sub || '';
              if (!email) email = (payload.email || '').toLowerCase();
              if (roles.length === 0) {
                if (Array.isArray(payload.roles)) {
                  roles = payload.roles;
                } else if (typeof payload.role === 'string') {
                  roles = [payload.role];
                }
              }
            }
          }
        } catch {}
      }

      if (!uid && !email) {
        console.warn('[FirebaseAdmin] ID Token verification failed (token expired or invalid signature):', err?.message || err);
        return null;
      }
    }
  } else if (auth && isTest) {
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
      email = (decoded.email || '').toLowerCase();
      if (Array.isArray(decoded.roles)) {
        roles = decoded.roles as string[];
      } else if (typeof decoded.role === 'string') {
        roles = [decoded.role];
      }
    } catch {
      // In automated test runs with mock JWTs:
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload) {
            if (!uid) uid = payload.uid || payload.user_id || payload.sub || '';
            if (!email) email = (payload.email || '').toLowerCase();
            if (roles.length === 0) {
              if (Array.isArray(payload.roles)) {
                roles = payload.roles;
              } else if (typeof payload.role === 'string') {
                roles = [payload.role];
              }
            }
          }
        }
      } catch {}
    }
  } else if (isTest) {
    // Only in test environment without Firebase Admin credentials
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        if (payload) {
          if (!uid) uid = payload.uid || payload.user_id || payload.sub || '';
          if (!email) email = (payload.email || '').toLowerCase();
          if (roles.length === 0) {
            if (Array.isArray(payload.roles)) {
              roles = payload.roles;
            } else if (typeof payload.role === 'string') {
              roles = [payload.role];
            }
          }
        }
      }
    } catch {}
  } else {
    if (isDev || isTest) {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload) {
            if (!uid) uid = payload.uid || payload.user_id || payload.sub || '';
            if (!email) email = (payload.email || '').toLowerCase();
            if (roles.length === 0) {
              if (Array.isArray(payload.roles)) {
                roles = payload.roles;
              } else if (typeof payload.role === 'string') {
                roles = [payload.role];
              }
            }
          }
        }
      } catch {}
    }
    if (!uid && !email) {
      console.error('[FirebaseAdmin] Firebase Admin credentials not configured. Cannot verify client ID token cryptographically.');
      return null;
    }
  }

  // Canonical rule 1: Known administrative emails have guaranteed roles
  const emailLower = (email || '').toLowerCase().trim();
  if (emailLower === 'superadmin@muety.in') {
    if (!roles.includes('superadmin')) roles.push('superadmin');
    if (!roles.includes('super_admin')) roles.push('super_admin');
    if (!roles.includes('admin')) roles.push('admin');
  } else if (['admin@muety.in', 'catalog@muety.in', 'kalvi@muety.in', 'mohan.admin@muety.in', 'vignesh.admin@muety.in'].includes(emailLower)) {
    if (!roles.includes('admin')) roles.push('admin');
    if (emailLower.includes('catalog') && !roles.includes('catalog_manager')) roles.push('catalog_manager');
  }

  // Canonical rule 2: Look up Firestore users / admins document for authoritative role
  if (uid && (roles.length === 0 || roles[0] === 'customer')) {
    const db = getAdminFirestore();
    if (db) {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          const dbRole = data?.roleSlug || data?.role;
          if (dbRole) {
            if (!roles.includes(dbRole)) roles.push(dbRole);
            if (dbRole === 'superadmin' || dbRole === 'super_admin') {
              if (!roles.includes('superadmin')) roles.push('superadmin');
              if (!roles.includes('super_admin')) roles.push('super_admin');
            }
          }
        }
      } catch {}
    }
  }

  if (!uid && !email) return null;

  return {
    uid: uid || '',
    email: email || '',
    roles: roles.length > 0 ? roles : ['customer']
  };
}
