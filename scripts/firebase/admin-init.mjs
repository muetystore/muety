import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let adminApp = null;

export function hasValidCredentials() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const rawCredJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (rawCredJson) return true;
  if (credPath && fs.existsSync(credPath)) return true;
  return false;
}

export function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    const projectId = adminApp.options?.projectId || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
    return { app: adminApp, projectId, hasCreds: hasValidCredentials() };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const rawCredJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  let credential = null;

  if (rawCredJson) {
    try {
      const parsed = JSON.parse(rawCredJson);
      credential = cert(parsed);
    } catch (e) {
      console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT_JSON string.');
    }
  } else if (credPath && fs.existsSync(credPath)) {
    try {
      const content = fs.readFileSync(credPath, 'utf8');
      const parsed = JSON.parse(content);
      credential = cert(parsed);
    } catch (e) {
      console.warn(`⚠️ Could not load service account from path: ${credPath}`);
    }
  }

  if (credential) {
    adminApp = initializeApp({
      credential,
      projectId
    });
  } else {
    adminApp = initializeApp({
      projectId
    });
  }

  return { app: adminApp, projectId, hasCreds: Boolean(credential) };
}

export function getAdminDb() {
  if (!adminApp) initializeFirebaseAdmin();
  const db = getFirestore(adminApp);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

export function getAdminAuth() {
  if (!adminApp) initializeFirebaseAdmin();
  return getAuth(adminApp);
}

/**
 * Cloud Storage is intentionally not provisioned for MUETY.
 * Media assets are managed via Cloudinary or persistent external URLs.
 */
export function getAdminStorage() {
  console.info('ℹ️ Firebase Cloud Storage is not provisioned for MUETY. Media assets are handled via Cloudinary.');
  return null;
}
