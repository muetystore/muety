import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { SortOption, SORT_LABELS } from '../utils/productFilters';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
  compact?: boolean;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const options: SortOption[] = [
    'featured',
    'newest',
    'price-low',
    'price-high',
    'rating'
  ];

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.indexOf(value);
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(options[nextIndex]);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.indexOf(value);
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex]);
      }
    }
  };

  const handleSelect = (opt: SortOption) => {
    onChange(opt);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div 
      ref={containerRef} 
      className={`muety-sort-dropdown-container ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Sort by: ${SORT_LABELS[value] || 'Featured Picks'}`}
        className="muety-sort-trigger"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '8px',
          padding: compact ? '6px 10px' : '8px 14px',
          backgroundColor: '#ffffff',
          border: isOpen ? '1.5px solid #c9a227' : '1px solid #e2e8f0',
          borderRadius: '8px',
          color: '#10172a',
          fontSize: compact ? '0.8rem' : '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isOpen ? '0 0 0 3px rgba(201, 162, 39, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ color: '#64748b', fontSize: compact ? '0.74rem' : '0.8rem', fontWeight: 500 }}>
          Sort:
        </span>
        <span style={{ fontWeight: 600, color: '#10172a' }}>
          {SORT_LABELS[value] || 'Featured Picks'}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            color: '#64748b', 
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
          }} 
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Sort options"
          className="muety-sort-menu animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 150,
            minWidth: '200px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '6px',
            margin: 0,
            listStyle: 'none',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)'
          }}
        >
          {options.map((option) => {
            const isSelected = value === option;
            return (
              <li
                key={option}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#10172a' : '#334155',
                  backgroundColor: isSelected ? 'rgba(201, 162, 39, 0.09)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>{SORT_LABELS[option]}</span>
                {isSelected && (
                  <Check size={14} color="#c9a227" strokeWidth={2.5} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
