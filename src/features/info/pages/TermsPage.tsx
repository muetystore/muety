import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  useDocumentTitle('Terms & Conditions | MUETY');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '4rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            MUETY • TERMS &amp; POLICIES
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginTop: '8px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Terms &amp; Conditions
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6 }}>
            Effective Date: <strong>18 October 2026</strong> • A clear guide to shopping with confidence
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>

        {/* At a Glance Callout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #d4af37' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>COD ADVANCE</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>₹89.00</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Payable online before COD order confirmation; credited toward total.</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e3a8a', marginBottom: '4px' }}>CHANGE-OF-MIND</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>Not Accepted</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Statutory consumer defect remedies preserved under Indian law.</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#047857', marginBottom: '4px' }}>REFUND WINDOW</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>3 Days</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>See <Link to="/return-refund-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Return, Refund &amp; Cancellation Policy</Link>.</div>
          </div>
        </div>

        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>

          {/* Important Notice */}
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '2rem' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#92400e', fontWeight: 600 }}>
              These Terms &amp; Conditions apply to your use of https://www.muety.in and purchases from MUETY — Sarees &amp; Traditional Wear. These policies do not remove consumer rights or remedies that cannot legally be excluded under Indian law.
            </p>
          </div>

          {/* Section 1 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Orders and Customer Details
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            By placing an order, you confirm that the contact, delivery and payment information you provide is accurate and complete. Please review the product description, images, price and specifications before confirming an order.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            An order may be reviewed or cancelled for legitimate reasons, including suspected fraud, incorrect pricing, stock unavailability or an inability to service the delivery location. Any payment will be handled in accordance with applicable law.
          </p>

          {/* Section 2 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. Pricing and Charges
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Product prices and applicable charges will be shown before order confirmation. Any compulsory delivery or COD charge must be disclosed clearly before you place the order.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            MUETY will <strong>never</strong> ask you to share a UPI PIN, card PIN or banking password to process an order.
          </p>

          {/* Section 3 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Payment Methods
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Available payment methods may include UPI, debit or credit cards, other online payment methods and Cash on Delivery (COD), where enabled for the order and delivery location.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            Orders requiring online payment are processed after payment confirmation. Do not make payments using instructions received from unofficial accounts claiming to represent MUETY.
          </p>

          {/* Section 4 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Cash on Delivery (COD) — ₹89 Advance
          </h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              Customers selecting COD must pay an advance confirmation fee of <strong>₹89</strong> before the COD order is confirmed. The remaining payable amount is collected at delivery.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              The ₹89 charge and its purpose must be displayed clearly at checkout before payment. To the extent permitted by applicable law, the advance is non-refundable for ordinary customer cancellations, refusal to accept delivery or failure to collect the parcel, subject to the <Link to="/return-refund-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Return, Refund &amp; Cancellation Policy</Link> and applicable law.
            </p>
            <p>
              The non-refundable condition does not apply where a refund is legally required, including when MUETY fails to fulfil an order and the law requires the amount to be returned. COD is available only for eligible orders and serviceable locations.
            </p>
          </div>

          {/* Section 5 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            5. Product Information
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We make reasonable efforts to display accurate product images and descriptions. Actual colours may vary slightly due to screen settings, lighting and photography. This does not exclude remedies for products materially different from their advertised descriptions.
          </p>

          {/* Section 6 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            6. Website Use and Intellectual Property
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            You must not misuse the website, attempt unauthorised access, interfere with website operation or use website content unlawfully.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            The MUETY name, logo, website design, original text and brand materials may not be copied or commercially used without permission, except where permitted by law.
          </p>

          {/* Section 7 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            7. Limitation and Legal Rights
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Nothing in these terms excludes consumer rights or remedies that cannot legally be excluded under Indian law. Requests involving damaged, defective, incorrect or materially misdescribed products will be handled under applicable law and the <Link to="/return-refund-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Return, Refund &amp; Cancellation Policy</Link>.
          </p>

          {/* Section 8 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            8. Updates and Governing Law
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We may update these terms to reflect operational or legal requirements. The latest version will be published on the website. These terms are governed by the laws of India, and disputes will be handled by competent authorities or courts in accordance with applicable law.
          </p>

          {/* Section 9 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            9. Contact
          </h2>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
            <p style={{ fontSize: '0.92rem', margin: 0, lineHeight: 1.7 }}>
              For order or terms-related questions, contact <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong> and include your order number and a description of your concern.
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
