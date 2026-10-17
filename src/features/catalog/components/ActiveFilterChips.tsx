import React from 'react';
import { Category } from '../types';
import { ProductFilterState } from '../utils/productFilters';
import { X, RotateCcw } from 'lucide-react';

interface ActiveFilterChipsProps {
  filters: ProductFilterState;
  categories: Category[];
  priceBounds: { min: number; max: number };
  onRemoveFilter: (key: keyof ProductFilterState) => void;
  onResetAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  categories,
  priceBounds,
  onRemoveFilter,
  onResetAll
}) => {
  const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

  // Search Chip
  if (filters.search && filters.search.trim()) {
    chips.push({
      id: 'search',
      label: `Search: "${filters.search}"`,
      onRemove: () => onRemoveFilter('search')
    });
  }

  // Category Chip
  if (filters.category && filters.category !== 'all') {
    const cat = categories.find(c => 
      (c.slug || '').toLowerCase() === filters.category.toLowerCase() ||
      c.id === filters.category
    );
    chips.push({
      id: 'category',
      label: `Category: ${cat?.name || filters.category}`,
      onRemove: () => onRemoveFilter('category')
    });
  }

  // Price Range Chip
  const hasMinPrice = filters.minPrice !== null && filters.minPrice > priceBounds.min;
  const hasMaxPrice = filters.maxPrice !== null && filters.maxPrice < priceBounds.max;

  if (hasMinPrice || hasMaxPrice) {
    const minVal = filters.minPrice !== null ? filters.minPrice : priceBounds.min;
    const maxVal = filters.maxPrice !== null ? filters.maxPrice : priceBounds.max;
    chips.push({
      id: 'price',
      label: `₹${minVal.toLocaleString('en-IN')} - ₹${maxVal.toLocaleString('en-IN')}`,
      onRemove: () => {
        onRemoveFilter('minPrice');
        onRemoveFilter('maxPrice');
      }
    });
  }

  // In Stock Chip
  if (filters.inStockOnly) {
    chips.push({
      id: 'stock',
      label: 'In Stock Only',
      onRemove: () => onRemoveFilter('inStockOnly')
    });
  }

  // Rating Chip
  if (filters.minRating !== null && filters.minRating > 0) {
    chips.push({
      id: 'rating',
      label: `${filters.minRating}★ & above`,
      onRemove: () => onRemoveFilter('minRating')
    });
  }

  // Occasion Chip
  if (filters.occasion) {
    chips.push({
      id: 'occasion',
      label: `Occasion: ${filters.occasion}`,
      onRemove: () => onRemoveFilter('occasion')
    });
  }

  // Fabric Chip
  if (filters.fabric) {
    chips.push({
      id: 'fabric',
      label: `Fabric: ${filters.fabric}`,
      onRemove: () => onRemoveFilter('fabric')
    });
  }

  // Style Chip
  if (filters.style) {
    chips.push({
      id: 'style',
      label: `Style: ${filters.style}`,
      onRemove: () => onRemoveFilter('style')
    });
  }

  // Tag Chip
  if (filters.tag) {
    chips.push({
      id: 'tag',
      label: `Tag: ${filters.tag}`,
      onRemove: () => onRemoveFilter('tag')
    });
  }

  // Collection Chip
  if (filters.collection) {
    chips.push({
      id: 'collection',
      label: `Collection: ${filters.collection}`,
      onRemove: () => onRemoveFilter('collection')
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div 
      className="muety-active-filters-bar animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '1.25rem',
        padding: '8px 0'
      }}
    >
      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
        Active Filters:
      </span>

      {chips.map(chip => (
        <span
          key={chip.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: '#ffffff',
            border: '1px solid #c9a227',
            color: '#10172a',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter: ${chip.label}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              cursor: 'pointer',
              border: 'none',
              padding: 0
            }}
          >
            <X size={10} />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onResetAll}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.78rem',
          color: '#991b1b',
          fontWeight: 700,
          cursor: 'pointer',
          padding: '4px 8px',
          marginLeft: '4px'
        }}
      >
        <RotateCcw size={11} />
        <span>Clear All</span>
      </button>
    </div>
  );
};
