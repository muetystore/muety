import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { hasRole, hasAnyRole, hasPermission } from '../../shared/utils/permissions';
import { UserProfile } from '../../shared/types';
import { verifyIdTokenAndGetClaims } from '../../../server/firebaseAdmin';
import { handleVerifyPayment } from '../../../server/paymentApi';
import { verifyServerMediaAuthorization } from '../../../server/media/cloudinaryServer';

describe('MUETY Production Security & RBAC Policies', () => {
  const superAdminUser: UserProfile = {
    uid: 'sa-001',
    email: 'superadmin@muety.in',
    displayName: 'Super Admin',
    roles: ['super_admin'],
    role: 'super_admin',
    createdAt: new Date().toISOString()
  };

  const catalogManagerUser: UserProfile = {
    uid: 'cat-001',
    email: 'catalog@muety.in',
    displayName: 'Catalog Manager',
    roles: ['catalog_manager'],
    role: 'catalog_manager',
    createdAt: new Date().toISOString()
  };

  const orderManagerUser: UserProfile = {
    uid: 'ord-001',
    email: 'orders@muety.in',
    displayName: 'Order Manager',
    roles: ['order_manager'],
    role: 'order_manager',
    createdAt: new Date().toISOString()
  };

  const supportManagerUser: UserProfile = {
    uid: 'sup-001',
    email: 'support@muety.in',
    displayName: 'Support Manager',
    roles: ['support_manager'],
    role: 'support_manager',
    createdAt: new Date().toISOString()
  };

  const customerUser: UserProfile = {
    uid: 'cust-001',
    email: 'patron@gmail.com',
    displayName: 'MUETY Patron',
    roles: ['customer'],
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  it('Enforces Super Admin full authority', () => {
    expect(hasRole(superAdminUser, 'super_admin')).toBe(true);
    expect(hasAnyRole(superAdminUser, ['superadmin', 'super_admin'])).toBe(true);
    expect(hasPermission(superAdminUser, 'roles.manage')).toBe(true);
    expect(hasPermission(superAdminUser, 'settings.manage')).toBe(true);
    expect(hasPermission(superAdminUser, 'products.write')).toBe(true);
    expect(hasPermission(superAdminUser, 'orders.fulfill')).toBe(true);
  });

  it('Restricts Catalog Manager to catalog operations only', () => {
    expect(hasPermission(catalogManagerUser, 'products.write')).toBe(true);
    expect(hasPermission(catalogManagerUser, 'categories.write')).toBe(true);
    expect(hasPermission(catalogManagerUser, 'roles.manage')).toBe(false);
    expect(hasPermission(catalogManagerUser, 'orders.fulfill')).toBe(false);
    expect(hasPermission(catalogManagerUser, 'customers.manage')).toBe(false);
  });

  it('Restricts Order Manager to fulfillment operations only', () => {
    expect(hasPermission(orderManagerUser, 'orders.fulfill')).toBe(true);
    expect(hasPermission(orderManagerUser, 'products.write')).toBe(false);
    expect(hasPermission(orderManagerUser, 'roles.manage')).toBe(false);
    expect(hasPermission(orderManagerUser, 'settings.manage')).toBe(false);
  });

  it('Restricts Support Manager to customer care & ticket operations only', () => {
    expect(hasPermission(supportManagerUser, 'inquiries.manage')).toBe(true);
    expect(hasPermission(supportManagerUser, 'products.write')).toBe(false);
    expect(hasPermission(supportManagerUser, 'roles.manage')).toBe(false);
    expect(hasPermission(supportManagerUser, 'settings.manage')).toBe(false);
  });

  it('Denies all administrative permissions to ordinary Customer accounts', () => {
    expect(hasPermission(customerUser, 'roles.manage')).toBe(false);
    expect(hasPermission(customerUser, 'products.write')).toBe(false);
    expect(hasPermission(customerUser, 'orders.fulfill')).toBe(false);
    expect(hasPermission(customerUser, 'settings.manage')).toBe(false);
    expect(hasPermission(customerUser, 'audit.read')).toBe(false);
  });

  describe('Server Claims & ID Token Security Hardening', () => {
    it('Never escalates unprivileged or empty-role tokens to superadmin', async () => {
      // Craft a mock token with no roles specified
      const mockPayload = Buffer.from(JSON.stringify({
        uid: 'user-patron-999',
        email: 'patron999@gmail.com'
        // no roles field
      })).toString('base64');
      const testToken = `Bearer header.${mockPayload}.signature`;

      const claims = await verifyIdTokenAndGetClaims(testToken);
      expect(claims).not.toBeNull();
      expect(claims?.roles).not.toContain('superadmin');
      expect(claims?.roles).not.toContain('super_admin');
      expect(claims?.roles).toEqual(['customer']);
    });
  });

  describe('Payment Verification Cryptographic Boundary', () => {
    const testSecret = 'rzp_test_secret_for_hardening_tests_xyz123';

    it('Rejects payment verification when orderId or signature is missing', async () => {
      process.env.RAZORPAY_KEY_SECRET = testSecret;

      // Missing orderId & signature
      await expect(
        handleVerifyPayment(undefined, {
          paymentId: 'pay_123456789'
        })
      ).rejects.toThrow(/INVALID_ARGUMENT: Missing required Razorpay order identifier/i);

      // Missing signature only
      await expect(
        handleVerifyPayment(undefined, {
          paymentId: 'pay_123456789',
          orderId: 'order_123456789'
        })
      ).rejects.toThrow(/INVALID_ARGUMENT: Missing required Razorpay cryptographic signature/i);
    });

    it('Rejects forged Razorpay payment signature', async () => {
      process.env.RAZORPAY_KEY_SECRET = testSecret;

      await expect(
        handleVerifyPayment(undefined, {
          paymentId: 'pay_real_123',
          orderId: 'order_real_123',
          signature: 'bad_forged_signature_00000000000000000000000000000000'
        })
      ).rejects.toThrow(/PERMISSION_DENIED: Security Alert: Invalid Razorpay signature mismatch/i);
    });

    it('Successfully validates authentic HMAC SHA-256 signature', async () => {
      process.env.RAZORPAY_KEY_SECRET = testSecret;
      const orderId = 'order_valid_789';
      const paymentId = 'pay_valid_789';

      const validSig = crypto
        .createHmac('sha256', testSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await handleVerifyPayment(undefined, {
        orderId,
        paymentId,
        signature: validSig
      });

      expect(res.success).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.paymentId).toBe(paymentId);
    });
  });

  describe('Media Management Authorization Hardening', () => {
    it('Denies non-corporate email containing "admin" in domain from media management', async () => {
      const mockPayload = Buffer.from(JSON.stringify({
        uid: 'attacker-1',
        email: 'attacker-admin@randomdomain.com',
        roles: ['customer']
      })).toString('base64');
      const testToken = `Bearer header.${mockPayload}.signature`;

      await expect(
        verifyServerMediaAuthorization(testToken, 'muety/categories')
      ).rejects.toThrow(/PERMISSION_DENIED/i);
    });
  });
});
