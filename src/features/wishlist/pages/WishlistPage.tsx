import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useCart } from '@/shared/context/CartContext';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { Product } from '@/types';
import { Heart, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  useDocumentTitle('My Wishlist | MUETY Collection');
  const { wishlist, setWishlist, addToCart, setIsDrawerOpen } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const all = productService.getAllProducts();
    const sourceProducts = all.length > 0 ? all : storageService.getProducts();
    const validIdSet = new Set(sourceProducts.map(p => p.id));
    const saved = sourceProducts.filter(p => wishlist.includes(p.id));
    setProducts(saved);
    setLoading(false);

    // If wishlist contains orphaned or deleted product IDs, immediately purge them so badge and page sync
    const staleIds = wishlist.filter(id => !validIdSet.has(id));
    if (staleIds.length > 0) {
      setWishlist(prev => prev.filter(id => validIdSet.has(id)));
    }
  }, [wishlist, setWishlist]);

  const handleAddAllToBag = () => {
    const available = products.filter(p => p.availability !== 'sold_out' && p.stock > 0);
    available.forEach(p => addToCart(p, 1));
    if (available.length > 0) {
      setIsDrawerOpen(true);
    }
  };

  return (
    <div className="wishlist-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Editorial Header */}
      <div style={{
        backgroundColor: '#10182d',
        color: '#ffffff',
        padding: '3.5rem 1.5rem 3rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201, 162, 39, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} color="#c9a227" />
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: '#c9a227',
              textTransform: 'uppercase'
            }}>
              YOUR CURATED EDIT
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 800,
            margin: '0 0 10px',
            color: '#ffffff'
          }}>
            My Saved Collection
          </h1>
          <p style={{
            color: '#cbd5e1',
            fontSize: '1rem',
            margin: 0,
            lineHeight: 1.6
          }}>
            Handcrafted pure Mulberry and Kanchipuram silk sarees reserved for your auspicious celebrations.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2.5rem' }}>
        {/* Controls Bar */}
        {products.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e5e7eb',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10182d' }}>
                Saved Pieces
              </span>
              <span style={{
                backgroundColor: 'rgba(201, 162, 39, 0.15)',
                color: '#854d0e',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {products.length} {products.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            <button
              onClick={handleAddAllToBag}
              className="btn btn-outline btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                borderColor: '#c9a227',
                color: '#10182d'
              }}
            >
              <ShoppingBag size={16} color="#c9a227" />
              <span>Add All Available to Bag</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '5rem 1.5rem',
            maxWidth: '520px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(201, 162, 39, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#c9a227'
            }}>
              <Heart size={34} strokeWidth={1.7} />
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#10182d',
              marginBottom: '0.75rem',
              fontFamily: 'var(--font-heading)'
            }}>
              Your Wishlist is Empty
            </h2>

            <p style={{
              color: '#64748b',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '2rem'
            }}>
              You haven't saved any silk sarees or handlooms yet. Explore our royal archival collection and curate your personal ethnic wardrobe.
            </p>

            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              <Link
                to="/products"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  fontWeight: 700
                }}
              >
                <span>Shop Sarees & Handlooms</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/categories"
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 20px'
                }}
              >
                Browse Categories
              </Link>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {products.length > 0 && (
          <div className="products-grid-3col">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
