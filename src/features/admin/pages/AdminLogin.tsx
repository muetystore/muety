import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import { hasAnyRole } from '@/shared/utils/permissions';

export const AdminLogin: React.FC = () => {
  useDocumentTitle('MUETY Admin | Login');
  const { login } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter your admin credentials.');
      return;
    }

    setLoading(true);
    try {
      const authenticatedUser = await login(email, password);
      const isAuthorized = hasAnyRole(authenticatedUser, [
        'super_admin', 
        'admin', 
        'catalog_manager', 
        'order_manager', 
        'support_agent'
      ]);

      if (!isAuthorized) {
        error('Access Denied: This account lacks executive role authorization.');
        return;
      }

      success('Authorized. Welcome to the MUETY Executive Control Suite.', 'Access Granted');
      navigate(from, { replace: true });
    } catch (err: any) {
      error(err.message || 'Administrative authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#0f172a',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid #1e293b',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        padding: '2.5rem 2.25rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            padding: '2px',
            background: 'linear-gradient(135deg, #f59e0b, #d4af37, #b45309, #d4af37)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
            margin: '0 auto 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img 
              src="/muety-logo.png" 
              alt="MUETY Logo" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
            />
          </div>

          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '1.5rem',
            letterSpacing: '0.2em',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span>MUETY</span>
            <span style={{ 
              fontSize: '0.65rem', 
              backgroundColor: '#d4af37', 
              color: '#0f172a', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              letterSpacing: '0.08em',
              fontWeight: 800
            }}>
              ADMIN
            </span>
          </div>

          <h3 style={{ fontSize: '1.05rem', color: '#cbd5e1', marginTop: '8px', fontWeight: 500 }}>
            Executive Control Portal
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Shield size={12} color="#d4af37" /> Firebase Multi-Role Auth Guard
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Executive Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="executive@muety.in"
                className="form-input"
                style={{
                  backgroundColor: '#161f33',
                  borderColor: '#2b3952',
                  color: '#ffffff',
                  paddingLeft: '2.5rem',
                  borderRadius: 'var(--radius-md)',
                  height: '46px'
                }}
              />
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Account Password
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="form-input"
                style={{
                  backgroundColor: '#161f33',
                  borderColor: '#2b3952',
                  color: '#ffffff',
                  paddingLeft: '2.5rem',
                  paddingRight: '2.5rem',
                  borderRadius: 'var(--radius-md)',
                  height: '46px'
                }}
              />
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-accent btn-lg" 
            style={{ 
              width: '100%', 
              marginTop: '0.5rem',
              height: '48px',
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}
          >
            {loading ? 'Authenticating Security Claims...' : 'Authorize Access'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Return to Public Customer Website
          </Link>
        </div>
      </div>
    </div>
  );
};
