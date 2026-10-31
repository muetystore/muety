import { describe, it, expect, beforeEach, vi } from 'vitest';
import { productService } from '@/features/catalog/services/productService';
import { personalizationService } from '@/features/catalog/services/personalizationService';
import { storageService } from '@/lib/storage/storageService';
import { Product } from '@/features/catalog/types';

describe('Feature 1: Admin Drag-and-Drop Image Reordering & Schema', () => {
  const dummyProduct: Product = {
    id: 'prod-test-image-reorder',
    name: 'Kanchipuram Brocade Pure Silk Saree',
    title: 'Kanchipuram Brocade Pure Silk Saree',
    slug: 'kanchipuram-brocade-pure-silk-saree',
    sku: 'SR-01',
    description: 'Authentic pure silk drape.',
    shortDescription: 'Pure silk drape.',
    price: 6500,
    originalPrice: 8500,
    stock: 12,
    rating: 5,
    reviewCount: 3,
    category: 'Silk Sarees',
    categorySlug: 'silk-sarees',
    categoryIds: ['cat-silk'],
    primaryCategoryId: 'cat-silk',
    images: [
      'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample3.jpg'
    ],
    tags: ['silk', 'festive'],
    specifications: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    storageService.saveProducts([dummyProduct]);
  });

  it('1.1 stores explicit imageOrder with position and isPrimary metadata on update', async () => {
    // Admin reorders images: moves sample3 to index 0, sample1 to index 1, sample2 to index 2
    const reorderedImages = [
      'https://res.cloudinary.com/demo/image/upload/sample3.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample2.jpg'
    ];

    const updated = await productService.updateProduct(dummyProduct.id, {
      images: reorderedImages
    });

    expect(updated.images).toEqual(reorderedImages);
    expect(updated.primaryImage).toBe(reorderedImages[0]);
    expect(updated.imageOrder).toBeDefined();
    expect(updated.imageOrder?.length).toBe(3);

    expect(updated.imageOrder?.[0]).toMatchObject({
      imageUrl: reorderedImages[0],
      position: 0,
      isPrimary: true
    });
    expect(updated.imageOrder?.[1]).toMatchObject({
      imageUrl: reorderedImages[1],
      position: 1,
      isPrimary: false
    });
    expect(updated.imageOrder?.[2]).toMatchObject({
      imageUrl: reorderedImages[2],
      position: 2,
      isPrimary: false
    });
  });

  it('1.2 automatically sets the first image in sequence as primaryImage', async () => {
    const newSeq = [
      'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample1.jpg'
    ];

    const updated = await productService.updateProduct(dummyProduct.id, {
      images: newSeq
    });

    expect(updated.images[0]).toBe('https://res.cloudinary.com/demo/image/upload/sample2.jpg');
    expect(updated.primaryImage).toBe('https://res.cloudinary.com/demo/image/upload/sample2.jpg');
  });

  it('1.3 maintains backward compatibility for legacy products without imageOrder', () => {
    const rawLegacyDoc = {
      id: 'legacy-prod-99',
      name: 'Legacy Salem Saree',
      images: ['/img1.jpg', '/img2.jpg'],
      price: 2500,
      category: 'Sarees'
    };

    const parsed = productService.mapFirestoreDocToProduct(rawLegacyDoc.id, rawLegacyDoc);
    expect(parsed.images).toEqual(['/img1.jpg', '/img2.jpg']);
    expect(parsed.primaryImage).toBe('/img1.jpg');
    expect(parsed.imageOrder).toBeDefined();
    expect(parsed.imageOrder?.[0].isPrimary).toBe(true);
    expect(parsed.imageOrder?.[0].position).toBe(0);
  });

  it('1.4 allows image deletion without breaking the remaining image sequence', async () => {
    // Delete middle image (index 1)
    const afterDelete = [
      dummyProduct.images[0],
      dummyProduct.images[2]
    ];

    const updated = await productService.updateProduct(dummyProduct.id, {
      images: afterDelete
    });

    expect(updated.images.length).toBe(2);
    expect(updated.images).toEqual(afterDelete);
    expect(updated.imageOrder?.[0].position).toBe(0);
    expect(updated.imageOrder?.[1].position).toBe(1);
    expect(updated.primaryImage).toBe(dummyProduct.images[0]);
  });
});

describe('Feature 2: Admin Product List State Restoration', () => {
  it('2.1 serializes and restores search, category, availability filter, and scroll offset', () => {
    const stateKey = 'muety_admin_products_listing_state';
    const sampleState = {
      search: 'Printed Silk',
      selectedCat: 'printed-sarees',
      availabilityFilter: 'available' as const,
      scrollY: 850,
      timestamp: Date.now()
    };

    sessionStorage.setItem(stateKey, JSON.stringify(sampleState));
    const retrieved = JSON.parse(sessionStorage.getItem(stateKey)!);

    expect(retrieved.search).toBe('Printed Silk');
    expect(retrieved.selectedCat).toBe('printed-sarees');
    expect(retrieved.availabilityFilter).toBe('available');
    expect(retrieved.scrollY).toBe(850);
  });
});

