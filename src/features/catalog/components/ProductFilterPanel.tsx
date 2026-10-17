import React from 'react';
import { Category } from '../types';
import { ProductFilterState } from '../utils/productFilters';
import { RotateCcw, Star, Check } from 'lucide-react';

interface ProductFilterPanelProps {
  filters: ProductFilterState;
  onChange: (updated: Partial<ProductFilterState>) => void;
  onReset: () => void;
  categories: Category[];
  categoryCounts: Record<string, number>;
  priceBounds: { min: number; max: number };
  isMobileDrawer?: boolean;
}

export const ProductFilterPanel: React.FC<ProductFilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  categories,
  categoryCounts,
  priceBounds,
  isMobileDrawer = false
}) => {
  const currentMinPrice = filters.minPrice !== null ? filters.minPrice : priceBounds.min;
  const currentMaxPrice = filters.maxPrice !== null ? filters.maxPrice : priceBounds.max;

  const handleMinPriceChange = (val: number) => {
    const clamped = Math.max(priceBounds.min, Math.min(val, currentMaxPrice));
    onChange({ minPrice: clamped });
  };

  const handleMaxPriceChange = (val: number) => {
    const clamped = Math.min(priceBounds.max, Math.max(val, currentMinPrice));
    onChange({ maxPrice: clamped });
  };

  const ratingOptions = [
    { label: 'All Ratings', value: null },
    { label: '4★ & above', value: 4 },
    { label: '3★ & above', value: 3 },
    { label: '2★ & above', value: 2 }
  ];

  return (
    <div className="muety-filter-panel-inner" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header if not inside mobile drawer (mobile drawer has its own drawer header) */}
      {!isMobileDrawer && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e7e2dc' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10172a', margin: 0 }}>
            Filters
          </h3>
          <button
            type="button"
            onClick={onReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#c9a227',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              transition: 'background-color 0.15s ease'
            }}
            title="Reset all filters"
          >
            <RotateCcw size={12} />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* 1. Categories Section */}
      <div>
        <h4 style={{
          fontSize: '0.76rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b',
          marginBottom: '0.75rem'
        }}>
          Categories
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* All Categories Option */}
          <button
            type="button"
            onClick={() => onChange({ category: 'all' })}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: filters.category === 'all' ? '#10172a' : 'transparent',
              color: filters.category === 'all' ? '#ffffff' : '#334155',
              fontWeight: filters.category === 'all' ? 700 : 500,
              fontSize: '0.86rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%'
            }}
          >
            <span>All Categories</span>
            <span style={{
              fontSize: '0.74rem',
              opacity: filters.category === 'all' ? 0.9 : 0.65,
              fontWeight: 600,
              backgroundColor: filters.category === 'all' ? 'rgba(201, 162, 39, 0.3)' : '#f1f5f9',
              padding: '1px 7px',
              borderRadius: '9999px',
              color: filters.category === 'all' ? '#ffffff' : '#475569'
            }}>
              {categoryCounts['all'] ?? 0}
            </span>
          </button>

          {/* Each Category */}
          {categories.map((cat) => {
            const isSelected = filters.category.toLowerCase() === (cat.slug || '').toLowerCase();
            const count = categoryCounts[(cat.slug || '').toLowerCase()] ?? 0;
            return (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => onChange({ category: cat.slug })}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#10172a' : 'transparent',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.86rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  width: '100%'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                  {cat.name}
                </span>
                <span style={{
                  fontSize: '0.74rem',
                  opacity: isSelected ? 0.9 : 0.65,
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
      </div>

      {/* 2. Price Range Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <h4 style={{
            fontSize: '0.76rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#64748b',
            margin: 0
          }}>
            Price Range
          </h4>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10172a' }}>
            ₹{currentMinPrice.toLocaleString('en-IN')} - ₹{currentMaxPrice.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Max Price Range Slider */}
        <div style={{ marginBottom: '0.85rem' }}>
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            step={100}
            value={currentMaxPrice}
            onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#10172a', cursor: 'pointer' }}
            aria-label="Filter products by maximum price"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
            <span>₹{priceBounds.min.toLocaleString('en-IN')}</span>
            <span>₹{priceBounds.max.toLocaleString('en-IN')}+</span>
          </div>
        </div>

        {/* Numeric Min / Max Inputs for precision */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '3px' }}>
              Min (₹)
            </label>
            <input
              type="number"
              min={priceBounds.min}
              max={currentMaxPrice}
              step={50}
              value={currentMinPrice}
              onChange={(e) => handleMinPriceChange(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.82rem',
                color: '#10172a',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '3px' }}>
              Max (₹)
            </label>
            <input
              type="number"
              min={currentMinPrice}
              max={priceBounds.max}
              step={50}
              value={currentMaxPrice}
              onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.82rem',
                color: '#10172a',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Availability Filter (In Stock Only) */}
      <div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10172a' }}>
            In Stock Only
          </span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onChange({ inStockOnly: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: '#10172a', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* 4. Minimum Rating Filter */}
      <div>
        <h4 style={{
          fontSize: '0.76rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b',
          marginBottom: '0.65rem'
        }}>
          Minimum Rating
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {ratingOptions.map((opt) => {
            const isSelected = filters.minRating === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange({ minRating: opt.value })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: isSelected ? '1.5px solid #10172a' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#10172a' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {opt.value !== null && <Star size={12} fill="#f59e0b" color="#f59e0b" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
