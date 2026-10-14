import crypto from 'node:crypto';

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
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, *',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };
}

/**
 * Netlify Serverless Function: Cloudinary Signed Upload Token Authority
 *
 * Exposes reachable endpoints for production Netlify deployments:
 * - POST /api/media/cloudinary-signature
 * - POST /api/cloudinary/sign
 */
export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight CORS OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `HTTP method ${event.httpMethod} is not allowed. Supported method: POST.`
        }
      })
    };
  }

  // Parse JSON request body
  let body = {};
  if (event.body) {
    try {
      const rawText = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      body = JSON.parse(rawText || '{}');
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_ARGUMENT',
            message: 'Malformed JSON payload in request body.'
          }
        })
      };
    }
  }

  // Sanitize folder
  let folder = typeof body?.folder === 'string' ? body.folder.trim() : 'muety/categories';
  if (folder.includes('..') || (!folder.startsWith('muety/') && folder !== 'muety')) {
    folder = 'muety/categories';
  }

  // Sanitize publicId
  let publicId = typeof body?.publicId === 'string' ? body.publicId.trim() : undefined;
  if (publicId && publicId.includes('..')) {
    publicId = publicId.replace(/\.\./g, '');
  }

  // Cloudinary configuration from server environment
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || 'cxivbion';
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY || '922177698232752';
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    console.warn('[Cloudinary Signature Netlify Function] CLOUDINARY_API_SECRET is missing in environment.');
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'FAILED_PRECONDITION',
          message: 'Cloudinary API secret is not configured on the server (CLOUDINARY_API_SECRET missing in server environment).'
        }
      })
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder,
    timestamp
  };
  if (publicId) {
    paramsToSign.public_id = publicId;
  }
  if (body?.transformation) {
    paramsToSign.transformation = body.transformation;
  }

  // Cloudinary signature calculation:
  // 1. Sort parameter keys alphabetically
  // 2. Format key=value joined by &
  // 3. Append apiSecret
  // 4. Compute SHA-1 hex digest
  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys
    .filter(k => paramsToSign[k] !== undefined && paramsToSign[k] !== null && paramsToSign[k] !== '')
    .map(k => `${k}=${paramsToSign[k]}`)
    .join('&');

  const signature = crypto.createHash('sha1').update(serialized + apiSecret).digest('hex');

  const responsePayload = {
    success: true,
    apiKey,
    timestamp,
    signature,
    cloudName,
    folder
  };
  if (publicId) {
    responsePayload.publicId = publicId;
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(responsePayload)
  };
}
