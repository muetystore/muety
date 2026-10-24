import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));

// Polyfill localStorage & window for node test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = val; },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

type EventHandler = (...args: any[]) => any;
const windowListeners: Record<string, EventHandler[]> = {};
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: (event: string, cb: EventHandler) => {
      windowListeners[event] = windowListeners[event] || [];
      windowListeners[event].push(cb);
    },
    removeEventListener: (event: string, cb: EventHandler) => {
      if (windowListeners[event]) {
        windowListeners[event] = windowListeners[event].filter(fn => fn !== cb);
      }
    },
    dispatchEvent: (event: any) => {
      const type = event.type || event;
      if (windowListeners[type]) {
        windowListeners[type].forEach(fn => fn(event));
      }
      return true;
    }
  };
}
if (typeof globalThis.CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params: any = {}) {
      this.type = type;
      this.detail = params.detail;
    }
  };
}

import { customerService, isStaffOrAdminUser } from '@/features/customers/services/customerService';
import { storageService } from '@/lib/storage/storageService';
import { UserProfile } from '@/shared/types';
import { Order } from '@/features/orders/types';

describe('MUETY CRM Patron Directory & Join Circle Filter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ensures online customer accounts (including kalvimohan03 and patron@muety.in) are recognized as patrons and not staff', () => {
    const mohanCustomer: UserProfile = {
      uid: '2LV607oVA2XlW8MNzBv89iVYAxh1',
      displayName: 'mohan',
      email: '',
      phoneNumber: '+919385791540',
      phone: '+919385791540',
      role: 'customer',
      customerStatus: 'active',
      isBlocked: false,
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z'
    };

    const legacyEmailPatron: UserProfile = {
      uid: 'patron-legacy-1',
      displayName: 'Kalvi Mohan',
      email: 'kalvimohan03@gmail.com',
      phoneNumber: '+919385791540',
      role: 'customer',
      customerStatus: 'active',
      isBlocked: false,
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z'
    };

    const testPatronEmail: UserProfile = {
      uid: 'patron-test-1',
      displayName: 'Test Patron',
      email: 'patron@gmail.com',
      role: 'customer',
      customerStatus: 'active',
      isBlocked: false,
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z'
    };

    const actualAdminStaff: UserProfile = {
      uid: 'admin-staff-1',
      displayName: 'Catalog Manager',
      email: 'catalog@muety.in',
      role: 'catalog_manager',
      roleSlug: 'catalog_manager',
      customerStatus: 'active',
      isBlocked: false,
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z'
    };

    expect(isStaffOrAdminUser(mohanCustomer)).toBe(false);
    expect(isStaffOrAdminUser(legacyEmailPatron)).toBe(false);
    expect(isStaffOrAdminUser(testPatronEmail)).toBe(false);
    expect(isStaffOrAdminUser(actualAdminStaff)).toBe(true);
  });

  it('correctly filters patrons who have joined or been enrolled in the MUETY Patron Circle', async () => {
    const regularPatron: UserProfile = {
      uid: 'cust-regular-1',
      displayName: 'Naveen Kumar',
      email: 'naveen@example.com',
      phoneNumber: '+919876543210',
      role: 'customer',
      patronCircleMember: false,
      customerStatus: 'active',
      isBlocked: false,
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z'
    };

    const circlePatron: UserProfile = {
      uid: 'cust-circle-1',
      displayName: 'Mohan Patron',
      email: '',
      phoneNumber: '+919385791540',
      role: 'customer',
      patronCircleMember: true,
      patronCircleJoinedAt: '2026-10-24T10:00:00Z',
      customerStatus: 'active',
      isBlocked: false,
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-24T10:00:00Z'
    };

    storageService.saveUsers([regularPatron, circlePatron]);

    const allCustomers = customerService.getOnlyCustomers();
    const testCustomers = allCustomers.filter(u => ['cust-regular-1', 'cust-circle-1'].includes(u.uid));
    expect(testCustomers.length).toBe(2);

    // Apply the CRM filter for 'patron_circle'
    const patronCircleFiltered = testCustomers.filter(u => Boolean(u.patronCircleMember || (u as any).joinCircle));
    expect(patronCircleFiltered.length).toBe(1);
    expect(patronCircleFiltered[0].uid).toBe('cust-circle-1');
    expect(patronCircleFiltered[0].displayName).toBe('Mohan Patron');

    // Admin can toggle regularPatron to join circle
    const updated = await customerService.togglePatronCircleMembership('cust-regular-1', true);
    expect(updated.patronCircleMember).toBe(true);
    expect(updated.patronCircleJoinedAt).toBeDefined();

    const updatedFiltered = customerService.getOnlyCustomers()
      .filter(u => ['cust-regular-1', 'cust-circle-1'].includes(u.uid))
      .filter(u => Boolean(u.patronCircleMember));
    expect(updatedFiltered.length).toBe(2);
  });

  it('synthesizes customer profiles from verified orders if standalone user document is not yet registered', () => {
    const sampleOrder: Order = {
      id: 'ord-synth-1',
      orderNumber: 'MTY-2026-999',
      customerId: 'cust-synth-1',
      customerName: 'Saranya Sundar',
      customerEmail: 'saranya@example.com',
      customerPhone: '+919443322110',
      items: [],
      subtotal: 12500,
      discount: 0,
      tax: 0,
      shippingFee: 0,
      total: 12500,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      timeline: [],
      createdAt: '2026-10-22T14:00:00Z',
      updatedAt: '2026-10-22T14:00:00Z',
      shippingAddress: {
        id: 'addr-ord-1',
        fullName: 'Saranya Sundar',
        phone: '+919443322110',
        streetAddress: '15 Gandhi Road',
        city: 'Salem',
        state: 'Tamil Nadu',
        postalCode: '636001',
        country: 'India',
        isDefault: true
      }
    };

    storageService.saveOrders([sampleOrder]);

    const customers = customerService.getOnlyCustomers();
    const synthCustomer = customers.find(c => c.email === 'saranya@example.com');
    expect(synthCustomer).toBeDefined();
    expect(synthCustomer?.displayName).toBe('Saranya Sundar');
    expect(synthCustomer?.phoneNumber).toBe('+919443322110');
    expect(synthCustomer?.addresses?.length).toBe(1);
    expect(synthCustomer?.addresses?.[0].city).toBe('Salem');

    const metrics = customerService.calculateCustomerMetrics(synthCustomer!);
    expect(metrics.totalSpend).toBe(12500);
    expect(metrics.paidOrdersCount).toBe(1);
  });

  it('dispatches custom window events on storageService.saveUsers for cross-component reactivity', () => {
    let usersUpdatedFired = false;
    let customersUpdatedFired = false;

    const onUsersUpdated = () => { usersUpdatedFired = true; };
    const onCustomersUpdated = () => { customersUpdatedFired = true; };

    window.addEventListener('muety_users_updated', onUsersUpdated);
    window.addEventListener('muety_customers_updated', onCustomersUpdated);

    storageService.saveUsers([]);

    expect(usersUpdatedFired).toBe(true);
    expect(customersUpdatedFired).toBe(true);

    window.removeEventListener('muety_users_updated', onUsersUpdated);
    window.removeEventListener('muety_customers_updated', onCustomersUpdated);
  });
});
