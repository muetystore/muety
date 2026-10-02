import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  return (
    <div 
      className="announcement-bar-top"
      style={{
        backgroundColor: '#080c14',
        color: '#f8fafc',
        padding: '7px 1.5rem',
        fontSize: '0.74rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1001
      }}
    >
      <div className="announcement-left-spacer" style={{ width: '220px', display: 'none' }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        flex: 1,
        textAlign: 'center'
      }}>
        <Sparkles size={13} color="#facc15" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#facc15', letterSpacing: '0.06em' }}>DIWALI EDIT 2026 — 25% OFF</strong>
          <span style={{ margin: '0 8px', opacity: 0.6 }}>|</span>
          <span style={{ color: '#ffffff' }}>CODE: <strong style={{ color: '#facc15' }}>DIWALI25</strong></span>
          <span style={{ margin: '0 8px', opacity: 0.6 }}>|</span>
          <span style={{ color: '#f1f5f9' }}>FREE GOLD-FOIL GIFT PACKAGING</span>
        </span>
        <Sparkles size={13} color="#facc15" style={{ flexShrink: 0 }} />
      </div>

      <div 
        className="announcement-right-links"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '0.72rem',
          color: '#cbd5e1'
        }}
      >
        <Link 
          to="/account?tab=orders" 
          style={{ 
            color: '#e2e8f0', 
            transition: 'color 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#facc15')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        >
          <span>Track Order</span>
        </Link>
        <span style={{ opacity: 0.35 }}>|</span>
        <Link 
          to="/about" 
          style={{ 
            color: '#e2e8f0', 
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#facc15')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        >
          <span>Help</span>
        </Link>
        <span style={{ opacity: 0.35 }}>|</span>
        <Link 
          to="/about" 
          style={{ 
            color: '#e2e8f0', 
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#facc15')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        >
          <span>Store Locator</span>
        </Link>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .announcement-right-links {
            display: none !important;
          }
          .announcement-bar-top {
            justify-content: center !important;
            padding: 6px 10px !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>
    </div>
  );
};
