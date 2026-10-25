import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reviewService } from '@/features/reviews/services/reviewService';
import { storageService } from '@/lib/storage/storageService';
import { handleSubmitReviewServer, handleDeleteReviewServer } from '../../server/reviewApi';

describe('Patron Reviews — Cloud Persistence, Synchronization & Deletion Resilience', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] || null,
      length: Object.keys(store).length
    } as any;

    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = {
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    }
    vi.restoreAllMocks();
  });

  describe('1. Review Addition & Sanitization', () => {
    it('creates review with sanitized fields, preventing Firestore undefined errors', async () => {
      const review = await reviewService.addReview({
        productId: 'prod-test-01',
        productSlug: 'test-saree',
        productName: 'Kanchipuram Silk Saree',
        authorName: 'Aishwarya R.',
        authorLocation: 'Bengaluru',
        rating: 5,
        title: 'Breathtaking Drape',
        quote: 'The pure zari work and mulberry silk feel truly regal.',
        comment: 'The pure zari work and mulberry silk feel truly regal.',
        status: 'approved',
        isFeatured: false,
        verifiedPurchase: true,
        photoUrl: undefined // Specifically test undefined value handling
      });

      expect(review).toBeDefined();
      expect(review.id).toMatch(/^rev-/);
      expect(review.rating).toBe(5);
      expect(review.productId).toBe('prod-test-01');

      // Verify stored in storageService
      const all = storageService.getReviews();
      expect(all.some(r => r.id === review.id)).toBe(true);
    });

    it('syncs product reviewCount and average rating when review is added', async () => {
      // Seed product
      storageService.saveProducts([
        {
          id: 'prod-sync-01',
          name: 'Banarasi Brocade Saree',
          slug: 'banarasi-brocade',
          price: 25000,
          category: 'Festive Sarees',
          categorySlug: 'festive-sarees',
          images: ['/saree.jpg'],
          rating: 0,
          reviewCount: 0
        } as any
      ]);

      await reviewService.addReview({
        productId: 'prod-sync-01',
        rating: 5,
        authorName: 'Meenakshi K.',
        status: 'approved',
        quote: 'Superb quality'
      });

      const updatedProd = storageService.getProductById('prod-sync-01');
      expect(updatedProd?.reviewCount).toBe(1);
      expect(updatedProd?.rating).toBe(5.0);
    });
  });

  describe('2. Review Deletion Resilience (No Resurrection)', () => {
    it('deletes review and removes it from storageService permanently', async () => {
      const rev = await reviewService.addReview({
        productId: 'prod-del-01',
        rating: 4,
        authorName: 'Sneha M.',
        status: 'approved',
        quote: 'Lovely weave'
      });

      expect(storageService.getReviews().some(r => r.id === rev.id)).toBe(true);

      const deleted = await reviewService.deleteReview(rev.id);
      expect(deleted).toBe(true);
      expect(storageService.getReviews().some(r => r.id === rev.id)).toBe(false);
    });

    it('ensures storageService.getReviews filters out legacy test review rev-1791267536030-832', () => {
      // Simulate stale review present in localStorage
      localStorage.setItem('muety_reviews_v1', JSON.stringify([
        { id: 'rev-1791267536030-832', authorName: 'hi', comment: 'good', rating: 5 },
        { id: 'rev-valid-999', authorName: 'Valid Patron', comment: 'Excellent', rating: 5 }
      ]));

      const reviews = storageService.getReviews();
      expect(reviews.some(r => r.id === 'rev-1791267536030-832')).toBe(false);
      expect(reviews.some(r => r.id === 'rev-valid-999')).toBe(true);
    });
  });

  describe('3. Server-Authoritative Review API', () => {
    it('validates review creation on server and generates clean review payload', async () => {
      const result = await handleSubmitReviewServer(null, {
        productId: 'prod-srv-01',
        productSlug: 'srv-saree',
        productName: 'Server Certified Saree',
        authorName: 'Deepa S.',
        rating: 5,
        quote: 'Magnificent luster',
        photoUrl: ''
      });

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review.productId).toBe('prod-srv-01');
      expect(result.review.rating).toBe(5);
    });

    it('rejects invalid review data missing productId or with out-of-range rating', async () => {
      await expect(
        handleSubmitReviewServer(null, { rating: 5, authorName: 'Test' })
      ).rejects.toThrow('productId is required');

      await expect(
        handleSubmitReviewServer(null, { productId: 'prod-1', rating: 7 })
      ).rejects.toThrow('rating must be a number between 1 and 5');
    });

    it('enforces admin authorization on review deletion endpoint', async () => {
      await expect(
        handleDeleteReviewServer(null, { id: 'rev-unauth' })
      ).rejects.toThrow('UNAUTHENTICATED');
    });
  });
});
