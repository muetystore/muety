import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { ShieldCheck, Cookie, SlidersHorizontal, Lock, CheckCircle2, Info } from 'lucide-react';

export const CookiePolicyPage: React.FC = () => {
  useDocumentTitle('Cookie Policy | MUETY');

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('muety_open_cookie_settings'));
  };

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '4rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '880px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            MUETY • TRANSPARENCY &amp; TRUST
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginTop: '8px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Cookie Policy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6 }}>
            Effective Date: <strong>25 October 2026</strong> • Policy Version: <strong>2026-10-25</strong>
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '880px' }}>
        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>

          {/* Quick Action Box */}
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cookie size={18} />
                <span>Manage Your Preferences Anytime</span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                You can review, modify, or withdraw your cookie consent choices at any moment.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCookieSettings}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <SlidersHorizontal size={14} />
              <span>Cookie Preferences</span>
            </button>
          </div>

          {/* 1. Introduction */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Overview of Cookies &amp; Web Storage
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            This Cookie Policy explains how <strong>MUETY</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) uses cookies, local browser storage, and related web technologies when you visit our online store at <strong>https://store.muety.in</strong>.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            Cookies are small data files placed on your device by your browser. We also utilize standard browser technologies such as <code>localStorage</code> and <code>IndexedDB</code> to preserve essential session state (such as your shopping bag and secure authentication session) so you can navigate our boutique seamlessly.
          </p>

          {/* 2. Categorization Table */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. Categories of Technologies Used
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            We classify all website technologies into four distinct categories with explicit, granular control:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {/* Category 1 */}
            <div style={{ backgroundColor: '#faf8f5', border: '1px solid #e7e5df', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--brand-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} color="#d4af37" />
                  <span>Strictly Necessary (Always Active)</span>
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 9px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                  Always Active
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
                Essential for core storefront operations, security, authentication, shopping bag persistence, payment verification, and fraud prevention. The store cannot operate without these.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--brand-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>muety_consent_v1:</strong> Stores your verified privacy choices (Lifespan: 180 days).</li>
                <li><strong>muety_cart_v1:</strong> Preserves items added to your shopping bag (Lifespan: Persistent).</li>
                <li><strong>Firebase Auth (firebase:authUser):</strong> Encrypted session credential storage for patron and admin sign-in.</li>
                <li><strong>Razorpay:</strong> Secure payment processing and transaction verification tokens.</li>
              </ul>
            </div>

            {/* Category 2 */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e7e5df', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  Preferences (Optional — Default OFF)
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 9px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                  Consent Required
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
                Remembers nonessential settings you configure for added shopping convenience.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--brand-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>muety_recently_viewed_v1:</strong> Remembers your recently viewed handloom creations for quick access.</li>
              </ul>
            </div>

            {/* Category 3 */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e7e5df', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  Analytics &amp; Performance (Optional — Default OFF)
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 9px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                  Consent Required
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
                Measures aggregated boutique performance and visitor interaction patterns without identifying individuals. Gated until affirmative consent is given.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--brand-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Microsoft Clarity (ywlcm9h1bu):</strong> UX session measurement and heatmap telemetry for diagnosing interface lag. Gated until analytics consent is granted.</li>
                <li><strong>Google Tag Manager / GA4 (GTM-MW56GX6L):</strong> Anonymous page visit, route transition, and checkout funnel metrics. Gated until analytics consent is granted.</li>
              </ul>
            </div>

            {/* Category 4 */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e7e5df', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  Marketing &amp; Patron Circle (Optional — Default OFF)
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 9px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                  Consent Required
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
                Used to evaluate promotional campaigns, ad conversions on partner channels, and enroll opted-in patrons into the exclusive MUETY Patron Circle for tailored email campaigns, private releases, and bespoke atelier offers. Gated until affirmative consent is given.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--brand-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Patron Circle Email Campaigns:</strong> Enrolls patrons accepting marketing communications to receive bespoke collection emails, private drop invitations, and curated offers.</li>
                <li><strong>Campaign Attribution:</strong> Tracks promotion effectiveness for festive collections and advertising attribution.</li>
              </ul>
            </div>
          </div>

          {/* 3. Important Safeguards & Compliance */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Our Privacy Commitments
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0, marginTop: '4px' }} />
              <span><strong>No Preselected Optional Categories:</strong> Optional categories are turned off by default unless you affirmatively choose to enable them.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0, marginTop: '4px' }} />
              <span><strong>No Forced Consent:</strong> You can reject all optional cookies and continue shopping, placing orders, and managing your account without restriction.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0, marginTop: '4px' }} />
              <span><strong>Separate From Email Marketing:</strong> Subscribing to email updates or creating an account does not imply or grant website tracking consent.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0, marginTop: '4px' }} />
              <span><strong>No Sensitive Data in Consent Records:</strong> The consent record contains solely your timestamp, schema version, policy version, and category flags. No passwords, card details, phone numbers, or emails are ever logged.</span>
            </div>
          </div>

          {/* 4. How to Change or Withdraw Consent */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Changing or Withdrawing Consent
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            You maintain complete autonomy over your consent choices:
          </p>
          <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
            <li>Click <strong>&ldquo;Cookie Preferences&rdquo;</strong> in the website footer or click the button at the top of this page.</li>
            <li>Adjust your preferences using the category switches.</li>
            <li>Click <strong>&ldquo;Save Preferences&rdquo;</strong> or <strong>&ldquo;Reject Optional&rdquo;</strong> to revoke previous permissions immediately.</li>
          </ol>
          <p style={{ marginBottom: '1.5rem' }}>
            When consent is withdrawn, optional tracking scripts are signaled to cease processing immediately. You can also clear cookies directly via your browser settings (Chrome, Safari, Firefox, Edge).
          </p>

          {/* 5. Legal Governance */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            5. Legal Governance &amp; Related Policies
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            This policy aligns with the principles of the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and the <strong>Information Technology Act, 2000 (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information Rules, 2011)</strong> of India.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            For comprehensive details on how we protect your personal information, please read our{' '}
            <Link to="/privacy-policy" style={{ color: 'var(--brand-accent)', fontWeight: 700, textDecoration: 'underline' }}>
              Privacy Policy
            </Link>.
          </p>

          {/* 6. Contact */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            6. Contact the Privacy Team
          </h2>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
            <p style={{ fontSize: '0.92rem', margin: 0, lineHeight: 1.7 }}>
              If you have any questions or require assistance regarding cookie management, contact our patron privacy desk at <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong>.
            </p>
          </div>

        </div>

        {/* Brand Footer */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          <p style={{ marginBottom: '4px' }}><strong>MUETY — Traditional Sarees &amp; Wear</strong></p>
          <p style={{ marginBottom: '4px' }}>Website: <a href="https://store.muety.in" style={{ color: 'var(--brand-accent)' }}>https://store.muety.in</a></p>
          <p>Email: <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong></p>
        </div>
      </div>
    </div>
  );
};
