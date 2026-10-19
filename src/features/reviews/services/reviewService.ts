import { PatronReview } from '@/types';
import { storageService } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';

class ReviewService {
  getAllReviews(): PatronReview[] {
    return storageService.getReviews();
  }

  getFeaturedReviews(): PatronReview[] {
    return storageService.getReviews()
      .filter(r => r.status === 'approved' && (r.isFeatured || r.showOnHome))
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }

  getApprovedReviews(productId?: string): PatronReview[] {
    const reviews = storageService.getReviews().filter(r => r.status === 'approved');
    if (productId) {
      return reviews.filter(r => r.productId === productId);
    }
    return reviews;
  }

  getReviewById(id: string): PatronReview | undefined {
    return storageService.getReviews().find(r => r.id === id);
  }

  private async syncProductRatingAndCount(productId?: string) {
    if (!productId) return;
    try {
      const approvedReviews = this.getApprovedReviews(productId);
      const reviewCount = approvedReviews.length;
      const totalRating = approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
      const rating = reviewCount > 0 ? Number((totalRating / reviewCount).toFixed(1)) : 5.0;

      const prod = storageService.getProductById(productId);
      if (prod) {
        prod.reviewCount = reviewCount;
        prod.rating = rating;
        storageService.updateProduct(prod);
      }

      if (db) {
        const prodRef = doc(db, 'products', productId);
        const prodSnap = await getDoc(prodRef);
        // Only update rating and reviewCount if the product document already exists in Firestore.
        // Never call setDoc with merge:true on non-existent product IDs, which would create phantom "Untitled Product" stubs.
        if (prodSnap.exists()) {
          await updateDoc(prodRef, { reviewCount, rating });
        }
      }
    } catch (err) {
      console.warn('Firestore product rating/count sync note:', err);
    }
  }

  async addReview(reviewData: Omit<PatronReview, 'id' | 'createdAt'> & { productSlug?: string }): Promise<PatronReview> {
    const newReview: PatronReview = {
      ...reviewData,
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    
    if (db) {
      try {
        await setDoc(doc(db, 'reviews', newReview.id), newReview, { merge: true });
        console.log(`MUETY Cloud: Review saved to Firestore collection "reviews"`);
      } catch (err) {
        console.warn('Firestore review save note:', err);
      }
    }

    storageService.addReview(newReview);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_reviews_updated'));
    }
    await this.syncProductRatingAndCount(newReview.productId);
    return newReview;
  }

