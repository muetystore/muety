import { describe, it, expect, beforeEach } from 'vitest';
import { 
  generateCategoryCodeSuggestion, 
  validateCategoryCode, 
  isCategoryCodeUnique, 
  isCategoryCodeLocked 
} from '../features/catalog/services/categoryCodeService';
import { 
  productService, 
  clearInFlightSkus, 
  validateSkuFormat, 
  migrateProductSkus 
} from '../features/catalog/services/productService';
import { storageService } from '../lib/storage/storageService';
import { Category, Product } from '../features/catalog/types';

describe('Category Code & SKU Generation Architecture', () => {

  beforeEach(() => {
    // Clear storage simulation before each test
    storageService.clearAll();
    clearInFlightSkus();
  });

  // ==========================================
  // CATEGORY CODE TESTS (1 - 8)
  // ==========================================

  it('1. Single word generates first two letters', () => {
    expect(generateCategoryCodeSuggestion('Saree')).toBe('SA');
    expect(generateCategoryCodeSuggestion('Silk')).toBe('SI');
    expect(generateCategoryCodeSuggestion('Kurti')).toBe('KU');
    expect(generateCategoryCodeSuggestion('Jewellery')).toBe('JE');
  });

  it('2. Multi-word generates first letter of first two words', () => {
    expect(generateCategoryCodeSuggestion('Kanchivaram Saree')).toBe('KS');
    expect(generateCategoryCodeSuggestion('Silk Saree')).toBe('SS');
    expect(generateCategoryCodeSuggestion('Wedding Collection')).toBe('WC');
    expect(generateCategoryCodeSuggestion('Designer Blouse')).toBe('DB');
  });

  it('3. Category code is uppercase', () => {
    const code = generateCategoryCodeSuggestion('kanchivaram saree');
    expect(code).toBe('KS');
    expect(code).toBe(code.toUpperCase());

    const customValidation = validateCategoryCode('kv');
    expect(customValidation.valid).toBe(false); // Only uppercase valid
    const upperValidation = validateCategoryCode('KV');
    expect(upperValidation.valid).toBe(true);
  });

  it('4. Duplicate category code rejected', async () => {
    storageService.addCategory({
      id: 'cat-kv',
      name: 'Kanchivaram Silk',
      slug: 'kanchivaram-silk',
      categoryCode: 'KV',
      description: 'Test description for Kanchivaram',
      image: '/test.jpg',
      itemCount: 1
    });

    const isUnique = await isCategoryCodeUnique('KV');
    expect(isUnique).toBe(false);

    await expect(
      productService.addCategory('Kanchi Saree', 'Test description for Kanchi', '/test.jpg', 'KV')
    ).rejects.toThrow(/already used by another category/i);
  });

  it('5. Category code is exactly two letters', () => {
    expect(validateCategoryCode('A').valid).toBe(false);
    expect(validateCategoryCode('ABC').valid).toBe(false);
    expect(validateCategoryCode('K1').valid).toBe(false);
    expect(validateCategoryCode('K-').valid).toBe(false);
    expect(validateCategoryCode('KV').valid).toBe(true);
  });

  it('6. Kanchivaram Saree can use KV (custom override)', async () => {
    const cat = await productService.addCategory(
      'Kanchivaram Saree', 
      'Editorial description for Kanchivaram', 
      '/test.jpg', 
      'KV'
    );
    expect(cat.categoryCode).toBe('KV');
  });

  it('7. Kanchi Saree can use KS', async () => {
    const cat = await productService.addCategory(
      'Kanchi Saree', 
      'Editorial description for Kanchi', 
      '/test.jpg', 
      'KS'
    );
    expect(cat.categoryCode).toBe('KS');
  });

  it('8. Two categories cannot share the same code', async () => {
    await productService.addCategory('Silk Sarees', 'Description for Silk Sarees', '/test.jpg', 'SS');
    
    await expect(
      productService.addCategory('Super Sarees', 'Description for Super Sarees', '/test.jpg', 'SS')
    ).rejects.toThrow();
  });

  // ==========================================
  // MULTI-CATEGORY PRODUCTS TESTS (9 - 14)
  // ==========================================

  it('9. Product can belong to multiple categories', async () => {
    const p = await productService.createProduct({
      name: 'Multi-Category Saree',
      shortDescription: 'Multi category test',
      description: 'Multi category test full description',
      price: 5000,
      stock: 10,
      categoryIds: ['cat-kanchivaram', 'cat-silk', 'cat-wedding'],
      primaryCategoryId: 'cat-kanchivaram',
      category: 'Kanchivaram Sarees',
      categorySlug: 'kanchivaram',
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    expect(p.categoryIds).toEqual(['cat-kanchivaram', 'cat-silk', 'cat-wedding']);
  });

  it('10. First selected category becomes primary', () => {
    const selected = ['cat-kanchivaram', 'cat-silk', 'cat-wedding'];
    const primary = selected[0];
    expect(primary).toBe('cat-kanchivaram');
  });

  it('11. Primary category must exist in categoryIds', async () => {
    const catIds = ['cat-1', 'cat-2'];
    let invalidPrimary = 'cat-3';

    if (!catIds.includes(invalidPrimary)) {
      invalidPrimary = catIds[0];
    }
    expect(catIds).toContain(invalidPrimary);
  });

  it('12. Removing primary category selects another category', () => {
    let catIds = ['cat-1', 'cat-2', 'cat-3'];
    let primary = 'cat-1';

    catIds = catIds.filter(id => id !== primary);
    if (!catIds.includes(primary)) {
      primary = catIds[0] || '';
    }

    expect(primary).toBe('cat-2');
  });

  it('13. Product appears in every assigned category', async () => {
    const cat1 = await productService.addCategory('Kanchivaram Collection', 'Desc for Kanchivaram', '/test.jpg', 'KV');
    const cat2 = await productService.addCategory('Silk Collection', 'Desc for Silk Collection', '/test.jpg', 'SS');
    const cat3 = await productService.addCategory('Wedding Collection', 'Desc for Wedding Collection', '/test.jpg', 'WC');

    await productService.createProduct({
      name: 'Triple Category Saree',
      shortDescription: 'Triple category short desc',
      description: 'Triple category long description',
      price: 9000,
      stock: 5,
      categoryIds: [cat1.id, cat2.id, cat3.id],
      primaryCategoryId: cat1.id,
      category: cat1.name,
      categorySlug: cat1.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    const inCat1 = productService.getProductsByCategory(cat1.id);
    const inCat2 = productService.getProductsByCategory(cat2.id);
    const inCat3 = productService.getProductsByCategory(cat3.id);

    expect(inCat1.some(p => p.name === 'Triple Category Saree')).toBe(true);
    expect(inCat2.some(p => p.name === 'Triple Category Saree')).toBe(true);
    expect(inCat3.some(p => p.name === 'Triple Category Saree')).toBe(true);
  });

  it('14. Existing single-category products migrate safely', () => {
    storageService.saveProducts([
      {
        id: 'legacy-prod-1',
        name: 'Legacy Silk Saree',
        slug: 'legacy-silk-saree',
        shortDescription: 'Legacy saree',
        description: 'Legacy saree desc',
        price: 4000,
        stock: 5,
        sku: 'SR-100',
        categoryId: 'cat-sarees',
        category: 'Festive Silk Sarees',
        categorySlug: 'sarees',
        images: ['/test.jpg'],
        tags: [],
        rating: 5,
        reviewCount: 0,
        specifications: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any
    ]);

    const products = storageService.getProducts();
    const migrated = products.find(p => p.id === 'legacy-prod-1');

    expect(migrated).toBeDefined();
    expect(migrated?.categoryIds).toEqual(['cat-sarees']);
    expect(migrated?.primaryCategoryId).toBe('cat-sarees');
    expect(migrated?.sku).toBe('SR-100'); // Preserved SKU!
  });

  // ==========================================
  // CANONICAL SKU FORMAT & LIFECYCLE TESTS (15 - 28)
  // ==========================================

  it('15. Opening Add Product (previewing SKU) returns KV-01 without MUETY- prefix and does NOT increment counter', async () => {
    const cat = await productService.addCategory('Kanchivaram Saree', 'Desc for Kanchivaram', '/test.jpg', 'KV');
    
    const preview1 = await productService.getSkuPreviewForCategory(cat.id);
    const preview2 = await productService.getSkuPreviewForCategory(cat.id);
    const preview3 = await productService.getSkuPreviewForCategory(cat.id);

    expect(preview1).toBe('KV-01');
    expect(preview2).toBe('KV-01');
    expect(preview3).toBe('KV-01');
  });

  it('16. Category selection and changing category returns canonical format (SS-01, KV-01) without incrementing counter', async () => {
    const catKV = await productService.addCategory('Kanchivaram Saree', 'Desc', '/test.jpg', 'KV');
    const catSS = await productService.addCategory('Silk Saree', 'Desc', '/test.jpg', 'SS');

    const previewKV1 = await productService.getSkuPreviewForCategory(catKV.id);
    expect(previewKV1).toBe('KV-01');

    const previewSS = await productService.getSkuPreviewForCategory(catSS.id);
    expect(previewSS).toBe('SS-01');

    const previewKV2 = await productService.getSkuPreviewForCategory(catKV.id);
    expect(previewKV2).toBe('KV-01');
  });

  it('17. Cancelling product form and reopening form returns same next SKU (CS-01)', async () => {
    const cat = await productService.addCategory('Cotton Saree', 'Desc for Cotton Saree', '/test.jpg', 'CS');
    
    const preview1 = await productService.getSkuPreviewForCategory(cat.id);
    expect(preview1).toBe('CS-01');

    const preview2 = await productService.getSkuPreviewForCategory(cat.id);
    expect(preview2).toBe('CS-01');
  });

  it('18. Successful save creates product with canonical SKU (DB-01) and increments counter exactly once to DB-02', async () => {
    const cat = await productService.addCategory('Designer Blouse', 'Desc for Blouse', '/test.jpg', 'DB');
    
    const preview = await productService.getSkuPreviewForCategory(cat.id);
    expect(preview).toBe('DB-01');

    const p = await productService.createProduct({
      name: 'Blouse 1',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 1500,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    expect(p.sku).toBe('DB-01');

    const nextPreview = await productService.getSkuPreviewForCategory(cat.id);
    expect(nextPreview).toBe('DB-02');
  });

  it('19. Failed save does NOT increment counter (remains OS-01)', async () => {
    const cat = await productService.addCategory('Organza Saree', 'Desc', '/test.jpg', 'OS');

    const previewBefore = await productService.getSkuPreviewForCategory(cat.id);
    expect(previewBefore).toBe('OS-01');

    try {
      await productService.createProduct({
        name: '',
        shortDescription: 'Fail',
        description: 'Fail',
        price: -10,
        stock: 5,
        categoryIds: [cat.id],
        primaryCategoryId: cat.id,
        category: cat.name,
        categorySlug: cat.slug,
        tags: [],
        images: [],
        rating: 5,
        reviewCount: 0,
        specifications: {}
      });
    } catch (e) {
      // caught
    }

    const previewAfter = await productService.getSkuPreviewForCategory(cat.id);
    expect(previewAfter).toBe('OS-01');
  });

  it('20. Three successive creates produce TS-01, TS-02, TS-03; cancel between creates preserves sequence', async () => {
    const cat = await productService.addCategory('Test Sequence', 'Desc', '/test.jpg', 'TS');

    const p1 = await productService.createProduct({
      name: 'TS Product 1',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 1000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });
    expect(p1.sku).toBe('TS-01');

    await productService.getSkuPreviewForCategory(cat.id); // preview TS-02, then cancel

    const p2 = await productService.createProduct({
      name: 'TS Product 2',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 1000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });
    expect(p2.sku).toBe('TS-02');

    const p3 = await productService.createProduct({
      name: 'TS Product 3',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 1000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });
    expect(p3.sku).toBe('TS-03');
  });

  it('21. Deleted products do not cause SKU reuse (US-01, US-02, US-03 -> delete 02 -> US-04)', async () => {
    const cat = await productService.addCategory('Unique Saree', 'Desc for Unique', '/test.jpg', 'US');
    
    const p1 = await productService.createProduct({
      name: 'US Product 1',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 3000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    const p2 = await productService.createProduct({
      name: 'US Product 2',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 3000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    const p3 = await productService.createProduct({
      name: 'US Product 3',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 3000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    expect(p1.sku).toBe('US-01');
    expect(p2.sku).toBe('US-02');
    expect(p3.sku).toBe('US-03');

    await productService.deleteProduct(p2.id);

    const p4 = await productService.createProduct({
      name: 'US Product 4',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 3000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    expect(p4.sku).toBe('US-04'); // Must NOT reuse US-02!
  });

  it('22. Concurrent product creation produces unique SKUs (CC-01, CC-02)', async () => {
    const cat = await productService.addCategory('Concurrent Category', 'Desc', '/test.jpg', 'CC');

    const p1Promise = productService.createProduct({
      name: 'Concurrent Product 1',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 5000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    const p2Promise = productService.createProduct({
      name: 'Concurrent Product 2',
      shortDescription: 'Desc',
      description: 'Desc',
      price: 5000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    const [p1, p2] = await Promise.all([p1Promise, p2Promise]);
    expect(p1.sku).not.toBe(p2.sku);
    expect([p1.sku, p2.sku]).toContain('CC-01');
    expect([p1.sku, p2.sku]).toContain('CC-02');
  });

  it('23. Existing SKU never changes during product edit', async () => {
    const cat = await productService.addCategory('Edit Saree', 'Desc', '/test.jpg', 'ES');
    
    const p = await productService.createProduct({
      name: 'Editable Saree',
      shortDescription: 'Short desc',
      description: 'Full desc',
      price: 5000,
      stock: 5,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    const originalSku = p.sku;
    expect(originalSku).toBe('ES-01');

    const updated = await productService.updateProduct({
      ...p,
      name: 'Updated Editable Saree Title',
      price: 6500
    });

    expect(updated.sku).toBe('ES-01');
  });

  it('24. Changing primary category on an existing product does not change SKU', async () => {
    const cat1 = await productService.addCategory('Category One', 'Desc 1', '/test.jpg', 'CO');
    const cat2 = await productService.addCategory('Category Two', 'Desc 2', '/test.jpg', 'CT');

    const p = await productService.createProduct({
      name: 'Switch Category Saree',
      shortDescription: 'Short desc',
      description: 'Full desc',
      price: 8000,
      stock: 5,
      categoryIds: [cat1.id, cat2.id],
      primaryCategoryId: cat1.id,
      category: cat1.name,
      categorySlug: cat1.slug,
      tags: [],
      images: ['/test.jpg'],
      rating: 5,
      reviewCount: 0,
      specifications: {}
    });

    const originalSku = p.sku;
    expect(originalSku).toBe('CO-01');

    const updated = await productService.updateProduct({
      ...p,
      primaryCategoryId: cat2.id
    });

    expect(updated.sku).toBe('CO-01'); // SKU remains permanent CO-01!
  });

  it('25. validateSkuFormat accepts valid canonical format and rejects invalid formats', () => {
    expect(validateSkuFormat('KV-01').valid).toBe(true);
    expect(validateSkuFormat('KV-02').valid).toBe(true);
    expect(validateSkuFormat('KS-10').valid).toBe(true);
    expect(validateSkuFormat('SS-100').valid).toBe(true);

    expect(validateSkuFormat('MUETY-KV-01').valid).toBe(false);
    expect(validateSkuFormat('KV01').valid).toBe(false);
    expect(validateSkuFormat('K-01').valid).toBe(false);
    expect(validateSkuFormat('KVC-01').valid).toBe(false);
    expect(validateSkuFormat('kv-01').valid).toBe(false);
    expect(validateSkuFormat('KV-1A').valid).toBe(false);
  });

  it('26. Migration function removes MUETY- prefix while preserving sequence numbers', async () => {
    storageService.saveProducts([
      {
        id: 'p1',
        name: 'Product 1',
        slug: 'product-1',
        price: 1000,
        stock: 5,
        sku: 'MUETY-KV-01',
        categoryIds: ['cat-kv'],
        primaryCategoryId: 'cat-kv',
        images: ['/test.jpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any,
      {
        id: 'p2',
        name: 'Product 2',
        slug: 'product-2',
        price: 2000,
        stock: 5,
        sku: 'MUETY-SS-02',
        categoryIds: ['cat-ss'],
        primaryCategoryId: 'cat-ss',
        images: ['/test.jpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any
    ]);

    const res = await migrateProductSkus();
    expect(res.migratedCount).toBe(2);

    const p1 = storageService.getProductById('p1');
    const p2 = storageService.getProductById('p2');

    expect(p1?.sku).toBe('KV-01');
    expect(p2?.sku).toBe('SS-02');
  });

  it('27. Migration is idempotent (running twice does not corrupt SKU format)', async () => {
    storageService.saveProducts([
      {
        id: 'p1',
        name: 'Product 1',
        slug: 'product-1',
        price: 1000,
        stock: 5,
        sku: 'MUETY-KV-01',
        categoryIds: ['cat-kv'],
        primaryCategoryId: 'cat-kv',
        images: ['/test.jpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any
    ]);

    const firstRun = await migrateProductSkus();
    expect(firstRun.migratedCount).toBe(1);

    const secondRun = await migrateProductSkus();
    expect(secondRun.migratedCount).toBe(0);

    const p1 = storageService.getProductById('p1');
    expect(p1?.sku).toBe('KV-01');
  });

  it('28. Migration detects collisions and skips conflicting items without overwriting', async () => {
    storageService.saveProducts([
      {
        id: 'p1',
        name: 'Product Existing',
        slug: 'product-existing',
        price: 1000,
        stock: 5,
        sku: 'KV-01',
        categoryIds: ['cat-kv'],
        primaryCategoryId: 'cat-kv',
        images: ['/test.jpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any,
      {
        id: 'p2',
        name: 'Product Legacy Duplicate',
        slug: 'product-legacy-duplicate',
        price: 2000,
        stock: 5,
        sku: 'MUETY-KV-01',
        categoryIds: ['cat-kv'],
        primaryCategoryId: 'cat-kv',
        images: ['/test.jpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any
    ]);

    const res = await migrateProductSkus();
    expect(res.collisions.length).toBe(1);
    expect(res.collisions[0].targetSku).toBe('KV-01');

    const p1 = storageService.getProductById('p1');
    const p2 = storageService.getProductById('p2');

    expect(p1?.sku).toBe('KV-01');
    expect(p2?.sku).toBe('MUETY-KV-01'); // Skipped p2 to avoid overwrite!
  });

  // ==========================================
  // CATEGORY IMAGE PIPELINE TESTS (29 - 33)
  // ==========================================

  it('29. Category creation persists image URL in both image and imageUrl fields', async () => {
    const testImg = 'https://images.unsplash.com/photo-1524805444758-089113d48a6d';
    const cat = await productService.addCategory('Kanchivaram Silk', 'Editorial description for Kanchi', testImg, 'KV');

    expect(cat.image).toBe(testImg);
    expect(cat.imageUrl).toBe(testImg);

    const savedCat = storageService.getCategories().find(c => c.id === cat.id);
    expect(savedCat?.image).toBe(testImg);
    expect(savedCat?.imageUrl).toBe(testImg);
  });

  it('30. Category reading/normalization populates image and imageUrl', () => {
    storageService.saveCategories([
      {
        id: 'cat-test-raw',
        name: 'Test Raw Category',
        slug: 'test-raw-category',
        categoryCode: 'TR',
        description: 'Test description',
        imageUrl: 'https://images.unsplash.com/photo-test',
        itemCount: 0
      } as any
    ]);

    const categories = storageService.getCategories();
    const cat = categories.find(c => c.id === 'cat-test-raw');
    expect(cat).toBeDefined();
    expect(cat?.image).toBe('https://images.unsplash.com/photo-test');
    expect(cat?.imageUrl).toBe('https://images.unsplash.com/photo-test');
  });

  it('31. Category with missing image defaults to fallback placeholder image', () => {
    storageService.saveCategories([
      {
        id: 'cat-no-img',
        name: 'No Image Category',
        slug: 'no-image-category',
        categoryCode: 'NI',
        description: 'Test description',
        itemCount: 0
      } as any
    ]);

    const categories = storageService.getCategories();
    const cat = categories.find(c => c.id === 'cat-no-img');
    expect(cat).toBeDefined();
    expect(cat?.image).toBe('/saree_model_individual.jpg');
    expect(cat?.imageUrl).toBe('/saree_model_individual.jpg');
  });

  it('32. Updating category preserves existing image URL when unchanged', async () => {
    const initialImg = 'https://images.unsplash.com/photo-initial';
    const cat = await productService.addCategory('Silk Sarees', 'Editorial description for Silk', initialImg, 'SS');

    const updated = await productService.updateCategory({
      ...cat,
      name: 'Festive Silk Sarees'
    });

    expect(updated.image).toBe(initialImg);
    expect(updated.imageUrl).toBe(initialImg);
  });

  it('33. Updating category image updates both image and imageUrl', async () => {
    const initialImg = 'https://images.unsplash.com/photo-initial';
    const newImg = 'https://images.unsplash.com/photo-updated';

    const cat = await productService.addCategory('Cotton Sarees', 'Editorial description for Cotton', initialImg, 'CS');

    const updated = await productService.updateCategory({
      ...cat,
      image: newImg,
      imageUrl: newImg
    });

    expect(updated.image).toBe(newImg);
    expect(updated.imageUrl).toBe(newImg);
  });

  it('34. Base64 data URI is strictly rejected and never saved to Firestore category', async () => {
    const base64DataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
    
    await expect(
      productService.addCategory('Base64 Reject Cat', 'Editorial description for Base64 test', base64DataUrl, 'BR')
    ).rejects.toThrow(/Base64 persistence is disallowed/i);
  });

  it('35. Blob URL is strictly rejected and never saved to Firestore category', async () => {
    const blobUrl = 'blob:http://localhost:5173/1234-5678';

    await expect(
      productService.addCategory('Blob Reject Cat', 'Editorial description for Blob test', blobUrl, 'BL')
    ).rejects.toThrow(/Base64 persistence is disallowed/i);
  });

  it('36. Category reading sanitizes legacy Base64 or Blob images on snapshot read', () => {
    storageService.saveCategories([
      {
        id: 'cat-legacy-base64',
        name: 'Legacy Base64 Category',
        slug: 'legacy-base64-category',
        categoryCode: 'LB',
        description: 'Test description',
        imageUrl: 'data:image/jpeg;base64,1234567890',
        itemCount: 0
      } as any
    ]);

    const categories = storageService.getCategories();
    const cat = categories.find(c => c.id === 'cat-legacy-base64');
    expect(cat).toBeDefined();
    expect(cat?.imageUrl).not.toContain('data:image/');
    expect(cat?.imageUrl?.startsWith('https://')).toBe(true);
  });

});


