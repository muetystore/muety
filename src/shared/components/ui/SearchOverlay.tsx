import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X, ArrowRight, Sparkles, Tag } from 'lucide-react';
import { productService } from '@/features/catalog/services/productService';
import { Product } from '@/types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const COMMON_SUGGESTIONS = [
  'saree',
  'silk saree',
  'kanchipuram silk',
  'cotton saree',
  'mysore silk saree',
  'soft silk',
  'banarasi saree',
  'bridal saree',
  'festive edit',
  'pure mulberry silk',
  'temple border handloom',
  'designer saree'
];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, isMobile = false }) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProducts(productService.getAllProducts());
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key & click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!isMobile && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isMobile]);

  // Generate matching suggestions and products
  const { matchingSuggestions, matchingProducts } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        matchingSuggestions: COMMON_SUGGESTIONS.slice(0, 5),
        matchingProducts: products.slice(0, 6)
      };
    }

    // Suggestions matching query
    const dynamicKeywords = new Set<string>();
    
    // Add matching common suggestions
    COMMON_SUGGESTIONS.forEach(s => {
      if (s.toLowerCase().includes(q)) dynamicKeywords.add(s);
    });

    // Extract keywords from matching products
    products.forEach(p => {
      const name = (p.name || '').toLowerCase();
      if (name.includes(q)) {
        dynamicKeywords.add(name);
      }
      if (p.category && p.category.toLowerCase().includes(q)) {
        dynamicKeywords.add(p.category.toLowerCase());
      }
    });

    const suggestionsList = Array.from(dynamicKeywords).slice(0, 6);

    // Products matching query
    const filteredProds = products.filter(p => {
      const n = (p.name || '').toLowerCase();
      const d = (p.description || '').toLowerCase();
      const c = (p.category || '').toLowerCase();
      const s = (p.sku || '').toLowerCase();
      return n.includes(q) || d.includes(q) || c.includes(q) || s.includes(q);
    }).slice(0, 8);

    return {
      matchingSuggestions: suggestionsList,
      matchingProducts: filteredProds
    };
  }, [query, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    navigate(`/products?q=${encodeURIComponent(suggestion)}`);
    onClose();
  };

  // Helper to highlight query inside text
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark 
              key={i} 
              style={{ 
                backgroundColor: '#fef08a', 
                color: '#10182d', 
                padding: '0 1px', 
                borderRadius: '2px',
                fontWeight: 700 
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`search-overlay-root ${isMobile ? 'is-mobile' : 'is-desktop'}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        backgroundColor: isMobile ? 'rgba(16, 24, 45, 0.45)' : 'rgba(16, 24, 45, 0.25)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: isMobile ? 'flex-start' : 'flex-start'
      }}
    >
      <div 
        ref={containerRef}
        className="search-modal-container"
        style={{
          width: isMobile ? '100%' : '520px',
          maxWidth: '100%',
          backgroundColor: '#ffffff',
          borderRadius: isMobile ? '0 0 16px 16px' : '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid #e5e7eb',
          marginTop: isMobile ? 0 : '72px',
          maxHeight: isMobile ? '90vh' : '82vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideDownSearch 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#faf8f3'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#c9a227" />
            <span style={{
              fontSize: '0.92rem',
              fontWeight: 700,
              color: '#10182d',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.02em'
            }}>
              Search Our Site
            </span>
          </div>

          <button 
            type="button"
            onClick={onClose}
            aria-label="Close search"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '50%',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <input 
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by saree type, fabric, or color..."
              style={{
                width: '100%',
                padding: '11px 40px 11px 42px',
                borderRadius: '30px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                color: '#10182d',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#c9a227';
                e.target.style.boxShadow = '0 0 0 3px rgba(201, 162, 39, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
            
            <Search 
              size={18} 
              color="#64748b" 
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }} 
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
                aria-label="Clear query"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        {/* Results Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem' }}>
          {/* Query Label */}
          {query.trim() && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Search for "{query.trim()}"
              </span>
            </div>
          )}

          {/* Suggestions Pills */}
          {matchingSuggestions.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Suggestions
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {matchingSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#10182d',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e2e8f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                  >
                    {renderHighlightedText(sug, query)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Products */}
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {query.trim() ? 'Matching Handlooms' : 'Popular Handloom Saree Edits'}
            </div>

            {matchingProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                No sarees found matching "{query}". Try checking our category directory.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matchingProducts.map((p) => {
                  const hasDiscount = p.originalPrice && p.originalPrice > p.price;
                  const thumbnail = Array.isArray(p.images) && p.images[0] ? p.images[0] : '/saree_model_individual.jpg';

                  return (
                    <Link
                      key={p.id}
                      to={`/products/${p.slug || p.id}`}
                      onClick={onClose}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'background-color 0.15s ease',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#faf8f3';
                        e.currentTarget.style.borderColor = 'rgba(201, 162, 39, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: '54px',
                        height: '72px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: '#f1f5f9'
                      }}>
                        <img 
                          src={thumbnail} 
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: '#10182d',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: '4px'
                        }}>
                          {renderHighlightedText(p.name, query)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                          {hasDiscount && (
                            <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                              Rs. {p.originalPrice?.toLocaleString('en-IN')}
                            </span>
                          )}
                          <span style={{ color: hasDiscount ? '#c62828' : '#10182d', fontWeight: 700 }}>
                            Rs. {p.price?.toLocaleString('en-IN')}
                          </span>
                          {p.availability === 'sold_out' && (
                            <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700 }}>
                              • SOLD OUT
                            </span>
                          )}
                        </div>
                      </div>

                      <ArrowRight size={14} color="#94a3b8" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Link */}
        {query.trim() && (
          <div style={{
            padding: '10px 1.25rem',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#faf8f3',
            textAlign: 'center'
          }}>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#854d0e',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>View all results for "{query.trim()}"</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDownSearch {
          from {
            opacity: 0;
            transform: translateY(-16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
