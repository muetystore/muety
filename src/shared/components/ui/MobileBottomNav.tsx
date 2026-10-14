import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '@/shared/context/CartContext';
import { Home, Heart, User } from 'lucide-react';

/**
 * Custom outlined SVG icon representing an Indian draped saree
 * Graceful pallu diagonal fold, pleated skirt, and traditional border
 */
export const SareeIcon: React.FC<{ size?: number; strokeWidth?: number; color?: string }> = ({
  size = 23,
  strokeWidth = 1.8,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Neckline / Blouse collar contour */}
    <path d="M9 3.5a3 3 0 0 0 6 0" />
    {/* Left shoulder drape flowing diagonally to right hip */}
    <path d="M7.5 4.5l6.5 6.5" />
    {/* Diagonal pallu fold */}
    <path d="M6 8l7 7" />
    {/* Left waist curve to floor */}
    <path d="M7 11.5c-.8 3-.5 6.5-.5 9.5h11c0-3.5-.8-7-2-9.5" />
    {/* Pleat cascades in saree skirt */}
    <path d="M10.5 15v6" />
    <path d="M13.5 15v6" />
    {/* Saree hem border line */}
    <path d="M6.5 19.5h11" />
  </svg>
);

export const MobileBottomNav: React.FC = () => {
  const { wishlist } = useCart();
  const location = useLocation();

  if (location.pathname === '/checkout' || location.pathname.startsWith('/admin')) {
    return null;
  }

  const wishlistCount = wishlist?.length || 0;

  return (
    <>
      <nav 
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '58px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 1500,
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'border-box'
        }}
        aria-label="Mobile Navigation"
      >
        {/* 1. Home */}
        <NavLink
          to="/"
          className="bottom-nav-item"
          aria-label="Home"
          title="Home"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            minWidth: '44px',
            color: isActive ? '#10182d' : '#8e9aa8',
            position: 'relative',
            textDecoration: 'none'
          })}
        >
          {({ isActive }) => (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home 
                size={23} 
                strokeWidth={isActive ? 2.3 : 1.7} 
                color={isActive ? '#c9a227' : 'currentColor'} 
              />
              {isActive && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    width: '18px',
                    height: '2.5px',
                    backgroundColor: '#c9a227',
                    borderRadius: '2px'
                  }} 
                />
              )}
            </div>
          )}
        </NavLink>

        {/* 2. Sarees (Full Catalog) */}
        <NavLink
          to="/products"
          className="bottom-nav-item"
          aria-label="Sarees & Handlooms"
          title="Sarees"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            minWidth: '44px',
            color: isActive ? '#10182d' : '#8e9aa8',
            position: 'relative',
            textDecoration: 'none'
          })}
        >
          {({ isActive }) => (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SareeIcon 
                size={23} 
                strokeWidth={isActive ? 2.2 : 1.7} 
                color={isActive ? '#c9a227' : 'currentColor'} 
              />
              {isActive && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    width: '18px',
                    height: '2.5px',
                    backgroundColor: '#c9a227',
                    borderRadius: '2px'
                  }} 
                />
              )}
            </div>
          )}
        </NavLink>

        {/* 3. Wishlist */}
        <NavLink
          to="/wishlist"
          className="bottom-nav-item"
          aria-label={`Wishlist (${wishlistCount} items)`}
          title="Wishlist"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            minWidth: '44px',
            color: isActive ? '#10182d' : '#8e9aa8',
            position: 'relative',
            textDecoration: 'none'
          })}
        >
          {({ isActive }) => (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart 
                size={23} 
                strokeWidth={isActive ? 2.3 : 1.7} 
                fill={wishlistCount > 0 ? (isActive ? '#c9a227' : '#c62828') : 'none'} 
                color={wishlistCount > 0 ? (isActive ? '#c9a227' : '#c62828') : (isActive ? '#c9a227' : 'currentColor')} 
              />
              {wishlistCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-7px',
                    backgroundColor: '#c62828',
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    minWidth: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 2px',
                    lineHeight: 1
                  }}
                >
                  {wishlistCount}
                </span>
              )}
              {isActive && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    width: '18px',
                    height: '2.5px',
                    backgroundColor: '#c9a227',
                    borderRadius: '2px'
                  }} 
                />
              )}
            </div>
          )}
        </NavLink>

        {/* 4. Account */}
        <NavLink
          to="/account"
          className="bottom-nav-item"
          aria-label="Account"
          title="Account"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            minWidth: '44px',
            color: isActive ? '#10182d' : '#8e9aa8',
            position: 'relative',
            textDecoration: 'none'
          })}
        >
          {({ isActive }) => (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User 
                size={23} 
                strokeWidth={isActive ? 2.3 : 1.7} 
                color={isActive ? '#c9a227' : 'currentColor'} 
              />
              {isActive && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    width: '18px',
                    height: '2.5px',
                    backgroundColor: '#c9a227',
                    borderRadius: '2px'
                  }} 
                />
              )}
            </div>
          )}
        </NavLink>
      </nav>

      <style>{`
        @media (min-width: 992px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
