import { Coupon, CouponUserContext, CouponRedemption } from '@/types';
import { storageService } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';

export const couponService = {
  getAllCoupons(): Coupon[] {
    return storageService.getCoupons();
  },

  getActiveCoupons(): Coupon[] {
    const now = Date.now();
    return this.getAllCoupons().filter(c => {
      if (!c.isActive) return false;
      if (c.startDate && new Date(c.startDate).getTime() > now) return false;
      if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false;
      if (c.usageLimit && (c.usageCount || 0) >= c.usageLimit) return false;
      return true;
    });
  },

  getUserCouponUsageCount(coupon: Coupon, userContext?: CouponUserContext): number {
    if (!userContext) return 0;
    const uid = (userContext.userId || '').toLowerCase().trim();
    const email = (userContext.email || '').toLowerCase().trim();
    const cleanPhone = (userContext.phone || '').replace(/\D/g, '');

    if (!uid && !email && !cleanPhone) return 0;

    let count = 0;

    // 1. Check coupon redemptions log
    if (Array.isArray(coupon.redemptions)) {
      coupon.redemptions.forEach(r => {
        const rUid = (r.userId || '').toLowerCase().trim();
        const rEmail = (r.email || '').toLowerCase().trim();
        const rPhone = (r.phone || '').replace(/\D/g, '');

        if ((uid && rUid === uid) || (email && rEmail === email) || (cleanPhone && rPhone && rPhone === cleanPhone)) {
          count++;
        }
      });
    }

    // 2. Cross-verify with completed orders in storage for this coupon code
    try {
      const orders = storageService.getOrders();
      const codeUpper = coupon.code.toUpperCase().trim();
      const userOrders = orders.filter(o => {
        if (!o.appliedCoupon || o.appliedCoupon.toUpperCase().trim() !== codeUpper) return false;
        // Don't count cancelled/refunded orders
        if (o.orderStatus === 'cancelled') return false;

        const oCustId = (o.customerId || '').toLowerCase().trim();
        const oEmail = (o.customerEmail || '').toLowerCase().trim();
        const oPhone = (o.customerPhone || '').replace(/\D/g, '');

        return (uid && oCustId === uid) || (email && oEmail === email) || (cleanPhone && oPhone && oPhone === cleanPhone);
      });

      count = Math.max(count, userOrders.length);
    } catch {
      // fallback to redemption count
    }

    return count;
  },

  validateCoupon(
    code: string, 
    cartSubtotal: number, 
    userContext?: CouponUserContext
  ): { valid: boolean; coupon?: Coupon; discountAmount: number; message: string } {
    const coupons = storageService.getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: 'Invalid promo code' };
    }

    if (!coupon.isActive) {
      return { valid: false, discountAmount: 0, message: 'This promo code is currently inactive' };
    }

    const now = Date.now();
    if (coupon.startDate && new Date(coupon.startDate).getTime() > now) {
      return { valid: false, discountAmount: 0, message: 'This promo offer has not started yet' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
      return { valid: false, discountAmount: 0, message: 'This promo code has expired' };
    }

    // Overall / Total usage limit check across all customers
    if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, message: 'This promo code has reached its maximum total redemptions' };
    }

    // Per-user usage limit check (one code which time to use one user, e.g. 1 use per customer)
    if (coupon.perCustomerLimit && coupon.perCustomerLimit > 0 && userContext) {
      const userUsage = this.getUserCouponUsageCount(coupon, userContext);
      if (userUsage >= coupon.perCustomerLimit) {
        const msg = coupon.perCustomerLimit === 1
          ? 'This exclusive one-time promo code has already been redeemed for your account/phone.'
          : `You have reached the maximum limit (${coupon.perCustomerLimit} times) for this promo code.`;
        return { valid: false, discountAmount: 0, message: msg };
      }
    }

    if (cartSubtotal < coupon.minSpend) {
      return { 
        valid: false, 
        discountAmount: 0, 
        message: `Minimum spend of ₹${coupon.minSpend.toLocaleString('en-IN')} required for this code (Current: ₹${cartSubtotal.toLocaleString('en-IN')})` 
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (cartSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, cartSubtotal);
    }

    return {
      valid: true,
      coupon,
      discountAmount: Number(discountAmount.toFixed(2)),
      message: `Coupon ${coupon.code} applied successfully!`
    };
  },

  async recordCouponUsage(
    code: string, 
    userContext?: CouponUserContext & { orderId?: string }
  ): Promise<boolean> {
    const coupons = storageService.getCoupons();
    const idx = coupons.findIndex(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (idx === -1) return false;

    const coupon = { ...coupons[idx] };
    coupon.usageCount = (coupon.usageCount || 0) + 1;

    const redemption: CouponRedemption = {
      userId: userContext?.userId,
      email: userContext?.email,
      phone: userContext?.phone,
      orderId: userContext?.orderId,
      usedAt: new Date().toISOString()
    };

    const redemptions = Array.isArray(coupon.redemptions) ? [...coupon.redemptions, redemption] : [redemption];
    coupon.redemptions = redemptions;

    const usedBySet = new Set(Array.isArray(coupon.usedByUsers) ? coupon.usedByUsers : []);
    if (userContext?.userId) usedBySet.add(userContext.userId.toLowerCase().trim());
    if (userContext?.email) usedBySet.add(userContext.email.toLowerCase().trim());
    if (userContext?.phone) usedBySet.add(userContext.phone.replace(/\D/g, ''));
    coupon.usedByUsers = Array.from(usedBySet);

    await this.updateCoupon(coupon);
    return true;
  },

  async addCoupon(coupon: Coupon): Promise<Coupon> {
    const added = storageService.addCoupon(coupon);

    if (db) {
      try {
        await setDoc(doc(db, 'coupons', added.id), added);
        console.log(`MUETY Cloud: Coupon "${added.code}" saved to Firestore collection "coupons"`);
      } catch (err) {
        console.warn('Firestore coupon save warning:', err);
      }
    }

    return added;
  },

  async updateCoupon(coupon: Coupon): Promise<Coupon> {
    const updated = storageService.updateCoupon(coupon);

    if (db) {
      try {
        await setDoc(doc(db, 'coupons', updated.id), updated, { merge: true });
        console.log(`MUETY Cloud: Coupon "${updated.code}" updated in Firestore`);
      } catch (err) {
        console.warn('Firestore coupon update warning:', err);
      }
    }

    return updated;
  },

  async deleteCoupon(id: string): Promise<boolean> {
    const result = storageService.deleteCoupon(id);

    if (db) {
      try {
        await deleteDoc(doc(db, 'coupons', id));
        console.log(`MUETY Cloud: Coupon "${id}" deleted from Firestore`);
      } catch (err) {
        console.warn('Firestore coupon delete warning:', err);
      }
    }

    return result;
  },

  subscribeToCoupons(callback: (coupons: Coupon[]) => void): Unsubscribe {
    callback(storageService.getCoupons());

    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'coupons'), (snapshot) => {
          if (!snapshot.empty) {
            const cloudCoupons: Coupon[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as Coupon;
              if (raw && (raw.id || docSnap.id)) {
                cloudCoupons.push({ ...raw, id: raw.id || docSnap.id });
              }
            });

            storageService.saveCoupons(cloudCoupons);
            callback(cloudCoupons);
          } else {
            callback(storageService.getCoupons());
          }
        }, (err) => {
          console.warn('Firestore coupons subscription fallback:', err);
          callback(storageService.getCoupons());
        });

        return unsubscribe;
      } catch (err) {
        console.warn('Firestore coupons onSnapshot init error:', err);
      }
    }

    return () => {};
  },

  async pushAllCouponsToFirestore(): Promise<{ success: boolean; count: number; message: string }> {
    if (!db) {
      return { success: false, count: 0, message: 'Firebase Firestore is not initialized.' };
    }

    try {
      const coupons = storageService.getCoupons();
      if (coupons.length === 0) {
        return { success: true, count: 0, message: 'No coupons to push.' };
      }

      const batch = writeBatch(db);
      for (const coupon of coupons) {
        const docRef = doc(db, 'coupons', coupon.id);
        batch.set(docRef, coupon, { merge: true });
      }

      await batch.commit();
      console.log(`MUETY Cloud: ${coupons.length} coupons synchronized to Firestore collection "coupons"`);
      return {
        success: true,
        count: coupons.length,
        message: `Successfully pushed ${coupons.length} coupons to Firestore collection "coupons"!`
      };
    } catch (err: any) {
      console.error('Error pushing coupons to Firestore:', err);
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to push coupons to Firestore.'
      };
    }
  }
};
