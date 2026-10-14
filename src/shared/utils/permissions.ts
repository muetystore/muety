export type AppRole = 
  | 'superadmin'
  | 'super_admin' 
  | 'admin' 
  | 'support_manager' 
  | 'support_executive'
  | 'support_agent'
  | 'order_manager' 
  | 'order_executive'
  | 'catalog_manager' 
  | 'product_executive'
  | 'customer';

export type Permission =
  | 'dashboard.view'
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'products.publish'
  | 'products.read'
  | 'products.write'
  | 'categories.view'
  | 'categories.create'
  | 'categories.edit'
  | 'categories.delete'
  | 'categories.write'
  | 'orders.view'
  | 'orders.update'
  | 'orders.fulfill'
  | 'orders.cancel'
  | 'orders.read'
  | 'orders.write'
  | 'customers.view'
  | 'customers.edit'
  | 'customers.read'
  | 'customers.manage'
  | 'support.view'
  | 'support.respond'
  | 'support.manage'
  | 'reviews.view'
  | 'reviews.moderate'
  | 'reviews.manage'
  | 'coupons.view'
  | 'coupons.create'
  | 'coupons.edit'
  | 'coupons.manage'
  | 'inquiries.manage'
  | 'admin_users.view'
  | 'admin_users.create'
  | 'admin_users.edit'
  | 'admin_users.disable'
  | 'roles.manage'
  | 'audit_logs.view'
  | 'audit.read'
  | 'settings.view'
  | 'settings.edit'
  | 'settings.manage';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish', 'products.read', 'products.write',
  'categories.view', 'categories.create', 'categories.edit', 'categories.delete', 'categories.write',
  'orders.view', 'orders.update', 'orders.fulfill', 'orders.cancel', 'orders.read', 'orders.write',
  'customers.view', 'customers.edit', 'customers.read', 'customers.manage',
  'support.view', 'support.respond', 'support.manage', 'inquiries.manage',
  'reviews.view', 'reviews.moderate', 'reviews.manage',
  'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.manage',
  'admin_users.view', 'admin_users.create', 'admin_users.edit', 'admin_users.disable', 'roles.manage',
  'audit_logs.view', 'audit.read',
  'settings.view', 'settings.edit', 'settings.manage'
];

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  superadmin: ALL_PERMISSIONS,
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter(p => !p.startsWith('admin_users.') && p !== 'roles.manage'),
  support_manager: [
    'dashboard.view',
    'customers.view',
    'customers.edit',
    'customers.read',
    'support.view',
    'support.respond',
    'support.manage',
    'inquiries.manage',
    'reviews.view',
    'reviews.moderate',
    'reviews.manage'
  ],
  support_executive: [
    'customers.view',
    'customers.read',
    'support.view',
    'support.respond',
    'inquiries.manage'
  ],
  support_agent: [
    'customers.view',
    'customers.read',
    'support.view',
    'support.respond',
    'inquiries.manage'
  ],
  order_manager: [
    'dashboard.view',
    'orders.view',
    'orders.update',
    'orders.fulfill',
    'orders.cancel',
    'orders.read',
    'orders.write',
    'customers.view',
    'customers.read'
  ],
  order_executive: [
    'orders.view',
    'orders.update',
    'orders.fulfill',
    'orders.read'
  ],
  catalog_manager: [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'products.publish',
    'products.read',
    'products.write',
    'categories.view',
    'categories.create',
    'categories.edit',
    'categories.delete',
    'categories.write'
  ],
  product_executive: [
    'products.view',
    'products.create',
    'products.edit',
    'products.read',
    'categories.view'
  ],
  customer: [
    'products.view',
    'products.read'
  ]
};

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
  support_manager: 'Support Manager',
  support_executive: 'Support Executive',
  support_agent: 'Support Manager',
  order_manager: 'Order Manager',
  order_executive: 'Order Executive',
  catalog_manager: 'Catalog Manager',
  product_executive: 'Product Executive',
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

  // Normalize super_admin -> superadmin & support_agent -> support_manager
  return rawRoles.map(r => {
    if (r === 'super_admin') return 'superadmin';
    if (r === 'support_agent') return 'support_manager';
    return r;
  });
}

export function hasRole(user: { roles?: AppRole[]; role?: AppRole } | null, requiredRole: AppRole): boolean {
  const roles = getUserRoles(user);
  if (roles.includes('superadmin') || roles.includes('super_admin')) return true;
  const target = requiredRole === 'super_admin' ? 'superadmin' : requiredRole === 'support_agent' ? 'support_manager' : requiredRole;
  return roles.includes(target);
}

export function hasAnyRole(user: { roles?: AppRole[]; role?: AppRole } | null, requiredRoles: AppRole[]): boolean {
  const roles = getUserRoles(user);
  if (roles.includes('superadmin') || roles.includes('super_admin')) return true;
  const normalizedTargets = requiredRoles.map(r => {
    if (r === 'super_admin') return 'superadmin';
    if (r === 'support_agent') return 'support_manager';
    return r;
  });
  return normalizedTargets.some(r => roles.includes(r as AppRole));
}

export function hasPermission(user: { roles?: AppRole[]; role?: AppRole } | null, permission: Permission): boolean {
  const roles = getUserRoles(user);
  return roles.some(role => {
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes(permission);
  });
}

