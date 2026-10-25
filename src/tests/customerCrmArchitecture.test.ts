import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('@/lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));
vi.mock('../lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));
import { customerService, isStaffOrAdminUser, mergeCustomerProfiles } from '@/features/customers/services/customerService';
import { storageService } from '@/lib/storage/storageService';
import { orderService } from '@/features/orders/services/orderService';
import { auditService, sanitizeAuditPayload } from '@/shared/services/auditService';
import { handleCreateServerOrder } from '../../server/orderApi';
import { handleApiRequest } from '../../server/index';
import { UserProfile, Address } from '@/shared/types';
import { Order } from '@/features/orders/types';

// Polyfill localStorage in test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = val; },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

// Helper to create mock HTTP Request and Response objects
function createMockHttpReqRes(options: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const req: any = {
    url: options.url,
    method: options.method || 'POST',
    headers: options.headers || { 'content-type': 'application/json' },
    on: (event: string, handler: (...args: any[]) => void) => {
      if (event === 'data') {
        if (options.body) handler(Buffer.from(JSON.stringify(options.body)));
      } else if (event === 'end') {
        handler();
      }
    },
    destroy: vi.fn()
  };

  const responseStatusCode = 200;
  const responseHeaders: Record<string, string> = {};
  let responseBody = '';

  const res: any = {
    req,
    statusCode: 200,
    setHeader: (name: string, value: string) => {
      responseHeaders[name.toLowerCase()] = value;
    },
    end: (chunk?: string) => {
      if (chunk) responseBody = chunk;
    },
    get statusCodeResult() { return res.statusCode; },
    get jsonBody() { return responseBody ? JSON.parse(responseBody) : null; }
  };

  return { req, res };
}

describe('MUETY Customer CRM Security & Data Integrity Hardening Suite', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    storageService.saveUsers([]);
    storageService.saveOrders([]);
    vi.clearAllMocks();
  });

  describe('1. P0 — Enforce customer suspension & token verification on trusted server', () => {
    it('rejects order placement when customer account is suspended (client check)', async () => {
      const suspendedCustomer: UserProfile = {
        uid: 'cust-suspended-999',
        email: 'suspended@muety.com',
        displayName: 'Suspended Patron',
        role: 'customer',
        roles: ['customer'],
        isBlocked: true,
        customerStatus: 'blocked',
        createdAt: new Date().toISOString()
      };

      storageService.saveUser(suspendedCustomer);

      await expect(orderService.createOrder({
        customerId: 'cust-suspended-999',
        customerName: 'Suspended Patron',
        customerEmail: 'suspended@muety.com',
        shippingAddress: {
          fullName: 'Suspended Patron',
          phone: '9999999999',
          streetAddress: '123 Blocked St',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'India'
        },
        items: [],
        subtotal: 5000,
        discount: 0,
        tax: 0,
        shippingFee: 0,
        total: 5000,
        paymentMethod: 'cash_on_delivery'
      })).rejects.toThrow(/suspended/i);
    });

    it('rejects server order creation if customerId is passed without an Authorization token', async () => {
      await expect(handleCreateServerOrder(undefined, {
        customerId: 'cust-real-123',
        customerName: 'Patron User',
        customerEmail: 'patron@gmail.com',
        shippingAddress: { fullName: 'Patron', streetAddress: '1 Main Rd', city: 'Chennai', postalCode: '600001', phone: '9999999999' },
        items: [{ productId: 'p1', quantity: 1, price: 5000 }]
      })).rejects.toThrow(/Authentication token is required for customer checkout/i);
    });

    it('rejects server order creation if Authorization token has invalid or malformed format', async () => {
      await expect(handleCreateServerOrder('Bearer invalid-token-string', {
        customerId: 'cust-real-123',
        customerName: 'Patron User',
        customerEmail: 'patron@gmail.com',
        shippingAddress: { fullName: 'Patron', streetAddress: '1 Main Rd', city: 'Chennai', postalCode: '600001', phone: '9999999999' },
        items: [{ productId: 'p1', quantity: 1, price: 5000 }]
      })).rejects.toThrow(/Invalid or expired authentication token/i);
    });

    it('rejects server order creation if request body customerId does not match authenticated token UID', async () => {
      // Mock valid JWT for user cust-attacker-777
      const validTokenPayload = Buffer.from(JSON.stringify({ uid: 'cust-attacker-777', email: 'attacker@gmail.com', roles: ['customer'] })).toString('base64');
      const mockToken = `Bearer fakeHeader.${validTokenPayload}.fakeSig`;

      // Attacker attempts to place order under victim's customerId
      await expect(handleCreateServerOrder(mockToken, {
        customerId: 'cust-victim-888',
        customerName: 'Victim User',
        customerEmail: 'victim@example.com',
        shippingAddress: { fullName: 'Victim', streetAddress: '1 Main Rd', city: 'Chennai', postalCode: '600001', phone: '9999999999' },
        items: [{ productId: 'p1', quantity: 1, price: 5000 }]
      })).rejects.toThrow(/Customer ID in request body does not match authenticated credentials/i);
    });

    it('derives customer UID exclusively from verified claims for authenticated checkout', async () => {
      const tokenPayload = Buffer.from(JSON.stringify({ uid: 'cust-verified-555', email: 'verified@example.com', roles: ['customer'] })).toString('base64');
      const mockToken = `Bearer fakeHeader.${tokenPayload}.fakeSig`;

      const result = await handleCreateServerOrder(mockToken, {
        customerName: 'Verified Patron',
        customerEmail: 'verified@example.com',
        shippingAddress: { fullName: 'Verified Patron', streetAddress: '1 Main Rd', city: 'Chennai', postalCode: '600001', phone: '9999999999' },
        items: [{ productId: 'p1', quantity: 2, price: 2000 }]
      });

      expect(result.success).toBe(true);
      expect(result.order.customerId).toBe('cust-verified-555');
    });

    it('allows guest checkout when no customerId and no token are provided', async () => {
      const result = await handleCreateServerOrder(undefined, {
        customerName: 'Guest Shopper',
        customerEmail: 'guest@example.com',
        shippingAddress: { fullName: 'Guest Shopper', streetAddress: '5 Beach Rd', city: 'Mumbai', postalCode: '400001', phone: '9888888888' },
        items: [{ productId: 'p2', quantity: 1, price: 3500 }]
      });

      expect(result.success).toBe(true);
      expect(result.order.customerId.startsWith('guest-')).toBe(true);
    });

    it('returns 400 INVALID_ARGUMENT via HTTP router when missing required customer info', async () => {
      const { req, res } = createMockHttpReqRes({
        url: '/api/orders/create',
        body: {
          items: [{ productId: 'p1', quantity: 1 }]
        }
      });

      const handled = await handleApiRequest(req, res);
      expect(handled).toBe(true);
      expect(res.statusCodeResult).toBe(400);
      expect(res.jsonBody.code).toBe('INVALID_ARGUMENT');
    });
  });

  describe('2. P1 — Correct customer order metrics and lifetime spend', () => {
    it('calculates separate metrics for paid, pending, cancelled, failed, and refunded orders', () => {
      const customer: UserProfile = {
        uid: 'cust-metrics-101',
        email: 'aishwarya.rai@gmail.com',
        displayName: 'Aishwarya Rai',
        role: 'customer',
        roles: ['customer'],
        createdAt: new Date().toISOString()
      };

      const orders: any[] = [
        // 1. Paid & Delivered (₹25,000)
        {
          id: 'ord-101',
          orderNumber: 'MT-101',
          customerId: 'cust-metrics-101',
          customerEmail: 'aishwarya.rai@gmail.com',
          total: 25000,
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          orderStatus: 'delivered',
          createdAt: new Date('2026-01-01').toISOString()
        },
        // 2. Paid with partial refund of ₹5,000 (Gross: ₹30,000, Net: ₹25,000)
        {
          id: 'ord-102',
          orderNumber: 'MT-102',
          customerId: 'cust-metrics-101',
          customerEmail: 'aishwarya.rai@gmail.com',
          total: 30000,
          refundedAmount: 5000,
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          orderStatus: 'delivered',
          createdAt: new Date('2026-01-05').toISOString()
        },
        // 3. Fully refunded order (₹10,000) -> net spend 0, refunded count +1
        {
          id: 'ord-103',
          orderNumber: 'MT-103',
          customerId: 'cust-metrics-101',
          customerEmail: 'aishwarya.rai@gmail.com',
          total: 10000,
          paymentMethod: 'razorpay',
          paymentStatus: 'refunded',
          orderStatus: 'delivered',
          createdAt: new Date('2026-01-10').toISOString()
        },
        // 4. Cancelled order (₹15,000) -> excluded from spend and paid count
        {
          id: 'ord-104',
          orderNumber: 'MT-104',
          customerId: 'cust-metrics-101',
          customerEmail: 'aishwarya.rai@gmail.com',
          total: 15000,
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          orderStatus: 'cancelled',
          createdAt: new Date('2026-01-15').toISOString()
        },
        // 5. Failed payment order (₹8,000) -> excluded from spend
        {
          id: 'ord-105',
          orderNumber: 'MT-105',
          customerId: 'cust-metrics-101',
          customerEmail: 'aishwarya.rai@gmail.com',
          total: 8000,
          paymentMethod: 'razorpay',
          paymentStatus: 'failed',
          orderStatus: 'failed',
          createdAt: new Date('2026-01-20').toISOString()
        },
        // 6. Cash on delivery / Pending order (₹4,000) -> counted in valid placed orders, but not in realized spend
        {
          id: 'ord-106',
          orderNumber: 'MT-106',
          customerId: 'cust-metrics-101',
          customerEmail: 'aishwarya.rai@gmail.com',
          total: 4000,
          paymentMethod: 'cash_on_delivery',
          paymentStatus: 'pending',
          orderStatus: 'pending',
          createdAt: new Date('2026-01-25').toISOString()
        },
        // 7. Duplicate of ord-101 (must be deduplicated)
        {
          id: 'ord-101',
          orderNumber: 'MT-101',
          customerId: 'cust-metrics-101',
          customerEmail: 'aishwarya.rai@gmail.com',
          total: 25000,
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          orderStatus: 'delivered',
          createdAt: new Date('2026-01-01').toISOString()
        }
      ];

      const metrics = customerService.calculateCustomerMetrics(customer, orders);

      // Net Lifetime Spend = 25,000 (ord-101) + (30,000 - 5,000) (ord-102) = 50,000
      expect(metrics.netLifetimeSpend).toBe(50000);
      expect(metrics.totalSpend).toBe(50000);

      // Paid Orders Count = 2 (ord-101, ord-102)
      expect(metrics.paidOrdersCount).toBe(2);

      // Total valid orders placed = 4 (ord-101, ord-102, ord-103 refunded, ord-106 pending)
      expect(metrics.totalValidOrders).toBe(4);

      // Status counts
      expect(metrics.cancelledOrdersCount).toBe(1);
      expect(metrics.failedOrdersCount).toBe(1);
      expect(metrics.refundedOrdersCount).toBe(1);
      expect(metrics.pendingOrdersCount).toBe(1);

      // VIP Status threshold reached (net spend >= 50,000)
      expect(metrics.isVip).toBe(true);
      expect(metrics.customerCategory).toBe('VIP Patron');

      // Deduplicated unique orders count should be 6
      expect(metrics.eligibleOrders.length).toBe(6);
    });

    it('marks refundDataAvailable as false if an order has incomplete refund records', () => {
      const customer: UserProfile = {
        uid: 'cust-incomplete-101',
        email: 'incomplete@muety.com',
        displayName: 'Incomplete Patron',
        role: 'customer',
        createdAt: new Date().toISOString()
      };

      const orders: any[] = [
        {
          id: 'ord-inc-1',
          orderNumber: 'MT-INC-1',
          customerId: 'cust-incomplete-101',
          customerEmail: 'incomplete@muety.com',
          total: 12000,
          paymentStatus: 'paid',
          refundDataIncomplete: true,
          createdAt: new Date().toISOString()
        }
      ];

      const metrics = customerService.calculateCustomerMetrics(customer, orders);
      expect(metrics.refundDataAvailable).toBe(false);
    });

    it('correctly includes completed Cash-on-Delivery orders in realized spend when paid', () => {
      const customer: UserProfile = {
        uid: 'cust-cod-101',
        email: 'cod.patron@gmail.com',
        displayName: 'COD Patron',
        role: 'customer',
        createdAt: new Date().toISOString()
      };

      const orders: any[] = [
        {
          id: 'ord-cod-paid-1',
          orderNumber: 'MT-COD-1',
          customerId: 'cust-cod-101',
          customerEmail: 'cod.patron@gmail.com',
          total: 18000,
          paymentMethod: 'cash_on_delivery',
          paymentStatus: 'paid',
          orderStatus: 'delivered',
          createdAt: new Date().toISOString()
        }
      ];

      const metrics = customerService.calculateCustomerMetrics(customer, orders);
      expect(metrics.paidOrdersCount).toBe(1);
      expect(metrics.netLifetimeSpend).toBe(18000);
      expect(metrics.pendingOrdersCount).toBe(0);
    });
  });

  describe('3. P1 — Establish canonical customer identity & merge rules', () => {
    it('merges duplicate customer representations by UID preserving verified fields and suspension safety', () => {
      const primaryProfile: UserProfile = {
        uid: 'cust-auth-555',
        email: 'deepika.padukone@gmail.com',
        displayName: 'Deepika Padukone',
        phoneNumber: '+91 98765 43210',
        customerStatus: 'active',
        isBlocked: false,
        addresses: [
          {
            id: 'addr-1',
            fullName: 'Deepika Padukone',
            phone: '9876543210',
            streetAddress: '10 Beach Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India',
            isDefault: true
          }
        ],
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      const secondaryProfile: Partial<UserProfile> = {
        uid: 'cust-auth-555',
        email: 'deepika.padukone@gmail.com',
        displayName: 'Deepika P.',
        whatsappPhone: '+91 98765 43210',
        isBlocked: true, // Marked suspended in Firestore
        customerStatus: 'blocked',
        addresses: [
          {
            id: 'addr-2',
            fullName: 'Deepika P. Studio',
            phone: '9876543210',
            streetAddress: '45 Film City',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400065',
            country: 'India'
          }
        ],
        createdAt: '2026-01-05T00:00:00.000Z'
      };

      const merged = mergeCustomerProfiles(primaryProfile, secondaryProfile);

      // Preserves primary canonical UID and verified email
      expect(merged.uid).toBe('cust-auth-555');
      expect(merged.email).toBe('deepika.padukone@gmail.com');
      // Preserves primary full display name over shorthand
      expect(merged.displayName).toBe('Deepika Padukone');
      // Safety precedence: suspended status is enforced
      expect(merged.isBlocked).toBe(true);
      expect(merged.customerStatus).toBe('blocked');
      // Merges distinct addresses
      expect(merged.addresses?.length).toBe(2);
      // Earliest createdAt timestamp preserved
      expect(merged.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('rejects merging disparate customer identities with conflicting UIDs', () => {
      const customerA: UserProfile = {
        uid: 'cust-A-111',
        email: 'customer.a@gmail.com',
        displayName: 'User A',
        createdAt: new Date().toISOString()
      };

      const customerB: Partial<UserProfile> = {
        uid: 'cust-B-222',
        email: 'customer.b@gmail.com',
        displayName: 'User B',
        createdAt: new Date().toISOString()
      };

      expect(() => mergeCustomerProfiles(customerA, customerB)).toThrow(/Cannot merge disparate customer identities with conflicting UIDs/i);
    });

    it('prefers newer contact details when secondary record has more recent updatedAt timestamp', () => {
      const olderRecord: UserProfile = {
        uid: 'cust-update-123',
        email: 'user@example.com',
        displayName: 'Old Name',
        phoneNumber: '1111111111',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      };

      const newerRecord: Partial<UserProfile> = {
        uid: 'cust-update-123',
        email: 'user@example.com',
        displayName: 'New Verified Name',
        phoneNumber: '9999999999',
        updatedAt: '2026-02-01T00:00:00.000Z'
      };

      const merged = mergeCustomerProfiles(olderRecord, newerRecord);
      expect(merged.displayName).toBe('New Verified Name');
      expect(merged.phoneNumber).toBe('9999999999');
      expect(merged.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('excludes staff and admin roles from patron CRM directory', () => {
      const admin: UserProfile = {
        uid: 'adm-999',
        email: 'support@muetystore.com',
        displayName: 'Support Executive',
        role: 'support_manager',
        roles: ['support_manager'],
        createdAt: new Date().toISOString()
      };

      const patron: UserProfile = {
        uid: 'patron-888',
        email: 'patron@gmail.com',
        displayName: 'Store Patron',
        role: 'customer',
        roles: ['customer'],
        createdAt: new Date().toISOString()
      };

      expect(isStaffOrAdminUser(admin)).toBe(true);
      expect(isStaffOrAdminUser(patron)).toBe(false);

      storageService.saveUsers([admin, patron]);
      const patrons = customerService.getOnlyCustomers();
      expect(patrons.length).toBe(1);
      expect(patrons[0].uid).toBe('patron-888');
    });
  });

  describe('4. P1 — Secure authorization and durable audit logs', () => {
    it('sanitizes sensitive fields (passwords, tokens, keys) before writing audit logs', () => {
      const sensitiveData = {
        email: 'customer@gmail.com',
        password: 'superSecretPassword123',
        accessToken: 'eyJhbGciOi...',
        apiKey: 'AIzaSy...',
        creditCard: '4111222233334444',
        displayName: 'Customer Name'
      };

      const sanitized = sanitizeAuditPayload(sensitiveData);
      expect(sanitized.email).toBe('customer@gmail.com');
      expect(sanitized.displayName).toBe('Customer Name');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.creditCard).toBe('[REDACTED]');
    });

    it('creates immutable audit logs for customer mutations', async () => {
      const log = await auditService.logAction({
        actorUid: 'admin-001',
        actorEmail: 'admin@muety.in',
        actorRole: 'admin',
        action: 'CUSTOMER_SUSPENDED',
        entityType: 'CUSTOMER',
        entityId: 'cust-101',
        before: { customerStatus: 'active', isBlocked: false },
        after: { customerStatus: 'blocked', isBlocked: true },
        reason: 'Suspended patron account per security policy'
      });

      expect(log.logId).toBeDefined();
      expect(log.action).toBe('CUSTOMER_SUSPENDED');
      expect(log.entityId).toBe('cust-101');
      expect(log.after.isBlocked).toBe(true);
    });
  });
});
