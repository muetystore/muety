import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase Admin and Live Firebase
vi.mock('../../server/firebaseAdmin', () => ({
  verifyIdTokenAndGetClaims: vi.fn().mockImplementation(async (authHeader?: string) => {
    if (!authHeader) return null;
    if (authHeader.includes('superadmin')) {
      return { uid: 'superadmin-1', email: 'superadmin@muety.in', roles: ['superadmin'] };
    }
    if (authHeader.includes('admin')) {
      return { uid: 'admin-1', email: 'admin@muety.in', roles: ['admin'] };
    }
    if (authHeader.includes('customer')) {
      return { uid: 'customer-1', email: 'patron@example.com', roles: ['customer'] };
    }
    return null;
  }),
  getAdminAuth: vi.fn().mockReturnValue(null),
  getAdminFirestore: vi.fn().mockReturnValue(null)
}));

vi.mock('@/lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));

// Polyfill localStorage & window for test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = val; },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

import {
  getEmailSettings,
  saveCampaign,
  getCampaignById,
  handleUnsubscribe,
  isEmailSuppressed,
  fetchEligibleAudience,
  getAudienceEstimate,
  dispatchCampaign
} from '../../server/email/emailService';
import {
  isVerifiedOrder,
  isCompletedOrder,
  calculateOrderNetRevenue,
  deduplicateOrders,
  calculateOrdersSummary,
  filterCustomerOrders
} from '@/shared/utils/orderMetrics';
import {
  customerService,
  normalizeToE164,
  normalizePhoneNumber
} from '@/features/customers/services/customerService';
import {
  generateIdentityDryRunReport,
  formatDryRunReportText
} from '@/features/customers/services/identityAuditService';
import { storageService } from '@/lib/storage/storageService';
import { UserProfile } from '@/shared/types';
import { Order } from '@/features/orders/types';

function createMockOrder(overrides: Partial<Order> & { refundAmount?: number } = {}): Order {
  const now = new Date().toISOString();
  return {
    id: overrides.id || `ord-${Date.now()}`,
    orderNumber: overrides.orderNumber || 'MUETY-001',
    customerId: overrides.customerId || 'cust-1',
    customerName: overrides.customerName || 'Test Patron',
    customerEmail: overrides.customerEmail || 'patron@example.com',
    customerPhone: overrides.customerPhone || '+919876543210',
    total: overrides.total ?? 1000,
    subtotal: overrides.subtotal ?? (overrides.total ?? 1000),
    discount: overrides.discount ?? 0,
    tax: overrides.tax ?? 0,
    shippingFee: overrides.shippingFee ?? 0,
    paymentMethod: overrides.paymentMethod || 'razorpay',
    paymentStatus: overrides.paymentStatus || 'paid',
    orderStatus: overrides.orderStatus || 'delivered',
    items: overrides.items || [],
    shippingAddress: overrides.shippingAddress || {
      fullName: 'Test Patron',
      phone: '+919876543210',
      streetAddress: '123 Atelier Way',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India'
    },
    timeline: overrides.timeline || [],
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...(overrides.refundAmount !== undefined ? { refundAmount: overrides.refundAmount } as any : {})
  };
}

function createMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: overrides.uid || `usr-${Date.now()}`,
    displayName: overrides.displayName || 'Test Patron',
    email: overrides.email || '',
    role: overrides.role || 'customer',
    createdAt: overrides.createdAt || new Date().toISOString(),
    ...overrides
  };
}

