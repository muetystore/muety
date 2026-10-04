import { db, isLiveFirebase } from '@/lib/firebase/firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { InventoryTransaction, InventoryTransactionType } from '@/shared/types';
import { storageService } from '@/lib/storage/storageService';

const INVENTORY_TX_KEY = 'muety_inventory_transactions_v1';

export class InventoryService {
  private static instance: InventoryService;

  private constructor() {}

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  async recordTransaction(params: {
    productId: string;
    productName: string;
    sku: string;
    type: InventoryTransactionType;
    quantity: number;
    previousStock: number;
    newStock: number;
    referenceId?: string;
    performedBy: string;
    reason?: string;
  }): Promise<InventoryTransaction> {
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTx: InventoryTransaction = {
      transactionId,
      productId: params.productId,
      productName: params.productName,
      sku: params.sku,
      type: params.type,
      quantity: params.quantity,
      previousStock: params.previousStock,
      newStock: params.newStock,
      referenceId: params.referenceId || '',
      performedBy: params.performedBy,
      reason: params.reason || '',
      timestamp: new Date().toISOString()
    };

    // Save to Firestore
    if (db && isLiveFirebase) {
      try {
        await setDoc(doc(db, 'inventoryTransactions', transactionId), newTx);
      } catch (err) {
        console.warn('Firestore setDoc inventory transaction note:', err);
      }
    }

    // Save to LocalStorage fallback
    try {
      if (typeof window !== 'undefined') {
        const existingRaw = localStorage.getItem(INVENTORY_TX_KEY);
        const txs: InventoryTransaction[] = existingRaw ? JSON.parse(existingRaw) : [];
        txs.unshift(newTx);
        if (txs.length > 500) txs.pop();
        localStorage.setItem(INVENTORY_TX_KEY, JSON.stringify(txs));
        window.dispatchEvent(new Event('muety_inventory_updated'));
      }
    } catch {}

    return newTx;
  }

  async getTransactions(max: number = 100): Promise<InventoryTransaction[]> {
    if (db && isLiveFirebase) {
      try {
        const q = query(collection(db, 'inventoryTransactions'), orderBy('timestamp', 'desc'), limit(max));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as InventoryTransaction);
        }
      } catch (err) {
        console.warn('Firestore fetch inventory transactions note:', err);
      }
    }

    try {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(INVENTORY_TX_KEY);
        return data ? JSON.parse(data) : [];
      }
    } catch {}

    return [];
  }
}

export const inventoryService = InventoryService.getInstance();
