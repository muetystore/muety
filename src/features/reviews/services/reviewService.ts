import { PatronReview } from '@/types';
import { storageService } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { getAuthHeaders } from '@/shared/utils/authHeader';
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

/**
 * Removes any undefined or null keys so Firestore JS SDK never throws
 * "Unsupported field value: undefined".
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

function getApiUrl(endpoint: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost:0')) {
    return `${window.location.origin}${endpoint}`;
  }
  return endpoint;
}

class ReviewService {
  getAllReviews(): PatronReview[] {
    return storageService.getReviews();
  }

  getFeaturedReviews(): PatronReview[] {
    return storageService.getReviews()
      .filter(r => !r.archived && (r.status || 'approved') === 'approved' && Boolean(r.isFeatured))
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }

  getApprovedReviews(productId?: string): PatronReview[] {
    const reviews = storageService.getReviews().filter(r => !r.archived && r.status === 'approved');
    if (productId) {
      const cleanTarget = productId.trim().toLowerCase();
      return reviews.filter(r => {
        const rProdId = (r.productId || '').trim().toLowerCase();
        const rSlug = ((r as any).productSlug || '').trim().toLowerCase();
        return rProdId === cleanTarget || rSlug === cleanTarget;
      });
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
        if (prodSnap.exists()) {
          await updateDoc(prodRef, { reviewCount, rating });
        }
      }
    } catch (err) {
      console.warn('Firestore product rating/count sync note:', err);
    }
  }

  async addReview(reviewData: Partial<PatronReview> & { rating?: number; productSlug?: string; id?: string }): Promise<PatronReview> {
    const rawQuote = reviewData.quote || reviewData.comment || 'Patron Review';
    const newReview: PatronReview = {
      productName: reviewData.productName || 'Patron Review',
      authorName: reviewData.authorName || 'Patron',
      authorLocation: reviewData.authorLocation || 'India',
      verifiedPurchase: reviewData.verifiedPurchase !== undefined ? reviewData.verifiedPurchase : true,
      isFeatured: Boolean(reviewData.isFeatured),
      productId: reviewData.productId || 'general',
      ...reviewData,
      quote: rawQuote,
      comment: reviewData.comment || rawQuote,
      id: reviewData.id || `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rating: Number(reviewData.rating) || 5,
      status: reviewData.status || 'approved',
      createdAt: new Date().toISOString()
    };

    const cleanDoc = sanitizeForFirestore(newReview);
    
    // 1. Client-side Firestore direct persistence
    if (db) {
      try {
        await setDoc(doc(db, 'reviews', newReview.id), cleanDoc);
        console.log(`MUETY Cloud: Review ${newReview.id} saved to Firestore "reviews" collection.`);
      } catch (err) {
        console.warn('Firestore client review save note:', err);
      }
    }

    // 2. Server-side authoritative API fallback/sync to guarantee cloud persistence
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        fetch(getApiUrl('/api/reviews/submit'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanDoc)
        }).catch(() => {});
      } catch {}
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

    const cleanDoc = sanitizeForFirestore(updated);

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', id), cleanDoc, { merge: true });
        console.log(`MUETY Cloud: Review ${id} updated in Firestore`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const headers = await getAuthHeaders();
        fetch(getApiUrl('/api/reviews/update'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ id, updates: cleanDoc })
        }).catch(() => {});
      } catch {}
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
          await setDoc(docRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (err) {
          console.warn('Firestore review status update direct note:', err);
        }
      }
      return undefined;
    }
    
    const updated: PatronReview = {
      ...review,
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (db) {
      try {
        await setDoc(doc(db, 'reviews', updated.id), sanitizeForFirestore(updated), { merge: true });
        console.log(`MUETY Cloud: Review status updated in Firestore to ${status}`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const headers = await getAuthHeaders();
        fetch(getApiUrl('/api/reviews/update'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: updated.id, updates: { status, updatedAt: updated.updatedAt } })
        }).catch(() => {});
      } catch {}
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
        await setDoc(doc(db, 'reviews', updated.id), sanitizeForFirestore(updated), { merge: true });
        console.log(`MUETY Cloud: Review featured flag updated in Firestore`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const headers = await getAuthHeaders();
        fetch(getApiUrl('/api/reviews/update'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            id: updated.id, 
            updates: { 
              isFeatured: nextFeatured, 
              showOnHome: nextFeatured, 
              status: updated.status, 
              updatedAt: updated.updatedAt 
            } 
          })
        }).catch(() => {});
      } catch {}
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

    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const headers = await getAuthHeaders();
        fetch(getApiUrl('/api/reviews/update'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: updated.id, updates: { displayOrder, updatedAt: updated.updatedAt } })
        }).catch(() => {});
      } catch {}
    }

    storageService.updateReview(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_reviews_updated'));
    }
    return updated;
  }

  async archiveReview(id: string): Promise<PatronReview | undefined> {
    const existing = this.getReviewById(id);
    if (!existing) return undefined;
    const updated: PatronReview = {
      ...existing,
      archived: true,
      archivedAt: new Date().toISOString(),
      isFeatured: false,
      showOnHome: false,
      updatedAt: new Date().toISOString()
    };
    return this.updateReview(id, updated);
  }

  async unarchiveReview(id: string): Promise<PatronReview | undefined> {
    const existing = this.getReviewById(id);
    if (!existing) return undefined;
    const updated: PatronReview = {
      ...existing,
      archived: false,
      archivedAt: undefined,
      updatedAt: new Date().toISOString()
    };
    return this.updateReview(id, updated);
  }

  async deleteReview(id: string): Promise<boolean> {
    // For user data privacy, archive instead of permanently purging
    await this.archiveReview(id);
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
                cloudReviews.push({
                  ...raw,
                  id: docSnap.id || raw.id,
                  status: raw.status || 'approved'
                });
              }
            });
            cloudReviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            
            // Preserve freshly added local reviews (created in last 20 seconds) that might still be syncing
            const now = Date.now();
            const currentLocal = storageService.getReviews();
            const recentUnsynced = currentLocal.filter(lr => {
              const age = now - new Date(lr.createdAt || 0).getTime();
              return age < 20000 && !cloudReviews.some(cr => cr.id === lr.id);
            });

            const merged = [...recentUnsynced, ...cloudReviews].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );

            storageService.saveReviews(merged);
            callback(filterApproved(merged));
          } else {
            // Cloud collection is empty - do NOT resurrect deleted reviews!
            storageService.saveReviews([]);
            callback([]);
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
                cloudReviews.push({
                  ...raw,
                  id: docSnap.id || raw.id,
                  status: raw.status || 'approved'
                });
              }
            });

            cloudReviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

            // Preserve freshly added local reviews (created in last 20 seconds) that might still be syncing
            const now = Date.now();
            const currentLocal = storageService.getReviews();
            const recentUnsynced = currentLocal.filter(lr => {
              const age = now - new Date(lr.createdAt || 0).getTime();
              return age < 20000 && !cloudReviews.some(cr => cr.id === lr.id);
            });

            const merged = [...recentUnsynced, ...cloudReviews].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );

            storageService.saveReviews(merged);
            callback(merged);
          } else {
            // Cloud collection is empty - do NOT resurrect deleted reviews!
            storageService.saveReviews([]);
            callback([]);
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
    const active = reviews.filter(r => !r.archived);
    const archived = reviews.filter(r => Boolean(r.archived));
    const approved = active.filter(r => (r.status || 'approved') === 'approved');
    const pending = active.filter(r => r.status === 'pending');
    const rejected = active.filter(r => r.status === 'rejected');
    const featured = active.filter(r => Boolean(r.isFeatured) && (r.status || 'approved') === 'approved');
    const verified = active.filter(r => Boolean(r.verifiedPurchase));
    
    const validRatings = approved
      .map(r => Number(r.rating))
      .filter(n => !isNaN(n) && n > 0);
    const totalRating = validRatings.reduce((sum, r) => sum + r, 0);
    const calculatedAvg = validRatings.length > 0 ? (totalRating / validRatings.length) : 5.0;
    const avgRating = !isNaN(calculatedAvg) && calculatedAvg > 0 ? calculatedAvg.toFixed(1) : '5.0';

    return {
      total: active.length,
      approved: approved.length,
      approvedCount: approved.length,
      pending: pending.length,
      pendingCount: pending.length,
      rejected: rejected.length,
      rejectedCount: rejected.length,
      archived: archived.length,
      archivedCount: archived.length,
      featured: featured.length,
      featuredCount: featured.length,
      verifiedPurchases: verified.length,
      verifiedCount: verified.length,
      averageRating: avgRating
    };
  }
}

export const reviewService = new ReviewService();
