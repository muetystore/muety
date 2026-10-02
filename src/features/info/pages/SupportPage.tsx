import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { HelpCircle, Phone, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SupportPage: React.FC = () => {
  useDocumentTitle('Customer Support');

  const faqs = [
    {
      q: 'How do I care for my MUETY automatic watch movement?',
      a: 'MUETY mechanical movements feature a 42-hour power reserve. If the watch has been at rest, gently wind the crown clockwise 25-30 times before wearing. We recommend caliber servicing every 4-5 years.'
    },
    {
      q: 'How should I treat full-grain Tuscan leather?',
      a: 'Our vegetable-tanned hides develop a richer patina over time. Keep away from prolonged submersion in water and apply a neutral organic beeswax leather conditioner once every six months.'
    },
    {
      q: 'How do I track my global express shipment?',
      a: 'As soon as your order leaves our atelier dock, an automated dispatch notification with your carrier airway bill number is sent to your email and accessible under your MUETY Account.'
    },
    {
      q: 'Can I apply a promo coupon to my order?',
      a: 'Yes, enter your code (such as MUETY15) in the promo box inside the Shopping Bag or during Step 1 of Express Checkout.'
    }
  ];

  return (
    <div className="support-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3.5rem 0', textAlign: 'center' }}>
        <div className="container">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
            PATRON ASSISTANCE
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '2.5rem', marginTop: '4px', marginBottom: '0.5rem' }}>
            MUETY Customer Support & FAQ
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '540px', margin: '0 auto' }}>
            Expert answers, horological guides, and direct concierge assistance.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>
        {/* Quick Contact Cards */}
        <div className="grid-3" style={{ gap: '1.5rem', marginBottom: '3.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Phone size={24} color="var(--brand-accent)" style={{ margin: '0 auto 8px' }} />
            <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Phone Concierge</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>+1 (800) 555-MUETY</p>
          </div>

          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Mail size={24} color="var(--brand-accent)" style={{ margin: '0 auto 8px' }} />
            <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Email Assistance</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>concierge@muety.com</p>
          </div>

          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Clock size={24} color="var(--brand-accent)" style={{ margin: '0 auto 8px' }} />
            <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Availability</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>24/7 Global Priority</p>
          </div>
        </div>

        {/* FAQs */}
        <h2 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', marginBottom: '1.5rem' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3.5rem' }}>
          {faqs.map((faq, i) => (
            <div key={i} className="card" style={{ padding: '1.75rem' }}>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} color="var(--brand-accent)" />
                {faq.q}
              </h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: '1.65rem' }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        {/* Still Need Help Box */}
        <div style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#ffffff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Require Individual Atelier Assistance?
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Our master horologists and bespoke leather consultants are happy to provide personalized guidance.
          </p>
          <Link to="/contact" className="btn btn-accent">
            Contact Customer Support &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
