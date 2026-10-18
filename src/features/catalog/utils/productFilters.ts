import { Product, Category } from '../types';

export type SortOption = 'featured' | 'newest' | 'price-low' | 'price-high' | 'rating';

export interface ProductFilterState {
  search: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  minRating?: number | null; // Kept optional for backward compatibility, removed from UI

  // Multi-select facet filters derived directly from product details and creation
  sareeTypes?: string[];
  fabrics?: string[];
  colors?: string[];
  occasions?: string[];
  patterns?: string[];

  // Optional legacy fields
  brands?: string[];
  genders?: string[];
  sareeStyles?: string[];
  packOf?: string[];
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
  minRating: null,
  sareeTypes: [],
  fabrics: [],
  colors: [],
  occasions: [],
  patterns: [],
  brands: [],
  genders: [],
  sareeStyles: [],
  packOf: []
};

export interface FilterFacetOption {
  id: string;
  label: string;
  count: number;
  colorHex?: string;
}

export interface AvailableFacetFilters {
  sareeTypes: FilterFacetOption[];
  fabrics: FilterFacetOption[];
  colors: FilterFacetOption[];
  occasions: FilterFacetOption[];
  patterns: FilterFacetOption[];
}

export interface PriceHistogramBin {
  min: number;
  max: number;
  count: number;
  percentage: number;
  isInRange: boolean;
}

/** Helper to generate clean slug IDs for dynamically extracted options */
export function slugifyOption(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Helper to assign a color hex code to any color extracted from product details/creation */
export function getColorHex(colorName: string): string {
  const c = colorName.toLowerCase();
  if (c.includes('red') || c.includes('crimson') || c.includes('scarlet') || c.includes('ruby')) return '#dc2626';
  if (c.includes('green') || c.includes('emerald') || c.includes('olive') || c.includes('mint') || c.includes('pistachio')) return '#059669';
  if (c.includes('blue') || c.includes('navy') || c.includes('sapphire') || c.includes('indigo') || c.includes('teal')) return '#2563eb';
  if (c.includes('gold') || c.includes('ochre') || c.includes('mustard') || c.includes('zari') || c.includes('copper')) return '#d97706';
  if (c.includes('pink') || c.includes('rani') || c.includes('rose') || c.includes('magenta') || c.includes('blush')) return '#db2777';
  if (c.includes('purple') || c.includes('violet') || c.includes('lavender') || c.includes('wine') || c.includes('plum')) return '#7c3aed';
  if (c.includes('maroon') || c.includes('burgundy')) return '#881337';
  if (c.includes('yellow') || c.includes('amber') || c.includes('lemon') || c.includes('haldi')) return '#eab308';
  if (c.includes('orange') || c.includes('coral') || c.includes('peach') || c.includes('rust')) return '#ea580c';
  if (c.includes('cream') || c.includes('ivory') || c.includes('beige') || c.includes('off-white') || c.includes('white')) return '#fef3c7';
  if (c.includes('black') || c.includes('charcoal') || c.includes('dark')) return '#1e293b';
  if (c.includes('grey') || c.includes('gray') || c.includes('silver')) return '#94a3b8';
  return '#d4af37'; // Default brand gold accent
}

/** Format occasion strings into readable titles */
export function formatOccasionLabel(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === 'bridal' || lower.includes('bridal') || lower.includes('muhurtham')) return 'Bridal & Wedding';
  if (lower === 'festive' || lower.includes('festiv') || lower.includes('diwali')) return 'Festive & Celebration';
  if (lower === 'temple' || lower.includes('temple') || lower.includes('puja')) return 'Temple & Traditional';
  if (lower === 'reception' || lower.includes('reception') || lower.includes('party')) return 'Reception & Cocktail';
  if (lower === 'casual' || lower.includes('casual') || lower.includes('daily')) return 'Daily & Casual Drape';
  // Capitalize custom occasion entered in admin product creation
  return raw.trim().replace(/\b\w/g, char => char.toUpperCase());
}

/** Check if product values match any selected facet IDs */
function matchesFacet(productValues: string[], selectedIds: string[]): boolean {
  if (!selectedIds || selectedIds.length === 0) return true;
  const normalizedProdValues = productValues
    .filter(Boolean)
    .map(v => v.toLowerCase().trim());

  const synonyms: Record<string, string[]> = {
    'kanchipuram': ['kanchivaram', 'kanchi', 'kanjeevaram'],
    'kanchivaram': ['kanchipuram', 'kanchi', 'kanjeevaram'],
    'banarasi': ['varanasi', 'katan', 'banaras'],
    'pure silk': ['mulberry silk', 'pure handloom', 'silk mark', 'pure silk'],
    'handloom': ['loom', 'hand-woven', 'hand woven']
  };

  return selectedIds.some(selId => {
    const cleanSel = selId.toLowerCase().trim().replace(/-/g, ' ');
    const targets = [cleanSel, ...(synonyms[cleanSel] || [])];

    return normalizedProdValues.some(val => {
      return targets.some(target => {
        if (val === target || val.includes(target) || target.includes(val)) {
          return true;
        }
        const selTokens = target.split(' ').filter(t => t.length >= 2);
        return selTokens.length > 0 && selTokens.every(tok => val.includes(tok));
      });
    });
  });
}

