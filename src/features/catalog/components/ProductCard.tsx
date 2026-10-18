import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { useCart } from '@/shared/context/CartContext';
import { useAuth } from '@/shared/context/AuthContext';
import { Heart, ShoppingBag, Eye, Star, Zap, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const { addToCart, toggleWishlist, isInWishlist, setIsDrawerOpen } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const isSaved = isInWishlist(product.id);

  const images = Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : ['/saree_model_individual.jpg'];

  const displayImage = isHovered && images.length > 1 
    ? images[1] 
    : images[0];

  const isSoldOut = product.availability === 'sold_out' || product.stock === 0;
  const isManualSoldOut = product.availability === 'sold_out';

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) return;
    addToCart(product, 1);
    setIsDrawerOpen(false);
    if (!isAuthenticated) {
      openAuthModal({ redirectPath: '/checkout', reason: 'buy_now' });
      return;
    }
    navigate('/checkout');
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) return;
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  // Discount calculation following strict specification:
  // Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
  const discount = (product.originalPrice && product.originalPrice > product.price && product.originalPrice > 0)
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : (product.discountPercentage || null);

  return (
    <div 
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md, 10px)',
        border: '1px solid var(--brand-border)',
        overflow: 'hidden',
        transition: 'transform var(--transition-normal, 0.25s), box-shadow var(--transition-normal, 0.25s)',
        position: 'relative'
      }}
    >
      {/* Compact Saree Portrait Image Container (Reduced height) */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '108%',
        backgroundColor: 'var(--bg-alabaster, #f8f6f0)',
        overflow: 'hidden'
      }}>
        <Link 
          to={`/products/${product.slug || product.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label={`View details for ${product.name}`}
        >
          <img 
            src={displayImage} 
            alt={product.name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="product-card-img"
          />
        </Link>

        {/* Top-Left Badges: Discount Pill / New / Sold Out */}
        <div style={{
          position: 'absolute',
          top: '7px',
          left: '7px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          zIndex: 2
        }}>
          {isManualSoldOut ? (
            <span style={{
              backgroundColor: '#991b1b',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              SOLD OUT
            </span>
          ) : discount && discount > 0 ? (
            <span style={{
              backgroundColor: '#b91c1c',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              padding: '2px 5px',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(185, 28, 28, 0.3)'
            }}>
              -{discount}%
            </span>
          ) : product.isNewArrival ? (
            <span style={{
              backgroundColor: '#0f172a',
              color: '#facc15',
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '2px 5px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              NEW
            </span>
          ) : product.featured ? (
            <span style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '2px 5px',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              EXCLUSIVE
            </span>
          ) : null}

          {product.stock <= 5 && product.stock > 0 && !isSoldOut && (
            <span style={{
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
              fontSize: '0.58rem',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: '3px'
            }}>
              Only {product.stock} Left
            </span>
          )}
        </div>

        {/* Right Floating Action Cluster: Wishlist & Quick-Add Buttons */}
        <div style={{
          position: 'absolute',
          top: '7px',
          right: '7px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 3
        }}>
          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
            title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: isSaved ? '#b91c1c' : '#ffffff',
              color: isSaved ? '#ffffff' : '#334155',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <Heart size={14} fill={isSaved ? '#ffffff' : 'none'} color={isSaved ? '#ffffff' : '#334155'} />
          </button>

          {/* Quick-Add Bag Button on Image */}
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isSoldOut}
            aria-label={isSoldOut ? 'Sold out' : `Quick add ${product.name} to bag`}
            title={isSoldOut ? 'Sold Out' : 'Quick Add to Bag'}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: justAdded ? '#15803d' : '#ffffff',
              color: justAdded ? '#ffffff' : isSoldOut ? '#94a3b8' : '#0f172a',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSoldOut ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: isSoldOut ? 0.6 : 1
            }}
          >
            {justAdded ? <Check size={14} color="#ffffff" /> : <ShoppingBag size={13} />}
          </button>
        </div>

        {/* Quick View Button on Desktop Hover */}
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
              bottom: '8px',
              left: '50%',
              transform: isHovered ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(8px)',
              height: '28px',
              padding: '0 10px',
              borderRadius: 'var(--radius-full, 9999px)',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(4px)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 700,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              zIndex: 3,
              opacity: isHovered ? 1 : 0,
              transition: 'all 0.25s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Eye size={12} /> Quick View
          </button>
        )}
      </div>

      {/* Card Body - Slim Compact Padding */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: 'var(--brand-muted)' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {product.category || 'Pure Silk Saree'}
          </span>
          {product.rating > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#b45309', fontWeight: 700 }}>
              <Star size={10} fill="#f59e0b" color="#f59e0b" />
              {product.rating.toFixed(1)} {product.reviewCount ? `(${product.reviewCount})` : ''}
            </span>
          )}
        </div>

        {/* Product Title (Compact 2-line clamp) */}
        <Link 
          to={`/products/${product.slug || product.id}`} 
          style={{ textDecoration: 'none', color: 'var(--brand-primary)' }}
        >
          <h3 style={{ 
            fontSize: '0.82rem', 
            fontWeight: 700, 
            margin: 0, 
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '2.2em',
            maxHeight: '2.5em',
            color: 'var(--brand-primary)'
          }}>
            {product.name}
          </h3>
        </Link>

        {product.fabric && (
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
            Fabric: <strong style={{ color: 'var(--brand-primary)' }}>{product.fabric}</strong>
          </div>
        )}

        {/* Price Row: Strikethrough Original + Highlighted Selling Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: 'auto', paddingTop: '2px' }}>
          {product.originalPrice && product.originalPrice > product.price && (
            <span style={{ fontSize: '0.74rem', color: 'var(--brand-muted)', textDecoration: 'line-through' }}>
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </span>
          )}
          <span style={{ 
            fontSize: '0.98rem', 
            fontWeight: 800, 
            color: discount ? 'var(--brand-sale, #b91c1c)' : 'var(--brand-primary)' 
          }}>
            ₹{product.price.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Action Controls - Compact Height */}
        <div className="product-card-actions" style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isSoldOut}
            className="btn btn-primary btn-sm product-card-btn-add"
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '29px',
              opacity: isSoldOut ? 0.6 : 1,
              cursor: isSoldOut ? 'not-allowed' : 'pointer'
            }}
            aria-label={isSoldOut ? 'Item Sold Out' : `Add ${product.name} to bag`}
          >
            <ShoppingBag size={11} />
            <span>{isSoldOut ? 'SOLD OUT' : justAdded ? 'Added!' : 'Add to Bag'}</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isSoldOut}
            className="btn btn-outline btn-sm product-card-btn-buy"
            style={{
              padding: '4px 6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '29px',
              backgroundColor: '#f8fafc',
              borderColor: 'var(--brand-border)',
              color: 'var(--brand-primary)',
              opacity: isSoldOut ? 0.6 : 1,
              cursor: isSoldOut ? 'not-allowed' : 'pointer',
              flexShrink: 0
            }}
            title="Buy Now (Direct Checkout)"
            aria-label={`Buy ${product.name} now`}
          >
            <Zap size={11} color={isSoldOut ? '#94a3b8' : '#d4af37'} />
            <span className="buy-now-text">Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-md, 10px)',
      border: '1px solid var(--brand-border)',
      overflow: 'hidden'
    }}>
      <div style={{
        width: '100%',
        paddingTop: '108%',
        backgroundColor: '#f1f5f9',
        animation: 'pulse 1.5s infinite ease-in-out'
      }} />
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ width: '40%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
        <div style={{ width: '85%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
        <div style={{ width: '50%', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginTop: '4px' }} />
      </div>
    </div>
  );
};
