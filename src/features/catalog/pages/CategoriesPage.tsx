import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { Category, Product } from '@/types';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  useDocumentTitle('Categories');

  const [categories, setCategories] = useState<Category[]>(() => storageService.getCategories());
  const [allProducts, setAllProducts] = useState<Product[]>(() => storageService.getProducts());
  const [isLoading, setIsLoading] = useState<boolean>(() => storageService.getCategories().length === 0);

  useEffect(() => {
    const unsubCats = productService.subscribeToCategories((cats) => {
      setCategories(cats || []);
      setIsLoading(false);
    });

    const unsubProds = productService.subscribeToProducts((prods) => {
      setAllProducts(prods || []);
    });

    return () => {
      if (typeof unsubCats === 'function') unsubCats();
      if (typeof unsubProds === 'function') unsubProds();
    };
  }, []);

  const getCategoryCount = (slug: string, id: string) => {
    return allProducts.filter(p => 
      (p.categorySlug || '').toLowerCase() === (slug || '').toLowerCase() ||
      (p.category || '').toLowerCase() === (slug || '').toLowerCase() ||
      (p.categoryIds || []).includes(id)
    ).length;
  };

  return (
    <div className="categories-page animate-fade-in" style={{ paddingBottom: '6rem', width: '100%', maxWidth: '100%' }}>
      {/* Editorial Category Header */}
      <div 
        style={{
          backgroundColor: '#10172a',
          color: '#ffffff',
          padding: 'clamp(2.5rem, 5vw, 4rem) 0',
          marginBottom: '2.5rem'
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            <Link to="/" style={{ color: '#cbd5e1' }}>Home</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>Categories</span>
          </div>

          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-accent)', textTransform: 'uppercase' }}>
            THE WEAVING REPERTORY
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.8rem)', marginTop: '4px', marginBottom: '0.5rem', fontWeight: 800 }}>
            Curated Handloom Categories
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)', maxWidth: '580px', lineHeight: 1.6 }}>
            Explore masterwork silk sarees organized by weaving technique, border artistry, and auspicious ceremonies.
          </p>
        </div>
      </div>

      <div className="container">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div className="animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--brand-muted)' }}>Loading categories from atelier database...</p>
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
            <Sparkles size={36} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
            <h3>Categories are being prepared for launch.</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              Our Muety atelier is updating collection classifications.
            </p>
            <Link to="/products" className="btn btn-primary btn-sm">Explore All Products</Link>
          </div>
        ) : (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.75rem'
            }}
          >
            {categories.map(cat => {
              const count = getCategoryCount(cat.slug, cat.id);
              const fallbackImg = cat.image || (
                cat.slug === 'bridal' ? '/saree_model_drape.jpg' :
                cat.slug === 'handloom' ? '/saree_fabric_detail.jpg' :
                '/saree_model_individual.jpg'
              );

              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug || cat.id}`}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: '380px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '1.75rem',
                    color: '#ffffff',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    textDecoration: 'none'
                  }}
                  className="cat-card"
                >
                  <img 
                    src={fallbackImg} 
                    alt={cat.name}
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    className="cat-img"
                  />
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(16, 23, 42, 0.95) 0%, rgba(16, 23, 42, 0.45) 60%, transparent 100%)'
                    }} 
                  />

                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        letterSpacing: '0.1em', 
                        color: '#facc15', 
                        textTransform: 'uppercase' 
                      }}
                    >
                      {count > 0 ? `${count} PIECES AVAILABLE` : 'MASTERWORK WEAVES'}
                    </span>
                    <h2 style={{ color: '#ffffff', fontSize: '1.45rem', marginTop: '4px', marginBottom: '6px', fontWeight: 700 }}>
                      {cat.name}
                    </h2>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      {cat.description || 'Pure handloom silk sarees crafted by generational weavers.'}
                    </p>
                    <span 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        color: 'var(--brand-accent)' 
                      }}
                    >
                      <span>Explore Collection</span>
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .cat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
        }
        .cat-card:hover .cat-img {
          transform: scale(1.05);
        }
        @media (max-width: 640px) {
          .cat-card {
            min-height: 280px !important;
            padding: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
};
