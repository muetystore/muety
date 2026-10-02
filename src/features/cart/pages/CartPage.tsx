import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useCart } from '@/shared/context/CartContext';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Tag, 
  ShieldCheck, 
  Truck, 
  X,
  ArrowLeft
} from 'lucide-react';
import { storageService } from '@/lib/storage/storageService';

export const CartPage: React.FC = () => {
  useDocumentTitle('Cart');
  const navigate = useNavigate();
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    subtotal, 
    appliedCoupon, 
    discountAmount, 
    applyCoupon, 
    removeCoupon, 
    shippingFee, 
    taxAmount, 
    grandTotal 
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const settings = storageService.getSettings();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError('');
    const result = applyCoupon(couponCode);
    if (!result.success) {
      setCouponError(result.message);
    } else {
      setCouponCode('');
    }
  };

  const amountToFreeShipping = Math.max(0, settings.freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / settings.freeShippingThreshold) * 100);

  if (items.length === 0) {
    return (
      <div className="container animate-fade-in" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '480px',
          margin: '0 auto',
          padding: '3rem 2rem',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--brand-border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'var(--brand-muted)'
          }}>
            <ShoppingBag size={38} strokeWidth={1.5} />
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Your Shopping Bag is Empty</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Explore our curated collections of precision timepieces, Tuscan leather, and cashmere essentials.
          </p>

          <Link to="/products" className="btn btn-primary" style={{ width: '100%' }}>
            Explore MUETY Repertory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--brand-border)', padding: '2rem 0' }}>
        <div className="container">
          <h1 style={{ fontSize: '2.2rem', color: 'var(--brand-primary)' }}>Your Shopping Bag</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            Review your selected MUETY pieces before secure checkout.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2.5rem' }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--brand-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2.5rem',
          boxShadow: 'var(--shadow-xs)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              <Truck size={18} color="var(--brand-accent)" />
              {amountToFreeShipping === 0 ? (
                <span style={{ color: '#10b981' }}>You have unlocked Complimentary Express Shipping!</span>
              ) : (
                <span>Add <strong>₹{amountToFreeShipping.toFixed(2)}</strong> more for <strong>Complimentary Worldwide Express</strong></span>
              )}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--brand-muted)', fontWeight: 600 }}>
              Threshold: ₹{settings.freeShippingThreshold}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${freeShippingProgress}%`,
              height: '100%',
              backgroundColor: amountToFreeShipping === 0 ? '#10b981' : 'var(--brand-accent)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '3rem',
          alignItems: 'start'
        }} className="cart-layout-grid">
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--brand-border)'
            }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-secondary)' }}>
                {items.length} CREATION{items.length > 1 ? 'S' : ''} IN BAG
              </span>
              <button 
                onClick={clearCart} 
                style={{ fontSize: '0.85rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Entire Bag
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {items.map((item, idx) => (
                <div 
                  key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}-${idx}`}
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    padding: '1.5rem',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--brand-border)',
                    boxShadow: 'var(--shadow-xs)'
                  }}
                  className="cart-item-card"
                >
                  <Link to={`/products/${item.product.slug || item.product.id}`}>
                    <img 
                      src={item.product.images[0]} 
                      alt={item.product.name}
                      style={{
                        width: '110px',
                        height: '110px',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--brand-border)',
                        padding: '6px'
                      }}
                    />
                  </Link>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--brand-accent-hover)', fontWeight: 700, textTransform: 'uppercase' }}>
                          {item.product.category}
                        </span>
                        <Link to={`/products/${item.product.slug || item.product.id}`}>
                          <h3 style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginTop: '2px', fontWeight: 600 }}>
                            {item.product.name}
                          </h3>
                        </Link>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.product.id, item.selectedColor, item.selectedSize)}
                        style={{ color: 'var(--brand-muted)', padding: '4px' }}
                        title="Remove from Bag"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {(item.selectedColor || item.selectedSize) && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {item.selectedColor && <span>Tone: <strong>{item.selectedColor}</strong></span>}
                        {item.selectedColor && item.selectedSize && <span> • </span>}
                        {item.selectedSize && <span>Size: <strong>{item.selectedSize}</strong></span>}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: '1rem'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1.5px solid var(--brand-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        gap: '12px',
                        backgroundColor: '#ffffff'
                      }}>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.selectedSize)}
                          style={{ color: 'var(--brand-secondary)' }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.selectedSize)}
                          style={{ color: 'var(--brand-secondary)' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
                          ₹{(item.product.price * item.quantity).toFixed(2)}
                        </div>
                        {item.quantity > 1 && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>
                            (₹{item.product.price.toFixed(2)} each)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem' }}>
              <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                <ArrowLeft size={16} /> Continue Exploring MUETY Repertory
              </Link>
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--brand-border)',
            padding: '2rem',
            boxShadow: 'var(--shadow-md)',
            position: 'sticky',
            top: '100px'
          }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '1rem' }}>
              Order Summary
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'block', marginBottom: '6px' }}>
                Atelier Promo Code
              </label>

              {appliedCoupon ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--brand-accent-light)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} color="var(--brand-accent-hover)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#997819' }}>
                        {appliedCoupon.code}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% Off` : `₹${appliedCoupon.discountValue} Off`}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={removeCoupon} 
                    style={{ color: '#997819', padding: '4px' }}
                    title="Remove coupon"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. MUETY15"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{ textTransform: 'uppercase', fontSize: '0.9rem' }}
                  />
                  <button type="submit" className="btn btn-outline" style={{ padding: '0.6rem 1.2rem' }}>
                    Apply
                  </button>
                </form>
              )}

              {couponError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '6px' }}>
                  {couponError}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{subtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span style={{ fontWeight: 700 }}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Estimated Express Shipping</span>
                <span style={{ fontWeight: 600, color: shippingFee === 0 ? '#10b981' : 'var(--brand-primary)' }}>
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Estimated Tax ({settings.taxRate}%)</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{taxAmount.toFixed(2)}</span>
              </div>

              <div style={{
                borderTop: '2px solid var(--brand-border)',
                paddingTop: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline'
              }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>Grand Total</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)' }}>
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-accent btn-lg"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              Proceed to Secure Checkout <ArrowRight size={18} />
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--brand-muted)'
            }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>256-Bit Encrypted MUETY Checkout Vault</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .cart-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