/** Helper to extract all text search targets from a product */
function getProductSearchableText(p: Product): string {
  const parts: string[] = [
    p.name || '',
    p.title || '',
    p.shortDescription || '',
    p.description || '',
    p.category || '',
    p.categorySlug || '',
    p.fabric || '',
    p.material || '',
    p.silkType || '',
    p.weave || '',
    p.weaveTechnique || '',
    p.zariType || '',
    p.borderType || '',
    p.palluType || '',
    p.craftsmanship || '',
    p.artisanDetails || '',
    p.origin || '',
    p.occasion || '',
    ...(Array.isArray(p.occasions) ? p.occasions : []),
    ...(Array.isArray(p.tags) ? p.tags : []),
    ...(Array.isArray(p.colors) ? p.colors : []),
    ...(p.specifications ? Object.values(p.specifications) : [])
  ];

  return parts.join(' ').toLowerCase();
}

/**
 * Calculates valid price bounds from catalog products.
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
 * Calculates price histogram bins for visual density chart above the slider.
 */
export function calculatePriceHistogram(
  products: Product[],
  bounds: { min: number; max: number },
  currentMinPrice: number,
  currentMaxPrice: number,
  binCount = 14
): PriceHistogramBin[] {
  const { min, max } = bounds;
  const range = max - min;
  if (range <= 0 || products.length === 0) {
    return Array.from({ length: binCount }, (_, i) => ({
      min,
      max,
      count: 0,
      percentage: 20,
      isInRange: true
    }));
  }

  const step = range / binCount;
  const counts = new Array(binCount).fill(0);

  products.forEach(p => {
    const price = Number(p.price);
    if (!isNaN(price) && price >= 0) {
      let idx = Math.floor((price - min) / step);
      if (idx < 0) idx = 0;
      if (idx >= binCount) idx = binCount - 1;
      counts[idx]++;
    }
  });

  const maxCount = Math.max(...counts, 1);
  const bins: PriceHistogramBin[] = [];

  for (let i = 0; i < binCount; i++) {
    const binMin = Math.round(min + i * step);
    const binMax = Math.round(min + (i + 1) * step);
    const count = counts[i];
    const percentage = count === 0 ? 12 : Math.round(18 + (count / maxCount) * 82);
    const isInRange = binMax >= currentMinPrice && binMin <= currentMaxPrice;

    bins.push({
      min: binMin,
      max: binMax,
      count,
      percentage,
      isInRange
    });
  }

  return bins;
}

/**
 * Dynamically extracts available facet options DIRECTLY from product details and product creation fields.
 * Includes only options that actually exist in the products, ensuring no empty/irrelevant filter options.
 */
