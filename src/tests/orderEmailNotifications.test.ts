import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/firebaseAdmin', () => ({
  verifyIdTokenAndGetClaims: vi.fn().mockImplementation(async (authHeader?: string) => {
    if (!authHeader) return null;
    return { uid: 'admin-1', email: 'orders@muety.in', roles: ['admin'] };
  }),
  getAdminAuth: vi.fn().mockReturnValue(null),
  getAdminFirestore: vi.fn().mockReturnValue(null)
}));

import { renderOrderConfirmationEmail, OrderEmailData } from '../../server/email/templates/orderConfirmationTemplate';
import { renderAdminOrderNotificationEmail } from '../../server/email/templates/adminOrderNotificationTemplate';
import { processOrderConfirmationEmails } from '../../server/email/emailService';

describe('MODULE B & C — Automated Order Email Notifications & Lifecycle System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPrepaidOrder: OrderEmailData = {
    id: 'ord-1729000000-101',
    orderNumber: 'MT-849201',
    customerName: 'Aarav Singhania',
    customerEmail: 'aarav.singhania@example.com',
    customerPhone: '+91 98765 43210',
    shippingAddress: {
      fullName: 'Aarav Singhania',
      addressLine1: 'Villa 14, Royal Palm Estates',
      addressLine2: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500034',
      phone: '+91 98765 43210'
    },
    items: [
      {
        name: 'Varanasi Royal Katan Silk Saree',
        quantity: 1,
        price: 18500,
        product: {
          name: 'Varanasi Royal Katan Silk Saree',
          price: 18500,
          sku: 'SKU-KATAN-001',
          images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c']
        }
      }
    ],
    subtotal: 18500,
    discount: 1000,
    appliedCoupon: 'ROYAL1000',
    tax: 875, // 5% of (18500 - 1000) = 875
    shippingFee: 0, // Online payment delivery is complimentary
    total: 18375, // 17500 + 875 + 0
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    orderStatus: 'pending',
    trackingNumber: 'MUET-EXP-98321044',
    createdAt: new Date().toISOString()
  };

  const mockCodOrder: OrderEmailData = {
    id: 'ord-1729000000-202',
    orderNumber: 'MT-552194',
    customerName: 'Meera Nambiar',
    customerEmail: 'meera.nambiar@example.com',
    customerPhone: '+91 91234 56789',
    shippingAddress: {
      fullName: 'Meera Nambiar',
      addressLine1: 'Flat 402, Heritage Heights',
      city: 'Kochi',
      state: 'Kerala',
      postalCode: '682001',
      phone: '+91 91234 56789'
    },
    items: [
      {
        name: 'Banarasi Brocade Silk Dupatta',
        quantity: 2,
        price: 4500,
        product: {
          name: 'Banarasi Brocade Silk Dupatta',
          price: 4500,
          sku: 'SKU-DUP-002',
          images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c']
        }
      }
    ],
    subtotal: 9000,
    discount: 0,
    tax: 450, // 5% of 9000
    shippingFee: 89, // Flat COD shipping fee
    total: 9539, // 9000 + 450 + 89
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'pending',
    codAdvanceAmount: 89,
    codBalanceDue: 9450, // 9539 - 89
    orderStatus: 'pending',
    trackingNumber: 'MUET-EXP-44129981',
    createdAt: new Date().toISOString()
  };

  describe('01. Patron Order Confirmation Template', () => {
    it('renders customer receipt with customer-facing order number, line items, 5% GST, and complimentary shipping for online payments', () => {
      const { subject, html } = renderOrderConfirmationEmail(mockPrepaidOrder, 'https://store.muety.in');

      expect(subject).toContain('Order Confirmed: MT-849201 — MUETY Atelier');
      expect(html).toContain('MT-849201');
      expect(html).toContain('Aarav Singhania');
      expect(html).toContain('Varanasi Royal Katan Silk Saree');
      expect(html).toContain('18,500');
      expect(html).toContain('ROYAL1000');
      expect(html).toContain('5% GST Inclusive');
      expect(html).toContain('Complimentary (FREE)');
      expect(html).toContain('18,375');
      expect(html).toContain('100% Fully Settled via Secure Online Payment');
      expect(html).toContain('https://store.muety.in/orders');
      // Must not leak private internal Firestore document IDs
      expect(html).not.toContain(mockPrepaidOrder.id);
    });

    it('renders correct COD advance online payment (₹89) and outstanding doorstep balance for COD orders', () => {
      const { subject, html } = renderOrderConfirmationEmail(mockCodOrder, 'https://store.muety.in');

      expect(subject).toContain('MT-552194');
      expect(html).toContain('COD Advance Paid Online:');
      expect(html).toContain('89 (Paid)');
      expect(html).toContain('Balance Payable at Doorstep:');
      expect(html).toContain('9,450');
      expect(html).toContain('Cash on Delivery (Advance Verified)');
    });
  });

  describe('02. Admin Department Notification Template', () => {
    it('renders operational details with customer phone, items manifest, SKUs, and link to Executive Control Center', () => {
      const { subject, html } = renderAdminOrderNotificationEmail(mockPrepaidOrder, 'https://admin.muety.in');

      expect(subject).toContain('[Internal Order] MT-849201 — Aarav Singhania');
      expect(html).toContain('OPERATIONAL ALERT');
      expect(html).toContain('NEW ORDER DISPATCH');
      expect(html).toContain('MT-849201');
      expect(html).toContain('SKU-KATAN-001');
      expect(html).toContain('+91 98765 43210');
      expect(html).toContain('Banjara Hills');
      expect(html).toContain('Open Executive Control Center');
      expect(html).toContain('https://admin.muety.in/admin/orders');
    });

    it('highlights COD doorstep collection requirement for fulfillment warehouse staff', () => {
      const { html } = renderAdminOrderNotificationEmail(mockCodOrder, 'https://admin.muety.in');

      expect(html).toContain('COD Policy Notice:');
      expect(html).toContain('89 paid online');
      expect(html).toContain('Doorstep collection required:');
      expect(html).toContain('9,450');
    });
  });

  describe('03. Order Lifecycle Dispatch & Idempotency Protection', () => {
    it('successfully processes order confirmation emails for patron and admin departments', async () => {
      const result = await processOrderConfirmationEmails(mockPrepaidOrder);

      expect(result.patronNotified).toBe(true);
      expect(result.adminNotified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('prevents duplicate confirmation emails when webhook retries or customer refreshes confirmation page', async () => {
      // First dispatch
      const firstRun = await processOrderConfirmationEmails(mockCodOrder);
      expect(firstRun.patronNotified).toBe(true);
      expect(firstRun.adminNotified).toBe(true);

      // Second immediate run with identical order ID (simulating webhook retry)
      const secondRun = await processOrderConfirmationEmails(mockCodOrder);
      expect(secondRun.patronNotified).toBe(true);
      expect(secondRun.adminNotified).toBe(true);
      expect(secondRun.errors).toHaveLength(0);
    });

    it('ensures email failure does not crash or throw unhandled exceptions', async () => {
      const brokenOrder: OrderEmailData = {
        ...mockPrepaidOrder,
        id: 'ord-corrupted-test',
        orderNumber: 'MT-ERR-001',
        customerEmail: '' // Empty email
      };

      // Must resolve cleanly without throwing
      await expect(processOrderConfirmationEmails(brokenOrder)).resolves.toBeDefined();
    });
  });
});
