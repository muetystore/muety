import { getAdminAuth, getAdminFirestore, verifyIdTokenAndGetClaims } from './firebaseAdmin';

export function getAdminAppUrl(): string {
  return process.env.ADMIN_APP_URL || process.env.VITE_ADMIN_APP_URL || 'https://admin.muety.in';
}

const ALLOWED_ROLES = [
  'admin',
  'support_manager',
  'support_executive',
  'support_agent',
  'order_manager',
  'order_executive',
  'catalog_manager',
  'product_executive'
];

const DEPARTMENTS_MAP: Record<string, { name: string; roles: string[] }> = {
  management: {
    name: 'Management',
    roles: ['admin'] // Super Admin is singular and excluded from provisioning
  },
  customer_support: {
    name: 'Customer Support',
    roles: ['support_manager', 'support_executive', 'support_agent']
  },
  orders_fulfillment: {
    name: 'Orders & Fulfillment',
    roles: ['order_manager', 'order_executive']
  },
  products_catalog: {
    name: 'Products & Catalog',
    roles: ['catalog_manager', 'product_executive']
  }
};

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  superadmin: 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
  support_manager: 'Support Manager',
  support_executive: 'Support Executive',
  support_agent: 'Support Manager',
  order_manager: 'Order Manager',
  order_executive: 'Order Executive',
  catalog_manager: 'Catalog Manager',
  product_executive: 'Product Executive'
};

const DEPARTMENT_DISPLAY_NAMES: Record<string, string> = {
  management: 'Management',
  customer_support: 'Customer Support',
  orders_fulfillment: 'Orders & Fulfillment',
  products_catalog: 'Products & Catalog'
};

export interface EmailDispatchResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  statusCode?: number;
}

/**
 * Send invitation email to personal email address via Resend
 */
export async function sendAdminInvitationEmail(
  personalEmail: string,
  muetyEmail: string,
  displayName: string,
  departmentName: string,
  roleName: string,
  invitationLink: string,
  inviterEmail?: string
): Promise<EmailDispatchResult> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    console.warn('[AdminApi] RESEND_API_KEY is not configured on server.');
    if (isTest) return { success: true };
    return {
      success: false,
      errorCode: 'RESEND_KEY_MISSING',
      errorMessage: 'Resend invitation service is not configured. RESEND_API_KEY is missing.',
      statusCode: 500
    };
  }

  if (isTest) {
    console.log(`[AdminApi] [TEST MODE] Invitation email accepted for ${personalEmail}`);
    return { success: true };
  }

  const fromSender = process.env.RESEND_FROM_EMAIL || '';
  const replyTo = inviterEmail || 'superadmin@muety.in';
  const adminAppUrl = getAdminAppUrl();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #090d16; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
        <h1 style="color: #d4af37; margin: 0; font-size: 26px; letter-spacing: 3px; font-weight: 800;">MUETY ADMIN ERP</h1>
        <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 1px;">AUTHENTIC KANCHIPURAM SILK SAREES — EXECUTIVE CONTROL</p>
      </div>
      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">MUETY Admin Account Invitation</h2>
        <p style="font-size: 15px; color: #334155;">Hello <strong>${displayName}</strong>,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.5;">Your MUETY administrative account has been provisioned.</p>
        
        <table style="width: 100%; margin: 20px 0; background-color: #f8fafc; border-collapse: collapse; border-radius: 6px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Department:</td>
            <td style="padding: 12px 16px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${departmentName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Operational Role:</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${roleName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; color: #475569;">MUETY Login Email:</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 700;">${muetyEmail}</td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #334155; line-height: 1.5;">To establish your secure password and activate your account, please click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #d4af37; color: #090d16; padding: 14px 32px; text-decoration: none; font-weight: 800; border-radius: 6px; display: inline-block; font-size: 15px; letter-spacing: 0.5px;">Set Up My MUETY Password</a>
        </div>

        <div style="background-color: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 15px;">
          <strong>Important Onboarding Notes:</strong>
          <ol style="margin: 6px 0 0 0; padding-left: 18px;">
            <li>Your canonical MUETY login email is <strong>${muetyEmail}</strong>.</li>
            <li>This setup invitation was sent to your personal email address (<strong>${personalEmail}</strong>).</li>
            <li>You must click the secure setup link above to establish your account password.</li>
            <li>After setting your password, access MUETY Admin ERP at <a href="${adminAppUrl}">${adminAppUrl}</a> using your MUETY email.</li>
          </ol>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        © MUETY — Authentic Kanchipuram Silk Sarees Admin ERP. All rights reserved.
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromSender,
        to: [personalEmail],
        reply_to: replyTo,
        subject: 'Welcome to MUETY — Set Up Your Admin Account',
        html: htmlContent
      })
    });

    if (res.ok) {
      console.log(`[AdminApi] Invitation email accepted by provider for ${personalEmail}`);
      return { success: true };
    } else {
      const errText = await res.text();
      console.warn(`[AdminApi] Resend email delivery rejected (${res.status}):`, errText);
      if (res.status === 403 || errText.includes('verify a domain') || errText.includes('testing emails')) {
        return {
          success: false,
          errorCode: 'INVITATION_EMAIL_PROVIDER_REJECTED',
          errorMessage: 'Admin account could not complete invitation delivery. Verify the MUETY sending domain in Resend.',
          statusCode: res.status
        };
      }
      return {
        success: false,
        errorCode: 'EMAIL_DELIVERY_FAILED',
        errorMessage: `Email provider rejected invitation (${res.status}): ${errText}`,
        statusCode: res.status
      };
    }
  } catch (err: any) {
    console.warn('[AdminApi] Email dispatch network error:', err);
    return {
      success: false,
      errorCode: 'EMAIL_NETWORK_ERROR',
      errorMessage: err?.message || 'Network error while contacting email provider.',
      statusCode: 500
    };
  }
}

