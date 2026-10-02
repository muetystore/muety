import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { QuickViewModal } from '@/features/catalog/components/QuickViewModal';
import { Product, Category } from '@/types';
import { ChevronRight, Sparkles } from 'lucide-react';

export const CategoryProductsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (slug) {
      const categories = productService.getCategories();
      const foundCat = categories.find(c => (c.slug || '').toLowerCase() === (slug || '').toLowerCase());
      setCategory(foundCat || null);

      const updateItems = () => {
        const items = productService.getProductsByCategory(slug);
        setProducts(items);
      };

      updateItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const unsubscribe = productService.subscribeToProducts(() => {
        updateItems();
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [slug]);

  useDocumentTitle(category?.name || 'Category');

  if (!category) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2>Category Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
          The requested category does not exist.
        </p>
        <Link to="/categories" className="btn btn-primary">Browse All Categories</Link>
      </div>
    );
  }

  return (
    <div className="category-products-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{
        position: 'relative',
        minHeight: '320px',
        display: 'flex',
        alignItems: 'center',
        color: '#ffffff',
        overflow: 'hidden'
      }}>
        <img 
          src={category.image} 
          alt={category.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.6) 100%)'
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, padding: '3rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            <Link to="/" style={{ color: '#cbd5e1' }}>Home</Link>
            <ChevronRight size={14} />
            <Link to="/categories" style={{ color: '#cbd5e1' }}>Categories</Link>
            <ChevronRight size={14} />
            <span style={{ color: '#d4af37', fontWeight: 600 }}>{category.name}</span>
          </div>

          <h1 style={{ color: '#ffffff', fontSize: '2.8rem', marginBottom: '0.75rem' }}>
            {category.name}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.05rem', maxWidth: '600px', lineHeight: 1.6 }}>
            {category.description}
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--brand-border)'
        }}>
          <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{products.length}</strong> creations in {category.name}
          </span>
          <Link to="/products" className="btn btn-outline btn-sm">
            Explore All Collections
          </Link>
        </div>

        {products.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--brand-border)'
          }}>
            <Sparkles size={40} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
            <h3>No items currently active in this collection.</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              Check back shortly for new seasonal releases.
            </p>
            <Link to="/products" className="btn btn-primary btn-sm">Browse Other Collections</Link>
          </div>
        ) : (
          <div className="products-grid-3col">
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