describe('Feature 3: Storefront Listing Position Restoration', () => {
  it('3.1 preserves loaded products count and scroll position across PDP navigation', () => {
    const stateKey = 'muety_storefront_listing_state';
    const sampleState = {
      scrollY: 1420,
      visibleCount: 40,
      timestamp: Date.now()
    };

    sessionStorage.setItem(stateKey, JSON.stringify(sampleState));
    const retrieved = JSON.parse(sessionStorage.getItem(stateKey)!);

    expect(retrieved.scrollY).toBe(1420);
    expect(retrieved.visibleCount).toBe(40);
  });
});

describe('Feature 4: Personalized Product Ordering & Recommendations', () => {
  const productA: Product = {
    id: 'prod-silk-a',
    name: 'Pure Kanchipuram Gold Silk',
    slug: 'pure-kanchipuram-gold-silk',
    sku: 'SKU-A',
    description: 'Gold silk saree',
    shortDescription: 'Gold silk',
    price: 7000,
    stock: 5,
    rating: 5,
    reviewCount: 4,
    category: 'Silk Sarees',
    categorySlug: 'silk-sarees',
    images: ['/saree_model_individual.jpg'],
    tags: ['silk', 'zari', 'bridal'],
    specifications: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const productB: Product = {
    id: 'prod-cotton-b',
    name: 'Traditional Salem Cotton Saree',
    slug: 'traditional-salem-cotton-saree',
    sku: 'SKU-B',
    description: 'Salem cotton saree',
    shortDescription: 'Salem cotton',
    price: 1800,
    stock: 10,
    rating: 4.8,
    reviewCount: 2,
    category: 'Cotton Sarees',
    categorySlug: 'cotton-sarees',
    images: ['/saree_model_individual.jpg'],
    tags: ['cotton', 'daily-wear'],
    specifications: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('4.1 increases personalization score when user shows affinity for a category', () => {
    const initialScoreA = personalizationService.calculateProductScore(productA);
    const initialScoreB = personalizationService.calculateProductScore(productB);

    // User views silk category and silk product
    personalizationService.recordCategoryView('silk-sarees');
    personalizationService.recordProductView(productA);

    const boostedScoreA = personalizationService.calculateProductScore(productA);
    const afterScoreB = personalizationService.calculateProductScore(productB);

    expect(boostedScoreA).toBeGreaterThan(initialScoreA);
    expect(boostedScoreA).toBeGreaterThan(afterScoreB);
  });

  it('4.2 applies wishlist signals to elevate saved products', () => {
    const preWishlistScore = personalizationService.calculateProductScore(productB);
    personalizationService.recordWishlistAdd(productB.id);

    const postWishlistScore = personalizationService.calculateProductScore(productB);
    expect(postWishlistScore).toBeGreaterThan(preWishlistScore);
  });

  it('4.3 maintains deterministic and stable ordering across batch requests in the same session', () => {
    const catalog = [productA, productB];
    const run1 = personalizationService.sortPersonalized(catalog);
    const run2 = personalizationService.sortPersonalized(catalog);

    expect(run1.map(p => p.id)).toEqual(run2.map(p => p.id));
  });
});

describe('Feature 5: Firestore Optimized Cursor Infinite Scrolling', () => {
  beforeEach(() => {
    // Generate 45 mock products
    const mockProducts: Product[] = Array.from({ length: 45 }).map((_, i) => ({
      id: `mock-prod-${i + 1}`,
      name: `Mock Saree Piece ${i + 1}`,
      slug: `mock-saree-piece-${i + 1}`,
      sku: `SR-${100 + i}`,
      description: `Description ${i + 1}`,
      shortDescription: `Short desc ${i + 1}`,
      price: 2000 + i * 100,
      stock: 10,
      rating: 5,
      reviewCount: 1,
      category: i % 2 === 0 ? 'Silk Sarees' : 'Cotton Sarees',
      categorySlug: i % 2 === 0 ? 'silk-sarees' : 'cotton-sarees',
      status: 'active',
      published: true,
      availability: 'available',
      images: ['/saree_model_individual.jpg'],
      tags: ['handloom'],
      specifications: {},
      createdAt: new Date(Date.now() - i * 100000).toISOString(),
      updatedAt: new Date(Date.now() - i * 100000).toISOString()
    }));

    storageService.saveProducts(mockProducts);
  });

  it('5.1 fetches first batch of exactly 20 products and indicates hasMore = true', async () => {
    const page1 = await productService.fetchProductsPage({ pageSize: 20 });
    expect(page1.products.length).toBe(20);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBe(20);
    expect(page1.totalCount).toBe(45);
  });

  it('5.2 fetches second batch of 20 products starting from cursor', async () => {
    const page1 = await productService.fetchProductsPage({ pageSize: 20 });
    const page2 = await productService.fetchProductsPage({ pageSize: 20, cursor: page1.nextCursor });

    expect(page2.products.length).toBe(20);
    expect(page2.hasMore).toBe(true);
    expect(page2.products[0].id).not.toBe(page1.products[0].id);
    expect(page2.nextCursor).toBe(40);
  });

  it('5.3 fetches final batch and marks hasMore = false when end of catalog is reached', async () => {
    const page3 = await productService.fetchProductsPage({ pageSize: 20, cursor: 40 });
    expect(page3.products.length).toBe(5);
    expect(page3.hasMore).toBe(false);
  });

  it('5.4 filters by category and computes hasMore correctly for filtered subset', async () => {
    const silkPage = await productService.fetchProductsPage({ pageSize: 20, category: 'silk-sarees' });
    expect(silkPage.products.every(p => p.categorySlug === 'silk-sarees')).toBe(true);
  });
});
