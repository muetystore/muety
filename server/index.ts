/**
 * MUETYSTORE — Production Server API Entry Point (Stage 03 — Security Remediation)
 * 
 * Exposes reachable HTTP server API routes:
 * 1. POST /api/admin/set-role     (Assign custom claims & role via Firebase Admin SDK)
 * 2. POST /api/admin/create-user  (Provision admin user via Firebase Admin SDK)
 * 3. POST /api/orders/create      (Server-authoritative order creation & atomic inventory reservation)
 * 4. POST /api/cloudinary/sign    (Secure Cloudinary signature generation)
 * 5. POST /api/cloudinary/delete  (Secure Cloudinary asset deletion)
 */

import http from 'http';
import {
  generateUploadSignatureServer,
  deleteCloudinaryAssetServer
} from './media/cloudinaryServer';
import { handleSetAdminRole, handleCreateAdminUser } from './adminApi';
import { handleCreateServerOrder } from './orderApi';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://muetystore-fdad2.web.app',
  'https://muetystore-fdad2.firebaseapp.com'
];

export interface StructuredApiError {
  success: false;
  error: {
    code: 'UNAUTHENTICATED' | 'PERMISSION_DENIED' | 'INVALID_ARGUMENT' | 'METHOD_NOT_ALLOWED' | 'NOT_FOUND' | 'FAILED_PRECONDITION' | 'INTERNAL';
    message: string;
  };
}

function setCorsHeaders(req: any, res: any) {
  const origin = req.headers?.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.firebaseapp.com') || origin.endsWith('.web.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://muetystore-fdad2.web.app');
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

  // ROUTE 1: POST /api/admin/set-role
  if (urlPath === '/api/admin/set-role') {
    try {
      const result = await handleSetAdminRole(authHeader, body);
      sendJsonResponse(res, 200, result);
    } catch (err: any) {
      const msg = err?.message || 'Failed to assign admin role claims.';
      if (msg.startsWith('UNAUTHENTICATED')) {
        sendErrorResponse(res, 401, 'UNAUTHENTICATED', msg);
      } else if (msg.startsWith('PERMISSION_DENIED')) {
        sendErrorResponse(res, 403, 'PERMISSION_DENIED', msg);
      } else if (msg.startsWith('INVALID_ARGUMENT')) {
        sendErrorResponse(res, 400, 'INVALID_ARGUMENT', msg);
      } else {
        sendErrorResponse(res, 500, 'INTERNAL', msg);
      }
    }
    return true;
  }

  // ROUTE 2: POST /api/admin/create-user
  if (urlPath === '/api/admin/create-user') {
    try {
      const result = await handleCreateAdminUser(authHeader, body);
      sendJsonResponse(res, 200, result);
    } catch (err: any) {
      const msg = err?.message || 'Failed to provision admin account.';
      if (msg.startsWith('UNAUTHENTICATED')) {
        sendErrorResponse(res, 401, 'UNAUTHENTICATED', msg);
      } else if (msg.startsWith('PERMISSION_DENIED')) {
        sendErrorResponse(res, 403, 'PERMISSION_DENIED', msg);
      } else if (msg.startsWith('INVALID_ARGUMENT')) {
        sendErrorResponse(res, 400, 'INVALID_ARGUMENT', msg);
      } else {
        sendErrorResponse(res, 500, 'INTERNAL', msg);
      }
    }
    return true;
  }

  // ROUTE 3: POST /api/orders/create
  if (urlPath === '/api/orders/create') {
    try {
      const result = await handleCreateServerOrder(authHeader, body);
      sendJsonResponse(res, 200, result);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create order.';
      if (msg.startsWith('FAILED_PRECONDITION')) {
        sendErrorResponse(res, 400, 'FAILED_PRECONDITION', msg);
      } else if (msg.startsWith('NOT_FOUND')) {
        sendErrorResponse(res, 404, 'NOT_FOUND', msg);
      } else if (msg.startsWith('INVALID_ARGUMENT')) {
        sendErrorResponse(res, 400, 'INVALID_ARGUMENT', msg);
      } else {
        sendErrorResponse(res, 500, 'INTERNAL', msg);
      }
    }
    return true;
  }

  // ROUTE 4: POST /api/cloudinary/sign
  if (urlPath === '/api/cloudinary/sign') {
    const folder = typeof body?.folder === 'string' ? body.folder.trim() : 'muety/products';
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
      } else {
        sendErrorResponse(res, 500, 'INTERNAL', 'Internal server error processing media signature.');
      }
    }
    return true;
  }

  // ROUTE 5: POST /api/cloudinary/delete
  if (urlPath === '/api/cloudinary/delete') {
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
