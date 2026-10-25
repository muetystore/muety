import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { useCart } from '@/shared/context/CartContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Logo } from '@/shared/components/ui/Logo';
import { 
  X, 
  Smartphone, 
  ArrowRight, 
  ArrowLeft,
  ShoppingBag, 
  Heart, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Tag, 
  Truck,
  Edit3,
  RotateCcw
} from 'lucide-react';

interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'United States / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' }
];

export const PatronAuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalConfig, 
    loginWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    setupRecaptcha,
    recordPatronCircleConsent
  } = useAuth();

  const { items, subtotal, appliedCoupon, wishlist } = useCart();
  const { success, error, info } = useNotification();
  const navigate = useNavigate();

  // Mode: 'choices' | 'phone_step1' | 'phone_step2'
  const [authMode, setAuthMode] = useState<'choices' | 'phone_step1' | 'phone_step2'>('choices');

  // Phone Auth State
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Patron Circle Consent (Unchecked by default)
  const [patronCircleOptIn, setPatronCircleOptIn] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<any>(null);

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
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    };
  }, [isAuthModalOpen, closeAuthModal]);

  // Resend OTP countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isAuthModalOpen) return null;

  const targetPath = authModalConfig?.redirectPath || '/checkout';

  const handleAuthSuccess = async (u: any) => {
    // Record Patron Circle opt-in if selected
    if (patronCircleOptIn && u?.uid) {
      await recordPatronCircleConsent(u.uid, true, u.email, u.phoneNumber);
    }

    closeAuthModal();
    const name = u.displayName ? u.displayName.split(' ')[0] : 'Patron';
    success(`Welcome back, ${name}. Moving to secure checkout.`, 'Signed In');

    if (authModalConfig?.onSuccess) {
      authModalConfig.onSuccess();
    } else {
      navigate(targetPath);
    }
  };

  const initRecaptcha = () => {
    try {
      if (recaptchaVerifierRef.current) {
        return recaptchaVerifierRef.current;
      }
      const verifier = setupRecaptcha('modal-recaptcha-container', {
        size: 'invisible'
      });
      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (err: any) {
      console.warn('[PatronAuthModal] Recaptcha note:', err);
      try {
        const container = document.getElementById('modal-recaptcha-container');
        if (container) container.innerHTML = '';
        const fallback = setupRecaptcha('modal-recaptcha-container', { size: 'invisible' });
        recaptchaVerifierRef.current = fallback;
        return fallback;
      } catch (retryErr) {
        console.warn('[PatronAuthModal] Recaptcha retry failed:', retryErr);
        return null;
      }
    }
  };

  // 1. Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setFormError(null);
    try {
      const u = await loginWithGoogle(false);
      await handleAuthSuccess(u);
    } catch (err: any) {
      const msg = err?.message || 'Google Authentication was cancelled or encountered an error.';
      setFormError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Mobile Number Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (!cleanDigits) {
      setFormError('Please enter your mobile phone number.');
      return;
    }
    if (countryCode === '+91' && cleanDigits.length !== 10) {
      setFormError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      setFormError('Please enter a valid mobile number.');
      return;
    }

    const fullPhoneNumber = `${countryCode}${cleanDigits}`;

    setLoading(true);
    try {
      const appVerifier = initRecaptcha();
      const result = await sendPhoneOtp(fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      setAuthMode('phone_step2');
      setResendCooldown(30);
      setOtpCode('');
      info(`Verification code sent to ${fullPhoneNumber}.`, 'SMS Dispatched');
    } catch (err: any) {
      const msg = err?.message || 'Failed to send verification SMS. Please check your mobile number.';
      setFormError(msg);
      error(msg);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
      const container = document.getElementById('modal-recaptcha-container');
      if (container) {
        try {
          container.innerHTML = '';
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Mobile Number Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setFormError('Please enter the full 6-digit OTP code.');
      return;
    }

    if (!confirmationResult) {
      setFormError('Session expired. Please request a new verification code.');
      setAuthMode('phone_step1');
      return;
    }

    setLoading(true);
    try {
      const user = await verifyPhoneOtp(confirmationResult, cleanCode);
      await handleAuthSuccess(user);
    } catch (err: any) {
      const msg = err?.message || 'Incorrect verification code. Please check your SMS and try again.';
      setFormError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const hasSessionActivity = items.length > 0 || (wishlist && wishlist.length > 0);
  const fullDisplayPhone = `${countryCode} ${phoneNumber.replace(/\D/g, '')}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Patron Sign In"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="card auth-modal-card"
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(201, 162, 39, 0.25)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          type="button"
          aria-label="Close authentication modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            zIndex: 10,
            transition: 'all 0.15s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{
          padding: '1.75rem 1.75rem 0',
          textAlign: 'center',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
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
            marginBottom: '0.4rem'
          }}>
            <Sparkles size={12} />
            <span>Patron Privilege Checkout</span>
          </div>

          <h2 style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-heading)',
            color: 'var(--brand-primary, #10182d)',
            margin: '0 0 0.35rem 0',
            fontWeight: 800
          }}>
            Sign in to MUETY
          </h2>

          <p style={{
            fontSize: '0.86rem',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.45
          }}>
            {authModalConfig?.message || 'Access your orders, wishlist and account.'}
          </p>
        </div>

        {/* Active Session Mini Preview */}
        {hasSessionActivity && (
          <div style={{
            margin: '1rem 1.75rem 0',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            backgroundColor: '#fffdf7',
            border: '1.5px solid rgba(201, 162, 39, 0.35)',
            boxShadow: '0 2px 6px rgba(201, 162, 39, 0.06)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.4rem'
            }}>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#b38a1b',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <ShoppingBag size={13} />
                Active Atelier Reservation
              </span>
              <span style={{
                fontSize: '0.86rem',
                fontWeight: 800,
                color: '#0f172a'
              }}>
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            {items.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                {items.length} handloom{items.length > 1 ? 's' : ''} reserved in your bag.
              </div>
            )}
          </div>
        )}

        {/* Modal Form Body */}
        <div style={{ padding: '1.25rem 1.75rem 1.75rem', overflowY: 'auto' }}>
          {formError && (
            <div 
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '0.84rem',
                marginBottom: '1rem',
                lineHeight: 1.4
              }}
              role="alert"
            >
              {formError}
            </div>
          )}

          {/* STATE 1: PRIMARY OPTIONS */}
          {authMode === 'choices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                type="button"
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '12px',
                  backgroundColor: 'var(--brand-primary, #10182d)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '0.4rem 0', color: '#94a3b8' }}>
                <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
                <span style={{ fontSize: '0.74rem', padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>OR</span>
                <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
              </div>

              <button 
                onClick={() => {
                  setAuthMode('phone_step1');
                  setFormError(null);
                }}
                disabled={loading}
                type="button"
                className="btn btn-outline"
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: 'var(--brand-primary, #10182d)',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={18} color="var(--brand-accent, #c9a227)" />
                <span>Continue with mobile number</span>
              </button>
            </div>
          )}

          {/* STATE 2: ENTER MOBILE NUMBER */}
          {authMode === 'phone_step1' && (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--brand-primary, #10182d)', display: 'block', marginBottom: '6px' }}>
                  Mobile Phone Number
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{
                      width: '115px',
                      height: '46px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      padding: '0 6px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: 'var(--brand-primary, #10182d)'
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.country} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    required
                    autoFocus
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                    placeholder={countryCode === '+91' ? '98765 43210' : 'Mobile number'}
                    style={{
                      flex: 1,
                      height: '46px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 12px',
                      fontSize: '0.96rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !phoneNumber.trim()}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  height: '46px', 
                  backgroundColor: 'var(--brand-primary, #10182d)', 
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  borderRadius: '8px'
                }}
              >
                {loading ? 'Sending Verification Code...' : 'Send Verification Code'} <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('choices');
                  setFormError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '2px'
                }}
              >
                <ArrowLeft size={13} /> Back to Google Sign-In
              </button>
            </form>
          )}

          {/* STATE 3: ENTER OTP */}
          {authMode === 'phone_step2' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Code Sent To</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{fullDisplayPhone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('phone_step1');
                    setOtpCode('');
                    setFormError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c9a227',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit3 size={13} /> Edit
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--brand-primary, #10182d)', display: 'block', marginBottom: '6px' }}>
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '8px',
                    border: '2px solid var(--brand-accent, #c9a227)',
                    padding: '0 12px',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || otpCode.length !== 6}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  height: '46px', 
                  backgroundColor: 'var(--brand-primary, #10182d)', 
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  borderRadius: '8px'
                }}
              >
                {loading ? 'Verifying Code...' : 'Verify & Proceed'} <CheckCircle2 size={15} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Didn't receive code?</span>
                {resendCooldown > 0 ? (
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c9a227',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <RotateCcw size={12} /> Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* TASK 3: OPTIONAL PATRON CIRCLE OPT-IN CHECKBOX */}
          <div 
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <input 
              type="checkbox"
              id="modal-patron-circle-opt-in"
              checked={patronCircleOptIn}
              onChange={(e) => setPatronCircleOptIn(e.target.checked)}
              style={{ 
                marginTop: '3px', 
                cursor: 'pointer', 
                accentColor: 'var(--brand-accent, #c9a227)',
                width: '15px',
                height: '15px'
              }}
            />
            <label 
              htmlFor="modal-patron-circle-opt-in"
              style={{ 
                fontSize: '0.8rem', 
                color: 'var(--brand-primary, #10182d)', 
                lineHeight: 1.45, 
                cursor: 'pointer' 
              }}
            >
              Yes, I'd like to join the MUETY Patron Circle and receive exclusive collection previews, bridal updates and invitations.
            </label>
          </div>

          {/* Terms & Privacy */}
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
              By continuing, you acknowledge MUETY's{' '}
              <Link to="/terms-conditions" target="_blank" style={{ color: '#c9a227', textDecoration: 'underline', fontWeight: 600 }}>
                Terms & Conditions
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" target="_blank" style={{ color: '#c9a227', textDecoration: 'underline', fontWeight: 600 }}>
                Privacy Policy
              </Link>.
            </p>
          </div>

          {/* Security badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.74rem',
            color: '#64748b'
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>256-Bit Encrypted Patron Session Vault</span>
          </div>

          <div id="modal-recaptcha-container" />
        </div>
      </div>
    </div>
  );
};
