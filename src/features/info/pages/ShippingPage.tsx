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
              Pan-India Express Shipping
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Standard shipping fee of <strong>₹100</strong> across India for all atelier orders.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <ShieldCheck size={32} color="#d4af37" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)', fontWeight: 700 }}>
              Secure Transit Protection
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Every package is verified, tamper-sealed, and tracked live from our Salem atelier to your doorstep.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Dispatch & Delivery Timelines
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Orders placed on MUETY are processed, quality-checked, and dispatched from our Salem weaving atelier within 24 to 48 hours. Estimated delivery within India is 3 to 6 business days depending on destination PIN code.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. Delivery Charges
          </h2>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li><strong>Flat Shipping Fee:</strong> Canonical flat fee of ₹100 applies to all orders across India.</li>
          </ul>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Return, Refund & Cancellation Policy
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
              <span>Non-Returnable, Non-Refundable & Non-Cancellable Position</span>
            </div>
            <p style={{ color: '#78350f', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>
              At MUETY, each pure silk saree and ethnic garment is curated and inspected with artisan precision. Consequently, all orders are <strong>non-returnable, non-refundable, and non-cancellable</strong> once submitted, subject to statutory consumer protection rights that cannot legally be excluded under applicable Indian law.
            </p>
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Support & Quality Inquiries
          </h2>
          <p>
            If your shipment arrives damaged or with a verified weaving defect, please notify MUETY Concierge within 24 hours of delivery at <strong>support@muety.in</strong> or WhatsApp at <strong>+91 9940668095</strong> along with unboxing video footage.
          </p>
        </div>
      </div>
    </div>
  );
};
