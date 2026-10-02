import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { useCart } from '@/shared/context/CartContext';
import { useAuth } from '@/shared/context/AuthContext';
import { 
  Search, 
  ShoppingBag, 
  User, 
  Heart, 
  Menu, 
  X, 
  ChevronDown,
  LogOut,
  Package,
  LayoutDashboard
} from 'lucide-react';
import { productService } from '@/features/catalog/services/productService';

export const Header: React.FC = () => {
  const { cartCount, setIsDrawerOpen, wishlist } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setCategories] = useState(productService.getCategories());
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOpenMenu = () => setMobileMenuOpen(true);
    const handleOpenSearch = () => setSearchOpen(true);

    window.addEventListener('open-mobile-menu', handleOpenMenu);
    window.addEventListener('open-mobile-search', handleOpenSearch);

    return () => {
      window.removeEventListener('open-mobile-menu', handleOpenMenu);
      window.removeEventListener('open-mobile-search', handleOpenSearch);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setAccountDropdownOpen(false);
  }, [location]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : '#ffffff',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--brand-border)',
        boxShadow: isScrolled ? 'var(--shadow-sm)' : 'none',
        transition: 'all var(--transition-normal)'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'var(--header-height)'
        }}>
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              padding: '8px',
              color: 'var(--brand-primary)',
              borderRadius: 'var(--radius-sm)'
            }}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo size="md" />
          </div>

          <nav className="desktop-nav" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.8rem'
          }}>
            <NavLink 
              to="/" 
              style={({ isActive }) => ({
                fontFamily: 'var(--font-heading)',
                fontSize: '0.92rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                color: isActive ? '#0f172a' : '#475569',
                position: 'relative',
                padding: '6px 0',
                borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent'
              })}
            >
              Home
            </NavLink>

            <NavLink 
              to="/categories" 
              style={({ isActive }) => ({
                fontFamily: 'var(--font-heading)',
                fontSize: '0.92rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                color: isActive ? '#0f172a' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 0',
                borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent'
              })}
            >
              Categories <ChevronDown size={14} />
            </NavLink>

            <NavLink 
              to="/products" 
              style={({ isActive }) => ({
                fontFamily: 'var(--font-heading)',
                fontSize: '0.92rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                color: isActive ? '#0f172a' : '#475569',
                position: 'relative',
                padding: '6px 0',
                borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent'
              })}
            >
              Collection
            </NavLink>

            <NavLink 
              to="/products?tag=new" 
              style={({ isActive }) => ({
                fontFamily: 'var(--font-heading)',
                fontSize: '0.92rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                color: isActive ? '#0f172a' : '#475569',
                position: 'relative',
                padding: '6px 0',
                borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent'
              })}
            >
              New Arrivals
            </NavLink>

            <NavLink 
              to="/about" 
              style={({ isActive }) => ({
                fontFamily: 'var(--font-heading)',
                fontSize: '0.92rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                color: isActive ? '#0f172a' : '#475569',
                position: 'relative',
                padding: '6px 0',
                borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent'
              })}
            >
              About Us
            </NavLink>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              style={{
                color: 'var(--brand-primary)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Search Catalog"
            >
              <Search size={20} />
            </button>

            <Link 
              to="/account?tab=wishlist" 
              style={{
                color: 'var(--brand-primary)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                position: 'relative'
              }}
              title="Wishlist"
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  backgroundColor: '#b91c1c',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {wishlist.length}
                </span>
              )}
            </Link>

            <div style={{ position: 'relative' }}>
              {isAuthenticated ? (
                <button
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--brand-primary)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--brand-border)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff'
                  }}
                >
                  <User size={18} color="var(--brand-accent-hover)" />
                  <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.displayName ? user.displayName.split(' ')[0] : 'Account'}
                  </span>
                  <ChevronDown size={14} />
                </button>
              ) : (
                <Link 
                  to="/login" 
                  style={{
                    color: 'var(--brand-primary)',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Sign In / Register"
                >
                  <User size={20} />
                </Link>
              )}

              {accountDropdownOpen && isAuthenticated && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '210px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--brand-border)',
                  padding: '8px 0',
                  zIndex: 1001,
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--brand-border)', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      {user?.displayName || 'Valued Client'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.email}
                    </div>
                  </div>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        color: 'var(--brand-accent-hover)',
                        fontWeight: 700
                      }}
                    >
                      <LayoutDashboard size={16} /> Executive Admin
                    </Link>
                  )}

                  <Link
                    to="/account?tab=orders"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      color: 'var(--brand-primary)'
                    }}
                  >
                    <Package size={16} /> My Orders
                  </Link>

                  <Link
                    to="/account"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      color: 'var(--brand-primary)'
                    }}
                  >
                    <User size={16} /> Account Profile
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      setAccountDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      color: '#b91c1c',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderTop: '1px solid var(--brand-border)',
                      marginTop: '4px'
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsDrawerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
              }}
            >
              <ShoppingBag size={16} color="#facc15" />
              <span>Bag ({cartCount})</span>
            </button>
          </div>
        </div>

        {searchOpen && (
          <div style={{
            borderTop: '1px solid var(--brand-border)',
            backgroundColor: '#f8fafc',
            padding: '1rem 0',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div className="container">
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search silk sarees, bridal couture, Kanchipuram, Banarasi..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 16px 10px 40px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--brand-border)',
                      fontSize: '0.92rem'
                    }}
                  />
                  <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Search
                </button>
                <button 
                  type="button" 
                  onClick={() => setSearchOpen(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          top: 'var(--header-height)',
          backgroundColor: '#ffffff',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem 1.5rem',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease'
        }} className="mobile-menu-overlay">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1.1rem', fontWeight: 600 }}>
            <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>Home</NavLink>
            <NavLink to="/categories" onClick={() => setMobileMenuOpen(false)}>All Categories</NavLink>
            <NavLink to="/products" onClick={() => setMobileMenuOpen(false)}>Full Catalog</NavLink>
            <NavLink to="/products?tag=new" onClick={() => setMobileMenuOpen(false)}>New Arrivals</NavLink>
            <NavLink to="/about" onClick={() => setMobileMenuOpen(false)}>About MUETY</NavLink>
            <NavLink to="/contact" onClick={() => setMobileMenuOpen(false)}>Contact Concierge</NavLink>
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--brand-border)' }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link to="/account" className="btn btn-primary" style={{ width: '100%' }}>My Account Profile</Link>
                <button onClick={logout} className="btn btn-outline" style={{ width: '100%', color: '#b91c1c' }}>Sign Out</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/login" className="btn btn-primary" style={{ flex: 1 }}>Sign In</Link>
                <Link to="/register" className="btn btn-outline" style={{ flex: 1 }}>Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
