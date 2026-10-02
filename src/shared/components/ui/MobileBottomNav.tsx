import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '@/shared/context/CartContext';
import { Home, Grid, Heart, ShoppingBag } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { cartCount, wishlist, setIsDrawerOpen } = useCart();
  const location = useLocation();

  return (
    <>
      <nav 
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--brand-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 1500,
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <NavLink
          to="/"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: isActive ? '#0f172a' : '#64748b',
            textDecoration: 'none',
            fontSize: '0.7rem',
            fontWeight: isActive ? 800 : 500,
            letterSpacing: '0.02em',
            gap: '3px',
            position: 'relative'
          })}
        >
          {({ isActive }) => (
            <>
              <Home size={20} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#d4af37' : 'currentColor'} />
              <span>Home</span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: '24px',
                  height: '3px',
                  backgroundColor: '#d4af37',
                  borderRadius: '0 0 4px 4px'
                }} />
              )}
            </>
          )}
        </NavLink>

        <NavLink
          to="/categories"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: isActive ? '#0f172a' : '#64748b',
            textDecoration: 'none',
            fontSize: '0.7rem',
            fontWeight: isActive ? 800 : 500,
            letterSpacing: '0.02em',
            gap: '3px',
            position: 'relative'
          })}
        >
          {({ isActive }) => (
            <>
              <Grid size={20} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#d4af37' : 'currentColor'} />
              <span>Categories</span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: '24px',
                  height: '3px',
                  backgroundColor: '#d4af37',
                  borderRadius: '0 0 4px 4px'
                }} />
              )}
            </>
          )}
        </NavLink>

        <NavLink
          to="/account?tab=wishlist"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: isActive ? '#0f172a' : '#64748b',
            textDecoration: 'none',
            fontSize: '0.7rem',
            fontWeight: isActive ? 800 : 500,
            letterSpacing: '0.02em',
            gap: '3px',
            position: 'relative'
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Heart size={20} strokeWidth={isActive ? 2.5 : 1.8} fill={wishlist.length > 0 ? '#ef4444' : 'none'} color={wishlist.length > 0 ? '#ef4444' : 'currentColor'} />
                {wishlist.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    minWidth: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 2px'
                  }}>
                    {wishlist.length}
                  </span>
                )}
              </div>
              <span>Wishlist</span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: '24px',
                  height: '3px',
                  backgroundColor: '#d4af37',
                  borderRadius: '0 0 4px 4px'
                }} />
              )}
            </>
          )}
        </NavLink>

        <button
          onClick={() => setIsDrawerOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: location.pathname === '/cart' ? '#0f172a' : '#64748b',
            fontSize: '0.7rem',
            fontWeight: location.pathname === '/cart' ? 800 : 500,
            letterSpacing: '0.02em',
            gap: '3px',
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          aria-label="View Shopping Bag"
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <ShoppingBag size={20} strokeWidth={location.pathname === '/cart' ? 2.5 : 1.8} color={cartCount > 0 ? '#0f172a' : 'currentColor'} />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-8px',
                backgroundColor: '#d4af37',
                color: '#0f172a',
                fontSize: '0.6rem',
                fontWeight: 800,
                minWidth: '17px',
                height: '17px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                padding: '0 2px'
              }}>
                {cartCount}
              </span>
            )}
          </div>
          <span>Bag</span>
        </button>
      </nav>

      <style>{`
        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
