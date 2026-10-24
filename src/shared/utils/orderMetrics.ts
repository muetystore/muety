import { Order } from '@/features/orders/types';

/**
 * Standard Order Metric Utilities for MUETY Atelier ERP & Patron CRM.
 * 
 * Defines consistent, server-reconciled business semantics across:
 * - Admin ERP Dashboard
 * - Patron CRM Customer Directory
 * - Patron Detail Workspace
 */

/**
 * Verified Order: A legitimate, confirmed, in-progress, or fulfilled patron order.
 * Excludes cancelled orders and failed payment attempts.
 */
export function isVerifiedOrder(order: Order | null | undefined): boolean {
  if (!order) return false;
  const status = (order.orderStatus || '').toLowerCase();
  const paymentStatus = (order.paymentStatus || '').toLowerCase();
  
  if (status === 'cancelled' || status === 'failed') return false;
  if (paymentStatus === 'failed') return false;

  return ['pending', 'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'completed'].includes(status);
}

/**
 * Completed Order: An order that has been successfully fulfilled and delivered to the patron.
 */
export function isCompletedOrder(order: Order | null | undefined): boolean {
  if (!order || !isVerifiedOrder(order)) return false;
  const status = (order.orderStatus || '').toLowerCase();
  return status === 'delivered' || status === 'completed';
}

/**
 * Calculates net realized monetary spend for an order.
 * - Contributes to revenue only if payment is captured ('paid') or COD has been fulfilled ('delivered').
 * - Deducts any documented partial refund amount.
 * - Returns 0 for cancelled, failed, or fully refunded orders.
 */
export function calculateOrderNetRevenue(order: Order | null | undefined): number {
  if (!order || !isVerifiedOrder(order)) return 0;

  const paymentStatus = (order.paymentStatus || '').toLowerCase();
  const orderStatus = (order.orderStatus || '').toLowerCase();
  const isCod = order.paymentMethod === 'cash_on_delivery';

  if (paymentStatus === 'refunded' || orderStatus === 'refunded') {
    return 0;
  }

  const isRevenueRealized = paymentStatus === 'paid' || (isCod && orderStatus === 'delivered');
  if (!isRevenueRealized) {
    return 0;
  }

  const rawTotal = Number(order.total) || 0;
  const refunded = Number((order as any).refundedAmount || (order as any).refundAmount) || 0;
  const net = Math.max(0, rawTotal - refunded);

  return Math.round((net + Number.EPSILON) * 100) / 100;
}

/**
 * Deduplicates orders by stable canonical ID (fallback to orderNumber).
 */
export function deduplicateOrders(orders: Order[]): Order[] {
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const unique: Order[] = [];

  for (const o of orders) {
    if (!o) continue;
    const hasSeenId = Boolean(o.id && seenIds.has(o.id));
    const hasSeenNum = Boolean(o.orderNumber && seenNumbers.has(o.orderNumber));

    if (!hasSeenId && !hasSeenNum) {
      if (o.id) seenIds.add(o.id);
      if (o.orderNumber) seenNumbers.add(o.orderNumber);
      unique.push(o);
    }
  }

  return unique;
}

export interface OrdersSummary {
  totalOrdersCount: number;
  verifiedOrdersCount: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  cumulativeSpend: number;
  averageOrderValue: number;
}

/**
 * Aggregates order metrics using canonical accounting policies.
 */
export function calculateOrdersSummary(rawOrders: Order[]): OrdersSummary {
  const orders = deduplicateOrders(rawOrders);
  let verifiedCount = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  let cumulativeSpend = 0;

  for (const ord of orders) {
    if (ord.orderStatus === 'cancelled') {
      cancelledCount++;
    } else if (isVerifiedOrder(ord)) {
      verifiedCount++;
      if (isCompletedOrder(ord)) {
        completedCount++;
      } else {
        pendingCount++;
      }
      cumulativeSpend += calculateOrderNetRevenue(ord);
    }
  }

  cumulativeSpend = Math.round((cumulativeSpend + Number.EPSILON) * 100) / 100;
  const aov = verifiedCount > 0 ? Math.round((cumulativeSpend / verifiedCount + Number.EPSILON) * 100) / 100 : 0;

  return {
    totalOrdersCount: orders.length,
    verifiedOrdersCount: verifiedCount,
    completedOrdersCount: completedCount,
    pendingOrdersCount: pendingCount,
    cancelledOrdersCount: cancelledCount,
    cumulativeSpend,
    averageOrderValue: aov
  };
}

/**
 * Filters orders belonging strictly to a patron.
 * Strict ownership rule: Matches by canonical customerId (UID).
 * Only unassigned guest orders without a registered UID may match by verified email.
 * NEVER matches by phone number to prevent cross-account private order leakage!
 */
export function filterCustomerOrders(
  rawOrders: Order[], 
  customerUid: string, 
  customerEmail?: string | null
): Order[] {
  if (!customerUid) return [];
  const cleanEmail = (customerEmail || '').toLowerCase().trim();
  const uniqueOrders = deduplicateOrders(rawOrders);

  return uniqueOrders.filter(o => {
    // 1. Strict primary match: exact canonical UID
    if (o.customerId && o.customerId === customerUid) {
      return true;
    }
    // 2. Unassigned guest order fallback by email ONLY
    if ((!o.customerId || o.customerId.startsWith('guest-')) && cleanEmail) {
      const orderEmail = (o.customerEmail || '').toLowerCase().trim();
      if (orderEmail && orderEmail === cleanEmail) {
        return true;
      }
    }
    return false;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
