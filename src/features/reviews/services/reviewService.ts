import { PatronReview } from '@/types';
import { storageService } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';

class ReviewService {
  getAllReviews(): PatronReview[] {
    return storageService.getReviews();
  }

  getFeaturedReviews(): PatronReview[] {
    return storageService.getReviews().filter(r => r.status === 'approved' && r.isFeatured);
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

  async addReview(reviewData: Omit<PatronReview, 'id' | 'createdAt'>): Promise<PatronReview> {
    const newReview: PatronReview = {
      ...reviewData,
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    
    storageService.addReview(newReview);

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', newReview.id), newReview);
        console.log(`MUETY Cloud: Review saved to Firestore collection "reviews"`);
      } catch (err) {
        console.warn('Firestore review save note:', err);
      }
    }

    return newReview;
  }

  async updateReviewStatus(id: string, status: 'approved' | 'rejected' | 'pending'): Promise<PatronReview | undefined> {
    const review = this.getReviewById(id);
    if (!review) return undefined;
    
    const updated: PatronReview = {
      ...review,
      status
    };
    
    storageService.updateReview(updated);

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', updated.id), updated, { merge: true });
        console.log(`MUETY Cloud: Review status updated in Firestore`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    return updated;
  }

  async toggleFeatured(id: string): Promise<PatronReview | undefined> {
    const review = this.getReviewById(id);
    if (!review) return undefined;

    const updated: PatronReview = {
      ...review,
      isFeatured: !review.isFeatured,
      status: (!review.isFeatured && review.status === 'pending') ? 'approved' : review.status
    };
    
    storageService.updateReview(updated);

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', updated.id), updated, { merge: true });
        console.log(`MUETY Cloud: Review featured flag updated in Firestore`);
      } catch (err) {
        console.warn('Firestore review update note:', err);
      }
    }

    return updated;
  }

  async deleteReview(id: string): Promise<boolean> {
    storageService.deleteReview(id);

    if (db) {
      try {
        await deleteDoc(doc(db, 'reviews', id));
        console.log(`MUETY Cloud: Review deleted from Firestore`);
      } catch (err) {
        console.warn('Firestore review delete note:', err);
      }
    }

    return true;
  }

  subscribeToReviews(callback: (reviews: PatronReview[]) => void): Unsubscribe {
    callback(storageService.getReviews());

    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'reviews'), (snapshot) => {
          if (!snapshot.empty) {
            const cloudReviews: PatronReview[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as PatronReview;
              if (raw && (raw.id || docSnap.id)) {
                cloudReviews.push({ ...raw, id: raw.id || docSnap.id });
              }
            });

            cloudReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            storageService.saveReviews(cloudReviews);
            callback(cloudReviews);
          } else {
            storageService.saveReviews([]);
            callback([]);
          }
        }, (err) => {
          console.warn('Firestore reviews subscription note:', err);
          callback(storageService.getReviews());
        });

        return unsubscribe;
      } catch (err) {
        console.warn('Firestore reviews onSnapshot init error:', err);
      }
    }

    const handler = () => callback(storageService.getReviews());
    window.addEventListener('muety_reviews_updated', handler);
    return () => window.removeEventListener('muety_reviews_updated', handler);
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
