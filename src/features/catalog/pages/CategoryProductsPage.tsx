import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { QuickViewModal } from '@/features/catalog/components/QuickViewModal';
import { Product, Category } from '@/types';
import { ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';

export const CategoryProductsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [categories, setCategories] = useState<Category[]>(() => storageService.getCategories());
  const [allProducts, setAllProducts] = useState<Product[]>(() => storageService.getProducts());
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    const unsubCats = productService.subscribeToCategories((cats) => {
      setCategories(cats || []);
    });
    const unsubProds = productService.subscribeToProducts((prods) => {
      setAllProducts(prods || []);
    });

    return () => {
      if (typeof unsubCats === 'function') unsubCats();
      if (typeof unsubProds === 'function') unsubProds();
    };
  }, []);

  const category = categories.find(c => 
    (c.slug || '').toLowerCase() === (slug || '').toLowerCase() || 
    c.id === slug
  );

  const products = allProducts.filter(p => {
    if (!category && !slug) return false;
    const targetSlug = (category?.slug || slug || '').toLowerCase();
    const targetId = category?.id || slug || '';
    return (
      (p.categorySlug || '').toLowerCase() === targetSlug ||
      (p.category || '').toLowerCase() === (category?.name || '').toLowerCase() ||
      (p.categoryIds || []).includes(targetId)
    );
  });

  useDocumentTitle(category?.name || 'Category');

  if (!category && categories.length > 0) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--brand-primary)' }}>Category Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
          The requested collection category does not exist or has been relocated.
        </p>
        <Link to="/categories" className="btn btn-primary">Browse All Categories</Link>
      </div>
    );
  }

  const categoryImage = category?.image || (
    slug === 'bridal' ? '/saree_model_drape.jpg' :
    slug === 'handloom' ? '/saree_fabric_detail.jpg' :
    '/saree_model_individual.jpg'
  );

  return (
    <div className="category-products-page animate-fade-in" style={{ paddingBottom: '6rem', width: '100%', maxWidth: '100%' }}>
      {/* Category Hero Banner */}
      <div 
        style={{
          position: 'relative',
          minHeight: 'clamp(280px, 40vh, 380px)',
          display: 'flex',
          alignItems: 'center',
          color: '#ffffff',
          overflow: 'hidden',
          backgroundColor: '#10172a'
        }}
      >
        <img 
          src={categoryImage} 
          alt={category?.name || 'Category'}
          fetchPriority="high"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.45
          }}
        />
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(16, 23, 42, 0.94) 0%, rgba(16, 23, 42, 0.65) 100%)'
          }} 
        />

        <div className="container" style={{ position: 'relative', zIndex: 2, padding: 'clamp(2rem, 5vw, 3.5rem) 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            <Link to="/" style={{ color: '#cbd5e1' }}>Home</Link>
            <ChevronRight size={14} />
            <Link to="/categories" style={{ color: '#cbd5e1' }}>Categories</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>{category?.name || 'Collection'}</span>
          </div>

          <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-accent)', textTransform: 'uppercase' }}>
            ATELIER WEAVE REPERTORY
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4.5vw, 3rem)', marginTop: '4px', marginBottom: '0.75rem', fontWeight: 800 }}>
            {category?.name || 'Handloom Collection'}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)', maxWidth: '620px', lineHeight: 1.6 }}>
            {category?.description || 'Authentic pure silk handlooms meticulously woven by master Salem artisans.'}
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2.5rem' }}>
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--brand-border)',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{products.length}</strong> masterworks in <strong>{category?.name || 'Collection'}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/categories" className="btn btn-outline btn-sm">
              <ArrowLeft size={14} /> All Categories
            </Link>
            <Link to="/products" className="btn btn-primary btn-sm">
              Complete Catalog
            </Link>
          </div>
        </div>

        {products.length === 0 ? (
          <div 
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--brand-border)'
            }}
          >
            <Sparkles size={40} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
            <h3>No creations currently active in this category.</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              Our Salem weavers are completing new drapes on the pit-looms. Please check back shortly or explore our full repertory.
            </p>
            <Link to="/products" className="btn btn-primary btn-sm">Browse Other Collections</Link>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(p => (
              <ProductCard 
                key={p.id} 
                product={p} 
                onQuickView={(prod) => setQuickViewProduct(prod)} 
              />
            ))}
          </div>
        )}
      </div>

      <QuickViewModal 
        product={quickViewProduct} 
        onClose={() => setQuickViewProduct(null)} 
      />
    </div>
  );
};
