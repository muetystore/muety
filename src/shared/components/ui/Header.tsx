 import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  LayoutDashboard,
  Sparkles,
  Layers,
  ChevronRight,
  MapPin,
  Settings,
  Link2,
  Lock
} from 'lucide-react';
import { productService } from '@/features/catalog/services/productService';
import { collectionService } from '@/features/catalog/services/collectionService';
import { isGeneratedPatronName } from '@/features/auth/services/authService';
import { Category, SareeCollection } from '@/types';
import { SearchOverlay } from './SearchOverlay';

export const Header: React.FC = () => {
  const { cartCount, setIsDrawerOpen, wishlist } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const hasGenuineName = Boolean(user?.displayName && !isGeneratedPatronName(user.displayName));

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [collectionsMenuOpen, setCollectionsMenuOpen] = useState(false);
  const [shopByMenuOpen, setShopByMenuOpen] = useState(false);
  const [mobileShopByOpen, setMobileShopByOpen] = useState(false);
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<SareeCollection[]>(() => collectionService.getCollections());
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth < 992 : false
  );

  const collectionsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shopByTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const collectionsRef = useRef<HTMLDivElement | null>(null);
  const shopByRef = useRef<HTMLDivElement | null>(null);

  // Viewport resize tracking
  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent background scrolling while mobile account drawer is open
  useEffect(() => {
    if (accountDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [accountDrawerOpen]);

  // Header scroll appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // External open triggers (e.g. from hero banners or shortcuts)
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

  // Fetch real categories & collections
  useEffect(() => {
    const unsubCats = productService.subscribeToCategories((cats) => {
      setCategories(cats || []);
    });
    const unsubCols = collectionService.subscribeToCollections((cols) => {
      setCollections(cols || []);
    });
    return () => {
      if (typeof unsubCats === 'function') unsubCats();
      if (typeof unsubCols === 'function') unsubCols();
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setAccountDropdownOpen(false);
    setAccountDrawerOpen(false);
    setCollectionsMenuOpen(false);
    setShopByMenuOpen(false);
  }, [location]);

  // Click outside & Escape key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCollectionsMenuOpen(false);
        setShopByMenuOpen(false);
        setAccountDropdownOpen(false);
        setAccountDrawerOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (collectionsRef.current && !collectionsRef.current.contains(target)) {
        setCollectionsMenuOpen(false);
      }
      if (shopByRef.current && !shopByRef.current.contains(target)) {
        setShopByMenuOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Memoized collections for Shop By dropdown (Strictly real admin data only)
  const shopByOccasions = useMemo(() => {
    return collections
      .filter(c => c.showInShopBy !== false && (c.type === 'occasion' || !c.type))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [collections]);

  const shopByFabrics = useMemo(() => {
    return collections
      .filter(c => c.showInShopBy !== false && c.type === 'fabric')
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [collections]);

  const shopByStyles = useMemo(() => {
    return collections
      .filter(c => c.showInShopBy !== false && c.type === 'style')
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [collections]);

  const shopByCurated = useMemo(() => {
    return collections
      .filter(c => c.showInShopBy !== false && (c.type === 'curated' || c.type === 'collection'))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [collections]);

  const activeShopByColsCount = useMemo(() => {
    let count = 1; // Price & Curated edits column is always present
    if (shopByOccasions.length > 0) count++;
    if (shopByFabrics.length > 0) count++;
    if (shopByStyles.length > 0) count++;
    return count;
  }, [shopByOccasions.length, shopByFabrics.length, shopByStyles.length]);

  // Collections hover handlers with debounce bridge
  const handleCollectionsEnter = () => {
    if (collectionsTimerRef.current) clearTimeout(collectionsTimerRef.current);
    setShopByMenuOpen(false);
    setCollectionsMenuOpen(true);
  };

  const handleCollectionsLeave = () => {
    collectionsTimerRef.current = setTimeout(() => {
      setCollectionsMenuOpen(false);
    }, 180);
  };

  // Shop By hover handlers with debounce bridge
  const handleShopByEnter = () => {
    if (shopByTimerRef.current) clearTimeout(shopByTimerRef.current);
    setCollectionsMenuOpen(false);
    setShopByMenuOpen(true);
  };

  const handleShopByLeave = () => {
    shopByTimerRef.current = setTimeout(() => {
      setShopByMenuOpen(false);
    }, 180);
  };

  return (
    <>
      <header className={`main-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          {/* =========================================================
              MOBILE LEFT CLUSTER: Hamburger Menu & Search
              DESKTOP LEFT: 1. Muety Logo
             ========================================================= */}
          <div className="header-left-cluster">
            {/* Mobile Hamburger Button */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop: 1. Muety Logo */}
            <div className="header-logo-desktop">
              <Logo size="md" />
            </div>
          </div>

          {/* =========================================================
              MOBILE CENTER CLUSTER: Centered Logo
              DESKTOP CENTER/NAV: 2. Shop By | 3. Collections | 4. Patron Care
             ========================================================= */}
          <div className="header-center-cluster">
            {/* Mobile Centered Logo */}
            <div className="header-logo-mobile">
              <Logo size="sm" />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="desktop-nav" aria-label="Main Navigation">
              {/* 2. Shop By Mega-Menu */}
              <div 
                ref={shopByRef}
                className="nav-dropdown-wrapper"
                onMouseEnter={handleShopByEnter}
                onMouseLeave={handleShopByLeave}
              >
                <button
                  type="button"
                  className={`nav-dropdown-trigger ${shopByMenuOpen ? 'active' : ''}`}
                  onClick={() => {
                    setCollectionsMenuOpen(false);
                    setShopByMenuOpen(!shopByMenuOpen);
                  }}
                  aria-haspopup="true"
                  aria-expanded={shopByMenuOpen}
                >
                  <span>Shop By</span>
                  <ChevronDown 
                    size={14} 
                    className={`nav-chevron ${shopByMenuOpen ? 'rotated' : ''}`}
                  />
                </button>

                {shopByMenuOpen && (
                  <div 
                    className="shopby-megamenu animate-fade-in"
                    style={{ width: `${Math.min(760, Math.max(360, activeShopByColsCount * 190))}px` }}
                    onMouseEnter={handleShopByEnter}
                    onMouseLeave={handleShopByLeave}
                  >
                    <div 
                      className="shopby-megamenu-grid"
                      style={{ gridTemplateColumns: `repeat(${activeShopByColsCount}, minmax(160px, 1fr))` }}
                    >
                      {/* Column 1: Occasion */}
                      {shopByOccasions.length > 0 && (
                        <div className="shopby-column">
                          <div className="shopby-column-title">Shop by Occasion</div>
                          <ul className="shopby-link-list">
                            {shopByOccasions.map(col => (
                              <li key={col.id}>
                                <Link to={`/products?occasion=${col.slug}`} onClick={() => setShopByMenuOpen(false)}>
                                  {col.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Column 2: Fabric */}
                      {shopByFabrics.length > 0 && (
                        <div className="shopby-column">
                          <div className="shopby-column-title">Shop by Fabric</div>
                          <ul className="shopby-link-list">
                            {shopByFabrics.map(col => (
                              <li key={col.id}>
                                <Link to={`/products?fabric=${col.slug}`} onClick={() => setShopByMenuOpen(false)}>
                                  {col.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Column 3: Style */}
                      {shopByStyles.length > 0 && (
                        <div className="shopby-column">
                          <div className="shopby-column-title">Shop by Style</div>
                          <ul className="shopby-link-list">
                            {shopByStyles.map(col => (
                              <li key={col.id}>
                                <Link to={`/products?style=${col.slug}`} onClick={() => setShopByMenuOpen(false)}>
                                  {col.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Column 4: Price & Curated Edits */}
                      <div className="shopby-column shopby-column-highlight">
                        <div className="shopby-column-title">Curated & Price Edits</div>
                        <ul className="shopby-link-list">
                          <li>
                            <Link to="/products?maxPrice=2000" onClick={() => setShopByMenuOpen(false)}>
                              Under ₹2,000
                            </Link>
                          </li>
                          <li>
                            <Link to="/products?minPrice=2000&maxPrice=5000" onClick={() => setShopByMenuOpen(false)}>
                              ₹2,000 – ₹5,000
                            </Link>
                          </li>
                          <li>
                            <Link to="/products?minPrice=5000" onClick={() => setShopByMenuOpen(false)}>
                              Above ₹5,000
                            </Link>
                          </li>
                          <li className="shopby-divider-li" />
                          <li>
                            <Link to="/products?tag=new" className="highlight-gold" onClick={() => setShopByMenuOpen(false)}>
                              ✨ New Arrivals
                            </Link>
                          </li>
                          <li>
                            <Link to="/products?tag=bestseller" className="highlight-gold" onClick={() => setShopByMenuOpen(false)}>
                              👑 Best Sellers
                            </Link>
                          </li>
                          <li>
                            <Link to="/products?tag=sale" className="highlight-red" onClick={() => setShopByMenuOpen(false)}>
                              🔥 Festive Special Edit
                            </Link>
                          </li>
                          {shopByCurated.map(col => (
                            <li key={col.id}>
                              <Link to={`/products?collection=${col.slug}`} className="highlight-gold" onClick={() => setShopByMenuOpen(false)}>
                                ✨ {col.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="shopby-footer">
                      <Link to="/products" onClick={() => setShopByMenuOpen(false)} className="shopby-footer-link">
                        Explore Full Handloom Repertory &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Categories Dropdown */}
              <div 
                ref={collectionsRef}
                className="nav-dropdown-wrapper"
                onMouseEnter={handleCollectionsEnter}
                onMouseLeave={handleCollectionsLeave}
              >
                <button 
                  type="button"
                  className={`nav-dropdown-trigger ${collectionsMenuOpen ? 'active' : ''}`}
                  onClick={() => {
                    setShopByMenuOpen(false);
                    setCollectionsMenuOpen(!collectionsMenuOpen);
                  }}
                  aria-haspopup="true"
                  aria-expanded={collectionsMenuOpen}
                >
                  <span>Categories</span>
                  <ChevronDown 
                    size={14} 
                    className={`nav-chevron ${collectionsMenuOpen ? 'rotated' : ''}`}
                  />
                </button>

                {collectionsMenuOpen && (
                  <div 
                    className="collections-dropdown-menu animate-fade-in"
                    onMouseEnter={handleCollectionsEnter}
                    onMouseLeave={handleCollectionsLeave}
                  >
                    <div className="dropdown-section-header">
                      <div className="dropdown-section-title">
                        <Layers size={13} color="var(--brand-accent)" />
                        <span>Explore Categories</span>
                      </div>
                      {categories.length > 0 && (
                        <span className="dropdown-count-pill">{categories.length}</span>
                      )}
                    </div>

                    <div className="dropdown-scroll-list">
                      {categories.length > 0 ? (
                        categories.map((cat) => {
                          const displayName = cat.name
                            ? cat.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                            : 'Category';
                          return (
                            <Link
                              key={cat.id}
                              to={`/products?cat=${cat.slug}`}
                              onClick={() => setCollectionsMenuOpen(false)}
                              className="dropdown-item-link"
                            >
                              <div className="dropdown-item-content">
                                <span className="dropdown-item-bullet" />
                                <span>{displayName}</span>
                              </div>
                              <span className="dropdown-item-arrow">
                                <ChevronRight size={14} />
                              </span>
                            </Link>
                          );
                        })
                      ) : (
                        <Link
                          to="/categories"
                          onClick={() => setCollectionsMenuOpen(false)}
                          className="dropdown-item-link"
                        >
                          <div className="dropdown-item-content">
                            <span className="dropdown-item-bullet" />
                            <span>All Categories</span>
                          </div>
                          <span className="dropdown-item-arrow">
                            <ChevronRight size={14} />
                          </span>
                        </Link>
                      )}
                    </div>

                    <div className="dropdown-footer-actions">
                      <Link
                        to="/categories"
                        onClick={() => setCollectionsMenuOpen(false)}
                        className="dropdown-footer-link"
                      >
                        <span>Browse Category Directory</span>
                        <ChevronRight size={13} />
                      </Link>
                      <Link
                        to="/products"
                        onClick={() => setCollectionsMenuOpen(false)}
                        className="dropdown-footer-link gold"
                      >
                        <span>View Complete Catalog</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Patron Care */}
              <NavLink to="/support" className="nav-simple-link">
                Patron Care
              </NavLink>
            </nav>
          </div>

          {/* =========================================================
              DESKTOP ACTIONS: 5. Search | 6. Wishlist | 7. Bag | 8. Account
              MOBILE ACTIONS: Bag only (with live badge)
             ========================================================= */}
          <div className="header-actions header-right-cluster">
            {/* 5. Search Icon Button (Desktop & Mobile) */}
            <button 
              onClick={() => setSearchOpen(true)}
              className="header-icon-btn header-search-btn"
              title="Search Catalog"
              aria-label="Search Catalog"
            >
              <Search size={21} />
            </button>

            {/* 6. Desktop Wishlist Link (Hidden on mobile via CSS) */}
            <Link 
              to="/wishlist" 
              className="header-icon-btn header-wishlist-btn"
              title="Wishlist"
              aria-label={`Wishlist (${wishlist.length} saved)`}
            >
              <Heart size={21} />
              {wishlist.length > 0 && (
                <span className="header-badge-count">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* 7. Shopping Bag Button (Desktop & Mobile) */}
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="header-bag-btn"
              aria-label={`Shopping Bag (${cartCount} items)`}
              title={`Shopping Bag (${cartCount})`}
            >
              <ShoppingBag size={18} color="#facc15" />
              <span className="header-bag-label">Bag ({cartCount})</span>
              <span className="header-bag-mobile-badge">{cartCount}</span>
            </button>

            {/* 8. Account Profile / Dropdown / Drawer Trigger */}
            <div ref={accountRef} className="header-user-wrapper">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isMobileViewport) {
                      setAccountDrawerOpen(true);
                    } else {
                      setAccountDropdownOpen(!accountDropdownOpen);
                    }
                  }}
                  aria-expanded={accountDropdownOpen}
                  aria-haspopup="true"
                  className="header-account-btn"
                  title="Patron Account"
                  aria-label="Patron Account"
                >
                  <User size={17} color="var(--brand-accent-hover)" />
                  <span className="account-user-name">
                    {hasGenuineName && user?.displayName ? user.displayName.split(' ')[0] : 'Account'}
                  </span>
                  <ChevronDown size={14} className={`nav-chevron ${accountDropdownOpen ? 'rotated' : ''}`} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isMobileViewport) {
                      setAccountDrawerOpen(true);
                    } else {
                      setAccountDropdownOpen(!accountDropdownOpen);
                    }
                  }}
                  aria-expanded={accountDropdownOpen}
                  aria-haspopup="true"
                  className="header-guest-signin-btn"
                  title="Sign In / Patron Account"
                  aria-label="Sign In or Patron Account"
                >
                  <User size={16} color="var(--brand-accent-hover)" />
                  <span className="guest-signin-label">Sign In</span>
                  <ChevronDown size={13} className={`nav-chevron ${accountDropdownOpen ? 'rotated' : ''}`} />
                </button>
              )}

              {/* Desktop Account Dropdown (Authenticated and Guest) */}
              {accountDropdownOpen && !isMobileViewport && (
                <div 
                  className="account-dropdown-menu animate-fade-in"
                  role="menu"
                  aria-label="Patron Account Menu"
                >
                  {isAuthenticated ? (
                    <>
                      <div className="account-dropdown-header">
                        <div className="account-dropdown-name" title={hasGenuineName && user?.displayName ? user.displayName : 'Valued Patron'}>
                          {hasGenuineName && user?.displayName ? user.displayName : 'Valued Patron'}
                        </div>
                        <div className="account-dropdown-email">
                          {user?.email || user?.phoneNumber || ''}
                        </div>
                      </div>

                      {user?.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="account-menu-item gold"
                          role="menuitem"
                        >
                          <LayoutDashboard size={15} /> Executive Admin
                        </Link>
                      )}

                      <Link
                        to="/account?tab=overview"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="account-menu-item"
                        role="menuitem"
                      >
                        <User size={15} /> Account Dashboard
                      </Link>

                      <Link
                        to="/account?tab=profile"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="account-menu-item"
                        role="menuitem"
                      >
                        <Settings size={15} /> Profile Settings
                      </Link>

                      <Link
                        to="/account?tab=orders"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="account-menu-item"
                        role="menuitem"
                      >
                        <Package size={15} /> My Orders
                      </Link>

                      <Link
                        to="/account?tab=address"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="account-menu-item"
                        role="menuitem"
                      >
                        <MapPin size={15} /> Delivery Addresses
                      </Link>

                      <Link
                        to="/wishlist"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="account-menu-item"
                        role="menuitem"
                      >
                        <Heart size={15} /> My Wishlist ({wishlist.length})
                      </Link>

                      <Link
                        to="/account?tab=connected"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="account-menu-item"
                        role="menuitem"
                      >
                        <Link2 size={15} /> Connected Accounts
                      </Link>

                      <button
                        onClick={() => {
                          logout();
                          setAccountDropdownOpen(false);
                        }}
                        className="account-menu-item logout"
                        role="menuitem"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="account-dropdown-guest-header">
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                          Hey, Guest!
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '12px', lineHeight: 1.4 }}>
                          Sign in to access your account and orders.
                        </div>
                        <Link
                          to="/login"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}
                        >
                          Sign In / Register
                        </Link>
                      </div>

                      <div style={{ padding: '6px 0' }}>
                        <Link
                          to="/account?tab=profile"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="account-menu-item"
                          role="menuitem"
                        >
                          <Settings size={15} />
                          <span style={{ flex: 1 }}>Profile</span>
                        </Link>

                        <Link
                          to="/login?redirect=/account?tab=orders"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="account-menu-item"
                          role="menuitem"
                        >
                          <Package size={15} />
                          <span style={{ flex: 1 }}>My Orders</span>
                          <Lock size={12} color="#94a3b8" />
                        </Link>

                        <Link
                          to="/login?redirect=/account?tab=address"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="account-menu-item"
                          role="menuitem"
                        >
                          <MapPin size={15} />
                          <span style={{ flex: 1 }}>Saved Addresses</span>
                          <Lock size={12} color="#94a3b8" />
                        </Link>

                        <Link
                          to="/wishlist"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="account-menu-item"
                          role="menuitem"
                        >
                          <Heart size={15} />
                          <span style={{ flex: 1 }}>My Wishlist</span>
                          {wishlist.length > 0 && <span className="header-badge-count-static">{wishlist.length}</span>}
                        </Link>

                        <Link
                          to="/login?redirect=/account?tab=connected"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="account-menu-item"
                          role="menuitem"
                        >
                          <Link2 size={15} />
                          <span style={{ flex: 1 }}>Connected Accounts</span>
                          <Lock size={12} color="#94a3b8" />
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================
          KALANMANDIR-INSPIRED SEARCH OVERLAY / DRAWER
         ========================================================= */}
      <SearchOverlay 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)} 
        isMobile={isMobileViewport}
      />

      {/* =========================================================
          BOOKMYSHOW-INSPIRED MOBILE ACCOUNT SLIDE-OVER DRAWER
         ========================================================= */}
      {accountDrawerOpen && (
        <div 
          className="account-drawer-backdrop"
          onClick={() => setAccountDrawerOpen(false)}
        >
          <div 
            className="account-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Account Menu"
          >
            {/* Drawer Header */}
            <div className="account-drawer-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                {isAuthenticated ? (
                  <div>
                    <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: '#c9a227', textTransform: 'uppercase', fontWeight: 700 }}>
                      PATRON ACCOUNT
                    </span>
                    <h3 style={{ margin: '4px 0 2px', fontSize: '1.15rem', color: '#ffffff', fontWeight: 700 }}>
                      {hasGenuineName && user?.displayName ? user.displayName : 'Valued Patron'}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {user?.email || user?.phoneNumber || ''}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: '#c9a227', textTransform: 'uppercase', fontWeight: 700 }}>
                      WELCOME TO MUETY
                    </span>
                    <h3 style={{ margin: '4px 0 2px', fontSize: '1.2rem', color: '#ffffff', fontWeight: 700 }}>
                      Hey, Guest!
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      Sign in to access your account and orders.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-close-btn"
                  aria-label="Close Account Menu"
                >
                  <X size={20} />
                </button>
              </div>

              {!isAuthenticated && (
                <div style={{ marginTop: '1rem', width: '100%' }}>
                  <Link
                    to="/login"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                  >
                    Sign In / Register
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Body - Independently Scrollable */}
            <div className="account-drawer-body">
              {user?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-item gold"
                >
                  <LayoutDashboard size={18} />
                  <span>Executive Admin Dashboard</span>
                </Link>
              )}

              <Link
                to="/account?tab=profile"
                onClick={() => setAccountDrawerOpen(false)}
                className="account-drawer-item"
              >
                <Settings size={18} />
                <span style={{ flex: 1 }}>Profile</span>
              </Link>

              {isAuthenticated ? (
                <Link
                  to="/account?tab=orders"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-item"
                >
                  <Package size={18} />
                  <span style={{ flex: 1 }}>My Orders</span>
                </Link>
              ) : (
                <Link
                  to="/login?redirect=/account?tab=orders"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-item"
                >
                  <Package size={18} />
                  <span style={{ flex: 1 }}>My Orders</span>
                  <Lock size={14} color="#94a3b8" />
                </Link>
              )}

              {isAuthenticated ? (
                <Link
                  to="/account?tab=address"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-item"
                >
                  <MapPin size={18} />
                  <span style={{ flex: 1 }}>Saved Addresses</span>
                </Link>
              ) : (
                <Link
                  to="/login?redirect=/account?tab=address"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-item"
                >
                  <MapPin size={18} />
                  <span style={{ flex: 1 }}>Saved Addresses</span>
                  <Lock size={14} color="#94a3b8" />
                </Link>
              )}

              <Link
                to="/wishlist"
                onClick={() => setAccountDrawerOpen(false)}
                className="account-drawer-item"
              >
                <Heart size={18} />
                <span style={{ flex: 1 }}>My Wishlist</span>
                {wishlist.length > 0 && <span className="header-badge-count-static">{wishlist.length}</span>}
              </Link>

              {isAuthenticated ? (
                <Link
                  to="/account?tab=connected"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-item"
                >
                  <Link2 size={18} />
                  <span style={{ flex: 1 }}>Connected Accounts</span>
                </Link>
              ) : (
                <Link
                  to="/login?redirect=/account?tab=connected"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="account-drawer-item"
                >
                  <Link2 size={18} />
                  <span style={{ flex: 1 }}>Connected Accounts</span>
                  <Lock size={14} color="#94a3b8" />
                </Link>
              )}
            </div>

            {/* Drawer Footer */}
            {isAuthenticated && (
              <div className="account-drawer-footer">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setAccountDrawerOpen(false);
                  }}
                  className="account-drawer-logout-btn"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MOBILE NAVIGATION DRAWER
         ========================================================= */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            top: 'var(--header-height-mobile, 52px)',
            backgroundColor: '#ffffff',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            boxShadow: 'var(--shadow-xl)',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#c9a227', textTransform: 'uppercase' }}>
              STORE NAVIGATION
            </span>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '1rem', fontWeight: 600 }}>
              <NavLink 
                to="/" 
                onClick={() => setMobileMenuOpen(false)} 
                style={({ isActive }) => ({ color: isActive ? '#c9a227' : '#10182d', padding: '6px 0', textDecoration: 'none' })}
              >
                Home
              </NavLink>

              {/* Mobile Shop By Accordion */}
              <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                <button
                  type="button"
                  onClick={() => setMobileShopByOpen(!mobileShopByOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: mobileShopByOpen ? '#c9a227' : '#10182d',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#c9a227" /> Shop By
                  </span>
                  <ChevronDown size={16} style={{ transform: mobileShopByOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                {mobileShopByOpen && (
                  <div style={{ padding: '6px 0 10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {shopByOccasions.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Occasion</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                          {shopByOccasions.map(col => (
                            <Link key={col.id} to={`/products?occasion=${col.slug}`} onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', textDecoration: 'none' }}>
                              {col.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {shopByFabrics.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Fabric</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                          {shopByFabrics.map(col => (
                            <Link key={col.id} to={`/products?fabric=${col.slug}`} onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', textDecoration: 'none' }}>
                              {col.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {shopByStyles.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Style</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                          {shopByStyles.map(col => (
                            <Link key={col.id} to={`/products?style=${col.slug}`} onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', textDecoration: 'none' }}>
                              {col.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Price Range</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                        <Link to="/products?maxPrice=2000" onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', textDecoration: 'none' }}>Under ₹2,000</Link>
                        <Link to="/products?minPrice=2000&maxPrice=5000" onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', textDecoration: 'none' }}>₹2,000 – ₹5,000</Link>
                        <Link to="/products?minPrice=5000" onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', textDecoration: 'none' }}>Above ₹5,000</Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Categories Accordion */}
              <div style={{ borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                <button
                  type="button"
                  onClick={() => setMobileCollectionsOpen(!mobileCollectionsOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: mobileCollectionsOpen ? '#c9a227' : '#10182d',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="#c9a227" /> Categories
                  </span>
                  <ChevronDown size={16} style={{ transform: mobileCollectionsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                {mobileCollectionsOpen && (
                  <div style={{ padding: '6px 0 10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                    {categories.map((c) => (
                      <Link key={c.id} to={`/products?cat=${c.slug}`} onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                    ))}
                    <Link to="/categories" onClick={() => setMobileMenuOpen(false)} style={{ color: '#c9a227', fontWeight: 600, textDecoration: 'none' }}>
                      Browse All Categories &rarr;
                    </Link>
                    <Link to="/products" onClick={() => setMobileMenuOpen(false)} style={{ color: '#10182d', fontWeight: 600, textDecoration: 'none' }}>
                      Complete Catalog &rarr;
                    </Link>
                  </div>
                )}
              </div>

              <NavLink 
                to="/about" 
                onClick={() => setMobileMenuOpen(false)} 
                style={({ isActive }) => ({ color: isActive ? '#c9a227' : '#10182d', padding: '6px 0', textDecoration: 'none' })}
              >
                Muety Atelier
              </NavLink>

              <NavLink 
                to="/support" 
                onClick={() => setMobileMenuOpen(false)} 
                style={({ isActive }) => ({ color: isActive ? '#c9a227' : '#10182d', padding: '6px 0', textDecoration: 'none' })}
              >
                Patron Care
              </NavLink>

              <NavLink 
                to="/wishlist" 
                onClick={() => setMobileMenuOpen(false)} 
                style={({ isActive }) => ({ color: isActive ? '#c9a227' : '#10182d', padding: '6px 0', textDecoration: 'none' })}
              >
                Saved Wishlist ({wishlist.length})
              </NavLink>

              <NavLink 
                to="/account" 
                onClick={() => setMobileMenuOpen(false)} 
                style={({ isActive }) => ({ color: isActive ? '#c9a227' : '#10182d', padding: '6px 0', textDecoration: 'none' })}
              >
                Patron Account
              </NavLink>
            </nav>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.85rem' }}>
              PATRON CONCIERGE
            </span>
            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10182d', marginBottom: '2px' }}>
                  {hasGenuineName && user?.displayName ? user.displayName : 'Valued Patron'}
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>{user?.email || user?.phoneNumber}</span>
                </div>
                {user?.role === 'admin' && (
                  <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: '#854d0e', fontWeight: 700 }}>
                    <LayoutDashboard size={15} /> Executive Admin Dashboard
                  </Link>
                )}
                <Link to="/account" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <User size={15} /> Account Dashboard
                </Link>
                <Link to="/account?tab=orders" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <Package size={15} /> My Orders
                </Link>
                <Link to="/account?tab=address" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <MapPin size={15} /> Delivery Addresses
                </Link>
                <Link to="/account?tab=profile" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <Settings size={15} /> Profile Settings
                </Link>
                <Link to="/account?tab=connected" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <Link2 size={15} /> Connected Accounts
                </Link>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: '#b91c1c', borderColor: '#fca5a5', marginTop: '4px' }}>
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Sign In</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Register</Link>
                </div>
                <Link to="/account?tab=orders" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  <Package size={14} /> Track Order
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