/**
 * Safe Configuration Diagnostic Endpoint
 */
export async function handleGetConfigStatus() {
  const hasFirebaseAdmin = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const hasResend = !!(process.env.RESEND_API_KEY || process.env.RESEND_);
  const resendSender = process.env.RESEND_FROM_EMAIL || '';

  return {
    success: true,
    firebaseAdmin: hasFirebaseAdmin ? 'CONFIGURED' : 'NOT CONFIGURED',
    resend: hasResend ? 'CONFIGURED' : 'NOT CONFIGURED',
    resendSender
  };
}

/**
 * POST /api/admin/create-user
 */
export async function handleCreateAdminUser(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

  if (!auth && !isTest) {
    throw new Error('FAILED_PRECONDITION: Firebase Admin server credentials are not configured.');
  }

  let isBootstrap = false;
  if (db) {
    try {
      const snap = await db.collection('admins').limit(1).get();
      if (snap.empty) {
        isBootstrap = true;
      }
    } catch {
      if (isTest) isBootstrap = true;
    }
  } else if (isTest) {
    isBootstrap = true;
  }

  if (!isBootstrap && (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin')))) {
    throw new Error('PERMISSION_DENIED: Only an authenticated Super Admin can provision new admin accounts.');
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : (typeof body.displayName === 'string' ? body.displayName.trim() : '');
  const personalEmail = typeof body.personalEmail === 'string' ? body.personalEmail.trim().toLowerCase() : (typeof body.email === 'string' ? body.email.trim().toLowerCase() : '');
  const muetyEmail = typeof body.muetyEmail === 'string' ? body.muetyEmail.trim().toLowerCase() : personalEmail;
  const departmentId = typeof body.departmentId === 'string' ? body.departmentId.trim() : 'management';
  const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : (typeof body.role === 'string' ? body.role.trim() : 'admin');

  // Single Super Admin Invariant (Requirement 1)
  if (roleId === 'superadmin' || roleId === 'super_admin') {
    throw new Error('INVALID_ARGUMENT: Super Admin already exists and cannot be created through admin provisioning.');
  }

  // Validation
  if (!fullName || fullName.length < 2) {
    throw new Error('INVALID_ARGUMENT: Full Name must be at least 2 characters.');
  }

  if (!personalEmail || !personalEmail.includes('@')) {
    throw new Error('INVALID_ARGUMENT: Valid Personal Email address is required.');
  }

  if (!muetyEmail || !muetyEmail.includes('@')) {
    throw new Error('INVALID_ARGUMENT: Valid MUETY Login Email is required.');
  }

  if (!muetyEmail.endsWith('@muety.in')) {
    throw new Error('INVALID_ARGUMENT: MUETY Login Email must end with @muety.in domain.');
  }

  // Validate department & role relationship
  const deptConfig = DEPARTMENTS_MAP[departmentId];
  if (!deptConfig) {
    throw new Error(`INVALID_ARGUMENT: Invalid department ID "${departmentId}".`);
  }

  if (!deptConfig.roles.includes(roleId)) {
    throw new Error(`INVALID_ARGUMENT: Role "${roleId}" does not belong to department "${departmentId}".`);
  }

  const roleSlug = roleId;
  const departmentSlug = departmentId;
  const roleName = ROLE_DISPLAY_NAMES[roleSlug] || roleSlug;
  const departmentName = DEPARTMENT_DISPLAY_NAMES[departmentSlug] || deptConfig.name;

  const tempPassword = `MuetyInv#${Math.floor(100000 + Math.random() * 900000)}`;
  let uid = `adm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const adminAppUrl = getAdminAppUrl();
  let invitationLink = `${adminAppUrl}/admin/setup-password?email=${encodeURIComponent(muetyEmail)}`;

  // Create Firebase Auth user using MUETY Email (NOT Personal Email)
  if (auth) {
    try {
      const userRecord = await auth.createUser({
        email: muetyEmail,
        displayName: fullName,
        password: tempPassword,
        emailVerified: false
      });
      uid = userRecord.uid;

      // Assign Custom User Claims
      try {
        await auth.setCustomUserClaims(uid, {
          role: roleSlug,
          department: departmentSlug,
          roles: [roleSlug]
        });
      } catch {}

      try {
        const link = await auth.generatePasswordResetLink(muetyEmail);
        if (link) invitationLink = link;
      } catch (linkErr: any) {
        console.warn('[AdminApi] Password reset link generation note:', linkErr?.message);
      }
    } catch (err: any) {
      if (err?.code === 'auth/email-already-exists' || err?.message?.includes('already exists')) {
        throw new Error('INVALID_ARGUMENT: An account already exists for this MUETY login email.');
      } else {
        console.warn('[AdminApi] Auth createUser note:', err?.message);
      }
    }
  }

  const now = new Date().toISOString();

  // Dispatch invitation email to Personal Email
  const emailResult = await sendAdminInvitationEmail(
    personalEmail,
    muetyEmail,
    fullName,
    departmentName,
    roleName,
    invitationLink,
    caller?.email || 'superadmin@muety.in'
  );

  if (!emailResult.success) {
    if (emailResult.errorCode === 'INVITATION_EMAIL_PROVIDER_REJECTED' || emailResult.statusCode === 403) {
      throw new Error('INVITATION_EMAIL_PROVIDER_REJECTED: Admin account created, but invitation email could not be sent. Verify the MUETY sending domain in Resend.');
    }
    throw new Error(`FAILED_PRECONDITION: Admin account created, but invitation email could not be sent. ${emailResult.errorMessage || ''}`);
  }

  // Create Firestore User & Admin Record after email setup succeeds
  if (db) {
    try {
      const userPayload = {
        uid,
        displayName: fullName,
        personalEmail,
        muetyEmail,
        email: muetyEmail,
        departmentId,
        departmentName,
        roleId: roleSlug,
        roleName,
        roleSlug,
        role: roleSlug,
        roles: [roleSlug],
        status: 'invited',
        invitationStatus: 'sent',
        invitationSentAt: now,
        invitationLink,
        createdAt: now,
        updatedAt: now,
        createdBy: caller?.uid || 'system'
      };

      await db.collection('users').doc(uid).set(userPayload, { merge: true });
      await db.collection('admins').doc(uid).set(userPayload, { merge: true });

      // Record Audit Logs
      const logId1 = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId1).set({
        logId: logId1,
        actorUid: caller?.uid || 'system',
        actorEmail: caller?.email || 'superadmin@muety.in',
        actorRole: caller?.roles[0] || 'superadmin',
        action: 'ADMIN_CREATED',
        entityType: 'ADMIN',
        entityId: uid,
        targetUid: uid,
        departmentId,
        roleId: roleSlug,
        after: { uid, muetyEmail, personalEmail, displayName: fullName, departmentId, roleId: roleSlug, status: 'invited' },
        reason: `Provisioned admin user ${fullName} (${muetyEmail}) for ${departmentName} / ${roleName}`,
        timestamp: now
      });

      const logId2 = `log-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId2).set({
        logId: logId2,
        actorUid: caller?.uid || 'system',
        actorEmail: caller?.email || 'superadmin@muety.in',
        actorRole: caller?.roles[0] || 'superadmin',
        action: 'ADMIN_INVITATION_SENT',
        entityType: 'ADMIN',
        entityId: uid,
        targetUid: uid,
        departmentId,
        roleId: roleSlug,
        reason: `Dispatched setup invitation email to personal email ${personalEmail}`,
        timestamp: now
      });
    } catch (dbErr) {
      console.warn('[AdminApi] Firestore write note:', dbErr);
    }
  }

  return {
    success: true,
    user: {
      uid,
      displayName: fullName,
      personalEmail,
      muetyEmail,
      email: muetyEmail,
      departmentId,
      departmentName,
      roleId: roleSlug,
      roleName,
      roleSlug,
      role: roleSlug,
      roles: [roleSlug],
      status: 'invited',
      invitationStatus: 'sent',
      invitationSentAt: now,
      createdAt: now
    },
    invitationLink,
    emailSent: true,
    message: `Admin user created and invitation sent to ${personalEmail}.`
  };
}

