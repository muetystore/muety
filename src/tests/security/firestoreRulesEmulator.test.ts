import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules — Emulator Suite', () => {
  beforeAll(async () => {
    const rulesPath = resolve(__dirname, '../../../firestore.rules');
    const rules = readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: 'muetystore-emulator-test',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // 1. CUSTOMER PERMISSIONS
  describe('Customer Security Matrix', () => {
    it('allows customer to read own profile', async () => {
      const alice = testEnv.authenticatedContext('cust-alice', { roles: ['customer'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('cust-alice').set({
          uid: 'cust-alice',
          email: 'alice@muety.in',
          roles: ['customer']
        });
      });

      const doc = alice.firestore().collection('users').doc('cust-alice');
      await assertSucceeds(doc.get());
    });

    it('denies customer from reading another customer profile', async () => {
      const alice = testEnv.authenticatedContext('cust-alice', { roles: ['customer'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('cust-bob').set({
          uid: 'cust-bob',
          email: 'bob@muety.in',
          roles: ['customer']
        });
      });

      const doc = alice.firestore().collection('users').doc('cust-bob');
      await assertFails(doc.get());
    });

    it('allows customer to read own order', async () => {
      const alice = testEnv.authenticatedContext('cust-alice', { roles: ['customer'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('orders').doc('ord-101').set({
          id: 'ord-101',
          customerId: 'cust-alice',
          total: 1500
        });
      });

      const doc = alice.firestore().collection('orders').doc('ord-101');
      await assertSucceeds(doc.get());
    });

    it('denies customer from reading another customer order', async () => {
      const alice = testEnv.authenticatedContext('cust-alice', { roles: ['customer'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('orders').doc('ord-102').set({
          id: 'ord-102',
          customerId: 'cust-bob',
          total: 3500
        });
      });

      const doc = alice.firestore().collection('orders').doc('ord-102');
      await assertFails(doc.get());
    });

    it('denies customer from reading own CRM internal notes subcollection', async () => {
      const alice = testEnv.authenticatedContext('cust-alice', { roles: ['customer'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('customers').doc('cust-alice').collection('crmNotes').doc('note-1').set({
          noteText: 'Customer requested priority phone support',
          authorEmail: 'support@muety.in'
        });
      });

      const doc = alice.firestore().collection('customers').doc('cust-alice').collection('crmNotes').doc('note-1');
      await assertFails(doc.get());
    });

    it('denies customer from writing products or modifying catalog', async () => {
      const alice = testEnv.authenticatedContext('cust-alice', { roles: ['customer'] });
      const doc = alice.firestore().collection('products').doc('p-new');
      await assertFails(doc.set({ name: 'Fake Silk Saree', price: 10 }));
    });

    it('denies customer from direct inventory modification', async () => {
      const alice = testEnv.authenticatedContext('cust-alice', { roles: ['customer'] });
      const doc = alice.firestore().collection('inventoryTransactions').doc('tx-fake');
      await assertFails(doc.set({ type: 'MANUAL_ADJUSTMENT', quantity: 999 }));
    });
  });

  // 2. CATALOG_MANAGER PERMISSIONS
  describe('Catalog Manager Security Matrix', () => {
    it('allows catalog_manager to create/update products and categories', async () => {
      const catMgr = testEnv.authenticatedContext('usr-cat', { roles: ['catalog_manager'] });
      const fs = catMgr.firestore();
      const pDoc = fs.collection('products').doc('p-101');
      await assertSucceeds(pDoc.set({ name: 'Banarasi Silk Saree', price: 12500, stock: 10 }));

      const cDoc = fs.collection('categories').doc('cat-101');
      await assertSucceeds(cDoc.set({ name: 'Banarasi Weaves', slug: 'banarasi' }));
    });

    it('denies catalog_manager from modifying orders', async () => {
      const catMgr = testEnv.authenticatedContext('usr-cat', { roles: ['catalog_manager'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('orders').doc('ord-201').set({
          id: 'ord-201',
          customerId: 'cust-bob',
          total: 5000,
          orderStatus: 'pending'
        });
      });

      const oDoc = catMgr.firestore().collection('orders').doc('ord-201');
      await assertFails(oDoc.update({ total: 10 }));
    });

    it('denies catalog_manager from managing admin role records', async () => {
      const catMgr = testEnv.authenticatedContext('usr-cat', { roles: ['catalog_manager'] });
      const adminDoc = catMgr.firestore().collection('admins').doc('usr-cat');
      await assertFails(adminDoc.set({ role: 'super_admin' }));
    });

    it('denies catalog_manager from modifying store settings', async () => {
      const catMgr = testEnv.authenticatedContext('usr-cat', { roles: ['catalog_manager'] });
      const settingDoc = catMgr.firestore().collection('storeSettings').doc('config');
      await assertFails(settingDoc.set({ gstin: 'FAKEGST' }));
    });
  });

  // 3. ORDER_MANAGER PERMISSIONS
  describe('Order Manager Security Matrix', () => {
    it('allows order_manager to update order fulfillment status', async () => {
      const ordMgr = testEnv.authenticatedContext('usr-ord', { roles: ['order_manager'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('orders').doc('ord-301').set({
          id: 'ord-301',
          customerId: 'cust-alice',
          orderStatus: 'pending'
        });
      });

      const oDoc = ordMgr.firestore().collection('orders').doc('ord-301');
      await assertSucceeds(oDoc.update({ orderStatus: 'shipped' }));
    });

    it('denies order_manager from modifying product pricing', async () => {
      const ordMgr = testEnv.authenticatedContext('usr-ord', { roles: ['order_manager'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('products').doc('p-301').set({
          name: 'Kanchipuram Silk Saree',
          price: 18500
        });
      });

      const pDoc = ordMgr.firestore().collection('products').doc('p-301');
      await assertFails(pDoc.update({ price: 100 }));
    });

    it('denies order_manager from managing admin users', async () => {
      const ordMgr = testEnv.authenticatedContext('usr-ord', { roles: ['order_manager'] });
      const aDoc = ordMgr.firestore().collection('admins').doc('usr-ord');
      await assertFails(aDoc.set({ role: 'super_admin' }));
    });
  });

  // 4. SUPPORT_MANAGER PERMISSIONS
  describe('Support Manager Security Matrix', () => {
    it('allows support_manager to read/write customer CRM internal notes', async () => {
      const supMgr = testEnv.authenticatedContext('usr-sup', { roles: ['support_manager'] });
      const noteDoc = supMgr.firestore().collection('customers').doc('cust-alice').collection('crmNotes').doc('note-sup-1');
      await assertSucceeds(noteDoc.set({
        noteText: 'Customer VIP delivery confirmed',
        authorEmail: 'support@muety.in'
      }));
    });

    it('denies support_manager from modifying product pricing or catalog', async () => {
      const supMgr = testEnv.authenticatedContext('usr-sup', { roles: ['support_manager'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('products').doc('p-401').set({
          name: 'Tussar Silk Saree',
          price: 8500
        });
      });

      const pDoc = supMgr.firestore().collection('products').doc('p-401');
      await assertFails(pDoc.update({ price: 50 }));
    });

    it('denies support_manager from managing admin roles', async () => {
      const supMgr = testEnv.authenticatedContext('usr-sup', { roles: ['support_manager'] });
      const aDoc = supMgr.firestore().collection('admins').doc('usr-sup');
      await assertFails(aDoc.set({ role: 'super_admin' }));
    });
  });

  // 5. ADMIN & SUPER_ADMIN PERMISSIONS
  describe('Admin & Super Admin Security Matrix', () => {
    it('allows super_admin full administrative management', async () => {
      const superAdmin = testEnv.authenticatedContext('usr-super', { roles: ['super_admin'] });
      const aDoc = superAdmin.firestore().collection('admins').doc('usr-new-admin');
      await assertSucceeds(aDoc.set({ role: 'admin', uid: 'usr-new-admin' }));
    });

    it('denies non-super_admin from assigning super_admin role', async () => {
      const normalAdmin = testEnv.authenticatedContext('usr-admin', { roles: ['admin'] });
      const aDoc = normalAdmin.firestore().collection('admins').doc('usr-target');
      await assertFails(aDoc.set({ role: 'super_admin' }));
    });
  });

  // 6. IMMUTABLE AUDIT LOGS
  describe('Audit Log Immutability', () => {
    it('allows staff roles to create audit logs', async () => {
      const catMgr = testEnv.authenticatedContext('usr-cat', { roles: ['catalog_manager'] });
      const logDoc = catMgr.firestore().collection('adminAuditLogs').doc('log-101');
      await assertSucceeds(logDoc.set({
        logId: 'log-101',
        action: 'PRODUCT_CREATED',
        actorUid: 'usr-cat',
        timestamp: new Date().toISOString()
      }));
    });

    it('denies any user from updating existing audit logs', async () => {
      const superAdmin = testEnv.authenticatedContext('usr-super', { roles: ['super_admin'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('adminAuditLogs').doc('log-102').set({
          logId: 'log-102',
          action: 'PRICE_CHANGED'
        });
      });

      const logDoc = superAdmin.firestore().collection('adminAuditLogs').doc('log-102');
      await assertFails(logDoc.update({ action: 'TAMPERED_ACTION' }));
    });

    it('denies any user from deleting audit logs', async () => {
      const superAdmin = testEnv.authenticatedContext('usr-super', { roles: ['super_admin'] });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('adminAuditLogs').doc('log-103').set({
          logId: 'log-103',
          action: 'ADMIN_CREATED'
        });
      });

      const logDoc = superAdmin.firestore().collection('adminAuditLogs').doc('log-103');
      await assertFails(logDoc.delete());
    });
  });
});
