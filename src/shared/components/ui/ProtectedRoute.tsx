import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { AppRole, Permission, hasAnyRole, hasPermission, getUserRoles } from '@/shared/utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRoles?: AppRole[];
  requiredPermission?: Permission;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requiredRoles,
  requiredPermission
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--brand-border)',
          borderTopColor: 'var(--brand-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verifying MUETY Security Credentials...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (requireAdmin || requiredRoles || requiredPermission) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = getUserRoles(user);
  let isAuthorized = true;

  if (requireAdmin) {
    isAuthorized = hasAnyRole(user, ['super_admin', 'admin', 'catalog_manager', 'order_manager', 'support_agent']);
  }

  if (isAuthorized && requiredRoles && requiredRoles.length > 0) {
    isAuthorized = hasAnyRole(user, requiredRoles);
  }

  if (isAuthorized && requiredPermission) {
    isAuthorized = hasPermission(user, requiredPermission);
  }

  if (!isAuthorized) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid #fee2e2',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#ef4444'
          }}>
            <ShieldAlert size={34} />
          </div>

          <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            MUETY Security: Access Denied
          </h2>

          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Your account lacks authorization for this executive action.
          </p>

          <div style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--brand-border)',
            fontSize: '0.85rem',
            color: 'var(--brand-muted)',
            marginBottom: '1.75rem',
            textAlign: 'left'
          }}>
            <strong>Logged in as:</strong> {user.email}<br />
            <strong>Assigned Roles:</strong> {userRoles.join(', ')}<br />
            {requiredPermission && <><strong>Required Permission:</strong> {requiredPermission}</>}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary btn-sm">
              <ArrowLeft size={16} /> Return to Storefront
            </Link>
            <Link to="/admin/login" className="btn btn-outline btn-sm">
              Admin Login Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
