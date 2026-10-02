import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { ArrowRight } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  useDocumentTitle('Categories');
  const categories = productService.getCategories();

  return (
    <div className="categories-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '3.5rem 0',
        marginBottom: '3rem'
      }}>
        <div className="container">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
            ATELIER ARCHITECTURE
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '2.5rem', marginTop: '4px', marginBottom: '0.5rem' }}>
            MUETY Product Categories
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '540px' }}>
            Discover our specialized ateliers in horology, leather crafting, bespoke knitwear, and acoustic engineering.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="grid-3" style={{ gap: '2rem' }}>
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                position: 'relative',
                height: '420px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '2rem',
                color: '#ffffff',
                boxShadow: 'var(--shadow-md)',
                transition: 'transform var(--transition-normal)'
              }}
              className="cat-card"
            >
              <img 
                src={cat.image} 
                alt={cat.name}
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
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.4) 60%, transparent 100%)'
              }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#d4af37', textTransform: 'uppercase' }}>
                  {cat.itemCount} PIECES AVAILABLE
                </span>
                <h3 style={{ color: '#ffffff', fontSize: '1.6rem', marginTop: '4px', marginBottom: '8px' }}>
                  {cat.name}
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {cat.description}
                </p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  Browse Collection <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .cat-card:hover {
          transform: translateY(-6px);
        }
        .cat-card:hover .cat-img {
          transform: scale(1.06);
        }
        @media (max-width: 768px) {
          .cat-card {
            height: 270px !important;
            padding: 1.25rem !important;
          }
          .cat-card h3 {
            font-size: 1.25rem !important;
          }
          .cat-card p {
            font-size: 0.8rem !important;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin-bottom: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
};
