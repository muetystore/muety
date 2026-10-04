import { describe, it, expect } from 'vitest';
import { hasRole, hasAnyRole, hasPermission } from '../../shared/utils/permissions';
import { UserProfile } from '../../shared/types';

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
});
