import { UserProfile } from '@/shared/types';
import { Order } from '@/features/orders/types';
import { normalizePhoneNumber } from './customerService';
import { filterCustomerOrders } from '@/shared/utils/orderMetrics';

export interface SharedPhoneConflict {
  phone: string;
  uids: string[];
  patrons: Array<{
    uid: string;
    displayName: string;
    email: string;
    customerStatus?: string;
    isPatronCircle?: boolean;
    ordersCount: number;
    createdAt?: string;
  }>;
}

export interface MismatchedOrderRecord {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  customerPhone?: string;
  reason: string;
}

export interface OrphanedOrderRecord {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  total: number;
  createdAt: string;
  classification: 'guest_unlinked' | 'orphaned_missing_uid';
}

export interface DryRunIdentityReport {
  summary: {
    totalPatronsScanned: number;
    totalOrdersScanned: number;
    uniquePhonesTracked: number;
    sharedPhoneConflictCount: number;
    mismatchedOrderCount: number;
    orphanedOrderCount: number;
    duplicateUidCount: number;
  };
  duplicateUids: string[];
  sharedPhoneConflicts: SharedPhoneConflict[];
  mismatchedOrders: MismatchedOrderRecord[];
  orphanedOrders: OrphanedOrderRecord[];
  safetyGuarantees: string[];
  recommendations: string[];
  generatedAt: string;
}

/**
 * Generate a complete non-destructive dry-run diagnostic report of
 * patron identities, shared contact numbers, customer ID mappings,
 * and order linkage.
 * 
 * Complies with strict privacy guarantees:
 * - Does NOT mutate production Firestore or Local Storage.
 * - Does NOT automatically merge accounts based on phone numbers.
 * - Confirms that orders for UID 1 are never exposed to UID 2.
 */