export function extractAvailableFacets(products: Product[]): AvailableFacetFilters {
  const validProducts = Array.isArray(products) ? products.filter(Boolean) : [];

  // Helper to extract unique facet options from product candidate values
  const buildDynamicOptions = (
    getCandidates: (p: Product) => string[],
    formatLabel?: (raw: string) => string,
    isColor = false
  ): FilterFacetOption[] => {
    const optionMap = new Map<string, { label: string; count: number; colorHex?: string }>();

    validProducts.forEach(prod => {
      const rawCandidates = getCandidates(prod);
      // Clean and deduplicate candidates per product so a product is counted once per option
      const seenForThisProd = new Set<string>();

      rawCandidates.forEach(raw => {
        if (!raw || typeof raw !== 'string') return;
        const clean = raw.trim();
        if (!clean || clean.length < 2 || clean.toLowerCase() === 'n/a') return;

        const label = formatLabel ? formatLabel(clean) : clean;
        const id = slugifyOption(label);

        if (!id || seenForThisProd.has(id)) return;
        seenForThisProd.add(id);

        if (optionMap.has(id)) {
          optionMap.get(id)!.count += 1;
        } else {
          optionMap.set(id, {
            label,
            count: 1,
            colorHex: isColor ? getColorHex(label) : undefined
          });
        }
      });
    });

    return Array.from(optionMap.entries())
      .map(([id, data]) => ({
        id,
        label: data.label,
        count: data.count,
        colorHex: data.colorHex
      }))
      .sort((a, b) => b.count - a.count);
  };

  // 1. Saree Types / Weave: Extracted from weaveTechnique, weave, specifications['Weave Technique'], specifications['Weave']
  const sareeTypes = buildDynamicOptions(p => [
    p.weaveTechnique || '',
    p.weave || '',
    p.specifications?.['Weave Technique'] || '',
    p.specifications?.['Weave'] || '',
    p.category || '',
    ...(p.tags || []).filter(t => 
      ['kanchipuram', 'banarasi', 'organza', 'chanderi', 'tussar', 'soft silk', 'handloom', 'katan', 'silk'].some(kw => t.toLowerCase().includes(kw))
    )
  ], raw => {
    // Clean up excessive brackets e.g. "Pure Silk (Silk Mark Certified)"
    return raw.replace(/\(Silk Mark Certified\)/i, '').trim();
  });

  // 2. Fabrics: Extracted from silkType, fabric, material, specifications['Fabric']
  const fabrics = buildDynamicOptions(p => [
    p.silkType || '',
    p.fabric || '',
    p.material || '',
    p.specifications?.['Fabric'] || '',
    p.specifications?.['fabric'] || '',
    p.specifications?.['Material'] || '',
    ...(p.tags || []).filter(t => 
      ['silk', 'cotton', 'organza', 'chanderi', 'georgette', 'chiffon', 'linen', 'katan'].some(kw => t.toLowerCase().includes(kw))
    )
  ], raw => {
    return raw.replace(/\(Silk Mark Certified\)/i, '').trim();
  });

  // 3. Colors: Extracted from colors array (as entered in product creation) and color tags
  const colors = buildDynamicOptions(p => [
    ...(Array.isArray(p.colors) ? p.colors : []),
    ...(p.tags || []).filter(t => 
      ['red', 'green', 'blue', 'gold', 'pink', 'purple', 'yellow', 'maroon', 'orange', 'teal', 'cream', 'black', 'white', 'ochre', 'emerald', 'crimson'].some(c => t.toLowerCase().includes(c))
    )
  ], undefined, true);

  // 4. Occasions: Extracted from occasion, occasions array, specifications['Occasion']
  const occasions = buildDynamicOptions(p => [
    p.occasion || '',
    ...(Array.isArray(p.occasions) ? p.occasions : []),
    p.specifications?.['Occasion'] || '',
    ...(p.tags || []).filter(t => 
      ['bridal', 'wedding', 'festive', 'temple', 'reception', 'party', 'diwali', 'casual'].some(o => t.toLowerCase().includes(o))
    )
  ], formatOccasionLabel);

  // 5. Patterns / Border / Zari: Extracted from zariType, borderType, palluType, specifications['Zari'], specifications['Work']
  const patterns = buildDynamicOptions(p => [
    p.borderType || '',
    p.zariType || '',
    p.palluType || '',
    p.specifications?.['Zari'] || '',
    p.specifications?.['Border'] || '',
    p.specifications?.['Work'] || '',
    ...(p.tags || []).filter(t => 
      ['zari', 'border', 'korvai', 'brocade', 'jaal', 'temple', 'bootis', 'kadwa'].some(pt => t.toLowerCase().includes(pt))
    )
  ]);

  return {
    sareeTypes,
    fabrics,
    colors,
    occasions,
    patterns
  };
}

