import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export const PrivacyPage: React.FC = () => {
  useDocumentTitle('Privacy Policy');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3.5rem 0' }}>
        <div className="container">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
            LEGAL & SECURITY
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '2.5rem', marginTop: '4px', marginBottom: '0.5rem' }}>
            MUETY Privacy Policy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Last Updated: August 2026 • Effective Worldwide
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>
        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '1rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            1. Commitment to Patron Confidentiality
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            At <strong>MUETY</strong>, we treat the personal data and purchasing habits of our clientele with the highest discretion. We do not sell, license, or barter customer information to third-party data brokers under any circumstance.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            2. Data Collection and Usage
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We collect information solely to fulfill your bespoke orders, coordinate courier deliveries, provide tailored concierge support, and issue official quality certificates for your pure silk sarees and temple jewelry.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            3. 256-Bit Vault Security & Encryption
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            All payment card details, billing addresses, and authentication tokens are encrypted in transit and at rest using banking-grade AES-256 protocols and Firebase cloud security compliance.
          </p>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
            4. Your Rights as a MUETY Patron
          </h2>
          <p>
            You retain the unconditional right to request access to, rectify, or request permanent deletion of your customer records by submitting a formal request to our Data Protection Concierge at <strong style={{ color: 'var(--brand-primary)' }}>privacy@muety.com</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
