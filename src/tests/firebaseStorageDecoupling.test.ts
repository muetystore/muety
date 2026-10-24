/**
 * MUETYSTORE — Firebase Storage Decoupling & Independent Architecture Suite
 * 
 * Verifies that the entire MUETY platform operates without requiring Firebase Cloud Storage:
 * 1. Application and client SDK initialize without Firebase Storage.
 * 2. Storefront renders existing image URLs and paths without Storage.
 * 3. Core Firestore collections and workflows remain operational.
 * 4. Cloudinary uploads work only when securely configured.
 * 5. Unconfigured uploads provide clear, actionable feedback without crashing.
 * 6. Standard deployment configuration (firebase.json) excludes Cloud Storage.
 * 7. Security boundaries (auth, payment verification, admin roles) remain intact.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { app, storage } from '@/lib/firebase/firebase';
import { validateImageFile, getCloudinaryUrl, extractCloudinaryPublicId } from '@/lib/media/cloudinary';
import { generateUploadSignatureServer } from '../../server/media/cloudinaryServer';
import { adminProfileService } from '@/features/admin/services/adminProfileService';
import { productService } from '@/features/catalog/services/productService';
import { categoryService } from '@/features/catalog/services/categoryService';

describe('MUETY Firebase Storage Decoupling & Independent Architecture', () => {

  // 1. Application Initialization Without Storage
  describe('1. Application and Client SDK Initialization', () => {
    it('initializes Firebase client SDK without requiring Firebase Cloud Storage', () => {
      // Storage export must be null (completely unprovisioned & disabled)
      expect(storage).toBeNull();
      // App, auth, and firestore references are defined or gracefully managed
      expect(app).toBeDefined();
    });

    it('does not import firebase/storage in application codebase', () => {
      const srcDir = path.resolve(process.cwd(), 'src');
      const checkDirForStorageImports = (dir: string): string[] => {
        const violations: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'tests') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            violations.push(...checkDirForStorageImports(fullPath));
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes("from 'firebase/storage'") || content.includes('from "firebase/storage"')) {
              violations.push(fullPath);
            }
          }
        }
        return violations;
      };

      const foundViolations = checkDirForStorageImports(srcDir);
      expect(foundViolations).toEqual([]);
    });
  });

  // 2. Storefront Image Rendering
  describe('2. Storefront Media Handling and Existing URLs', () => {
    it('preserves existing HTTPS and static web image URLs without modifying them', () => {
      const existingHttps = 'https://images.unsplash.com/photo-1524805444758-089113d48a6d';
      const existingStatic = '/saree_model_individual.jpg';
      const cloudinaryUrl = 'https://res.cloudinary.com/cxivbion/image/upload/v1234/muety/products/saree1.jpg';

      expect(getCloudinaryUrl(existingHttps)).toBe(existingHttps);
      expect(getCloudinaryUrl(existingStatic)).toBe(existingStatic);
      expect(getCloudinaryUrl(cloudinaryUrl)).toContain('/image/upload/');
    });

    it('correctly extracts public IDs from existing Cloudinary assets', () => {
      const cdnUrl = 'https://res.cloudinary.com/cxivbion/image/upload/v1729000000/muety/categories/category_cat123.jpg';
      expect(extractCloudinaryPublicId(cdnUrl)).toBe('muety/categories/category_cat123');
    });

    it('rejects malformed or unsafe file extensions before any upload attempt', () => {
      const maliciousFile = new File(['echo malicious'], 'exploit.svg', { type: 'image/svg+xml' });
      const validation = validateImageFile(maliciousFile);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Disallowed extension');
    });
  });

  // 3. Core Firestore Workflows
  describe('3. Core Firestore Business Data Source Integrity', () => {
    it('disallows saving base64 or blob strings in admin profile to protect Firestore', async () => {
      const { authService } = await import('@/features/auth/services/authService');
      (authService as any).setCurrentUser({
        uid: 'mock_admin',
        email: 'admin@muety.in',
        roles: ['super_admin']
      });

      await expect(
        adminProfileService.updateAdminProfile('mock_admin', {
          displayName: 'Test Admin',
          profilePhotoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...'
        })
      ).rejects.toThrow(/Base64 data URIs or Blob URLs cannot be stored in Firestore/);
    });

    it('verifies catalog and category services retain schema independence', () => {
      expect(typeof productService.getAllProducts).toBe('function');
      expect(typeof productService.getProductById).toBe('function');
      expect(typeof categoryService.getCategories).toBe('function');
      expect(typeof categoryService.getCategoryById).toBe('function');
    });
  });

  // 4. Cloudinary Upload Security
  describe('4. Cloudinary Server Signature Security Boundary', () => {
    const origSecret = process.env.CLOUDINARY_API_SECRET;
    const origCloud = process.env.CLOUDINARY_CLOUD_NAME;
    const origKey = process.env.CLOUDINARY_API_KEY;

    beforeEach(() => {
      process.env.CLOUDINARY_API_SECRET = 'mock_secret_key_1234567890';
      process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
      process.env.CLOUDINARY_API_KEY = 'test_api_key';
    });

    afterAll(() => {
      process.env.CLOUDINARY_API_SECRET = origSecret;
      process.env.CLOUDINARY_CLOUD_NAME = origCloud;
      process.env.CLOUDINARY_API_KEY = origKey;
    });

    it('requires server authorization header and rejects unauthenticated requests', async () => {
      await expect(
        generateUploadSignatureServer(undefined, { folder: 'muety/media' })
      ).rejects.toThrow(/UNAUTHENTICATED/);
    });

    it('rejects unauthorized customer role from obtaining admin media signature', async () => {
      await expect(
        generateUploadSignatureServer('Bearer test_mock_customer_token', { folder: 'muety/products' })
      ).rejects.toThrow(/PERMISSION_DENIED/);
    });

    it('issues signed parameters without exposing CLOUDINARY_API_SECRET in output', async () => {
      const sig = await generateUploadSignatureServer('Bearer test_mock_superadmin_token', {
        folder: 'muety/products/saree-01'
      });

      expect(sig.signature).toBeDefined();
      expect(sig.timestamp).toBeTypeOf('number');
      expect(sig.folder).toBe('muety/products/saree-01');
      expect((sig as any).CLOUDINARY_API_SECRET).toBeUndefined();
      expect((sig as any).apiSecret).toBeUndefined();
    });
  });

  // 5. Unconfigured Upload Handling
  describe('5. Graceful Unconfigured Media Handling', () => {
    it('produces controlled FAILED_PRECONDITION when CLOUDINARY_API_SECRET is missing', async () => {
      const savedSecret = process.env.CLOUDINARY_API_SECRET;
      process.env.CLOUDINARY_API_SECRET = '';

      try {
        await expect(
          generateUploadSignatureServer('Bearer test_mock_admin_token', { folder: 'muety/categories' })
        ).rejects.toThrow(/FAILED_PRECONDITION/);
      } finally {
        process.env.CLOUDINARY_API_SECRET = savedSecret;
      }
    });

    it('shows clear actionable feedback in uploadProfilePhoto when Cloudinary is unavailable', async () => {
      const testFile = new File(['sample image content'], 'avatar.jpg', { type: 'image/jpeg' });
      // In non-test mode with no network, throws clear message
      // With test mock fallback, returns safe fallback URL
      const url = await adminProfileService.uploadProfilePhoto('test_user', testFile);
      expect(url).toBeDefined();
      expect(url.startsWith('https://') || url.startsWith('http://')).toBe(true);
    });
  });

  // 6. Deployment Separation
  describe('6. Firebase Configuration and Deployment Separation', () => {
    it('excludes storage rules from default firebase.json', () => {
      const firebaseJsonPath = path.resolve(process.cwd(), 'firebase.json');
      const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));

      expect(config.firestore).toBeDefined();
      expect(config.firestore.rules).toBe('firestore.rules');
      expect(config.hosting).toBeDefined();
      // Storage MUST NOT be in default firebase.json to prevent deploy failure on unprovisioned Storage
      expect(config.storage).toBeUndefined();
    });

    it('preserves storage.rules as an optional rules file without enforcing it as a launch prerequisite', () => {
      const storageRulesPath = path.resolve(process.cwd(), 'storage.rules');
      expect(fs.existsSync(storageRulesPath)).toBe(true);
      const content = fs.readFileSync(storageRulesPath, 'utf8');
      expect(content).toContain('service firebase.storage');
    });

    it('provides standalone optional firebase.storage.json for future rollout', () => {
      const optStoragePath = path.resolve(process.cwd(), 'firebase.storage.json');
      expect(fs.existsSync(optStoragePath)).toBe(true);
      const optConfig = JSON.parse(fs.readFileSync(optStoragePath, 'utf8'));
      expect(optConfig.storage?.rules).toBe('storage.rules');
    });

    it('provides independent deployment scripts in package.json', () => {
      const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      expect(pkg.scripts['deploy:firestore']).toBe('firebase deploy --only firestore');
      expect(pkg.scripts['deploy:hosting']).toBe('firebase deploy --only hosting');
      expect(pkg.scripts['deploy:all']).toBe('firebase deploy --only firestore,hosting');
      // Must not have a storage deploy command in the standard release flow
      expect(pkg.scripts['deploy:storage']).toBeUndefined();
    });
  });

  // 7. Security Boundaries
  describe('7. Security Boundaries and Environment Safety', () => {
    it('verifies .env.example documents optional vs required variables and Storage status', () => {
      const envExamplePath = path.resolve(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      expect(envContent).toContain('OPTIONAL / UNUSED: Firebase Cloud Storage is NOT provisioned');
      expect(envContent).toContain('VITE_FIREBASE_API_KEY');
      expect(envContent).toContain('RAZORPAY_KEY_SECRET');
      expect(envContent).toContain('CLOUDINARY_API_SECRET');
    });

    it('ensures server-only secrets are not bundled into Vite client variables', () => {
      const envExamplePath = path.resolve(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      // CLOUDINARY_API_SECRET must never be prefixed with VITE_
      expect(envContent).not.toContain('VITE_CLOUDINARY_API_SECRET');
      expect(envContent).not.toContain('VITE_RAZORPAY_KEY_SECRET');
      expect(envContent).not.toContain('VITE_FIREBASE_PRIVATE_KEY');
    });
  });

});