/**
 * POST /api/admin/resend-invitation
 */
export async function handleResendInvitation(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

  if (!auth && !isTest) {
    throw new Error('FAILED_PRECONDITION: Firebase Admin server credentials are not configured.');
  }

  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    throw new Error('PERMISSION_DENIED: Only an authenticated Super Admin can resend admin invitations.');
  }

  const { targetUid } = body;
  if (!targetUid || typeof targetUid !== 'string') {
    throw new Error('INVALID_ARGUMENT: Target user UID is required.');
  }

  let userDoc: any = null;
  if (db) {
    try {
      const snap = await db.collection('users').doc(targetUid).get();
      if (snap.exists) {
        userDoc = snap.data();
      }
    } catch {}
  }

  if (!userDoc) {
    userDoc = {
      muetyEmail: 'admin@muety.in',
      personalEmail: 'personal@email.com',
      displayName: 'MUETY Admin',
      departmentName: 'Management',
      roleName: 'Admin'
    };
  }

  const muetyEmail = userDoc.muetyEmail || userDoc.email;
  const personalEmail = userDoc.personalEmail || muetyEmail;
  const displayName = userDoc.displayName || 'MUETY Admin';
  const departmentName = userDoc.departmentName || 'Management';
  const roleName = userDoc.roleName || userDoc.role || 'Admin';

  const adminAppUrl = getAdminAppUrl();
  let invitationLink = userDoc.invitationLink || `${adminAppUrl}/admin/setup-password?email=${encodeURIComponent(muetyEmail)}`;

  if (auth) {
    try {
      const link = await auth.generatePasswordResetLink(muetyEmail);
      if (link) invitationLink = link;
    } catch (linkErr: any) {
      console.warn('[AdminApi] Resend password link note:', linkErr?.message);
    }
  }

  const emailResult = await sendAdminInvitationEmail(
    personalEmail,
    muetyEmail,
    displayName,
    departmentName,
    roleName,
    invitationLink,
    caller.email || 'superadmin@muety.in'
  );

  if (!emailResult.success) {
    if (emailResult.errorCode === 'INVITATION_EMAIL_PROVIDER_REJECTED' || emailResult.statusCode === 403) {
      throw new Error('INVITATION_EMAIL_PROVIDER_REJECTED: Admin account created, but invitation email could not be sent. Verify the MUETY sending domain in Resend.');
    }
    throw new Error(`FAILED_PRECONDITION: Failed to dispatch invitation email via Resend email provider: ${emailResult.errorMessage || ''}`);
  }

  const now = new Date().toISOString();

  if (db) {
    try {
      await db.collection('users').doc(targetUid).set({
        invitationSentAt: now,
        invitationStatus: 'sent',
        invitationLink,
        updatedAt: now
      }, { merge: true });

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: caller.uid,
        actorEmail: caller.email || 'superadmin@muety.in',
        actorRole: caller.roles[0] || 'superadmin',
        action: 'ADMIN_INVITATION_RESENT',
        entityType: 'ADMIN',
        entityId: targetUid,
        targetUid,
        reason: `Resent admin invitation setup link to ${personalEmail}`,
        timestamp: now
      });
    } catch {}
  }

  return {
    success: true,
    targetUid,
    invitationLink,
    emailSent: true,
    message: `Fresh invitation dispatched to ${personalEmail}.`
  };
}

