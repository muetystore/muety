import { describe, it, expect, vi, beforeEach } from 'vitest';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = localStorageMock;
}
if (typeof window === 'undefined') {
  (global as any).window = {};
}
(global as any).window.location = { hostname: 'www.admin.muety.in', pathname: '/admin' };
(global as any).window.localStorage = localStorageMock;
if (typeof (global as any).window.dispatchEvent !== 'function') {
  (global as any).window.dispatchEvent = () => true;
}

vi.mock('../../server/firebaseAdmin', () => ({
  verifyIdTokenAndGetClaims: vi.fn().mockImplementation(async (authHeader?: string) => {
    if (!authHeader || !authHeader.includes('Bearer')) {
      return null;
    }
    if (authHeader.includes('other-user-token')) {
      return {
        uid: 'admin-user-002',
        email: 'other.admin@muety.in',
        roles: ['admin']
      };
    }
    return {
      uid: 'admin-user-001',
      email: 'mohan.admin@muety.in',
      roles: ['admin']
    };
  }),
  getAdminAuth: vi.fn().mockReturnValue({
    updateUser: vi.fn().mockResolvedValue({})
  }),
  getAdminFirestore: vi.fn().mockReturnValue(null)
}));

global.fetch = vi.fn().mockImplementation(async (url: string) => {
  if (url.includes('api.resend.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-msg-999' }),
      text: async () => 'OK'
    } as any;
  }
  return { ok: true, status: 200, json: async () => ({ success: true }) } as any;
});

import { handleUpdateAdminProfile, handleCreateAdminUser, getAdminAppUrl } from '../../server/adminApi';
import { adminProfileService } from '../features/admin/services/adminProfileService';
import { authService } from '../features/auth/services/authService';
import { auditService } from '../shared/services/auditService';
import { env } from '../lib/config/env';
import { UserProfile } from '../shared/types';

