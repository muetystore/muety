import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Flame } from 'lucide-react';

interface DiyaProps {
  size?: number;
  isLit?: boolean;
  onToggle?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DiyaLamp: React.FC<DiyaProps> = ({
  size = 54,
  isLit = true,
  onToggle,
  className = '',
  style = {}
}) => {
  return (
    <div
      onClick={onToggle}
      className={`diwali-diya-lamp ${className}`}
      style={{
        width: `${size}px`,
        height: `${size * 0.8}px`,
        position: 'relative',
        cursor: onToggle ? 'pointer' : 'default',
        userSelect: 'none',
        display: 'inline-block',
        ...style
      }}
      title={onToggle ? 'Click to Light the Diya' : 'Diwali Diya'}
    >
      <svg viewBox="0 0 100 80" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <filter id="diyaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <linearGradient id="clayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>

          <radialGradient id="flameGrad" cx="50%" cy="80%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="90%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.6)" />
            <stop offset="50%" stopColor="rgba(245, 158, 11, 0.25)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
          </radialGradient>
        </defs>

        {isLit && (
          <circle 
            cx="50" 
            cy="15" 
            r="38" 
            fill="url(#auraGlow)" 
            className="diya-aura-pulse" 
          />
        )}

        {isLit && (
          <g className="diya-flame-flicker" filter="url(#diyaGlow)">
            <path
              d="M 50 2 C 40 18, 38 28, 50 36 C 62 28, 60 18, 50 2 Z"
              fill="url(#flameGrad)"
            />
            <path
              d="M 50 12 C 44 22, 45 28, 50 32 C 55 28, 56 22, 50 12 Z"
              fill="#ffffff"
            />
          </g>
        )}

        <path d="M 50 34 L 50 40" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />

        <path
          d="M 10 40 C 15 65, 30 75, 50 75 C 70 75, 85 65, 90 40 C 70 46, 30 46, 10 40 Z"
          fill="url(#clayGrad)"
          stroke="#fed7aa"
          strokeWidth="1.5"
        />

        <path
          d="M 10 40 Q 50 48 90 40"
          fill="none"
          stroke="#fde047"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
        <circle cx="30" cy="56" r="2.5" fill="#fde047" />
        <circle cx="50" cy="62" r="3.5" fill="#facc15" />
        <circle cx="70" cy="56" r="2.5" fill="#fde047" />
      </svg>
    </div>
  );
};

export const DiwaliInteractiveCelebration: React.FC = () => {
  const [litCount, setLitCount] = useState<number>(3);
  const [, setCelebrated] = useState(false);

  const handleLightAll = () => {
    setLitCount(5);
    setCelebrated(true);
    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.65 },
        colors: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#d4af37', '#ec4899']
      });
    } catch {}
  };

  return (
    <div style={{
      backgroundColor: '#0c121e',
      border: '1.5px solid rgba(212, 175, 55, 0.4)',
      borderRadius: 'var(--radius-xl)',
      padding: '2rem',
      boxShadow: '0 15px 35px -5px rgba(245, 158, 11, 0.2)',
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
      color: '#ffffff'
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '80%',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-full)',
          padding: '6px 14px',
          color: '#facc15',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          marginBottom: '1rem'
        }}>
          <Sparkles size={14} color="#facc15" />
          MUETY FESTIVAL OF LIGHTS • SHUBH DEEPAVALI
        </div>

        <h3 style={{ color: '#ffffff', fontSize: '1.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
          Light a Diya for Prosperity & Joy
        </h3>
        
        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          Celebrate auspicious beginnings with MUETY. Apply festive promo code <strong style={{ color: '#facc15', letterSpacing: '0.05em' }}>DIWALI25</strong> at checkout for <strong>25% Off Storewide</strong> & complimentary gold-foil gift wrapping.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1.5rem',
          margin: '1.5rem 0 2rem',
          flexWrap: 'wrap'
        }}>
          {[0, 1, 2, 3, 4].map(idx => (
            <DiyaLamp 
              key={idx} 
              size={64} 
              isLit={idx < litCount} 
              onToggle={() => {
                setLitCount(prev => (prev > idx ? idx : idx + 1));
                if (idx >= 3) {
                  try {
                    confetti({ particleCount: 40, spread: 50, colors: ['#f59e0b', '#d4af37', '#e11d48'] });
                  } catch {}
                }
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleLightAll}
            className="btn btn-accent"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #d4af37 100%)',
              color: '#0f172a',
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)'
            }}
          >
            <Flame size={18} fill="#0f172a" /> Light All Auspicious Diyas
          </button>
        </div>
      </div>

      <style>{`
        @keyframes diyaFlicker {
          0% { transform: scale(1) translate(0, 0) rotate(0deg); opacity: 0.95; }
          25% { transform: scale(1.08, 0.95) translate(-1px, -1px) rotate(-2deg); opacity: 1; }
          50% { transform: scale(0.95, 1.05) translate(1px, -2px) rotate(2deg); opacity: 0.9; }
          75% { transform: scale(1.04, 0.98) translate(-1px, 0px) rotate(-1deg); opacity: 1; }
          100% { transform: scale(1) translate(0, 0) rotate(0deg); opacity: 0.95; }
        }
        .diya-flame-flicker {
          transform-origin: 50px 35px;
          animation: diyaFlicker 0.6s infinite ease-in-out alternate;
        }
        @keyframes auraPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 0.95; }
        }
        .diya-aura-pulse {
          transform-origin: 50px 15px;
          animation: auraPulse 1.8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
