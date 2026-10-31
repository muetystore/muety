import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth, isLiveFirebase } from '@/lib/firebase/firebase';
import { Order, OrderStatus, PaymentMethod } from '../types';
import { CartItem } from '@/features/cart/types';
import { Address } from '@/shared/types';
import { storageService } from '@/lib/storage/storageService';

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('muety_realtime_orders');
  }
} catch {}

const isTestEnv = (): boolean => {
  return (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST))) ||
    (typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.MODE === 'test'));
};

export const orderService = {
  isLiveCloud(): boolean {
    return isLiveFirebase && db !== null && !isTestEnv();
  },

  getAllOrders(): Order[] {
    return storageService.getOrders();
  },

  getOrderById(id: string): Order | undefined {
    return storageService.getOrderById(id);
  },

  getCustomerOrders(customerId: string, customerEmail?: string): Order[] {
    return storageService.getCustomerOrders(customerId, customerEmail);
  },

  async createOrder(params: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: Address;
    items: CartItem[];
    subtotal: number;
    discount: number;
    appliedCoupon?: string;
    tax: number;
    shippingFee: number;
    total: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
    codAdvanceAmount?: number;
    codBalanceDue?: number;
    razorpayPaymentId?: string;
    notes?: string;
  }): Promise<Order> {
    // Checkout Safety: Verify product availability before creating order
    for (const item of params.items) {
      const currentProd = storageService.getProductById(item.product.id);
      if (currentProd?.availability === 'sold_out' || item.product.availability === 'sold_out') {
        throw new Error(`Order placement rejected: Product "${currentProd?.name || item.product.name}" is currently sold out.`);
      }
    }

    // Checkout Security: Verify patron account status
    if (params.customerId) {
      const patron = storageService.getUserById(params.customerId);
      if (patron && (patron.isBlocked || patron.customerStatus === 'blocked')) {
        throw new Error('Order placement rejected: Your patron account has been suspended by MUETY Security.');
      }
    }

    // Checkout Payment Security: COD requires verified ₹89 advance
    if (params.paymentMethod === 'cash_on_delivery' && (!params.razorpayPaymentId || !params.razorpayPaymentId.trim())) {
      throw new Error('FAILED_PRECONDITION: Cash on Delivery orders require an upfront ₹89 courier advance payment authorization.');
    }

    // Checkout Security: Guard against duplicate payment ID replay attacks
    if (params.razorpayPaymentId && params.razorpayPaymentId.trim()) {
      const existingOrders = storageService.getOrders();
      if (existingOrders.some(o => o.razorpayPaymentId === params.razorpayPaymentId?.trim())) {
        throw new Error('FAILED_PRECONDITION: Payment authorization ID has already been utilized for an existing order.');
      }
    }

    let serverRes: any = null;
    if (typeof window !== 'undefined') {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (auth?.currentUser) {
          try {
            const idToken = await auth.currentUser.getIdToken();
            if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
          } catch {}
        }

        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            customerId: params.customerId,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            customerPhone: params.customerPhone,
            shippingAddress: params.shippingAddress,
            items: params.items.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              selectedColor: item.selectedColor
            })),
            couponCode: params.appliedCoupon,
            paymentMethod: params.paymentMethod,
            razorpayPaymentId: params.razorpayPaymentId,
            notes: params.notes
          })
        });
        serverRes = await res.json();
      } catch (netErr) {
        console.warn('Server order API note:', netErr);
      }
    }

    if (serverRes && !serverRes.success && serverRes.error) {
      throw new Error(serverRes.error.message || 'Order creation rejected by server.');
    }

    if (serverRes && serverRes.success && serverRes.order) {
      const serverOrder: Order = serverRes.order;
      storageService.createOrder(serverOrder);
      this.broadcastUpdate(serverOrder);
      return serverOrder;
    }

    // Local fallback
    const isCod = params.paymentMethod === 'cash_on_delivery';
    const canonicalShipping = params.shippingFee !== undefined ? params.shippingFee : (isCod ? 89 : 0);
    const orderNumber = `MT-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const fallbackTotal = params.total !== undefined
      ? params.total
      : Number((params.subtotal - (params.discount || 0) + canonicalShipping).toFixed(2));
    const codAdvanceAmount = isCod ? Math.min(89, fallbackTotal) : 0;
    const codBalanceDue = isCod ? Number(Math.max(0, fallbackTotal - codAdvanceAmount).toFixed(2)) : 0;

    // Enrich items with catalog SKU if available
    const enrichedItems = params.items.map(item => {
      const catProd = storageService.getProductById(item.product?.id);
      const sku = item.product?.sku || catProd?.sku || (item as any).sku || `MUETY-SR-${String(item.product?.id || '01').slice(-4).toUpperCase()}`;
      return {
        ...item,
        product: {
          ...item.product,
          sku
        }
      };
    });

    const order: Order = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber,
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone || '',
      shippingAddress: params.shippingAddress,
      items: enrichedItems,
      subtotal: params.subtotal,
      discount: params.discount || 0,
      appliedCoupon: params.appliedCoupon || '',
      tax: params.tax,
      shippingFee: canonicalShipping, // Canonical ₹89 flat courier fee
      total: fallbackTotal,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus || (isCod ? 'pending' : 'paid'),
      codAdvanceAmount,
      codBalanceDue,
      orderStatus: 'pending',
      trackingNumber: `MUET-EXP-${Math.floor(10000000 + Math.random() * 90000000)}`,
      trackingCarrier: 'MUETY Global Express',
      timeline: [
        {
          status: 'pending',
          label: isCod ? 'COD Order Confirmed (Advance Paid)' : 'Order Confirmed',
          timestamp: now,
          description: isCod 
            ? `Order accepted with ₹89 advance paid online. Balance ₹${codBalanceDue} due upon delivery.`
            : 'Payment authorized and order accepted.'
        }
      ],
      razorpayPaymentId: params.razorpayPaymentId || '',
      notes: params.notes || '',
      createdAt: now,
      updatedAt: now
    };

    storageService.createOrder(order);

    if (db && !isTestEnv()) {
      try {
        const orderRef = doc(db, 'orders', order.id);
        const sanitizedOrder = JSON.parse(JSON.stringify(order));
        await setDoc(orderRef, sanitizedOrder);
      } catch (err: any) {
        console.warn('Firebase Firestore write error:', err?.message || err);
      }
    }

    // Durably dispatch order confirmation email to patron and admin via Netlify server function
    if (typeof window !== 'undefined' && !isTestEnv()) {
      fetch('/api/orders/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-confirmation', orderId: order.id, order })
      }).catch(err => console.warn('[OrderService] Background email dispatch note:', err?.message || err));
    }

    this.broadcastUpdate(order);
    return order;
  },

  async findFirestoreOrderRef(orderIdOrNumber: string): Promise<{ ref: any; docId: string; data: Order } | null> {
    if (!db || isTestEnv()) return null;
    try {
      // 1. Direct doc lookup by ID
      const directRef = doc(db, 'orders', orderIdOrNumber);
      const snap = await getDoc(directRef);
      if (snap.exists()) {
        return { ref: directRef, docId: directRef.id, data: snap.data() as Order };
      }

      // 2. Query by orderNumber (e.g. MT-950061)
      const col = collection(db, 'orders');
      const qNum = query(col, where('orderNumber', '==', orderIdOrNumber));
      const numSnap = await getDocs(qNum);
      if (!numSnap.empty) {
        const found = numSnap.docs[0];
        return { ref: found.ref, docId: found.id, data: found.data() as Order };
      }

      // 3. Query by internal id field inside document
      const qId = query(col, where('id', '==', orderIdOrNumber));
      const idSnap = await getDocs(qId);
      if (!idSnap.empty) {
        const found = idSnap.docs[0];
        return { ref: found.ref, docId: found.id, data: found.data() as Order };
      }
    } catch (e) {
      console.warn('[orderService] findFirestoreOrderRef error:', e);
    }
    return null;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, customNote?: string): Promise<Order | undefined> {
    // 1. First attempt local storage update
    let updated = storageService.updateOrderStatus(orderId, status, customNote);

    // 2. If not found in local storage, check Firestore
    const firestoreTarget = await this.findFirestoreOrderRef(orderId);
    if (!updated && firestoreTarget?.data) {
      const fromCloud = { ...firestoreTarget.data, id: firestoreTarget.data.id || firestoreTarget.docId };
      storageService.createOrder(fromCloud);
      updated = storageService.updateOrderStatus(orderId, status, customNote);
    }

    if (!updated) {
      console.warn(`[orderService] Order #${orderId} not found in local storage or Firestore.`);
      return undefined;
    }

    // 3. Persist updated status and timeline directly to Firestore
    if (db && !isTestEnv()) {
      try {
        const orderRef = firestoreTarget?.ref || doc(db, 'orders', updated.id);
        const sanitized = JSON.parse(JSON.stringify(updated));
        await setDoc(orderRef, sanitized, { merge: true });
      } catch (err: any) {
        console.warn('[orderService] Firebase Firestore update error:', err?.message || err);
      }
    }

    this.broadcastUpdate(updated);
    return updated;
  },

  async updateOrderTracking(
    orderId: string, 
    tracking: { trackingNumber: string; courier?: string; trackingCarrier?: string; statusNote?: string }
  ): Promise<Order | undefined> {
    // 1. First attempt local storage tracking update
    let updated = storageService.updateOrderTracking(orderId, {
      trackingNumber: tracking.trackingNumber,
      courier: tracking.courier,
      trackingCarrier: tracking.trackingCarrier || tracking.courier,
      description: tracking.statusNote
    });

    // 2. If not found in local storage, look up in Firestore first
    const firestoreTarget = await this.findFirestoreOrderRef(orderId);
    if (!updated && firestoreTarget?.data) {
      const fromCloud = { ...firestoreTarget.data, id: firestoreTarget.data.id || firestoreTarget.docId };
      storageService.createOrder(fromCloud);
      updated = storageService.updateOrderTracking(orderId, {
        trackingNumber: tracking.trackingNumber,
        courier: tracking.courier,
        trackingCarrier: tracking.trackingCarrier || tracking.courier,
        description: tracking.statusNote
      });
    }

    if (!updated) {
      console.warn(`[orderService] Order #${orderId} not found to update tracking.`);
      return undefined;
    }

    // 3. Authoritatively persist updated tracking fields to Firestore
    if (db && !isTestEnv()) {
      try {
        const orderRef = firestoreTarget?.ref || doc(db, 'orders', updated.id);
        const sanitized = JSON.parse(JSON.stringify(updated));
        await setDoc(orderRef, sanitized, { merge: true });
      } catch (err: any) {
        console.warn('[orderService] Firebase Firestore updateOrderTracking error:', err?.message || err);
      }
    }

    this.broadcastUpdate(updated);
    return updated;
  },

  async requestCancellation(orderId: string, reason: string): Promise<Order | undefined> {
    const order = storageService.getOrderById(orderId);
    if (!order) return undefined;
    if (order.orderStatus !== 'pending') {
      throw new Error('Order cancellation is only permitted while your order is pending prior to processing or dispatch.');
    }
    const isCod = order.paymentMethod === 'cash_on_delivery';
    const cancellationNote = isCod
      ? `Customer requested order cancellation: "${reason}". COD advance confirmation fee (₹89) handled per Return, Refund & Cancellation Policy.`
      : `Customer requested order cancellation: "${reason}". Refund review initiated per policy.`;

    const updated: Order = {
      ...order,
      cancellationRequested: true,
      cancellationReason: reason,
      orderStatus: 'cancelled',
      timeline: [
        ...order.timeline,
        {
          status: 'cancelled',
          label: 'Cancellation Requested & Processed',
          timestamp: new Date().toISOString(),
          description: cancellationNote
        }
      ],
      updatedAt: new Date().toISOString()
    };

    const orders = storageService.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx] = updated;
      storageService.saveOrders(orders);
    } else {
      storageService.createOrder(updated);
    }
    if (db && !isTestEnv()) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const sanitized = JSON.parse(JSON.stringify(updated));
        await setDoc(orderRef, sanitized, { merge: true });
      } catch (err: any) {
        console.warn('Firebase Firestore cancellation write error:', err);
      }
    }
    this.broadcastUpdate(updated);
    return updated;
  },

  subscribeToOrder(orderId: string, callback: (order: Order | null) => void): () => void {
    // 1. Immediately provide cached local order if present (matches by id OR orderNumber)
    const cached = storageService.getOrderById(orderId);
    if (cached) {
      callback(cached);
    }

    let firestoreUnsub: Unsubscribe | null = null;
    let isSubscribed = true;

    if (db) {
      // Resolve actual Firestore document ref (matches docId or orderNumber)
      this.findFirestoreOrderRef(orderId).then(target => {
        if (!isSubscribed) return;
        const targetRef = target?.ref || doc(db!, 'orders', orderId);

        if (target?.data) {
          const fullOrder = { ...target.data, id: target.data.id || target.docId };
          storageService.createOrder(fullOrder);
          callback(fullOrder);
        }

        try {
          firestoreUnsub = onSnapshot(targetRef, (snap: any) => {
            if (snap.exists()) {
              const data = snap.data() as Order;
              const fullOrder = { ...data, id: data.id || snap.id };
              storageService.createOrder(fullOrder);
              callback(fullOrder);
            } else {
              const current = storageService.getOrderById(orderId);
              callback(current || null);
            }
          }, (_err: any) => {
            const current = storageService.getOrderById(orderId);
            if (current) callback(current);
          });
        } catch {
          const current = storageService.getOrderById(orderId);
          callback(current || null);
        }
      }).catch(() => {
        const current = storageService.getOrderById(orderId);
        callback(current || null);
      });
    } else {
      callback(cached || null);
    }

    const handleLocalSync = () => {
      const found = storageService.getOrderById(orderId);
      if (found) {
        callback(found);
      }
    };

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ORDER_UPDATED' && (event.data?.order?.id === orderId || event.data?.order?.orderNumber === orderId)) {
        callback(event.data.order);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('muety_orders_updated', handleLocalSync);
    }
    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    return () => {
      isSubscribed = false;
      if (firestoreUnsub) firestoreUnsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('muety_orders_updated', handleLocalSync);
      }
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
    };
  },

  async syncAllOrders(): Promise<Order[]> {
    if (typeof window !== 'undefined') {
      try {
        const { getAuthHeaders } = await import('@/shared/utils/authHeader');
        const headers = await getAuthHeaders();
        const res = await fetch('/api/orders/list', {
          method: 'POST',
          headers,
          body: JSON.stringify({})
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.orders)) {
            const mergedMap = new Map<string, Order>();
            const localOrders = storageService.getOrders();
            localOrders.forEach(o => mergedMap.set(o.id, o));
            data.orders.forEach((o: Order) => mergedMap.set(o.id, o));
            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            storageService.saveOrders(merged);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('muety_orders_updated'));
            }
            return merged;
          }
        }
      } catch (e: any) {
        console.warn('[orderService] syncAllOrders note:', e?.message || e);
      }
    }
    return storageService.getOrders();
  },

  subscribeToAllOrders(callback: (orders: Order[]) => void, onError?: (err: Error) => void): () => void {
    // Immediately emit local cache to prevent empty screen
    callback(storageService.getOrders());

    // If client lacks Firebase Auth user, trigger authorized API sync
    if (typeof window !== 'undefined' && (!auth || !auth.currentUser)) {
      this.syncAllOrders().then(orders => {
        if (orders.length > 0) callback(orders);
      }).catch(() => {});
    }

    let firestoreUnsub: Unsubscribe | null = null;

    if (db) {
      try {
        const ordersCol = collection(db, 'orders');
        firestoreUnsub = onSnapshot(ordersCol, (snapshot) => {
          const cloudOrders: Order[] = [];
          if (!snapshot.empty) {
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as Order;
              if (raw && (raw.id || docSnap.id)) {
                cloudOrders.push({ ...raw, id: raw.id || docSnap.id });
              }
            });
          }

          // Merge cloud orders with local storage orders by ID or orderNumber
          const mergedMap = new Map<string, Order>();
          const localOrders = storageService.getOrders();

          const findMatchingLocal = (cOrd: Order) => {
            return localOrders.find(l => 
              (l.id && l.id === cOrd.id) || 
              (l.orderNumber && l.orderNumber === cOrd.orderNumber)
            );
          };

          cloudOrders.forEach(c => {
            const localMatch = findMatchingLocal(c);
            if (localMatch) {
              const localTime = new Date(localMatch.updatedAt || localMatch.createdAt || 0).getTime();
              const cloudTime = new Date(c.updatedAt || c.createdAt || 0).getTime();
              // If local has newer timestamp (e.g. recent admin tracking update), preserve local fields
              if (localTime > cloudTime) {
                mergedMap.set(c.id, { ...c, ...localMatch, id: c.id });
              } else {
                mergedMap.set(c.id, { ...localMatch, ...c, id: c.id });
              }
            } else {
              mergedMap.set(c.id, c);
            }
          });

          // Only preserve genuine pending offline-created orders (never resurrect deleted cloud orders)
          localOrders.forEach(l => {
            const isOfflinePending = (l as any).isOfflinePending === true || (l.id && l.id.startsWith('offline-'));
            const alreadyPresent = Array.from(mergedMap.values()).some(
              m => (m.id && m.id === l.id) || (m.orderNumber && m.orderNumber === l.orderNumber)
            );
            if (!alreadyPresent && isOfflinePending) {
              mergedMap.set(l.id, l);
            }
          });

          const mergedOrders = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          storageService.saveOrders(mergedOrders);
          callback(mergedOrders);
        }, async (err) => {
          console.error('[orderService] Firestore onSnapshot error on orders collection:', err?.message || err);
          try {
            const apiOrders = await this.syncAllOrders();
            if (apiOrders.length > 0) {
              callback(apiOrders);
              return;
            }
          } catch {}
          if (onError) {
            onError(err);
          } else {
            callback(storageService.getOrders());
          }
        });
      } catch (e: any) {
        console.error('[orderService] Failed to attach snapshot listener to orders:', e?.message || e);
        if (onError) onError(e);
      }
    } else {
      callback(storageService.getOrders());
    }

    const handleLocalSync = () => {
      callback(storageService.getOrders());
    };

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ORDER_UPDATED' || event.data?.type === 'ORDER_CREATED') {
        callback(storageService.getOrders());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('muety_orders_updated', handleLocalSync);
    }
    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    return () => {
      if (firestoreUnsub) firestoreUnsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('muety_orders_updated', handleLocalSync);
      }
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
    };
  },

  subscribeToCustomerOrders(
    customerId: string, 
    callback: (orders: Order[]) => void, 
    onError?: (err: Error) => void,
    customerEmail?: string
  ): () => void {
    // 1. Immediately provide cached orders for customer (matches customerId OR email)
    const initialLocal = storageService.getCustomerOrders(customerId, customerEmail);
    callback(initialLocal);

    let firestoreUnsub: Unsubscribe | null = null;

    if (db) {
      try {
        const ordersCol = collection(db, 'orders');
        const q = query(ordersCol, where('customerId', '==', customerId));
        firestoreUnsub = onSnapshot(q, (snap) => {
          const userOrders: Order[] = [];
          snap.forEach(d => {
            const raw = d.data() as Order;
            if (raw) userOrders.push({ ...raw, id: raw.id || d.id });
          });

          // Merge with local orders that belong to this customer
          const currentLocal = storageService.getCustomerOrders(customerId, customerEmail);
          const mergedMap = new Map<string, Order>();
          userOrders.forEach(o => mergedMap.set(o.id, o));
          currentLocal.forEach(o => {
            if (!mergedMap.has(o.id)) {
              mergedMap.set(o.id, o);
            }
          });

          const finalList = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          callback(finalList);
        }, (err) => {
          console.error('[orderService] Firestore customer orders onSnapshot error:', err?.message || err);
          if (onError) onError(err);
          else callback(storageService.getCustomerOrders(customerId, customerEmail));
        });
      } catch (e: any) {
        if (onError) onError(e);
      }
    } else {
      callback(storageService.getCustomerOrders(customerId, customerEmail));
    }

    const handleLocalSync = () => {
      callback(storageService.getCustomerOrders(customerId, customerEmail));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('muety_orders_updated', handleLocalSync);
    }
    if (channel) {
      channel.addEventListener('message', handleLocalSync);
    }

    return () => {
      if (firestoreUnsub) firestoreUnsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('muety_orders_updated', handleLocalSync);
      }
      if (channel) {
        channel.removeEventListener('message', handleLocalSync);
      }
    };
  },

  async archiveOrder(id: string, reason?: string): Promise<Order | undefined> {
    const existing = this.getOrderById(id);
    if (!existing) return undefined;

    const updated: Order = {
      ...existing,
      archived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.updateOrder(updated);

    if (db && !isTestEnv()) {
      try {
        await setDoc(doc(db, 'orders', id), updated, { merge: true });
      } catch (err) {
        console.warn('Firestore archive order note:', err);
      }
    }

    this.broadcastUpdate(updated);
    return updated;
  },

  async unarchiveOrder(id: string): Promise<Order | undefined> {
    const existing = this.getOrderById(id);
    if (!existing) return undefined;

    const updated: Order = {
      ...existing,
      archived: false,
      updatedAt: new Date().toISOString()
    };
    delete updated.archivedAt;

    storageService.updateOrder(updated);

    if (db && !isTestEnv()) {
      try {
        const payload: Record<string, any> = { ...updated };
        delete payload.archivedAt;
        await setDoc(doc(db, 'orders', id), payload, { merge: true });
      } catch (err) {
        console.warn('Firestore unarchive order note:', err);
      }
    }

    this.broadcastUpdate(updated);
    return updated;
  },

  async deleteOrder(id: string): Promise<boolean> {
    // For user data privacy & legal compliance, orders must not be permanently deleted. Archive instead.
    await this.archiveOrder(id);
    return true;
  },

  async clearAllOrdersFromFirestore(): Promise<{ success: boolean; count: number; message: string }> {
    const orders = storageService.getOrders();
    storageService.clearOrders();

    let deletedCount = 0;
    if (db) {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        const batch = writeBatch(db);
        snap.forEach(d => {
          batch.delete(d.ref);
          deletedCount++;
        });
        await batch.commit();
      } catch {}
    }

    this.broadcastUpdate({ id: 'all_cleared' } as any);
    return {
      success: true,
      count: deletedCount || orders.length,
      message: `Successfully removed ${deletedCount || orders.length} orders from Firestore and store records.`
    };
  },

  async pushAllOrdersToFirestore(): Promise<{ success: boolean; count: number; message: string }> {
    if (!db) {
      return { success: false, count: 0, message: 'Firebase Firestore is not initialized.' };
    }

    try {
      const orders = storageService.getOrders();
      if (orders.length === 0) {
        return { success: true, count: 0, message: 'No orders to push.' };
      }

      const batch = writeBatch(db);
      for (const order of orders) {
        const docRef = doc(db, 'orders', order.id);
        batch.set(docRef, order, { merge: true });
      }

      await batch.commit();
      return { 
        success: true, 
        count: orders.length, 
        message: `Successfully pushed ${orders.length} orders into Firestore collection "orders"!` 
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to push orders to Firestore.'
      };
    }
  },

  broadcastUpdate(order: Order) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_orders_updated', { detail: order }));
    }
    if (channel) {
      channel.postMessage({ type: 'ORDER_UPDATED', order });
    }
  }
};
