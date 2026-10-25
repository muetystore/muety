import { Department, RoleDefinition, UserProfile } from '@/shared/types';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';

export const CANONICAL_DEPARTMENTS: Department[] = [
  {
    id: 'management',
    name: 'Management',
    slug: 'management',
    description: 'Executive management, system administration, and strategic operations.',
    status: 'active',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'customer_support',
    name: 'Customer Support',
    slug: 'customer_support',
    description: 'Customer inquiries, patron relationship management, and review moderation.',
    status: 'active',
    sortOrder: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'orders_fulfillment',
    name: 'Orders & Fulfillment',
    slug: 'orders_fulfillment',
    description: 'Order processing, dispatching, shipment tracking, and logistics.',
    status: 'active',
    sortOrder: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'products_catalog',
    name: 'Products & Catalog',
    slug: 'products_catalog',
    description: 'Merchandise management, silk saree catalog, pricing, and collection curation.',
    status: 'active',
    sortOrder: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  }
];

export const CANONICAL_ROLES: RoleDefinition[] = [
  {
    id: 'superadmin',
    name: 'Super Admin',
    slug: 'superadmin',
    departmentId: 'management',
    departmentName: 'Management',
    description: 'Full system root authority across all departments and security configurations.',
    status: 'active',
    permissions: {
      'dashboard.view': true,
      'products.view': true, 'products.create': true, 'products.edit': true, 'products.delete': true, 'products.publish': true,
      'categories.view': true, 'categories.create': true, 'categories.edit': true, 'categories.delete': true,
      'orders.view': true, 'orders.update': true, 'orders.fulfill': true, 'orders.cancel': true,
      'customers.view': true, 'customers.edit': true,
      'support.view': true, 'support.respond': true, 'support.manage': true,
      'reviews.view': true, 'reviews.moderate': true,
      'coupons.view': true, 'coupons.create': true, 'coupons.edit': true,
      'admin_users.view': true, 'admin_users.create': true, 'admin_users.edit': true, 'admin_users.disable': true,
      'audit_logs.view': true,
      'settings.view': true, 'settings.edit': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'admin',
    name: 'Admin',
    slug: 'admin',
    departmentId: 'management',
    departmentName: 'Management',
    description: 'Business administration and operational management authority.',
    status: 'active',
    permissions: {
      'dashboard.view': true,
      'products.view': true, 'products.create': true, 'products.edit': true, 'products.delete': true, 'products.publish': true,
      'categories.view': true, 'categories.create': true, 'categories.edit': true, 'categories.delete': true,
      'orders.view': true, 'orders.update': true, 'orders.fulfill': true, 'orders.cancel': true,
      'customers.view': true, 'customers.edit': true,
      'support.view': true, 'support.respond': true, 'support.manage': true,
      'reviews.view': true, 'reviews.moderate': true,
      'coupons.view': true, 'coupons.create': true, 'coupons.edit': true,
      'audit_logs.view': true,
      'settings.view': true, 'settings.edit': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'support_manager',
    name: 'Support Manager',
    slug: 'support_manager',
    departmentId: 'customer_support',
    departmentName: 'Customer Support',
    description: 'Management authority for customer support, inquiries, and reviews.',
    status: 'active',
    permissions: {
      'dashboard.view': true,
      'customers.view': true,
      'customers.edit': true,
      'support.view': true,
      'support.respond': true,
      'support.manage': true,
      'reviews.view': true,
      'reviews.moderate': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'support_executive',
    name: 'Support Executive',
    slug: 'support_executive',
    departmentId: 'customer_support',
    departmentName: 'Customer Support',
    description: 'Operational execution of customer support responses and ticket views.',
    status: 'active',
    permissions: {
      'customers.view': true,
      'support.view': true,
      'support.respond': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'order_manager',
    name: 'Order Manager',
    slug: 'order_manager',
    departmentId: 'orders_fulfillment',
    departmentName: 'Orders & Fulfillment',
    description: 'Management authority for store orders, status updates, fulfillment, and cancellations.',
    status: 'active',
    permissions: {
      'dashboard.view': true,
      'orders.view': true,
      'orders.update': true,
      'orders.fulfill': true,
      'orders.cancel': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'order_executive',
    name: 'Order Executive',
    slug: 'order_executive',
    departmentId: 'orders_fulfillment',
    departmentName: 'Orders & Fulfillment',
    description: 'Operational execution of order updates and dispatch processing.',
    status: 'active',
    permissions: {
      'orders.view': true,
      'orders.update': true,
      'orders.fulfill': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'catalog_manager',
    name: 'Catalog Manager',
    slug: 'catalog_manager',
    departmentId: 'products_catalog',
    departmentName: 'Products & Catalog',
    description: 'Management authority for product catalog, categories, pricing, and publication.',
    status: 'active',
    permissions: {
      'products.view': true,
      'products.create': true,
      'products.edit': true,
      'products.delete': true,
      'products.publish': true,
      'categories.view': true,
      'categories.create': true,
      'categories.edit': true,
      'categories.delete': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'product_executive',
    name: 'Product Executive',
    slug: 'product_executive',
    departmentId: 'products_catalog',
    departmentName: 'Products & Catalog',
    description: 'Operational creation and editing of catalog product items and category views.',
    status: 'active',
    permissions: {
      'products.view': true,
      'products.create': true,
      'products.edit': true,
      'categories.view': true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  }
];

export const orgService = {
  /**
   * Seed Firestore departments and roles collections if empty
   */
  async seedInitialOrgData(): Promise<void> {
    if (!db) return;
    try {
      const deptsSnap = await getDocs(collection(db, 'departments'));
      if (deptsSnap.empty) {
        for (const dept of CANONICAL_DEPARTMENTS) {
          await setDoc(doc(db, 'departments', dept.id), dept);
        }
      }

      const rolesSnap = await getDocs(collection(db, 'roles'));
      if (rolesSnap.empty) {
        for (const role of CANONICAL_ROLES) {
          await setDoc(doc(db, 'roles', role.id), role);
        }
      }
    } catch (err) {
      console.warn('[orgService] Seeding note:', err);
    }
  },

  async getDepartments(): Promise<Department[]> {
    if (db) {
      try {
        const fetchPromise = getDocs(collection(db, 'departments'));
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 500)
        );
        const snap = await Promise.race([fetchPromise, timeoutPromise]) as any;
        if (snap && !snap.empty) {
          const list = snap.docs.map((d: any) => d.data() as Department);
          return list.sort((a: Department, b: Department) => (a.sortOrder || 0) - (b.sortOrder || 0));
        }
      } catch (err) {
        // Fallback to canonical departments
      }
    }
    return CANONICAL_DEPARTMENTS;
  },

  async getRoles(): Promise<RoleDefinition[]> {
    if (db) {
      try {
        const fetchPromise = getDocs(collection(db, 'roles'));
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 500)
        );
        const snap = await Promise.race([fetchPromise, timeoutPromise]) as any;
        if (snap && !snap.empty) {
          return snap.docs.map((d: any) => d.data() as RoleDefinition);
        }
      } catch (err) {
        // Fallback to canonical roles
      }
    }
    return CANONICAL_ROLES;
  },

  async getRolesByDepartment(departmentId: string): Promise<RoleDefinition[]> {
    const allRoles = await this.getRoles();
    return allRoles.filter(r => r.departmentId === departmentId && r.status === 'active');
  },

  async getDepartmentById(departmentId: string): Promise<Department | undefined> {
    const depts = await this.getDepartments();
    return depts.find(d => d.id === departmentId || d.slug === departmentId);
  },

  async getRoleById(roleId: string): Promise<RoleDefinition | undefined> {
    const roles = await this.getRoles();
    return roles.find(r => r.id === roleId || r.slug === roleId);
  },

  async getActiveAdminsForDepartment(departmentId: string): Promise<UserProfile[]> {
    if (!db) return [];
    try {
      const [userSnap, adminSnap] = await Promise.all([
        getDocs(collection(db, 'users')).catch(() => null),
        getDocs(collection(db, 'admins')).catch(() => null)
      ]);
      const map = new Map<string, UserProfile>();
      if (adminSnap && !adminSnap.empty) {
        adminSnap.docs.forEach(d => {
          const u = d.data() as UserProfile;
          if (u.uid || d.id) map.set(u.uid || d.id, { ...u, uid: u.uid || d.id });
        });
      }
      if (userSnap && !userSnap.empty) {
        userSnap.docs.forEach(d => {
          const u = d.data() as UserProfile;
          const uid = u.uid || d.id;
          if (!map.has(uid)) map.set(uid, { ...u, uid });
        });
      }
      return Array.from(map.values())
        .filter(u => u.departmentId === departmentId && !u.isBlocked && u.status !== 'disabled');
    } catch {}
    return [];
  }
};
