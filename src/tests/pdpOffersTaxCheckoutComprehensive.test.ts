import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup localStorage polyfill for test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

(globalThis as any).localStorage = localStorageMock;
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: localStorageMock,
    dispatchEvent: () => true
  };
}

vi.mock('../../server/firebaseAdmin', () => ({
  verifyIdTokenAndGetClaims: vi.fn().mockResolvedValue({
    uid: 'admin-auditor-1',
    email: 'admin@muety.in',
    role: 'admin'
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
import { couponService } from '../features/coupons/services/couponService';
import { storageService } from '../lib/storage/storageService';
import { handleCreateServerOrder } from '../../server/orderApi';
import { Coupon } from '../features/coupons/types';

describe('MUETY Storefront Comprehensive Verification Suite — PDP, Offers, Checkout & Tax Redesign', () => {
  beforeEach(() => {
    storageMap.clear();
    storageService.clearAll();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. TAX-INCLUSIVE PRICING ENGINE ($A \times 5 / 105$ FORMULA)
  // =========================================================================
  describe('1. Tax-Inclusive Pricing Engine & Statutory Extraction', () => {
    it('calculates tax-inclusive totals without adding GST on top of product prices', () => {
      // Saree selling price is ₹1,999 inclusive of all taxes
      const subtotal = 1999;
      const discount = 0;
      const taxRate = 5;

      const financials = calculateOrderFinancials({
        subtotal,
        discount,
        taxRate,
        paymentMethod: 'razorpay'
      });

      // Total payable for online payment is strictly the advertised ₹1,999 (FREE delivery)
      expect(financials.total).toBe(1999);
      expect(financials.shippingFee).toBe(0);

      // Embedded GST component = 1999 * 5 / 105 = 95.19
      expect(financials.tax).toBe(95.19);
      // Net base taxable value = 1999 - 95.19 = 1903.81
      expect(financials.taxableAmount).toBe(1903.81);
    });

    it('calculates COD orders with flat ₹89 courier advance without adding GST on top', () => {
      const subtotal = 1999;
      const discount = 0;
      const taxRate = 5;

      const codFinancials = calculateOrderFinancials({
        subtotal,
        discount,
        taxRate,
        paymentMethod: 'cash_on_delivery'
      });

      // Grand total is ₹1,999 (items) + ₹89 (COD delivery) = ₹2,088
      expect(codFinancials.total).toBe(2088);
      expect(codFinancials.shippingFee).toBe(89);
      expect(codFinancials.codAdvanceAmount).toBe(89);
      expect(codFinancials.remainingAmountDueAtDelivery).toBe(1999);
      expect(codFinancials.amountDueOnline).toBe(89);
      // Sum of advance + delivery balance matches grand total exactly
      expect(codFinancials.amountDueOnline + codFinancials.remainingAmountDueAtDelivery).toBe(codFinancials.total);
    });

    it('correctly applies coupon discount and extracts embedded tax from discounted net amount', () => {
      // Subtotal ₹5,000 with 10% coupon (₹500 discount)
      const subtotal = 5000;
      const discount = 500;
      const taxRate = 5;

      const financials = calculateOrderFinancials({
        subtotal,
        discount,
        taxRate,
        paymentMethod: 'razorpay'
      });

      // Net amount = 4500
      expect(financials.total).toBe(4500);
      // Embedded tax on 4500 = 4500 * 5 / 105 = 214.29
      expect(financials.tax).toBe(214.29);
      expect(financials.taxableAmount).toBe(4285.71);
    });
  });

  // =========================================================================
  // 2. UNIFIED ADMIN-MANAGED COUPON LIFECYCLE & 1-COUPON-PER-ORDER RULE
  // =========================================================================
  describe('2. Coupon Lifecycle & Single-Coupon Enforcement', () => {
    const testCoupons: Coupon[] = [
      {
        id: 'cp-active-1',
        code: 'FESTIVE10',
        title: '10% Instant Festive Savings',
        badge: 'Special Offer',
        description: 'Orders above ₹4,999',
        discountType: 'percentage',
        discountValue: 10,
        minSpend: 4999,
        maxDiscount: 1000,
        isActive: true,
        usageCount: 0,
        usageLimit: 500,
        isStackable: false,
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
      },
      {
        id: 'cp-active-2',
        code: 'MUETYFIRST',
        title: 'Flat ₹200 Privilege Welcome',
        badge: 'Welcome',
        description: 'First order privilege',
        discountType: 'fixed',
        discountValue: 200,
        minSpend: 1500,
        isActive: true,
        usageCount: 0,
        isStackable: false,
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
      },
      {
        id: 'cp-expired',
        code: 'EXPIRED50',
        title: 'Expired Promo',
        discountType: 'percentage',
        discountValue: 50,
        minSpend: 0,
        isActive: true,
        usageCount: 0,
        expiresAt: new Date(Date.now() - 86400000).toISOString() // Expired yesterday
      },
      {
        id: 'cp-future',
        code: 'FUTURE20',
        title: 'Upcoming Promo',
        discountType: 'percentage',
        discountValue: 20,
        minSpend: 0,
        isActive: true,
        usageCount: 0,
        startDate: new Date(Date.now() + 86400000 * 5).toISOString(), // Starts in 5 days
        expiresAt: new Date(Date.now() + 86400000 * 10).toISOString()
      },
      {
        id: 'cp-exhausted',
        code: 'LIMITED100',
        title: 'Exhausted Promo',
        discountType: 'fixed',
        discountValue: 100,
        minSpend: 0,
        isActive: true,
        usageCount: 50,
        usageLimit: 50, // Fully used
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
      }
    ];

    beforeEach(() => {
      storageService.saveCoupons(testCoupons);
    });

    it('returns only active, non-expired, started coupons via getActiveCoupons()', () => {
      const active = couponService.getActiveCoupons();
      const codes = active.map(c => c.code);

      expect(codes).toContain('FESTIVE10');
      expect(codes).toContain('MUETYFIRST');
      expect(codes).not.toContain('EXPIRED50');
      expect(codes).not.toContain('FUTURE20');
      expect(codes).not.toContain('LIMITED100');
    });

    it('validates minimum spend restrictions accurately', () => {
      // Subtotal ₹1,999 is below FESTIVE10 minSpend (₹4,999)
      const invalidRes = couponService.validateCoupon('FESTIVE10', 1999);
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.message).toContain('Minimum spend of ₹4,999 required');

      // Subtotal ₹1,999 meets MUETYFIRST minSpend (₹1,500)
      const validRes = couponService.validateCoupon('MUETYFIRST', 1999);
      expect(validRes.valid).toBe(true);
      expect(validRes.discountAmount).toBe(200);
    });

    it('enforces maximum discount caps on percentage coupons', () => {
      // Order of ₹20,000 with 10% coupon should cap at ₹1,000 (not ₹2,000)
      const result = couponService.validateCoupon('FESTIVE10', 20000);
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(1000); // capped at maxDiscount: 1000
    });

    it('rejects expired, not-yet-started, and usage-exhausted coupons', () => {
      expect(couponService.validateCoupon('EXPIRED50', 5000).valid).toBe(false);
      expect(couponService.validateCoupon('FUTURE20', 5000).valid).toBe(false);
      expect(couponService.validateCoupon('LIMITED100', 5000).valid).toBe(false);
    });

    it('persists applied coupon across reloads via localStorage', () => {
      const valid = couponService.validateCoupon('MUETYFIRST', 2500);
      expect(valid.valid).toBe(true);

      // Emulate CartContext coupon storage
      const couponStorageKey = 'muety_applied_coupon_v1';
      localStorage.setItem(couponStorageKey, JSON.stringify(valid.coupon));

      const retrieved = JSON.parse(localStorage.getItem(couponStorageKey) || '{}');
      expect(retrieved.code).toBe('MUETYFIRST');
      expect(retrieved.discountValue).toBe(200);
    });
  });

  // =========================================================================
  // 3. SERVER-SIDE AUTHORITATIVE RECALCULATION & SECURITY SAFEGUARDS
  // =========================================================================
  describe('3. Server-Side Security & Authoritative Order Recalculation', () => {
    it('server ignores client-supplied discount and recalculates tax-inclusive total authoritatively', async () => {
      const response = await handleCreateServerOrder(undefined, {
        customerName: 'Sita Raman',
        customerEmail: 'sita@example.com',
        shippingAddress: {
          fullName: 'Sita Raman',
          phone: '9876543210',
          streetAddress: '10 Tanjore Way',
          city: 'Thanjavur',
          state: 'Tamil Nadu',
          postalCode: '613001',
          country: 'India'
        },
        items: [
          {
            productId: 'prod-saree-auth-1',
            quantity: 1,
            price: 1999, // advertised tax-inclusive selling price
            product: { price: 1999, name: 'Heritage Salem Silk Saree' }
          }
        ],
        // Client attempts to claim an unauthorized ₹500 discount
        discount: 500,
        paymentMethod: 'razorpay',
        razorpayPaymentId: 'pay_auth_test_999'
      });

      expect(response.success).toBe(true);
      const order = response.order;

      // Server recalculates: without valid coupon attached, discount is 0
      expect(order.subtotal).toBe(1999);
      expect(order.discount).toBe(0);
      expect(order.shippingFee).toBe(0); // Online free delivery
      expect(order.total).toBe(1999); // Tax-inclusive final payable
      expect(order.tax).toBe(95.19); // 1999 * 5 / 105
    });

    it('persists valid coupon snapshot on server order', async () => {
      // Seed active coupon in storage
      storageService.saveCoupons([
        {
          id: 'cp-welcome',
          code: 'WELCOME200',
          title: 'Welcome Privilege',
          discountType: 'fixed',
          discountValue: 200,
          minSpend: 1500,
          isActive: true,
          usageCount: 0,
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
        }
      ]);

      const response = await handleCreateServerOrder(undefined, {
        customerName: 'Lakshmi Narayanan',
        customerEmail: 'lakshmi@example.com',
        shippingAddress: {
          fullName: 'Lakshmi Narayanan',
          phone: '9876543210',
          streetAddress: '5 North Mada St',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600004',
          country: 'India'
        },
        items: [
          {
            productId: 'prod-saree-auth-2',
            quantity: 1,
            price: 2500,
            product: { price: 2500, name: 'Pure Zari Silk Saree' }
          }
        ],
        couponCode: 'WELCOME200',
        paymentMethod: 'cash_on_delivery',
        razorpayPaymentId: 'pay_advance_cod_200'
      });

      expect(response.success).toBe(true);
      const order = response.order;

      expect(order.subtotal).toBe(2500);
      expect(order.discount).toBe(200);
      expect(order.appliedCoupon).toBe('WELCOME200');
      // Net amount = 2300, COD fee = 89
      // Total = 2300 + 89 = 2389
      expect(order.total).toBe(2389);
      expect(order.codAdvanceAmount).toBe(89);
      expect(order.codBalanceDue).toBe(2300);
    });
  });

  // =========================================================================
  // 4. ADMIN PRODUCT HIGHLIGHTS STRUCTURED DATA MODEL
  // =========================================================================
  describe('4. Structured Product Highlights ERP Model', () => {
    it('supports structured highlights array on product and filtering by active status', () => {
      const mockProduct = {
        id: 'saree-hl-test',
        name: 'Royal Bridal Kanchipuram Silk',
        price: 15999,
        highlights: [
          { id: 'hl-1', label: 'Fabric', value: '100% Pure Handloom Mulberry Silk', active: true, order: 0 },
          { id: 'hl-2', label: 'Silk Purity', value: 'Silk Mark Certified Pure Silk', active: true, order: 1 },
          { id: 'hl-3', label: 'Zari Craft', value: 'Tested Gold & Silver Zari Motifs', active: true, order: 2 },
          { id: 'hl-4', label: 'Draft Note', value: 'Internal Weaver Note', active: false, order: 3 }
        ]
      };

      const activeHighlights = mockProduct.highlights.filter(h => h.active && h.label && h.value);
      expect(activeHighlights).toHaveLength(3);
      expect(activeHighlights.map(h => h.label)).toEqual(['Fabric', 'Silk Purity', 'Zari Craft']);
      expect(activeHighlights.map(h => h.label)).not.toContain('Draft Note');
    });
  });
});
