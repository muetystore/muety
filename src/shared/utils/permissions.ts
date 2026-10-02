export type AppRole = 
  | 'super_admin' 
  | 'admin' 
  | 'catalog_manager' 
  | 'order_manager' 
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
  | 'roles.manage';

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
    'roles.manage'
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

export function getUserRoles(user: { roles?: AppRole[]; role?: AppRole } | null): AppRole[] {
  if (!user) return ['customer'];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles;
  }
  if (user.role) {
    return [user.role];
  }
  return ['customer'];
}

export function hasRole(user: { roles?: AppRole[]; role?: AppRole } | null, requiredRole: AppRole): boolean {
  const roles = getUserRoles(user);
  return roles.includes('super_admin') || roles.includes(requiredRole);
}

export function hasAnyRole(user: { roles?: AppRole[]; role?: AppRole } | null, requiredRoles: AppRole[]): boolean {
  const roles = getUserRoles(user);
  if (roles.includes('super_admin')) return true;
  return requiredRoles.some(r => roles.includes(r));
}

export function hasPermission(user: { roles?: AppRole[]; role?: AppRole } | null, permission: Permission): boolean {
  const roles = getUserRoles(user);
  return roles.some(role => {
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes(permission);
  });
}
