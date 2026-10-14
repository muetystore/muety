import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Truck, ShieldCheck, AlertCircle } from 'lucide-react';

export const ShippingPage: React.FC = () => {
  useDocumentTitle('Shipping, Return & Cancellation Policy');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '4rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            ATELIER LOGISTICS & POLICIES
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginTop: '8px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Shipping, Return & Cancellation Policy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6 }}>
            Transparent delivery logistics, express courier dispatch, and store policy terms for MUETY.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '900px' }}>
        <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <Truck size={32} color="#d4af37" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)', fontWeight: 700 }}>
              Pan-India Tracked Courier
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Total shipping/delivery charge is flat <strong>₹89 per order</strong> across India with insured courier tracking.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <ShieldCheck size={32} color="#d4af37" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)', fontWeight: 700 }}>
              Insured Atelier Dispatch
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Every saree is inspected, tamper-sealed with Silk Mark authenticity, and dispatched from our Salem atelier.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Dispatch & Delivery Timelines
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Orders placed on MUETY are processed, quality-inspected, and dispatched from our Salem weaving atelier within 24 to 48 hours. Estimated delivery across India is 2 to 4 business days depending on destination PIN code. Real-time courier tracking is provided via SMS and your patron portal.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. Transparent Shipping & Delivery Fee (₹89 Flat)
          </h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <p>
              MUETY charges a single, transparent fee of <strong>₹89 per order</strong> for insured doorstep courier delivery across India. There are never any duplicate fees, handling surcharges, or hidden fees.
            </p>
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', marginTop: '0.75rem', fontSize: '0.92rem' }}>
              <strong>Canonical Order Total Calculation:</strong><br />
              <code>Order Total = Item Subtotal − Discount + Applicable Tax (5% GST) + ₹89 Shipping/Delivery Charge</code>
            </div>
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Payment Options & COD Advance
          </h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Online Payment (Razorpay):</strong> Pay 100% of the Order Total securely online via UPI, Credit/Debit Card, NetBanking, or Digital Wallets for zero-touch delivery.
              </li>
              <li>
                <strong>Cash on Delivery (COD) — ₹89 Advance:</strong> For COD orders, a <strong>₹89 online advance</strong> is collected via Razorpay at checkout. This advance is credited directly toward your order total to cover tracked courier dispatch. At delivery, you pay only the remaining balance (<code>Order Total − ₹89</code>). The ₹89 advance is never an extra surcharge.
              </li>
              <li>
                <strong>Advance Terms:</strong> As set out in our Terms & Policies (Effective 10 October 2026), the ₹89 advance fee is non-refundable for ordinary customer cancellations after dispatch, refusal to accept delivery, or failure to collect the parcel, to the extent permitted by applicable law. It remains refundable where required by law, such as order non-fulfillment by MUETY.
              </li>
            </ul>
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Return & Cancellation Policy
          </h2>
          <div style={{
            backgroundColor: '#fffdf5',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={20} color="#b45309" />
              <span>Artisan Handloom Policy & Cancellation Window</span>
            </div>
            <p style={{ color: '#78350f', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>
              Because each saree is an artisan handloom creation, orders are generally non-returnable once delivered, subject to mandatory consumer protection laws. However, if your order is still in <strong>pending status</strong> prior to atelier packaging and dispatch, you may request order cancellation directly from your <strong>Patron Account</strong> or by contacting our concierge.
            </p>
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            5. Inquiries & Atelier Concierge
          </h2>
          <p>
            If your shipment arrives damaged or with an unboxing issue, please notify the MUETY Concierge within 24 hours of delivery at <strong>support@muety.in</strong> or WhatsApp at <strong>+91 9940668095</strong> along with unboxing footage for immediate resolution.
          </p>
        </div>
      </div>
    </div>
  );
};
