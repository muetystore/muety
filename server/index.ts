/**
 * MUETYSTORE — Production Server API Entry Point (Stage 03 — Security Remediation)
 * 
 * Exposes reachable HTTP server API routes:
 * 1. POST /api/admin/set-role     (Assign custom claims & role via Firebase Admin SDK)
 * 2. POST /api/admin/create-user  (Provision admin user via Firebase Admin SDK)
 * 3. POST /api/orders/create      (Server-authoritative order creation & atomic inventory reservation)
 * 4. POST /api/media/signature    (Secure Cloudinary signature generation)
 * 5. POST /api/cloudinary/delete  (Secure Cloudinary asset deletion)
 */

import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

// Diagnostic startup check for Cloudinary configuration (Requirement 12)
const cloudNameConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME);
const apiKeyConfigured = Boolean(process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY);
const apiSecretConfigured = Boolean(process.env.CLOUDINARY_API_SECRET);

if (cloudNameConfigured && apiKeyConfigured && apiSecretConfigured) {
  console.log('[Cloudinary] configuration:\ncloudName: configured\napiKey: configured\napiSecret: configured');
} else {
  console.warn('[Cloudinary] configuration incomplete');
}

import {
  generateUploadSignatureServer,
  deleteCloudinaryAssetServer
} from './media/cloudinaryServer';
import { 
  handleSetAdminRole, 
  handleUpdateAdminRole,
  handleCreateAdminUser,
  handleResendInvitation,
  handleDisableAdminUser,
  handleCreateDepartment,
  handleUpdateDepartment,
  handleCreateRole,
  handleUpdateRoleDefinition,
  handleGetConfigStatus,
  handleUpdateAdminProfile
} from './adminApi';
import { handleCreateServerOrder } from './orderApi';
import { handleGetAnnouncements, handleSaveAnnouncements } from './announcementApi';
import { handleVerifyPayment } from './paymentApi';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://www.admin.muety.in',
  'https://admin.muety.in',
  'https://store.muety.in',
  'https://www.store.muety.in',
  'https://muety.in',
  'https://www.muety.in'
];

export interface StructuredApiError {
  success: false;
  code?: string;
  error: {
    code: 'UNAUTHENTICATED' | 'PERMISSION_DENIED' | 'INVALID_ARGUMENT' | 'METHOD_NOT_ALLOWED' | 'NOT_FOUND' | 'FAILED_PRECONDITION' | 'INVITATION_EMAIL_PROVIDER_REJECTED' | 'INTERNAL';
    message: string;
  };
}

