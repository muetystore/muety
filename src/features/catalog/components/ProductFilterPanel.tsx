import React, { useState, useMemo } from 'react';
import { Category, Product } from '../types';
import { 
  ProductFilterState, 
  extractAvailableFacets, 
  calculatePriceHistogram,
  FilterFacetOption
} from '../utils/productFilters';
import { 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  Search, 
  Check, 
  SlidersHorizontal,
  X
} from 'lucide-react';

interface ProductFilterPanelProps {
  filters: ProductFilterState;
  onChange: (updated: Partial<ProductFilterState>) => void;
  onReset: () => void;
  categories: Category[];
  categoryCounts: Record<string, number>;
  priceBounds: { min: number; max: number };
  allProducts?: Product[];
  isMobileDrawer?: boolean;
}

export const ProductFilterPanel: React.FC<ProductFilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  categories,
  categoryCounts,
  priceBounds,
  allProducts = [],
  isMobileDrawer = false
}) => {
  const currentMinPrice = filters.minPrice !== null && filters.minPrice !== undefined ? filters.minPrice : priceBounds.min;
  const currentMaxPrice = filters.maxPrice !== null && filters.maxPrice !== undefined ? filters.maxPrice : priceBounds.max;

  // Accordion open/close state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sareeTypes: true,
    fabrics: true,
    colors: true,
    occasions: true,
    patterns: false,
    price: true
  });

  // Local search terms for searchable accordion sections
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleSearchChange = (sec: string, val: string) => {
    setSearchTerms(prev => ({ ...prev, [sec]: val }));
  };

  // Extract available facet options dynamically based on allProducts
  const availableFacets = useMemo(() => {
    return extractAvailableFacets(allProducts);
  }, [allProducts]);

  // Compute price histogram density bars (6 bins for stepped silhouette)
  const histogramBins = useMemo(() => {
    return calculatePriceHistogram(
      allProducts,
      priceBounds,
      currentMinPrice,
      currentMaxPrice,
      6
    );
  }, [allProducts, priceBounds, currentMinPrice, currentMaxPrice]);

  // Facet multi-select toggle helper
  const toggleFacetItem = (facetKey: keyof ProductFilterState, id: string) => {
    const currentList = Array.isArray(filters[facetKey]) 
      ? (filters[facetKey] as string[]) 
      : [];
    const exists = currentList.includes(id);
    const updated = exists 
      ? currentList.filter(item => item !== id)
      : [...currentList, id];
    onChange({ [facetKey]: updated });
  };

  // Clear specific facet
  const clearFacet = (facetKey: keyof ProductFilterState) => {
    onChange({ [facetKey]: [] });
  };

  // Price change handlers
  const handleMinPriceChange = (val: number) => {
    const clamped = Math.max(priceBounds.min, Math.min(val, currentMaxPrice));
    onChange({ minPrice: clamped });
  };

  const handleMaxPriceChange = (val: number) => {
    const clamped = Math.min(priceBounds.max, Math.max(val, currentMinPrice));
    onChange({ maxPrice: clamped });
  };

  // Pre-calculated price percentage for slider track highlight
  const priceRangeSpan = Math.max(1, priceBounds.max - priceBounds.min);
  const minPercent = Math.min(100, Math.max(0, ((currentMinPrice - priceBounds.min) / priceRangeSpan) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((currentMaxPrice - priceBounds.min) / priceRangeSpan) * 100));

  // Preset options for Min and Max dropdowns matching reference design
  const minPricePresets = useMemo(() => {
    const min = priceBounds.min;
    const max = priceBounds.max;
    const range = max - min;
    const step = Math.max(500, Math.round(range / 6 / 100) * 100);
    const presets: { label: string; value: number }[] = [{ label: 'Min', value: min }];
    for (let p = min + step; p < currentMaxPrice; p += step) {
      presets.push({ label: `₹${p.toLocaleString('en-IN')}`, value: p });
    }
    if (!presets.some(pr => pr.value === currentMinPrice)) {
      presets.push({
        label: currentMinPrice === min ? 'Min' : `₹${currentMinPrice.toLocaleString('en-IN')}`,
        value: currentMinPrice
      });
      presets.sort((a, b) => a.value - b.value);
    }
    return presets;
  }, [priceBounds, currentMaxPrice, currentMinPrice]);

  const maxPricePresets = useMemo(() => {
    const min = priceBounds.min;
    const max = priceBounds.max;
    const range = max - min;
    const step = Math.max(500, Math.round(range / 6 / 100) * 100);
    const presets: { label: string; value: number }[] = [];
    for (let p = Math.max(min + step, Math.ceil(currentMinPrice / step) * step); p < max; p += step) {
      presets.push({ label: `₹${p.toLocaleString('en-IN')}+`, value: p });
    }
    presets.push({ label: `₹${max.toLocaleString('en-IN')}+`, value: max });

    if (!presets.some(pr => pr.value === currentMaxPrice)) {
      presets.push({
        label: `₹${currentMaxPrice.toLocaleString('en-IN')}+`,
        value: currentMaxPrice
      });
      presets.sort((a, b) => a.value - b.value);
    }
    return presets;
  }, [priceBounds, currentMinPrice, currentMaxPrice]);

  // Currently selected category object (if any)
  const selectedCategoryObj = useMemo(() => {
    if (!filters.category || filters.category === 'all') return null;
    return categories.find(c => 
      (c.slug || '').toLowerCase() === filters.category.toLowerCase() || 
      c.id === filters.category
    );
  }, [categories, filters.category]);

  // Generic Accordion Section Renderer
  const renderAccordionSection = (
    sectionKey: string,
    title: string,
    facetKey: keyof ProductFilterState,
    options: FilterFacetOption[],
    renderColorSwatch = false
  ) => {
    if (!options || options.length === 0) return null;

    const isOpen = !!openSections[sectionKey];
    const selectedItems = Array.isArray(filters[facetKey]) ? (filters[facetKey] as string[]) : [];
    const activeCount = selectedItems.length;
    const query = (searchTerms[sectionKey] || '').toLowerCase().trim();

    const filteredOptions = query 
      ? options.filter(opt => opt.label.toLowerCase().includes(query))
      : options;

    return (
      <div 
        key={sectionKey} 
        style={{ 
          borderTop: '1px solid #f0f0f0',
          padding: '12px 0'
        }}
      >
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '2px 0',
            cursor: 'pointer',
            textAlign: 'left'
          }}
          aria-expanded={isOpen}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#1e293b'
            }}>
              {title}
            </span>
            {activeCount > 0 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#c9a227',
                backgroundColor: 'rgba(201, 162, 39, 0.12)',
                padding: '1px 6px',
                borderRadius: '9999px'
              }}>
                {activeCount}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFacet(facetKey);
                }}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px'
                }}
                title={`Clear ${title}`}
              >
                Clear
              </button>
            )}
            {isOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </div>
        </button>

        {/* Accordion Content */}
        {isOpen && (
          <div style={{ marginTop: '10px' }}>
            {/* Search filter within section if list has more than 5 options */}
            {options.length > 5 && (
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder={`Search ${title.toLowerCase()}...`}
                  value={searchTerms[sectionKey] || ''}
                  onChange={(e) => handleSearchChange(sectionKey, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px 6px 28px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
                <Search 
                  size={13} 
                  color="#94a3b8" 
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                {searchTerms[sectionKey] && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange(sectionKey, '')}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Checkbox List */}
            <div style={{ 
              maxHeight: '220px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              paddingRight: '4px' 
            }}>
              {filteredOptions.length === 0 ? (
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', padding: '6px 0', fontStyle: 'italic' }}>
                  No matching options found.
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedItems.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 6px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? 'rgba(201, 162, 39, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFacetItem(facetKey, opt.id)}
                          style={{
                            width: '15px',
                            height: '15px',
                            accentColor: '#10172a',
                            cursor: 'pointer',
                            borderRadius: '3px'
                          }}
                        />

                        {/* Optional color swatch circle */}
                        {renderColorSwatch && opt.colorHex && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: opt.colorHex,
                              border: opt.colorHex.toLowerCase() === '#fef3c7' || opt.colorHex.toLowerCase() === '#ffffff' 
                                ? '1px solid #cbd5e1' 
                                : '1px solid rgba(0,0,0,0.15)',
                              flexShrink: 0
                            }}
                          />
                        )}

                        <span style={{
                          fontSize: '0.82rem',
                          color: isChecked ? '#10172a' : '#334155',
                          fontWeight: isChecked ? 700 : 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {opt.label}
                        </span>
                      </div>

                      <span style={{
                        fontSize: '0.72rem',
                        color: isChecked ? '#c9a227' : '#94a3b8',
                        fontWeight: 600,
                        marginLeft: '8px'
                      }}>
                        {opt.count}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="muety-filter-panel-inner" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: 0,
        padding: 0,
        border: 'none',
        boxShadow: 'none'
      }}
    >
      {/* 1. Header with Reset All */}
      {!isMobileDrawer && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingBottom: '0.75rem', 
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SlidersHorizontal size={15} color="#c9a227" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10172a', margin: 0, letterSpacing: '0.04em' }}>
              FILTERS
            </h3>
          </div>
          <button
            type="button"
            onClick={onReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#c9a227',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              letterSpacing: '0.03em'
            }}
            title="Reset all filters"
          >
            <RotateCcw size={11} />
            <span>CLEAR ALL</span>
          </button>
        </div>
      )}

      {/* 2. CATEGORIES Section (Matching Flipkart/Myntra Breadcrumb Style) */}
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#10172a',
          margin: '0 0 0.65rem 0'
        }}>
          CATEGORIES
        </h4>

        {selectedCategoryObj ? (
          /* Breadcrumb hierarchy view when a specific category is chosen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px' }}>
            <button
              type="button"
              onClick={() => onChange({ category: 'all' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                color: '#64748b',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 0',
                textAlign: 'left'
              }}
            >
              <ChevronLeft size={14} />
              <span>Clothing and Accessories</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ category: 'all' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                color: '#64748b',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 0 2px 8px',
                textAlign: 'left'
              }}
            >
              <ChevronLeft size={14} />
              <span>Sarees &amp; Ethnic Wear</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ category: 'all' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                color: '#64748b',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 0 2px 16px',
                textAlign: 'left'
              }}
            >
              <ChevronLeft size={14} />
              <span>All Sarees</span>
            </button>

            {/* Currently Active Leaf Category */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              backgroundColor: '#10172a',
              color: '#ffffff',
              borderRadius: '6px',
              marginTop: '4px',
              marginLeft: '16px'
            }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                {selectedCategoryObj.name}
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(201, 162, 39, 0.4)', padding: '1px 6px', borderRadius: '9999px', fontWeight: 600 }}>
                {categoryCounts[(selectedCategoryObj.slug || '').toLowerCase()] ?? 0}
              </span>
            </div>
          </div>
        ) : (
          /* List of Categories when 'all' is selected */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <button
              type="button"
              onClick={() => onChange({ category: 'all' })}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: '6px',
                backgroundColor: filters.category === 'all' ? '#10172a' : 'transparent',
                color: filters.category === 'all' ? '#ffffff' : '#334155',
                fontWeight: filters.category === 'all' ? 700 : 500,
                fontSize: '0.84rem',
                textAlign: 'left',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <span>All Categories</span>
              <span style={{
                fontSize: '0.72rem',
                opacity: filters.category === 'all' ? 1 : 0.7,
                fontWeight: 600,
                backgroundColor: filters.category === 'all' ? 'rgba(201, 162, 39, 0.3)' : '#f1f5f9',
                padding: '1px 7px',
                borderRadius: '9999px',
                color: filters.category === 'all' ? '#ffffff' : '#475569'
              }}>
                {categoryCounts['all'] ?? allProducts.length}
              </span>
            </button>

            {categories.map((cat) => {
              const slug = (cat.slug || '').toLowerCase();
              const isSelected = filters.category.toLowerCase() === slug;
              const count = categoryCounts[slug] ?? 0;
              return (
                <button
                  key={cat.id || cat.slug}
                  type="button"
                  onClick={() => onChange({ category: cat.slug })}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#10172a' : 'transparent',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.84rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>
                    {cat.name}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    opacity: isSelected ? 1 : 0.7,
                    fontWeight: 600,
                    backgroundColor: isSelected ? 'rgba(201, 162, 39, 0.3)' : '#f1f5f9',
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    color: isSelected ? '#ffffff' : '#475569'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SAREE TYPE Accordion */}
      {renderAccordionSection('sareeTypes', 'Saree Type', 'sareeTypes', availableFacets.sareeTypes)}

      {/* 4. FABRIC Accordion */}
      {renderAccordionSection('fabrics', 'Fabric', 'fabrics', availableFacets.fabrics)}

      {/* 5. COLOR Accordion (With Color Swatch Circles) */}
      {renderAccordionSection('colors', 'Color', 'colors', availableFacets.colors, true)}

      {/* 6. OCCASION Accordion */}
      {renderAccordionSection('occasions', 'Occasion', 'occasions', availableFacets.occasions)}

      {/* 7. PATTERN Accordion */}
      {renderAccordionSection('patterns', 'Pattern', 'patterns', availableFacets.patterns)}

      {/* 12. PRICE SECTION (Histogram + Dual Range Slider + Dropdowns) */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 0' }}>
        <button
          type="button"
          onClick={() => toggleSection('price')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '2px 0 10px 0',
            cursor: 'pointer',
            textAlign: 'left'
          }}
          aria-expanded={openSections['price']}
        >
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#212121'
          }}>
            PRICE
          </span>
          {openSections['price'] ? <ChevronUp size={16} color="#878787" /> : <ChevronDown size={16} color="#878787" />}
        </button>

        {openSections['price'] && (
          <div style={{ marginTop: '4px' }}>
            {/* Visual Density Stepped Histogram */}
            <div 
              style={{ 
                height: '30px', 
                display: 'flex', 
                alignItems: 'flex-end', 
                gap: '0', 
                marginBottom: '0',
                padding: '0 4px'
              }}
              title="Catalog price density distribution"
            >
              {histogramBins.map((bin, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${bin.percentage}%`,
                    backgroundColor: '#dcdcdc',
                    borderRight: i < histogramBins.length - 1 ? '1px solid #f5f5f5' : 'none',
                    transition: 'height 0.2s ease'
                  }}
                  title={`₹${bin.min.toLocaleString('en-IN')} - ₹${bin.max.toLocaleString('en-IN')}: ${bin.count} items`}
                />
              ))}
            </div>

            {/* Dual Slider Bar with Active Blue Segment */}
            <div style={{ position: 'relative', height: '18px', display: 'flex', alignItems: 'center' }}>
              {/* Inactive Background Track */}
              <div 
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '2px'
                }}
              />
              {/* Highlight Active Segment in Vibrant Blue */}
              <div 
                style={{
                  position: 'absolute',
                  left: `${minPercent}%`,
                  width: `${Math.max(0, maxPercent - minPercent)}%`,
                  height: '4px',
                  backgroundColor: '#2874f0',
                  borderRadius: '2px'
                }}
              />

              {/* Dual Range Inputs (Overlaid) */}
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={50}
                value={currentMinPrice}
                onChange={(e) => handleMinPriceChange(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  width: '100%',
                  pointerEvents: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  zIndex: currentMinPrice > priceBounds.max - 100 ? 5 : 3
                }}
                className="muety-dual-slider-input"
                aria-label="Filter minimum price"
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={50}
                value={currentMaxPrice}
                onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  width: '100%',
                  pointerEvents: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  zIndex: 4
                }}
                className="muety-dual-slider-input"
                aria-label="Filter maximum price"
              />
            </div>

            {/* Step Dots (evenly spaced beneath the track matching reference) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', marginTop: '6px', marginBottom: '14px' }}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#c2c2c2' }} />
              ))}
            </div>

            {/* Min to Max Dropdowns / Selectors (Matching Reference: [Min v] to [₹1500+ v]) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <select
                  value={currentMinPrice}
                  onChange={(e) => handleMinPriceChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '32px',
                    padding: '2px 24px 2px 8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: '2px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#ffffff',
                    color: '#212121',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                  aria-label="Minimum price select"
                >
                  {minPricePresets.map((opt, i) => (
                    <option key={i} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={14} 
                  color="#212121" 
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} 
                />
              </div>

              <span style={{ fontSize: '13px', color: '#878787', fontWeight: 400 }}>to</span>

              <div style={{ position: 'relative', flex: 1 }}>
                <select
                  value={currentMaxPrice}
                  onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '32px',
                    padding: '2px 24px 2px 8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: '2px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#ffffff',
                    color: '#212121',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                  aria-label="Maximum price select"
                >
                  {maxPricePresets.map((opt, i) => (
                    <option key={i} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={14} 
                  color="#212121" 
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 13. IN STOCK ONLY (Clean toggle) */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 0 4px 0' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#212121' }}>
            In Stock Only
          </span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onChange({ inStockOnly: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: '#10172a', cursor: 'pointer', borderRadius: '3px' }}
          />
        </label>
      </div>

      {/* Note: MINIMUM RATING filter is completely removed per user request */}
    </div>
  );
};
