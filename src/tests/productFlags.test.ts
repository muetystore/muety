import { describe, it, expect, beforeEach } from 'vitest';
import { productService } from '../features/catalog/services/productService';
import { storageService } from '../lib/storage/storageService';
import { validateImageFile, uploadToCloudinary } from '../lib/media/cloudinary';
import { Product } from '../features/catalog/types';

describe('Product Flags Architecture & Cloudinary Decoupling Tests', () => {
  beforeEach(() => {
    storageService.clearAll();
  });

  const createSampleProduct = (id: string, overrides: Partial<Product> = {}): Product => ({
    id,
    productId: id,
    name: 'Kanchipuram Pure Silk Saree',
    title: 'Kanchipuram Pure Silk Saree',
    slug: 'kanchipuram-pure-silk-saree',
    sku: 'KS-01',
    price: 3500,
    stock: 10,
    inventory: 10,
    category: 'Silk Sarees',
    categorySlug: 'sarees',
    categoryIds: ['cat-silk'],
    primaryCategoryId: 'cat-silk',
    images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...'],
    availability: 'available',
    published: true,
    status: 'active',
    isBestSeller: false,
    bestseller: false,
    isNewArrival: false,
    newArrival: false,
    isMostWanted: false,
    mostWanted: false,
    shortDescription: 'Handcrafted pure silk saree.',
    description: 'Handcrafted atelier pure silk saree.',
    tags: ['silk', 'saree'],
    rating: 5,
    reviewCount: 0,
    specifications: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  });

  it('1. validateImageFile safely accepts local relative paths starting with /', () => {
    const res = validateImageFile('/saree_model_individual.jpg');
    expect(res.valid).toBe(true);

    const assetRes = validateImageFile('/assets/images/banner.png');
    expect(assetRes.valid).toBe(true);
  });

  it('2. uploadToCloudinary returns local paths without attempting signature network calls', async () => {
    const meta = await uploadToCloudinary('/saree_model_individual.jpg');
    expect(meta.url).toBe('/saree_model_individual.jpg');
  });

  it('3. updateProductFlags toggles isBestSeller and bestseller atomically without touching media', async () => {
    const prod = createSampleProduct('prod-1', { isBestSeller: false, bestseller: false });
    storageService.addProduct(prod);

    const updated = await productService.updateProductFlags('prod-1', {
      isBestSeller: true
    });

    expect(updated.isBestSeller).toBe(true);
    expect(updated.bestseller).toBe(true);

    const stored = storageService.getProductById('prod-1');
    expect(stored?.isBestSeller).toBe(true);
    expect(stored?.bestseller).toBe(true);
  });

  it('4. updateProductFlags toggles isNewArrival and isMostWanted flags seamlessly', async () => {
    const prod = createSampleProduct('prod-2', {
      isNewArrival: false,
      newArrival: false,
      isMostWanted: false,
      mostWanted: false
    });
    storageService.addProduct(prod);

    const afterNew = await productService.updateProductFlags('prod-2', {
      isNewArrival: true
    });
    expect(afterNew.isNewArrival).toBe(true);
    expect(afterNew.newArrival).toBe(true);

    const afterWanted = await productService.updateProductFlags('prod-2', {
      isMostWanted: true
    });
    expect(afterWanted.isMostWanted).toBe(true);
    expect(afterWanted.mostWanted).toBe(true);
  });

  it('5. updateProductFlags succeeds even if product has base64 data URLs without Cloudinary error', async () => {
    const prodWithDataUrl = createSampleProduct('prod-data-url', {
      images: ['data:image/jpeg;base64,/9j/4AAQSkZJRg=='],
      isBestSeller: false
    });
    storageService.addProduct(prodWithDataUrl);

    // Toggling flag should NEVER attempt Cloudinary upload or throw Cloudinary errors
    await expect(
      productService.updateProductFlags('prod-data-url', { isBestSeller: true })
    ).resolves.toMatchObject({
      isBestSeller: true,
      bestseller: true
    });
  });

  it('6. updateProduct falls back gracefully without aborting if Cloudinary upload fails on products with data URLs', async () => {
    const prod = createSampleProduct('prod-edit', {
      name: 'Edited Name',
      images: ['data:image/jpeg;base64,/9j/4AAQSkZJRg==']
    });
    storageService.addProduct(prod);

    // Full updateProduct should not throw "Product update aborted"
    const result = await productService.updateProduct({
      ...prod,
      name: 'Updated Name Title'
    });

    expect(result.name).toBe('Updated Name Title');
    expect(result.images).toContain('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
  });

  it('7. getMostWantedProducts, getNewArrivals, and getBestSellers return matching items', () => {
    const prod1 = createSampleProduct('p-mw-1', { isMostWanted: true, mostWanted: true });
    const prod2 = createSampleProduct('p-na-1', { newArrival: true });
    const prod3 = createSampleProduct('p-bs-1', { bestseller: true });
    storageService.addProduct(prod1);
    storageService.addProduct(prod2);
    storageService.addProduct(prod3);

    const mw = productService.getMostWantedProducts();
    expect(mw.some(p => p.id === 'p-mw-1')).toBe(true);

    const na = productService.getNewArrivals();
    expect(na.some(p => p.id === 'p-na-1')).toBe(true);

    const bs = productService.getBestSellers();
    expect(bs.some(p => p.id === 'p-bs-1')).toBe(true);
  });
});
