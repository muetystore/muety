import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

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

import { customerService, mergeCustomerProfiles } from '@/features/customers/services/customerService';
import { storageService } from '@/lib/storage/storageService';
import { authService } from '@/features/auth/services/authService';
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

describe('MUETY — Patron ID Privacy & CRM Email Synchronization Suite', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    storageService.saveUsers([]);
    storageService.saveOrders([]);
    (authService as any).setCurrentUser(null);
    vi.clearAllMocks();
  });

  // Scenario 1: Phone-authenticated customer with no Google account sees 'Not connected' for email
  it('Scenario 1: Phone-authenticated customer with no Google account sees "Not connected" for email and no fabricated email', () => {
    const phoneCustomer: UserProfile = {
      uid: 'cust-phone-9385791540',
      email: '',
      phoneNumber: '+919385791540',
      displayName: 'Karthik Raja',
      role: 'customer',
      connectedProviders: ['phone'],
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(phoneCustomer);
    (authService as any).setCurrentUser(phoneCustomer);

    const retrieved = customerService.getCustomerById('cust-phone-9385791540');
    expect(retrieved).toBeDefined();
    expect(retrieved?.email).toBe('');
    expect(retrieved?.email).not.toBe('customer@muety.com');

    const status = authService.getConnectedStatus(phoneCustomer);
    expect(status.isGoogleConnected).toBe(false);
    expect(status.googleEmail).toBeNull();
    expect(status.isPhoneConnected).toBe(true);
    expect(status.maskedPhone).toContain('93*** **540');
  });

  // Scenario 2: Google-authenticated customer sees the correct verified email in storefront and CRM
  it('Scenario 2: Google-authenticated customer sees the correct verified email in storefront and CRM', () => {
    const googleCustomer: UserProfile = {
      uid: 'cust-google-ananya',
      email: 'ananya.sharma@gmail.com',
      displayName: 'Ananya Sharma',
      role: 'customer',
      connectedProviders: ['google.com'],
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(googleCustomer);
    (authService as any).setCurrentUser(googleCustomer);

    const crmCustomer = customerService.getCustomerById('cust-google-ananya');
    expect(crmCustomer?.email).toBe('ananya.sharma@gmail.com');

    const status = authService.getConnectedStatus(googleCustomer);
    expect(status.isGoogleConnected).toBe(true);
    expect(status.googleEmail).toBe('ananya.sharma@gmail.com');
  });

  // Scenario 3: Phone-authenticated customer who links Google sees the correct email in both places
  it('Scenario 3: Phone-authenticated customer who links Google sees correct email in both places without creating duplicate records', async () => {
    const initialPhoneCustomer: UserProfile = {
      uid: 'cust-link-flow-001',
      email: '',
      phoneNumber: '+919876543210',
      displayName: 'Priyadarshini Sundaram',
      role: 'customer',
      connectedProviders: ['phone'],
      createdAt: '2026-01-10T10:00:00.000Z'
    };

    storageService.saveUser(initialPhoneCustomer);
    (authService as any).setCurrentUser(initialPhoneCustomer);

    // Link Google with verified email
    const linked = await authService.linkGoogleAccount(false, 'priya.sundaram@gmail.com');

    // UID must be strictly preserved
    expect(linked.uid).toBe('cust-link-flow-001');
    expect(linked.email).toBe('priya.sundaram@gmail.com');
    expect(linked.displayName).toBe('Priyadarshini Sundaram');
    expect(linked.connectedProviders).toContain('google.com');
    expect(linked.connectedProviders).toContain('phone');

    // Check CRM view
    const crmCustomer = customerService.getCustomerById('cust-link-flow-001');
    expect(crmCustomer?.email).toBe('priya.sundaram@gmail.com');
    expect(crmCustomer?.phoneNumber).toBe('+919876543210');

    // Ensure total customer count is still 1 (no duplicate created)
    const allCustomers = storageService.getUsers().filter(u => u.uid === 'cust-link-flow-001');
    expect(allCustomers).toHaveLength(1);
  });

  // Scenario 4: Editing a customer's name does not erase email or verified phone number
  it('Scenario 4: Editing customer name does not erase email or verified phone number in storefront or CRM', async () => {
    const customer: UserProfile = {
      uid: 'cust-edit-name-001',
      email: 'mohan.kumar@gmail.com',
      phoneNumber: '+919385791540',
      displayName: 'Mohan',
      fullName: 'Mohan',
      role: 'customer',
      connectedProviders: ['google.com', 'phone'],
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(customer);
    (authService as any).setCurrentUser(customer);

    // Storefront profile name update
    const updatedStorefront = await authService.updateCustomerProfile({ displayName: 'Mohan Kumar' });
    expect(updatedStorefront.displayName).toBe('Mohan Kumar');
    expect(updatedStorefront.email).toBe('mohan.kumar@gmail.com');
    expect(updatedStorefront.phoneNumber).toBe('+919385791540');

    // CRM contact name update
    const updatedCrm = await customerService.updateCustomerContact('cust-edit-name-001', {
      displayName: 'Dr. Mohan Kumar',
      phoneNumber: '+919385791540'
    });
    expect(updatedCrm.displayName).toBe('Dr. Mohan Kumar');
    expect(updatedCrm.email).toBe('mohan.kumar@gmail.com');
    expect(updatedCrm.phoneNumber).toBe('+919385791540');
  });

  // Scenario 5: Refreshing the CRM preserves the correct authentication email
  it('Scenario 5: Refreshing CRM preserves correct authentication email and does not substitute customer@muety.com', () => {
    const phoneCustomer: UserProfile = {
      uid: 'cust-refresh-phone',
      email: '',
      phoneNumber: '+919443322110',
      displayName: 'Lakshmi V',
      role: 'customer',
      createdAt: new Date().toISOString()
    };
    const googleCustomer: UserProfile = {
      uid: 'cust-refresh-google',
      email: 'lakshmi.v@gmail.com',
      displayName: 'Lakshmi Narayanan',
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    storageService.saveUsers([phoneCustomer, googleCustomer]);

    let receivedCustomers: UserProfile[] = [];
    const unsub = customerService.subscribeToCustomers((list) => {
      receivedCustomers = list;
    });

    const phoneInCrm = receivedCustomers.find(u => u.uid === 'cust-refresh-phone');
    const googleInCrm = receivedCustomers.find(u => u.uid === 'cust-refresh-google');

    expect(phoneInCrm?.email).toBe('');
    expect(phoneInCrm?.email).not.toBe('customer@muety.com');
    expect(googleInCrm?.email).toBe('lakshmi.v@gmail.com');

    unsub();
  });

  // Scenario 6: Linking Google does not create duplicate customer records
  it('Scenario 6: Linking Google maintains identity integrity without creating duplicate patron records', () => {
    const existingPatron: UserProfile = {
      uid: 'patron-unique-12345',
      email: '',
      phoneNumber: '+919876543210',
      displayName: 'Saravanan',
      role: 'customer',
      createdAt: '2026-01-01T00:00:00.000Z'
    };

    storageService.saveUser(existingPatron);

    // Merge incoming Google credential for the same UID
    const merged = mergeCustomerProfiles(existingPatron, {
      uid: 'patron-unique-12345',
      email: 'saravanan@heritage.com',
      connectedProviders: ['phone', 'google.com']
    });

    expect(merged.uid).toBe('patron-unique-12345');
    expect(merged.email).toBe('saravanan@heritage.com');
    expect(merged.phoneNumber).toBe('+919876543210');

    // Merging different UIDs MUST throw security error
    expect(() => {
      mergeCustomerProfiles(existingPatron, { uid: 'different-intruder-uid' });
    }).toThrow(/Cannot merge disparate customer identities with conflicting UIDs/);
  });

  // Scenario 7: Patron IDs remain available to authorized administrators
  it('Scenario 7: Patron IDs remain accessible in AdminCustomers codebase for authorized administrative use', () => {
    const adminCustomersContent = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/pages/AdminCustomers.tsx'),
      'utf-8'
    );

    // Administrative views must retain UID access
    expect(adminCustomersContent).toContain('UID: {customer.uid.substring(0, 10)}');
    expect(adminCustomersContent).toContain('Patron Record #${selectedCustomer.uid}');
    expect(adminCustomersContent).toContain('{selectedCustomer.uid}');
  });

  // Scenario 8: Patron IDs are not rendered anywhere in the customer storefront
  it('Scenario 8: Patron IDs and #MUETY- identifiers are completely hidden from customer-facing storefront views', () => {
    const accountPageContent = fs.readFileSync(
      path.join(process.cwd(), 'src/features/customers/pages/AccountPage.tsx'),
      'utf-8'
    );
    const headerContent = fs.readFileSync(
      path.join(process.cwd(), 'src/shared/components/ui/Header.tsx'),
      'utf-8'
    );

    // No '#MUETY-{user' or 'Patron ID: #MUETY-' in AccountPage
    expect(accountPageContent).not.toContain('#MUETY-{user');
    expect(accountPageContent).not.toContain('Patron ID: #MUETY-');
    expect(accountPageContent).not.toContain('Patron ID');

    // No 'Patron ID: #MUETY-' in Header dropdown or drawers
    expect(headerContent).not.toContain('Patron ID: #MUETY-');
    expect(headerContent).not.toContain('#MUETY-{user.uid');
  });

  // Scenario 9: Existing orders, addresses, wishlist and account navigation continue to work
  it('Scenario 9: Customer address, order metrics, and wishlist relationships continue to function seamlessly', async () => {
    const customer: UserProfile = {
      uid: 'cust-orders-addr-001',
      email: 'orders.test@muety.in',
      displayName: 'Revathi S',
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(customer);

    // 1. Add Address
    const newAddr: Address = {
      fullName: 'Revathi S',
      phone: '+919876543210',
      streetAddress: '10 Handloom Street',
      city: 'Kanchipuram',
      state: 'Tamil Nadu',
      postalCode: '631501',
      country: 'India',
      isDefault: true
    };
    const withAddress = await customerService.addCustomerAddress('cust-orders-addr-001', newAddr);
    expect(withAddress.addresses).toHaveLength(1);
    expect(withAddress.addresses![0].city).toBe('Kanchipuram');

    // 2. Add Order
    const order: Order = {
      id: 'ord-test-revathi-1',
      orderNumber: 'MUE-2026-9999',
      customerId: 'cust-orders-addr-001',
      customerName: 'Revathi S',
      customerEmail: 'orders.test@muety.in',
      customerPhone: '+919876543210',
      items: [],
      subtotal: 45000,
      discount: 0,
      tax: 0,
      shippingFee: 0,
      total: 45000,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      shippingAddress: newAddr,
      billingAddress: newAddr,
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.saveOrders([order]);

    // 3. Verify metrics calculation
    const metrics = customerService.calculateCustomerMetrics(withAddress, [order]);
    expect(metrics.totalValidOrders).toBe(1);
    expect(metrics.netLifetimeSpend).toBe(45000);
    expect(metrics.paidOrdersCount).toBe(1);
  });

  // Scenario 10: Missing email values do not produce errors or fabricated email addresses
  it('Scenario 10: Missing, null, or empty email values do not throw errors or fabricate fake emails', () => {
    const emptyEmailCustomer: UserProfile = {
      uid: 'cust-empty-email',
      email: '',
      phoneNumber: '+919000000000',
      displayName: 'Empty Email User',
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    // Calculate metrics must not throw
    expect(() => {
      customerService.calculateCustomerMetrics(emptyEmailCustomer, []);
    }).not.toThrow();

    // Merge must not fabricate email
    const merged = mergeCustomerProfiles(emptyEmailCustomer, { displayName: 'Updated Name' });
    expect(merged.email).toBe('');
    expect(merged.email).not.toBe('customer@muety.com');

    // getCustomerById must handle safely
    storageService.saveUser(emptyEmailCustomer);
    const fetched = customerService.getCustomerById('cust-empty-email');
    expect(fetched?.email).toBe('');
  });

  // Scenario 11: Product SKU ID is hidden in store product view but preserved for admin views
  it('Scenario 11: Product SKU ID is hidden in store product view, but preserved for admin management', () => {
    const fs = require('fs');
    const path = require('path');

    const pdpContent = fs.readFileSync(
      path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
      'utf-8'
    );
    // Must NOT display SKU in product view header meta or info accordion
    expect(pdpContent).not.toContain('• SKU:');
    expect(pdpContent).not.toContain('SKU / Identifier');
    // Category is still displayed
    expect(pdpContent).toContain('{product.category}');

    // Admin views must preserve SKU
    const adminProductsContent = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/pages/AdminProducts.tsx'),
      'utf-8'
    );
    expect(adminProductsContent).toContain('SKU: {prod.sku}');

    const adminOrdersContent = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/pages/AdminOrders.tsx'),
      'utf-8'
    );
    expect(adminOrdersContent).toContain('SKU: {sku}');
  });
});
