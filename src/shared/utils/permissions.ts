export type AppRole = 
  | 'super_admin' 
  | 'admin' 
  | 'catalog_manager' 
  | 'order_manager' 
  | 'support_manager' 
  | 'support_agent'
  | 'customer';

export type Permission =
  | 'products.read'
  | 'products.write'
  | 'products.delete'
  | 'categories.write'
  | 'orders.read'
  | 'orders.write'
  | 'orders.fulfill'
  | 'customers.read'
  | 'customers.manage'
  | 'coupons.manage'
  | 'inquiries.manage'
  | 'reviews.manage'
  | 'settings.manage'
  | 'roles.manage'
  | 'audit.read';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [
    'products.read',
    'products.write',
    'products.delete',
    'categories.write',
    'orders.read',
    'orders.write',
    'orders.fulfill',
    'customers.read',
    'customers.manage',
    'coupons.manage',
    'inquiries.manage',
    'reviews.manage',
    'settings.manage',
    'roles.manage',
    'audit.read'
  ],
  admin: [
    'products.read',
    'products.write',
    'products.delete',
    'categories.write',
    'orders.read',
    'orders.write',
    'orders.fulfill',
    'customers.read',
    'customers.manage',
    'coupons.manage',
    'inquiries.manage',
    'reviews.manage',
    'settings.manage'
  ],
  catalog_manager: [
    'products.read',
    'products.write',
    'products.delete',
    'categories.write'
  ],
  order_manager: [
    'orders.read',
    'orders.write',
    'orders.fulfill',
    'customers.read'
  ],
  support_manager: [
    'inquiries.manage',
    'reviews.manage',
    'orders.read',
    'customers.read'
  ],
  support_agent: [
    'inquiries.manage',
    'reviews.manage',
    'orders.read',
    'customers.read'
  ],
  customer: [
    'products.read'
  ]
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  catalog_manager: 'Catalog Manager',
  order_manager: 'Order Manager',
  support_manager: 'Support Manager',
  support_agent: 'Support Manager',
  customer: 'Customer'
};

export function getUserRoles(user: { roles?: AppRole[]; role?: AppRole } | null): AppRole[] {
  if (!user) return ['customer'];
  let rawRoles: AppRole[] = [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    rawRoles = user.roles;
  } else if (user.role) {
    rawRoles = [user.role];
  } else {
    rawRoles = ['customer'];
  }

  // Normalize support_agent to support_manager
  return rawRoles.map(r => r === 'support_agent' ? 'support_manager' : r);
}

export function hasRole(user: { roles?: AppRole[]; role?: AppRole } | null, requiredRole: AppRole): boolean {
  const roles = getUserRoles(user);
  if (roles.includes('super_admin')) return true;
  const target = requiredRole === 'support_agent' ? 'support_manager' : requiredRole;
  return roles.includes(target);
}

export function hasAnyRole(user: { roles?: AppRole[]; role?: AppRole } | null, requiredRoles: AppRole[]): boolean {
  const roles = getUserRoles(user);
  if (roles.includes('super_admin')) return true;
  const normalizedTargets = requiredRoles.map(r => r === 'support_agent' ? 'support_manager' : r);
  return normalizedTargets.some(r => roles.includes(r));
}

export function hasPermission(user: { roles?: AppRole[]; role?: AppRole } | null, permission: Permission): boolean {
  const roles = getUserRoles(user);
  return roles.some(role => {
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes(permission);
  });
}

