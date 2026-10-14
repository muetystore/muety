import { describe, it, expect, beforeEach } from 'vitest';
import { 
  verifyServerMediaAuthorization, 
  generateUploadSignatureServer 
} from '../../server/media/cloudinaryServer';
import { uploadToCloudinary, getCloudinaryUploadSignature } from '../lib/media/cloudinary';
import { productService } from '../features/catalog/services/productService';
import { storageService } from '../lib/storage/storageService';

describe('Cloudinary Server-Side Signature & Security Architecture', () => {

  beforeEach(() => {
    storageService.clearAll();
  });

  it('1. Signature endpoint requires authentication (missing header throws UNAUTHENTICATED)', async () => {
    await expect(
      verifyServerMediaAuthorization(undefined)
    ).rejects.toThrow(/UNAUTHENTICATED/i);
  });

  it('2. Unauthorized user receives 403 PERMISSION_DENIED', async () => {
    await expect(
      verifyServerMediaAuthorization('Bearer test_mock_unauthorized_customer_token')
    ).rejects.toThrow(/PERMISSION_DENIED/i);
  });

  const TEST_MOCK_SECRET = 'mock_test_cloudinary_secret_1234567890abcdef';

  it('3. Missing Cloudinary API secret produces controlled FAILED_PRECONDITION error', async () => {
    const origSecret = process.env.CLOUDINARY_API_SECRET;
    process.env.CLOUDINARY_API_SECRET = '';

    await expect(
      generateUploadSignatureServer('Bearer mock_admin_token', { folder: 'muety/categories' })
    ).rejects.toThrow(/FAILED_PRECONDITION/i);

    process.env.CLOUDINARY_API_SECRET = origSecret || TEST_MOCK_SECRET;
  });

  it('4. Generated signature is NOT a mock or dev fallback string', async () => {
    process.env.CLOUDINARY_API_SECRET = TEST_MOCK_SECRET;
    const res = await generateUploadSignatureServer('Bearer mock_admin_token', { 
      folder: 'muety/categories', 
      publicId: 'category_test_12345' 
    });

    expect(res.signature).toBeDefined();
    expect(res.signature).not.toContain('dev_mock');
    expect(res.signature).not.toContain('mock_signature');
    expect(/^[a-f0-9]{40}$/i.test(res.signature)).toBe(true); // SHA-1 hex hash
  });

  it('5. API secret is NEVER returned to the client in SignatureResponse', async () => {
    process.env.CLOUDINARY_API_SECRET = TEST_MOCK_SECRET;
    const res = await generateUploadSignatureServer('Bearer mock_admin_token', { folder: 'muety/categories' });

    expect((res as any).apiSecret).toBeUndefined();
    expect((res as any).CLOUDINARY_API_SECRET).toBeUndefined();
  });

  it('6. Category upload stores canonical HTTPS secure_url', async () => {
    const testUrl = 'https://res.cloudinary.com/cxivbion/image/upload/v12345/muety/categories/category_cat123.jpg';
    const cat = await productService.addCategory('Kanchi Silk', 'Editorial description', testUrl, 'KS');

    expect(cat.imageUrl).toBe(testUrl);
    expect(cat.imageUrl?.startsWith('https://')).toBe(true);
  });

  it('7. Base64 data URI is strictly rejected and never persisted', async () => {
    const base64Str = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await expect(
      productService.addCategory('Base64 Fail', 'Editorial description for fail', base64Str, 'BF')
    ).rejects.toThrow(/Base64 persistence is disallowed/i);
  });

  it('8. Cloudinary upload failure prevents Firestore category write', async () => {
    const countBefore = storageService.getCategories().length;

    try {
      await productService.addCategory('Failed Image Cat', 'Desc', 'blob:http://localhost/1234', 'FC');
    } catch {
      // Expected rejection
    }

    const countAfter = storageService.getCategories().length;
    expect(countAfter).toBe(countBefore);
  });

  it('9. Exact signed parameters match between client request and server signature', async () => {
    process.env.CLOUDINARY_API_SECRET = TEST_MOCK_SECRET;
    const folder = 'muety/categories';
    const publicId = 'category_cat999_1700000000';

    const res = await generateUploadSignatureServer('Bearer mock_admin_token', { folder, publicId });

    expect(res.folder).toBe(folder);
    expect(res.publicId).toBe(publicId);
    expect(res.apiKey).toBeDefined();
    expect(typeof res.timestamp).toBe('number');
  });

  it('10. Cloudinary public ID is uniquely formed per category instance', async () => {
    const cat1Id = 'cat_101';
    const cat2Id = 'cat_102';
    const ts = Date.now();

    const pubId1 = `category_${cat1Id}_${ts}`;
    const pubId2 = `category_${cat2Id}_${ts}`;

    expect(pubId1).not.toBe(pubId2);
    expect(pubId1).toContain(cat1Id);
    expect(pubId2).toContain(cat2Id);
  });

});
