import { getAdminAuth, getAdminDb } from './admin-init.mjs';

/**
 * Safely assign roles to a Firebase Auth user and update their Firestore UserProfile.
 * Mode: 'set' | 'replace' | 'add' | 'remove'
 */
export async function assignUserRoles(uid, newRoles, mode = 'set') {
  const auth = getAdminAuth();
  const db = getAdminDb();

  const user = await auth.getUser(uid);
  const existingClaims = user.customClaims || {};
  let currentRoles = Array.isArray(existingClaims.roles) ? existingClaims.roles : [];

  let updatedRoles = [];

  if (mode === 'set' || mode === 'replace') {
    updatedRoles = Array.from(new Set(newRoles));
  } else if (mode === 'add') {
    updatedRoles = Array.from(new Set([...currentRoles, ...newRoles]));
  } else if (mode === 'remove') {
    updatedRoles = currentRoles.filter(r => !newRoles.includes(r));
  }

  const primaryRole = updatedRoles[0] || 'customer';

  // 1. Privileged Custom Claims Assignment
  await auth.setCustomUserClaims(uid, {
    ...existingClaims,
    roles: updatedRoles,
    role: primaryRole
  });

  // 2. Canonical Firestore UserProfile Upsert
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  const profileData = {
    uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    roles: updatedRoles,
    role: primaryRole,
    updatedAt: new Date().toISOString()
  };

  if (!userSnap.exists) {
    profileData.createdAt = new Date().toISOString();
    await userRef.set(profileData);
  } else {
    await userRef.set(profileData, { merge: true });
  }

  return { uid, roles: updatedRoles, primaryRole };
}

export async function runAuthSeed() {
  const auth = getAdminAuth();
  const db = getAdminDb();

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'kalvimohan03@gmail.com';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  let createdUsers = 0;
  let existingUsers = 0;
  let rolesUpdated = 0;

  try {
    let authUser = null;

    try {
      authUser = await auth.getUserByEmail(adminEmail);
      existingUsers++;
      console.log(`   ✓ Found existing Auth admin account: \x1b[32m${adminEmail}\x1b[0m (UID: ${authUser.uid})`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        if (!adminPassword) {
          console.warn(`   ⚠️ Admin account ${adminEmail} does not exist in Auth. Pass BOOTSTRAP_ADMIN_PASSWORD to auto-create.`);
          return { createdUsers: 0, existingUsers: 0, rolesUpdated: 0 };
        }
        authUser = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'MUETY Executive Concierge',
          emailVerified: true
        });
        createdUsers++;
        console.log(`   ✓ Auto-created new Auth admin account: \x1b[32m${adminEmail}\x1b[0m (UID: ${authUser.uid})`);
      } else {
        throw err;
      }
    }

    if (authUser) {
      await assignUserRoles(authUser.uid, ['super_admin', 'admin'], 'set');
      rolesUpdated++;
      console.log(`   ✓ Assigned custom claims: roles = \x1b[33m["super_admin", "admin"]\x1b[0m for ${adminEmail}`);
    }
  } catch (err) {
    console.error(`   ❌ Auth Bootstrap Error:`, err.message || err);
    throw err;
  }

  return { createdUsers, existingUsers, rolesUpdated };
}