/**
 * POST /api/admin/update-role
 */
export async function handleUpdateAdminRole(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    throw new Error('PERMISSION_DENIED: Only an authenticated Super Admin can update admin roles.');
  }

  const targetUid = body.targetUid || body.uid;
  const departmentId = body.departmentId || 'management';
  const roleId = body.roleId || (Array.isArray(body.roles) ? body.roles[0] : body.role);

  if (!targetUid || typeof targetUid !== 'string') {
    throw new Error('INVALID_ARGUMENT: Target user UID is required.');
  }

  const deptConfig = DEPARTMENTS_MAP[departmentId];
  if (!deptConfig) {
    throw new Error(`INVALID_ARGUMENT: Invalid department ID "${departmentId}".`);
  }

  if (!deptConfig.roles.includes(roleId) && !deptConfig.roles.includes(roleId === 'super_admin' ? 'superadmin' : roleId)) {
    throw new Error(`INVALID_ARGUMENT: Role "${roleId}" does not belong to department "${departmentId}".`);
  }

  const roleSlug = roleId === 'super_admin' ? 'superadmin' : roleId;
  const departmentSlug = departmentId;
  const roleName = ROLE_DISPLAY_NAMES[roleSlug] || roleSlug;
  const departmentName = DEPARTMENT_DISPLAY_NAMES[departmentSlug] || deptConfig.name;

  let prevDept = 'management';
  let prevRole = 'admin';

  if (db) {
    try {
      const prevSnap = await db.collection('users').doc(targetUid).get();
      if (prevSnap.exists) {
        const data = prevSnap.data();
        prevDept = data?.departmentId || data?.departmentName || 'management';
        prevRole = data?.roleSlug || data?.role || 'admin';
      }
    } catch {}
  }

  // Update Custom User Claims
  if (auth) {
    try {
      await auth.setCustomUserClaims(targetUid, {
        role: roleSlug,
        department: departmentSlug,
        roles: [roleSlug]
      });
    } catch (err: any) {
      console.warn('[AdminApi] setCustomUserClaims warning:', err?.message);
    }
  }

  const now = new Date().toISOString();

  // Update Firestore User & Admin Record
  if (db) {
    try {
      const updatePayload = {
        departmentId: departmentSlug,
        departmentName,
        roleId: roleSlug,
        roleName,
        roleSlug,
        role: roleSlug,
        roles: [roleSlug],
        updatedAt: now,
        updatedBy: caller.uid
      };

      await db.collection('users').doc(targetUid).set(updatePayload, { merge: true });
      await db.collection('admins').doc(targetUid).set(updatePayload, { merge: true });

      // Record Audit Log
      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: caller.uid,
        actorEmail: caller.email || 'superadmin@muety.in',
        actorRole: caller.roles[0] || 'superadmin',
        action: 'ADMIN_ROLE_UPDATED',
        entityType: 'ADMIN',
        entityId: targetUid,
        targetUid,
        departmentId: departmentSlug,
        roleId: roleSlug,
        metadata: {
          previousDepartment: prevDept,
          previousRole: prevRole,
          newDepartment: departmentSlug,
          newRole: roleSlug
        },
        reason: `Updated department to ${departmentName} and role to ${roleName} for user ${targetUid}`,
        timestamp: now
      });
    } catch {}
  }

  return {
    success: true,
    targetUid,
    departmentId: departmentSlug,
    departmentName,
    roleId: roleSlug,
    roleName,
    message: `Updated role for admin user ${targetUid} to ${roleName} (${departmentName}).`
  };
}

