import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, Tag } from 'lucide-react';
import { announcementService } from '@/features/announcements/services/announcementService';
import { StoreAnnouncement } from '@/features/announcements/types';

interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const AnnouncementBar: React.FC = () => {
  const [announcements, setAnnouncements] = useState<StoreAnnouncement[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  // Listen to announcements from announcementService (Firestore + LocalStorage)
  useEffect(() => {
    const unsub = announcementService.subscribeToAnnouncements((all) => {
      setAnnouncements(all);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Timer tick for active countdowns and date boundaries
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter active and non-expired announcements
  const activeAnnouncements = useMemo(() => {
    return announcements
      .filter((ann) => {
        if (!ann.isActive) return false;
        if (ann.startDate && new Date(ann.startDate).getTime() > now) return false;
        if (ann.endDate && new Date(ann.endDate).getTime() < now) return false;
        return true;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [announcements, now]);

  // Continuous auto-scrolling track: repeat single announcement 3 times with separators so it flows seamlessly across any screen
  const trackItems = useMemo(() => {
    if (activeAnnouncements.length === 1) {
      return [activeAnnouncements[0], activeAnnouncements[0], activeAnnouncements[0]];
    }
    return activeAnnouncements;
  }, [activeAnnouncements]);

  // If no active announcements, do not render duplicate/empty strip
  if (activeAnnouncements.length === 0) {
    return null;
  }

  // Find active countdown if any
  const countdownAnnouncement = activeAnnouncements.find(
    (a) => a.hasCountdown && a.countdownEndTime && new Date(a.countdownEndTime).getTime() > now
  );

  let countdownTime: CountdownState | null = null;
  if (countdownAnnouncement && countdownAnnouncement.countdownEndTime) {
    const diff = new Date(countdownAnnouncement.countdownEndTime).getTime() - now;
    if (diff > 0) {
      countdownTime = {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isExpired: false
      };
    }
  }

  const formatDigits = (val: number) => String(val).padStart(2, '0');

  const primaryBg = activeAnnouncements[0]?.backgroundColor || '#4a0e2e';
  const primaryTextColor = activeAnnouncements[0]?.textColor || '#ffffff';


  const renderAnnouncementContent = (ann: StoreAnnouncement, index: number) => {
    const content = (
      <span className="announcement-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={12} color={ann.accentColor || '#facc15'} style={{ flexShrink: 0 }} />
        
        {ann.campaignLabel && (
          <span style={{ 
            color: ann.accentColor || '#facc15', 
            letterSpacing: '0.05em', 
            textTransform: 'uppercase', 
            fontWeight: 700 
          }}>
            {ann.campaignLabel}
          </span>
        )}

        {ann.campaignLabel && <span style={{ opacity: 0.45 }}>•</span>}

        <span style={{ fontWeight: 600 }}>{ann.message}</span>

        {ann.couponCode && (
          <>
            <span style={{ opacity: 0.45 }}>•</span>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              color: ann.accentColor || '#facc15',
              padding: '1px 6px',
              borderRadius: '3px',
              border: '1px solid rgba(250, 204, 21, 0.35)',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.04em',
              userSelect: 'all'
            }}>
              CODE: {ann.couponCode}
            </span>
          </>
        )}

        {countdownTime && ann.id === countdownAnnouncement?.id && (
          <>
            <span style={{ opacity: 0.45 }}>•</span>
            <span className="countdown-pill-group" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#fef08a' }}>
              <Clock size={11} style={{ flexShrink: 0 }} />
              <span className="countdown-pill">{formatDigits(countdownTime.hours)}h</span>:
              <span className="countdown-pill">{formatDigits(countdownTime.minutes)}m</span>:
              <span className="countdown-pill">{formatDigits(countdownTime.seconds)}s</span>
            </span>
          </>
        )}

        {ann.ctaLink && (
          <span style={{
            color: ann.accentColor || '#facc15',
            fontWeight: 700,
            textDecoration: 'underline',
            marginLeft: '4px',
            fontSize: '0.73rem'
          }}>
            {ann.ctaText || 'Shop Edit →'}
          </span>
        )}

        <Sparkles size={12} color={ann.accentColor || '#facc15'} style={{ flexShrink: 0 }} />
        <span style={{ margin: '0 12px', opacity: 0.4 }}>✦</span>
      </span>
    );

    if (ann.ctaLink) {
      return (
        <Link 
          key={`${ann.id}-${index}`} 
          to={ann.ctaLink} 
          style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          {content}
        </Link>
      );
    }

    return <React.Fragment key={`${ann.id}-${index}`}>{content}</React.Fragment>;
  };

  return (
    <aside 
      className="announcement-bar-top"
      aria-label="Promotional Announcement"
      style={{
        backgroundColor: primaryBg,
        color: primaryTextColor,
        padding: '6px 1rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        borderBottom: '1px solid rgba(201, 162, 39, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1001,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Central Announcement Container: Continuous Auto-scrolling Marquee Track */}
      <div 
        className="announcement-content-track marquee-enabled"
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}
      >
        <div className="marquee-wrapper" tabIndex={0} aria-label="Scrolling promotional offers. Hover or focus to pause.">
          {/* Track 1 */}
          <div className="marquee-inner">
            {trackItems.map((ann, idx) => (
              <React.Fragment key={`t1-${ann.id}-${idx}`}>
                {renderAnnouncementContent(ann, idx)}
                <span style={{ margin: '0 1.25rem', opacity: 0.4 }}>✦</span>
              </React.Fragment>
            ))}
          </div>
          {/* Track 2 (seamless duplication for infinite continuous loop) */}
          <div className="marquee-inner" aria-hidden="true">
            {trackItems.map((ann, idx) => (
              <React.Fragment key={`t2-${ann.id}-${idx}`}>
                {renderAnnouncementContent(ann, idx + 100)}
                <span style={{ margin: '0 1.25rem', opacity: 0.4 }}>✦</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>


      {/* Desktop Quick Utility Links */}
      <div 
        className="announcement-right-links"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.72rem',
          color: '#cbd5e1',
          flexShrink: 0,
          marginLeft: '1rem',
          zIndex: 2
        }}
      >
        <Link 
          to="/account?tab=orders" 
          style={{ color: '#e2e8f0', transition: 'color 0.15s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#facc15')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        >
          Track Order
        </Link>
        <span style={{ opacity: 0.35 }}>|</span>
        <Link 
          to="/about" 
          style={{ color: '#e2e8f0', transition: 'color 0.15s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#facc15')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        >
          Muety Atelier
        </Link>
        <span style={{ opacity: 0.35 }}>|</span>
        <Link 
          to="/support" 
          style={{ color: '#e2e8f0', transition: 'color 0.15s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#facc15')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        >
          Patron Care
        </Link>
      </div>

      <style>{`
        .announcement-bar-top {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .countdown-pill {
          background-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 1px 4px;
          border-radius: 3px;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          font-size: 0.68rem;
        }
        .marquee-wrapper {
          display: inline-flex;
          align-items: center;
          width: 100%;
          overflow: hidden;
          cursor: pointer;
        }
        .marquee-inner {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          animation: marquee-scroll 28s linear infinite;
          will-change: transform;
        }
        .marquee-wrapper:hover .marquee-inner,
        .marquee-wrapper:focus .marquee-inner {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-inner {
            animation: none !important;
            transform: none !important;
          }
          .marquee-wrapper {
            overflow-x: auto;
          }
        }
        @media (max-width: 991px) {
          .announcement-right-links {
            display: none !important;
          }
          .announcement-bar-top {
            padding: 5px 8px !important;
            justify-content: center !important;
          }
        }
        @media (max-width: 425px) {
          .announcement-bar-top {
            font-size: 0.72rem !important;
          }
          .announcement-item {
            gap: 5px !important;
          }
        }
        @media (max-width: 360px) {
          .announcement-bar-top {
            font-size: 0.68rem !important;
          }
          .countdown-pill {
            padding: 0 2px !important;
            font-size: 0.62rem !important;
          }
        }
      `}</style>
    </aside>
  );
};
