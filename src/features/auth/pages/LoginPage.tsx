import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Logo } from '@/shared/components/ui/Logo';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  useDocumentTitle('Sign In | MUETY Atelier');
  const { login, loginWithGoogle, sendPasswordReset } = useAuth();
  const { error, success, info } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      error('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      success(`Welcome back, ${user.displayName || 'Patron'}.`, 'Authentication Successful');
      navigate(from, { replace: true });
    } catch (err: any) {
      error(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      success(`Welcome to MUETY, ${user.displayName}.`, 'Authenticated via Google');
      navigate(from, { replace: true });
    } catch (err: any) {
      error(err?.message || 'Google Authentication was cancelled or encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      error('Please enter your email address for password reset.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(resetEmail);
      info('Password reset instructions have been sent to your email address.', 'Reset Email Dispatched');
      setForgotPasswordOpen(false);
    } catch (err: any) {
      error(err.message || 'Could not dispatch password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page animate-fade-in" style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      backgroundColor: 'var(--bg-main)'
    }}>
      <div className="card" style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem 2.25rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--brand-border)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Logo size="lg" />
          </div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Sign In to Atelier
          </h1>
          <p style={{ color: 'var(--brand-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Access your private orders, wishlist, and concierge services.
          </p>
        </div>

        {/* Email Password Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="patron@example.com"
                className="form-input"
                style={{ paddingLeft: '2.6rem', height: '46px' }}
              />
              <Mail size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                Password
              </label>
              <button 
                type="button" 
                onClick={() => setForgotPasswordOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Forgot?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '2.6rem', paddingRight: '2.6rem', height: '46px' }}
              />
              <Lock size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--brand-muted)', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary btn-lg" 
            style={{ width: '100%', height: '48px', marginTop: '0.5rem', fontWeight: 700 }}
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--brand-muted)' }}>
          <div style={{ flex: 1, borderBottom: '1px solid var(--brand-border)' }} />
          <span style={{ fontSize: '0.78rem', padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
          <div style={{ flex: 1, borderBottom: '1px solid var(--brand-border)' }} />
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="btn btn-outline"
          style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--brand-border)', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--brand-muted)' }}>
            New to MUETY?{' '}
            <Link to="/register" style={{ color: 'var(--brand-accent)', fontWeight: 700, textDecoration: 'none' }}>
              Create an Account
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: '420px', width: '100%', backgroundColor: '#ffffff', padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: 'var(--brand-primary)' }}>
              <KeyRound size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reset Password</h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--brand-muted)', marginBottom: '1.25rem' }}>
              Enter your registered email address and Firebase Authentication will dispatch password reset instructions.
            </p>
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="email" 
                required 
                value={resetEmail} 
                onChange={e => setResetEmail(e.target.value)} 
                placeholder="your.email@example.com"
                className="form-input"
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setForgotPasswordOpen(false)} className="btn btn-outline btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