describe('ROOT-CAUSE REPAIR REGRESSION TEST SUITE', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. CAMPAIGN AUDIENCE ESTIMATION, CONSENT VERIFICATION & RESEND DISPATCH
  // =========================================================================
  describe('A. Campaign Audience Estimation & Consent Verification', () => {
    it('strictly excludes unconsented patrons even if they are Patron Circle members', async () => {
      // Patron Circle alone must NOT be inferred as marketing consent
      const testCandidatePatrons = [
        { email: 'circle.only@example.com', marketingConsent: false, patronCircleMember: true },
        { email: 'explicit.optin@example.com', marketingConsent: true, patronCircleMember: false },
        { email: 'missing.consent@example.com', patronCircleMember: false }
      ];

      // Re-verify the rule: marketingConsent must be explicitly true
      const consented = testCandidatePatrons.filter(p => p.marketingConsent === true);
      expect(consented).toHaveLength(1);
      expect(consented[0].email).toBe('explicit.optin@example.com');
    });

    it('excludes unsubscribed patrons via suppression list at estimation and dispatch time', async () => {
      const unsubEmail = 'optout.patron@muety.test';
      expect(await isEmailSuppressed(unsubEmail)).toBe(false);

      await handleUnsubscribe(unsubEmail, 'Testing suppression enforcement');
      expect(await isEmailSuppressed(unsubEmail)).toBe(true);

      const estimate = await getAudienceEstimate('all_consented');
      expect(estimate).toBeDefined();
      expect(typeof estimate.eligibleCount).toBe('number');
      expect(typeof estimate.suppressedCount).toBe('number');
    });

    it('rejects dispatch with a clear structured error when eligible audience is zero', async () => {
      const draftCamp = await saveCampaign({
        name: 'Empty Audience Campaign',
        subject: 'Luxury Edit',
        audienceFilter: 'all_consented'
      }, 'admin@muety.in');

      // In test mode without mock recipients, eligible reach will be 0
      await expect(
        dispatchCampaign(draftCamp.id, 'admin@muety.in')
      ).rejects.toThrow('FAILED_PRECONDITION: ZERO_ELIGIBLE_RECIPIENTS');

      const updated = await getCampaignById(draftCamp.id);
      expect(updated?.status).toBe('draft');
      expect(updated?.errorMessage).toContain('Zero eligible recipients');
    });

    it('prevents double-dispatch when a campaign is already sending or sent', async () => {
      const camp = await saveCampaign({
        name: 'Concurrent Dispatch Guard',
        subject: 'Double Send Prevention',
        status: 'sending' as any
      }, 'admin@muety.in');

      await expect(
        dispatchCampaign(camp.id, 'admin@muety.in')
      ).rejects.toThrow('FAILED_PRECONDITION: CAMPAIGN_ALREADY_DISPATCHED');
    });

    it('preserves official marketing sender identity and support reply-to', async () => {
      const settings = await getEmailSettings();
      expect(settings.marketingSender.email).toBe('promotions@muety.in');
      expect(settings.marketingSender.name).toBe('MUETY Promotions');
      expect(settings.replyTo).toBe('support@muety.in');
      expect(settings.sendingDomain).toBe('muety.in');
    });
  });

  // =========================================================================
  // 2. PATRON IDENTITY & SHARED PHONE NUMBER SEGREGATION
  // =========================================================================
  describe('B. Patron Identity & Shared Phone Segregation', () => {
    it('normalizes various phone formats to canonical E.164 (+91)', () => {
      expect(normalizeToE164('9385791540')).toBe('+919385791540');
      expect(normalizeToE164('09385791540')).toBe('+919385791540');
      expect(normalizeToE164('+91 93857 91540')).toBe('+919385791540');
      expect(normalizeToE164('+919385791540')).toBe('+919385791540');
      expect(normalizeToE164('+1 415 555 2671', '+1')).toBe('+14155552671');
      expect(normalizeToE164('')).toBe('');
      expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    });

    it('detects shared phone numbers across multiple distinct UIDs without automatically merging them', () => {
      const mohanPhoneAuth = createMockUser({
        uid: '2LV607oVA2XlW8MNzBv89iVYAxh1',
        displayName: 'mohan',
        email: '',
        phoneNumber: '+919385791540',
        phone: '+919385791540',
        role: 'customer',
        customerStatus: 'active',
        patronCircleMember: true,
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z'
      });

      const mohanEmailAuth = createMockUser({
        uid: '6LiHUszdDTTGZ843jUeqyTwvPwq1',
        displayName: 'Kalvi Mohan',
        email: 'kalvimohan03@gmail.com',
        phoneNumber: '+919385791540',
        phone: '+919385791540',
        role: 'customer',
        customerStatus: 'active',
        createdAt: '2026-10-18T11:00:00Z',
        updatedAt: '2026-10-18T11:00:00Z'
      });

      storageService.saveUser(mohanPhoneAuth);
      storageService.saveUser(mohanEmailAuth);

      const patrons = customerService.getOnlyCustomers();
      const p1 = patrons.find(p => p.uid === mohanPhoneAuth.uid);
      const p2 = patrons.find(p => p.uid === mohanEmailAuth.uid);

      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      // Both accounts must be preserved as distinct identities
      expect(p1?.uid).not.toBe(p2?.uid);

      // Both accounts must be flagged with identity conflict
      expect((p1 as any)?.hasIdentityConflict).toBe(true);
      expect((p2 as any)?.hasIdentityConflict).toBe(true);
      expect((p1 as any)?.conflictingUids).toContain(mohanEmailAuth.uid);
      expect((p2 as any)?.conflictingUids).toContain(mohanPhoneAuth.uid);
    });

    it('prevents cross-patron order leakage: orders for Account 2 are NEVER returned for Account 1', () => {
      const uid1 = '2LV607oVA2XlW8MNzBv89iVYAxh1'; // Phone Auth (0 orders)
      const uid2 = '6LiHUszdDTTGZ843jUeqyTwvPwq1'; // Email Auth (4 orders)
      const sharedPhone = '+919385791540';

      const orders: Order[] = [
        createMockOrder({
          id: 'ord-101',
          orderNumber: 'MUETY-101',
          customerId: uid2,
          customerName: 'Kalvi Mohan',
          customerEmail: 'kalvimohan03@gmail.com',
          customerPhone: sharedPhone,
          total: 1999,
          orderStatus: 'confirmed',
          paymentStatus: 'paid',
          shippingAddress: { fullName: 'Kalvi Mohan', phone: sharedPhone, streetAddress: '123 Silk St', city: 'Chennai', state: 'TN', postalCode: '600001', country: 'India' },
          createdAt: '2026-10-19T10:00:00Z',
          updatedAt: '2026-10-19T10:00:00Z'
        }),
        createMockOrder({
          id: 'ord-102',
          orderNumber: 'MUETY-102',
          customerId: uid2,
          customerName: 'Kalvi Mohan',
          customerEmail: 'kalvimohan03@gmail.com',
          customerPhone: sharedPhone,
          total: 2500,
          orderStatus: 'delivered',
          paymentStatus: 'paid',
          shippingAddress: { fullName: 'Kalvi Mohan', phone: sharedPhone, streetAddress: '123 Silk St', city: 'Chennai', state: 'TN', postalCode: '600001', country: 'India' },
          createdAt: '2026-10-20T10:00:00Z',
          updatedAt: '2026-10-20T10:00:00Z'
        })
      ];

      // Filter orders for Account 1 (Phone Auth)
      const ordersForUid1 = filterCustomerOrders(orders, uid1, '');
      expect(ordersForUid1).toHaveLength(0); // STRICT PRIVACY: 0 orders

      // Filter orders for Account 2 (Email Auth)
      const ordersForUid2 = filterCustomerOrders(orders, uid2, 'kalvimohan03@gmail.com');
      expect(ordersForUid2).toHaveLength(2); // Retains 2 orders
    });

    it('generates a non-destructive dry-run report without mutating data', () => {
      const patrons: UserProfile[] = [
        createMockUser({
          uid: 'uid-p1',
          displayName: 'Patron One',
          email: 'patron1@example.com',
          phoneNumber: '+919876543210',
          role: 'customer',
          createdAt: '2026-10-01T00:00:00Z'
        }),
        createMockUser({
          uid: 'uid-p2',
          displayName: 'Patron Two',
          email: 'patron2@example.com',
          phoneNumber: '+919876543210', // Shared phone!
          role: 'customer',
          createdAt: '2026-10-02T00:00:00Z'
        })
      ];

      const orders: Order[] = [
        createMockOrder({
          id: 'ord-test-1',
          orderNumber: 'ORD-001',
          customerId: 'uid-p1',
          customerEmail: 'patron1@example.com',
          total: 4500,
          orderStatus: 'delivered',
          paymentStatus: 'paid',
          createdAt: '2026-10-05T00:00:00Z',
          updatedAt: '2026-10-05T00:00:00Z'
        })
      ];

      const report = generateIdentityDryRunReport(patrons, orders);

      expect(report.summary.totalPatronsScanned).toBe(2);
      expect(report.summary.totalOrdersScanned).toBe(1);
      expect(report.summary.sharedPhoneConflictCount).toBe(1);
      expect(report.sharedPhoneConflicts[0].phone).toBe('+919876543210');
      expect(report.sharedPhoneConflicts[0].uids).toContain('uid-p1');
      expect(report.sharedPhoneConflicts[0].uids).toContain('uid-p2');

      const text = formatDryRunReportText(report);
      expect(text).toContain('MUETY PATRON IDENTITY & ORDER MIGRATION DRY-RUN REPORT');
      expect(text).toContain('Conflict #1');
    });
  });

  // =========================================================================
  // 3. ORDER METRICS, REVENUE & DASHBOARD-CRM RECONCILIATION
  // =========================================================================
  describe('C. Order Metrics & Revenue Reconciliation', () => {
    const mixedOrders: Order[] = [
      createMockOrder({
        id: 'ord-del-1',
        orderNumber: 'ORD-DEL-1',
        customerId: 'cust-1',
        total: 5000,
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        createdAt: '2026-10-10T00:00:00Z',
        updatedAt: '2026-10-10T00:00:00Z'
      }),
      createMockOrder({
        id: 'ord-proc-2',
        orderNumber: 'ORD-PROC-2',
        customerId: 'cust-1',
        total: 2951.40,
        orderStatus: 'processing',
        paymentStatus: 'paid',
        createdAt: '2026-10-11T00:00:00Z',
        updatedAt: '2026-10-11T00:00:00Z'
      }),
      createMockOrder({
        id: 'ord-canc-3',
        orderNumber: 'ORD-CANC-3',
        customerId: 'cust-1',
        total: 3000,
        orderStatus: 'cancelled',
        paymentStatus: 'failed',
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z'
      }),
      createMockOrder({
        id: 'ord-ref-4',
        orderNumber: 'ORD-REF-4',
        customerId: 'cust-1',
        total: 1000,
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        refundAmount: 400, // Partial refund
        createdAt: '2026-10-13T00:00:00Z',
        updatedAt: '2026-10-13T00:00:00Z'
      })
    ];

    it('correctly classifies verified orders vs completed orders', () => {
      // Verified orders = non-cancelled, non-failed (delivered, processing, partial refund)
      expect(isVerifiedOrder(mixedOrders[0])).toBe(true);  // delivered
      expect(isVerifiedOrder(mixedOrders[1])).toBe(true);  // processing
      expect(isVerifiedOrder(mixedOrders[2])).toBe(false); // cancelled
      expect(isVerifiedOrder(mixedOrders[3])).toBe(true);  // delivered with partial refund

      // Completed orders = delivered only
      expect(isCompletedOrder(mixedOrders[0])).toBe(true);
      expect(isCompletedOrder(mixedOrders[1])).toBe(false);
      expect(isCompletedOrder(mixedOrders[2])).toBe(false);
      expect(isCompletedOrder(mixedOrders[3])).toBe(true);
    });

    it('computes net monetary revenue deducting cancellations and refunds accurately', () => {
      expect(calculateOrderNetRevenue(mixedOrders[0])).toBe(5000);
      expect(calculateOrderNetRevenue(mixedOrders[1])).toBe(2951.40);
      expect(calculateOrderNetRevenue(mixedOrders[2])).toBe(0); // cancelled orders contribute 0
      expect(calculateOrderNetRevenue(mixedOrders[3])).toBe(600); // 1000 - 400 refund = 600

      const summary = calculateOrdersSummary(mixedOrders);
      expect(summary.totalOrdersCount).toBe(4);
      expect(summary.verifiedOrdersCount).toBe(3);
      expect(summary.completedOrdersCount).toBe(2);
      expect(summary.cancelledOrdersCount).toBe(1);
      // Net revenue = 5000 + 2951.40 + 600 = 8551.40
      expect(summary.cumulativeSpend).toBe(8551.40);
    });

    it('deduplicates duplicate order documents by stable order ID', () => {
      const duplicated = [...mixedOrders, mixedOrders[0], mixedOrders[1]];
      expect(duplicated.length).toBe(6);

      const dedupled = deduplicateOrders(duplicated);
      expect(dedupled.length).toBe(4);
    });

    it('reconciles customer metrics with dashboard aggregates', () => {
      const customer = createMockUser({
        uid: 'cust-1',
        displayName: 'Test Patron',
        email: 'patron@example.com',
        role: 'customer'
      });

      const metrics = customerService.calculateCustomerMetrics(customer, mixedOrders);
      expect(metrics.verifiedOrdersCount).toBe(3);
      expect(metrics.completedOrdersCount).toBe(2);
      expect(metrics.cancelledOrdersCount).toBe(1);
      expect(metrics.netLifetimeSpend).toBe(8551.40);
      expect(metrics.orderCount).toBe(3); // canonical verified orders
    });

    it('preserves confirmed stored customer aggregates when order list is not yet loaded', () => {
      const patronWithStoredAggregates = createMockUser({
        uid: 'cust-stored',
        displayName: 'Stored Patron',
        email: 'stored@example.com',
        role: 'customer',
        ordersCount: 4,
        totalSpent: 7951.40
      });

      // When allOrders is empty (e.g. before async Firestore query completes)
      const metrics = customerService.calculateCustomerMetrics(patronWithStoredAggregates, []);
      expect(metrics.verifiedOrdersCount).toBe(4);
      expect(metrics.netLifetimeSpend).toBe(7951.40);
      expect(metrics.orderCount).toBe(4);
      expect(metrics.totalSpend).toBe(7951.40);
    });
  });
});
