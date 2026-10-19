import { describe, it, expect, beforeEach } from 'vitest';
import { orderService } from '@/features/orders/services/orderService';
import { storageService } from '@/lib/storage/storageService';
import { Order } from '@/types';

describe('MUETY Order Workflow, History & Storage Architecture', () => {
  beforeEach(() => {
    storageService.saveOrders([]);
  });

  it('1. Successfully records order in storage and retrieves it by ID and orderNumber', async () => {
    const order = await orderService.createOrder({
      customerId: 'patron-test-uid-101',
      customerName: 'Priyadharshini',
      customerEmail: 'priya@example.com',
      customerPhone: '+91 98765 43210',
      shippingAddress: {
        fullName: 'Priyadharshini',
        phone: '+91 98765 43210',
        streetAddress: '12 Temple St',
        city: 'Salem',
        state: 'Tamil Nadu',
        postalCode: '636501',
        country: 'India'
      },
      items: [
        {
          product: {
            id: 'prod-1',
            name: 'Kanchipuram Silk Saree',
            sku: 'SR-01',
            price: 18500,
            images: ['/saree.jpg'],
            stock: 10,
            availability: 'available',
            published: true,
            createdAt: new Date().toISOString()
          } as any,
          quantity: 1,
          selectedColor: 'Royal Red'
        }
      ],
      subtotal: 18500,
      discount: 0,
      tax: 925,
      shippingFee: 89,
      total: 19514,
      paymentMethod: 'razorpay',
      razorpayPaymentId: `pay_test_${Date.now()}`
    });

    expect(order.id).toBeDefined();
    expect(order.orderNumber).toMatch(/^MT-\d+/);
    expect(order.total).toBe(19514);

    // Verify stored in storageService
    const stored = storageService.getOrderById(order.id);
    expect(stored).toBeDefined();
    expect(stored?.orderNumber).toBe(order.orderNumber);

    // Verify lookup by orderNumber
    const storedByNumber = storageService.getOrderById(order.orderNumber);
    expect(storedByNumber).toBeDefined();
    expect(storedByNumber?.id).toBe(order.id);
  });

  it('2. subscribeToAllOrders merges orders and NEVER wipes local orders with empty array', () => {
    // Seed an order in local storage
    const localOrder: Order = {
      id: 'ord-test-local-01',
      orderNumber: 'MT-999888',
      customerId: 'patron-test-uid-101',
      customerName: 'Priyadharshini',
      customerEmail: 'priya@example.com',
      shippingAddress: {
        fullName: 'Priyadharshini',
        phone: '+91 98765 43210',
        streetAddress: '12 Temple St',
        city: 'Salem',
        state: 'Tamil Nadu',
        postalCode: '636501',
        country: 'India'
      },
      items: [],
      subtotal: 18500,
      discount: 0,
      tax: 925,
      shippingFee: 89,
      total: 19514,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'pending',
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.createOrder(localOrder);
    expect(storageService.getOrders().length).toBe(1);

    let deliveredOrders: Order[] = [];
    const unsub = orderService.subscribeToAllOrders((orders) => {
      deliveredOrders = orders;
    });

    // Initial callback delivers the local orders
    expect(deliveredOrders.length).toBeGreaterThanOrEqual(1);
    expect(deliveredOrders.some(o => o.id === 'ord-test-local-01')).toBe(true);

    // Local storage still preserves the order
    expect(storageService.getOrders().length).toBeGreaterThanOrEqual(1);

    unsub();
  });

  it('3. subscribeToCustomerOrders returns orders matching customerId OR customerEmail', () => {
    // Seed order with customerId
    const order1: Order = {
      id: 'ord-cust-01',
      orderNumber: 'MT-111111',
      customerId: 'uid-abc-123',
      customerName: 'Kavitha',
      customerEmail: 'kavitha@example.com',
      shippingAddress: { fullName: 'Kavitha', phone: '9876543210', streetAddress: '1st Cross', city: 'Salem', state: 'Tamil Nadu', postalCode: '636001', country: 'India' },
      items: [],
      subtotal: 10000,
      discount: 0,
      tax: 500,
      shippingFee: 89,
      total: 10589,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'pending',
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Seed order placed before login with matching email
    const order2: Order = {
      id: 'ord-cust-02',
      orderNumber: 'MT-222222',
      customerId: 'guest-previous-session',
      customerName: 'Kavitha',
      customerEmail: 'kavitha@example.com',
      shippingAddress: { fullName: 'Kavitha', phone: '9876543210', streetAddress: '1st Cross', city: 'Salem', state: 'Tamil Nadu', postalCode: '636001', country: 'India' },
      items: [],
      subtotal: 15000,
      discount: 0,
      tax: 750,
      shippingFee: 89,
      total: 15839,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'pending',
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.createOrder(order1);
    storageService.createOrder(order2);

    let customerOrders: Order[] = [];
    const unsub = orderService.subscribeToCustomerOrders(
      'uid-abc-123',
      (orders) => {
        customerOrders = orders;
      },
      undefined,
      'kavitha@example.com'
    );

    expect(customerOrders.length).toBe(2);
    expect(customerOrders.some(o => o.id === 'ord-cust-01')).toBe(true);
    expect(customerOrders.some(o => o.id === 'ord-cust-02')).toBe(true);

    unsub();
  });

  it('4. subscribeToOrder immediately resolves existing order from cache and does not return null', () => {
    const testOrder: Order = {
      id: 'ord-lookup-01',
      orderNumber: 'MT-777666',
      customerId: 'uid-test',
      customerName: 'Aishwarya',
      customerEmail: 'aishwarya@example.com',
      shippingAddress: { fullName: 'Aishwarya', phone: '9876543210', streetAddress: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', postalCode: '600040', country: 'India' },
      items: [],
      subtotal: 12000,
      discount: 0,
      tax: 600,
      shippingFee: 89,
      total: 12689,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'pending',
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.createOrder(testOrder);

    let receivedOrder: Order | null = null;
    const unsub = orderService.subscribeToOrder('ord-lookup-01', (order) => {
      receivedOrder = order;
    });

    expect(receivedOrder).not.toBeNull();
    const finalOrder = receivedOrder as unknown as Order;
    expect(finalOrder?.id).toBe('ord-lookup-01');
    expect(finalOrder?.orderNumber).toBe('MT-777666');

    unsub();
  });

  it('5. updateOrderTracking updates trackingNumber, courier, trackingCarrier and adds dispatch timeline event', async () => {
    const testOrder: Order = {
      id: 'ord-track-test-01',
      orderNumber: 'MT-950061',
      customerId: 'uid-mohan-kalvi',
      customerName: 'Mohan Kalvi',
      customerEmail: 'kalvimohan8@gmail.com',
      shippingAddress: { fullName: 'Mohan Kalvi', phone: '09385791540', streetAddress: 'Salem Main Rd', city: 'Salem', state: 'Tamil Nadu', postalCode: '636501', country: 'India' },
      items: [],
      subtotal: 5000,
      discount: 0,
      tax: 250,
      shippingFee: 89,
      total: 5339,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      trackingNumber: 'MUET-EXP-93914477',
      trackingCarrier: 'MUETY Global Express',
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.createOrder(testOrder);

    const updated = await orderService.updateOrderTracking('ord-track-test-01', {
      trackingNumber: 'BLUEDART-987654321',
      courier: 'Bluedart Express',
      trackingCarrier: 'Bluedart Express',
      statusNote: 'Dispatched from Salem Atelier studio'
    });

    expect(updated).toBeDefined();
    expect(updated?.trackingNumber).toBe('BLUEDART-987654321');
    expect(updated?.courier).toBe('Bluedart Express');
    expect(updated?.trackingCarrier).toBe('Bluedart Express');
    expect(updated?.timeline.some(t => t.label.includes('Bluedart Express'))).toBe(true);

    // Verify persisted in storageService
    const inStorage = storageService.getOrderById('ord-track-test-01');
    expect(inStorage?.trackingNumber).toBe('BLUEDART-987654321');
    expect(inStorage?.courier).toBe('Bluedart Express');

    // Also verify lookup by orderNumber succeeds
    const byNumber = await orderService.updateOrderTracking('MT-950061', {
      trackingNumber: 'DTDC-555444333',
      courier: 'DTDC Courier',
      trackingCarrier: 'DTDC Courier'
    });
    expect(byNumber?.trackingNumber).toBe('DTDC-555444333');
    expect(byNumber?.courier).toBe('DTDC Courier');
  });

  it('6. updateOrderStatus updates status matching by orderNumber or id', async () => {
    const testOrder: Order = {
      id: 'ord-status-test-01',
      orderNumber: 'MT-609661',
      customerId: 'uid-vignesh',
      customerName: 'vignesh',
      customerEmail: 'vignesh.admin@muety.in',
      shippingAddress: { fullName: 'vignesh', phone: '07603967190', streetAddress: 'Salem', city: 'Salem', state: 'Tamil Nadu', postalCode: '636501', country: 'India' },
      items: [],
      subtotal: 4500,
      discount: 0,
      tax: 225,
      shippingFee: 89,
      total: 4814,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'pending',
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.createOrder(testOrder);

    // Update using orderNumber
    const updated = await orderService.updateOrderStatus('MT-609661', 'out_for_delivery');
    expect(updated).toBeDefined();
    expect(updated?.orderStatus).toBe('out_for_delivery');

    const inStorage = storageService.getOrderById('ord-status-test-01');
    expect(inStorage?.orderStatus).toBe('out_for_delivery');
  });
});

