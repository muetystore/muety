import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Layers, 
  Tag, 
  Star,
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ExternalLink,
  MessageSquare,
  UserCheck,
  History,
  User,
  Key,
  ChevronDown,
  Megaphone
} from 'lucide-react';
import { hasPermission, getUserRoles, ROLE_LABELS, Permission } from '@/shared/utils/permissions';
import { getCanonicalStoreUrl } from '@/shared/utils/domainRouting';

interface NavSection {
  title: string;
  items: { to: string; label: string; icon: any; permission: Permission }[];
}

export const AdminLayout: React.FC = () => {
  useDocumentTitle('Admin Control Center');
  const { user, logout, sendPasswordReset } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await logout();
    navigate('/admin/login');
  };

  const handlePasswordReset = async () => {
    setAccountMenuOpen(false);
    const email = user?.muetyEmail || user?.email;
    if (!email) {
      error('No valid account email found.');
      return;
    }
    if (window.confirm(`Dispatch password reset instructions to your login email (${email})?`)) {
      try {
        await sendPasswordReset(email);
        success(`Password reset instructions sent to ${email}.`, 'Security Link Dispatched');
      } catch (err: any) {
        error(err?.message || 'Failed to dispatch password reset email.');
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'products.read' },
        { to: '/admin/profile', label: 'My Profile', icon: User, permission: 'products.read' }
      ]
    },
    {
      title: 'COMMERCE',
      items: [
        { to: '/admin/products', label: 'Products & ERP', icon: Package, permission: 'products.read' },
        { to: '/admin/categories', label: 'Categories', icon: Layers, permission: 'categories.write' },
        { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, permission: 'orders.read' },
        { to: '/admin/coupons', label: 'Coupons', icon: Tag, permission: 'coupons.manage' }
      ]
    },
    {
      title: 'CUSTOMERS',
      items: [
        { to: '/admin/customers', label: 'Customers CRM', icon: Users, permission: 'customers.read' },
        { to: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare, permission: 'inquiries.manage' },
        { to: '/admin/reviews', label: 'Reviews', icon: Star, permission: 'reviews.manage' }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { to: '/admin/admins', label: 'Admin Roster', icon: UserCheck, permission: 'roles.manage' },
        { to: '/admin/announcements', label: 'Announcement Bar', icon: Megaphone, permission: 'settings.manage' },
        { to: '/admin/audit-logs', label: 'Audit Logs', icon: History, permission: 'audit.read' },
        { to: '/admin/settings', label: 'Store Settings', icon: Settings, permission: 'settings.manage' }
      ]
    }
  ];

  const userRoles = getUserRoles(user);
  const primaryRole = user?.roleSlug || userRoles[0] || 'admin';
  const roleLabel = user?.roleName || ROLE_LABELS[primaryRole as keyof typeof ROLE_LABELS] || primaryRole;
  const adminName = user?.displayName || user?.fullName || 'Admin';
  const profilePhoto = user?.profilePhotoUrl || user?.photoURL;

  return (
    <div className="admin-layout" style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      color: '#0f172a',
      fontFamily: 'var(--font-body)',
      maxWidth: '100vw',
      overflowX: 'clip'
    }}>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 998
          }}
        />
      )}

      {/* Admin Sidebar / Mobile Drawer */}
      <aside 
        style={{
          width: 'var(--admin-sidebar-width)',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 999,
          transition: 'transform var(--transition-normal)'
        }} 
        className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}
      >
        {/* Sidebar Brand Header */}
        <div style={{
          height: '76px',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Link to="/admin/dashboard" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/muety-logo.png" 
              alt="MUETY" 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid #d4af37',
                objectFit: 'cover',
                boxShadow: '0 0 10px rgba(212, 175, 55, 0.35)',
                flexShrink: 0
              }} 
            />
            <div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '0.12em',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>MUETY</span>
                <span style={{ fontSize: '0.6rem', backgroundColor: '#d4af37', color: '#0f172a', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.05em', fontWeight: 800 }}>
                  ERP
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.04em', display: 'block', marginTop: '1px' }}>
                Executive Control Center
              </span>
            </div>
          </Link>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="admin-mobile-close"
            style={{ color: '#94a3b8', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items Grouped by Section */}
        <nav style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => hasPermission(user, item.permission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#64748b',
                  paddingLeft: '14px',
                  marginBottom: '4px'
                }}>
                  {section.title}
                </span>

                {visibleItems.map(item => {
                  const IconComp = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '9px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-heading)',
                        fontSize: '0.88rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#ffffff' : '#94a3b8',
                        backgroundColor: isActive ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                        borderLeft: isActive ? '3px solid #d4af37' : '3px solid transparent',
                        transition: 'all var(--transition-fast)'
                      })}
                    >
                      <IconComp size={17} color="currentColor" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                color: '#ef4444',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.88rem',
                fontWeight: 600,
                textAlign: 'left'
              }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer Info */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#060910',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{adminName}</div>
          <div>Role: <span style={{ color: '#10b981', fontWeight: 700 }}>{roleLabel}</span></div>
        </div>
      </aside>

      {/* Main Admin Content Wrapper */}
      <div 
        style={{
          flex: 1,
          marginLeft: 'var(--admin-sidebar-width)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0
        }} 
        className="admin-main-wrapper"
      >
        {/* Sticky Admin Header */}
        <header className="admin-header" style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--brand-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="admin-hamburger"
              style={{ padding: '6px', color: 'var(--brand-primary)', cursor: 'pointer' }}
              title="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>
            
            {/* Responsive Title (Short title on mobile, full title on desktop) */}
            <h2 className="admin-desktop-header-title" style={{ fontSize: '1.2rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              MUETY Executive Control Center
            </h2>
            <h2 className="admin-mobile-header-title" style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', margin: 0, whiteSpace: 'nowrap' }}>
              MUETY Admin
            </h2>
          </div>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <a 
              href={getCanonicalStoreUrl('/')} 
              target="_blank" 
              rel="noreferrer"
              className="admin-storefront-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--brand-primary)',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--brand-border)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <span>View Storefront</span>
              <ExternalLink size={14} />
            </a>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }} ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#090d16',
                  color: '#d4af37',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #d4af37',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={adminName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{adminName.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="admin-header-user-info" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                    {adminName}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981', lineHeight: 1.2 }}>
                    {roleLabel}
                  </span>
                </div>

                <ChevronDown size={14} color="#64748b" style={{ transform: accountMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>

              {accountMenuOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '210px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  padding: '6px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{adminName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>{user?.muetyEmail || user?.email}</div>
                  </div>

                  <button
                    onClick={() => { setAccountMenuOpen(false); navigate('/admin/profile'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#1e293b'
                    }}
                  >
                    <User size={16} color="#d4af37" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={handlePasswordReset}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#1e293b'
                    }}
                  >
                    <Key size={16} color="#3b82f6" />
                    <span>Change Password</span>
                  </button>

                  <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#ef4444'
                    }}
                  >
                    <LogOut size={16} color="#ef4444" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Nested Admin Page Outlet */}
        <main style={{ padding: '1.5rem', flex: 1, minWidth: 0 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .admin-header {
          height: 70px;
          padding: 0 1.5rem;
        }
        .admin-hamburger { display: none; }
        .admin-mobile-close { display: none; }
        .admin-mobile-header-title { display: none; }
        .admin-desktop-header-title { display: block; }

        @media (max-width: 1023px) {
          .admin-header {
            height: 54px !important;
            padding: 0 0.85rem !important;
          }
          .admin-sidebar {
            transform: translateX(-100%);
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
          .admin-main-wrapper {
            margin-left: 0 !important;
          }
          .admin-hamburger {
            display: inline-flex !important;
          }
          .admin-mobile-close {
            display: inline-flex !important;
          }
          .admin-desktop-header-title {
            display: none !important;
          }
          .admin-mobile-header-title {
            display: block !important;
            font-size: 0.95rem !important;
            font-weight: 700 !important;
          }
          .admin-storefront-link {
            padding: 4px 8px !important;
            font-size: 0.75rem !important;
          }
        }

        @media (max-width: 639px) {
          .admin-storefront-link {
            display: none !important;
          }
          .admin-header-user-info {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
