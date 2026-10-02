import React, { useState } from 'react';
import { Product } from '@/types';
import { useCart } from '@/shared/context/CartContext';
import { X, Star, Heart, ShoppingBag, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose }) => {
  const { addToCart, toggleWishlist, isInWishlist, setIsDrawerOpen } = useCart();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity] = useState<number>(1);

  if (!product) return null;

  const isSaved = isInWishlist(product.id);
  const currentColor = selectedColor || (product.colors && product.colors.length > 0 ? product.colors[0] : undefined);
  const currentSize = selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1.2fr',
          gap: '2rem'
        }}
        className="quick-view-grid"
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--brand-border)',
            borderRadius: '50%',
            padding: '8px',
            zIndex: 10,
            color: 'var(--brand-primary)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ padding: '2rem 1rem 2rem 2rem' }}>
          <div 
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              backgroundColor: '#f8fafc',
              height: '380px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <img 
              src={product.images[selectedImage] || product.images[0]} 
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          </div>

          {product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: selectedImage === idx ? '2px solid var(--brand-accent)' : '1px solid var(--brand-border)',
                    padding: '3px',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '2rem 2rem 2rem 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-accent-hover)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {product.category}
          </div>

          <h2 style={{ fontSize: '1.5rem', marginTop: '4px', marginBottom: '8px', color: 'var(--brand-primary)' }}>
            {product.name}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', color: '#f59e0b' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < Math.floor(product.rating) ? '#f59e0b' : 'none'} color="#f59e0b" />
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>
              {product.rating} ({product.reviewCount} reviews)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
              ₹{product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span style={{ fontSize: '1.1rem', color: 'var(--brand-muted)', textDecoration: 'line-through' }}>
                ₹{product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {product.shortDescription}
          </p>

          {product.colors && product.colors.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'block', marginBottom: '6px' }}>
                Color: <span style={{ fontWeight: 400 }}>{currentColor}</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {product.colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.82rem',
                      border: (currentColor === color) ? '1.5px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                      backgroundColor: (currentColor === color) ? 'var(--brand-primary)' : 'transparent',
                      color: (currentColor === color) ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: 500
                    }}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sizes && product.sizes.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'block', marginBottom: '6px' }}>
                Size: <span style={{ fontWeight: 400 }}>{currentSize}</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {product.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      border: (currentSize === size) ? '1.5px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                      backgroundColor: (currentSize === size) ? 'var(--brand-primary)' : 'transparent',
                      color: (currentSize === size) ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                addToCart(product, quantity, currentColor, currentSize);
                onClose();
              }}
              disabled={product.stock === 0}
              className="btn btn-primary"
              style={{
                flex: 1,
                minWidth: '130px',
                height: '46px',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ShoppingBag size={17} />
              <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Bag'}</span>
            </button>

            <button
              onClick={() => {
                if (product.stock === 0) return;
                addToCart(product, quantity, currentColor, currentSize);
                setIsDrawerOpen(false);
                onClose();
                navigate('/checkout');
              }}
              disabled={product.stock === 0}
              className="btn btn-accent"
              style={{
                flex: 1,
                minWidth: '130px',
                height: '46px',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Zap size={17} fill="currentColor" />
              <span>{product.stock === 0 ? 'Sold Out' : 'Buy Now'}</span>
            </button>

            <button
              onClick={() => toggleWishlist(product.id)}
              className="btn btn-outline"
              style={{
                height: '46px',
                width: '46px',
                padding: 0,
                borderRadius: 'var(--radius-md)',
                color: isSaved ? '#ef4444' : 'var(--brand-primary)',
                borderColor: isSaved ? '#ef4444' : 'var(--brand-border)',
                flexShrink: 0
              }}
              aria-label="Save to Wishlist"
            >
              <Heart size={18} fill={isSaved ? '#ef4444' : 'none'} />
            </button>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link 
              to={`/products/${product.slug || product.id}`}
              onClick={onClose}
              style={{ fontSize: '0.85rem', color: 'var(--brand-accent-hover)', textDecoration: 'underline', fontWeight: 600 }}
            >
              View Full Product Specifications & Reviews &rarr;
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .quick-view-grid {
            grid-template-columns: 1fr !important;
            padding: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};
