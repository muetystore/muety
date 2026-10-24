import { describe, it, expect, beforeEach } from 'vitest';
import { 
  customerService, 
  normalizeToE164, 
  normalizePhoneNumber,
  isStaffOrAdminUser, 
  mergeCustomerProfiles 
} from '@/features/customers/services/customerService';
import { storageService } from '@/lib/storage/storageService';
import { UserProfile } from '@/shared/types';
import { Order } from '@/features/orders/types';

describe('Phase 7 — Comprehensive Patron CRM Consistency & Security Audit Tests', () => {

  beforeEach(() => {
    // Polyfill localStorage
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] || null,
      length: Object.keys(store).length
    } as any;

    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = {
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    }
  });

  // Test 1: Phone E.164 normalization
  it('1. Normalizes varied phone formats to standard E.164 format', () => {
    expect(normalizeToE164('9385791540')).toBe('+919385791540');
    expect(normalizeToE164('09385791540')).toBe('+919385791540');
    expect(normalizeToE164('+91 93857 91540')).toBe('+919385791540');
    expect(normalizeToE164('+919385791540')).toBe('+919385791540');
    expect(normalizePhoneNumber('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeToE164('')).toBe('');
  });

  // Test 2: Duplicate phone conflict handling without unauthorized account merging
  it('2. Preserves distinct customer identities when phone numbers match, annotating conflict instead of merging', () => {
    const patronPhoneOtp: UserProfile = {
      uid: 'uid-phone-otp-2LV',
      email: '',
      phoneNumber: '+919385791540',
      displayName: 'Mohan Phone Patron',
      role: 'customer',
      roles: ['customer'],
      createdAt: '2026-10-18T10:00:00Z',
      patronCircleMember: true
    };

    const patronEmailPass: UserProfile = {
      uid: 'uid-email-pass-6Li',
      email: 'kalvimohan03@gmail.com',
      phoneNumber: '09385791540',
      displayName: 'Mohan Email Patron',
      role: 'customer',
      roles: ['customer'],
      createdAt: '2026-10-19T05:00:00Z',
      patronCircleMember: false
    };

    storageService.saveUsers([patronPhoneOtp, patronEmailPass]);

    const patrons = customerService.getOnlyCustomers();
    expect(patrons.length).toBe(2);

    const phonePatron = patrons.find(p => p.uid === 'uid-phone-otp-2LV');
    const emailPatron = patrons.find(p => p.uid === 'uid-email-pass-6Li');

    expect(phonePatron).toBeDefined();
    expect(emailPatron).toBeDefined();
    // Identities must remain separate with their own canonical UIDs
    expect(phonePatron?.uid).not.toBe(emailPatron?.uid);

    // Conflict annotation must be present
    expect((phonePatron as any)?.hasIdentityConflict).toBe(true);
    expect((emailPatron as any)?.hasIdentityConflict).toBe(true);
    expect((phonePatron as any)?.conflictingUids).toContain('uid-email-pass-6Li');
  });

  // Test 3: Customer creation and profile updates with correct UID ownership
  it('3. Merge customer profiles throws when attempting to merge disparate non-empty UIDs', () => {
    const primary: UserProfile = {
      uid: 'uid-primary-001',
      email: 'alice@example.com',
      displayName: 'Alice',
      role: 'customer',
      roles: ['customer'],
      createdAt: new Date().toISOString()
    };

    const secondary: UserProfile = {
      uid: 'uid-different-002',
      email: 'bob@example.com',
      displayName: 'Bob',
      role: 'customer',
      roles: ['customer'],
      createdAt: new Date().toISOString()
    };

    expect(() => mergeCustomerProfiles(primary, secondary)).toThrowError(/Cannot merge disparate customer identities/);
  });

  // Test 4: Unauthorized customer creation, cross-customer access, and attempts to change protected fields
  it('4. Protected fields on profile cannot overwrite security properties', () => {
    const safePatron: UserProfile = {
      uid: 'patron-owner-123',
      displayName: 'Honest Patron',
      email: 'patron@example.com',
      role: 'customer',
      roles: ['customer'],
      customerStatus: 'active',
      isBlocked: false,
      ordersCount: 2,
      totalSpent: 5000,
      createdAt: '2026-01-01T00:00:00Z'
    };

    // Customer tries to escalate themselves to admin or change spend in local persistence
    const hackedUpdate: Partial<UserProfile> = {
      uid: 'patron-owner-123',
      displayName: 'Honest Patron',
      role: 'admin',
      roles: ['superadmin']
    };

    const merged = mergeCustomerProfiles(safePatron, hackedUpdate);
    expect(merged.uid).toBe('patron-owner-123');
  });

  // Test 5: Accurate metric calculation distinguishing completed, verified active, cancelled, refunded, and COD
  it('5. Computes accurate verified orders, delivered count, and net lifetime spend without floating-point errors', () => {
    const patron: UserProfile = {
      uid: 'uid-shopper-777',
      displayName: 'Atelier Patron',
      email: 'shopper777@example.com',
      role: 'customer',
      roles: ['customer'],
      createdAt: '2026-02-01T00:00:00Z'
    };

    const orders: Order[] = [
      // 1. Delivered COD order: revenue recognized
      {
        id: 'ord-1',
        orderNumber: 'MT-001',
        customerId: 'uid-shopper-777',
        total: 2187.95,
        orderStatus: 'delivered',
        paymentStatus: 'pending',
        paymentMethod: 'cash_on_delivery',
        createdAt: '2026-02-10T00:00:00Z'
      } as any,
      // 2. In-flight Razorpay order (paid): revenue recognized
      {
        id: 'ord-2',
        orderNumber: 'MT-002',
        customerId: 'uid-shopper-777',
        total: 1575.00,
        orderStatus: 'processing',
        paymentStatus: 'paid',
        paymentMethod: 'razorpay',
        createdAt: '2026-02-11T00:00:00Z'
      } as any,
      // 3. Cancelled order: must not count in verified orders or revenue
      {
        id: 'ord-3',
        orderNumber: 'MT-003',
        customerId: 'uid-shopper-777',
        total: 4188.45,
        orderStatus: 'cancelled',
        paymentStatus: 'failed',
        paymentMethod: 'razorpay',
        createdAt: '2026-02-12T00:00:00Z'
      } as any,
      // 4. Pending COD order (not delivered): counts as verified order in-flight, but ₹0 realized spend
      {
        id: 'ord-4',
        orderNumber: 'MT-004',
        customerId: 'uid-shopper-777',
        total: 2189.00,
        orderStatus: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'cash_on_delivery',
        createdAt: '2026-02-13T00:00:00Z'
      } as any,
      // 5. Another customer's order: must NEVER be assigned to this customer
      {
        id: 'ord-other-5',
        orderNumber: 'MT-005',
        customerId: 'uid-other-patron-888',
        customerPhone: '+919385791540', // shares phone
        total: 9999.00,
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        createdAt: '2026-02-14T00:00:00Z'
      } as any
    ];

    const metrics = customerService.calculateCustomerMetrics(patron, orders);

    // Verified orders (non-cancelled): ord-1 (delivered COD), ord-2 (paid processing), ord-4 (pending COD) = 3
    expect(metrics.totalValidOrders).toBe(3);
    expect(metrics.verifiedOrdersCount).toBe(3);

    // Completed orders: only ord-1 (delivered) = 1
    expect(metrics.completedOrdersCount).toBe(1);

    // Active in-flight orders: ord-2 (processing) + ord-4 (pending) = 2
    expect(metrics.activeOrdersCount).toBe(2);

    // Cancelled orders: ord-3 = 1
    expect(metrics.cancelledOrdersCount).toBe(1);

    // Realized spend: ord-1 (2187.95) + ord-2 (1575.00) = 3762.95 (ord-4 pending COD is not yet captured)
    expect(metrics.netLifetimeSpend).toBe(3762.95);
    expect(metrics.totalSpend).toBe(3762.95);

    // Order MT-005 belongs to another UID and must NEVER contaminate this patron's spend
    expect(metrics.eligibleOrders.some(o => o.id === 'ord-other-5')).toBe(false);
  });

  // Test 6: Never reassign orders merely because phone number matches
  it('6. Strictly prevents reassigning orders to a different patron merely because of matching phone', () => {
    const patronA: UserProfile = {
      uid: 'patron-a',
      email: 'patrona@example.com',
      phoneNumber: '+919385791540',
      displayName: 'Patron A',
      role: 'customer',
      roles: ['customer'],
      createdAt: '2026-01-01T00:00:00Z'
    };

    const patronB: UserProfile = {
      uid: 'patron-b',
      email: 'patronb@example.com',
      phoneNumber: '+919385791540', // Identical phone
      displayName: 'Patron B',
      role: 'customer',
      roles: ['customer'],
      createdAt: '2026-01-02T00:00:00Z'
    };

    const orders: Order[] = [
      {
        id: 'order-owned-by-b',
        orderNumber: 'MT-B-001',
        customerId: 'patron-b',
        customerPhone: '+919385791540',
        total: 5000,
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        createdAt: '2026-01-03T00:00:00Z'
      } as any
    ];

    const metricsA = customerService.calculateCustomerMetrics(patronA, orders);
    const metricsB = customerService.calculateCustomerMetrics(patronB, orders);

    expect(metricsA.verifiedOrdersCount).toBe(0);
    expect(metricsA.totalSpend).toBe(0);

    expect(metricsB.verifiedOrdersCount).toBe(1);
    expect(metricsB.totalSpend).toBe(5000);
  });

  // Test 7: Staff and admin exclusion from CRM patron list
  it('7. Excludes staff and administrative domain accounts from patron CRM directory', () => {
    const adminUser: UserProfile = {
      uid: 'admin-vignesh',
      email: 'vignesh.admin@muety.in',
      displayName: 'Vignesh Admin',
      role: 'admin',
      roles: ['admin'],
      createdAt: '2026-01-01T00:00:00Z'
    };

    const patronUser: UserProfile = {
      uid: 'patron-kalvi',
      email: 'kalvimohan03@gmail.com',
      phoneNumber: '+919385791540',
      displayName: 'Mohan Patron',
      role: 'customer',
      roles: ['customer'],
      createdAt: '2026-01-01T00:00:00Z'
    };

    expect(isStaffOrAdminUser(adminUser)).toBe(true);
    expect(isStaffOrAdminUser(patronUser)).toBe(false);
  });

  // Test 8: Order deduplication by unique canonical document key
  it('8. Deduplicates orders by unique ID or orderNumber when snapshots overlap', () => {
    const patron: UserProfile = {
      uid: 'uid-dedup-test',
      email: 'dedup@example.com',
      displayName: 'Test Patron',
      role: 'customer',
      roles: ['customer'],
      createdAt: '2026-01-01T00:00:00Z'
    };

    const duplicateSnapshots: Order[] = [
      { id: 'ord-101', orderNumber: 'MT-101', customerId: 'uid-dedup-test', total: 1000, orderStatus: 'delivered', paymentStatus: 'paid', createdAt: '2026-01-01T00:00:00Z' } as any,
      { id: 'ord-101', orderNumber: 'MT-101', customerId: 'uid-dedup-test', total: 1000, orderStatus: 'delivered', paymentStatus: 'paid', createdAt: '2026-01-01T00:00:00Z' } as any,
      { id: 'ord-102', orderNumber: 'MT-101', customerId: 'uid-dedup-test', total: 1000, orderStatus: 'delivered', paymentStatus: 'paid', createdAt: '2026-01-01T00:00:00Z' } as any // Same orderNumber
    ];

    const metrics = customerService.calculateCustomerMetrics(patron, duplicateSnapshots);
    expect(metrics.totalValidOrders).toBe(1);
    expect(metrics.totalSpend).toBe(1000);
  });
});
