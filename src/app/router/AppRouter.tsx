import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Header } from '@/shared/components/ui/Header';
import { Footer } from '@/shared/components/ui/Footer';
import { CartDrawer } from '@/features/cart/components/CartDrawer';
import { AnnouncementBar } from '@/shared/components/ui/AnnouncementBar';
import { ProtectedRoute } from '@/shared/components/ui/ProtectedRoute';
import { MobileBottomNav } from '@/shared/components/ui/MobileBottomNav';
import { ScrollToTop } from '@/shared/components/ui/ScrollToTop';

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
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const AboutPage = lazy(() => import('@/features/info/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('@/features/inquiries/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import('@/features/info/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/features/info/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const ShippingPage = lazy(() => import('@/features/info/pages/ShippingPage').then(m => ({ default: m.ShippingPage })));
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
const AdminInquiries = lazy(() => import('@/features/admin/pages/AdminInquiries').then(m => ({ default: m.AdminInquiries })));
const AdminLogin = lazy(() => import('@/features/admin/pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminUsers = lazy(() => import('@/features/admin/pages/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminAuditLogs = lazy(() => import('@/features/admin/pages/AdminAuditLogs').then(m => ({ default: m.AdminAuditLogs })));

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

const CustomerLayout: React.FC = () => {
  return (
    <div className="storefront-app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AnnouncementBar />
      <Header />
      <main style={{ flex: 1 }}>
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <CartDrawer />
      <MobileBottomNav />
      <Footer />
    </div>
  );
};

export const AppRouter: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />

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
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="inquiries" element={<AdminInquiries />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="admins" element={<ProtectedRoute requiredRoles={['super_admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="audit-logs" element={<ProtectedRoute requiredRoles={['super_admin', 'admin']}><AdminAuditLogs /></ProtectedRoute>} />
          </Route>

          {/* Customer Storefront */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:slug" element={<CategoryProductsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Brand & Policy Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPage />} />
            <Route path="/terms-conditions" element={<TermsPage />} />
            <Route path="/shipping-policy" element={<ShippingPage />} />
            <Route path="/refund-policy" element={<Navigate to="/shipping-policy" replace />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/customer-support" element={<Navigate to="/contact" replace />} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
};
