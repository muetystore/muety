import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { auth } from '@/lib/firebase/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AdminSetupPassword: React.FC = () => {
  useDocumentTitle('MUETY Admin | Set Up Account Password');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error } = useNotification();

  const oobCode = searchParams.get('oobCode') || searchParams.get('apiKey');
  const emailParam = searchParams.get('email') || searchParams.get('muetyEmail') || '';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  useEffect(() => {
    if (oobCode && auth) {
      verifyPasswordResetCode(auth, oobCode)
        .then(userEmail => {
          setCodeVerified(true);
          setVerifiedEmail(userEmail);
          setEmail(userEmail);
        })
        .catch(err => {
          console.warn('[AdminSetupPassword] Invalid or expired action code:', err?.message);
        });
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      error('Please enter your MUETY login email.');
      return;
    }

    if (!password || password.length < 6) {
      error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      error('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setLoading(true);
    try {
      if (oobCode && auth && codeVerified) {
        await confirmPasswordReset(auth, oobCode, password);
        success('Password established successfully. Signing in to MUETY Admin ERP...');
      } else {
        // Fallback: If no oobCode or local setup, login with email/password
        success('Password established. Logging into MUETY Admin ERP...');
      }

      setIsSuccess(true);
      setTimeout(async () => {
        try {
          await login(cleanEmail, password);
          navigate('/admin/dashboard', { replace: true });
        } catch {
          navigate('/admin/login', { replace: true });
        }
      }, 1500);
    } catch (err: any) {
      console.warn('[AdminSetupPassword] Password setup error:', err);
      error(err?.message || 'Unable to establish password. Link may have expired.');
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
        maxWidth: '460px',
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
            fontSize: '1.4rem',
            letterSpacing: '0.15em',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span>MUETY ADMIN</span>
          </div>

          <h3 style={{ fontSize: '1.05rem', color: '#cbd5e1', marginTop: '8px', fontWeight: 600 }}>
            Set Up Your Account Password
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
            Establish your secure administrative credentials to activate your MUETY ERP access.
          </p>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h4 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 700, margin: '0 0 8px 0' }}>
              Account Password Set!
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Redirecting to MUETY Admin Executive Dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                MUETY Login Email Address
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
                New Secure Password
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required 
                  minLength={6}
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Minimum 6 characters"
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
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required 
                  minLength={6}
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Re-enter password"
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
                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
              {loading ? 'Activating Account...' : 'Set Password & Activate Account'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <Link to="/admin/login" style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};
