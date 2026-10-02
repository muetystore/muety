/**
 * MUETY STORE — SERVER-SIDE PRIVILEGED ROLE MANAGEMENT TOOL
 * 
 * SECURITY DIRECTIVE:
 * Firebase custom claims (e.g. { roles: ['super_admin', 'catalog_manager'] }) MUST be assigned
 * from a trusted server environment using the Firebase Admin SDK.
 * 
 * Usage:
 *   node scripts/admin/setUserRoles.mjs <user-uid-or-email> <role1> [role2 ...]
 * 
 * Example:
 *   node scripts/admin/setUserRoles.mjs admin@muetystore.com super_admin admin
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ALLOWED_ROLES = [
  'super_admin',
  'admin',
  'catalog_manager',
  'order_manager',
  'support_agent',
  'customer'
];

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
==================================================
MUETY STORE — FIREBASE ADMIN ROLE ASSIGNMENT TOOL
==================================================
Usage:
  node scripts/admin/setUserRoles.mjs <uid-or-email> <role1> [role2...]

Allowed Roles:
  ${ALLOWED_ROLES.join(', ')}

Examples:
  node scripts/admin/setUserRoles.mjs kalvimohan03@gmail.com super_admin admin
  node scripts/admin/setUserRoles.mjs catalog-user-id catalog_manager
==================================================
`);
    process.exit(1);
  }

  const targetIdentifier = args[0];
  const requestedRoles = args.slice(1);

  const invalidRoles = requestedRoles.filter(r => !ALLOWED_ROLES.includes(r));
  if (invalidRoles.length > 0) {
    console.error(`❌ Invalid roles specified: ${invalidRoles.join(', ')}`);
    console.error(`Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
    process.exit(1);
  }

  // Initialize Firebase Admin SDK
  if (getApps().length === 0) {
    const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json');
    if (existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({ credential: cert(serviceAccount) });
      console.log('✔ Initialized Firebase Admin SDK with serviceAccountKey.json');
    } else {
      console.warn('⚠️ serviceAccountKey.json not found. Attempting default credentials...');
      initializeApp();
    }
  }

  const auth = getAuth();
  const db = getFirestore();

  let targetUid = targetIdentifier;
  if (targetIdentifier.includes('@')) {
    try {
      const userRecord = await auth.getUserByEmail(targetIdentifier);
      targetUid = userRecord.uid;
      console.log(`✔ Resolved email "${targetIdentifier}" to UID: ${targetUid}`);
    } catch (err) {
      console.error(`❌ Could not find Firebase user with email "${targetIdentifier}":`, err.message);
      process.exit(1);
    }
  }

  try {
    // Set custom claims
    await auth.setCustomUserClaims(targetUid, { roles: requestedRoles });
    console.log(`✅ Successfully assigned custom claims { roles: ${JSON.stringify(requestedRoles)} } to user ${targetUid}`);

    // Update Firestore User Profile document if exists
    const userRef = db.collection('users').doc(targetUid);
    const docSnap = await userRef.get();
    if (docSnap.exists) {
      await userRef.update({
        roles: requestedRoles,
        role: requestedRoles[0] || 'customer',
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Updated Firestore user document for ${targetUid}`);
    }

    console.log(`
ℹ️  IMPORTANT: User must sign out and sign back in (or force idTokenResult refresh) 
   for new custom claims to take effect in client applications.
`);
  } catch (err) {
    console.error('❌ Failed to assign user roles:', err);
    process.exit(1);
  }
}

main();
