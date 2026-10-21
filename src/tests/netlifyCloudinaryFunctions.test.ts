import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// @ts-ignore
import { handler as signatureHandler } from '../../netlify/functions/cloudinary-signature.mjs';
// @ts-ignore
import { handler as deleteHandler } from '../../netlify/functions/cloudinary-delete.mjs';

describe('Netlify Cloudinary Functions Suite', () => {
  const mockSecret = 'test_secret_key_1234567890abcdef';
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.CLOUDINARY_API_SECRET = mockSecret;
    process.env.CLOUDINARY_CLOUD_NAME = 'cxivbion';
    process.env.CLOUDINARY_API_KEY = '922177698232752';
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe('cloudinary-signature function', () => {
    it('handles OPTIONS preflight request with 204 and CORS headers', async () => {
      const res = await signatureHandler({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://admin.muety.in' }
      });

      expect(res.statusCode).toBe(204);
      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://admin.muety.in');
      expect(res.headers['Access-Control-Allow-Methods']).toContain('POST');
    });

    it('rejects GET requests with 405 Method Not Allowed', async () => {
      const res = await signatureHandler({
        httpMethod: 'GET',
        headers: {}
      });

      expect(res.statusCode).toBe(405);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('returns 503 FAILED_PRECONDITION when CLOUDINARY_API_SECRET is missing', async () => {
      delete process.env.CLOUDINARY_API_SECRET;

      const res = await signatureHandler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({ folder: 'muety/categories' })
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FAILED_PRECONDITION');
    });

    it('generates a valid SHA-1 signature for valid payload', async () => {
      const res = await signatureHandler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({
          folder: 'muety/categories',
          publicId: 'category_test_999'
        })
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.apiKey).toBe('922177698232752');
      expect(data.cloudName).toBe('cxivbion');
      expect(data.folder).toBe('muety/categories');
      expect(data.publicId).toBe('category_test_999');
      expect(typeof data.timestamp).toBe('number');
      expect(/^[a-f0-9]{40}$/i.test(data.signature)).toBe(true);
    });

    it('handles base64 encoded request body from Netlify gateway', async () => {
      const payload = JSON.stringify({ folder: 'muety/categories' });
      const b64 = Buffer.from(payload).toString('base64');

      const res = await signatureHandler({
        httpMethod: 'POST',
        isBase64Encoded: true,
        headers: {},
        body: b64
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.signature).toBeDefined();
    });
  });

  describe('cloudinary-delete function', () => {
    it('handles OPTIONS preflight request with 204', async () => {
      const res = await deleteHandler({
        httpMethod: 'OPTIONS',
        headers: {}
      });

      expect(res.statusCode).toBe(204);
    });

    it('rejects missing publicIds with 400 INVALID_ARGUMENT', async () => {
      const res = await deleteHandler({
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({})
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
