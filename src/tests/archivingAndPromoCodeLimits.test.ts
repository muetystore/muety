import { describe, it, expect, beforeEach } from 'vitest';
import { couponService } from '../features/coupons/services/couponService';
import { orderService } from '../features/orders/services/orderService';
import { reviewService } from '../features/reviews/services/reviewService';
import { inquiryService } from '../features/inquiries/services/inquiryService';
import { customerService } from '../features/customers/services/customerService';
import { storageService } from '../lib/storage/storageService';
import { Coupon, Order, PatronReview, ContactInquiry, UserProfile } from '../types';

describe('Archiving & Privacy + Promo Code Limits Suite', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: 0
    } as any;
  });

  describe('1. Promo Code System: Per-Customer Limits & Total Redemptions', () => {
    const testOneTimeCoupon: Coupon = {
      id: 'coup-onetime-1',
      code: 'WELCOME50',
      title: 'First Order Welcome Offer',
      discountType: 'percentage',
      discountValue: 20,
      minSpend: 500,
      maxDiscount: 1000,
      expiresAt: '2028-12-31T23:59:59.000Z',
      isActive: true,
      usageCount: 0,
      usageLimit: 100, // Total store redemptions limit
      perCustomerLimit: 1, // Strictly one-time per user
      redemptions: [],
      usedByUsers: []
    };

    it('allows a customer to apply a one-time promo code on their first order', () => {
      storageService.saveCoupons([testOneTimeCoupon]);

      const userCtx = { userId: 'user-patron-101', email: 'meenakshi@example.com', phone: '9876543210' };
      const validation = couponService.validateCoupon('WELCOME50', 2500, userCtx);

      expect(validation.valid).toBe(true);
      expect(validation.discountAmount).toBe(500); // 20% of 2500
      expect(validation.message).toContain('applied successfully');
    });

    it('rejects subsequent attempts when the same user/phone attempts to reuse a one-time promo code', async () => {
      storageService.saveCoupons([testOneTimeCoupon]);

      const userCtx = { userId: 'user-patron-101', email: 'meenakshi@example.com', phone: '9876543210' };

      // Record first redemption
      await couponService.recordCouponUsage('WELCOME50', {
        ...userCtx,
        orderId: 'ORD-1001'
      });

      // Second attempt by the same user ID
      const secondValidation = couponService.validateCoupon('WELCOME50', 3000, userCtx);
      expect(secondValidation.valid).toBe(false);
      expect(secondValidation.message).toContain('already been redeemed');

      // Attempt with the same phone number (e.g. as guest)
      const guestPhoneValidation = couponService.validateCoupon('WELCOME50', 3000, { phone: '9876543210' });
      expect(guestPhoneValidation.valid).toBe(false);
      expect(guestPhoneValidation.message).toContain('already been redeemed');

      // Attempt with the same email
      const guestEmailValidation = couponService.validateCoupon('WELCOME50', 3000, { email: 'meenakshi@example.com' });
      expect(guestEmailValidation.valid).toBe(false);

      // Different user CAN still use it
      const differentUserValidation = couponService.validateCoupon('WELCOME50', 3000, {
        userId: 'user-different',
        email: 'priya@example.com',
        phone: '9123456789'
      });
      expect(differentUserValidation.valid).toBe(true);
    });

    it('enforces total store usage limit when max redemptions are exhausted', () => {
      const exhaustedCoupon: Coupon = {
        id: 'coup-limited-total',
        code: 'FLASH100',
        discountType: 'fixed',
        discountValue: 500,
        minSpend: 1000,
        expiresAt: '2028-12-31T23:59:59.000Z',
        isActive: true,
        usageCount: 50,
        usageLimit: 50 // Exactly reached
      };
      storageService.saveCoupons([exhaustedCoupon]);

      const res = couponService.validateCoupon('FLASH100', 2000, { userId: 'brand-new-user' });
      expect(res.valid).toBe(false);
      expect(res.message).toContain('maximum total redemptions');
    });
  });

  describe('2. Data Privacy & Archiving (Orders, Reviews, Inquiries, Patron CRM)', () => {
    it('Order Archiving: safely archives and unarchives orders without destroying records', async () => {
      const testOrder: Order = {
        id: 'ord-test-privacy-1',
        orderNumber: 'ORD-7777',
        customerId: 'cust-1',
        customerName: 'Ananya Sharma',
        customerEmail: 'ananya@example.com',
        shippingAddress: {
          id: 'addr-1',
          fullName: 'Ananya Sharma',
          phone: '+919876543210',
          streetAddress: 'Atelier Street',
          city: 'Salem',
          state: 'Tamil Nadu',
          postalCode: '636001',
          country: 'India',
          isDefault: true
        },
        items: [],
        subtotal: 5000,
        discount: 0,
        tax: 250,
        shippingFee: 0,
        total: 5250,
        paymentMethod: 'upi',
        paymentStatus: 'paid',
        orderStatus: 'delivered',
        timeline: [],
        createdAt: '2026-10-31T12:00:00.000Z',
        updatedAt: '2026-10-31T12:00:00.000Z'
      };

      storageService.createOrder(testOrder);

      // Archive order
      const archived = await orderService.archiveOrder(testOrder.id);
      expect(archived?.archived).toBe(true);
      expect(archived?.archivedAt).toBeDefined();

      // Record is PRESERVED in storage
      const fetched = storageService.getOrderById(testOrder.id);
      expect(fetched).toBeDefined();
      expect(fetched?.archived).toBe(true);

      // deleteOrder also archives rather than permanently purging
      await orderService.deleteOrder(testOrder.id);
      const stillThere = storageService.getOrderById(testOrder.id);
      expect(stillThere).toBeDefined();
      expect(stillThere?.archived).toBe(true);

      // Unarchive restores order
      const restored = await orderService.unarchiveOrder(testOrder.id);
      expect(restored?.archived).toBe(false);
    });

    it('Review Archiving: archives review and excludes it from approved/featured storefront views', async () => {
      const testReview: PatronReview = {
        id: 'rev-test-privacy-1',
        productName: 'Royal Banarasi Silk Saree',
        authorName: 'Sunita Devi',
        authorLocation: 'Bengaluru',
        rating: 5,
        quote: 'Exquisite silk and authentic zari craftsmanship.',
        verifiedPurchase: true,
        status: 'approved',
        isFeatured: true,
        createdAt: '2026-10-31T12:00:00.000Z'
      };

      await reviewService.addReview(testReview);
      expect(reviewService.getFeaturedReviews().some(r => r.id === testReview.id)).toBe(true);

      // Archive review
      await reviewService.archiveReview(testReview.id);

      // Record is preserved in all reviews
      const allRevs = reviewService.getAllReviews();
      const archivedRev = allRevs.find(r => r.id === testReview.id);
      expect(archivedRev).toBeDefined();
      expect(archivedRev?.archived).toBe(true);

      // Excluded from approved storefront queries and featured carousel
      expect(reviewService.getApprovedReviews().some(r => r.id === testReview.id)).toBe(false);
      expect(reviewService.getFeaturedReviews().some(r => r.id === testReview.id)).toBe(false);

      // Unarchive restores
      await reviewService.unarchiveReview(testReview.id);
      expect(reviewService.getApprovedReviews().some(r => r.id === testReview.id)).toBe(true);
    });

    it('Inquiry Archiving: archives inquiry while preserving communication history', async () => {
      const testInquiry: ContactInquiry = {
        id: 'inq-test-1',
        inquiryNumber: 'INQ-9901',
        name: 'Lakshmi Narayanan',
        email: 'lakshmi@example.com',
        category: 'custom_order',
        subject: 'Bridal Kanchipuram query',
        message: 'Looking for a custom crimson bridal saree',
        status: 'unread',
        createdAt: '2026-10-31T12:00:00.000Z'
      };

      inquiryService.saveInquiries([testInquiry]);

      // Archive inquiry
      await inquiryService.archiveInquiry(testInquiry.id);

      // Preserved in database
      const list = inquiryService.getInquiries();
      const archived = list.find(i => i.id === testInquiry.id);
      expect(archived).toBeDefined();
      expect(archived?.archived).toBe(true);

      // Unarchive
      await inquiryService.unarchiveInquiry(testInquiry.id);
      const restored = inquiryService.getInquiries().find(i => i.id === testInquiry.id);
      expect(restored?.archived).toBe(false);
    });

    it('Customer CRM Archiving: archives patron account without purging customer profile or addresses', async () => {
      const testUser: UserProfile = {
        uid: 'user-vip-archive-test',
        email: 'patron@muety.in',
        displayName: 'Aarohi Sen',
        createdAt: '2026-01-01T00:00:00.000Z',
        phone: '9840011223',
        customerStatus: 'VIP'
      };

      storageService.saveUsers([testUser]);

      // Archive customer
      await customerService.archiveCustomer(testUser.uid);

      // Preserved in storage
      const users = storageService.getUsers();
      const archivedUser = users.find(u => u.uid === testUser.uid);
      expect(archivedUser).toBeDefined();
      expect(archivedUser?.archived).toBe(true);

      // deleteCustomer also safely archives rather than dropping the profile
      await customerService.deleteCustomer(testUser.uid);
      const stillPreserved = storageService.getUsers().find(u => u.uid === testUser.uid);
      expect(stillPreserved).toBeDefined();
      expect(stillPreserved?.archived).toBe(true);

      // Unarchive restores patron
      await customerService.unarchiveCustomer(testUser.uid);
      const restoredUser = storageService.getUsers().find(u => u.uid === testUser.uid);
      expect(restoredUser?.archived).toBe(false);
    });
  });
});