  async updateReview(id: string, updates: Partial<PatronReview>): Promise<PatronReview | undefined> {
    const existing = this.getReviewById(id);
    const updated: PatronReview = {
      ...(existing || {} as PatronReview),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', id), updated, { merge: true });
        console.log(`MUETY Cloud: Review ${id} updated in Firestore`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    storageService.updateReview(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_reviews_updated'));
    }
    if (updated.productId || existing?.productId) {
      await this.syncProductRatingAndCount(updated.productId || existing?.productId);
    }
    return updated;
  }

  async updateReviewStatus(id: string, status: 'approved' | 'rejected' | 'pending'): Promise<PatronReview | undefined> {
    const review = this.getReviewById(id);
    if (!review) {
      if (db) {
        try {
          const docRef = doc(db, 'reviews', id);
          await setDoc(docRef, { status }, { merge: true });
        } catch (err) {
          console.warn('Firestore review status update direct note:', err);
        }
      }
      return undefined;
    }
    
    const updated: PatronReview = {
      ...review,
      status
    };
    
    if (db) {
      try {
        await setDoc(doc(db, 'reviews', updated.id), updated, { merge: true });
        console.log(`MUETY Cloud: Review status updated in Firestore`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    storageService.updateReview(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_reviews_updated'));
    }
    await this.syncProductRatingAndCount(updated.productId);
    return updated;
  }

  async toggleFeatured(id: string): Promise<PatronReview | undefined> {
    const review = this.getReviewById(id);
    if (!review) return undefined;

    const nextFeatured = !review.isFeatured;
    const updated: PatronReview = {
      ...review,
      isFeatured: nextFeatured,
      showOnHome: nextFeatured,
      status: (nextFeatured && review.status === 'pending') ? 'approved' : review.status,
      updatedAt: new Date().toISOString()
    };
    
    if (db) {
      try {
        await setDoc(doc(db, 'reviews', updated.id), updated, { merge: true });
        console.log(`MUETY Cloud: Review featured flag updated in Firestore`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    storageService.updateReview(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_reviews_updated'));
    }
    await this.syncProductRatingAndCount(updated.productId);
    return updated;
  }

  async updateReviewDisplayOrder(id: string, displayOrder: number): Promise<PatronReview | undefined> {
    const review = this.getReviewById(id);
    if (!review) return undefined;

    const updated: PatronReview = {
      ...review,
      displayOrder,
      updatedAt: new Date().toISOString()
    };

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', updated.id), { displayOrder, updatedAt: updated.updatedAt }, { merge: true });
      } catch (err) {
        console.warn('Firestore review displayOrder update note:', err);
      }
    }

    storageService.updateReview(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_reviews_updated'));
    }
    return updated;
  }

  async deleteReview(id: string): Promise<boolean> {
    const target = this.getReviewById(id);
    if (db) {
      try {
        await deleteDoc(doc(db, 'reviews', id));
        console.log(`MUETY Cloud: Review deleted from Firestore`);
      } catch (err) {
        console.warn('Firestore review delete note:', err);
      }
    }

    storageService.deleteReview(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_reviews_updated'));
    }
    if (target?.productId) {
      await this.syncProductRatingAndCount(target.productId);
    }
    return true;
  }

  subscribeToProductReviews(
    productIdentifier: string | string[],
    callback: (reviews: PatronReview[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const rawList = Array.isArray(productIdentifier) ? productIdentifier : [productIdentifier];
    const cleanIds = rawList
      .filter(Boolean)
      .map(item => String(item).trim().toLowerCase())
      .filter(s => s.length > 0);

    const filterApproved = (all: PatronReview[]) => {
      return all.filter(r => {
        if (r.status !== 'approved') return false;
        if (cleanIds.length === 0) return true;
        const rProdId = (r.productId || '').trim().toLowerCase();
        const rSlug = ((r as any).productSlug || '').trim().toLowerCase();
        const rName = (r.productName || '').trim().toLowerCase();

        return cleanIds.some(target => 
          (rProdId && (rProdId === target || target.includes(rProdId) || rProdId.includes(target))) ||
          (rSlug && (rSlug === target || target.includes(rSlug) || rSlug.includes(target))) ||
          (rName && (rName === target || target.includes(rName) || rName.includes(target)))
        );
      }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    };

    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'reviews'), (snapshot) => {
          const cloudReviews: PatronReview[] = [];
          if (!snapshot.empty) {
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as PatronReview;
              if (raw && (raw.id || docSnap.id)) {
                cloudReviews.push({ ...raw, id: docSnap.id || raw.id });
              }
            });
            cloudReviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            storageService.saveReviews(cloudReviews);
            callback(filterApproved(cloudReviews));
          } else {
            const local = storageService.getReviews();
            if (local && local.length > 0) {
              if (db) {
                const firestoreDb = db;
                local.forEach(r => {
                  setDoc(doc(firestoreDb, 'reviews', r.id), r, { merge: true }).catch(() => {});
                });
              }
              callback(filterApproved(local));
            } else {
              callback([]);
            }
          }
        }, (err) => {
          if (onError) onError(err);
          else callback(filterApproved(storageService.getReviews()));
        });

        return unsubscribe;
      } catch (err: any) {
        if (onError) onError(err);
      }
    }

    callback(filterApproved(storageService.getReviews()));
    const handler = () => callback(filterApproved(storageService.getReviews()));
    window.addEventListener('muety_reviews_updated', handler);
    return () => window.removeEventListener('muety_reviews_updated', handler);
  }

  subscribeToReviews(callback: (reviews: PatronReview[]) => void, onError?: (err: Error) => void): Unsubscribe {
    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'reviews'), (snapshot) => {
          if (!snapshot.empty) {
            const cloudReviews: PatronReview[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as PatronReview;
              if (raw && (raw.id || docSnap.id)) {
                cloudReviews.push({ ...raw, id: docSnap.id || raw.id });
              }
            });

            cloudReviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            storageService.saveReviews(cloudReviews);
            callback(cloudReviews);
          } else {
            const local = storageService.getReviews();
            if (local && local.length > 0) {
              if (db) {
                const firestoreDb = db;
                local.forEach(r => {
                  setDoc(doc(firestoreDb, 'reviews', r.id), r, { merge: true }).catch(() => {});
                });
              }
              callback(local);
            } else {
              callback([]);
            }
          }

        }, (err) => {
          if (onError) onError(err);
          else callback(storageService.getReviews());
        });


        return unsubscribe;
      } catch (err: any) {
        if (onError) onError(err);
      }
    }

    callback(storageService.getReviews());
    const handler = () => callback(storageService.getReviews());
    window.addEventListener('muety_reviews_updated', handler);
    return () => window.removeEventListener('muety_reviews_updated', handler);
  }

  subscribeToApprovedReviews(callback: (reviews: PatronReview[]) => void, onError?: (err: Error) => void): Unsubscribe {
    return this.subscribeToReviews((all) => {
      const approved = all.filter(r => r.status === 'approved');
      callback(approved);
    }, onError);
  }

  getStatistics() {
    const reviews = this.getAllReviews();
    const approved = reviews.filter(r => r.status === 'approved');
    const pending = reviews.filter(r => r.status === 'pending');
    const featured = reviews.filter(r => r.isFeatured && r.status === 'approved');
    const verified = reviews.filter(r => r.verifiedPurchase);
    
    const totalRating = approved.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = approved.length > 0 ? (totalRating / approved.length).toFixed(1) : '5.0';

    return {
      total: reviews.length,
      approved: approved.length,
      approvedCount: approved.length,
      pending: pending.length,
      pendingCount: pending.length,
      featured: featured.length,
      featuredCount: featured.length,
      verifiedPurchases: verified.length,
      verifiedCount: verified.length,
      averageRating: avgRating
    };
  }
}

export const reviewService = new ReviewService();
