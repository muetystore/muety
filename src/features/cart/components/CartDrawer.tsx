import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/shared/context/CartContext';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { 
    items, 
    removeFromCart, 
    updateQuantity, 
    subtotal, 
    cartCount, 
    isDrawerOpen, 
    setIsDrawerOpen 
  } = useCart();
  const navigate = useNavigate();

  if (!isDrawerOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.25s ease'
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--brand-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--brand-accent)" />
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
              Shopping Bag ({cartCount})
            </h3>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            style={{
              padding: '6px',
              color: 'var(--brand-muted)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {items.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              color: 'var(--brand-muted)',
              padding: '2rem 1rem'
            }}>
              <ShoppingBag size={56} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Your Bag is Empty</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '260px' }}>
                Discover our handcrafted timepieces and luxury collections.
              </p>
              <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/products');
                }}
                className="btn btn-primary btn-sm"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {items.map((item, idx) => (
                <div 
                  key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}-${idx}`}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    paddingBottom: '1.25rem',
                    borderBottom: '1px solid var(--brand-border)'
                  }}
                >
                  <img 
                    src={item.product.images[0]} 
                    alt={item.product.name}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--brand-border)',
                      padding: '4px'
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h5 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                        {item.product.name}
                      </h5>
                      <button 
                        onClick={() => removeFromCart(item.product.id, item.selectedColor, item.selectedSize)}
                        style={{ color: 'var(--brand-muted)', padding: '2px' }}
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {(item.selectedColor || item.selectedSize) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--brand-secondary)', marginTop: '2px' }}>
                        {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                        {item.selectedColor && item.selectedSize && <span> • </span>}
                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.75rem'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid var(--brand-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px 6px',
                        gap: '8px'
                      }}>
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.selectedSize)}
                          style={{ color: 'var(--brand-secondary)', display: 'flex', alignItems: 'center' }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.selectedSize)}
                          style={{ color: 'var(--brand-secondary)', display: 'flex', alignItems: 'center' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-primary)' }}>
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--brand-border)',
            backgroundColor: 'var(--bg-main)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Subtotal</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                ₹{subtotal.toFixed(2)}
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', marginBottom: '1rem' }}>
              Taxes and shipping calculated during checkout. Complimentary delivery available.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/checkout');
                }}
                className="btn btn-accent"
                style={{ width: '100%' }}
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>

              <Link 
                to="/cart"
                onClick={() => setIsDrawerOpen(false)}
                className="btn btn-outline"
                style={{ width: '100%', fontSize: '0.9rem', padding: '0.65rem' }}
              >
                View Bag & Apply Promo Code
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