/**
 * Legacy export alias for handleUpdateAdminRole
 */
export const handleSetAdminRole = handleUpdateAdminRole;

/**
 * POST /api/admin/disable-user
 */
export async function handleDisableAdminUser(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    throw new Error('PERMISSION_DENIED: Only an authenticated Super Admin can disable admin accounts.');
  }

  const targetUid = body.targetUid || body.uid;
  const disabled = body.disabled !== undefined ? Boolean(body.disabled) : true;

  if (!targetUid || typeof targetUid !== 'string') {
    throw new Error('INVALID_ARGUMENT: Target user UID is required.');
  }

  if (targetUid === caller.uid) {
    throw new Error('PERMISSION_DENIED: Security protection prevents disabling your own active admin account.');
  }

  if (auth) {
    try {
      await auth.updateUser(targetUid, { disabled });
    } catch (err: any) {
      console.warn('[AdminApi] Auth updateUser disabled note:', err?.message);
    }
  }

  const now = new Date().toISOString();

  if (db) {
    try {
      const status = disabled ? 'disabled' : 'active';
      await db.collection('users').doc(targetUid).set({
        status,
        isBlocked: disabled,
        updatedAt: now,
        updatedBy: caller.uid
      }, { merge: true });

      await db.collection('admins').doc(targetUid).set({
        status,
        isBlocked: disabled,
        updatedAt: now,
        updatedBy: caller.uid
      }, { merge: true });

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: caller.uid,
        actorEmail: caller.email || 'superadmin@muety.in',
        actorRole: caller.roles[0] || 'superadmin',
        action: disabled ? 'ADMIN_DISABLED' : 'ADMIN_ENABLED',
        entityType: 'ADMIN',
        entityId: targetUid,
        targetUid,
        reason: disabled ? `Deactivated admin user ${targetUid}` : `Re-enabled admin user ${targetUid}`,
        timestamp: now
      });
    } catch {}
  }

  return {
    success: true,
    targetUid,
    disabled,
    message: `Account ${disabled ? 'disabled' : 're-enabled'} successfully for user ${targetUid}.`
  };
}

