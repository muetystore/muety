import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
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
    const projectId = adminApp.options?.projectId || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'muetystore-fdad2';
    return { app: adminApp, projectId, hasCreds: hasValidCredentials() };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'muetystore-fdad2';
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
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`
    });
  } else {
    adminApp = initializeApp({
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`
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

export function getAdminStorage() {
  if (!adminApp) initializeFirebaseAdmin();
  return getStorage(adminApp);
}
