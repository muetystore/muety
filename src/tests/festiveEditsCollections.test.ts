import { describe, it, expect, beforeEach } from 'vitest';
import { collectionService } from '../features/catalog/services/collectionService';
import { storageService } from '../lib/storage/storageService';
import { SareeCollection, Product } from '../features/catalog/types';

describe('Festive Edits Collections and Home Tabs Suite', () => {
  beforeEach(() => {
    // Mock localStorage for test environment
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: 0
    } as any;
  });

  const mockCollections: SareeCollection[] = [
    {
      id: 'col-1',
      name: 'Bridal Collection',
      slug: 'pure',
      type: 'style',
      description: 'Bridal drapes',
      bannerImage: '/test.jpg',
      featured: true,
      displayOrder: 1,
      showInFestiveEdits: true,
      productCount: 1
    },
    {
      id: 'col-2',
      name: 'Daily Wear Collection',
      slug: 'normal',
      type: 'collection',
      description: 'Daily drapes',
      bannerImage: '/test.jpg',
      featured: true,
      displayOrder: 2,
      showInFestiveEdits: true,
      productCount: 1
    },
    {
      id: 'col-3',
      name: 'Traditional Silk Collection',
      slug: 'temple-borders',
      type: 'occasion',
      description: 'Temple silk',
      bannerImage: '/test.jpg',
      featured: true,
      displayOrder: 3,
      showInFestiveEdits: true,
      productCount: 3
    },
    {
      id: 'col-4',
      name: 'Printed Saree Collection',
      slug: 'printed-saree-collection',
      type: 'occasion',
      description: 'Printed sarees',
      bannerImage: '/test.jpg',
      featured: true,
      displayOrder: 4,
      showInFestiveEdits: true,
      productCount: 1
    },
    {
      id: 'col-5',
      name: 'Kerala Traditional Collection',
      slug: 'kerala-traditional-collection',
      type: 'occasion',
      description: 'Kerala traditional',
      bannerImage: '/test.jpg',
      featured: true,
      displayOrder: 5,
      showInFestiveEdits: true,
      productCount: 3
    },
    {
      id: 'col-6',
      name: 'Celebrity-Inspired Collection',
      slug: 'celebrity-inspired-collection',
      type: 'occasion',
      description: 'Celebrity inspired',
      bannerImage: '/test.jpg',
      featured: true,
      displayOrder: 6,
      showInFestiveEdits: true,
      productCount: 1
    },
    {
      id: 'col-7',
      name: 'Hidden Collection',
      slug: 'hidden-collection',
      type: 'curated',
      description: 'Hidden',
      bannerImage: '/test.jpg',
      featured: false,
      displayOrder: 7,
      showInFestiveEdits: false, // explicitly hidden by admin
      productCount: 0
    }
  ];

  const mockProducts: Product[] = ([
    {
      id: 'prod-bridal-1',
      title: 'Bridal Crimson Silk Saree',
      slug: 'bridal-crimson-silk',
      price: 12999,
      categorySlug: 'sarees',
      collectionIds: ['col-1'],
      collectionId: 'col-1',
      tags: ['pure'],
      published: true,
      stock: 5,
      sku: 'SKU-BR-1',
      images: ['/test.jpg']
    },
    {
      id: 'prod-printed-1',
      title: 'Floral Hand-Printed Cotton Saree',
      slug: 'floral-printed-saree',
      price: 2499,
      categorySlug: 'sarees',
      collectionIds: ['col-4'],
      collectionId: 'col-4',
      tags: ['printed-saree-collection'],
      published: true,
      stock: 8,
      sku: 'SKU-PR-1',
      images: ['/test.jpg']
    },
    {
      id: 'prod-kerala-1',
      title: 'Kasavu Traditional Off-White Saree',
      slug: 'kasavu-1',
      price: 3200,
      categorySlug: 'sarees',
      collectionIds: ['col-5'],
      collectionId: 'col-5',
      tags: ['kerala-traditional-collection'],
      published: true,
      stock: 4,
      sku: 'SKU-KER-1',
      images: ['/test.jpg']
    },
    {
      id: 'prod-kerala-2',
      title: 'Kasavu Temple Border Saree',
      slug: 'kasavu-2',
      price: 3500,
      categorySlug: 'sarees',
      collectionIds: ['col-5'],
      collectionId: 'col-5',
      tags: ['kerala-traditional-collection'],
      published: true,
      stock: 3,
      sku: 'SKU-KER-2',
      images: ['/test.jpg']
    },
    {
      id: 'prod-kerala-3',
      title: 'Kasavu Golden Zari Saree',
      slug: 'kasavu-3',
      price: 4100,
      categorySlug: 'sarees',
      collectionIds: ['col-5'],
      collectionId: 'col-5',
      tags: ['kerala-traditional-collection'],
      published: true,
      stock: 2,
      sku: 'SKU-KER-3',
      images: ['/test.jpg']
    },
    {
      id: 'prod-unassigned-generic',
      title: 'Generic Saree In Catalog',
      slug: 'generic-saree',
      price: 1999,
      categorySlug: 'sarees',
      published: true,
      stock: 10,
      sku: 'SKU-GEN-1',
      images: ['/test.jpg']
    }
  ] as any);

  it('collectionService.getOccasionCollections returns all collections with showInFestiveEdits !== false regardless of collection type', () => {
    storageService.saveCollections(mockCollections);
    const festiveCols = collectionService.getOccasionCollections();

    expect(festiveCols.length).toBe(6);
    expect(festiveCols.map(c => c.name)).toEqual([
      'Bridal Collection',
      'Daily Wear Collection',
      'Traditional Silk Collection',
      'Printed Saree Collection',
      'Kerala Traditional Collection',
      'Celebrity-Inspired Collection'
    ]);
    // The hidden collection should be excluded
    expect(festiveCols.some(c => c.id === 'col-7')).toBe(false);
  });

  it('strictly isolates products per collection and never falls back to generic category sarees', () => {
    // Test logic simulating HomePage occasionProducts computation
    const getOccasionProducts = (activeCol: SareeCollection, allProducts: Product[]) => {
      const colId = (activeCol.id || '').toLowerCase().trim();
      const colSlug = (activeCol.slug || '').toLowerCase().trim();
      const colName = (activeCol.name || '').toLowerCase().trim();

      return allProducts.filter(p => {
        if (p.published === false) return false;

        if (Array.isArray(p.collectionIds)) {
          if (p.collectionIds.some(id => {
            const clean = String(id).toLowerCase().trim();
            return clean === colId || (colSlug && clean === colSlug);
          })) {
            return true;
          }
        }

        if (p.collectionId) {
          const pCol = String(p.collectionId).toLowerCase().trim();
          if (pCol === colId || (colSlug && pCol === colSlug)) {
            return true;
          }
        }

        if (Array.isArray(p.tags) && colSlug) {
          if (p.tags.some(t => String(t).toLowerCase().trim() === colSlug)) {
            return true;
          }
        }

        if (p.occasion) {
          const pOcc = String(p.occasion).toLowerCase().trim();
          if ((colSlug && pOcc === colSlug) || pOcc === colId || (colName && pOcc === colName)) {
            return true;
          }
        }

        return false;
      });
    };

    // Printed Saree Collection (col-4) should only return 1 saree
    const printedProds = getOccasionProducts(mockCollections[3], mockProducts);
    expect(printedProds.length).toBe(1);
    expect(printedProds[0].id).toBe('prod-printed-1');

    // Kerala Traditional Collection (col-5) should return exactly 3 sarees
    const keralaProds = getOccasionProducts(mockCollections[4], mockProducts);
    expect(keralaProds.length).toBe(3);
    expect(keralaProds.map(p => p.id)).toEqual(['prod-kerala-1', 'prod-kerala-2', 'prod-kerala-3']);

    // Bridal Collection (col-1, type 'style') should return exactly 1 saree
    const bridalProds = getOccasionProducts(mockCollections[0], mockProducts);
    expect(bridalProds.length).toBe(1);
    expect(bridalProds[0].id).toBe('prod-bridal-1');

    // Unassigned collection should return 0 items and NEVER return generic category sarees
    const emptyProds = getOccasionProducts(mockCollections[1], mockProducts);
    expect(emptyProds.length).toBe(0);
  });
});

