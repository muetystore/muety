import { describe, it, expect } from 'vitest';
import { productService } from '@/features/catalog/services/productService';
import { couponService } from '@/features/coupons/services/couponService';
import { inquiryService } from '@/features/inquiries/services/inquiryService';
import { compressImageFile } from '@/shared/utils/imageCompressor';
import { UserProfile } from '@/shared/types';
import { 
  hasPermission, 
  hasRole, 
  hasAnyRole, 
  getUserRoles 
} from '@/shared/utils/permissions';

describe('MUETY Security & Authorization Matrix Integration Tests', () => {

  describe('01. Environment & Infrastructure Baseline', () => {
    it('verifies test execution environment', () => {
      expect(true).toBe(true);
      expect(typeof process).toBe('object');
    });

    it('exports imageCompressor helper function', () => {
      expect(typeof compressImageFile).toBe('function');
    });
  });

  describe('02. Multi-Role Authorization & Permission Matrix', () => {
    const superAdminUser: Partial<UserProfile> = { uid: 'u1', roles: ['super_admin'] };
    const adminUser: Partial<UserProfile> = { uid: 'u2', roles: ['admin'] };
    const catalogManagerUser: Partial<UserProfile> = { uid: 'u3', roles: ['catalog_manager'] };
    const orderManagerUser: Partial<UserProfile> = { uid: 'u4', roles: ['order_manager'] };
    const supportAgentUser: Partial<UserProfile> = { uid: 'u5', roles: ['support_agent'] };
    const customerUser: Partial<UserProfile> = { uid: 'u6', roles: ['customer'] };
    const multiRoleUser: Partial<UserProfile> = { uid: 'u7', roles: ['catalog_manager', 'order_manager'] };
    const anonymousUser = null;

    it('SUPER_ADMIN: grants role management and full administrative permissions', () => {
      expect(hasPermission(superAdminUser as UserProfile, 'roles.manage')).toBe(true);
      expect(hasPermission(superAdminUser as UserProfile, 'products.delete')).toBe(true);
      expect(hasPermission(superAdminUser as UserProfile, 'settings.manage')).toBe(true);
      expect(hasRole(superAdminUser as UserProfile, 'super_admin')).toBe(true);
    });

    it('ADMIN: grants product, order, customer, and coupon permissions, but NOT role management', () => {
      expect(hasPermission(adminUser as UserProfile, 'products.write')).toBe(true);
      expect(hasPermission(adminUser as UserProfile, 'orders.fulfill')).toBe(true);
      expect(hasPermission(adminUser as UserProfile, 'roles.manage')).toBe(false);
    });

    it('CATALOG_MANAGER: grants product & category write, denies order fulfillment and user management', () => {
      expect(hasPermission(catalogManagerUser as UserProfile, 'products.write')).toBe(true);
      expect(hasPermission(catalogManagerUser as UserProfile, 'categories.write')).toBe(true);
      expect(hasPermission(catalogManagerUser as UserProfile, 'orders.fulfill')).toBe(false);
      expect(hasPermission(catalogManagerUser as UserProfile, 'customers.manage')).toBe(false);
    });

    it('ORDER_MANAGER: grants order fulfill & customer lookup, denies product editing', () => {
      expect(hasPermission(orderManagerUser as UserProfile, 'orders.fulfill')).toBe(true);
      expect(hasPermission(orderManagerUser as UserProfile, 'customers.read')).toBe(true);
      expect(hasPermission(orderManagerUser as UserProfile, 'products.write')).toBe(false);
      expect(hasPermission(orderManagerUser as UserProfile, 'products.delete')).toBe(false);
    });

    it('SUPPORT_AGENT: grants inquiry & review management, denies catalog & setting edits', () => {
      expect(hasPermission(supportAgentUser as UserProfile, 'inquiries.manage')).toBe(true);
      expect(hasPermission(supportAgentUser as UserProfile, 'reviews.manage')).toBe(true);
      expect(hasPermission(supportAgentUser as UserProfile, 'products.write')).toBe(false);
      expect(hasPermission(supportAgentUser as UserProfile, 'settings.manage')).toBe(false);
    });

    it('CUSTOMER: grants public catalog read, denies all administrative writes', () => {
      expect(hasPermission(customerUser as UserProfile, 'products.read')).toBe(true);
      expect(hasPermission(customerUser as UserProfile, 'products.write')).toBe(false);
      expect(hasPermission(customerUser as UserProfile, 'orders.fulfill')).toBe(false);
      expect(hasPermission(customerUser as UserProfile, 'inquiries.manage')).toBe(false);
    });

    it('MULTI-ROLE: combines permissions across multiple assigned roles', () => {
      const roles = getUserRoles(multiRoleUser as UserProfile);
      expect(roles).toEqual(['catalog_manager', 'order_manager']);
      expect(hasPermission(multiRoleUser as UserProfile, 'products.write')).toBe(true);
      expect(hasPermission(multiRoleUser as UserProfile, 'orders.fulfill')).toBe(true);
      expect(hasPermission(multiRoleUser as UserProfile, 'roles.manage')).toBe(false);
    });

    it('ANONYMOUS: defaults to customer read-only permissions', () => {
      expect(hasPermission(anonymousUser, 'products.read')).toBe(true);
      expect(hasPermission(anonymousUser, 'products.write')).toBe(false);
      expect(hasAnyRole(anonymousUser, ['admin', 'super_admin'])).toBe(false);
    });
  });

  describe('03. Catalog & Storage Domain Services', () => {
    it('retrieves initial product catalog correctly', () => {
      const products = productService.getAllProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty('id');
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('price');
    });

    it('fetches single product by ID or returns undefined if non-existent', () => {
      const products = productService.getAllProducts();
      const sampleId = products[0]?.id;
      if (sampleId) {
        const product = productService.getProductById(sampleId);
        expect(product).toBeDefined();
        expect(product?.id).toBe(sampleId);
      }

      const nonExistent = productService.getProductById('invalid-product-99999');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('04. Coupons & Inquiries Domain Services', () => {
    it('validates invalid promo codes gracefully', () => {
      const result = couponService.validateCoupon('INVALID_CODE_XYZ', 5000);
      expect(result.valid).toBe(false);
      expect(result.discountAmount).toBe(0);
      expect(result.message).toContain('Invalid promo code');
    });

    it('stores and retrieves customer inquiries', async () => {
      const sampleInquiry = {
        name: 'Test Patron',
        email: 'patron@example.com',
        phone: '9876543210',
        subject: 'Bridal Saree Customization',
        category: 'custom_order' as const,
        message: 'Requesting consultation for bespoke Kanchipuram silk saree.'
      };

      const created = await inquiryService.submitInquiry(sampleInquiry);
      expect(created).toBeDefined();
      expect(created.id).toBeTruthy();
      expect(created.inquiryNumber).toContain('INQ-');

      const all = inquiryService.getInquiries();
      expect(all.some(i => i.id === created.id)).toBe(true);
    });
  });

});