/**
 * Filters a product catalog using strict AND semantics across facets,
 * and OR semantics within multi-select facet lists.
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
      const searchable = getProductSearchableText(p);
      const skuMatch = (p.sku || '').toLowerCase().includes(q);

      if (!searchable.includes(q) && !skuMatch) {
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

    // 4. In Stock Only Filter
    if (filters.inStockOnly) {
      const isPurchasable = (Number(p.stock) || 0) > 0 && p.availability !== 'sold_out';
      if (!isPurchasable) {
        return false;
      }
    }

    // 5. Minimum Rating Filter (Kept for backwards compatibility in tests if passed)
    if (filters.minRating !== null && filters.minRating !== undefined && filters.minRating > 0) {
      const rating = Number(p.rating) || 0;
      if (rating < filters.minRating) {
        return false;
      }
    }

    // 6. Saree Types Multi-Select Filter (OR within list)
    if (Array.isArray(filters.sareeTypes) && filters.sareeTypes.length > 0) {
      const prodWeaves = [
        p.weaveTechnique || '',
        p.weave || '',
        p.specifications?.['Weave Technique'] || '',
        p.specifications?.['Weave'] || '',
        p.category || '',
        p.name || '',
        ...(p.tags || [])
      ];
      if (!matchesFacet(prodWeaves, filters.sareeTypes)) {
        return false;
      }
    }

    // 7. Fabric Multi-Select Filter (OR within list)
    if (Array.isArray(filters.fabrics) && filters.fabrics.length > 0) {
      const prodFabrics = [
        p.silkType || '',
        p.fabric || '',
        p.material || '',
        p.specifications?.['Fabric'] || '',
        p.specifications?.['fabric'] || '',
        p.specifications?.['Material'] || '',
        p.name || '',
        ...(p.tags || [])
      ];
      if (!matchesFacet(prodFabrics, filters.fabrics)) {
        return false;
      }
    }

    // 8. Color Multi-Select Filter (OR within list)
    if (Array.isArray(filters.colors) && filters.colors.length > 0) {
      const prodColors = [
        ...(Array.isArray(p.colors) ? p.colors : []),
        p.name || '',
        ...(p.tags || [])
      ];
      if (!matchesFacet(prodColors, filters.colors)) {
        return false;
      }
    }

    // 9. Occasion Multi-Select Filter (OR within list)
    if (Array.isArray(filters.occasions) && filters.occasions.length > 0) {
      const prodOccasions = [
        p.occasion || '',
        ...(Array.isArray(p.occasions) ? p.occasions : []),
        p.specifications?.['Occasion'] || '',
        p.name || '',
        p.description || '',
        ...(p.tags || [])
      ];
      if (!matchesFacet(prodOccasions, filters.occasions)) {
        return false;
      }
    }

    // 10. Pattern Multi-Select Filter (OR within list)
    if (Array.isArray(filters.patterns) && filters.patterns.length > 0) {
      const prodPatterns = [
        p.borderType || '',
        p.zariType || '',
        p.palluType || '',
        p.specifications?.['Zari'] || '',
        p.specifications?.['Border'] || '',
        p.specifications?.['Work'] || '',
        p.name || '',
        ...(p.tags || [])
      ];
      if (!matchesFacet(prodPatterns, filters.patterns)) {
        return false;
      }
    }

    // 11. Legacy query string parameters (for direct URLs)
    const searchableText = getProductSearchableText(p);

    if (filters.occasion && (!filters.occasions || filters.occasions.length === 0)) {
      const occ = filters.occasion.toLowerCase().trim();
      if (!searchableText.includes(occ)) return false;
    }

    if (filters.fabric && (!filters.fabrics || filters.fabrics.length === 0)) {
      const fab = filters.fabric.toLowerCase().replace(/-/g, ' ').trim();
      const tokens = fab.split(' ').filter(Boolean);
      if (!tokens.some(tok => searchableText.includes(tok))) return false;
    }

    if (filters.style) {
      const sty = filters.style.toLowerCase().trim();
      if (!searchableText.includes(sty)) return false;
    }

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
        const tagMatch = (p.tags || []).some(t => (t || '').toLowerCase().includes(tg)) || searchableText.includes(tg);
        if (!tagMatch) return false;
      }
    }

    if (filters.collection) {
      const col = filters.collection.toLowerCase().trim();
      const colMatch = (p.collectionId || '').toLowerCase() === col ||
                       (Array.isArray(p.collectionIds) && p.collectionIds.some(cid => (cid || '').toLowerCase() === col)) ||
                       (p.categorySlug || '').toLowerCase().includes(col) ||
                       searchableText.includes(col);
      if (!colMatch) return false;
    }

    return true;
  });
}

/**
 * Deterministically sorts products according to chosen option.
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
 */
export function calculateCategoryCounts(
  products: Product[],
  categories: Category[],
  baseFilters: Omit<ProductFilterState, 'category'>
): Record<string, number> {
  const counts: Record<string, number> = {};

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
  if (filters.minRating !== null && filters.minRating !== undefined && filters.minRating > 0) count += 1;

  if (Array.isArray(filters.sareeTypes)) count += filters.sareeTypes.length;
  if (Array.isArray(filters.fabrics)) count += filters.fabrics.length;
  if (Array.isArray(filters.colors)) count += filters.colors.length;
  if (Array.isArray(filters.occasions)) count += filters.occasions.length;
  if (Array.isArray(filters.patterns)) count += filters.patterns.length;

  if (filters.occasion && (!filters.occasions || filters.occasions.length === 0)) count += 1;
  if (filters.fabric && (!filters.fabrics || filters.fabrics.length === 0)) count += 1;
  if (filters.tag) count += 1;
  if (filters.collection) count += 1;

  return count;
}
