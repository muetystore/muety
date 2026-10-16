import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { AlertCircle, ShieldCheck, Clock, Package } from 'lucide-react';

export const ReturnRefundPage: React.FC = () => {
  useDocumentTitle('Return, Refund & Cancellation Policy | MUETY');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '4rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            MUETY • CUSTOMER POLICY
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginTop: '8px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Return, Refund &amp; Cancellation Policy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6 }}>
            Effective Date: <strong>18 October 2026</strong> • Clear rules for order changes and product issues
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>

        {/* At a Glance Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #d4af37' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Clock size={18} color="#d4af37" />
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>REFUND WINDOW</div>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>3 Days</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>From delivery date for damaged, defective, incorrect or misdescribed items.</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Package size={18} color="#3b82f6" />
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e3a8a' }}>UNBOXING VIDEO</div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>Required Evidence</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Clear, continuous and unedited video from sealed package to opened contents.</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <ShieldCheck size={18} color="#10b981" />
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#047857' }}>CONSUMER RIGHTS</div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>Fully Preserved</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Statutory consumer rights under Indian law cannot be excluded by this policy.</div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>

          {/* Important Notice */}
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '2rem' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#92400e', fontWeight: 600 }}>
              This policy applies to purchases made through https://www.muety.in. These policies do not remove consumer rights or remedies that cannot legally be excluded under Indian law.
            </p>
          </div>

          {/* Section 1 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Refund Requests Within 3 Days
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Customers must submit a return/refund request within <strong>3 days of delivery</strong> if the saree is damaged, defective, incorrect or materially different from its advertised description. Requests submitted after this period may be reviewed only where required by applicable law.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            A refund is not automatic. MUETY will review the order details and evidence provided, then communicate the decision and any applicable remedy. This review process does not remove consumer rights or remedies that cannot legally be excluded under Indian law.
          </p>

          {/* Section 2 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. Unboxing Video Evidence
          </h2>
          <div style={{
            backgroundColor: '#fffdf5',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.75rem' }}>
              <AlertCircle size={20} color="#b45309" />
              <span>Video Evidence Requirements</span>
            </div>
            <p style={{ color: '#78350f', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              To help MUETY review a claim, customers should record a <strong>clear, continuous and unedited video</strong> while opening the parcel, starting with the sealed package and showing:
            </p>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#78350f', fontSize: '0.92rem' }}>
              <li>The sealed package and package label</li>
              <li>The opening process</li>
              <li>The saree received</li>
              <li>The reported damage, defect, wrong item or mismatch (if any)</li>
            </ul>
            <p style={{ color: '#78350f', fontSize: '0.92rem', lineHeight: 1.7, marginTop: '0.75rem', marginBottom: '0' }}>
              Submit the unboxing video, order number, registered mobile number, a short description of the issue and photographs (if available) to <strong>support@muety.in</strong>. Please retain the saree and its packaging until the review is complete.
            </p>
          </div>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
            Video evidence helps the review, but the absence of a video will not be used to deny a remedy where applicable law requires otherwise.
          </p>

          {/* Section 3 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Review and Refund Decision
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            MUETY will review each request based on the order information, reported issue, unboxing video or other available evidence, and applicable law. Based on the review, MUETY will inform the customer whether a refund, replacement, return or another appropriate remedy is available.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            If a refund is approved or legally required, it will be processed using the original payment method where feasible, or another lawful method agreed with the customer. The time for the amount to appear may depend on the payment provider or bank.
          </p>

          {/* Section 4 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Change-of-Mind Returns
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            MUETY generally does not accept returns or provide refunds for ordinary changes of mind, personal preference, or choosing the wrong colour or design where the product listing is accurate, subject to applicable law. Please review product images, description, price and specifications before purchasing.
          </p>

          {/* Section 5 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            5. Order Cancellation
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Contact MUETY as soon as possible at <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong> to request cancellation. Orders that have not yet been processed or dispatched may be reviewed for cancellation. A cancellation request after processing or dispatch may not be accepted where lawful.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            If MUETY cancels an order or cannot fulfil it, payments will be refunded where required by law.
          </p>

          {/* Section 6 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            6. COD Advance — ₹89
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            COD orders require an advance confirmation fee of <strong>₹89</strong> before the order is confirmed. The remaining payable amount is collected at delivery. The ₹89 charge and its purpose must be displayed clearly at checkout.
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
            <li>To the extent permitted by applicable law, the ₹89 advance is <strong>non-refundable</strong> for ordinary customer cancellations, refusal to accept delivery or failure to collect the parcel.</li>
            <li>This condition does not apply where a refund is legally required, including when MUETY fails to fulfil the order or another circumstance requires a refund under law.</li>
            <li>If a refund for a product issue is approved, MUETY will communicate how the COD advance is treated as part of the review outcome, subject to applicable law.</li>
          </ul>

          {/* Section 7 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            7. Exchanges
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Where a product is defective, incorrect or materially inconsistent with its description, MUETY will consider the appropriate remedy in accordance with the review outcome and applicable law.
          </p>

          {/* Section 8 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            8. How to Contact Us
          </h2>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.92rem', margin: 0, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              Email <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong> with the subject "Return/Refund Request" or "Cancellation Request". Include your order number, registered mobile number, unboxing video and relevant details.
              <br /><br />
              <strong style={{ color: '#dc2626' }}>Do not send payment PINs or passwords.</strong>
            </p>
          </div>

          {/* Section 9 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            9. Consumer Rights
          </h2>
          <p style={{ margin: 0 }}>
            Nothing in this policy is intended to remove consumer rights or remedies that cannot legally be excluded under Indian law. Where this policy and applicable law differ, applicable law will prevail.
          </p>

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
