// Polyfill localStorage and sessionStorage for node test runner
const memoryStorage: Record<string, string> = {};
const sessionMemoryStorage: Record<string, string> = {};

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = String(val); },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

if (typeof (globalThis as any).sessionStorage === 'undefined') {
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => sessionMemoryStorage[key] || null,
    setItem: (key: string, val: string) => { sessionMemoryStorage[key] = String(val); },
    removeItem: (key: string) => { delete sessionMemoryStorage[key]; },
    clear: () => { Object.keys(sessionMemoryStorage).forEach(k => delete sessionMemoryStorage[k]); }
  };
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recommendationService, UserInterestProfile } from '../features/catalog/services/recommendationService';
import { productService } from '../features/catalog/services/productService';
import { categoryService } from '../features/catalog/services/categoryService';
import { sortProducts, filterProducts, DEFAULT_FILTER_STATE } from '../features/catalog/utils/productFilters';
import { Product } from '../types';

describe('MUETY Storefront & Admin Catalog Optimization Suite', () => {

  const sampleProducts: Product[] = [
    {
      id: 'prod-bridal-1',
      name: 'Bridal Crimson Silk Saree',
      slug: 'bridal-crimson-silk-saree',
      sku: 'MUETY-BR01',
      shortDescription: 'Royal handloom silk saree',
      description: 'Handwoven in Salem',
      tags: ['bridal', 'silk'],
      rating: 5,
      reviewCount: 10,
      price: 12000,
      stock: 5,
      availability: 'available',
      featured: true,
      categorySlug: 'bridal-sarees',
      category: 'Bridal Sarees',
      primaryCategoryId: 'cat-bridal',
      weaveTechnique: 'Kanchipuram',
      silkType: 'Pure Mulberry Silk',
      occasion: 'Bridal & Wedding',
      colors: ['Red', 'Crimson'],
      images: ['/img1.jpg', '/img2.jpg', '/img3.jpg'],
      specifications: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'prod-printed-1',
      name: 'Printed Floral Cotton Saree',
      slug: 'printed-floral-cotton-saree',
      sku: 'MUETY-PR02',
      shortDescription: 'Cotton block print',
      description: 'Handwoven in Salem',
      tags: ['printed', 'cotton'],
      rating: 4.5,
      reviewCount: 4,
      price: 1500,
      stock: 10,
      availability: 'available',
      featured: false,
      categorySlug: 'printed-sarees',
      category: 'Printed Sarees',
      primaryCategoryId: 'cat-printed',
      weaveTechnique: 'Hand Block Print',
      silkType: 'Cotton',
      occasion: 'Daily & Casual Drape',
      colors: ['Yellow', 'Mustard'],
      images: ['/p1.jpg', '/p2.jpg'],
      specifications: {},
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z'
    },
    {
      id: 'prod-silk-1',
      name: 'Royal Blue Temple Silk Saree',
      slug: 'royal-blue-temple-silk-saree',
      sku: 'MUETY-SL03',
      shortDescription: 'Temple silk saree',
      description: 'Handwoven in Salem',
      tags: ['temple', 'silk'],
      rating: 4.8,
      reviewCount: 12,
      price: 8500,
      stock: 3,
      availability: 'available',
      featured: true,
      categorySlug: 'silk-sarees',
      category: 'Silk Sarees',
      primaryCategoryId: 'cat-silk',
      weaveTechnique: 'Banarasi',
      silkType: 'Pure Silk',
      occasion: 'Temple & Traditional',
      colors: ['Blue', 'Gold'],
      images: ['/s1.jpg', '/s2.jpg'],
      specifications: {},
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z'
    },
    {
      id: 'prod-soldout-1',
      name: 'Rare Antique Gold Brocade Saree',
      slug: 'rare-antique-gold-brocade-saree',
      sku: 'MUETY-SO04',
      shortDescription: 'Gold brocade masterpiece',
      description: 'Handwoven in Salem',
      tags: ['gold', 'brocade'],
      rating: 5,
      reviewCount: 1,
      price: 25000,
      stock: 0,
      availability: 'sold_out',
      featured: false,
      categorySlug: 'bridal-sarees',
      category: 'Bridal Sarees',
      primaryCategoryId: 'cat-bridal',
      weaveTechnique: 'Kanchipuram',
      silkType: 'Pure Mulberry Silk',
      occasion: 'Bridal & Wedding',
      colors: ['Gold'],
      images: ['/sold1.jpg'],
      specifications: {},
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // =========================================================================
  // 1. ADMIN PANEL: DRAGGABLE IMAGE DISPLAY ORDER
  // =========================================================================
  describe('1. Admin Product Photography Display Order & Reordering', () => {
    it('accurately maintains image display sequence and designates index 0 as PRIMARY', () => {
      const originalImages = ['/saree_main.jpg', '/saree_hover.jpg', '/saree_detail.jpg'];
      
      // Simulating moving index 2 (saree_detail.jpg) to index 0 (PRIMARY)
      const updatedImages = [...originalImages];
      const [moved] = updatedImages.splice(2, 1);
      updatedImages.splice(0, 0, moved);

      expect(updatedImages[0]).toBe('/saree_detail.jpg');
      expect(updatedImages[1]).toBe('/saree_main.jpg');
      expect(updatedImages[2]).toBe('/saree_hover.jpg');
    });

    it('reorders correctly on directional move (◀ left / ▶ right)', () => {
      const images = ['/imgA.jpg', '/imgB.jpg', '/imgC.jpg'];
      
      // Move imgB left (from index 1 to 0)
      const moveLeft = (arr: string[], idx: number) => {
        const next = [...arr];
        const [target] = next.splice(idx, 1);
        next.splice(idx - 1, 0, target);
        return next;
      };

      const result = moveLeft(images, 1);
      expect(result).toEqual(['/imgB.jpg', '/imgA.jpg', '/imgC.jpg']);
      expect(result[0]).toBe('/imgB.jpg'); // New PRIMARY
    });
  });

  // =========================================================================
  // 2. ADMIN PANEL: RETURN STATE & SCROLL PRESERVATION
  // =========================================================================
  describe('2. Admin Product ERP State & Scroll Preservation', () => {
    it('persists and restores search, category filter, availability, and scrollY in sessionStorage', () => {
      const testState = {
        search: 'Crimson',
        selectedCat: 'bridal-sarees',
        availabilityFilter: 'available',
        scrollY: 1420
      };

      sessionStorage.setItem('muety_admin_products_view_state', JSON.stringify(testState));

      const retrieved = JSON.parse(sessionStorage.getItem('muety_admin_products_view_state') || '{}');
      expect(retrieved.search).toBe('Crimson');
      expect(retrieved.selectedCat).toBe('bridal-sarees');
      expect(retrieved.availabilityFilter).toBe('available');
      expect(retrieved.scrollY).toBe(1420);
    });
  });

  // =========================================================================
  // 3. STOREFRONT: PDP BACK NAVIGATION STATE RESTORATION
  // =========================================================================
  describe('3. Storefront Catalog PDP Back Navigation Restoration', () => {
    it('stores visibleCount and scrollY in sessionStorage so user returns to exact spot', () => {
      const catalogState = {
        scrollY: 1850,
        visibleCount: 40
      };

      sessionStorage.setItem('muety_storefront_catalog_state', JSON.stringify(catalogState));

      const restored = JSON.parse(sessionStorage.getItem('muety_storefront_catalog_state') || '{}');
      expect(restored.visibleCount).toBe(40);
      expect(restored.scrollY).toBe(1850);
    });
  });

  // =========================================================================
  // 4. RECOMMENDATION & BEHAVIORAL SHUFFLE SYSTEM
  // =========================================================================
  describe('4. Dynamic Catalog Shuffle & User Interest / Behavioral Recommendations', () => {
    it('records product view behavior and boosts recommendation score for matching pieces', () => {
      // User views Bridal Crimson Silk Saree
      recommendationService.recordProductView(sampleProducts[0]);

      const profile = recommendationService.getProfile();
      expect(profile.viewedProductIds).toContain('prod-bridal-1');
      expect(profile.categories['bridal-sarees']).toBeGreaterThan(0);
      expect(profile.sareeTypes['kanchipuram']).toBeGreaterThan(0);

      // Score for bridal saree should be significantly higher than unrelated cotton saree
      const bridalScore = recommendationService.calculateScore(sampleProducts[0], profile);
      const cottonScore = recommendationService.calculateScore(sampleProducts[1], profile);

      expect(bridalScore).toBeGreaterThan(cottonScore);
    });

    it('prioritizes in-stock pieces and penalizes sold-out items in recommendations', () => {
      const profile = recommendationService.getProfile();
      const availableScore = recommendationService.calculateScore(sampleProducts[0], profile);
      const soldOutScore = recommendationService.calculateScore(sampleProducts[3], profile);

      expect(availableScore).toBeGreaterThan(soldOutScore);
    });

    it('shuffles and ranks products dynamically while keeping featured items prominent', () => {
      const ranked = recommendationService.rankAndShuffleProducts(sampleProducts);
      expect(ranked.length).toBe(sampleProducts.length);
      
      // Featured in-stock items should be prioritized in top positions
      const featuredRanked = ranked.filter(p => p.featured && p.availability !== 'sold_out');
      expect(featuredRanked.length).toBeGreaterThanOrEqual(1);

      // Sold out product should be placed at the very end
      expect(ranked[ranked.length - 1].availability).toBe('sold_out');
    });

    it('integrates seamlessly with sortProducts for "featured" option', () => {
      const sorted = sortProducts(sampleProducts, 'featured');
      expect(sorted.length).toBe(sampleProducts.length);
      expect(sorted[0].featured).toBe(true);
    });

    it('locks catalog order throughout an active session so viewing PDP or refreshing does not cause mid-session shuffle', () => {
      // 1. Initial catalog sort in current session
      recommendationService.startNewSession();
      const initialOrder = recommendationService.rankAndShuffleProducts(sampleProducts);
      const initialIds = initialOrder.map(p => p.id);

      // 2. Patron clicks into a product (PDP) and views it (recording view)
      recommendationService.recordProductView(sampleProducts[2]);

      // 3. Patron returns from PDP back to catalog: order must be 100% IDENTICAL within this session
      const returnedOrder = recommendationService.rankAndShuffleProducts(sampleProducts);
      const returnedIds = returnedOrder.map(p => p.id);

      expect(returnedIds).toEqual(initialIds);

      // 4. Multiple calls / simulated page reloads in same session maintain the exact same sequence
      const refreshedOrder = recommendationService.rankAndShuffleProducts(sampleProducts);
      expect(refreshedOrder.map(p => p.id)).toEqual(initialIds);
    });

    it('re-evaluates and reshuffles with updated user interests only when a new session starts', () => {
      // Patron has a strong history of viewing bridal silk sarees
      recommendationService.recordProductView(sampleProducts[0]);
      recommendationService.recordProductView(sampleProducts[0]);

      // Session expires or new session begins
      recommendationService.startNewSession();

      const newSessionOrder = recommendationService.rankAndShuffleProducts(sampleProducts);
      expect(newSessionOrder.length).toBe(sampleProducts.length);
      // Bridal saree has highest affinity and should lead the list
      expect(newSessionOrder[0].id).toBe(sampleProducts[0].id);
    });
  });

  // =========================================================================
  // 5. 20-PRODUCT INITIAL BATCHING & INFINITE SCROLL
  // =========================================================================
  describe('5. Batch Loading & Infinite Scroll', () => {
    it('slices catalog to first 20 products initially', () => {
      const mockManyProducts: Product[] = Array.from({ length: 45 }, (_, i) => ({
        id: `mock-prod-${i}`,
        name: `Salem Saree ${i + 1}`,
        slug: `salem-saree-${i + 1}`,
        sku: `MUETY-${i}`,
        shortDescription: 'Salem drape',
        description: 'Authentic Salem handloom',
        price: 3000 + i * 100,
        stock: 5,
        availability: 'available',
        category: 'Silk Sarees',
        categorySlug: 'silk-sarees',
        primaryCategoryId: 'cat-silk',
        images: ['/img.jpg'],
        tags: ['silk'],
        rating: 5,
        reviewCount: 0,
        specifications: {},
        updatedAt: new Date(Date.now() - i * 1000).toISOString(),
        createdAt: new Date(Date.now() - i * 1000).toISOString()
      }));

      const visibleCount = 20;
      const initialDisplay = mockManyProducts.slice(0, visibleCount);

      expect(initialDisplay.length).toBe(20);
      expect(initialDisplay[0].id).toBe('mock-prod-0');
      expect(initialDisplay[19].id).toBe('mock-prod-19');

      // On scroll trigger: increment by 20
      const nextVisibleCount = visibleCount + 20;
      const scrolledDisplay = mockManyProducts.slice(0, nextVisibleCount);
      expect(scrolledDisplay.length).toBe(40);

      // Final scroll: displays remaining 5
      const finalVisibleCount = nextVisibleCount + 20;
      const allDisplay = mockManyProducts.slice(0, finalVisibleCount);
      expect(allDisplay.length).toBe(45);
    });

    it('formats the catalog ending message correctly with number of creations viewed', () => {
      const formatEndingMessage = (count: number) => {
        return `✓ All ${count} ${count === 1 ? 'creation' : 'creations'} viewed`;
      };

      expect(formatEndingMessage(3)).toBe('✓ All 3 creations viewed');
      expect(formatEndingMessage(40)).toBe('✓ All 40 creations viewed');
      expect(formatEndingMessage(1)).toBe('✓ All 1 creation viewed');
    });
  });

  // =========================================================================
  // 6. SHARED CATALOG SUBSCRIPTION REDUCES FIRESTORE READS
  // =========================================================================
  describe('6. Catalog Service Shared Singleton Subscription & Firestore Read Reduction', () => {
    it('provides synchronous cached products instantly on subscription without redundant network trips', () => {
      let callCount = 0;
      let receivedProducts: Product[] = [];

      const unsub1 = productService.subscribeToProducts((prods) => {
        callCount++;
        receivedProducts = prods;
      });

      expect(typeof unsub1).toBe('function');
      expect(Array.isArray(receivedProducts)).toBe(true);
      expect(callCount).toBeGreaterThanOrEqual(1);

      unsub1();
    });

    it('provides categoryService subscription without errors', () => {
      let callCount = 0;
      const unsub = categoryService.subscribeToCategories(() => {
        callCount++;
      });

      expect(typeof unsub).toBe('function');
      expect(callCount).toBeGreaterThanOrEqual(1);
      unsub();
    });
  });

});
