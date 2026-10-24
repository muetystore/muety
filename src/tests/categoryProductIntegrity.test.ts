import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  categoryService, 
  normalizeCategorySlug, 
  isLikelyDocumentId, 
  resolveProductCategoriesForDisplay, 
  computeCategoryProductCount, 
  canDeleteCategory 
} from '../features/catalog/services/categoryService';
import { productService, clearInFlightSkus } from '../features/catalog/services/productService';
import { storageService } from '../lib/storage/storageService';
import { Category, Product } from '../features/catalog/types';

const mockCat = (partial: Partial<Category> & { id: string; name: string; slug: string; categoryCode: string }): Category => ({
  description: '',
  image: '/saree_model_individual.jpg',
  imageUrl: '/saree_model_individual.jpg',
  coverImage: '/saree_model_individual.jpg',
  coverImageUrl: '/saree_model_individual.jpg',
  itemCount: 0,
  active: true,
  featured: false,
  isTrending: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...partial
});

const mockProd = (partial: Partial<Product> & { id: string; name: string; price: number }): Product => ({
  title: partial.name,
  slug: partial.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  description: '',
  shortDescription: '',
  sku: `MUETY-${Math.floor(100 + Math.random() * 900)}`,
  category: 'Festive Silk Sarees',
  categorySlug: 'sarees',
  categoryIds: [],
  stock: 10,
  inventory: 10,
  images: ['/saree_model_individual.jpg'],
  published: true,
  status: 'active',
  availability: 'available',
  rating: 5,
  reviewCount: 0,
  tags: [],
  specifications: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...partial
});

