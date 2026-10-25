import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export const PrivacyPage: React.FC = () => {
  useDocumentTitle('Privacy Policy | MUETY');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '4rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            MUETY • LEGAL &amp; SECURITY
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginTop: '8px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6 }}>
            Effective Date: <strong>18 October 2026</strong> • Your information, handled with care
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>
        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>

          {/* Important Notice */}
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '2rem' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#92400e', fontWeight: 600 }}>
              This Privacy Policy explains how MUETY handles information when you visit https://www.muety.in or place an order for sarees and traditional wear. These policies do not remove consumer rights or remedies that cannot legally be excluded under Indian law.
            </p>
          </div>

          {/* Section 1 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Information We May Collect
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            MUETY may collect your name, mobile number, email address, shipping or billing address, order history, transaction status and information you provide when contacting customer support.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            We do not intend to collect or store your full payment-card credentials, UPI PIN or card PIN. Payment details are handled by the relevant payment provider.
          </p>

          {/* Section 2 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. How We Use Information
          </h2>
          <p style={{ marginBottom: '0.5rem' }}>
            We use information to:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
            <li>Process and deliver orders</li>
            <li>Verify payments and COD orders</li>
            <li>Send order or delivery updates</li>
            <li>Respond to enquiries</li>
            <li>Review return/refund requests</li>
            <li>Prevent fraud</li>
            <li>Improve our services</li>
            <li>Meet applicable legal obligations</li>
          </ul>

          {/* Section 3 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Sharing Information
          </h2>
          <p style={{ marginBottom: '0.5rem' }}>
            Information may be shared as reasonably necessary with:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
            <li>Authorised payment providers</li>
            <li>Courier and delivery partners</li>
            <li>Website/technology service providers</li>
            <li>Authorities where required by law</li>
          </ul>
          <p style={{ marginBottom: '1.5rem' }}>
            Relevant order details and customer-submitted videos or photographs may be accessed by authorised MUETY personnel to review a return/refund request.
          </p>

          {/* Section 4 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Security and Retention
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            MUETY takes reasonable steps to protect personal information and submitted evidence against unauthorised access, loss or misuse. No online system can be guaranteed completely secure.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            We retain information for as long as reasonably needed for order fulfilment, customer support, return/refund review, accounting, dispute resolution and legal compliance.
          </p>

          {/* Section 5 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            5. Cookies and Website Technologies
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            The website and our service providers utilize cookies, local storage, and similar digital technologies to deliver essential boutique functions, safeguard payments, maintain your shopping bag, and—with your affirmative permission—measure website performance and tailor marketing communications.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Under India's Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000, we do not deploy optional tracking technologies without your informed prior consent.
          </p>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              For full category breakdowns (Strictly Necessary, Preferences, Analytics, and Marketing) and technical details of each technology, please consult our dedicated policy:
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link 
                to="/cookie-policy" 
                style={{ 
                  color: 'var(--brand-accent)', 
                  fontWeight: 700, 
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px'
                }}
              >
                View MUETY Cookie Policy &rarr;
              </Link>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('muety_open_cookie_settings'))}
                style={{
                  background: 'none',
                  border: '1px solid var(--brand-accent)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  color: 'var(--brand-accent)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--brand-accent)';
                  e.currentTarget.style.color = '#0c121e';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--brand-accent)';
                }}
              >
                Manage Cookie Preferences
              </button>
            </div>
          </div>

          {/* Section 6 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            6. Your Requests and Choices
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You may contact MUETY to request access to, correction of, or help with personal information associated with an order, subject to identity verification and applicable law. Certain records may need to be retained where legally required.
          </p>

          {/* Section 7 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            7. Children's Information
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Please place orders only if you are legally able to enter into a purchase transaction, or with a parent or lawful guardian where required.
          </p>

          {/* Section 8 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            8. Changes to This Policy
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We may update this policy to reflect operational or legal changes. The latest version and effective date will be published on the website.
          </p>

          {/* Section 9 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            9. Contact
          </h2>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
            <p style={{ fontSize: '0.92rem', margin: 0, lineHeight: 1.7 }}>
              For privacy questions or requests, contact <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong> and include your order number where relevant.
            </p>
          </div>

        </div>

        {/* Brand Footer */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          <p style={{ marginBottom: '4px' }}><strong>MUETY — Traditional Sarees &amp; Wear</strong></p>
          <p style={{ marginBottom: '4px' }}>Website: <a href="https://www.muety.in" style={{ color: 'var(--brand-accent)' }}>https://www.muety.in</a></p>
          <p>Email: <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong></p>
        </div>
      </div>
    </div>
  );
};