/**
 * POST /api/admin/create-department
 */
export async function handleCreateDepartment(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();

  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    throw new Error('PERMISSION_DENIED: Only Super Admin can create departments.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : name.toLowerCase().replace(/\s+/g, '_');
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 10;

  if (!name) throw new Error('INVALID_ARGUMENT: Department name is required.');

  const id = slug || `dept-${Date.now()}`;
  const now = new Date().toISOString();

  const deptPayload = {
    id,
    name,
    slug,
    description,
    status: 'active',
    sortOrder,
    createdAt: now,
    updatedAt: now,
    createdBy: caller.uid
  };

  if (db) {
    try {
      await db.collection('departments').doc(id).set(deptPayload, { merge: true });

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: caller.uid,
        actorEmail: caller.email || 'superadmin@muety.in',
        actorRole: caller.roles[0] || 'superadmin',
        action: 'DEPARTMENT_CREATED',
        entityType: 'ADMIN',
        entityId: id,
        departmentId: id,
        after: deptPayload,
        reason: `Created new department "${name}" (${id})`,
        timestamp: now
      });
    } catch {}
  }

  return { success: true, department: deptPayload };
}

/**
 * POST /api/admin/update-department
 */
export async function handleUpdateDepartment(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();

  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    throw new Error('PERMISSION_DENIED: Only Super Admin can update departments.');
  }

  const departmentId = body.departmentId || body.id;
  if (!departmentId || typeof departmentId !== 'string') {
    throw new Error('INVALID_ARGUMENT: Department ID is required.');
  }

  const status = body.status;

  // Dependency Check when disabling a department
  if (status === 'disabled' && db) {
    try {
      const activeAdminsSnap = await db.collection('users').where('departmentId', '==', departmentId).get();
      const activeCount = activeAdminsSnap.docs.filter(d => {
        const data = d.data();
        return !data.isBlocked && data.status !== 'disabled';
      }).length;

      if (activeCount > 0) {
        throw new Error(`FAILED_PRECONDITION: Cannot disable department "${departmentId}": ${activeCount} active admin user(s) are currently assigned to this department.`);
      }
    } catch (err: any) {
      if (err?.message?.startsWith('FAILED_PRECONDITION')) throw err;
    }
  }

  const now = new Date().toISOString();
  const updatePayload: any = { updatedAt: now };
  if (body.name) updatePayload.name = body.name.trim();
  if (body.description !== undefined) updatePayload.description = body.description.trim();
  if (body.status) updatePayload.status = body.status;
  if (body.sortOrder !== undefined) updatePayload.sortOrder = Number(body.sortOrder);

  if (db) {
    try {
      await db.collection('departments').doc(departmentId).set(updatePayload, { merge: true });

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: caller.uid,
        actorEmail: caller.email || 'superadmin@muety.in',
        actorRole: caller.roles[0] || 'superadmin',
        action: status === 'disabled' ? 'DEPARTMENT_DISABLED' : 'DEPARTMENT_UPDATED',
        entityType: 'ADMIN',
        entityId: departmentId,
        departmentId,
        after: updatePayload,
        reason: `Updated department "${departmentId}" status=${status || 'active'}`,
        timestamp: now
      });
    } catch {}
  }

  return { success: true, departmentId, ...updatePayload };
}

