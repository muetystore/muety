import { describe, it, expect, vi } from 'vitest';

vi.mock('../../server/firebaseAdmin', () => ({
  verifyIdTokenAndGetClaims: vi.fn().mockResolvedValue({
    uid: 'superadmin-001',
    email: 'superadmin@muety.in',
    roles: ['superadmin']
  }),
  getAdminAuth: vi.fn().mockReturnValue(null),
  getAdminFirestore: vi.fn().mockReturnValue(null)
}));

// Mock global fetch for Resend email API in unit tests
global.fetch = vi.fn().mockImplementation(async (url: string) => {
  if (url.includes('api.resend.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-msg-123' }),
      text: async () => 'OK'
    } as any;
  }
  return { ok: true, status: 200, json: async () => ({}) } as any;
});

import { handleCreateAdminUser, handleUpdateAdminRole, handleResendInvitation, handleDisableAdminUser, handleCreateDepartment, handleUpdateDepartment } from '../../server/adminApi';
import { orgService, CANONICAL_DEPARTMENTS, CANONICAL_ROLES } from '../features/admin/services/orgService';
import { normalizeAdminUser } from '../features/customers/services/customerService';
import { getUserRoles, hasPermission, ROLE_PERMISSIONS } from '../shared/utils/permissions';

describe('MUETY Admin Organization, Department & Invitation System — Phase 1 Tests', () => {

  describe('01. Organization Structure & Canonical Models', () => {
    it('defines canonical departments with unique slugs and required fields', () => {
      expect(CANONICAL_DEPARTMENTS).toHaveLength(4);
      const slugs = CANONICAL_DEPARTMENTS.map(d => d.slug);
      expect(slugs).toEqual(['management', 'customer_support', 'orders_fulfillment', 'products_catalog']);
    });

    it('defines canonical roles mapped to departments', () => {
      expect(CANONICAL_ROLES.length).toBeGreaterThanOrEqual(8);
      
      const supportRoles = CANONICAL_ROLES.filter(r => r.departmentId === 'customer_support');
      expect(supportRoles.map(r => r.slug)).toContain('support_manager');
      expect(supportRoles.map(r => r.slug)).toContain('support_executive');

      const orderRoles = CANONICAL_ROLES.filter(r => r.departmentId === 'orders_fulfillment');
      expect(orderRoles.map(r => r.slug)).toContain('order_manager');
      expect(orderRoles.map(r => r.slug)).toContain('order_executive');

      const catalogRoles = CANONICAL_ROLES.filter(r => r.departmentId === 'products_catalog');
      expect(catalogRoles.map(r => r.slug)).toContain('catalog_manager');
      expect(catalogRoles.map(r => r.slug)).toContain('product_executive');
    });

    it('enforces canonical role slugs rather than display labels for authorization', () => {
      const superadminRole = CANONICAL_ROLES.find(r => r.slug === 'superadmin');
      expect(superadminRole).toBeDefined();
      expect(superadminRole?.name).toBe('Super Admin');
      expect(superadminRole?.slug).not.toBe('Super Admin');
    });
  });

  describe('02. Department / Role Relationship & Single Super Admin Invariant', () => {
    it('filters roles dynamically by department', async () => {
      const supportRoles = await orgService.getRolesByDepartment('customer_support');
      expect(supportRoles).toHaveLength(2);
      expect(supportRoles.every(r => r.departmentId === 'customer_support')).toBe(true);

      const catalogRoles = await orgService.getRolesByDepartment('products_catalog');
      expect(catalogRoles.every(r => r.departmentId === 'products_catalog')).toBe(true);
    });

    it('rejects creating a new Super Admin account via admin creation API', async () => {
      await expect(handleCreateAdminUser(undefined, {
        fullName: 'New Super Admin',
        personalEmail: 'super@gmail.com',
        muetyEmail: 'super.new@muety.in',
        departmentId: 'management',
        roleId: 'superadmin'
      })).rejects.toThrow(/Super Admin already exists and cannot be created/i);
    });

    it('rejects creating admin with invalid department/role combination', async () => {
      await expect(handleCreateAdminUser(undefined, {
        fullName: 'Arun Kumar',
        personalEmail: 'arun@gmail.com',
        muetyEmail: 'arun.kumar@muety.in',
        departmentId: 'customer_support',
        roleId: 'catalog_manager' // Invalid for customer_support
      })).rejects.toThrow(/does not belong to department/i);
    });
  });

  describe('03. Roster Data Audit & Department-Role Mapping Normalization', () => {
    it('normalizes Catalog Manager to Products & Catalog department', () => {
      const legacyUser = {
        uid: 'cat-1',
        displayName: 'MUETY Catalog Manager',
        email: 'catalog.manager@muety.in',
        role: 'catalog_manager' as any,
        departmentId: 'management',
        departmentName: 'Management'
      };

      const normalized = normalizeAdminUser(legacyUser as any);
      expect(normalized.departmentId).toBe('products_catalog');
      expect(normalized.departmentName).toBe('Products & Catalog');
      expect(normalized.roleName).toBe('Catalog Manager');
    });

    it('normalizes Support Manager to Customer Support department', () => {
      const user = {
        uid: 'sup-1',
        displayName: 'Support Lead',
        email: 'support.lead@muety.in',
        role: 'support_manager' as any
      };

      const normalized = normalizeAdminUser(user as any);
      expect(normalized.departmentId).toBe('customer_support');
      expect(normalized.departmentName).toBe('Customer Support');
    });

    it('normalizes Order Manager to Orders & Fulfillment department', () => {
      const user = {
        uid: 'ord-1',
        displayName: 'Fulfillment Officer',
        email: 'fulfillment@muety.in',
        role: 'order_manager' as any
      };

      const normalized = normalizeAdminUser(user as any);
      expect(normalized.departmentId).toBe('orders_fulfillment');
      expect(normalized.departmentName).toBe('Orders & Fulfillment');
    });

    it('normalizes Product Executive to Products & Catalog department', () => {
      const user = {
        uid: 'prod-1',
        displayName: 'Product Cataloger',
        email: 'cataloger@muety.in',
        role: 'product_executive' as any
      };

      const normalized = normalizeAdminUser(user as any);
      expect(normalized.departmentId).toBe('products_catalog');
      expect(normalized.departmentName).toBe('Products & Catalog');
    });
  });

  describe('04. Email Behavior & Security Invariants', () => {
    it('requires MUETY login email to use @muety.in domain', async () => {
      await expect(handleCreateAdminUser(undefined, {
        fullName: 'Arun Kumar',
        personalEmail: 'arun@gmail.com',
        muetyEmail: 'arun@gmail.com', // Invalid domain
        departmentId: 'customer_support',
        roleId: 'support_manager'
      })).rejects.toThrow(/must end with @muety.in/i);
    });

    it('ensures personal email is preserved separately from MUETY login identity', async () => {
      const res = await handleCreateAdminUser(undefined, {
        fullName: 'Arun Kumar',
        personalEmail: 'arun@gmail.com',
        muetyEmail: 'arun.kumar@muety.in',
        departmentId: 'customer_support',
        roleId: 'support_manager'
      });

      expect(res.success).toBe(true);
      expect(res.user.personalEmail).toBe('arun@gmail.com');
      expect(res.user.muetyEmail).toBe('arun.kumar@muety.in');
      expect(res.user.email).toBe('arun.kumar@muety.in');
      expect(res.user.status).toBe('invited');
    });

    it('does not expose or store plaintext passwords in returned user record', async () => {
      const res = await handleCreateAdminUser(undefined, {
        fullName: 'Deepak Sharma',
        personalEmail: 'deepak@gmail.com',
        muetyEmail: 'deepak.sharma@muety.in',
        departmentId: 'orders_fulfillment',
        roleId: 'order_manager'
      });

      expect((res.user as any).password).toBeUndefined();
    });
  });

  describe('05. Permission Matrix & Hierarchy', () => {
    it('grants all permissions to Super Admin', () => {
      const user = { role: 'superadmin' as any, roles: ['superadmin' as any] };
      expect(hasPermission(user, 'products.create')).toBe(true);
      expect(hasPermission(user, 'admin_users.create')).toBe(true);
      expect(hasPermission(user, 'audit_logs.view')).toBe(true);
    });

    it('scopes Support Manager to customer and support permissions only', () => {
      const user = { role: 'support_manager' as any, roles: ['support_manager' as any] };
      expect(hasPermission(user, 'support.view')).toBe(true);
      expect(hasPermission(user, 'customers.view')).toBe(true);
      expect(hasPermission(user, 'products.create')).toBe(false);
      expect(hasPermission(user, 'orders.cancel')).toBe(false);
    });

    it('scopes Support Executive to basic support and customer view permissions', () => {
      const user = { role: 'support_executive' as any, roles: ['support_executive' as any] };
      expect(hasPermission(user, 'support.view')).toBe(true);
      expect(hasPermission(user, 'support.respond')).toBe(true);
      expect(hasPermission(user, 'customers.edit')).toBe(false);
    });

    it('scopes Order Manager to order processing and fulfillment', () => {
      const user = { role: 'order_manager' as any, roles: ['order_manager' as any] };
      expect(hasPermission(user, 'orders.view')).toBe(true);
      expect(hasPermission(user, 'orders.fulfill')).toBe(true);
      expect(hasPermission(user, 'orders.cancel')).toBe(true);
      expect(hasPermission(user, 'products.create')).toBe(false);
    });

    it('scopes Catalog Manager to catalog and category management', () => {
      const user = { role: 'catalog_manager' as any, roles: ['catalog_manager' as any] };
      expect(hasPermission(user, 'products.view')).toBe(true);
      expect(hasPermission(user, 'products.create')).toBe(true);
      expect(hasPermission(user, 'categories.delete')).toBe(true);
      expect(hasPermission(user, 'orders.cancel')).toBe(false);
    });
  });

  describe('06. Backward Compatibility', () => {
    it('maintains compatibility for existing superadmin, admin, and catalog_manager accounts', () => {
      const superAdminUser = { role: 'superadmin' as any };
      const adminUser = { role: 'admin' as any };
      const catalogUser = { role: 'catalog_manager' as any };

      expect(getUserRoles(superAdminUser)).toEqual(['superadmin']);
      expect(getUserRoles(adminUser)).toEqual(['admin']);
      expect(getUserRoles(catalogUser)).toEqual(['catalog_manager']);
    });
  });

});
