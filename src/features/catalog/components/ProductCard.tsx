import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { useCart } from '@/shared/context/CartContext';
import { Heart, ShoppingBag, Eye, Star, Zap } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const { addToCart, toggleWishlist, isInWishlist, setIsDrawerOpen } = useCart();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const isSaved = isInWishlist(product.id);

  const images = Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : ['/saree_model_individual.jpg'];

  const displayImage = isHovered && images.length > 1 
    ? images[1] 
    : images[0];

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addToCart(product, 1);
    setIsDrawerOpen(false);
    navigate('/checkout');
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addToCart(product, 1);
  };

  const discount = product.discountPercentage || (
    product.originalPrice && product.originalPrice > product.price 
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null
  );

  return (
    <div 
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--brand-border)',
        overflow: 'hidden',
        transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
        position: 'relative'
      }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '100%',
        backgroundColor: '#f8fafc',
        overflow: 'hidden'
      }}>
        <Link 
          to={`/products/${product.slug || product.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px'
          }}
        >
          <img 
            src={displayImage} 
            alt={product.name}
            loading="lazy"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="product-card-img"
          />
        </Link>

        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          display: 'flex',
          gap: '4px',
          zIndex: 2
        }}>
          {product.featured ? (
            <span style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '3px 7px',
              borderRadius: '2px',
              textTransform: 'uppercase'
            }}>
              EXCLUSIVE
            </span>
          ) : product.isNewArrival ? (
            <span style={{
              backgroundColor: '#0f172a',
              color: '#facc15',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '3px 7px',
              borderRadius: '2px',
              textTransform: 'uppercase'
            }}>
              NEW
            </span>
          ) : discount ? (
            <span style={{
              backgroundColor: '#b91c1c',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              padding: '3px 7px',
              borderRadius: '2px'
            }}>
              {discount}% OFF
            </span>
          ) : null}

          {product.stock <= 5 && product.stock > 0 && (
            <span style={{
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '3px 6px',
              borderRadius: '2px'
            }}>
              Only {product.stock} Left
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: isSaved ? '#991b1b' : 'rgba(255, 255, 255, 0.9)',
            color: isSaved ? '#ffffff' : '#334155',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transition: 'all 0.2s ease',
            zIndex: 3
          }}
        >
          <Heart size={16} fill={isSaved ? '#ffffff' : 'none'} color={isSaved ? '#ffffff' : '#334155'} />
        </button>

        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            className="product-card-quickview-btn"
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              height: '32px',
              padding: '0 10px',
              borderRadius: '4px',
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 700,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              zIndex: 3,
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateY(0)' : 'translateY(6px)',
              transition: 'all 0.25s ease'
            }}
          >
            <Eye size={13} /> Quick View
          </button>
        )}
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--brand-muted)' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {product.category || 'Luxury Attire'}
          </span>
          {product.rating > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#b45309', fontWeight: 700 }}>
              <Star size={12} fill="#f59e0b" color="#f59e0b" />
              {product.rating.toFixed(1)} {product.reviewCount ? `(${product.reviewCount})` : ''}
            </span>
          )}
        </div>

        <Link 
          to={`/products/${product.slug || product.id}`} 
          style={{ textDecoration: 'none', color: 'var(--brand-primary)' }}
        >
          <h3 style={{ 
            fontSize: '0.92rem', 
            fontWeight: 700, 
            margin: 0, 
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            height: '2.4em'
          }}>
            {product.name}
          </h3>
        </Link>

        {product.fabric && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Fabric: <strong style={{ color: 'var(--brand-primary)' }}>{product.fabric}</strong>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', textDecoration: 'line-through' }}>
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={product.stock === 0}
            className="btn btn-primary btn-sm"
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              opacity: product.stock === 0 ? 0.6 : 1,
              cursor: product.stock === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <ShoppingBag size={14} />
            {product.stock === 0 ? 'Out of Stock' : 'Add to Bag'}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            className="btn btn-outline btn-sm"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              backgroundColor: '#f8fafc',
              borderColor: 'var(--brand-border)',
              color: 'var(--brand-primary)',
              opacity: product.stock === 0 ? 0.6 : 1,
              cursor: product.stock === 0 ? 'not-allowed' : 'pointer'
            }}
            title="Buy Now (Direct Checkout)"
          >
            <Zap size={14} color="#d4af37" /> Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};