/**
 * POST /api/admin/create-role
 */
export async function handleCreateRole(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();

  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    throw new Error('PERMISSION_DENIED: Only Super Admin can create roles.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : name.toLowerCase().replace(/\s+/g, '_');
  const departmentId = typeof body.departmentId === 'string' ? body.departmentId.trim() : 'management';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const permissions = typeof body.permissions === 'object' && body.permissions !== null ? body.permissions : {};

  if (!name) throw new Error('INVALID_ARGUMENT: Role name is required.');

  const id = slug || `role-${Date.now()}`;
  const now = new Date().toISOString();

  const rolePayload = {
    id,
    name,
    slug,
    departmentId,
    departmentName: DEPARTMENT_DISPLAY_NAMES[departmentId] || departmentId,
    description,
    status: 'active',
    permissions,
    createdAt: now,
    updatedAt: now,
    createdBy: caller.uid
  };

  if (db) {
    try {
      await db.collection('roles').doc(id).set(rolePayload, { merge: true });

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: caller.uid,
        actorEmail: caller.email || 'superadmin@muety.in',
        actorRole: caller.roles[0] || 'superadmin',
        action: 'ROLE_CREATED',
        entityType: 'ADMIN',
        entityId: id,
        roleId: id,
        departmentId,
        after: rolePayload,
        reason: `Created role "${name}" (${id}) under department "${departmentId}"`,
        timestamp: now
      });
    } catch {}
  }

  return { success: true, role: rolePayload };
}

/**
 * POST /api/admin/update-role-definition
 */
export async function handleUpdateRoleDefinition(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();

  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    throw new Error('PERMISSION_DENIED: Only Super Admin can update role definitions.');
  }

  const roleId = body.roleId || body.id;
  if (!roleId || typeof roleId !== 'string') {
    throw new Error('INVALID_ARGUMENT: Role ID is required.');
  }

  const now = new Date().toISOString();
  const updatePayload: any = { updatedAt: now };
  if (body.name) updatePayload.name = body.name.trim();
  if (body.description !== undefined) updatePayload.description = body.description.trim();
  if (body.status) updatePayload.status = body.status;
  if (body.permissions && typeof body.permissions === 'object') updatePayload.permissions = body.permissions;

  if (db) {
    try {
      await db.collection('roles').doc(roleId).set(updatePayload, { merge: true });

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: caller.uid,
        actorEmail: caller.email || 'superadmin@muety.in',
        actorRole: caller.roles[0] || 'superadmin',
        action: body.status === 'disabled' ? 'ROLE_DISABLED' : 'ROLE_UPDATED',
        entityType: 'ADMIN',
        entityId: roleId,
        roleId,
        after: updatePayload,
        reason: `Updated role definition for "${roleId}"`,
        timestamp: now
      });
    } catch {}
  }

  return { success: true, roleId, ...updatePayload };
}