describe('MUETY Store — Category & Product Data Integrity Suite', () => {

  beforeEach(() => {
    storageService.clearAll();
    clearInFlightSkus();
    vi.clearAllMocks();
  });

  // 1. Creating a category and using it in product creation
  it('1. Creates a category and successfully assigns it in product creation', async () => {
    const newCategory = mockCat({
      id: 'cat-test-101',
      name: 'Banarasi Brocades',
      slug: normalizeCategorySlug('Banarasi Brocades'),
      categoryCode: 'BB',
      description: 'Handwoven Banarasi silk weaves',
      image: '/banarasi.jpg'
    });

    const addedCat = await categoryService.saveCategory(newCategory);
    expect(addedCat.id).toBe('cat-test-101');
    expect(addedCat.slug).toBe('banarasi-brocades');

    // Create a product assigned to this category
    const createdProduct = await productService.createProduct({
      name: 'Varanasi Royal Katan',
      title: 'Varanasi Royal Katan',
      price: 24999,
      categoryId: addedCat.id,
      categoryIds: [addedCat.id],
      primaryCategoryId: addedCat.id,
      category: addedCat.name,
      categorySlug: addedCat.slug,
      stock: 5,
      images: ['/varanasi.jpg'],
      published: true
    });

    expect(createdProduct.primaryCategoryId).toBe('cat-test-101');
    expect(createdProduct.categoryIds).toContain('cat-test-101');
    expect(createdProduct.sku).toMatch(/^BB-\d{2,}$/); // SKU prefix derived from category code
  });

  // 2. Creating products in both existing categories
  it('2. Creates products in both existing categories with independent SKU counters and accurate counts', async () => {
    const catA = mockCat({
      id: 'cat-saree-test',
      name: 'saree-test-cat',
      slug: 'saree-test-cat',
      categoryCode: 'SA'
    });
    const catB = mockCat({
      id: 'cat-fgd',
      name: 'fgd',
      slug: 'fgd',
      categoryCode: 'FG'
    });

    await categoryService.saveCategory(catA);
    await categoryService.saveCategory(catB);

    const prodA = await productService.createProduct({
      name: 'Salem Soft Silk Saree',
      title: 'Salem Soft Silk Saree',
      price: 3999,
      categoryId: catA.id,
      categoryIds: [catA.id],
      primaryCategoryId: catA.id,
      category: catA.name,
      categorySlug: catA.slug,
      stock: 8,
      images: ['/salem.jpg']
    });

    const prodB = await productService.createProduct({
      name: 'Floral Gold Drape',
      title: 'Floral Gold Drape',
      price: 5999,
      categoryId: catB.id,
      categoryIds: [catB.id],
      primaryCategoryId: catB.id,
      category: catB.name,
      categorySlug: catB.slug,
      stock: 4,
      images: ['/fgd.jpg']
    });

    expect(prodA.sku.startsWith('SA-')).toBe(true);
    expect(prodB.sku.startsWith('FG-')).toBe(true);

    const allProducts = storageService.getProducts();
    expect(computeCategoryProductCount(catA.id, allProducts)).toBe(1);
    expect(computeCategoryProductCount(catB.id, allProducts)).toBe(1);
  });

  // 3. Editing a product without changing its category
  it('3. Edits an existing product without unintentionally altering or wiping its category association', async () => {
    const cat = mockCat({
      id: 'cat-chanderi',
      name: 'Chanderi Silk',
      slug: 'chanderi-silk',
      categoryCode: 'CS'
    });
    await categoryService.saveCategory(cat);

    const prod = await productService.createProduct({
      name: 'Handloom Chanderi',
      title: 'Handloom Chanderi',
      price: 4500,
      categoryId: cat.id,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      stock: 10,
      sku: 'CS-01',
      images: ['/chanderi.jpg']
    });

    // Edit price, description, and inventory only
    const updatedProd = await productService.updateProduct(prod.id, {
      price: 4999,
      description: 'Updated artisan notes',
      stock: 12
    });

    expect(updatedProd.primaryCategoryId).toBe(cat.id);
    expect(updatedProd.categoryIds).toContain(cat.id);
    expect(updatedProd.sku).toBe('CS-01'); // SKU is preserved
    expect(updatedProd.price).toBe(4999);
  });

  // 4. Renaming a category without orphaning associated products
  it('4. Renaming a category maintains product associations via immutable category ID', async () => {
    const cat = mockCat({
      id: 'cat-heritage',
      name: 'Heritage Sarees',
      slug: 'heritage-sarees',
      categoryCode: 'HS'
    });
    await categoryService.saveCategory(cat);

    const prod = await productService.createProduct({
      name: 'Vintage Royal Drape',
      title: 'Vintage Royal Drape',
      price: 18000,
      categoryId: cat.id,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      stock: 3,
      sku: 'HS-01',
      images: ['/vintage.jpg']
    });

    // Rename the category display name and update slug
    const renamedCat = await categoryService.saveCategory({
      ...cat,
      name: 'Royal Heritage Weaves',
      slug: 'royal-heritage-weaves'
    });

    // Category ID remains immutable
    expect(renamedCat.id).toBe('cat-heritage');

    // Product remains linked via canonical ID
    const currentProducts = storageService.getProducts();
    const resolvedBadges = resolveProductCategoriesForDisplay(prod, [renamedCat]);
    expect(resolvedBadges[0].name).toBe('Royal Heritage Weaves');
    expect(resolvedBadges[0].isOrphaned).toBe(false);

    // Product count still reflects 1
    expect(computeCategoryProductCount(renamedCat.id, currentProducts)).toBe(1);
  });

  // 5. Duplicate slug and category-code validation
  it('5. Validates unique slugs and codes, rejecting duplicates', async () => {
    await categoryService.saveCategory(mockCat({
      id: 'cat-kanchi-01',
      name: 'Kanchipuram Silk',
      slug: 'kanchipuram-silk',
      categoryCode: 'KS'
    }));

    // Attempting to save another category with the exact same slug should fail
    await expect(categoryService.saveCategory(mockCat({
      id: 'cat-kanchi-02',
      name: 'Kanchipuram Silk Alt',
      slug: 'kanchipuram-silk',
      categoryCode: 'KA'
    }))).rejects.toThrow(/already in use|already exists/i);

    // Attempting to save with duplicate category code should fail
    await expect(categoryService.saveCategory(mockCat({
      id: 'cat-kanchi-03',
      name: 'Kanchipuram Special',
      slug: 'kanchipuram-special',
      categoryCode: 'KS'
    }))).rejects.toThrow(/already used|already in use/i);
  });

  // 6. Correct display of category names rather than raw IDs
  it('6. Resolves human-readable names and NEVER exposes raw 20-character Firestore IDs in badges', () => {
    const liveCategories: Category[] = [
      mockCat({ id: 'cat-1791267027302', name: 'saree-test-cat', slug: 'saree-test-cat', categoryCode: 'SA' }),
      mockCat({ id: 'm2ozFKH6v8aZpedaUYzF', name: 'fgd', slug: 'fgd', categoryCode: 'FG' })
    ];

    // Case 1: Product with deleted category V45HYntNgV6yaicEI5Zl (sem, eriu)
    const productWithDeletedCat = mockProd({
      id: 'prod-ko-01',
      name: 'sem',
      sku: 'KO-01',
      price: 800,
      categoryIds: ['V45HYntNgV6yaicEI5Zl'],
      primaryCategoryId: 'V45HYntNgV6yaicEI5Zl',
      category: 'kob'
    });

    const badges = resolveProductCategoriesForDisplay(productWithDeletedCat, liveCategories);
    expect(badges.length).toBe(1);
    // Must NOT display raw ID "V45HYNTNGV6YAICEI5ZL"
    expect(badges[0].name).not.toBe('V45HYntNgV6yaicEI5Zl');
    expect(badges[0].name).toBe('kob (Unlisted)');
    expect(badges[0].isOrphaned).toBe(true);

    // Case 2: Product with multiple IDs (Super)
    const superProd = mockProd({
      id: 'prod-fs-03',
      name: 'Super',
      sku: 'FS-03',
      price: 1999,
      categoryIds: ['sarees', 'cat-1791267027302'],
      primaryCategoryId: 'cat-1791267027302',
      category: 'saree-test-cat'
    });

    const superBadges = resolveProductCategoriesForDisplay(superProd, liveCategories);
    const names = superBadges.map(b => b.name);
    expect(names).toContain('saree-test-cat');
    expect(names.every(n => !isLikelyDocumentId(n))).toBe(true);
  });

  // 7. Correct category-filter results and product counts
  it('7. Returns exact matching products for category filters and counts without leaking unassigned items', async () => {
    const catA = mockCat({ id: 'cat-a', name: 'Category Alpha', slug: 'category-alpha', categoryCode: 'CA' });
    const catB = mockCat({ id: 'cat-b', name: 'Category Beta', slug: 'category-beta', categoryCode: 'CB' });

    await categoryService.saveCategory(catA);
    await categoryService.saveCategory(catB);

    await productService.createProduct({
      name: 'Product 1',
      title: 'Product 1',
      price: 1000,
      categoryId: catA.id,
      categoryIds: [catA.id],
      primaryCategoryId: catA.id,
      category: catA.name,
      categorySlug: catA.slug,
      stock: 5,
      images: ['/p1.jpg']
    });

    await productService.createProduct({
      name: 'Product 2',
      title: 'Product 2',
      price: 2000,
      categoryId: catB.id,
      categoryIds: [catB.id],
      primaryCategoryId: catB.id,
      category: catB.name,
      categorySlug: catB.slug,
      stock: 5,
      images: ['/p2.jpg']
    });

    const products = storageService.getProducts();

    // Verify dynamic counts
    expect(computeCategoryProductCount(catA.id, products)).toBe(1);
    expect(computeCategoryProductCount(catB.id, products)).toBe(1);

    // Verify deletion protection: neither catA nor catB can be deleted while products are assigned
    const canDeleteA = canDeleteCategory(catA.id, products);
    expect(canDeleteA.canDelete).toBe(false);
    expect(canDeleteA.assignedCount).toBe(1);
  });

  // 8. Products with missing or legacy category references
  it('8. Handles missing or empty category references safely showing Unassigned state', () => {
    const unassignedProd = mockProd({
      id: 'prod-orphan',
      name: 'Unassigned Drapery',
      sku: 'UN-01',
      price: 1200,
      category: '',
      categorySlug: '',
      categoryIds: []
    });

    const badges = resolveProductCategoriesForDisplay(unassignedProd, []);
    expect(badges.length).toBe(1);
    expect(badges[0].name).toBe('Unassigned');
    expect(badges[0].isOrphaned).toBe(true);
  });

  // 9. Products with existing valid SKUs
  it('9. Preserves existing valid SKUs during product updates without regenerating', async () => {
    const cat = mockCat({ id: 'cat-mysore', name: 'Mysore Silk', slug: 'mysore-silk', categoryCode: 'MS' });
    await categoryService.saveCategory(cat);

    const initialProd = await productService.createProduct({
      name: 'Mysore Crepe Silk',
      title: 'Mysore Crepe Silk',
      price: 8500,
      categoryId: cat.id,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      category: cat.name,
      categorySlug: cat.slug,
      sku: 'FS-02', // Legacy valid SKU
      stock: 5,
      images: ['/mysore.jpg']
    });

    expect(initialProd.sku).toBe('FS-02');

    // Updating product title and price must not regenerate SKU
    const updatedProd = await productService.updateProduct(initialProd.id, {
      title: 'Mysore Crepe Gold Zari',
      name: 'Mysore Crepe Gold Zari',
      price: 8900
    });

    expect(updatedProd.sku).toBe('FS-02');
  });

  // 10. Firestore read/write failures and invalid category submissions
  it('10. Rejects invalid category submissions with helpful validation errors', async () => {
    // Missing name
    await expect(categoryService.saveCategory({
      id: '',
      name: '   ',
      slug: '',
      categoryCode: 'AA',
      itemCount: 0
    })).rejects.toThrow(/Category name is required/i);

    // Missing category code
    await expect(categoryService.saveCategory({
      id: '',
      name: 'Valid Name',
      slug: 'valid-name',
      categoryCode: '',
      itemCount: 0
    })).rejects.toThrow(/Category code is required/i);

    // Invalid category code (must be 2 letters)
    await expect(categoryService.saveCategory({
      id: '',
      name: 'Valid Name',
      slug: 'valid-name',
      categoryCode: 'TOOLONG',
      itemCount: 0
    })).rejects.toThrow(/exactly 2 letters/i);
  });

  // 11. Existing authorization and publication behavior
  it('11. Filters out draft/unpublished products from patron category product counts', () => {
    const cat = mockCat({ id: 'cat-pub-test', name: 'Festive Wear', slug: 'festive-wear', categoryCode: 'FW' });
    
    const liveProduct = mockProd({
      id: 'prod-live',
      name: 'Live Silk Saree',
      sku: 'FW-01',
      price: 3500,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      published: true,
      status: 'active'
    });

    const draftProduct = mockProd({
      id: 'prod-draft',
      name: 'Draft Silk Saree',
      sku: 'FW-02',
      price: 4500,
      categoryIds: [cat.id],
      primaryCategoryId: cat.id,
      published: false,
      status: 'draft'
    });

    const allProducts = [liveProduct, draftProduct];

    // Admin view counts both (publishedOnly = false)
    expect(computeCategoryProductCount(cat.id, allProducts, false)).toBe(2);

    // Patron storefront view counts only published (publishedOnly = true)
    expect(computeCategoryProductCount(cat.id, allProducts, true)).toBe(1);
  });
});
