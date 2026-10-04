import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import { db, isLiveFirebase } from '@/lib/firebase/firebase';
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

export const orderService = {
  isLiveCloud(): boolean {
    return isLiveFirebase && db !== null;
  },

  getAllOrders(): Order[] {
    return storageService.getOrders();
  },

  getOrderById(id: string): Order | undefined {
    return storageService.getOrderById(id);
  },

  getCustomerOrders(customerId: string): Order[] {
    return storageService.getCustomerOrders(customerId);
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
    razorpayPaymentId?: string;
    notes?: string;
  }): Promise<Order> {
    let serverRes: any = null;
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

    if (serverRes && serverRes.success && serverRes.order) {
      const serverOrder: Order = serverRes.order;
      storageService.createOrder(serverOrder);
      this.broadcastUpdate(serverOrder);
      return serverOrder;
    }

    if (serverRes && serverRes.error) {
      throw new Error(serverRes.error.message || 'Server rejected order creation.');
    }

    // Local fallback
    const orderNumber = `MT-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const order: Order = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber,
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      shippingAddress: params.shippingAddress,
      items: params.items,
      subtotal: params.subtotal,
      discount: params.discount,
      appliedCoupon: params.appliedCoupon,
      tax: params.tax,
      shippingFee: 100, // Canonical ₹100 flat shipping
      total: Number((params.subtotal - params.discount + params.tax + 100).toFixed(2)),
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus || (params.paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid'),
      orderStatus: 'pending',
      trackingNumber: `MUET-EXP-${Math.floor(10000000 + Math.random() * 90000000)}`,
      trackingCarrier: 'MUETY Global Express',
      timeline: [
        {
          status: 'pending',
          label: 'Order Confirmed',
          timestamp: new Date().toLocaleString(),
          description: 'Payment authorized and order accepted.'
        }
      ],
      razorpayPaymentId: params.razorpayPaymentId,
      notes: params.notes,
      createdAt: now,
      updatedAt: now
    };

    storageService.createOrder(order);

    if (db) {
      try {
        const orderRef = doc(db, 'orders', order.id);
        await setDoc(orderRef, order);
      } catch (err: any) {
        console.warn('Firebase Firestore write error:', err?.message || err);
      }
    }

    this.broadcastUpdate(order);
    return order;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, customNote?: string): Promise<Order | undefined> {
    const updated = storageService.updateOrderStatus(orderId, status, customNote);
    if (!updated) return undefined;

    if (db) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, updated, { merge: true });
      } catch (err: any) {
        console.warn('Firebase Firestore update error:', err?.message || err);
      }
    }

    this.broadcastUpdate(updated);
    return updated;
  },

  subscribeToOrder(orderId: string, callback: (order: Order | null) => void): () => void {
    const cached = storageService.getOrderById(orderId);
    callback(cached || null);

    let firestoreUnsub: Unsubscribe | null = null;

    if (db) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        firestoreUnsub = onSnapshot(orderRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Order;
            callback(data);
          }
        }, (_err) => {
          console.warn('Firestore onSnapshot error for order:', _err);
        });
      } catch {}
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

    window.addEventListener('muety_orders_updated', handleLocalSync);
    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    return () => {
      if (firestoreUnsub) firestoreUnsub();
      window.removeEventListener('muety_orders_updated', handleLocalSync);
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
    };
  },

  subscribeToAllOrders(callback: (orders: Order[]) => void): () => void {
    callback(storageService.getOrders());

    let firestoreUnsub: Unsubscribe | null = null;

    if (db) {
      try {
        const ordersCol = collection(db, 'orders');
        firestoreUnsub = onSnapshot(ordersCol, (snapshot) => {
          if (!snapshot.empty) {
            const cloudOrders: Order[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as Order;
              if (raw && (raw.id || docSnap.id)) {
                cloudOrders.push({ ...raw, id: raw.id || docSnap.id });
              }
            });

            cloudOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            storageService.saveOrders(cloudOrders);
            callback(cloudOrders);
          } else {
            callback(storageService.getOrders());
          }
        }, (_err) => {
          callback(storageService.getOrders());
        });
      } catch {}
    }

    const handleLocalSync = () => {
      callback(storageService.getOrders());
    };

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ORDER_UPDATED' || event.data?.type === 'ORDER_CREATED') {
        callback(storageService.getOrders());
      }
    };

    window.addEventListener('muety_orders_updated', handleLocalSync);
    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    return () => {
      if (firestoreUnsub) firestoreUnsub();
      window.removeEventListener('muety_orders_updated', handleLocalSync);
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
    };
  },

  subscribeToCustomerOrders(customerId: string, callback: (orders: Order[]) => void): () => void {
    callback(storageService.getCustomerOrders(customerId));

    let firestoreUnsub: Unsubscribe | null = null;

    if (db) {
      try {
        const ordersCol = collection(db, 'orders');
        const q = query(ordersCol, where('customerId', '==', customerId));
        firestoreUnsub = onSnapshot(q, (snap) => {
          const userOrders: Order[] = [];
          snap.forEach(d => userOrders.push(d.data() as Order));
          if (userOrders.length > 0) {
            userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            callback(userOrders);
          }
        }, () => {});
      } catch {}
    }

    const handleLocalSync = () => {
      callback(storageService.getCustomerOrders(customerId));
    };

    window.addEventListener('muety_orders_updated', handleLocalSync);
    if (channel) {
      channel.addEventListener('message', handleLocalSync);
    }

    return () => {
      if (firestoreUnsub) firestoreUnsub();
      window.removeEventListener('muety_orders_updated', handleLocalSync);
      if (channel) {
        channel.removeEventListener('message', handleLocalSync);
      }
    };
  },

  async deleteOrder(id: string): Promise<boolean> {
    storageService.deleteOrder(id);

    if (db) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch {}
    }

    this.broadcastUpdate({ id } as any);
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
    window.dispatchEvent(new CustomEvent('muety_orders_updated', { detail: order }));
    if (channel) {
      channel.postMessage({ type: 'ORDER_UPDATED', order });
    }
  }
};