describe('MUETY Admin Production Domain Routing & Self-Service Profile Suite (Requirement 25)', () => {

  const sampleAdmin: UserProfile = {
    uid: 'admin-user-001',
    email: 'mohan.admin@muety.in',
    muetyEmail: 'mohan.admin@muety.in',
    personalEmail: 'mohan.personal@gmail.com',
    displayName: 'Mohan Kumar',
    fullName: 'Mohan Kumar',
    roleId: 'admin',
    roleSlug: 'admin',
    roleName: 'Admin',
    role: 'admin',
    roles: ['admin'],
    departmentId: 'management',
    departmentName: 'Management',
    status: 'active',
    invitationStatus: 'accepted',
    phone: '+91 9876543210',
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    localStorage.clear();
    (authService as any).setCurrentUser(sampleAdmin);
  });

  describe('PART 1: Admin Production Domain & Setup URL Requirements', () => {
    it('10. Invitation setup URL uses ADMIN_APP_URL origin', async () => {
      process.env.ADMIN_APP_URL = 'https://admin.muety.in';
      const result = await handleCreateAdminUser('Bearer valid-superadmin-token', {
        fullName: 'Support Executive',
        personalEmail: 'personal.exec@gmail.com',
        muetyEmail: 'exec.support@muety.in',
        departmentId: 'customer_support',
        roleId: 'support_executive'
      });

      expect(result.success).toBe(true);
      expect(result.invitationLink).toContain('https://admin.muety.in/admin/setup-password');
      expect(result.invitationLink).not.toContain('localhost:5173');
    });

    it('11. Production configuration resolves to https://admin.muety.in', () => {
      delete process.env.ADMIN_APP_URL;
      delete process.env.VITE_ADMIN_APP_URL;
      expect(env.adminAppUrl).toBe('https://admin.muety.in');
      expect(getAdminAppUrl()).toBe('https://admin.muety.in');
    });

    it('12. Local configuration fallback functions correctly for development environments', () => {
      process.env.ADMIN_APP_URL = 'http://localhost:5173';
      expect(getAdminAppUrl()).toBe('http://localhost:5173');
      // Reset back for production tests
      process.env.ADMIN_APP_URL = 'https://admin.muety.in';
    });
  });

  describe('PART 2: Admin Self-Service Profile Management Requirements', () => {
    it('1. Admin can update own phone contact number with Indian format validation', async () => {
      const validPhoneResult = adminProfileService.validatePhoneNumber('+91 9876543210');
      expect(validPhoneResult.valid).toBe(true);
      expect(validPhoneResult.normalized).toBe('+91 98765 43210');

      const plain10DigitResult = adminProfileService.validatePhoneNumber('9876543210');
      expect(plain10DigitResult.valid).toBe(true);
      expect(plain10DigitResult.normalized).toBe('+91 98765 43210');

      const updated = await adminProfileService.updateAdminProfile('admin-user-001', {
        displayName: 'Mohan Kumar',
        phone: '9876543210'
      });

      expect(updated.phone).toBe('+91 98765 43210');
    });

    it('2. Admin can update own display name and full name', async () => {
      const updated = await adminProfileService.updateAdminProfile('admin-user-001', {
        fullName: 'Mohan Kumar Super',
        displayName: 'Mohan K'
      });

      expect(updated.displayName).toBe('Mohan K');
      expect(updated.fullName).toBe('Mohan Kumar Super');
    });

    it('3. Admin cannot change own role from profile update API', async () => {
      const serverRes = await handleUpdateAdminProfile('Bearer admin-user-001-token', {
        displayName: 'Mohan Admin',
        role: 'superadmin',
        roleId: 'superadmin',
        roleSlug: 'superadmin',
        roleName: 'Super Admin'
      });

      expect(serverRes.success).toBe(true);
      expect(serverRes.user.role).toBeUndefined();
      expect(serverRes.user.roleId).toBeUndefined();
      expect(serverRes.user.roleSlug).toBeUndefined();
    });

    it('4. Admin cannot change own department from profile update API', async () => {
      const serverRes = await handleUpdateAdminProfile('Bearer admin-user-001-token', {
        displayName: 'Mohan Admin',
        departmentId: 'customer_support',
        departmentName: 'Customer Support'
      });

      expect(serverRes.success).toBe(true);
      expect(serverRes.user.departmentId).toBeUndefined();
      expect(serverRes.user.departmentName).toBeUndefined();
    });

    it('5. Admin cannot change own account status or invitation status from profile update API', async () => {
      const serverRes = await handleUpdateAdminProfile('Bearer admin-user-001-token', {
        displayName: 'Mohan Admin',
        status: 'disabled',
        isBlocked: true,
        invitationStatus: 'pending'
      });

      expect(serverRes.success).toBe(true);
      expect(serverRes.user.status).toBeUndefined();
      expect(serverRes.user.isBlocked).toBeUndefined();
      expect(serverRes.user.invitationStatus).toBeUndefined();
    });

    it('6. Admin cannot update another user profile', async () => {
      await expect(adminProfileService.updateAdminProfile('other-admin-uid-99', {
        displayName: 'Hacked Name'
      })).rejects.toThrow(/Permission Denied: You may only edit your own admin profile/i);
    });

    it('7. Profile update creates ADMIN_PROFILE_UPDATED audit log record', async () => {
      const spy = vi.spyOn(auditService, 'logAction');

      await adminProfileService.updateAdminProfile('admin-user-001', {
        displayName: 'Mohan Updated',
        jobTitle: 'Senior Admin Lead'
      });

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        action: 'ADMIN_PROFILE_UPDATED',
        entityType: 'ADMIN',
        entityId: 'admin-user-001'
      }));
    });

    it('8. Profile data survives browser refresh (localStorage session persistence)', async () => {
      await adminProfileService.updateAdminProfile('admin-user-001', {
        displayName: 'Persisted Admin Name',
        jobTitle: 'Lead Executive'
      });

      const currentBeforeRefresh = authService.getCurrentUser();
      expect(currentBeforeRefresh?.displayName).toBe('Persisted Admin Name');
      expect(currentBeforeRefresh?.jobTitle).toBe('Lead Executive');

      // Simulate browser refresh by re-reading session
      const savedRaw = localStorage.getItem('muety_current_session_user');
      expect(savedRaw).not.toBeNull();
      const restored = JSON.parse(savedRaw!);
      expect(restored.displayName).toBe('Persisted Admin Name');
      expect(restored.jobTitle).toBe('Lead Executive');
    });

    it('9. Header reflects updated name/photo immediately upon profile update', async () => {
      const updated = await adminProfileService.updateAdminProfile('admin-user-001', {
        displayName: 'Mohan New Executive',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
      });

      const activeUser = authService.getCurrentUser();
      expect(activeUser?.displayName).toBe('Mohan New Executive');
      expect(activeUser?.profilePhotoUrl).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');
    });
  });

});
