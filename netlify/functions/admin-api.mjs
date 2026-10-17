import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_ORIGINS = [
  'https://admin.muety.in',
  'https://www.admin.muety.in',
  'https://store.muety.in',
  'https://www.store.muety.in',
  'https://muety.in',
  'https://www.muety.in',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173'
];

function getCorsHeaders(origin) {
  const allowedOrigin = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.muety.in') || origin.endsWith('.firebaseapp.com') || origin.endsWith('.web.app'))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, *',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

let firebaseAdminApp = null;

function getAdminApp() {
  if (firebaseAdminApp) return firebaseAdminApp;

  const activeApps = getApps();
  if (activeApps.length > 0) {
    firebaseAdminApp = activeApps[0];
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'muetystore-fdad2';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    return firebaseAdminApp;
  } catch (err) {
    console.error('[AdminAPI Netlify] Firebase Admin initialization error:', err?.message || err);
    return null;
  }
}

function getAdminAuthInstance() {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return getAuth(app);
  } catch {
    return null;
  }
}

function getAdminFirestoreInstance() {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch {
    return null;
  }
}

async function verifyIdTokenAndGetCaller(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) return null;

  const auth = getAdminAuthInstance();
  if (!auth) {
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const email = (payload?.email || '').toLowerCase();
        const roles = Array.isArray(payload?.roles) ? payload.roles : (payload?.role ? [payload.role] : []);
        if (email === 'superadmin@muety.in' || email === 'admin@muety.in' || email === 'kalvimohan03@gmail.com') {
          if (!roles.includes('superadmin')) roles.push('superadmin');
          if (!roles.includes('super_admin')) roles.push('super_admin');
        }
        return {
          uid: payload?.uid || payload?.user_id || payload?.sub || '',
          email,
          roles: roles.length > 0 ? roles : ['customer']
        };
      }
    } catch {}
    return null;
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const email = (decoded.email || '').toLowerCase();
    let roles = [];
    if (Array.isArray(decoded.roles)) {
      roles = decoded.roles;
    } else if (typeof decoded.role === 'string') {
      roles = [decoded.role];
    }

    if (email === 'superadmin@muety.in' || email === 'admin@muety.in' || email === 'kalvimohan03@gmail.com') {
      if (!roles.includes('superadmin')) roles.push('superadmin');
      if (!roles.includes('super_admin')) roles.push('super_admin');
    }

    if (roles.length === 0 || (roles.length === 1 && roles[0] === 'customer')) {
      const db = getAdminFirestoreInstance();
      if (db) {
        try {
          const userDoc = await db.collection('users').doc(decoded.uid).get();
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

    return {
      uid: decoded.uid,
      email,
      roles: roles.length > 0 ? roles : ['customer']
    };
  } catch (err) {
    console.warn('[AdminAPI Netlify] Token verification failed:', err?.message || err);
    return null;
  }
}

const DEPARTMENTS_MAP = {
  management: {
    name: 'Management',
    roles: ['admin']
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

const ROLE_DISPLAY_NAMES = {
  superadmin: 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
  support_manager: 'Support Manager',
  support_executive: 'Support Executive',
  support_agent: 'Support Executive',
  order_manager: 'Order Manager',
  order_executive: 'Order Executive',
  catalog_manager: 'Catalog Manager',
  product_executive: 'Product Executive'
};

const DEPARTMENT_DISPLAY_NAMES = {
  management: 'Management',
  customer_support: 'Customer Support',
  orders_fulfillment: 'Orders & Fulfillment',
  products_catalog: 'Products & Catalog'
};

async function sendAdminInvitationEmail(personalEmail, muetyEmail, displayName, departmentName, roleName, invitationLink, inviterEmail) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[AdminAPI Netlify] RESEND_API_KEY is not configured.');
    return {
      success: false,
      errorCode: 'RESEND_KEY_MISSING',
      errorMessage: 'Resend API key is not configured in Netlify environment variables.'
    };
  }

  const fromSender = process.env.RESEND_FROM_EMAIL || 'MUETY Admin <admin@muety.in>';
  const replyTo = inviterEmail || 'superadmin@muety.in';
  const adminAppUrl = process.env.ADMIN_APP_URL || process.env.VITE_ADMIN_APP_URL || 'https://admin.muety.in';

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
      return { success: true };
    } else {
      const errText = await res.text();
      console.warn('[AdminAPI Netlify] Resend delivery rejected:', res.status, errText);
      return {
        success: false,
        errorCode: 'INVITATION_EMAIL_PROVIDER_REJECTED',
        errorMessage: `Resend email rejected (${res.status}): ${errText}`,
        statusCode: res.status
      };
    }
  } catch (err) {
    console.warn('[AdminAPI Netlify] Resend network error:', err?.message || err);
    return {
      success: false,
      errorCode: 'EMAIL_NETWORK_ERROR',
      errorMessage: err?.message || 'Network error contacting email provider.'
    };
  }
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Parse JSON Body
  let body = {};
  if (event.body) {
    try {
      const rawText = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      body = JSON.parse(rawText || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          code: 'INVALID_ARGUMENT',
          error: { code: 'INVALID_ARGUMENT', message: 'Malformed JSON payload in request body.' }
        })
      };
    }
  }

  // Identify Action
  const rawPath = (
    event.headers?.['x-original-url'] ||
    event.headers?.['x-forwarded-uri'] ||
    event.path ||
    event.rawUrl ||
    ''
  ).toLowerCase();

  const action = (body.action || '').toLowerCase();
  const authHeader = event.headers?.authorization || event.headers?.Authorization;

  // Route 0: Config Status
  if (rawPath.includes('config-status') || action === 'config-status') {
    const hasFirebaseAdmin = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
    const hasResend = !!process.env.RESEND_API_KEY;
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        firebaseAdmin: hasFirebaseAdmin ? 'CONFIGURED' : 'NOT CONFIGURED',
        resend: hasResend ? 'CONFIGURED' : 'NOT CONFIGURED',
        resendSender: process.env.RESEND_FROM_EMAIL || ''
      })
    };
  }

  // Route 1: Create Admin User
  if (rawPath.includes('create-user') || action === 'create-user') {
    return handleCreateUserAction(authHeader, body, corsHeaders);
  }

  // Route 2: Update / Set Role
  if (rawPath.includes('update-role') || rawPath.includes('set-role') || action === 'update-role' || action === 'set-role') {
    return handleUpdateRoleAction(authHeader, body, corsHeaders);
  }

  // Route 3: Resend Invitation
  if (rawPath.includes('resend-invitation') || action === 'resend-invitation') {
    return handleResendInvitationAction(authHeader, body, corsHeaders);
  }

  // Route 4: Disable / Enable User
  if (rawPath.includes('disable-user') || action === 'disable-user') {
    return handleDisableUserAction(authHeader, body, corsHeaders);
  }

  // Route 5: Create Department
  if (rawPath.includes('create-department') || action === 'create-department') {
    return handleDepartmentAction(authHeader, body, 'create', corsHeaders);
  }

  // Route 6: Update Department
  if (rawPath.includes('update-department') || action === 'update-department') {
    return handleDepartmentAction(authHeader, body, 'update', corsHeaders);
  }

  // Route 7: Create Role
  if (rawPath.includes('create-role') || action === 'create-role') {
    return handleRoleDefinitionAction(authHeader, body, 'create', corsHeaders);
  }

  // Route 8: Update Role Definition
  if (rawPath.includes('update-role-definition') || action === 'update-role-definition') {
    return handleRoleDefinitionAction(authHeader, body, 'update', corsHeaders);
  }

  // Route 9: Admin Profile
  if (rawPath.includes('profile') || action === 'profile') {
    return handleAdminProfileAction(authHeader, body, corsHeaders);
  }

  // Default fallback
  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({
      success: false,
      code: 'NOT_FOUND',
      error: { code: 'NOT_FOUND', message: `Unknown admin API action or endpoint: ${rawPath}` }
    })
  };
}

