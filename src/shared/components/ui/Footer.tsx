import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Mail, Phone, MapPin, ShieldCheck, Truck, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#090d16',
      color: '#f8fafc',
      borderTop: '1px solid #1e293b',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '2.5rem 0',
        backgroundColor: '#0c121e'
      }}>
        <div className="container">
          <div className="grid-3" style={{ gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                padding: '12px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#d4af37'
              }}>
                <Truck size={24} />
              </div>
              <div>
                <h6 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>Insured Express Delivery</h6>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Flat-rate insured delivery across India (₹100)</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                padding: '12px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#d4af37'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h6 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>Authenticity Guaranteed</h6>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>100% verified artisan materials & movement</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                padding: '12px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#d4af37'
              }}>
                <Award size={24} />
              </div>
              <div>
                <h6 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>Lifetime Warranty</h6>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Master craftsmanship assurance for life</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '4rem 1.5rem 2.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr',
          gap: '3rem'
        }} className="footer-links-grid">

          <div>
            <Logo variant="light" size="lg" showTagline />
            <p style={{
              color: '#94a3b8',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              marginTop: '1.25rem',
              maxWidth: '340px'
            }}>
              MUETY represents authentic Indian handloom luxury. We design and curate exceptional Kanchipuram & Banarasi pure silk sarees, bridal masterworks, and timeless ethnic elegance.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={16} color="#d4af37" />
                <span>2/32B Ramireddypatti, Palikadu, Salem – 636501</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="#d4af37" />
                <span>+91 9385791540 / WhatsApp: 9940668095</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} color="#d4af37" />
                <span>support@muety.in | orders@muety.in</span>
              </div>
            </div>
          </div>

          <div>
            <h5 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
              MUETY
            </h5>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#94a3b8' }}>
              <li>
                <Link to="/about" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  About MUETY & Leadership
                </Link>
              </li>
              <li>
                <Link to="/contact" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Contact Concierge
                </Link>
              </li>
              <li>
                <Link to="/products" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Explore Collections
                </Link>
              </li>
              <li>
                <Link to="/categories" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Saree Categories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
              CUSTOMER CARE & POLICIES
            </h5>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#94a3b8' }}>
              <li>
                <Link to="/contact" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Customer Support
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-conditions" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  Return, Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          marginTop: '3rem',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.82rem',
          color: '#64748b'
        }}>
          <div>
            &copy; {new Date().getFullYear()} MUETY Inc. All Rights Reserved. Luxury E-Commerce Atelier.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/privacy-policy" style={{ color: '#94a3b8' }}>Privacy</Link>
            <Link to="/terms-conditions" style={{ color: '#94a3b8' }}>Terms</Link>
            <Link to="/shipping-policy" style={{ color: '#94a3b8' }}>Shipping</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .footer-links-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .footer-links-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};
