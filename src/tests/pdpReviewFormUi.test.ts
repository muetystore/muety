import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { reviewService } from '@/features/reviews/services/reviewService';
import { storageService } from '@/lib/storage/storageService';
import { PatronReview } from '@/types';

describe('Ecommerce Review Workflow & Home Page Featured Invariants (Flipkart/Meesho Pattern)', () => {
  const pdpCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
    'utf-8'
  );
  const homeCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/catalog/pages/HomePage.tsx'),
    'utf-8'
  );
  const accountCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/customers/pages/AccountPage.tsx'),
    'utf-8'
  );

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

    storageService.saveReviews([]);
  });

  describe('1. Product Detail Page (PDP) — Read-Only Patron Impressions', () => {
    it('does NOT contain a Write a Review button or inline submission form on PDP', () => {
      // Confirms PDP does not ask users to review
      expect(pdpCode).not.toContain('<span>Write a Review</span>');
      expect(pdpCode).not.toContain('pdp-muety-form-wrapper');
      expect(pdpCode).not.toContain('handleAddReview');
    });

    it('displays the Verified Buyer badge to signify verified reviews', () => {
      expect(pdpCode).toContain('Verified Buyer Reviews Only');
    });

    it('guides patrons in empty state to review from the Orders page after delivery', () => {
      expect(pdpCode).toContain('Verified patrons can share their experience from their Orders page after delivery.');
    });
  });

  describe('2. Homepage Featured Reviews & Zero-State Hiding', () => {
    it('strictly filters for approved reviews marked as featured', () => {
      expect(homeCode).toContain('approvedReviews');
      expect(homeCode).toContain('Boolean(r.isFeatured)');
      // Confirms no fallback to unfeatured or seed mock reviews
      expect(homeCode).not.toContain("Priyamvada Sundaram");
    });

    it('completely omits customer-reviews-section when featured reviews count is 0', () => {
      expect(homeCode).toContain('{displayReviews.length > 0 && (');
    });

    it('reviewService.getFeaturedReviews() returns only approved and featured items', () => {
      const unfeatured: PatronReview = {
        id: 'rev-unfeat',
        productId: 'prod-1',
        productName: 'Silk Saree',
        authorName: 'Patron A',
        authorLocation: 'Chennai',
        rating: 5,
        quote: 'Beautiful drape',
        verifiedPurchase: true,
        isFeatured: false,
        status: 'approved',
        createdAt: '2026-10-31T12:00:00.000Z'
      };

      const featured: PatronReview = {
        id: 'rev-feat',
        productId: 'prod-2',
        productName: 'Gold Tissue Saree',
        authorName: 'Patron B',
        authorLocation: 'Bengaluru',
        rating: 5,
        quote: 'Royal luster',
        verifiedPurchase: true,
        isFeatured: true,
        status: 'approved',
        createdAt: '2026-10-31T12:00:00.000Z'
      };

      storageService.saveReviews([unfeatured, featured]);
      const result = reviewService.getFeaturedReviews();

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('rev-feat');
      expect(result[0].isFeatured).toBe(true);
    });
  });

  describe('3. Order Details Review Flow (Meesho / Flipkart Architecture)', () => {
    it('provides Rate & Review Product action in order details for delivered items', () => {
      expect(accountCode).toContain('isDelivered');
      expect(accountCode).toContain('Rate & Review Product');
    });

    it('informs that review unlocks upon delivery for in-transit orders', () => {
      expect(accountCode).toContain('Rate & review unlocks on delivery');
    });

    it('allows editing an existing review and displays the previously awarded star rating', () => {
      expect(accountCode).toContain('Reviewed');
      expect(accountCode).toContain('Edit Review');
    });
  });

  describe('4. Review Statistics & NaN Safety', () => {
    it('safely handles missing ratings or division by zero without returning NaN', () => {
      const oddReview: any = {
        id: 'rev-odd',
        productId: 'prod-3',
        productName: 'Kanchi Saree',
        authorName: 'Patron C',
        authorLocation: 'Salem',
        rating: undefined, // Missing rating
        quote: 'Great',
        verifiedPurchase: true,
        status: 'approved',
        isFeatured: false
      };

      storageService.saveReviews([oddReview]);
      const stats = reviewService.getStatistics();

      expect(stats.averageRating).not.toBe('NaN');
      expect(stats.averageRating).toBe('5.0');
      expect(stats.approvedCount).toBe(1);
      expect(stats.featuredCount).toBe(0);
    });
  });
});