function setCorsHeaders(req: any, res: any) {
  const origin = req.headers?.origin;
  if (
    origin && 
    (ALLOWED_ORIGINS.includes(origin) || 
     origin.endsWith('.firebaseapp.com') || 
     origin.endsWith('.web.app') || 
     origin.endsWith('.muety.in') || 
     origin === 'https://muety.in')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJsonResponse(res: any, statusCode: number, data: any) {
  setCorsHeaders(res.req || {}, res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function sendErrorResponse(res: any, statusCode: number, code: StructuredApiError['error']['code'], message: string) {
  sendJsonResponse(res, statusCode, {
    success: false,
    code,
    error: {
      code,
      message
    }
  });
}

async function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesRead = 0;
    const MAX_BYTES = 1024 * 1024; // 1MB limit

    req.on('data', (chunk: any) => {
      bytesRead += chunk.length;
      if (bytesRead > MAX_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE: Request payload exceeds maximum size limit of 1MB.'));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!body || !body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('INVALID_ARGUMENT: Malformed JSON body in request.'));
      }
    });

    req.on('error', (err: any) => {
      reject(err);
    });
  });
}

async function dispatchRouteHandler(fn: Function, authHeader: string | undefined, body: any, res: any, defaultErrorMsg: string) {
  try {
    const result = await fn(authHeader, body);
    sendJsonResponse(res, 200, result);
  } catch (err: any) {
    const msg = err?.message || defaultErrorMsg;
    if (msg.startsWith('UNAUTHENTICATED')) {
      sendErrorResponse(res, 401, 'UNAUTHENTICATED', msg);
    } else if (msg.startsWith('PERMISSION_DENIED')) {
      sendErrorResponse(res, 403, 'PERMISSION_DENIED', msg);
    } else if (msg.startsWith('INVALID_ARGUMENT')) {
      sendErrorResponse(res, 400, 'INVALID_ARGUMENT', msg);
    } else if (msg.startsWith('FAILED_PRECONDITION')) {
      const isMissingCreds = msg.includes('Firebase Admin server credentials are not configured');
      const statusCode = isMissingCreds ? 503 : 400;
      sendErrorResponse(res, statusCode, 'FAILED_PRECONDITION', msg);
    } else if (msg.startsWith('INVITATION_EMAIL_PROVIDER_REJECTED')) {
      sendErrorResponse(res, 400, 'INVITATION_EMAIL_PROVIDER_REJECTED', 'Admin account created, but invitation email could not be sent. Verify the MUETY sending domain in Resend.');
    } else if (msg.startsWith('NOT_FOUND')) {
      sendErrorResponse(res, 404, 'NOT_FOUND', msg);
    } else {
      sendErrorResponse(res, 500, 'INTERNAL', msg);
    }
  }
}

/**
 * Centralized API Router and Request Handler for MUETY Production API.
 */
export async function handleApiRequest(req: any, res: any): Promise<boolean> {
  const urlPath = (req.url || '').split('?')[0];

  // Match only /api/ routes
  if (!urlPath.startsWith('/api/')) {
    return false;
  }

  setCorsHeaders(req, res);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // Handle /api/announcements (GET and POST)
  if (urlPath === '/api/announcements') {
    if (req.method === 'GET') {
      const data = await handleGetAnnouncements();
      sendJsonResponse(res, 200, data);
      return true;
    }
    if (req.method === 'POST') {
      let body: any = {};
      try {
        body = await parseJsonBody(req);
      } catch (err: any) {
        sendErrorResponse(res, 400, 'INVALID_ARGUMENT', err?.message || 'Invalid JSON body');
        return true;
      }
      const data = await handleSaveAnnouncements(body);
      sendJsonResponse(res, 200, data);
      return true;
    }
  }

  // Handle /api/launch-status (GET)
  if (urlPath === '/api/launch-status' && req.method === 'GET') {
    const launchDateIso = process.env.LAUNCH_DATE || process.env.VITE_LAUNCH_DATE || '2026-10-18T08:00:00+05:30';
    const establishment = process.env.LAUNCH_ESTABLISHMENT || process.env.VITE_LAUNCH_ESTABLISHMENT || process.env.ESTABLISHMENT_YEAR || '2026';
    const mode = (process.env.MUETY_LAUNCH_MODE || 'production').toLowerCase();
    const launchTimestamp = new Date(launchDateIso).getTime();
    const now = Date.now();
    let status = 'PRE_LAUNCH';
    if (mode === 'preview' || mode === 'force_live' || mode === 'live') {
      status = 'LIVE';
    } else {
      status = now >= launchTimestamp ? 'LIVE' : 'PRE_LAUNCH';
    }
    const establishmentDisplay = isNaN(Number(establishment))
      ? establishment
      : `Est. ${establishment} • Royal Weaves`;

    sendJsonResponse(res, 200, {
      status,
      launchAt: launchDateIso,
      launchTimestamp,
      establishment,
      establishmentDisplay,
      serverTime: new Date(now).toISOString(),
      serverTimestamp: now,
      timeRemainingMs: Math.max(0, launchTimestamp - now),
      storeUrl: process.env.MUETY_STORE_URL || process.env.STORE_URL || 'http://localhost:5173',
      mode
    });
    return true;
  }

  // Reject non-POST methods
  if (req.method !== 'POST') {
    sendErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', `HTTP method ${req.method} is not allowed. Supported method: POST.`);
    return true;
  }


  // Content-Type validation
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (contentType && !contentType.includes('application/json')) {
    sendErrorResponse(res, 400, 'INVALID_ARGUMENT', 'Content-Type header must be application/json.');
    return true;
  }

  // Parse Body
  let body: any;
  try {
    body = await parseJsonBody(req);
  } catch (parseErr: any) {
    const msg = parseErr?.message || 'Invalid request body.';
    sendErrorResponse(res, 400, 'INVALID_ARGUMENT', msg);
    return true;
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;

  // ROUTE 0: POST /api/admin/config-status
  if (urlPath === '/api/admin/config-status') {
    const statusResult = await handleGetConfigStatus();
    sendJsonResponse(res, 200, statusResult);
    return true;
  }

  // ROUTE 1: POST /api/admin/set-role & POST /api/admin/update-role
  if (urlPath === '/api/admin/set-role' || urlPath === '/api/admin/update-role') {
    await dispatchRouteHandler(handleUpdateAdminRole, authHeader, body, res, 'Failed to update admin role claims.');
    return true;
  }

  // ROUTE 2: POST /api/admin/create-user
  if (urlPath === '/api/admin/create-user') {
    await dispatchRouteHandler(handleCreateAdminUser, authHeader, body, res, 'Failed to provision admin account.');
    return true;
  }

  // ROUTE 3: POST /api/admin/resend-invitation
  if (urlPath === '/api/admin/resend-invitation') {
    await dispatchRouteHandler(handleResendInvitation, authHeader, body, res, 'Failed to resend admin invitation.');
    return true;
  }

  // ROUTE 4: POST /api/admin/disable-user
  if (urlPath === '/api/admin/disable-user') {
    await dispatchRouteHandler(handleDisableAdminUser, authHeader, body, res, 'Failed to update admin account status.');
    return true;
  }

  // ROUTE 5: POST /api/admin/create-department
  if (urlPath === '/api/admin/create-department') {
    await dispatchRouteHandler(handleCreateDepartment, authHeader, body, res, 'Failed to create department.');
    return true;
  }

  // ROUTE 6: POST /api/admin/update-department
  if (urlPath === '/api/admin/update-department') {
    await dispatchRouteHandler(handleUpdateDepartment, authHeader, body, res, 'Failed to update department.');
    return true;
  }

  // ROUTE 7: POST /api/admin/create-role
  if (urlPath === '/api/admin/create-role') {
    await dispatchRouteHandler(handleCreateRole, authHeader, body, res, 'Failed to create role.');
    return true;
  }

  // ROUTE 8: POST /api/admin/update-role-definition
  if (urlPath === '/api/admin/update-role-definition') {
    await dispatchRouteHandler(handleUpdateRoleDefinition, authHeader, body, res, 'Failed to update role definition.');
    return true;
  }

  // ROUTE 9: POST /api/admin/profile
  if (urlPath === '/api/admin/profile') {
    await dispatchRouteHandler(handleUpdateAdminProfile, authHeader, body, res, 'Failed to update admin profile.');
    return true;
  }

  // ROUTE 3: POST /api/orders/create
  if (urlPath === '/api/orders/create') {
    await dispatchRouteHandler(handleCreateServerOrder, authHeader, body, res, 'Failed to create order.');
    return true;
  }

  // ROUTE 3.5: POST /api/payments/verify & POST /api/payments/verify-payment
  if (urlPath === '/api/payments/verify' || urlPath === '/api/payments/verify-payment') {
    await dispatchRouteHandler(handleVerifyPayment, authHeader, body, res, 'Failed to verify payment signature.');
    return true;
  }

  // ROUTE 4: POST media upload signature generation
  const signatureEndpoint = process.env.VITE_CLOUDINARY_SIGNATURE_ENDPOINT;
  if (urlPath === '/api/media/cloudinary-signature' || (signatureEndpoint && urlPath === signatureEndpoint) || urlPath.endsWith('/sign')) {
    const folder = typeof body?.folder === 'string' ? body.folder.trim() : 'muety/categories';
    const publicId = typeof body?.publicId === 'string' ? body.publicId.trim() : undefined;

    try {
      const sigData = await generateUploadSignatureServer(authHeader, { folder, publicId });
      sendJsonResponse(res, 200, {
        success: true,
        ...sigData
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate upload signature.';
      if (msg.startsWith('UNAUTHENTICATED')) {
        sendErrorResponse(res, 401, 'UNAUTHENTICATED', msg);
      } else if (msg.startsWith('PERMISSION_DENIED')) {
        sendErrorResponse(res, 403, 'PERMISSION_DENIED', msg);
      } else if (msg.startsWith('FAILED_PRECONDITION')) {
        sendErrorResponse(res, 500, 'FAILED_PRECONDITION', msg);
      } else {
        sendErrorResponse(res, 500, 'INTERNAL', `Internal server error processing media signature: ${msg}`);
      }
    }
    return true;
  }

  // ROUTE 5: POST /api/media/cloudinary-delete & POST /api/cloudinary/delete
  if (urlPath === '/api/media/cloudinary-delete' || urlPath === '/api/cloudinary/delete') {
    const publicIds = body?.publicIds;
    if (!Array.isArray(publicIds) || publicIds.length === 0 || !publicIds.every(id => typeof id === 'string' && id.trim().length > 0)) {
      sendErrorResponse(res, 400, 'INVALID_ARGUMENT', 'Request payload must contain a non-empty array of publicId strings in "publicIds".');
      return true;
    }

    try {
      const delData = await deleteCloudinaryAssetServer(authHeader, publicIds);
      sendJsonResponse(res, 200, {
        success: true,
        deleted: delData.deleted
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to destroy media asset.';
      if (msg.startsWith('UNAUTHENTICATED')) {
        sendErrorResponse(res, 401, 'UNAUTHENTICATED', msg);
      } else if (msg.startsWith('PERMISSION_DENIED')) {
        sendErrorResponse(res, 403, 'PERMISSION_DENIED', msg);
      } else {
        sendErrorResponse(res, 500, 'INTERNAL', 'Internal server error processing media deletion.');
      }
    }
    return true;
  }

  // Unknown /api/ route
  sendErrorResponse(res, 404, 'NOT_FOUND', `API endpoint ${urlPath} was not found.`);
  return true;
}

/**
 * Legacy export alias for vite dev plugin compatibility
 */
export const handleCloudinaryApiRequest = handleApiRequest;

/**
 * Standalone HTTP server listener for Node runtime environments.
 */
export function startServer(port = 3001) {
  const server = http.createServer((req, res) => {
    handleApiRequest(req, res).then(handled => {
      if (!handled) {
        sendErrorResponse(res, 404, 'NOT_FOUND', 'Route not found.');
      }
    });
  });

  server.listen(port, () => {
    console.log(`MUETY Production API Server running on port ${port}`);
  });

  return server;
}
