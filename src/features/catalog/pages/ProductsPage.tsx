import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { QuickViewModal } from '@/features/catalog/components/QuickViewModal';
import { Product } from '@/types';
import { 
  SlidersHorizontal, 
  Search, 
  X, 
  Sparkles,
  RotateCcw
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  useDocumentTitle('Products');
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('cat') || 'all';

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [allProducts, setAllProducts] = useState<Product[]>(() => storageService.getProducts());
  const [categories, setCategories] = useState(() => productService.getCategories());

  const maxAvailablePrice = useMemo(() => {
    const highest = Math.max(...allProducts.map(p => p.price || 0), 2500);
    return Math.max(5000, Math.ceil(highest / 500) * 500 + 500);
  }, [allProducts]);

  const [priceRange, setPriceRange] = useState<number>(10000);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [mobileLayout, setMobileLayout] = useState<'2col' | '1col'>('2col');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    const unsubscribe = productService.subscribeToProducts((all) => {
      setAllProducts(all);
      setCategories(productService.getCategories());
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    setSearchTerm(queryParam);
    setSelectedCategory(categoryParam);
  }, [queryParam, categoryParam]);

  const products = useMemo(() => {
    let list = [...allProducts];

    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        p => (p.name || '').toLowerCase().includes(q) ||
             (p.description || '').toLowerCase().includes(q) ||
             (p.shortDescription || '').toLowerCase().includes(q) ||
             (p.category || '').toLowerCase().includes(q) ||
             (p.categorySlug || '').toLowerCase().includes(q) ||
             ((p.tags || []).some(tag => (tag || '').toLowerCase().includes(q))) ||
             (p.sku || '').toLowerCase().includes(q)
      );
    }

    if (selectedCategory && selectedCategory !== 'all') {
      const catLower = selectedCategory.toLowerCase();
      list = list.filter(p => 
        (p.categorySlug || '').toLowerCase() === catLower || 
        (p.category || '').toLowerCase() === catLower
      );
    }

    list = list.filter(p => p.price <= priceRange);

    if (onlyInStock) {
      list = list.filter(p => p.stock > 0);
    }

    if (sortBy) {
      switch (sortBy) {
        case 'price-low':
          list.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          list.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          list.sort((a, b) => a.rating - b.rating);
          break;
        case 'newest':
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        default:
          break;
      }
    }

    return list;
  }, [allProducts, searchTerm, selectedCategory, priceRange, sortBy, onlyInStock]);

  const getCategoryCount = (slug: string) => {
    if (slug === 'all') return allProducts.length;
    return allProducts.filter(p => 
      (p.categorySlug || '').toLowerCase() === slug.toLowerCase() ||
      (p.category || '').toLowerCase() === slug.toLowerCase()
    ).length;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (searchTerm) params.set('q', searchTerm);
      else params.delete('q');
      return params;
    });
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (slug !== 'all') params.set('cat', slug);
      else params.delete('cat');
      return params;
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setPriceRange(maxAvailablePrice);
    setOnlyInStock(false);
    setSortBy('featured');
    setSearchParams({});
  };

  return (
    <div className="products-page animate-fade-in" style={{ paddingBottom: '5rem' }}>
      <div style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '2.5rem 0 2rem',
        marginBottom: '1.5rem'
      }}>
        <div className="container">
          <div style={{ maxWidth: '640px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
              THE COMPLETE REPERTORY
            </span>
            <h1 style={{ color: '#ffffff', fontSize: '2.2rem', marginTop: '4px', marginBottom: '0.4rem' }}>
              {selectedCategory !== 'all' 
                ? categories.find(c => c.slug === selectedCategory)?.name || 'Collection'
                : 'MUETY Collections'
              }
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
              Explore handcrafted horology, Italian leather pieces, tailored apparel, and acoustics.
            </p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="mobile-catalog-toolbar" style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 0',
          borderBottom: '1px solid var(--brand-border)',
          marginBottom: '1rem',
          backgroundColor: 'var(--bg-main)',
          position: 'sticky',
          top: '76px',
          zIndex: 90
        }}>
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--brand-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--brand-border)'
            }}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
            {(selectedCategory !== 'all' || onlyInStock || priceRange < maxAvailablePrice) && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ea580c' }} />
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--brand-primary)',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--brand-border)',
                outline: 'none'
              }}
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low</option>
              <option value="price-high">Price: High</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setMobileLayout(mobileLayout === '2col' ? '1col' : '2col')}
              style={{
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#ffffff',
                border: '1px solid var(--brand-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--brand-primary)'
              }}
              title="Toggle Grid View"
            >
              {mobileLayout === '2col' ? '|| 2 Col' : '[ ] 1 Col'}
            </button>
          </div>
        </div>

        <div className="desktop-catalog-toolbar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--brand-border)'
        }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', minWidth: '280px', maxWidth: '400px', flex: 1 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search pieces, materials, SKUs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2rem', height: '44px' }}
              />
              <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('q'); return p; }); }}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-muted)' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Showing <strong>{products.length}</strong> items
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--brand-muted)', fontWeight: 600 }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '0.45rem 2rem 0.45rem 0.75rem', fontSize: '0.875rem' }}
              >
                <option value="featured">Featured Picks</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2.5rem' }} className="products-layout-grid">
          <aside className={`filter-sidebar ${mobileFilterOpen ? 'mobile-open' : ''}`} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Filters</h3>
              <button 
                onClick={resetFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--brand-accent-hover)', fontWeight: 600 }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-muted)', marginBottom: '0.75rem' }}>
                Categories
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => handleCategorySelect('all')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: selectedCategory === 'all' ? 'var(--brand-primary)' : 'transparent',
                    color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-primary)',
                    fontWeight: selectedCategory === 'all' ? 700 : 500,
                    fontSize: '0.9rem',
                    textAlign: 'left'
                  }}
                >
                  <span>All Collections</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    ({allProducts.length})
                  </span>
                </button>

                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.slug)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: selectedCategory === cat.slug ? 'var(--brand-primary)' : 'transparent',
                      color: selectedCategory === cat.slug ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: selectedCategory === cat.slug ? 700 : 500,
                      fontSize: '0.9rem',
                      textAlign: 'left'
                    }}
                  >
                    <span>{cat.name}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      ({getCategoryCount(cat.slug)})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-muted)' }}>
                  Max Price
                </h4>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-primary)' }}>
                  ₹{priceRange >= maxAvailablePrice ? `${maxAvailablePrice.toLocaleString()}+` : priceRange.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={maxAvailablePrice}
                step={50}
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#0f172a' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--brand-muted)', marginTop: '4px' }}>
                <span>₹50</span>
                <span>₹{maxAvailablePrice.toLocaleString()}+</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--brand-border)',
              borderRadius: 'var(--radius-md)'
            }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>In Stock Only</span>
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#0f172a' }}
              />
            </div>
          </aside>

          <div>
            {products.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '5rem 2rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--brand-border)'
              }}>
                <Sparkles size={48} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No Matching Creations Found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                  We couldn't find any products matching your specific filters or search keywords.
                </p>
                <button onClick={resetFilters} className="btn btn-primary btn-sm">
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className={`products-grid-3col ${mobileLayout === '1col' ? 'grid-view-1col' : ''}`}>
                {products.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onQuickView={(p) => setQuickViewProduct(p)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <QuickViewModal 
        product={quickViewProduct} 
        onClose={() => setQuickViewProduct(null)} 
      />

      <style>{`
        @media (max-width: 860px) {
          .products-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .mobile-catalog-toolbar {
            display: flex !important;
          }
          .desktop-catalog-toolbar {
            display: none !important;
          }
          .filter-sidebar {
            display: none;
            background: #ffffff;
            padding: 1.25rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--brand-border);
            margin-bottom: 1.25rem;
          }
          .filter-sidebar.mobile-open {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