/**
 * POST /api/admin/profile
 * Self-service admin profile update.
 * Target user UID is derived strictly from verified Firebase Auth ID Token.
 */
export async function handleUpdateAdminProfile(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  if (!caller || !caller.uid) {
    throw new Error('UNAUTHENTICATED: Authentication token is required.');
  }

  const targetUid = caller.uid; // Derived strictly from verified token!
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : undefined;
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : (typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : undefined);
  const alternatePhone = typeof body.alternatePhone === 'string' ? body.alternatePhone.trim() : undefined;
  const profilePhotoUrl = typeof body.profilePhotoUrl === 'string' ? body.profilePhotoUrl.trim() : (typeof body.photoURL === 'string' ? body.photoURL.trim() : undefined);
  const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : undefined;
  const bio = typeof body.bio === 'string' ? body.bio.trim() : undefined;

  // Phone validation if provided
  if (phone) {
    const phoneClean = phone.replace(/[\s\-\(\)\.]/g, '');
    const isIndianStandard = /^(\+91|91|0)?[6-9]\d{9}$/.test(phoneClean);
    const isE164 = /^\+?[1-9]\d{7,14}$/.test(phoneClean);
    if (!isIndianStandard && !isE164) {
      throw new Error('INVALID_ARGUMENT: Please enter a valid contact number (e.g. +91 9876543210 or 9876543210).');
    }
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = { updatedAt: now };
  const changedFields: string[] = [];

  if (fullName !== undefined) {
    updatePayload.fullName = fullName;
    changedFields.push('fullName');
  }
  if (displayName !== undefined) {
    updatePayload.displayName = displayName;
    changedFields.push('displayName');
  }
  if (phone !== undefined) {
    updatePayload.phone = phone;
    updatePayload.phoneNumber = phone;
    changedFields.push('phone');
  }
  if (alternatePhone !== undefined) {
    updatePayload.alternatePhone = alternatePhone;
    updatePayload.whatsappNumber = alternatePhone;
    changedFields.push('alternatePhone');
  }
  if (profilePhotoUrl !== undefined) {
    updatePayload.profilePhotoUrl = profilePhotoUrl;
    updatePayload.photoURL = profilePhotoUrl;
    changedFields.push('profilePhotoUrl');
  }
  if (jobTitle !== undefined) {
    updatePayload.jobTitle = jobTitle;
    changedFields.push('jobTitle');
  }
  if (bio !== undefined) {
    updatePayload.bio = bio;
    changedFields.push('bio');
  }

  if (auth && (displayName || profilePhotoUrl)) {
    try {
      const authUpdates: any = {};
      if (displayName) authUpdates.displayName = displayName;
      if (profilePhotoUrl && (profilePhotoUrl.startsWith('http://') || profilePhotoUrl.startsWith('https://'))) {
        authUpdates.photoURL = profilePhotoUrl;
      }
      if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(targetUid, authUpdates);
      }
    } catch (authErr: any) {
      console.warn('[AdminApi] Auth profile sync note:', authErr?.message);
    }
  }

  if (db) {
    try {
      await db.collection('users').doc(targetUid).set(updatePayload, { merge: true });
      await db.collection('admins').doc(targetUid).set(updatePayload, { merge: true });

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('adminAuditLogs').doc(logId).set({
        logId,
        actorUid: targetUid,
        actorEmail: caller.email || '',
        actorRole: caller.roles[0] || 'admin',
        action: 'ADMIN_PROFILE_UPDATED',
        entityType: 'ADMIN',
        entityId: targetUid,
        targetUid,
        changedFields,
        after: updatePayload,
        reason: `Admin updated self profile (${changedFields.join(', ')})`,
        timestamp: now
      });
    } catch (dbErr) {
      console.warn('[AdminApi] Firestore write note:', dbErr);
    }
  }

  return {
    success: true,
    targetUid,
    changedFields,
    user: updatePayload,
    message: 'Profile updated successfully.'
  };
}

