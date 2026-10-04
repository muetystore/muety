import { getAdminAuth, getAdminFirestore, verifyIdTokenAndGetClaims } from './firebaseAdmin';

const ALLOWED_ROLES = ['super_admin', 'admin', 'catalog_manager', 'order_manager', 'support_manager'];

export async function handleSetAdminRole(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);

  const db = getAdminFirestore();
  const auth = getAdminAuth();

  // Bootstrap check: If no admins exist in Firestore, allow initial setup
  let isBootstrap = false;
  if (db) {
    try {
      const snap = await db.collection('admins').limit(1).get();
      if (snap.empty) {
        isBootstrap = true;
      }
    } catch {}
  }

  if (!isBootstrap && (!caller || !caller.roles.includes('super_admin'))) {
    throw new Error('PERMISSION_DENIED: Only an authenticated Super Admin can assign administrative roles.');
  }

  const { targetUid, roles } = body;
  if (!targetUid || typeof targetUid !== 'string') {
    throw new Error('INVALID_ARGUMENT: Target user UID is required.');
  }

  if (!Array.isArray(roles) || roles.length === 0 || !roles.every(r => ALLOWED_ROLES.includes(r))) {
    throw new Error(`INVALID_ARGUMENT: Roles must be a non-empty array containing valid roles: ${ALLOWED_ROLES.join(', ')}.`);
  }

  const primaryRole = roles[0];

  // Set Custom User Claims on Firebase Authentication
  if (auth) {
    try {
      await auth.setCustomUserClaims(targetUid, {
        roles,
        role: primaryRole
      });
    } catch (err: any) {
      console.warn('[AdminApi] setCustomUserClaims warning:', err?.message);
    }
  }

  // Update Firestore /admins/{targetUid} document
  if (db) {
    const adminRef = db.collection('admins').doc(targetUid);
    const userRef = db.collection('users').doc(targetUid);
    const now = new Date().toISOString();

    await adminRef.set({
      uid: targetUid,
      roles,
      role: primaryRole,
      updatedAt: now,
      updatedBy: caller?.uid || 'bootstrap'
    }, { merge: true });

    await userRef.set({
      roles,
      role: primaryRole,
      updatedAt: now
    }, { merge: true });

    // Record Authoritative Audit Log
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('adminAuditLogs').doc(logId).set({
      logId,
      actorUid: caller?.uid || 'system',
      actorEmail: caller?.email || 'super_admin@muety.in',
      actorRole: caller?.roles[0] || 'super_admin',
      action: 'ADMIN_ROLE_CHANGED',
      entityType: 'ADMIN',
      entityId: targetUid,
      after: { roles, primaryRole },
      reason: `Assigned custom claims and roles [${roles.join(', ')}] to user ${targetUid}`,
      timestamp: now
    });
  }

  return {
    success: true,
    uid: targetUid,
    roles,
    primaryRole,
    message: `Successfully set custom claims and role [${roles.join(', ')}] for admin user ${targetUid}.`
  };
}

export async function handleCreateAdminUser(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);

  const db = getAdminFirestore();
  const auth = getAdminAuth();

  let isBootstrap = false;
  if (db) {
    try {
      const snap = await db.collection('admins').limit(1).get();
      if (snap.empty) {
        isBootstrap = true;
      }
    } catch {}
  }

  if (!isBootstrap && (!caller || !caller.roles.includes('super_admin'))) {
    throw new Error('PERMISSION_DENIED: Only an authenticated Super Admin can provision new admin accounts.');
  }

  const { email, displayName, role, password } = body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('INVALID_ARGUMENT: Valid email address is required.');
  }

  if (!displayName || typeof displayName !== 'string') {
    throw new Error('INVALID_ARGUMENT: Display name is required.');
  }

  const selectedRole = role || 'admin';
  if (!ALLOWED_ROLES.includes(selectedRole)) {
    throw new Error(`INVALID_ARGUMENT: Role must be one of: ${ALLOWED_ROLES.join(', ')}.`);
  }

  const tempPassword = password || `MuetyAdmin#${Math.floor(100000 + Math.random() * 900000)}`;

  let uid = `adm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Create Firebase Auth user with Admin SDK if live
  if (auth) {
    try {
      const userRecord = await auth.createUser({
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        password: tempPassword,
        emailVerified: true
      });
      uid = userRecord.uid;

      // Assign Custom Claims immediately
      await auth.setCustomUserClaims(uid, {
        roles: [selectedRole],
        role: selectedRole
      });
    } catch (err: any) {
      if (err?.code === 'auth/email-already-exists') {
        try {
          const existing = await auth.getUserByEmail(email.trim().toLowerCase());
          uid = existing.uid;
          await auth.setCustomUserClaims(uid, {
            roles: [selectedRole],
            role: selectedRole
          });
        } catch {
          throw new Error('INVALID_ARGUMENT: An account with this email address already exists.');
        }
      } else {
        console.warn('[AdminApi] Auth createUser note:', err?.message);
      }
    }
  }

  // Create Firestore Records
  if (db) {
    const now = new Date().toISOString();
    
    await db.collection('admins').doc(uid).set({
      uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      role: selectedRole,
      roles: [selectedRole],
      createdAt: now,
      createdBy: caller?.uid || 'bootstrap'
    }, { merge: true });

    await db.collection('users').doc(uid).set({
      uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      role: selectedRole,
      roles: [selectedRole],
      createdAt: now
    }, { merge: true });

    await db.collection('customers').doc(uid).set({
      customerId: uid,
      uid,
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      customerStatus: 'active',
      createdAt: now
    }, { merge: true });

    // Record Authoritative Audit Log
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('adminAuditLogs').doc(logId).set({
      logId,
      actorUid: caller?.uid || 'system',
      actorEmail: caller?.email || 'super_admin@muety.in',
      actorRole: caller?.roles[0] || 'super_admin',
      action: 'ADMIN_CREATED',
      entityType: 'ADMIN',
      entityId: uid,
      after: { uid, email, displayName, role: selectedRole },
      reason: `Provisioned admin user account for ${email} with role ${selectedRole}`,
      timestamp: now
    });
  }

  return {
    success: true,
    user: {
      uid,
      email,
      displayName,
      role: selectedRole,
      roles: [selectedRole]
    },
    tempPassword,
    message: `Successfully provisioned admin account for ${displayName} (${selectedRole}).`
  };
}
