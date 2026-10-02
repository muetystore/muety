import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export const TermsPage: React.FC = () => {
  useDocumentTitle('Terms & Conditions');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3.5rem 0' }}>
        <div className="container">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
            TERMS OF SERVICE
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '2.5rem', marginTop: '4px', marginBottom: '0.5rem' }}>
            MUETY Terms & Conditions
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Effective as of August 2026 • MUETY Atelier Corporation
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>
        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '1rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            By accessing or acquiring products through <strong>MUETY</strong> (the "Website"), you agree to be bound by these Terms and Conditions. These terms govern all purchases of timepieces, leather goods, apparel, and lifestyle accessories.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            2. Product Authenticity and Descriptions
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            MUETY guarantees the 100% authenticity of all materials, calibers, and craftsmanship stated on our product pages. Slight natural grain variations in Italian leathers are hallmarks of authentic organic tanning.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            3. Pricing and Currencies
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            All prices are denominated in Indian Rupees (INR, ₹) unless explicitly toggled otherwise. MUETY reserves the right to correct pricing errors or update seasonal catalog valuations without prior notice.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            4. Intellectual Property
          </h2>
          <p>
            All trademarks, logos, typography, product photography, and architectural designs associated with <strong>MUETY</strong> are the proprietary property of MUETY Atelier Corporation.
          </p>
        </div>
      </div>
    </div>
  );
};
