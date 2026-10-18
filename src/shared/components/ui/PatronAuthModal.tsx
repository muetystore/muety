import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { useCart } from '@/shared/context/CartContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Logo } from '@/shared/components/ui/Logo';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ShoppingBag, 
  Heart, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Tag, 
  Truck 
} from 'lucide-react';

export const PatronAuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalConfig, 
    login, 
    register, 
    loginWithGoogle, 
    sendPasswordReset 
  } = useAuth();

  const { items, subtotal, appliedCoupon, wishlist } = useCart();
  const { success, error, info } = useNotification();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAuthModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const targetPath = authModalConfig?.redirectPath || '/checkout';

  const handleAuthSuccess = (u: any, mode: 'login' | 'register' | 'google') => {
    closeAuthModal();
    const name = u.displayName ? u.displayName.split(' ')[0] : 'Patron';
    if (mode === 'register') {
      success(`Welcome to the MUETY Atelier, ${name}. Your session has been bound to your account.`, 'Account Created');
    } else {
      success(`Welcome back, ${name}. Moving to secure checkout.`, 'Signed In');
    }

    if (authModalConfig?.onSuccess) {
      authModalConfig.onSuccess();
    } else {
      navigate(targetPath);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      error('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      handleAuthSuccess(u, 'login');
    } catch (err: any) {
      error(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      error('Please accept the Terms & Conditions and Privacy Policy.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      error('Please complete all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      error('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      error('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const u = await register(email.trim(), password, fullName.trim());
      handleAuthSuccess(u, 'register');
    } catch (err: any) {
      error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (activeTab === 'register' && !acceptedTerms) {
      error('Please accept the Terms & Conditions and Privacy Policy.');
      return;
    }
    setLoading(true);
    try {
      const u = await loginWithGoogle();
      handleAuthSuccess(u, 'google');
    } catch (err: any) {
      error(err.message || 'Google sign-in was cancelled or encountered an error.');
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
      await sendPasswordReset(resetEmail.trim());
      info('Password reset instructions have been sent to your email address.', 'Reset Email Sent');
      setForgotPasswordOpen(false);
    } catch (err: any) {
      error(err.message || 'Could not send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const hasSessionActivity = items.length > 0 || (wishlist && wishlist.length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Patron Sign In"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          border: '1.5px solid rgba(201, 162, 39, 0.45)',
          overflowY: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close authentication modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.15s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{
          padding: '2rem 2rem 1.25rem',
          textAlign: 'center',
          backgroundColor: '#faf8f5',
          borderBottom: '1px solid #f1ece4'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size="md" />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(201, 162, 39, 0.12)',
            color: '#b38a1b',
            fontSize: '0.74rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem'
          }}>
            <Sparkles size={12} />
            <span>Patron Privilege Checkout</span>
          </div>

          <h2 style={{
            fontSize: '1.45rem',
            fontFamily: 'var(--font-heading)',
            color: '#0f172a',
            margin: '0 0 0.4rem 0',
            fontWeight: 800
          }}>
            Sign In to Complete Your Order
          </h2>

          <p style={{
            fontSize: '0.86rem',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            {authModalConfig?.message || 'Please sign in or register to secure your handloom reservation and proceed to checkout.'}
          </p>
        </div>

        {/* BEFORE-LOGIN ACTIVITIES OF THE MUETY SESSION */}
        {hasSessionActivity && (
          <div style={{
            margin: '1.25rem 1.75rem 0',
            padding: '1rem 1.15rem',
            borderRadius: '12px',
            backgroundColor: '#fffdf7',
            border: '1.5px solid rgba(201, 162, 39, 0.35)',
            boxShadow: '0 2px 8px rgba(201, 162, 39, 0.06)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem'
            }}>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: '#b38a1b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShoppingBag size={14} />
                Your Active Atelier Session
              </span>
              <span style={{
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#0f172a'
              }}>
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Mini preview of cart items */}
            {items.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '6px',
                marginBottom: '6px'
              }}>
                {items.slice(0, 3).map((item, idx) => {
                  const img = (item.product?.images && item.product.images[0]) || '/saree_model_individual.jpg';
                  return (
                    <div
                      key={item.product?.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e7e2dc',
                        borderRadius: '8px',
                        padding: '4px 8px 4px 4px',
                        minWidth: '170px',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={img}
                        alt={item.product?.name || 'Saree'}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '120px'
                        }}>
                          {item.product?.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Qty: {item.quantity} • {item.selectedColor || 'Classic'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {items.length > 3 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px'
                  }}>
                    +{items.length - 3} more
                  </div>
                )}
              </div>
            )}

            {/* Badges: Applied Promo, Wishlist, Insured Courier */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '0.72rem',
              color: '#475569',
              marginTop: '4px'
            }}>
              {appliedCoupon && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  <Tag size={11} /> Promo "{appliedCoupon.code}" Active
                </span>
              )}

              {wishlist && wishlist.length > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#fdf2f8',
                  color: '#9d174d',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}>
                  <Heart size={11} /> {wishlist.length} in Wishlist
                </span>
              )}

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#f8fafc',
                color: '#475569',
                padding: '2px 7px',
                borderRadius: '4px'
              }}>
                <Truck size={11} /> Pan-India Courier (₹89 Flat)
              </span>
            </div>

            <p style={{
              fontSize: '0.72rem',
              color: '#64748b',
              margin: '6px 0 0',
              fontStyle: 'italic'
            }}>
              ✨ All active bag items, discounts, and preferences will be seamlessly bound to your account upon signing in.
            </p>
          </div>
        )}

        {/* Modal Body / Tab Switcher */}
        <div style={{ padding: '1.25rem 1.75rem 2rem' }}>
          {!forgotPasswordOpen ? (
            <>
              {/* Tab Selector */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                backgroundColor: '#f1f5f9',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '1.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'signin' ? '#ffffff' : 'transparent',
                    color: activeTab === 'signin' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'signin' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'register' ? '#ffffff' : 'transparent',
                    color: activeTab === 'register' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'register' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Create Account
                </button>
              </div>

              {/* Form 1: Sign In */}
              {activeTab === 'signin' ? (
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '5px' }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patron@example.com"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem', height: '44px', fontSize: '0.9rem' }}
                      />
                      <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        style={{ background: 'none', border: 'none', color: '#c9a227', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Forgot?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', height: '44px', fontSize: '0.9rem' }}
                      />
                      <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      height: '46px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '0.25rem'
                    }}
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In & Proceed to Checkout'}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                /* Form 2: New Patron Registration */
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Priyadharshini"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem', height: '42px', fontSize: '0.9rem' }}
                      />
                      <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patron@example.com"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem', height: '42px', fontSize: '0.9rem' }}
                      />
                      <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                        Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                        Confirm
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••"
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    marginTop: '2px'
                  }}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <span>
                      I accept the MUETY Terms & Conditions and Privacy Policy.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-accent"
                    style={{
                      width: '100%',
                      height: '46px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '0.25rem'
                    }}
                  >
                    <span>{loading ? 'Creating Account...' : 'Create Account & Proceed'}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {/* Google Sign In Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '1.15rem 0', color: '#94a3b8' }}>
                <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
                <span style={{ fontSize: '0.74rem', padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
                <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '0.88rem'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          ) : (
            /* Forgot Password Sub-View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <KeyRound size={20} color="#c9a227" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Reset Password</h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                Enter your registered email address and we will dispatch password reset instructions.
              </p>
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="form-input"
                  style={{ height: '44px' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(false)}
                    className="btn btn-outline btn-sm"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-sm"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Secure Patron Trust Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            <ShieldCheck size={15} color="#10b981" />
            <span>256-Bit Encrypted Patron Session Vault</span>
          </div>
        </div>
      </div>
    </div>
  );
};