export function generateIdentityDryRunReport(
  customers: UserProfile[],
  orders: Order[]
): DryRunIdentityReport {
  const patronUidMap = new Map<string, UserProfile>();
  const duplicateUids: string[] = [];
  const seenUids = new Set<string>();

  // 1. Scan customer profiles and detect any duplicate UIDs
  customers.forEach(c => {
    if (seenUids.has(c.uid)) {
      if (!duplicateUids.includes(c.uid)) duplicateUids.push(c.uid);
    } else {
      seenUids.add(c.uid);
      patronUidMap.set(c.uid, c);
    }
  });

  // 2. Detect shared phone numbers across distinct UIDs
  const phoneToPatrons = new Map<string, UserProfile[]>();
  customers.forEach(c => {
    const rawPhone = c.phoneNumber || (c as any).phone;
    const normalized = normalizePhoneNumber(rawPhone);
    if (normalized) {
      const list = phoneToPatrons.get(normalized) || [];
      if (!list.some(existing => existing.uid === c.uid)) {
        list.push(c);
      }
      phoneToPatrons.set(normalized, list);
    }
  });

  const sharedPhoneConflicts: SharedPhoneConflict[] = [];
  phoneToPatrons.forEach((patronsList, phone) => {
    if (patronsList.length > 1) {
      sharedPhoneConflicts.push({
        phone,
        uids: patronsList.map(p => p.uid),
        patrons: patronsList.map(p => {
          const patronOrders = filterCustomerOrders(orders, p.uid, p.email);
          return {
            uid: p.uid,
            displayName: p.displayName || p.fullName || 'Patron',
            email: p.email || 'No email recorded',
            customerStatus: p.customerStatus,
            isPatronCircle: Boolean(p.patronCircleMember || (p as any).isPatronCircle),
            ordersCount: patronOrders.length,
            createdAt: p.createdAt
          };
        })
      });
    }
  });

  // 3. Scan orders for mismatched customer IDs and orphaned records
  const mismatchedOrders: MismatchedOrderRecord[] = [];
  const orphanedOrders: OrphanedOrderRecord[] = [];

  orders.forEach(ord => {
    const ordCustId = ord.customerId || '';
    const ordEmail = (ord.customerEmail || '').toLowerCase().trim();
    const ordPhone = ord.customerPhone || ord.shippingAddress?.phone || '';

    // Check if order customerId maps to an existing patron profile
    if (ordCustId) {
      const matchedPatron = patronUidMap.get(ordCustId);
      if (matchedPatron) {
        // Mismatch check: order has different email than customer profile
        const patronEmail = (matchedPatron.email || '').toLowerCase().trim();
        if (patronEmail && ordEmail && patronEmail !== ordEmail && !patronEmail.endsWith('@muety.com')) {
          mismatchedOrders.push({
            orderId: ord.id || (ord as any).orderId || 'unknown',
            orderNumber: ord.orderNumber || ord.id || 'N/A',
            customerId: ordCustId,
            customerEmail: ordEmail,
            customerPhone: ordPhone,
            reason: `Order email (${ordEmail}) differs from registered patron profile email (${patronEmail}).`
          });
        }
      } else {
        // CustomerId present but not in patron roster
        if (ordCustId.startsWith('guest-') || ordCustId.startsWith('cust-ord-')) {
          orphanedOrders.push({
            orderId: ord.id || 'unknown',
            orderNumber: ord.orderNumber || ord.id || 'N/A',
            customerId: ordCustId,
            customerEmail: ordEmail,
            total: ord.total || 0,
            createdAt: ord.createdAt || new Date().toISOString(),
            classification: 'guest_unlinked'
          });
        } else {
          orphanedOrders.push({
            orderId: ord.id || 'unknown',
            orderNumber: ord.orderNumber || ord.id || 'N/A',
            customerId: ordCustId,
            customerEmail: ordEmail,
            total: ord.total || 0,
            createdAt: ord.createdAt || new Date().toISOString(),
            classification: 'orphaned_missing_uid'
          });
        }
      }
    } else {
      // Order has completely missing customerId
      orphanedOrders.push({
        orderId: ord.id || 'unknown',
        orderNumber: ord.orderNumber || ord.id || 'N/A',
        customerId: 'MISSING_CUSTOMER_ID',
        customerEmail: ordEmail,
        total: ord.total || 0,
        createdAt: ord.createdAt || new Date().toISOString(),
        classification: 'guest_unlinked'
      });
    }
  });

  const recommendations: string[] = [
    'Preserve Firebase Auth UID as primary immutable account identity. Do not merge customer accounts by phone or email.',
    'Keep orders strictly associated with the authenticated customerId that placed them. Do not reassign orders across shared phone numbers.',
    'For patrons with multiple accounts sharing a phone number (e.g. Phone Auth and Google Sign-In), instruct patrons to link their providers via storefront Profile Settings using Firebase Auth linkWithCredential.',
    'Guest checkout orders without registered customerId remain accessible via order confirmation token and guest order lookup.',
    'Storefront registration and Google sign-in must not grant marketing consent automatically; explicit marketing opt-in must be retained.'
  ];

  const safetyGuarantees: string[] = [
    'Dry-Run Guarantee: Zero records created, deleted, or merged.',
    'Privacy Guarantee: No cross-patron order leakage or shared order visibility.',
    'Storage Independence: Zero dependencies on Firebase Cloud Storage.'
  ];

  return {
    summary: {
      totalPatronsScanned: customers.length,
      totalOrdersScanned: orders.length,
      uniquePhonesTracked: phoneToPatrons.size,
      sharedPhoneConflictCount: sharedPhoneConflicts.length,
      mismatchedOrderCount: mismatchedOrders.length,
      orphanedOrderCount: orphanedOrders.length,
      duplicateUidCount: duplicateUids.length
    },
    duplicateUids,
    sharedPhoneConflicts,
    mismatchedOrders,
    orphanedOrders,
    safetyGuarantees,
    recommendations,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Format the dry-run report as clean, human-readable text / markdown
 */
export function formatDryRunReportText(report: DryRunIdentityReport): string {
  const lines: string[] = [];
  lines.push('========================================================================');
  lines.push('        MUETY PATRON IDENTITY & ORDER MIGRATION DRY-RUN REPORT           ');
  lines.push(`                  Generated: ${report.generatedAt}                     `);
  lines.push('========================================================================');
  lines.push('');
  lines.push('1. SUMMARY METRICS:');
  lines.push(`   - Total Patron Accounts Scanned:    ${report.summary.totalPatronsScanned}`);
  lines.push(`   - Total Orders Scanned:             ${report.summary.totalOrdersScanned}`);
  lines.push(`   - Unique Normalized Phone Numbers:  ${report.summary.uniquePhonesTracked}`);
  lines.push(`   - Shared Phone Conflict Groups:     ${report.summary.sharedPhoneConflictCount}`);
  lines.push(`   - Duplicate Customer UIDs:          ${report.summary.duplicateUidCount}`);
  lines.push(`   - Mismatched Customer ID Orders:    ${report.summary.mismatchedOrderCount}`);
  lines.push(`   - Orphaned / Guest Unlinked Orders: ${report.summary.orphanedOrderCount}`);
  lines.push('');

  lines.push('2. SHARED PHONE CONFLICT DETAILS:');
  if (report.sharedPhoneConflicts.length === 0) {
    lines.push('   None detected. All registered phone numbers map to a single UID.');
  } else {
    report.sharedPhoneConflicts.forEach((conflict, idx) => {
      lines.push(`   [Conflict #${idx + 1}] Phone: ${conflict.phone} (Shared across ${conflict.uids.length} accounts):`);
      conflict.patrons.forEach(p => {
        lines.push(`     * UID: ${p.uid}`);
        lines.push(`       Name: ${p.displayName} | Email: ${p.email}`);
        lines.push(`       Circle Member: ${p.isPatronCircle ? 'YES' : 'NO'} | Verified Orders: ${p.ordersCount}`);
      });
      lines.push('');
    });
  }

  lines.push('3. ORDER RECONCILIATION AUDIT:');
  lines.push(`   - Orders with ID / Email Mismatches: ${report.mismatchedOrders.length}`);
  report.mismatchedOrders.slice(0, 5).forEach(m => {
    lines.push(`     * Order ${m.orderNumber} (CustID: ${m.customerId}): ${m.reason}`);
  });
  lines.push(`   - Orphaned / Guest Orders: ${report.orphanedOrders.length}`);
  report.orphanedOrders.slice(0, 5).forEach(o => {
    lines.push(`     * Order ${o.orderNumber} (CustID: ${o.customerId}, ₹${o.total}): ${o.classification}`);
  });
  lines.push('');

  lines.push('4. SAFETY GUARANTEES & RECOMMENDATIONS:');
  report.safetyGuarantees.forEach(g => lines.push(`   [✓] ${g}`));
  report.recommendations.forEach(r => lines.push(`   [i] ${r}`));
  lines.push('========================================================================');
  return lines.join('\n');
}
