import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Category, Product } from '../types';
import { ProductFilterState, filterProducts, DEFAULT_FILTER_STATE } from '../utils/productFilters';
import { ProductFilterPanel } from './ProductFilterPanel';
import { X, RotateCcw, Check, SlidersHorizontal } from 'lucide-react';

interface ProductFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: ProductFilterState;
  onApply: (draftFilters: ProductFilterState) => void;
  allProducts: Product[];
  categories: Category[];
  categoryCounts: Record<string, number>;
  priceBounds: { min: number; max: number };
}

export const ProductFilterDrawer: React.FC<ProductFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApply,
  allProducts,
  categories,
  categoryCounts,
  priceBounds
}) => {
  // Local draft state that user can tweak without mutating parent filters until "Apply" is tapped
  const [draftFilters, setDraftFilters] = useState<ProductFilterState>(appliedFilters);

  // Synchronize draft filters whenever the drawer opens
  useEffect(() => {
    if (isOpen) {
      setDraftFilters(appliedFilters);
    }
  }, [isOpen, appliedFilters]);

  // Lock body scroll and handle Escape key while drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate live matching product count under draft filters
  const draftMatchingCount = filterProducts(allProducts, draftFilters).length;

  const handleDraftChange = (partial: Partial<ProductFilterState>) => {
    setDraftFilters(prev => ({ ...prev, ...partial }));
  };

  const handleDraftReset = () => {
    setDraftFilters({
      ...DEFAULT_FILTER_STATE,
      // Preserve specialized search or collection if intended
      search: draftFilters.search
    });
  };

  const handleApplyClick = () => {
    onApply(draftFilters);
    onClose();
  };

  const drawerContent = (
    <div
      className="muety-filter-drawer-overlay animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        transition: 'opacity 0.25s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter Products"
        className="muety-filter-drawer-sheet"
        style={{
          backgroundColor: '#faf8f3',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
          borderTop: '1.5px solid rgba(201, 162, 39, 0.4)',
          overflow: 'hidden',
          animation: 'slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderBottom: '1px solid #e7e2dc',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={18} color="#c9a227" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10172a', margin: 0 }}>
              Filters
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleDraftReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer',
                padding: '6px 8px'
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close filter drawer"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#10172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
                minWidth: '36px',
                minHeight: '36px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Drawer Body */}
        <div style={{
          padding: '1.25rem 1.25rem 2rem',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch'
        }}>
          <ProductFilterPanel
            filters={draftFilters}
            onChange={handleDraftChange}
            onReset={handleDraftReset}
            categories={categories}
            categoryCounts={categoryCounts}
            priceBounds={priceBounds}
            isMobileDrawer={true}
          />
        </div>

        {/* Sticky Action Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #e7e2dc',
          backgroundColor: '#ffffff',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)'
        }}>
          <button
            type="button"
            onClick={handleDraftReset}
            style={{
              flex: '0 0 auto',
              padding: '12px 16px',
              borderRadius: '9999px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>

          <button
            type="button"
            onClick={handleApplyClick}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '9999px',
              backgroundColor: '#10172a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.92rem',
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 23, 42, 0.25)',
              border: '1px solid rgba(201, 162, 39, 0.35)'
            }}
          >
            <Check size={16} color="#c9a227" />
            <span>Apply Filters ({draftMatchingCount})</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
};
