import { Coupon } from '@/types';
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

  validateCoupon(code: string, cartSubtotal: number): { valid: boolean; coupon?: Coupon; discountAmount: number; message: string } {
    const coupons = storageService.getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: 'Invalid promo code' };
    }

    if (!coupon.isActive) {
      return { valid: false, discountAmount: 0, message: 'This promo code is currently inactive' };
    }

    if (new Date(coupon.expiresAt).getTime() < Date.now()) {
      return { valid: false, discountAmount: 0, message: 'This promo code has expired' };
    }

    if (cartSubtotal < coupon.minSpend) {
      return { 
        valid: false, 
        discountAmount: 0, 
        message: `Minimum spend of ₹${coupon.minSpend} required for this code` 
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (cartSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      valid: true,
      coupon,
      discountAmount: Number(discountAmount.toFixed(2)),
      message: `Coupon ${coupon.code} applied successfully!`
    };
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
