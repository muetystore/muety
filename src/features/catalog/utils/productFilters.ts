import { Product, Category } from '../types';

export type SortOption = 'featured' | 'newest' | 'price-low' | 'price-high' | 'rating';

export interface ProductFilterState {
  search: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  minRating: number | null;
  occasion?: string;
  fabric?: string;
  style?: string;
  tag?: string;
  collection?: string;
}

export const SORT_LABELS: Record<SortOption, string> = {
  'featured': 'Featured Picks',
  'newest': 'Newest Arrivals',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
  'rating': 'Highest Rated'
};

export const DEFAULT_FILTER_STATE: ProductFilterState = {
  search: '',
  category: 'all',
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  minRating: null
};

/**
 * Calculates valid price bounds from catalog products.
 * Handles missing/invalid prices safely.
 */
export function getCatalogPriceBounds(products: Product[]): { min: number; max: number } {
  const validPrices = products
    .map(p => Number(p?.price))
    .filter(p => !isNaN(p) && p >= 0);

  if (validPrices.length === 0) {
    return { min: 0, max: 10000 };
  }

  const rawMin = Math.min(...validPrices);
  const rawMax = Math.max(...validPrices);

  const min = Math.max(0, Math.floor(rawMin / 100) * 100);
  const max = Math.max(min + 500, Math.ceil(rawMax / 500) * 500);

  return { min, max };
}

/**
 * Filters a product catalog using strict AND semantics across all dimensions.
 */
export function filterProducts(products: Product[], filters: ProductFilterState): Product[] {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  return products.filter((p) => {
    if (!p) return false;

    // 1. Search Query Filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const descMatch = (p.description || '').toLowerCase().includes(q);
      const shortDescMatch = (p.shortDescription || '').toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q) || (p.categorySlug || '').toLowerCase().includes(q);
      const skuMatch = (p.sku || '').toLowerCase().includes(q);
      const tagsMatch = Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(q));
      const materialMatch = (p.material || '').toLowerCase().includes(q) || (p.fabric || '').toLowerCase().includes(q);

      if (!nameMatch && !descMatch && !shortDescMatch && !catMatch && !skuMatch && !tagsMatch && !materialMatch) {
        return false;
      }
    }

    // 2. Category Filter
    if (filters.category && filters.category !== 'all') {
      const catTarget = filters.category.toLowerCase().trim();
      const slugMatch = (p.categorySlug || '').toLowerCase() === catTarget;
      const nameMatch = (p.category || '').toLowerCase() === catTarget;
      const idMatch = Array.isArray(p.categoryIds) && p.categoryIds.some(id => (id || '').toLowerCase() === catTarget);
      const singleIdMatch = (p.categoryId || '').toLowerCase() === catTarget || (p.primaryCategoryId || '').toLowerCase() === catTarget;

      if (!slugMatch && !nameMatch && !idMatch && !singleIdMatch) {
        return false;
      }
    }

    // 3. Price Filter (numeric safety)
    const price = Number(p.price);
    const safePrice = isNaN(price) ? 0 : price;

    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      if (safePrice < filters.minPrice) {
        return false;
      }
    }

    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      if (safePrice > filters.maxPrice) {
        return false;
      }
    }

    // 4. In Stock Only Filter (Genuine Inventory Rule)
    if (filters.inStockOnly) {
      const isPurchasable = (Number(p.stock) || 0) > 0 && p.availability !== 'sold_out';
      if (!isPurchasable) {
        return false;
      }
    }

    // 5. Minimum Rating Filter
    if (filters.minRating !== null && filters.minRating !== undefined && filters.minRating > 0) {
      const rating = Number(p.rating) || 0;
      if (rating < filters.minRating) {
        return false;
      }
    }

    // 6. Occasion Filter (from URL query)
    if (filters.occasion) {
      const occ = filters.occasion.toLowerCase().trim();
      const occMatch = (p.occasion || '').toLowerCase().includes(occ) ||
                       (p.description || '').toLowerCase().includes(occ) ||
                       (p.name || '').toLowerCase().includes(occ) ||
                       (Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(occ)));
      if (!occMatch) return false;
    }

    // 7. Fabric Filter (from URL query)
    if (filters.fabric) {
      const fab = filters.fabric.toLowerCase().replace(/-/g, ' ').trim();
      const tokens = fab.split(' ').filter(Boolean);
      const textToSearch = [
        p.fabric || '',
        p.material || '',
        p.silkType || '',
        p.name || '',
        p.description || '',
        ...(p.tags || [])
      ].join(' ').toLowerCase();

      const fabMatch = tokens.some(tok => textToSearch.includes(tok));
      if (!fabMatch) return false;
    }

    // 8. Style Filter (from URL query)
    if (filters.style) {
      const sty = filters.style.toLowerCase().trim();
      const styleMatch = (p.borderType || '').toLowerCase().includes(sty) ||
                         (p.weaveTechnique || '').toLowerCase().includes(sty) ||
                         (p.craftsmanship || '').toLowerCase().includes(sty) ||
                         (p.name || '').toLowerCase().includes(sty) ||
                         (p.description || '').toLowerCase().includes(sty) ||
                         (Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(sty)));
      if (!styleMatch) return false;
    }

    // 9. Tag Filter (from URL query)
    if (filters.tag) {
      const tg = filters.tag.toLowerCase().trim();
      if (tg === 'new') {
        const isNew = Boolean(p.isNewArrival || p.newArrival || (p.tags || []).some(t => (t || '').toLowerCase().includes('new')));
        if (!isNew) return false;
      } else if (tg === 'bestseller') {
        const isBest = Boolean(p.isBestSeller || p.bestseller || (p.tags || []).some(t => (t || '').toLowerCase().includes('bestseller') || (t || '').toLowerCase().includes('best seller')));
        if (!isBest) return false;
      } else if (tg === 'sale') {
        const isSale = Boolean((p.originalPrice && p.originalPrice > p.price) || (p.tags || []).some(t => (t || '').toLowerCase().includes('sale') || (t || '').toLowerCase().includes('festive')));
        if (!isSale) return false;
      } else {
        const tagMatch = (p.tags || []).some(t => (t || '').toLowerCase().includes(tg)) || (p.name || '').toLowerCase().includes(tg);
        if (!tagMatch) return false;
      }
    }

    // 10. Collection Filter (from URL query)
    if (filters.collection) {
      const col = filters.collection.toLowerCase().trim();
      const colMatch = (p.collectionId || '').toLowerCase() === col ||
                       (Array.isArray(p.collectionIds) && p.collectionIds.some(cid => (cid || '').toLowerCase() === col)) ||
                       (p.categorySlug || '').toLowerCase().includes(col) ||
                       (p.occasion || '').toLowerCase().includes(col) ||
                       (Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(col))) ||
                       (p.name || '').toLowerCase().includes(col);
      if (!colMatch) return false;
    }

    return true;
  });
}

