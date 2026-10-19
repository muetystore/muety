import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../server/firebaseAdmin', () => ({
  verifyIdTokenAndGetClaims: vi.fn().mockResolvedValue({
    uid: 'patron-verified-1',
    email: 'patron@muety.in'
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
vi.mock('../lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));

import { calculateOrderFinancials, CANONICAL_SHIPPING_FEE, COD_ADVANCE_AMOUNT } from '../shared/utils/pricingEngine';
import { orderService } from '../features/orders/services/orderService';
import { storageService } from '../lib/storage/storageService';
import { handleCreateServerOrder } from '../../server/orderApi';

describe('Mandatory Pricing Plan Correction — MUETY', () => {
  beforeEach(() => {
    storageService.clearAll();
  });

  describe('1. Canonical Pricing Engine & Financial Formula', () => {
    it('calculates Order Total: Online Payment has FREE shipping (₹0); COD has ₹89 shipping fee', () => {
      const subtotal = 4000;
      const discount = 400; // 10% coupon
      const taxRate = 5; // 5% GST

      // Online payment (prepaid)
      const onlineFinancials = calculateOrderFinancials({
        subtotal,
        discount,
        taxRate,
        paymentMethod: 'razorpay'
      });

      // Taxable amount = 4000 - 400 = 3600
      expect(onlineFinancials.taxableAmount).toBe(3600);
      // Tax = 5% of 3600 = 180
      expect(onlineFinancials.tax).toBe(180);
      // Online payment gets FREE shipping = 0
      expect(onlineFinancials.shippingFee).toBe(0);
      // Grand Total = 3600 + 180 + 0 = 3780
      expect(onlineFinancials.total).toBe(3780);

      // Cash on Delivery (COD)
      const codFinancials = calculateOrderFinancials({
        subtotal,
        discount,
        taxRate,
        paymentMethod: 'cash_on_delivery'
      });

      expect(codFinancials.taxableAmount).toBe(3600);
      expect(codFinancials.tax).toBe(180);
      // COD has flat shipping fee = 89
      expect(codFinancials.shippingFee).toBe(89);
      expect(CANONICAL_SHIPPING_FEE).toBe(89);
      // Grand Total = 3600 + 180 + 89 = 3869
      expect(codFinancials.total).toBe(3869);
      expect(codFinancials.codAdvanceAmount).toBe(89);
      expect(codFinancials.remainingAmountDueAtDelivery).toBe(3780);
    });

    it('ensures online payment delivery fee is strictly ₹0 (FREE) and COD delivery fee is strictly ₹89', () => {
      const onlineFinancials = calculateOrderFinancials({
        subtotal: 5000,
        discount: 0,
        taxRate: 5,
        paymentMethod: 'razorpay'
      });

      expect(onlineFinancials.shippingFee).toBe(0);
      // Tax = 250, Total = 5000 + 250 + 0 = 5250
      expect(onlineFinancials.total).toBe(5250);

      const codFinancials = calculateOrderFinancials({
        subtotal: 5000,
        discount: 0,
        taxRate: 5,
        paymentMethod: 'cash_on_delivery'
      });

      expect(codFinancials.shippingFee).toBe(89);
      // Tax = 250, Total = 5000 + 250 + 89 = 5339
      expect(codFinancials.total).toBe(5339);
    });

    it('handles zero or empty cart gracefully', () => {
      const financials = calculateOrderFinancials({
        subtotal: 0,
        discount: 0,
        taxRate: 5,
        paymentMethod: 'razorpay'
      });

      expect(financials.subtotal).toBe(0);
      expect(financials.shippingFee).toBe(0);
      expect(financials.tax).toBe(0);
      expect(financials.total).toBe(0);
      expect(financials.amountDueOnline).toBe(0);
      expect(financials.remainingAmountDueAtDelivery).toBe(0);
    });
  });

  describe('2. Online Payment vs Cash on Delivery (COD) Accounting', () => {
    it('Online Payment (Razorpay): gets 100% FREE delivery (₹0), collects full order online, ₹0 at delivery', () => {
      const subtotal = 6000;
      const financials = calculateOrderFinancials({
        subtotal,
        discount: 0,
        taxRate: 5,
        paymentMethod: 'razorpay'
      });

      const expectedTotal = 6000 + (6000 * 0.05); // 6300 (₹0 shipping fee)
      expect(financials.shippingFee).toBe(0);
      expect(financials.total).toBe(expectedTotal);
      expect(financials.amountDueOnline).toBe(expectedTotal);
      expect(financials.remainingAmountDueAtDelivery).toBe(0);
      expect(financials.codAdvanceAmount).toBe(0);
    });

    it('Cash on Delivery (COD): collects ₹89 delivery fee online as advance, remaining (Items + Tax) at delivery', () => {
      const subtotal = 6000;
      const financials = calculateOrderFinancials({
        subtotal,
        discount: 0,
        taxRate: 5,
        paymentMethod: 'cash_on_delivery'
      });

      const expectedTotal = 6000 + (6000 * 0.05) + 89; // 6389
      expect(financials.shippingFee).toBe(89);
      expect(financials.total).toBe(expectedTotal);
      // Advance due online is strictly the ₹89 delivery fee
      expect(financials.amountDueOnline).toBe(89);
      expect(financials.codAdvanceAmount).toBe(89);
      expect(COD_ADVANCE_AMOUNT).toBe(89);

      // Remaining due at delivery is Total - 89 = 6389 - 89 = 6300 (Items + Tax)
      expect(financials.remainingAmountDueAtDelivery).toBe(expectedTotal - 89);
      expect(financials.remainingAmountDueAtDelivery).toBe(6300);

      // CRITICAL CHECK: Advance (89) + Delivery balance (6300) equals EXACTLY Order Total (6389)
      expect(financials.amountDueOnline + financials.remainingAmountDueAtDelivery).toBe(financials.total);
    });

    it('charges ₹89 delivery fee only on COD, while online payment completely waives the delivery fee', () => {
      const subtotal = 10000;
      const discount = 1000;
      const taxRate = 5;

      const onlineFinancials = calculateOrderFinancials({
        subtotal,
        discount,
        taxRate,
        paymentMethod: 'razorpay'
      });

      const codFinancials = calculateOrderFinancials({
        subtotal,
        discount,
        taxRate,
        paymentMethod: 'cash_on_delivery'
      });

      // Online delivery is 0; COD delivery is 89
      expect(onlineFinancials.shippingFee).toBe(0);
      expect(codFinancials.shippingFee).toBe(89);

      expect(onlineFinancials.total).toBe(9000 + 450); // 9450
      expect(codFinancials.total).toBe(9000 + 450 + 89); // 9539

      // COD total exceeds online total by exactly the ₹89 delivery fee
      expect(codFinancials.total).toBe(onlineFinancials.total + 89);
      // Customer pays the identical item+tax amount (9450) at delivery for COD
      expect(codFinancials.remainingAmountDueAtDelivery).toBe(onlineFinancials.total);
    });
  });

  describe('3. Frontend Order Service & Storage Integration', () => {
    it('creates an order with canonical ₹89 shipping and sets COD balance due', async () => {
      const order = await orderService.createOrder({
        customerId: 'patron-123',
        customerName: 'Ananya Sharma',
        customerEmail: 'ananya@example.com',
        customerPhone: '9876543210',
        shippingAddress: {
          fullName: 'Ananya Sharma',
          phone: '9876543210',
          streetAddress: '12 Temple Street',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'India'
        },
        items: [
          {
            product: {
              id: 'saree-01',
              name: 'Kanchipuram Silk Saree',
              price: 5000,
              images: ['/saree_1.jpg']
            } as any,
            quantity: 1
          }
        ],
        subtotal: 5000,
        discount: 0,
        tax: 250,
        shippingFee: 89,
        total: 5339,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'pending',
        codAdvanceAmount: 89,
        codBalanceDue: 5250,
        razorpayPaymentId: 'pay_test_cod_advance_123'
      });

      expect(order.shippingFee).toBe(89);
      expect(order.total).toBe(5339);
      expect(order.codAdvanceAmount).toBe(89);
      expect(order.codBalanceDue).toBe(5250);
      expect(order.paymentMethod).toBe('cash_on_delivery');
    }, 30000);

    it('supports customer cancellation request while order is in pending status', async () => {
      const order = await orderService.createOrder({
        customerId: 'patron-456',
        customerName: 'Kavitha R',
        customerEmail: 'kavitha@example.com',
        shippingAddress: {
          fullName: 'Kavitha R',
          phone: '9876543210',
          streetAddress: '44 Gandhi Road',
          city: 'Salem',
          state: 'Tamil Nadu',
          postalCode: '636001',
          country: 'India'
        },
        items: [
          {
            product: { id: 'saree-02', name: 'Soft Silk Saree', price: 3000, images: ['/saree_2.jpg'] } as any,
            quantity: 1
          }
        ],
        subtotal: 3000,
        discount: 0,
        tax: 150,
        shippingFee: 0,
        total: 3150,
        paymentMethod: 'razorpay'
      });

      const updated = await orderService.requestCancellation(order.id, 'Ordered wrong shade by mistake');
      expect(updated).toBeDefined();
      expect(updated?.cancellationRequested).toBe(true);
      expect(updated?.cancellationReason).toBe('Ordered wrong shade by mistake');
    });
  });

  describe('4. Backend Independent Calculation & Order API Verification', () => {
    it('server independently calculates order total using 5% GST and canonical ₹89 shipping for COD', async () => {
      const response = await handleCreateServerOrder(undefined, {
        customerName: 'Meera Iyer',
        customerEmail: 'meera@example.com',
        shippingAddress: {
          fullName: 'Meera Iyer',
          phone: '9876543210',
          streetAddress: '78 Cathedral Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600086',
          country: 'India'
        },
        items: [
          {
            productId: 'prod-server-test-1',
            quantity: 2,
            price: 2500,
            product: { price: 2500, name: 'Tussar Silk Saree' }
          }
        ],
        paymentMethod: 'cash_on_delivery',
        razorpayPaymentId: 'pay_test_advance_89'
      });

      expect(response.success).toBe(true);
      const serverOrder = response.order;

      // Subtotal = 2 * 2500 = 5000
      expect(serverOrder.subtotal).toBe(5000);
      // Tax = 5% of 5000 = 250
      expect(serverOrder.tax).toBe(250);
      // Canonical Shipping = 89 for COD
      expect(serverOrder.shippingFee).toBe(89);
      // Grand Total = 5000 + 250 + 89 = 5339
      expect(serverOrder.total).toBe(5339);

      // COD advance = 89, Balance due = 5339 - 89 = 5250
      expect(serverOrder.codAdvanceAmount).toBe(89);
      expect(serverOrder.codBalanceDue).toBe(5250);
      expect(serverOrder.paymentStatus).toBe('pending');
    });

    it('server independently calculates online order with 100% FREE shipping (₹0)', async () => {
      const response = await handleCreateServerOrder(undefined, {
        customerName: 'Priya Sundaram',
        customerEmail: 'priya@example.com',
        shippingAddress: {
          fullName: 'Priya Sundaram',
          phone: '9876543210',
          streetAddress: '15 Anna Salai',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600002',
          country: 'India'
        },
        items: [
          {
            productId: 'prod-server-test-2',
            quantity: 2,
            price: 2500,
            product: { price: 2500, name: 'Kanchipuram Silk' }
          }
        ],
        paymentMethod: 'razorpay',
        razorpayPaymentId: 'pay_online_full_prepaid_001'
      });

      expect(response.success).toBe(true);
      const serverOrder = response.order;

      // Subtotal = 2 * 2500 = 5000
      expect(serverOrder.subtotal).toBe(5000);
      // Tax = 5% of 5000 = 250
      expect(serverOrder.tax).toBe(250);
      // Online Shipping = 0 (100% FREE)
      expect(serverOrder.shippingFee).toBe(0);
      // Grand Total = 5000 + 250 + 0 = 5250
      expect(serverOrder.total).toBe(5250);

      // Online prepaid: COD advance = 0, Balance due = 0
      expect(serverOrder.codAdvanceAmount).toBe(0);
      expect(serverOrder.codBalanceDue).toBe(0);
      expect(serverOrder.paymentStatus).toBe('paid');
    });

    it('rejects order with invalid or missing customer/shipping parameters', async () => {
      await expect(
        handleCreateServerOrder(undefined, {
          customerName: '',
          customerEmail: 'test@example.com',
          shippingAddress: null,
          items: []
        })
      ).rejects.toThrow('INVALID_ARGUMENT');
    });

    it('rejects COD order creation if upfront ₹89 advance payment authorization is missing', async () => {
      await expect(
        handleCreateServerOrder(undefined, {
          customerName: 'Aarti Menon',
          customerEmail: 'aarti@example.com',
          shippingAddress: {
            fullName: 'Aarti Menon',
            phone: '9876543210',
            streetAddress: '12 Temple St',
            city: 'Chennai',
            state: 'TN',
            postalCode: '600001',
            country: 'India'
          },
          items: [{ productId: 'p1', quantity: 1, price: 5000, product: { price: 5000, name: 'Saree' } }],
          paymentMethod: 'cash_on_delivery'
          // razorpayPaymentId omitted
        })
      ).rejects.toThrow('FAILED_PRECONDITION: Cash on Delivery orders require an upfront ₹89 courier advance payment authorization.');
    });

    it('rejects order creation with duplicate/replayed razorpayPaymentId in orderService', async () => {
      // First order with payment ID
      await orderService.createOrder({
        customerId: 'patron-777',
        customerName: 'Deepa S',
        customerEmail: 'deepa@example.com',
        shippingAddress: {
          fullName: 'Deepa S',
          phone: '9876543210',
          streetAddress: '42 Sea View',
          city: 'Chennai',
          state: 'TN',
          postalCode: '600001',
          country: 'India'
        },
        items: [{ product: { id: 'saree-p1', name: 'Silk Saree', price: 4000, images: ['/img.jpg'] } as any, quantity: 1 }],
        subtotal: 4000,
        discount: 0,
        tax: 200,
        shippingFee: 89,
        total: 4289,
        paymentMethod: 'cash_on_delivery',
        razorpayPaymentId: 'pay_duplicate_replay_target_001'
      });

      // Second order attempting to reuse the same payment ID
      await expect(
        orderService.createOrder({
          customerId: 'patron-888',
          customerName: 'Attacker Replay',
          customerEmail: 'attacker@example.com',
          shippingAddress: {
            fullName: 'Attacker Replay',
            phone: '9876543210',
            streetAddress: '43 Sea View',
            city: 'Chennai',
            state: 'TN',
            postalCode: '600001',
            country: 'India'
          },
          items: [{ product: { id: 'saree-p1', name: 'Silk Saree', price: 4000, images: ['/img.jpg'] } as any, quantity: 1 }],
          subtotal: 4000,
          discount: 0,
          tax: 200,
          shippingFee: 89,
          total: 4289,
          paymentMethod: 'cash_on_delivery',
          razorpayPaymentId: 'pay_duplicate_replay_target_001'
        })
      ).rejects.toThrow('FAILED_PRECONDITION: Payment authorization ID has already been utilized for an existing order.');
    }, 30000);
  });

  describe('5. Safe Repeatable Migration & Historical Preservation', () => {
    it('migrates legacy 100 shipping fee to 89, but preserves subsequent admin customizations', () => {
      // Setup legacy storage with standardShippingFee: 100 and unmigrated flag
      const legacySettings = {
        ...storageService.getSettings(),
        standardShippingFee: 100,
        expressShippingFee: 100,
        _shippingMigratedV2: false
      };
      storageService.saveSettings(legacySettings as any);

      // First read triggers migration
      const migrated = storageService.getSettings();
      expect(migrated.standardShippingFee).toBe(89);
      expect((migrated as any)._shippingMigratedV2).toBe(true);

      // Admin explicitly changes standardShippingFee to 120 (e.g., custom festive remote delivery)
      migrated.standardShippingFee = 120;
      storageService.saveSettings(migrated);

      // Subsequent read preserves admin override
      const preserved = storageService.getSettings();
      expect(preserved.standardShippingFee).toBe(120);
    });

    it('preserves historical order records without recalculation or mutation', async () => {
      // Create a historical order with legacy attributes
      const historicalOrder = {
        id: 'ord-hist-999',
        orderNumber: 'MT-HIST-999',
        customerId: 'hist-user-1',
        customerName: 'Historical Patron',
        customerEmail: 'hist@example.com',
        shippingAddress: {} as any,
        items: [],
        subtotal: 3000,
        discount: 0,
        tax: 150,
        shippingFee: 100, // Legacy fee
        total: 3250,      // Legacy total
        paymentMethod: 'razorpay' as any,
        paymentStatus: 'paid' as any,
        orderStatus: 'delivered' as any,
        timeline: [],
        createdAt: '2025-10-01T00:00:00Z',
        updatedAt: '2025-10-01T00:00:00Z'
      };

      storageService.saveOrders([historicalOrder]);

      const retrieved = storageService.getOrders();
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].shippingFee).toBe(100);
      expect(retrieved[0].total).toBe(3250);
    });
  });
});

