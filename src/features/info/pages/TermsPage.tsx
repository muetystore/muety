import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Shield, Clock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  useDocumentTitle('Terms & Conditions | MUETY');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '4rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            MUETY • TERMS & POLICIES
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginTop: '8px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Terms & Conditions of Service
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6 }}>
            Effective Date: <strong>10 October 2026</strong> • Official policy declaration for MUETY Sarees & Traditional Wear
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
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Payable online before order confirmation; credited toward total.</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e3a8a', marginBottom: '4px' }}>REFUND POLICY</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>No Change-of-Mind</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Statutory consumer defect remedies preserved under Indian law.</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#047857', marginBottom: '4px' }}>GRIEVANCE REDRESSAL</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>48-Hour Ack.</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Redressed within 1 month per E-Commerce Rules, 2020.</div>
          </div>
        </div>

        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '2rem' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#92400e', fontWeight: 600 }}>
              Important Notice: These policies do not remove or restrict any consumer rights or statutory remedies that cannot legally be excluded under applicable Indian laws, including the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.
            </p>
          </div>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Terms & Conditions
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            MUETY operates an online retail platform offering handcrafted silk sarees and traditional ethnic wear at <strong>https://www.muety.in</strong>. By accessing the website, registering a patron account, or placing an order, you agree to be bound by these Terms and Policies. Customers must provide accurate contact, delivery, and payment details and review product specifications prior to order submission. MUETY reserves the right to cancel orders for legitimate grounds such as suspected fraud, incorrect catalog pricing, or stock unavailability, handling payments in accordance with applicable law.
          </p>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. Pricing & Payments
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            All product prices are quoted in Indian Rupees (₹, INR). Compulsory charges, including the single ₹89 shipping fee, are transparently itemized prior to order confirmation. Order Total is calculated as: <code>Item Subtotal − Applicable Discounts + 5% GST + ₹89 Flat Courier Charge</code>. Supported payment channels include UPI (GPay, PhonePe, Paytm), Debit/Credit Cards, NetBanking, and verified Cash on Delivery. MUETY will never solicit or ask for your UPI PIN, ATM PIN, or card passwords.
          </p>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Cash on Delivery (COD) — ₹89 Advance
          </h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <p>
              Patrons selecting Cash on Delivery must pay an advance confirmation fee of <strong>₹89</strong> online via Razorpay before the order is confirmed for dispatch.
            </p>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <li>The ₹89 fee is credited directly toward your order total; only the remaining balance (<code>Order Total − ₹89</code>) is collected at delivery.</li>
              <li>The ₹89 advance fee is non-refundable for ordinary customer cancellations, refusal to accept delivery, or failure to collect the parcel, to the extent permitted by applicable law.</li>
              <li>COD is available strictly for serviceable Indian postal PIN codes and verified telephone contacts.</li>
              <li>The non-refundable condition does not apply where a refund is mandated by law, including instances where MUETY fails to fulfill or dispatch an order.</li>
            </ul>
          </div>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Return & Refund Policy
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Because our sarees are pure handloom textiles crafted with certified silk and zari threads, MUETY generally does not accept returns or provide refunds for ordinary changes of mind, personal preference, or choosing an alternative color/design where the product delivered matches the listed specifications. Where a product is defective, damaged in transit, incorrect, or materially inconsistent with advertised specifications, patrons retain full statutory rights to an appropriate remedy under Indian consumer protection laws upon providing unboxing proof.
          </p>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            5. Order Cancellation
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Patrons may request cancellation for orders that have not yet been processed, packaged, or dispatched by navigating to their <strong>Patron Account &gt; Order History</strong> or writing to <strong>support@muety.in</strong>. Cancellation requests submitted after atelier processing or handover to express couriers cannot be accepted where lawful.
          </p>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            6. Damaged, Defective or Incorrect Products
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            In the rare event of parcel tampering, transit defect, or item mismatch, contact <strong>support@muety.in</strong> within 24 to 48 hours of delivery with your order number, registered mobile number, and clear photos or an unedited unpacking video. Retain original packaging and tags during review.
          </p>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            7. Customer Complaints & Grievance Redressal
          </h2>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '6px' }}>
              Consumer Protection (E-Commerce) Rules, 2020 Compliance
            </div>
            <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
              In compliance with Rule 5(3)(b) of the Consumer Protection (E-Commerce) Rules, 2020:
              <br />
              • Every consumer complaint will be acknowledged within <strong>48 hours</strong> of receipt.
              <br />
              • Every grievance will be redressed within <strong>one month</strong> of receipt.
              <br />
              Grievance Email: <strong>support@muety.in</strong> | Official Dispatch Address: 2/32B Ramireddypatti, Palikadu, Salem – 636501, Tamil Nadu.
            </p>
          </div>

          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            8. Governing Law & Jurisdiction
          </h2>
          <p style={{ margin: 0 }}>
            These terms and customer transactions are governed by the substantive laws of India. Any legal proceedings or dispute resolutions arising out of or in connection with MUETY shall be subject to the competent courts and consumer forums of Salem / Tamil Nadu, India.
          </p>

        </div>
      </div>
    </div>
  );
};