/**
 * Deterministically sorts products according to chosen option.
 * Uses consistent tie-breakers to avoid random item shifting between renders.
 */
export function sortProducts(products: Product[], sortBy: SortOption): Product[] {
  if (!Array.isArray(products) || products.length <= 1) {
    return [...(products || [])];
  }

  const list = [...products];

  const tieBreaker = (a: Product, b: Product) => {
    return (a.id || a.slug || a.sku || '').localeCompare(b.id || b.slug || b.sku || '');
  };

  switch (sortBy) {
    case 'featured': {
      return list.sort((a, b) => {
        const aFeat = a.featured ? 1 : 0;
        const bFeat = b.featured ? 1 : 0;
        if (bFeat !== aFeat) return bFeat - aFeat;

        const dateDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (dateDiff !== 0) return dateDiff;

        return tieBreaker(a, b);
      });
    }

    case 'newest': {
      return list.sort((a, b) => {
        const dateDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (dateDiff !== 0) return dateDiff;

        return tieBreaker(a, b);
      });
    }

    case 'price-low': {
      return list.sort((a, b) => {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;
        if (priceA !== priceB) return priceA - priceB;

        return tieBreaker(a, b);
      });
    }

    case 'price-high': {
      return list.sort((a, b) => {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;
        if (priceA !== priceB) return priceB - priceA;

        return tieBreaker(a, b);
      });
    }

    case 'rating': {
      return list.sort((a, b) => {
        const ratingA = Number(a.rating) || 0;
        const ratingB = Number(b.rating) || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;

        const revA = Number(a.reviewCount) || 0;
        const revB = Number(b.reviewCount) || 0;
        if (revB !== revA) return revB - revA;

        return tieBreaker(a, b);
      });
    }

    default:
      return list;
  }
}

/**
 * Calculates category product counts based on the current filter criteria (excluding category).
 * This ensures counts displayed next to categories accurately reflect what the user will see.
 */
export function calculateCategoryCounts(
  products: Product[],
  categories: Category[],
  baseFilters: Omit<ProductFilterState, 'category'>
): Record<string, number> {
  const counts: Record<string, number> = {};

  // Compute products that match all OTHER active filters (search, price, stock, rating, etc.)
  const candidateProducts = filterProducts(products, {
    ...baseFilters,
    category: 'all'
  });

  counts['all'] = candidateProducts.length;

  categories.forEach((cat) => {
    const slug = (cat.slug || '').toLowerCase();
    const id = (cat.id || '').toLowerCase();
    const name = (cat.name || '').toLowerCase();

    counts[slug] = candidateProducts.filter((p) => {
      const pSlug = (p.categorySlug || '').toLowerCase();
      const pName = (p.category || '').toLowerCase();
      const pIds = Array.isArray(p.categoryIds) ? p.categoryIds.map(i => (i || '').toLowerCase()) : [];
      const singleId = (p.categoryId || '').toLowerCase();

      return pSlug === slug || pName === name || pIds.includes(slug) || pIds.includes(id) || singleId === id;
    }).length;
  });

  return counts;
}

/**
 * Calculates number of active non-default filters.
 */
export function getActiveFilterCount(
  filters: ProductFilterState,
  bounds: { min: number; max: number }
): number {
  let count = 0;

  if (filters.search && filters.search.trim()) count += 1;
  if (filters.category && filters.category !== 'all') count += 1;
  if (filters.minPrice !== null && filters.minPrice > bounds.min) count += 1;
  if (filters.maxPrice !== null && filters.maxPrice < bounds.max) count += 1;
  if (filters.inStockOnly) count += 1;
  if (filters.minRating !== null && filters.minRating > 0) count += 1;
  if (filters.occasion) count += 1;
  if (filters.fabric) count += 1;
  if (filters.style) count += 1;
  if (filters.tag) count += 1;
  if (filters.collection) count += 1;

  return count;
}
