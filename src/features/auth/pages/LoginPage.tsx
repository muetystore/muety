import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Logo } from '@/shared/components/ui/Logo';
import { useCart } from '@/shared/context/CartContext';
import { 
  Smartphone, 
  ArrowRight, 
  ShoppingBag, 
  Heart, 
  Tag, 
  Sparkles, 
  Edit3, 
  RotateCcw, 
  CheckCircle2, 
  ArrowLeft,
  ShieldCheck 
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

export const LoginPage: React.FC = () => {
  useDocumentTitle('Sign In | MUETY');
  const { 
    loginWithGoogle, 
    sendPhoneOtp, 
    verifyPhoneOtp, 
    setupRecaptcha, 
    recordPatronCircleConsent 
  } = useAuth();
  const { items, subtotal, appliedCoupon, wishlist } = useCart();
  const { error, success, info } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const from = redirectParam || (location.state as any)?.from?.pathname || '/account';

  // Mode: 'choices' (primary Google + Mobile button) | 'phone_step1' (enter number) | 'phone_step2' (enter OTP)
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

  // Recaptcha verifier ref
  const recaptchaVerifierRef = useRef<any>(null);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const initRecaptcha = () => {
    try {
      if (recaptchaVerifierRef.current) {
        return recaptchaVerifierRef.current;
      }
      const verifier = setupRecaptcha('recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (err: any) {
      console.warn('[LoginPage] Recaptcha initialization note:', err);
      return null;
    }
  };

  // 1. Google Sign-In Flow
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setFormError(null);

    // Save patron circle opt-in intent in sessionStorage for mobile redirects
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('muety_patron_opt_in', patronCircleOptIn ? 'true' : 'false');
    }

    try {
      const user = await loginWithGoogle(true);
      if (user) {
        // Record patron circle consent if opted in
        if (patronCircleOptIn) {
          await recordPatronCircleConsent(user.uid, true, user.email, user.phoneNumber);
        }
        success(`Welcome to MUETY, ${user.displayName || 'Patron'}.`, 'Signed In Successfully');
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const msg = err?.message || 'Google Authentication encountered an error.';
      setFormError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Mobile Phone Step 1: Send OTP
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
      const msg = err?.message || 'Failed to send verification SMS. Please verify your mobile number.';
      setFormError(msg);
      error(msg);
      // Reset recaptcha on error so next attempt gets a fresh verifier
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Mobile Phone Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setFormError('Please enter the full 6-digit OTP verification code.');
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
      if (user) {
        // Record patron circle consent if opted in
        if (patronCircleOptIn) {
          await recordPatronCircleConsent(user.uid, true, user.email, user.phoneNumber);
        }
        success(`Welcome to MUETY, ${user.displayName || 'Patron'}.`, 'Verified Successfully');
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const msg = err?.message || 'Incorrect verification code. Please check your SMS and try again.';
      setFormError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fullDisplayPhone = `${countryCode} ${phoneNumber.replace(/\D/g, '')}`;

  return (
    <div 
      className="login-page animate-fade-in" 
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(2rem, 5vw, 4rem) 1.25rem',
        backgroundColor: 'var(--bg-main, #fbfaf6)'
      }}
    >
      <div 
        className="card auth-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl, 16px)',
          padding: 'clamp(2rem, 5vw, 2.75rem) clamp(1.5rem, 5vw, 2.25rem)',
          boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04))',
          border: '1px solid var(--brand-border, #e2e8f0)',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size="lg" />
          </div>
          <h1 
            style={{ 
              fontSize: 'clamp(1.45rem, 3.5vw, 1.7rem)', 
              color: 'var(--brand-primary, #10182d)', 
              fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)', 
              fontWeight: 800,
              letterSpacing: '-0.01em',
              margin: '0 0 6px 0'
            }}
          >
            Sign in to MUETY
          </h1>
          <p style={{ color: 'var(--brand-muted, #64748b)', fontSize: '0.92rem', margin: 0, lineHeight: 1.45 }}>
            Access your orders, wishlist and account.
          </p>
        </div>

        {/* Before-Login Active Atelier Session Activities Preview */}
        {(items.length > 0 || (wishlist && wishlist.length > 0)) && (
          <div 
            style={{
              padding: '0.9rem 1rem',
              borderRadius: '12px',
              backgroundColor: '#fffdf7',
              border: '1.5px solid rgba(201, 162, 39, 0.4)',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 6px rgba(201, 162, 39, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b38a1b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShoppingBag size={13} /> Active Bag Session
              </span>
              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            {items.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '6px' }}>
                {items.length} handloom{items.length > 1 ? 's' : ''} in your bag ({items.map(i => i.product?.name).slice(0, 2).join(', ')}{items.length > 2 ? '...' : ''}).
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.72rem' }}>
              {appliedCoupon && (
                <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Tag size={10} /> Coupon "{appliedCoupon.code}" Active
                </span>
              )}
              {wishlist && wishlist.length > 0 && (
                <span style={{ backgroundColor: '#fdf2f8', color: '#9d174d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Heart size={10} /> {wishlist.length} in Wishlist
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Alert Display */}
        {formError && (
          <div 
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4
            }}
            role="alert"
          >
            {formError}
          </div>
        )}

        {/* =========================================================================
            STATE 1: PRIMARY CHOICES (Google or Mobile Number)
            ========================================================================= */}
        {authMode === 'choices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Primary Action: Continue with Google */}
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                height: '50px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px',
                backgroundColor: 'var(--brand-primary, #10182d)',
                color: '#ffffff',
                border: '1px solid var(--brand-primary, #10182d)',
                borderRadius: 'var(--radius-md, 8px)',
                fontWeight: 700,
                fontSize: '0.96rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(16, 24, 45, 0.12)',
                transition: 'all 0.2s ease'
              }}
              aria-label="Continue with Google"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Subtle Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '0.65rem 0', color: 'var(--brand-muted, #8e9aa8)' }}>
              <div style={{ flex: 1, borderBottom: '1px solid var(--brand-border, #e2e8f0)' }} />
              <span style={{ fontSize: '0.78rem', padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                OR
              </span>
              <div style={{ flex: 1, borderBottom: '1px solid var(--brand-border, #e2e8f0)' }} />
            </div>

            {/* Secondary Action: Continue with Mobile Number */}
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
                height: '50px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px',
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--brand-border, #cbd5e1)',
                color: 'var(--brand-primary, #10182d)',
                borderRadius: 'var(--radius-md, 8px)',
                fontWeight: 700,
                fontSize: '0.96rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              aria-label="Continue with mobile number"
            >
              <Smartphone size={19} color="var(--brand-accent, #c9a227)" />
              <span>Continue with mobile number</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            STATE 2: PHONE AUTH STEP 1 (Select Country Code & Enter Mobile Number)
            ========================================================================= */}
        {authMode === 'phone_step1' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label 
                htmlFor="phone-input"
                style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--brand-primary, #10182d)', display: 'block', marginBottom: '6px' }}
              >
                Mobile Phone Number
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Country Code Select */}
                <select
                  aria-label="Select Country Code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    width: '120px',
                    height: '48px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--brand-border, #cbd5e1)',
                    backgroundColor: '#f8fafc',
                    padding: '0 8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--brand-primary, #10182d)',
                    cursor: 'pointer'
                  }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.country} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>

                {/* Mobile Number Input */}
                <input
                  id="phone-input"
                  type="tel"
                  required
                  autoFocus
                  value={phoneNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^\d\s-]/g, '');
                    setPhoneNumber(clean);
                  }}
                  placeholder={countryCode === '+91' ? '98765 43210' : 'Mobile number'}
                  style={{
                    flex: 1,
                    height: '48px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--brand-border, #cbd5e1)',
                    padding: '0 14px',
                    fontSize: '1rem',
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                    letterSpacing: '0.02em',
                    boxSizing: 'border-box'
                  }}
                  aria-label="Mobile Number"
                />
              </div>

              <span style={{ fontSize: '0.76rem', color: 'var(--brand-muted, #64748b)', marginTop: '5px', display: 'block' }}>
                We will dispatch a 6-digit one-time password (OTP) via SMS.
              </span>
            </div>

            <button 
              type="submit" 
              disabled={loading || !phoneNumber.trim()}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                height: '48px', 
                backgroundColor: 'var(--brand-primary, #10182d)', 
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.96rem',
                borderRadius: '8px',
                cursor: loading || !phoneNumber.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Sending Verification Code...' : 'Send Verification Code'} <ArrowRight size={16} />
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
                color: 'var(--brand-muted, #64748b)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '4px'
              }}
            >
              <ArrowLeft size={14} /> Back to Google Sign-In
            </button>
          </form>
        )}

        {/* =========================================================================
            STATE 3: PHONE AUTH STEP 2 (Verify 6-Digit OTP)
            ========================================================================= */}
        {authMode === 'phone_step2' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--brand-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Code Sent To</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-primary, #10182d)' }}>{fullDisplayPhone}</span>
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
                  color: 'var(--brand-accent, #c9a227)',
                  fontSize: '0.82rem',
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
              <label 
                htmlFor="otp-input"
                style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--brand-primary, #10182d)', display: 'block', marginBottom: '8px' }}
              >
                Enter 6-Digit Verification Code
              </label>

              <input
                id="otp-input"
                type="text"
                required
                autoFocus
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(digits);
                }}
                placeholder="• • • • • •"
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '8px',
                  border: '2px solid var(--brand-accent, #c9a227)',
                  padding: '0 16px',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  letterSpacing: '0.45em',
                  textAlign: 'center',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
                aria-label="6-Digit OTP Code"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || otpCode.length !== 6}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                height: '48px', 
                backgroundColor: 'var(--brand-primary, #10182d)', 
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.96rem',
                borderRadius: '8px',
                cursor: loading || otpCode.length !== 6 ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Verifying Code...' : 'Verify & Sign In'} <CheckCircle2 size={16} />
            </button>

            {/* Resend Code Option with Cooldown */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--brand-muted, #64748b)' }}>
                Didn't receive the code?
              </span>

              {resendCooldown > 0 ? (
                <span style={{ color: 'var(--brand-muted, #64748b)', fontWeight: 600 }}>
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-accent, #c9a227)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <RotateCcw size={12} /> Resend OTP Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* =========================================================================
            TASK 3: PATRON CIRCLE OPTIONAL CONSENT CHECKBOX
            Unchecked by default. Displayed once below authentication options.
            ========================================================================= */}
        <div 
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--brand-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <input 
            type="checkbox"
            id="patron-circle-opt-in"
            checked={patronCircleOptIn}
            onChange={(e) => setPatronCircleOptIn(e.target.checked)}
            style={{ 
              marginTop: '3px', 
              cursor: 'pointer', 
              accentColor: 'var(--brand-accent, #c9a227)',
              width: '16px',
              height: '16px'
            }}
          />
          <label 
            htmlFor="patron-circle-opt-in"
            style={{ 
              fontSize: '0.82rem', 
              color: 'var(--brand-primary, #10182d)', 
              lineHeight: 1.45, 
              cursor: 'pointer' 
            }}
          >
            Yes, I'd like to join the MUETY Patron Circle and receive exclusive collection previews, bridal updates and invitations.
          </label>
        </div>

        {/* Legal Terms & Conditions & Privacy Policy links */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.76rem', color: 'var(--brand-muted, #64748b)', margin: 0, lineHeight: 1.5 }}>
            By continuing, you acknowledge MUETY's{' '}
            <Link to="/terms-conditions" target="_blank" style={{ color: 'var(--brand-accent, #c9a227)', textDecoration: 'underline', fontWeight: 600 }}>
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" target="_blank" style={{ color: 'var(--brand-accent, #c9a227)', textDecoration: 'underline', fontWeight: 600 }}>
              Privacy Policy
            </Link>.
          </p>
        </div>

        {/* Invisible Firebase reCAPTCHA Container */}
        <div id="recaptcha-container" style={{ display: 'none' }} />
      </div>
    </div>
  );
};
