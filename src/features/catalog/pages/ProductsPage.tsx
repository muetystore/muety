import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { QuickViewModal } from '@/features/catalog/components/QuickViewModal';
import { SortDropdown } from '@/features/catalog/components/SortDropdown';
import { ProductFilterPanel } from '@/features/catalog/components/ProductFilterPanel';
import { ProductFilterDrawer } from '@/features/catalog/components/ProductFilterDrawer';
import { ActiveFilterChips } from '@/features/catalog/components/ActiveFilterChips';
import { Product, Category } from '@/types';
import { 
  ProductFilterState, 
  SortOption, 
  filterProducts, 
  sortProducts, 
  getCatalogPriceBounds, 
  calculateCategoryCounts, 
  getActiveFilterCount, 
  DEFAULT_FILTER_STATE 
} from '../utils/productFilters';
import { 
  SlidersHorizontal, 
  Search, 
  X, 
  Sparkles,
  RotateCcw,
  Loader2,
  Grid
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  useDocumentTitle('Pure Silk Sarees & Ethnic Catalog | MUETY');
  const [searchParams, setSearchParams] = useSearchParams();

  // Load initial products & categories from cache
  const [allProducts, setAllProducts] = useState<Product[]>(() => storageService.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => storageService.getCategories());
  const [productsLoading, setProductsLoading] = useState<boolean>(() => storageService.getProducts().length === 0);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Dynamic price bounds
  const priceBounds = useMemo(() => getCatalogPriceBounds(allProducts), [allProducts]);

  // Read URL params initially
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('cat') || 'all';
  const occasionParam = searchParams.get('occasion') || '';
  const fabricParam = searchParams.get('fabric') || '';
  const styleParam = searchParams.get('style') || '';
  const tagParam = searchParams.get('tag') || '';
  const collectionParam = searchParams.get('collection') || searchParams.get('col') || '';
  const minPriceParam = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
  const maxPriceParam = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
  const inStockParam = searchParams.get('inStock') === 'true';
  const ratingParam = searchParams.get('rating') ? Number(searchParams.get('rating')) : null;
  const sortParam = (searchParams.get('sort') as SortOption) || 'featured';

  // Filter & Sort State
  const [filters, setFilters] = useState<ProductFilterState>({
    search: queryParam,
    category: categoryParam,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    inStockOnly: inStockParam,
    minRating: ratingParam,
    occasion: occasionParam || undefined,
    fabric: fabricParam || undefined,
    style: styleParam || undefined,
    tag: tagParam || undefined,
    collection: collectionParam || undefined
  });

  const [sortBy, setSortBy] = useState<SortOption>(
    ['featured', 'newest', 'price-low', 'price-high', 'rating'].includes(sortParam)
      ? sortParam
      : 'featured'
  );

  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [mobileLayout, setMobileLayout] = useState<'2col' | '1col'>('2col');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [searchInputVal, setSearchInputVal] = useState(queryParam);

  // Subscribe to real-time products and categories
  useEffect(() => {
    setProductsLoading(allProducts.length === 0);
    setProductsError(null);

    const unsubProducts = productService.subscribeToProducts(
      (all) => {
        setAllProducts(all || []);
        setProductsLoading(false);
        setProductsError(null);
      },
      (err) => {
        console.error('ProductsPage subscribeToProducts error:', err);
        setProductsError(err?.message || 'Unable to connect to live Firestore catalog.');
        setProductsLoading(false);
      }
    );

    const unsubCategories = productService.subscribeToCategories(
      (cats) => {
        setCategories(cats || []);
      },
      (err) => {
        console.warn('ProductsPage subscribeToCategories error:', err);
      }
    );

    return () => {
      if (typeof unsubProducts === 'function') unsubProducts();
      if (typeof unsubCategories === 'function') unsubCategories();
    };
  }, []);

  // Sync state when URL query params change (e.g. forward/back navigation or incoming link)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('cat') || 'all';
    const minP = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
    const maxP = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const inStk = searchParams.get('inStock') === 'true';
    const rt = searchParams.get('rating') ? Number(searchParams.get('rating')) : null;
    const s = (searchParams.get('sort') as SortOption) || 'featured';

    setFilters(prev => ({
      ...prev,
      search: q,
      category: cat,
      minPrice: minP,
      maxPrice: maxP,
      inStockOnly: inStk,
      minRating: rt,
      occasion: searchParams.get('occasion') || undefined,
      fabric: searchParams.get('fabric') || undefined,
      style: searchParams.get('style') || undefined,
      tag: searchParams.get('tag') || undefined,
      collection: searchParams.get('collection') || searchParams.get('col') || undefined
    }));

    setSearchInputVal(q);

    if (['featured', 'newest', 'price-low', 'price-high', 'rating'].includes(s)) {
      setSortBy(s);
    }
  }, [searchParams]);

  // Push filter & sort updates to URL query parameters
  const updateUrlParams = useCallback((newFilters: ProductFilterState, newSort: SortOption) => {
    setSearchParams(prev => {
      const params = new URLSearchParams();

      if (newFilters.search && newFilters.search.trim()) {
        params.set('q', newFilters.search.trim());
      }
      if (newFilters.category && newFilters.category !== 'all') {
        params.set('cat', newFilters.category);
      }
      if (newFilters.minPrice !== null && newFilters.minPrice > priceBounds.min) {
        params.set('minPrice', String(newFilters.minPrice));
      }
      if (newFilters.maxPrice !== null && newFilters.maxPrice < priceBounds.max) {
        params.set('maxPrice', String(newFilters.maxPrice));
      }
      if (newFilters.inStockOnly) {
        params.set('inStock', 'true');
      }
      if (newFilters.minRating !== null && newFilters.minRating > 0) {
        params.set('rating', String(newFilters.minRating));
      }
      if (newSort && newSort !== 'featured') {
        params.set('sort', newSort);
      }

      // Preserve special campaign tags if present
      if (newFilters.occasion) params.set('occasion', newFilters.occasion);
      if (newFilters.fabric) params.set('fabric', newFilters.fabric);
      if (newFilters.style) params.set('style', newFilters.style);
      if (newFilters.tag) params.set('tag', newFilters.tag);
      if (newFilters.collection) params.set('collection', newFilters.collection);

      return params;
    }, { replace: true });
  }, [priceBounds, setSearchParams]);

  // Handle changing filters
  const handleFilterChange = (partial: Partial<ProductFilterState>) => {
    setFilters(prev => {
      const updated = { ...prev, ...partial };
      updateUrlParams(updated, sortBy);
      return updated;
    });
  };

  // Handle changing sort option
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    updateUrlParams(filters, newSort);
  };

  // Handle mobile drawer apply
  const handleApplyMobileFilters = (draft: ProductFilterState) => {
    setFilters(draft);
    updateUrlParams(draft, sortBy);
  };

  // Remove individual filter chip
  const handleRemoveFilter = (key: keyof ProductFilterState) => {
    setFilters(prev => {
      let updated: ProductFilterState;
      if (key === 'category') {
        updated = { ...prev, category: 'all' };
      } else if (key === 'search') {
        updated = { ...prev, search: '' };
        setSearchInputVal('');
      } else if (key === 'minPrice') {
        updated = { ...prev, minPrice: null };
      } else if (key === 'maxPrice') {
        updated = { ...prev, maxPrice: null };
      } else if (key === 'inStockOnly') {
        updated = { ...prev, inStockOnly: false };
      } else if (key === 'minRating') {
        updated = { ...prev, minRating: null };
      } else {
        const copy = { ...prev };
        delete copy[key];
        updated = copy;
      }
      updateUrlParams(updated, sortBy);
      return updated;
    });
  };

  // Reset all filters
  const resetFilters = () => {
    const fresh: ProductFilterState = {
      ...DEFAULT_FILTER_STATE,
      category: 'all',
      search: '',
      minPrice: null,
      maxPrice: null,
      inStockOnly: false,
      minRating: null
    };
    setFilters(fresh);
    setSearchInputVal('');
    setSortBy('featured');
    updateUrlParams(fresh, 'featured');
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange({ search: searchInputVal });
  };

  // Clear search input directly
  const handleClearSearch = () => {
    setSearchInputVal('');
    handleFilterChange({ search: '' });
  };

  // Filter products using strict AND semantics across all active criteria
  const filteredProducts = useMemo(() => {
    return filterProducts(allProducts, filters);
  }, [allProducts, filters]);

  // Sort filtered products deterministically
  const sortedProducts = useMemo(() => {
    return sortProducts(filteredProducts, sortBy);
  }, [filteredProducts, sortBy]);

  // Calculate live category counts taking other active filters into account
  const categoryCounts = useMemo(() => {
    return calculateCategoryCounts(allProducts, categories, filters);
  }, [allProducts, categories, filters]);

  // Number of active non-default filters
  const activeFilterCount = useMemo(() => {
    return getActiveFilterCount(filters, priceBounds);
  }, [filters, priceBounds]);

  return (
    <div className="products-page animate-fade-in" style={{ paddingBottom: 'clamp(4rem, 8vw, 6rem)', paddingTop: '1.25rem' }}>
      <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        MUETY Pure Silk Sarees & Ethnic Catalog
      </h1>

      <div className="container">
        {/* Mobile Search Input (Visible only on < 1024px) */}
        <div className="mobile-search-bar">
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Search pieces, materials, SKUs..."
              value={searchInputVal}
              onChange={(e) => setSearchInputVal(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem', paddingRight: '2rem', height: '42px', fontSize: '0.88rem', borderRadius: '8px' }}
            />
            <Search size={16} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            {searchInputVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search text"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-muted)', padding: '4px' }}
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        {/* Mobile / Tablet Compact Catalog Toolbar */}
        <div className="mobile-catalog-toolbar">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="filter-btn-mobile"
            aria-label={`Open filters. ${activeFilterCount} active`}
          >
            <SlidersHorizontal size={14} color="#c9a227" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge-pill">{activeFilterCount}</span>
            )}
          </button>

          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SortDropdown
              value={sortBy}
              onChange={handleSortChange}
              compact={true}
            />

            <button
              type="button"
              onClick={() => setMobileLayout(mobileLayout === '2col' ? '1col' : '2col')}
              style={{
                padding: '6px 8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#10172a',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                cursor: 'pointer'
              }}
              title="Toggle Grid View"
              aria-label={mobileLayout === '2col' ? 'Switch to 1-column view' : 'Switch to 2-column view'}
            >
              {mobileLayout === '2col' ? '|| 2 Col' : '[ ] 1 Col'}
            </button>
          </div>
        </div>

        {/* Desktop Catalog Toolbar (1024px and wider) */}
        <div className="desktop-catalog-toolbar">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', minWidth: '280px', maxWidth: '420px', flex: 1 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search pieces, materials, SKUs..."
                value={searchInputVal}
                onChange={(e) => setSearchInputVal(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2rem', height: '44px', borderRadius: '8px' }}
              />
              <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              {searchInputVal && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search input"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-muted)', padding: '4px' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: '#10172a' }}>{sortedProducts.length}</strong> {sortedProducts.length === 1 ? 'creation' : 'creations'}
            </span>

            <SortDropdown
              value={sortBy}
              onChange={handleSortChange}
            />
          </div>
        </div>

        {/* Two-Column Shop Layout: Desktop Sidebar + Product Results */}
        <div className="products-layout-grid">
          {/* Desktop Filter Sidebar */}
          <aside className="products-desktop-sidebar">
            <ProductFilterPanel
              filters={filters}
              onChange={handleFilterChange}
              onReset={resetFilters}
              categories={categories}
              categoryCounts={categoryCounts}
              priceBounds={priceBounds}
              isMobileDrawer={false}
            />
          </aside>

          {/* Product Results Area */}
          <main style={{ minWidth: 0, width: '100%' }}>
            {/* Removable Active Filter Chips */}
            <ActiveFilterChips
              filters={filters}
              categories={categories}
              priceBounds={priceBounds}
              onRemoveFilter={handleRemoveFilter}
              onResetAll={resetFilters}
            />

            {/* Catalog Loading State */}
            {productsLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '5rem 2rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid var(--brand-border)'
              }}>
                <Loader2 size={32} className="animate-spin" color="#c9a227" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#10172a', marginBottom: '0.5rem' }}>
                  Connecting to MUETY Atelier...
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Retrieving genuine Salem handloom creations from our live cloud catalog.
                </p>
              </div>
            ) : productsError ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: '#fef2f2',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid #fca5a5'
              }}>
                <h3 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>
                  Unable to load catalog pieces right now.
                </h3>
                <p style={{ color: '#7f1d1d', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                  {productsError}
                </p>
                <button 
                  type="button" 
                  onClick={() => window.location.reload()} 
                  className="btn btn-primary btn-sm"
                >
                  Retry Connection
                </button>
              </div>
            ) : sortedProducts.length === 0 ? (
              /* Empty Results State */
              <div style={{
                textAlign: 'center',
                padding: '4.5rem 2rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1.5px dashed #e2e8f0'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(201, 162, 39, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  color: '#c9a227'
                }}>
                  <Sparkles size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#10172a', marginBottom: '0.5rem' }}>
                  No handlooms match your chosen filters.
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.75rem', maxWidth: '440px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
                  Try removing some filter constraints, broadening your price range, or searching for other weave techniques.
                </p>
                <button 
                  type="button"
                  onClick={resetFilters} 
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              /* Product Grid */
              <div className={`products-grid-3col ${mobileLayout === '1col' ? 'grid-view-1col' : ''}`}>
                {sortedProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onQuickView={(p) => setQuickViewProduct(p)} 
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal 
        product={quickViewProduct} 
        onClose={() => setQuickViewProduct(null)} 
      />

      {/* Mobile Slide-Up Filter Drawer (Rendered via React Portal) */}
      <ProductFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        appliedFilters={filters}
        onApply={handleApplyMobileFilters}
        allProducts={allProducts}
        categories={categories}
        categoryCounts={categoryCounts}
        priceBounds={priceBounds}
      />
    </div>
  );
};
