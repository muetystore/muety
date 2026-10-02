import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Truck, ShieldCheck } from 'lucide-react';

export const ShippingPage: React.FC = () => {
  useDocumentTitle('Shipping Policy');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3.5rem 0' }}>
        <div className="container">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
            GLOBAL LOGISTICS
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '2.5rem', marginTop: '4px', marginBottom: '0.5rem' }}>
            MUETY Shipping Policy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            White-Glove Insured Delivery Across 120+ Countries
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>
        <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <Truck size={28} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Complimentary Global Express</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              All orders exceeding <strong>₹2,000</strong> receive complimentary tracked priority air freight via DHL Express or FedEx.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <ShieldCheck size={28} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>100% Transit Insurance</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Every package is fully insured from our atelier dispatch dock until signed by the recipient.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '1rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            1. Dispatch Timelines
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Orders placed before 2:00 PM IST Monday through Friday are prepared, quality-verified, and dispatched within 24 hours. Custom woven bridal sarees or bespoke blouses may require 48 to 72 hours for master weaver finishing.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            2. Estimated Delivery Schedules
          </h2>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li><strong>United States & Canada:</strong> 2–3 Business Days</li>
            <li><strong>United Kingdom & Western Europe:</strong> 2–4 Business Days</li>
            <li><strong>Asia-Pacific & Middle East:</strong> 3–5 Business Days</li>
            <li><strong>Rest of the World:</strong> 4–6 Business Days</li>
          </ul>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            3. Customs, Duties & Taxes
          </h2>
          <p>
            All MUETY international shipments are sent with Delivered Duties Paid (DDP) where eligible, ensuring no unexpected customs fees upon doorstep arrival.
          </p>
        </div>
      </div>
    </div>
  );
};
