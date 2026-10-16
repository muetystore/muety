import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { HelpCircle, Phone, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SupportPage: React.FC = () => {
  useDocumentTitle('Customer Support');

  const faqs = [
    {
      q: 'How do I care for my MUETY pure silk saree?',
      a: 'MUETY pure silk sarees should be dry cleaned to preserve natural luster and zari integrity. Store your saree wrapped in a breathable muslin fabric in a cool, dry place away from direct sunlight.'
    },
    {
      q: 'What is your shipping and delivery charge?',
      a: 'We charge a single flat fee of ₹89 per order for tracked courier delivery across serviceable PIN codes in India. There are never any duplicate delivery fees or unexpected hidden surcharges.'
    },
    {
      q: 'How does Cash on Delivery (COD) work?',
      a: 'For COD orders, an advance confirmation fee of ₹89 is paid online via Razorpay at checkout. This ₹89 is credited directly toward your order total. The remaining balance is paid to the courier upon doorstep delivery.'
    },
    {
      q: 'Can I cancel an order after placing it?',
      a: 'Contact customer support at support@muety.in as soon as possible. Orders that have not yet been processed or dispatched may be reviewed for cancellation. Once an order is processed or dispatched, ordinary cancellations may not be accepted.'
    },
    {
      q: 'What should I do if my saree arrives damaged, defective, or incorrect?',
      a: 'Submit a request to support@muety.in within 3 days of delivery with your order number, details of the issue, and a clear, continuous, unedited unboxing video starting with the sealed parcel. For complete guidelines, review our Return, Refund & Cancellation Policy.'
    },
    {
      q: 'How do I track my order delivery?',
      a: 'Once your package is picked up by our courier partner, tracking details and updates are provided so you can track your delivery in real time.'
    },
    {
      q: 'How do I verify the authenticity of the silk and zari?',
      a: 'All MUETY sarees come with Silk Mark certification and quality guarantees. Our weaves utilize tested gold and silver thread plating interwoven with 100% pure Mulberry silk.'
    }
  ];

  return (
    <div className="support-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3.5rem 0', textAlign: 'center' }}>
        <div className="container">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
            PATRON ASSISTANCE
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '2.5rem', marginTop: '4px', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
            MUETY Customer Support & FAQ
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '540px', margin: '0 auto' }}>
            Expert saree care guidance, weaving consultation, and direct concierge assistance.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '850px' }}>
        {/* Quick Contact Cards */}
        <div className="grid-3" style={{ gap: '1.5rem', marginBottom: '3.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Phone size={24} color="var(--brand-accent)" style={{ margin: '0 auto 8px' }} />
            <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Phone / WhatsApp</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>+91 99406 68095</p>
          </div>

          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Mail size={24} color="var(--brand-accent)" style={{ margin: '0 auto 8px' }} />
            <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Email Assistance</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>support@muety.in</p>
          </div>

          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Clock size={24} color="var(--brand-accent)" style={{ margin: '0 auto 8px' }} />
            <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Availability</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>Mon–Sun: 9 AM–9 PM IST</p>
          </div>
        </div>

        {/* FAQs */}
        <h2 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>
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
          <h3 style={{ color: '#ffffff', fontSize: '1.5rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
            Require Individual Atelier Assistance?
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Our master weaving specialists and bridal advisors are happy to provide personalized guidance.
          </p>
          <Link to="/contact" className="btn btn-accent">
            Contact Customer Support &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
