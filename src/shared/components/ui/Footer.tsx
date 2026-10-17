import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  Award, 
  Instagram, 
  MessageCircle,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  Globe,
  Send
} from 'lucide-react';
import { storageService } from '@/lib/storage/storageService';
import { StoreSettings, ContactChannel, ContactChannelType } from '@/shared/types';
import { ensureContactChannels, computeChannelLink } from '@/shared/utils/contactChannels';

/**
 * Default brand channels for search indexing, legal audit and compliance:
 * href="https://maps.google.com/?q=2/32B+Ramireddypatti,+Palikadu,+Salem+-+636501"
 * href="tel:+919385791540"
 * href="https://wa.me/919940668095"
 * href="mailto:support@muety.in"
 * href="https://instagram.com/Themuety"
 */
function getChannelIconConfig(type: ContactChannelType) {
  switch (type) {
    case 'phone':
      return {
        icon: <Phone size={15} />,
        hoverBg: 'rgba(212, 175, 55, 0.15)',
        hoverColor: '#d4af37'
      };
    case 'whatsapp':
      return {
        icon: <MessageCircle size={15} />,
        hoverBg: 'rgba(37, 211, 102, 0.15)',
        hoverColor: '#25D366'
      };
    case 'email':
      return {
        icon: <Mail size={15} />,
        hoverBg: 'rgba(212, 175, 55, 0.15)',
        hoverColor: '#d4af37'
      };
    case 'instagram':
      return {
        icon: <Instagram size={15} />,
        hoverBg: 'rgba(225, 48, 108, 0.15)',
        hoverColor: '#E1306C'
      };
    case 'facebook':
      return {
        icon: <Facebook size={15} />,
        hoverBg: 'rgba(24, 119, 242, 0.15)',
        hoverColor: '#1877F2'
      };
    case 'youtube':
      return {
        icon: <Youtube size={15} />,
        hoverBg: 'rgba(255, 0, 0, 0.15)',
        hoverColor: '#FF0000'
      };
    case 'twitter':
      return {
        icon: <Twitter size={15} />,
        hoverBg: 'rgba(29, 161, 242, 0.15)',
        hoverColor: '#1DA1F2'
      };
    case 'linkedin':
      return {
        icon: <Linkedin size={15} />,
        hoverBg: 'rgba(10, 102, 194, 0.15)',
        hoverColor: '#0A66C2'
      };
    case 'telegram':
      return {
        icon: <Send size={15} />,
        hoverBg: 'rgba(34, 158, 217, 0.15)',
        hoverColor: '#229ED9'
      };
    case 'location':
      return {
        icon: <MapPin size={15} />,
        hoverBg: 'rgba(212, 175, 55, 0.15)',
        hoverColor: '#d4af37'
      };
    case 'pinterest':
    case 'custom':
    default:
      return {
        icon: <Globe size={15} />,
        hoverBg: 'rgba(212, 175, 55, 0.15)',
        hoverColor: '#d4af37'
      };
  }
}

export const Footer: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings>(() => storageService.getSettings());

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings(storageService.getSettings());
    };
    window.addEventListener('muety_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('muety_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const footerChannels = useMemo(() => {
    const channels = ensureContactChannels(settings).contactChannels || [];
    return channels.filter(c => c.enabled !== false && c.showInFooter === true);
  }, [settings]);

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
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Flat-rate insured delivery across India (₹89)</p>
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

            {/* Contact channels (icons only) below Saree Categories - fully manageable from admin settings */}
            {footerChannels.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}
                aria-label="MUETY Contact Channels"
              >
                {footerChannels.map(channel => {
                  const href = channel.link || computeChannelLink(channel.type, channel.value);
                  const isExternal = !href.startsWith('tel:') && !href.startsWith('mailto:');
                  const { icon, hoverBg, hoverColor } = getChannelIconConfig(channel.type);

                  return (
                    <a
                      key={channel.id}
                      href={href}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      aria-label={channel.name}
                      title={`${channel.name}: ${channel.value}`}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#cbd5e1',
                        transition: 'all 0.2s ease',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = hoverBg;
                        e.currentTarget.style.borderColor = hoverColor;
                        e.currentTarget.style.color = hoverColor;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = '#cbd5e1';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {icon}
                    </a>
                  );
                })}
              </div>
            )}
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
                <Link to="/return-refund-policy" style={{ transition: 'color var(--transition-fast)' }} onMouseEnter={e => (e.currentTarget.style.color = '#d4af37')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
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
            <Link to="/return-refund-policy" style={{ color: '#94a3b8' }}>Returns &amp; Refunds</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .footer-links-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 768px) {
          footer {
            padding-bottom: calc(var(--bottom-safe-clearance, 80px) + 1rem) !important;
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
