import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Header } from '@/shared/components/ui/Header';
import { Footer } from '@/shared/components/ui/Footer';
import { CartDrawer } from '@/features/cart/components/CartDrawer';
import { PatronAuthModal } from '@/shared/components/ui/PatronAuthModal';
import { AnnouncementBar } from '@/shared/components/ui/AnnouncementBar';
import { ProtectedRoute } from '@/shared/components/ui/ProtectedRoute';
import { MobileBottomNav } from '@/shared/components/ui/MobileBottomNav';
import { ScrollToTop } from '@/shared/components/ui/ScrollToTop';
import { ErrorBoundary } from '@/shared/components/ui/ErrorBoundary';
import { 
  isAdminDomain, 
  isStoreDomain, 
  isLocalOrDev, 
  shouldRedirectStoreToRoot, 
  getAdminPortalUrl 
} from '@/shared/utils/domainRouting';

// Eagerly loaded core entry routes
import { HomePage } from '@/features/catalog/pages/HomePage';
import { ProductsPage } from '@/features/catalog/pages/ProductsPage';
import { ProductDetailPage } from '@/features/catalog/pages/ProductDetailPage';

// Lazily loaded customer pages
const CategoriesPage = lazy(() => import('@/features/catalog/pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const CategoryProductsPage = lazy(() => import('@/features/catalog/pages/CategoryProductsPage').then(m => ({ default: m.CategoryProductsPage })));
const CartPage = lazy(() => import('@/features/cart/pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('@/features/checkout/pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('@/features/orders/pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const AccountPage = lazy(() => import('@/features/customers/pages/AccountPage').then(m => ({ default: m.AccountPage })));
const WishlistPage = lazy(() => import('@/features/wishlist/pages/WishlistPage').then(m => ({ default: m.WishlistPage })));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const AboutPage = lazy(() => import('@/features/info/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('@/features/inquiries/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import('@/features/info/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/features/info/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const ShippingPage = lazy(() => import('@/features/info/pages/ShippingPage').then(m => ({ default: m.ShippingPage })));
const ReturnRefundPage = lazy(() => import('@/features/info/pages/ReturnRefundPage').then(m => ({ default: m.ReturnRefundPage })));
const SupportPage = lazy(() => import('@/features/info/pages/SupportPage').then(m => ({ default: m.SupportPage })));

// Lazily loaded admin pages
const AdminLayout = lazy(() => import('@/features/admin/pages/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('@/features/admin/pages/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('@/features/admin/pages/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminCustomers = lazy(() => import('@/features/admin/pages/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminCategories = lazy(() => import('@/features/admin/pages/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminCoupons = lazy(() => import('@/features/admin/pages/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminReviews = lazy(() => import('@/features/admin/pages/AdminReviews').then(m => ({ default: m.AdminReviews })));
const AdminSettings = lazy(() => import('@/features/admin/pages/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminCollections = lazy(() => import('@/features/admin/pages/AdminCollections').then(m => ({ default: m.AdminCollections })));
const AdminInquiries = lazy(() => import('@/features/admin/pages/AdminInquiries').then(m => ({ default: m.AdminInquiries })));
const AdminLogin = lazy(() => import('@/features/admin/pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminUsers = lazy(() => import('@/features/admin/pages/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminAuditLogs = lazy(() => import('@/features/admin/pages/AdminAuditLogs').then(m => ({ default: m.AdminAuditLogs })));
const AdminAnnouncements = lazy(() => import('@/features/admin/pages/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })));
const AdminBanners = lazy(() => import('@/features/admin/pages/AdminBanners').then(m => ({ default: m.AdminBanners })));
const AdminProfile = lazy(() => import('@/features/admin/pages/AdminProfile').then(m => ({ default: m.AdminProfile })));
const AdminProductEditor = lazy(() => import('@/features/admin/pages/AdminProductEditor').then(m => ({ default: m.AdminProductEditor })));
const AdminSetupPassword = lazy(() => import('@/features/admin/pages/AdminSetupPassword').then(m => ({ default: m.AdminSetupPassword })));
const AdminCampaigns = lazy(() => import('@/features/admin/pages/AdminCampaigns').then(m => ({ default: m.AdminCampaigns })));
const AdminEmailSettings = lazy(() => import('@/features/admin/pages/AdminEmailSettings').then(m => ({ default: m.AdminEmailSettings })));
const UnsubscribePage = lazy(() => import('@/features/customers/pages/UnsubscribePage').then(m => ({ default: m.UnsubscribePage })));

const LoadingFallback: React.FC = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid rgba(212, 175, 55, 0.2)',
      borderTopColor: '#d4af37',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '0.85rem', color: 'var(--brand-muted)', letterSpacing: '0.05em' }}>
      Loading MUETY...
    </span>
  </div>
);

/**
 * Handles redirecting visitors to the dedicated admin portal subdomain in production.
 */
const AdminRedirectToSubdomain: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const target = getAdminPortalUrl(window.location.pathname + window.location.search);
      window.location.replace(target);
    }
  }, []);

  return <LoadingFallback />;
};

const CustomerLayout: React.FC = () => {
  return (
    <div className="storefront-app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AnnouncementBar />
      <Header />
      <main style={{ flex: 1 }}>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <CartDrawer />
      <PatronAuthModal />
      <MobileBottomNav />
      <Footer />
    </div>
  );
};

export const AppRouter: React.FC = () => {
  const onAdminDomain = isAdminDomain();

  // 1. DEDICATED ADMIN SUBDOMAIN ROUTING (admin.muety.in)
  if (onAdminDomain) {
    return (
      <>
        <ScrollToTop />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Direct Admin Auth Routes */}
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/setup-password" element={<AdminSetupPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/setup-password" element={<AdminSetupPassword />} />

            {/* Root on admin subdomain directs to dashboard */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Direct shortcuts without /admin prefix on admin.muety.in */}
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/profile" element={<Navigate to="/admin/profile" replace />} />
            <Route path="/products" element={<Navigate to="/admin/products" replace />} />
            <Route path="/products/new" element={<Navigate to="/admin/products/new" replace />} />
            <Route path="/products/:id/edit" element={<Navigate to="/admin/products/:id/edit" replace />} />
            <Route path="/orders" element={<Navigate to="/admin/orders" replace />} />
            <Route path="/inquiries" element={<Navigate to="/admin/inquiries" replace />} />
            <Route path="/reviews" element={<Navigate to="/admin/reviews" replace />} />
            <Route path="/customers" element={<Navigate to="/admin/customers" replace />} />
            <Route path="/categories" element={<Navigate to="/admin/categories" replace />} />
            <Route path="/collections" element={<Navigate to="/admin/collections" replace />} />
            <Route path="/coupons" element={<Navigate to="/admin/coupons" replace />} />
            <Route path="/announcements" element={<Navigate to="/admin/announcements" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/admins" element={<Navigate to="/admin/admins" replace />} />
            <Route path="/audit-logs" element={<Navigate to="/admin/audit-logs" replace />} />

            {/* Core Protected Admin Management Hierarchy */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductEditor />} />
              <Route path="products/:id/edit" element={<AdminProductEditor />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="inquiries" element={<AdminInquiries />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="collections" element={<AdminCollections />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="admins" element={<ProtectedRoute requiredRoles={['superadmin', 'super_admin']}><AdminUsers /></ProtectedRoute>} />
              <Route path="audit-logs" element={<ProtectedRoute requiredRoles={['superadmin', 'super_admin', 'admin']}><AdminAuditLogs /></ProtectedRoute>} />
            </Route>

            {/* Catch-all on admin subdomain safely stays in admin panel */}
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  // 2. STOREFRONT ROUTING (store.muety.in / muety.in / localhost)
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Admin routes on Storefront: In production redirect to admin.muety.in; in local dev allow access */}
          <Route 
            path="/admin/login" 
            element={!isLocalOrDev() ? <AdminRedirectToSubdomain /> : <AdminLogin />} 
          />
          <Route 
            path="/admin/setup-password" 
            element={!isLocalOrDev() ? <AdminRedirectToSubdomain /> : <AdminSetupPassword />} 
          />

          <Route 
            path="/admin" 
            element={
              !isLocalOrDev() ? (
                <AdminRedirectToSubdomain />
              ) : (
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout />
                </ProtectedRoute>
              )
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductEditor />} />
            <Route path="products/:id/edit" element={<AdminProductEditor />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="inquiries" element={<AdminInquiries />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="collections" element={<AdminCollections />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="email-settings" element={<AdminEmailSettings />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="admins" element={<ProtectedRoute requiredRoles={['superadmin', 'super_admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="audit-logs" element={<ProtectedRoute requiredRoles={['superadmin', 'super_admin', 'admin']}><AdminAuditLogs /></ProtectedRoute>} />
          </Route>

          {/* Customer Storefront Routes wrapped in CustomerLayout */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:slug" element={<CategoryProductsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Brand & Policy Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPage />} />
            <Route path="/terms-conditions" element={<TermsPage />} />
            <Route path="/shipping-policy" element={<ShippingPage />} />
            <Route path="/return-refund-policy" element={<ReturnRefundPage />} />
            <Route path="/refund-policy" element={<Navigate to="/return-refund-policy" replace />} />
            <Route path="/returns-policy" element={<Navigate to="/return-refund-policy" replace />} />
            <Route path="/cancellation-policy" element={<Navigate to="/return-refund-policy" replace />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/customer-support" element={<Navigate to="/contact" replace />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
};
