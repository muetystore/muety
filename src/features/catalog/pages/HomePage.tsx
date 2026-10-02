import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { QuickViewModal } from '@/features/catalog/components/QuickViewModal';
import { Product } from '@/types';

export const HomePage: React.FC = () => {
  useDocumentTitle('Home');

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>(() => storageService.getProducts());

  React.useEffect(() => {
    const unsubscribe = productService.subscribeToProducts((all) => {
      setAllProducts(all);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return (
    <div className="home-page animate-fade-in" style={{ position: 'relative', overflowX: 'hidden' }}>
      <section className="hero-16-9-section" style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#070a12',
        overflow: 'hidden'
      }}>
        <Link 
          to="/products"
          style={{
            display: 'block',
            width: '100%',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer'
          }}
          title="MUETY Silk Sarees Collection"
        >
          <img 
            src="/diwali_hero_banner.jpg" 
            alt="MUETY Diwali Festive Silk Sarees Collection" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              display: 'block'
            }}
          />
        </Link>
      </section>

      <section className="section-padding" style={{ backgroundColor: 'var(--bg-main)', paddingTop: '1.5rem' }}>
        <div className="container">
          <div className="products-grid">
            {allProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onQuickView={(p) => setQuickViewProduct(p)} 
              />
            ))}
          </div>
        </div>
      </section>

      <a
        href="https://wa.me/919385791540?text=Hello%20MUETY,%20I%20would%20like%20to%20know%20more%20about%20your%20saree%20collection."
        target="_blank"
        rel="noreferrer"
        className="floating-whatsapp-btn"
        style={{
          position: 'fixed',
          bottom: '72px',
          right: '16px',
          zIndex: 1400,
          backgroundColor: '#25D366',
          color: '#ffffff',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(37, 211, 102, 0.45)',
          border: '2px solid #ffffff',
          transition: 'transform 0.2s ease'
        }}
        aria-label="WhatsApp Concierge"
        title="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" strokeWidth="2" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      <QuickViewModal 
        product={quickViewProduct} 
        onClose={() => setQuickViewProduct(null)} 
      />

      <style>{`
        .hero-16-9-section {
          width: 100%;
          background-color: #070a12;
          overflow: hidden;
        }
        .floating-whatsapp-btn:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};
