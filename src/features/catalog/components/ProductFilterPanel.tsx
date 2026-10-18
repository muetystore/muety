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

  // Compute price histogram density bars
  const histogramBins = useMemo(() => {
    return calculatePriceHistogram(
      allProducts,
      priceBounds,
      currentMinPrice,
      currentMaxPrice,
      14
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
    const step = Math.max(500, Math.round((priceBounds.max - priceBounds.min) / 6 / 100) * 100);
    const presets = [{ label: 'Min', value: priceBounds.min }];
    for (let p = priceBounds.min + step; p < currentMaxPrice; p += step) {
      presets.push({ label: `₹${p.toLocaleString('en-IN')}`, value: p });
    }
    return presets;
  }, [priceBounds, currentMaxPrice]);

  const maxPricePresets = useMemo(() => {
    const step = Math.max(500, Math.round((priceBounds.max - priceBounds.min) / 6 / 100) * 100);
    const presets = [];
    for (let p = currentMinPrice + step; p < priceBounds.max; p += step) {
      presets.push({ label: `₹${p.toLocaleString('en-IN')}`, value: p });
    }
    presets.push({ label: `₹${priceBounds.max.toLocaleString('en-IN')}+`, value: priceBounds.max });
    return presets;
  }, [priceBounds, currentMinPrice]);

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
          borderTop: '1px solid #f1ece4',
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
        backgroundColor: '#ffffff',
        borderRadius: isMobileDrawer ? '0' : '12px',
        padding: isMobileDrawer ? '0 0.5rem' : '1.25rem',
        border: isMobileDrawer ? 'none' : '1px solid #e7e2dc',
        boxShadow: isMobileDrawer ? 'none' : '0 2px 10px rgba(0,0,0,0.03)'
      }}
    >
      {/* 1. Header with Reset All */}
      {!isMobileDrawer && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingBottom: '0.85rem', 
          borderBottom: '1.5px solid #10172a',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SlidersHorizontal size={16} color="#c9a227" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10172a', margin: 0, letterSpacing: '0.02em' }}>
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
              fontSize: '0.76rem',
              fontWeight: 700,
              color: '#c9a227',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(201, 162, 39, 0.3)',
              backgroundColor: 'rgba(201, 162, 39, 0.05)',
              transition: 'all 0.15s ease'
            }}
            title="Reset all filters"
          >
            <RotateCcw size={12} />
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
      <div style={{ borderTop: '1px solid #f1ece4', padding: '14px 0' }}>
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
            padding: '2px 0 8px 0',
            cursor: 'pointer',
            textAlign: 'left'
          }}
          aria-expanded={openSections['price']}
        >
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#10172a'
          }}>
            PRICE
          </span>
          {openSections['price'] ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
        </button>

        {openSections['price'] && (
          <div style={{ marginTop: '8px' }}>
            {/* Visual Density Histogram Chart */}
            <div 
              style={{ 
                height: '36px', 
                display: 'flex', 
                alignItems: 'flex-end', 
                gap: '2px', 
                marginBottom: '6px',
                padding: '0 2px'
              }}
              title="Catalog price density distribution"
            >
              {histogramBins.map((bin, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${bin.percentage}%`,
                    backgroundColor: bin.isInRange ? '#10172a' : '#e2e8f0',
                    borderRadius: '2px 2px 0 0',
                    transition: 'all 0.2s ease'
                  }}
                  title={`₹${bin.min.toLocaleString('en-IN')} - ₹${bin.max.toLocaleString('en-IN')}: ${bin.count} items`}
                />
              ))}
            </div>

            {/* Dual Slider Bar with Active Segment Highlight */}
            <div style={{ position: 'relative', height: '22px', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              {/* Background Track */}
              <div 
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '2px'
                }}
              />
              {/* Highlight Active Segment */}
              <div 
                style={{
                  position: 'absolute',
                  left: `${minPercent}%`,
                  width: `${Math.max(0, maxPercent - minPercent)}%`,
                  height: '4px',
                  backgroundColor: '#10172a',
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

            {/* Subtle Step Dots (matching reference) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginBottom: '12px' }}>
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
              ))}
            </div>

            {/* Min to Max Dropdowns / Selectors (Matching Flipkart Reference: [Min v] to [Rs.1500+ v]) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <select
                value={currentMinPrice}
                onChange={(e) => handleMinPriceChange(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#10172a',
                  cursor: 'pointer'
                }}
                aria-label="Minimum price select"
              >
                {minPricePresets.map((opt, i) => (
                  <option key={i} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>to</span>

              <select
                value={currentMaxPrice}
                onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#10172a',
                  cursor: 'pointer'
                }}
                aria-label="Maximum price select"
              >
                {maxPricePresets.map((opt, i) => (
                  <option key={i} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 13. IN STOCK ONLY (Quick Toggle at Bottom) */}
      <div style={{ borderTop: '1px solid #f1ece4', paddingTop: '14px', marginTop: '4px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            backgroundColor: filters.inStockOnly ? 'rgba(201, 162, 39, 0.08)' : '#f8fafc',
            border: filters.inStockOnly ? '1px solid #c9a227' : '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10172a' }}>
            In Stock Only
          </span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onChange({ inStockOnly: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: '#10172a', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* Note: MINIMUM RATING filter is completely removed per user request */}
    </div>
  );
};
