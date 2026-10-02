import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
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
  ShieldCheck, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { hasPermission, getUserRoles, Permission } from '@/shared/utils/permissions';

export const AdminLayout: React.FC = () => {
  useDocumentTitle('Admin Control Center');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems: { to: string; label: string; icon: any; permission: Permission }[] = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'products.read' },
    { to: '/admin/products', label: 'Products', icon: Package, permission: 'products.read' },
    { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, permission: 'orders.read' },
    { to: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare, permission: 'inquiries.manage' },
    { to: '/admin/reviews', label: 'Patron Reviews', icon: Star, permission: 'reviews.manage' },
    { to: '/admin/customers', label: 'Customers', icon: Users, permission: 'customers.read' },
    { to: '/admin/categories', label: 'Categories', icon: Layers, permission: 'categories.write' },
    { to: '/admin/coupons', label: 'Coupons', icon: Tag, permission: 'coupons.manage' },
    { to: '/admin/settings', label: 'Settings', icon: Settings, permission: 'settings.manage' },
  ];

  const visibleNavItems = navItems.filter(item => hasPermission(user, item.permission));
  const userRoles = getUserRoles(user);

  return (
    <div className="admin-layout" style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      color: '#0f172a',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 998
          }}
        />
      )}

      {/* Admin Sidebar */}
      <aside style={{
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
      }} className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        
        {/* Sidebar Brand Header */}
        <div style={{
          height: '76px',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/muety-logo.png" 
              alt="MUETY" 
              style={{
                width: '38px',
                height: '38px',
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
                fontSize: '1.25rem',
                letterSpacing: '0.14em',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>MUETY</span>
                <span style={{ fontSize: '0.62rem', backgroundColor: '#d4af37', color: '#0f172a', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.05em', fontWeight: 800 }}>
                  ADMIN
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.04em', display: 'block', marginTop: '1px' }}>
                Management Suite
              </span>
            </div>
          </div>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="admin-mobile-close"
            style={{ display: 'none', color: '#94a3b8', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
          {visibleNavItems.map(item => {
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
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #d4af37' : '3px solid transparent',
                  transition: 'all var(--transition-fast)'
                })}
              >
                <IconComp size={18} color="currentColor" />
                <span>{item.label}</span>
              </NavLink>
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
                fontSize: '0.92rem',
                fontWeight: 600,
                textAlign: 'left'
              }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        {/* Admin Footer Info */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#060910',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{user?.displayName || 'Authorized Executive'}</div>
          <div>Roles: <span style={{ color: '#10b981', fontWeight: 700 }}>{userRoles.join(', ')}</span></div>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <div style={{
        flex: 1,
        marginLeft: 'var(--admin-sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }} className="admin-main-wrapper">
        
        {/* Admin Top Header */}
        <header style={{
          height: '76px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--brand-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="admin-hamburger"
              style={{ display: 'none', padding: '6px', color: 'var(--brand-primary)' }}
            >
              <Menu size={22} />
            </button>
            
            <h2 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
              MUETY Executive Control Center
            </h2>
          </div>

          {/* Top Actions: Storefront quick preview & notification badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a 
              href="/" 
              target="_blank" 
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--brand-primary)',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--brand-border)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <span>View Storefront</span>
              <ExternalLink size={14} />
            </a>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-full)',
              color: '#065f46',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Multi-Role Claims Active</span>
            </div>
          </div>
        </header>

        {/* Nested Admin Page Outlet */}
        <main style={{ padding: '2rem', flex: 1 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
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
        }
      `}</style>
    </div>
  );
};