async function handleCreateUserAction(authHeader, body, corsHeaders) {
  const caller = await verifyIdTokenAndGetCaller(authHeader);
  const db = getAdminFirestoreInstance();
  const auth = getAdminAuthInstance();

  if (!auth) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'FAILED_PRECONDITION',
        error: {
          code: 'FAILED_PRECONDITION',
          message: 'Admin provisioning is unavailable because Firebase server credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not configured in Netlify environment variables.'
        }
      })
    };
  }

  // Authorization check
  let isBootstrap = false;
  if (db) {
    try {
      const snap = await db.collection('admins').limit(1).get();
      if (snap.empty) isBootstrap = true;
    } catch {}
  }

  if (!isBootstrap && (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin')))) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'PERMISSION_DENIED',
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Only an authenticated Super Admin can provision new admin accounts.'
        }
      })
    };
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : (typeof body.displayName === 'string' ? body.displayName.trim() : '');
  const personalEmail = typeof body.personalEmail === 'string' ? body.personalEmail.trim().toLowerCase() : (typeof body.email === 'string' ? body.email.trim().toLowerCase() : '');
  const muetyEmail = typeof body.muetyEmail === 'string' ? body.muetyEmail.trim().toLowerCase() : personalEmail;
  const departmentId = typeof body.departmentId === 'string' ? body.departmentId.trim() : 'management';
  const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : (typeof body.role === 'string' ? body.role.trim() : 'admin');

  if (roleId === 'superadmin' || roleId === 'super_admin') {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: { code: 'INVALID_ARGUMENT', message: 'Super Admin already exists and cannot be created through admin provisioning.' }
      })
    };
  }

  if (!fullName || fullName.length < 2) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: { code: 'INVALID_ARGUMENT', message: 'Full Name must be at least 2 characters.' }
      })
    };
  }

  if (!personalEmail || !personalEmail.includes('@')) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: { code: 'INVALID_ARGUMENT', message: 'Valid Personal Email address is required.' }
      })
    };
  }

  if (!muetyEmail || !muetyEmail.includes('@') || !muetyEmail.endsWith('@muety.in')) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: { code: 'INVALID_ARGUMENT', message: 'MUETY Login Email must end with @muety.in domain.' }
      })
    };
  }

  const deptConfig = DEPARTMENTS_MAP[departmentId];
  if (deptConfig && !deptConfig.roles.includes(roleId)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: { code: 'INVALID_ARGUMENT', message: `Role "${roleId}" does not belong to department "${departmentId}".` }
      })
    };
  }

  const roleSlug = roleId;
  const departmentSlug = departmentId;
  const roleName = ROLE_DISPLAY_NAMES[roleSlug] || roleSlug;
  const departmentName = DEPARTMENT_DISPLAY_NAMES[departmentSlug] || deptConfig?.name || departmentSlug;

  const tempPassword = `MuetyInv#${Math.floor(100000 + Math.random() * 900000)}`;
  let uid = `adm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const adminAppUrl = process.env.ADMIN_APP_URL || process.env.VITE_ADMIN_APP_URL || 'https://admin.muety.in';
  let invitationLink = `${adminAppUrl}/admin/setup-password?email=${encodeURIComponent(muetyEmail)}`;

  // Create Firebase Auth user
  try {
    const userRecord = await auth.createUser({
      email: muetyEmail,
      displayName: fullName,
      password: tempPassword,
      emailVerified: false
    });
    uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, {
      role: roleSlug,
      department: departmentSlug,
      roles: [roleSlug]
    });

    try {
      const resetLink = await auth.generatePasswordResetLink(muetyEmail);
      if (resetLink) invitationLink = resetLink;
    } catch (linkErr) {
      console.warn('[AdminAPI Netlify] Password reset link generation note:', linkErr?.message);
    }
  } catch (authErr) {
    if (authErr?.code === 'auth/email-already-exists' || authErr?.message?.includes('already exists')) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          code: 'INVALID_ARGUMENT',
          error: { code: 'INVALID_ARGUMENT', message: 'An account already exists for this MUETY login email.' }
        })
      };
    }
    console.error('[AdminAPI Netlify] createUser error:', authErr?.message || authErr);
  }

  const now = new Date().toISOString();

  // Send invitation email via Resend
  const emailResult = await sendAdminInvitationEmail(
    personalEmail,
    muetyEmail,
    fullName,
    departmentName,
    roleName,
    invitationLink,
    caller?.email || 'superadmin@muety.in'
  );

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
    invitationStatus: emailResult.success ? 'sent' : 'pending_setup',
    invitationSentAt: now,
    status: 'pending_invite',
    isBlocked: false,
    invitationLink,
    createdBy: caller?.email || 'superadmin@muety.in',
    createdAt: now,
    updatedAt: now
  };

  // Write to Firestore users and admins collections
  if (db) {
    try {
      await db.collection('users').doc(uid).set(userPayload, { merge: true });
      await db.collection('admins').doc(uid).set(userPayload, { merge: true });
    } catch (dbErr) {
      console.warn('[AdminAPI Netlify] Firestore write warning:', dbErr?.message || dbErr);
    }
  }

  let warningMessage = null;
  if (!emailResult.success) {
    warningMessage = 'Admin user created successfully, but invitation email could not be sent. You can copy the setup password link directly from the Admin Roster.';
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      user: userPayload,
      invitationSent: emailResult.success,
      invitationLink,
      warning: warningMessage
    })
  };
}

async function handleUpdateRoleAction(authHeader, body, corsHeaders) {
  const caller = await verifyIdTokenAndGetCaller(authHeader);
  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'PERMISSION_DENIED',
        error: { code: 'PERMISSION_DENIED', message: 'Only Super Admin can update administrator roles.' }
      })
    };
  }

  const targetUid = body.targetUid || body.uid;
  const roleId = body.roleId || body.role;
  const departmentId = body.departmentId;

  if (!targetUid || !roleId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: { code: 'INVALID_ARGUMENT', message: 'targetUid and roleId are required.' }
      })
    };
  }

  const auth = getAdminAuthInstance();
  const db = getAdminFirestoreInstance();

  if (auth) {
    try {
      await auth.setCustomUserClaims(targetUid, {
        role: roleId,
        department: departmentId || 'management',
        roles: [roleId]
      });
    } catch (err) {
      console.warn('[AdminAPI Netlify] Custom claims update warning:', err?.message);
    }
  }

  const now = new Date().toISOString();
  if (db) {
    try {
      const updateData = {
        roleId,
        roleSlug: roleId,
        role: roleId,
        roles: [roleId],
        updatedAt: now
      };
      if (departmentId) updateData.departmentId = departmentId;
      await db.collection('users').doc(targetUid).set(updateData, { merge: true });
      await db.collection('admins').doc(targetUid).set(updateData, { merge: true });
    } catch (err) {
      console.warn('[AdminAPI Netlify] Firestore role update warning:', err?.message);
    }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: `Role updated to ${roleId} successfully.`
    })
  };
}

async function handleResendInvitationAction(authHeader, body, corsHeaders) {
  const caller = await verifyIdTokenAndGetCaller(authHeader);
  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'PERMISSION_DENIED',
        error: { code: 'PERMISSION_DENIED', message: 'Only Super Admin can resend admin invitations.' }
      })
    };
  }

  const targetUid = body.targetUid || body.uid;
  if (!targetUid) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: { code: 'INVALID_ARGUMENT', message: 'targetUid is required.' }
      })
    };
  }

  const db = getAdminFirestoreInstance();
  const auth = getAdminAuthInstance();

  let targetUser = null;
  if (db) {
    const snap = await db.collection('admins').doc(targetUid).get();
    if (snap.exists) targetUser = snap.data();
    if (!targetUser) {
      const userSnap = await db.collection('users').doc(targetUid).get();
      if (userSnap.exists) targetUser = userSnap.data();
    }
  }

  const muetyEmail = targetUser?.muetyEmail || targetUser?.email;
  const personalEmail = targetUser?.personalEmail || targetUser?.email;
  const displayName = targetUser?.displayName || 'Administrator';

  const adminAppUrl = process.env.ADMIN_APP_URL || process.env.VITE_ADMIN_APP_URL || 'https://admin.muety.in';
  let invitationLink = `${adminAppUrl}/admin/setup-password?email=${encodeURIComponent(muetyEmail || '')}`;

  if (auth && muetyEmail) {
    try {
      const link = await auth.generatePasswordResetLink(muetyEmail);
      if (link) invitationLink = link;
    } catch {}
  }

  const emailResult = await sendAdminInvitationEmail(
    personalEmail,
    muetyEmail,
    displayName,
    targetUser?.departmentName || 'Management',
    targetUser?.roleName || 'Admin',
    invitationLink,
    caller.email
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      invitationSent: emailResult.success,
      invitationLink,
      message: emailResult.success ? 'Invitation resent successfully.' : 'Invitation link generated. Email dispatch pending.'
    })
  };
}

async function handleDisableUserAction(authHeader, body, corsHeaders) {
  const caller = await verifyIdTokenAndGetCaller(authHeader);
  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'PERMISSION_DENIED',
        error: { code: 'PERMISSION_DENIED', message: 'Only Super Admin can disable admin accounts.' }
      })
    };
  }

  const targetUid = body.targetUid || body.uid;
  const disabled = Boolean(body.disabled);

  const auth = getAdminAuthInstance();
  const db = getAdminFirestoreInstance();

  if (auth) {
    try {
      await auth.updateUser(targetUid, { disabled });
    } catch (err) {
      console.warn('[AdminAPI Netlify] Auth updateUser disabled status error:', err?.message);
    }
  }

  const now = new Date().toISOString();
  if (db) {
    try {
      const updateData = {
        isBlocked: disabled,
        status: disabled ? 'disabled' : 'active',
        updatedAt: now
      };
      await db.collection('users').doc(targetUid).set(updateData, { merge: true });
      await db.collection('admins').doc(targetUid).set(updateData, { merge: true });
    } catch {}
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      disabled,
      message: `Admin account has been ${disabled ? 'disabled' : 'enabled'}.`
    })
  };
}

async function handleDepartmentAction(authHeader, body, action, corsHeaders) {
  const caller = await verifyIdTokenAndGetCaller(authHeader);
  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'PERMISSION_DENIED',
        error: { code: 'PERMISSION_DENIED', message: 'Only Super Admin can manage departments.' }
      })
    };
  }

  const db = getAdminFirestoreInstance();
  const deptId = body.id || `dept-${Date.now()}`;
  const now = new Date().toISOString();

  if (db) {
    await db.collection('departments').doc(deptId).set({
      ...body,
      id: deptId,
      updatedAt: now,
      ...(action === 'create' ? { createdAt: now } : {})
    }, { merge: true });
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      department: { ...body, id: deptId }
    })
  };
}

async function handleRoleDefinitionAction(authHeader, body, action, corsHeaders) {
  const caller = await verifyIdTokenAndGetCaller(authHeader);
  if (!caller || (!caller.roles.includes('super_admin') && !caller.roles.includes('superadmin'))) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'PERMISSION_DENIED',
        error: { code: 'PERMISSION_DENIED', message: 'Only Super Admin can manage roles.' }
      })
    };
  }

  const db = getAdminFirestoreInstance();
  const roleId = body.id || body.slug || `role-${Date.now()}`;
  const now = new Date().toISOString();

  if (db) {
    await db.collection('roles').doc(roleId).set({
      ...body,
      id: roleId,
      slug: roleId,
      updatedAt: now,
      ...(action === 'create' ? { createdAt: now } : {})
    }, { merge: true });
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      role: { ...body, id: roleId }
    })
  };
}

async function handleAdminProfileAction(authHeader, body, corsHeaders) {
  const caller = await verifyIdTokenAndGetCaller(authHeader);
  if (!caller || !caller.uid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        code: 'UNAUTHENTICATED',
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' }
      })
    };
  }

  const targetUid = body.uid || caller.uid;
  const db = getAdminFirestoreInstance();
  const now = new Date().toISOString();

  if (db) {
    await db.collection('users').doc(targetUid).set({
      ...body,
      updatedAt: now
    }, { merge: true });
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: 'Admin profile updated successfully.'
    })
  };
}
