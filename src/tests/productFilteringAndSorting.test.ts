import { describe, it, expect } from 'vitest';
import { Product, Category } from '../features/catalog/types';
import { 
  filterProducts, 
  sortProducts, 
  getCatalogPriceBounds, 
  calculateCategoryCounts, 
  getActiveFilterCount,
  calculatePriceHistogram,
  DEFAULT_FILTER_STATE,
  ProductFilterState,
  SortOption
} from '../features/catalog/utils/productFilters';

describe('MUETY Storefront — Product Filter & Sorting System Suite', () => {

  const sampleProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Kanchivaram Pure Silk Saree',
      slug: 'kanchivaram-pure-silk-saree',
      sku: 'KV-01',
      shortDescription: 'Royal handloom silk saree',
      description: 'Handwoven in Salem with pure gold zari craftsmanship',
      category: 'Festive Silk Sarees',
      categorySlug: 'festive-silk-sarees',
      categoryIds: ['cat-festive'],
      tags: ['heritage', 'wedding', 'zari'],
      price: 8500,
      originalPrice: 12000,
      stock: 5,
      availability: 'available',
      rating: 4.8,
      reviewCount: 15,
      featured: true,
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-01-10T10:00:00.000Z',
      images: ['/img1.jpg'],
      specifications: {}
    },
    {
      id: 'prod-2',
      name: 'Salem Soft Silk Saree',
      slug: 'salem-soft-silk-saree',
      sku: 'SS-02',
      shortDescription: 'Lightweight pure soft silk',
      description: 'Modern aesthetic drape with contrast pallu',
      category: 'Soft Silk Sarees',
      categorySlug: 'soft-silk-sarees',
      categoryIds: ['cat-soft'],
      tags: ['dailywear', 'office', 'pastel'],
      price: 3200,
      originalPrice: 4000,
      stock: 12,
      availability: 'available',
      rating: 4.2,
      reviewCount: 8,
      featured: false,
      createdAt: '2026-02-15T10:00:00.000Z',
      updatedAt: '2026-02-15T10:00:00.000Z',
      images: ['/img2.jpg'],
      specifications: {}
    },
    {
      id: 'prod-3',
      name: 'Bridal Crimson Zari Creation',
      slug: 'bridal-crimson-zari-creation',
      sku: 'BR-03',
      shortDescription: 'Opulent wedding bridal masterpiece',
      description: 'Extensive hand-embroidered temple border',
      category: 'Festive Silk Sarees',
      categorySlug: 'festive-silk-sarees',
      categoryIds: ['cat-festive'],
      tags: ['bridal', 'wedding', 'heavy'],
      price: 15000,
      originalPrice: 18000,
      stock: 0, // Out of stock
      availability: 'available',
      rating: 5.0,
      reviewCount: 22,
      featured: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
      images: ['/img3.jpg'],
      specifications: {}
    },
    {
      id: 'prod-4',
      name: 'Handloom Cotton Silk Saree',
      slug: 'handloom-cotton-silk-saree',
      sku: 'CS-04',
      shortDescription: 'Breathable festive blend',
      description: 'Salem artisan pit-loom weave',
      category: 'Daily Handlooms',
      categorySlug: 'daily-handlooms',
      categoryIds: ['cat-daily'],
      tags: ['cotton', 'summer', 'handloom'],
      price: 1800,
      originalPrice: 2200,
      stock: 8,
      availability: 'sold_out', // Manual sold out flag
      rating: 3.5,
      reviewCount: 4,
      featured: false,
      createdAt: '2025-12-20T10:00:00.000Z',
      updatedAt: '2025-12-20T10:00:00.000Z',
      images: ['/img4.jpg'],
      specifications: {}
    },
    {
      id: 'prod-5',
      name: 'Unrated New Saree Sample',
      slug: 'unrated-new-saree-sample',
      sku: 'UN-05',
      shortDescription: 'Newly woven atelier test weave',
      description: 'Experimental natural dye colorway',
      category: 'Daily Handlooms',
      categorySlug: 'daily-handlooms',
      categoryIds: ['cat-daily'],
      tags: ['new', 'experimental'],
      price: 4500,
      originalPrice: 4500,
      stock: 3,
      availability: 'available',
      rating: 0, // Unrated
      reviewCount: 0,
      featured: false,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      images: ['/img5.jpg'],
      specifications: {}
    }
  ];

  const sampleCategories: Category[] = [
    {
      id: 'cat-festive',
      name: 'Festive Silk Sarees',
      slug: 'festive-silk-sarees',
      categoryCode: 'FS',
      description: 'Festive sarees',
      image: '/cat1.jpg',
      itemCount: 2
    },
    {
      id: 'cat-soft',
      name: 'Soft Silk Sarees',
      slug: 'soft-silk-sarees',
      categoryCode: 'SS',
      description: 'Soft sarees',
      image: '/cat2.jpg',
      itemCount: 1
    },
    {
      id: 'cat-daily',
      name: 'Daily Handlooms',
      slug: 'daily-handlooms',
      categoryCode: 'DH',
      description: 'Daily sarees',
      image: '/cat3.jpg',
      itemCount: 2
    }
  ];

  // =========================================================================
  // 1. INDIVIDUAL FILTERS
  // =========================================================================
  describe('1. Individual Functional Filters', () => {
    it('filters by category slug correctly', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        category: 'festive-silk-sarees'
      });
      expect(filtered.length).toBe(2);
      expect(filtered.map(p => p.id)).toEqual(['prod-1', 'prod-3']);
    });

    it('returns all products when category is "all"', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        category: 'all'
      });
      expect(filtered.length).toBe(5);
    });

    it('filters by price bounds (min and max)', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        minPrice: 3000,
        maxPrice: 9000
      });
      // prod-1 (8500), prod-2 (3200), prod-5 (4500)
      expect(filtered.length).toBe(3);
      expect(filtered.map(p => p.id)).toContain('prod-1');
      expect(filtered.map(p => p.id)).toContain('prod-2');
      expect(filtered.map(p => p.id)).toContain('prod-5');
      expect(filtered.map(p => p.id)).not.toContain('prod-3'); // 15000
      expect(filtered.map(p => p.id)).not.toContain('prod-4'); // 1800
    });

    it('filters only purchasable in-stock items (stock > 0 and availability != sold_out)', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        inStockOnly: true
      });
      // prod-3 has stock 0 -> excluded
      // prod-4 has availability 'sold_out' -> excluded
      // prod-1, prod-2, prod-5 are in stock
      expect(filtered.length).toBe(3);
      expect(filtered.map(p => p.id)).toEqual(['prod-1', 'prod-2', 'prod-5']);
    });

    it('filters by minimum rating threshold', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        minRating: 4.5
      });
      // prod-1 (4.8), prod-3 (5.0)
      expect(filtered.length).toBe(2);
      expect(filtered.map(p => p.id)).toEqual(['prod-1', 'prod-3']);
    });

    it('matches search query across name, description, SKU, and tags', () => {
      // By SKU
      const bySku = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        search: 'SS-02'
      });
      expect(bySku.length).toBe(1);
      expect(bySku[0].id).toBe('prod-2');

      // By Description keyword "Salem"
      const byDesc = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        search: 'Salem'
      });
      expect(byDesc.map(p => p.id)).toEqual(['prod-1', 'prod-2', 'prod-4']);

      // By Tag keyword "wedding"
      const byTag = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        search: 'wedding'
      });
      expect(byTag.map(p => p.id)).toEqual(['prod-1', 'prod-3']);
    });
  });

  // =========================================================================
  // 2. MULTIPLE COMBINED FILTERS (AND SEMANTICS)
  // =========================================================================
  describe('2. Multi-Filter AND Semantics', () => {
    it('applies category, price, in-stock, and rating filters simultaneously', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        category: 'festive-silk-sarees',
        minPrice: 5000,
        maxPrice: 20000,
        inStockOnly: true,
        minRating: 4.0
      });
      // In festive-silk-sarees:
      // prod-1: price 8500, stock 5, rating 4.8 -> MATCHES
      // prod-3: price 15000, stock 0 -> FAILS inStockOnly
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('prod-1');
    });

    it('returns empty array when combined filters have no overlapping matches', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        category: 'daily-handlooms',
        minPrice: 10000 // No daily handlooms are above 10,000
      });
      expect(filtered.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. DETERMINISTIC SORTING & TIE-BREAKERS
  // =========================================================================
  describe('3. Deterministic Sorting Logic', () => {
    it('sorts by Price: Low to High accurately', () => {
      const sorted = sortProducts(sampleProducts, 'price-low');
      const prices = sorted.map(p => p.price);
      expect(prices).toEqual([1800, 3200, 4500, 8500, 15000]);
    });

    it('sorts by Price: High to Low accurately', () => {
      const sorted = sortProducts(sampleProducts, 'price-high');
      const prices = sorted.map(p => p.price);
      expect(prices).toEqual([15000, 8500, 4500, 3200, 1800]);
    });

    it('sorts by Newest Arrivals based on creation timestamp', () => {
      const sorted = sortProducts(sampleProducts, 'newest');
      expect(sorted[0].id).toBe('prod-5'); // 2026-04-01
      expect(sorted[1].id).toBe('prod-3'); // 2026-03-01
      expect(sorted[2].id).toBe('prod-2'); // 2026-02-15
      expect(sorted[3].id).toBe('prod-1'); // 2026-01-10
      expect(sorted[4].id).toBe('prod-4'); // 2025-12-20
    });

    it('sorts by Featured Picks with featured items first', () => {
      const sorted = sortProducts(sampleProducts, 'featured');
      // Featured items: prod-1, prod-3
      expect(sorted[0].featured).toBe(true);
      expect(sorted[1].featured).toBe(true);
      // Non-featured items follow:
      expect(sorted[2].featured).toBe(false);
      expect(sorted[3].featured).toBe(false);
      expect(sorted[4].featured).toBe(false);
    });

    it('sorts by Highest Rated with unrated products at the end', () => {
      const sorted = sortProducts(sampleProducts, 'rating');
      expect(sorted[0].rating).toBe(5.0); // prod-3
      expect(sorted[1].rating).toBe(4.8); // prod-1
      expect(sorted[2].rating).toBe(4.2); // prod-2
      expect(sorted[3].rating).toBe(3.5); // prod-4
      expect(sorted[4].rating).toBe(0);   // prod-5 unrated
    });

    it('preserves deterministic ordering on ties without random shifting', () => {
      const tieProducts: Product[] = [
        { ...sampleProducts[0], id: 'prod-b', price: 5000 },
        { ...sampleProducts[0], id: 'prod-a', price: 5000 },
        { ...sampleProducts[0], id: 'prod-c', price: 5000 }
      ];

      const sorted1 = sortProducts(tieProducts, 'price-low');
      const sorted2 = sortProducts(tieProducts, 'price-low');

      expect(sorted1.map(p => p.id)).toEqual(['prod-a', 'prod-b', 'prod-c']);
      expect(sorted2.map(p => p.id)).toEqual(sorted1.map(p => p.id));
    });
  });

  // =========================================================================
  // 4. PRICE BOUNDS & CATEGORY COUNTS
  // =========================================================================
  describe('4. Dynamic Bounds & Live Category Counts', () => {
    it('computes catalog price bounds with rounded values', () => {
      const bounds = getCatalogPriceBounds(sampleProducts);
      // Min price is 1800 -> rounded to 1800
      // Max price is 15000 -> rounded to 15000
      expect(bounds.min).toBe(1800);
      expect(bounds.max).toBe(15000);
    });

    it('calculates category counts considering other active filters', () => {
      // With inStockOnly = true
      const counts = calculateCategoryCounts(sampleProducts, sampleCategories, {
        search: '',
        minPrice: null,
        maxPrice: null,
        inStockOnly: true,
        minRating: null
      });

      // Total in-stock products = 3 (prod-1, prod-2, prod-5)
      expect(counts['all']).toBe(3);
      // In-stock festive: prod-1 only (prod-3 is out of stock) = 1
      expect(counts['festive-silk-sarees']).toBe(1);
      // In-stock soft: prod-2 = 1
      expect(counts['soft-silk-sarees']).toBe(1);
      // In-stock daily: prod-5 only (prod-4 is sold out) = 1
      expect(counts['daily-handlooms']).toBe(1);
    });

    it('calculates active filter count accurately', () => {
      const bounds = { min: 1000, max: 20000 };

      const defaultCount = getActiveFilterCount(DEFAULT_FILTER_STATE, bounds);
      expect(defaultCount).toBe(0);

      const activeCount = getActiveFilterCount({
        ...DEFAULT_FILTER_STATE,
        category: 'festive-silk-sarees',
        inStockOnly: true,
        minRating: 4
      }, bounds);
      expect(activeCount).toBe(3);
    });
  });

  // =========================================================================
  // 5. FACET MULTI-SELECT FILTERS (SAREE TYPE, FABRIC, COLOR, BRAND, OCCASION)
  // =========================================================================
  describe('5. Saree Facet Multi-Select Filters & Price Histogram', () => {
    it('verifies DEFAULT_FILTER_STATE has null minRating and empty facet arrays', () => {
      expect(DEFAULT_FILTER_STATE.minRating).toBeNull();
      expect(DEFAULT_FILTER_STATE.sareeTypes).toEqual([]);
      expect(DEFAULT_FILTER_STATE.fabrics).toEqual([]);
      expect(DEFAULT_FILTER_STATE.colors).toEqual([]);
      expect(DEFAULT_FILTER_STATE.brands).toEqual([]);
    });

    it('filters by Saree Type multi-select (e.g. kanchipuram)', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        sareeTypes: ['kanchipuram']
      });
      // prod-1 is Kanchivaram Pure Silk Saree
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('prod-1');
    });

    it('filters by Fabric multi-select (e.g. pure-silk and cotton-blend)', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        fabrics: ['pure-silk']
      });
      // prod-1 is pure silk handloom
      expect(filtered.map(p => p.id)).toContain('prod-1');
    });

    it('filters by Occasion (e.g. bridal & wedding)', () => {
      const filtered = filterProducts(sampleProducts, {
        ...DEFAULT_FILTER_STATE,
        occasions: ['bridal']
      });
      // prod-3 has 'bridal' in name/tags
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.map(p => p.id)).toContain('prod-3');
    });

    it('computes price histogram bins accurately', () => {
      const bounds = { min: 1000, max: 15000 };
      const bins = calculatePriceHistogram(sampleProducts, bounds, 2000, 10000, 10);
      expect(bins.length).toBe(10);
      expect(bins.every((b: any) => typeof b.count === 'number')).toBe(true);
      expect(bins.every((b: any) => typeof b.percentage === 'number')).toBe(true);
      // Some bins should be in range and some out of range
      const inRangeBins = bins.filter((b: any) => b.isInRange);
      expect(inRangeBins.length).toBeGreaterThan(0);
    });
  });
});
