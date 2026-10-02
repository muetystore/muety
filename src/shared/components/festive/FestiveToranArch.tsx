import React from 'react';

interface FestiveToranArchProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const FestiveToranArch: React.FC<FestiveToranArchProps> = ({
  className = '',
  style = {},
  children
}) => {
  return (
    <div 
      className={`festive-arch-wrapper ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        pointerEvents: 'none'
      }}>
        <svg viewBox="0 0 1200 120" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
            </filter>
            <linearGradient id="mangoLeafGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <radialGradient id="marigoldYellow" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#facc15" />
              <stop offset="80%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </radialGradient>
            <radialGradient id="marigoldOrange" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="40%" stopColor="#fb923c" />
              <stop offset="80%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </radialGradient>
          </defs>

          <path
            d="M 20 15 Q 600 50 1180 15"
            fill="none"
            stroke="#d97706"
            strokeWidth="4"
          />
          <path
            d="M 20 15 Q 600 50 1180 15"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.5"
          />

          {[
            { x: 80, y: 20, rot: -8 },
            { x: 140, y: 25, rot: -6 },
            { x: 200, y: 29, rot: -4 },
            { x: 260, y: 33, rot: -2 },
            { x: 320, y: 36, rot: -1 },
            { x: 380, y: 39, rot: 0 },
            { x: 440, y: 41, rot: 1 },
            { x: 500, y: 43, rot: 2 },
            { x: 560, y: 44, rot: 1 },
            { x: 620, y: 44, rot: -1 },
            { x: 680, y: 43, rot: -2 },
            { x: 740, y: 41, rot: -1 },
            { x: 800, y: 39, rot: 0 },
            { x: 860, y: 36, rot: 1 },
            { x: 920, y: 33, rot: 2 },
            { x: 980, y: 29, rot: 4 },
            { x: 1040, y: 25, rot: 6 },
            { x: 1100, y: 20, rot: 8 }
          ].map((leaf, idx) => (
            <g 
              key={`leaf-${idx}`} 
              transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rot})`} 
              filter="url(#leafShadow)"
            >
              <path
                d="M 0 0 C 8 20, 14 50, 0 85 C -14 50, -8 20, 0 0 Z"
                fill="url(#mangoLeafGrad)"
                stroke="#14532d"
                strokeWidth="0.8"
              />
              <path d="M 0 5 L 0 75" stroke="#4ade80" strokeWidth="0.8" opacity="0.6" />
            </g>
          ))}

          {[
            { cx: 50, cy: 17, r: 10, type: 'yellow' },
            { cx: 80, cy: 20, r: 9, type: 'orange' },
            { cx: 110, cy: 23, r: 10, type: 'yellow' },
            { cx: 140, cy: 26, r: 9, type: 'orange' },
            { cx: 170, cy: 28, r: 10, type: 'yellow' },
            { cx: 200, cy: 30, r: 9, type: 'orange' },
            { cx: 230, cy: 32, r: 10, type: 'yellow' },
            { cx: 260, cy: 34, r: 9, type: 'orange' },
            { cx: 290, cy: 36, r: 10, type: 'yellow' },
            { cx: 320, cy: 38, r: 9, type: 'orange' },
            { cx: 350, cy: 40, r: 10, type: 'yellow' },
            { cx: 380, cy: 41, r: 9, type: 'orange' },
            { cx: 410, cy: 42, r: 10, type: 'yellow' },
            { cx: 440, cy: 43, r: 9, type: 'orange' },
            { cx: 470, cy: 44, r: 10, type: 'yellow' },
            { cx: 500, cy: 44, r: 9, type: 'orange' },
            { cx: 530, cy: 45, r: 10, type: 'yellow' },
            { cx: 560, cy: 45, r: 9, type: 'orange' },
            { cx: 590, cy: 45, r: 11, type: 'yellow' },
            { cx: 620, cy: 45, r: 9, type: 'orange' },
            { cx: 650, cy: 45, r: 10, type: 'yellow' },
            { cx: 680, cy: 44, r: 9, type: 'orange' },
            { cx: 710, cy: 44, r: 10, type: 'yellow' },
            { cx: 740, cy: 43, r: 9, type: 'orange' },
            { cx: 770, cy: 42, r: 10, type: 'yellow' },
            { cx: 800, cy: 41, r: 9, type: 'orange' },
            { cx: 830, cy: 40, r: 10, type: 'yellow' },
            { cx: 860, cy: 38, r: 9, type: 'orange' },
            { cx: 890, cy: 36, r: 10, type: 'yellow' },
            { cx: 920, cy: 34, r: 9, type: 'orange' },
            { cx: 950, cy: 32, r: 10, type: 'yellow' },
            { cx: 980, cy: 30, r: 9, type: 'orange' },
            { cx: 1010, cy: 28, r: 10, type: 'yellow' },
            { cx: 1040, cy: 26, r: 9, type: 'orange' },
            { cx: 1070, cy: 23, r: 10, type: 'yellow' },
            { cx: 1100, cy: 20, r: 9, type: 'orange' },
            { cx: 1130, cy: 17, r: 10, type: 'yellow' },
            { cx: 1160, cy: 15, r: 9, type: 'orange' }
          ].map((flower, idx) => (
            <circle
              key={`fl-${idx}`}
              cx={flower.cx}
              cy={flower.cy}
              r={flower.r}
              fill={flower.type === 'yellow' ? 'url(#marigoldYellow)' : 'url(#marigoldOrange)'}
              filter="url(#leafShadow)"
            />
          ))}

          {[80, 200, 320, 440, 560, 680, 800, 920, 1040].map((xPos, idx) => (
            <g key={`drop-${idx}`} transform={`translate(${xPos}, 0)`}>
              <circle cx="0" cy="92" r="7" fill="url(#marigoldYellow)" />
              <circle cx="0" cy="103" r="8" fill="url(#marigoldOrange)" />
              <circle cx="0" cy="115" r="9" fill="url(#marigoldYellow)" />
            </g>
          ))}
        </svg>
      </div>

      <div 
        className="banana-tree-left"
        style={{
          position: 'absolute',
          top: 0,
          left: '-15px',
          bottom: 0,
          width: '180px',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      >
        <svg viewBox="0 0 200 800" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <linearGradient id="bananaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <linearGradient id="flowerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9d174d" />
              <stop offset="50%" stopColor="#be185d" />
              <stop offset="100%" stopColor="#831843" />
            </linearGradient>
          </defs>

          <path d="M 60 120 L 70 800 L 95 800 L 85 120 Z" fill="url(#trunkGrad)" />
          <path d="M 62 200 Q 75 210 88 200" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 65 320 Q 78 330 91 320" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 67 460 Q 80 470 93 460" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 69 600 Q 82 610 94 600" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />

          <path d="M 70 120 C 30 60, -30 20, -10 100 C 10 140, 50 130, 70 120 Z" fill="#15803d" />
          <path d="M 75 110 C 60 40, 40 -10, 100 20 C 140 50, 110 90, 75 110 Z" fill="#22c55e" />
          <path d="M 70 130 C 90 60, 160 30, 190 90 C 180 130, 110 140, 70 130 Z" fill="#16a34a" />
          <path d="M 65 140 C 20 120, -40 160, 20 220 C 50 200, 60 160, 65 140 Z" fill="#14532d" />

          <g transform="translate(45, 140)">
            <path d="M 10 10 C 25 15, 30 35, 15 50 C 5 45, 0 25, 10 10 Z" fill="url(#bananaGrad)" />
            <path d="M 25 15 C 40 20, 45 40, 30 55 C 20 50, 15 30, 25 15 Z" fill="url(#bananaGrad)" />
            <path d="M 35 25 C 50 30, 55 50, 40 65 C 30 60, 25 40, 35 25 Z" fill="url(#bananaGrad)" />
            <path d="M 18 30 C 33 35, 38 55, 23 70 C 13 65, 8 45, 18 30 Z" fill="url(#bananaGrad)" />
            <path d="M 28 40 C 43 45, 48 65, 33 80 C 23 75, 18 55, 28 40 Z" fill="url(#bananaGrad)" />
            <path d="M 30 85 C 45 95, 45 130, 30 145 C 15 130, 15 95, 30 85 Z" fill="url(#flowerGrad)" />
          </g>
        </svg>
      </div>

      <div 
        className="banana-tree-right"
        style={{
          position: 'absolute',
          top: 0,
          right: '-15px',
          bottom: 0,
          width: '180px',
          zIndex: 2,
          pointerEvents: 'none',
          transform: 'scaleX(-1)'
        }}
      >
        <svg viewBox="0 0 200 800" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <use href="#trunkGrad" />
          <path d="M 60 120 L 70 800 L 95 800 L 85 120 Z" fill="url(#trunkGrad)" />
          <path d="M 62 200 Q 75 210 88 200" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 65 320 Q 78 330 91 320" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 67 460 Q 80 470 93 460" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 69 600 Q 82 610 94 600" stroke="#14532d" strokeWidth="3" fill="none" opacity="0.6" />

          <path d="M 70 120 C 30 60, -30 20, -10 100 C 10 140, 50 130, 70 120 Z" fill="#15803d" />
          <path d="M 75 110 C 60 40, 40 -10, 100 20 C 140 50, 110 90, 75 110 Z" fill="#22c55e" />
          <path d="M 70 130 C 90 60, 160 30, 190 90 C 180 130, 110 140, 70 130 Z" fill="#16a34a" />
          <path d="M 65 140 C 20 120, -40 160, 20 220 C 50 200, 60 160, 65 140 Z" fill="#14532d" />

          <g transform="translate(45, 140)">
            <path d="M 10 10 C 25 15, 30 35, 15 50 C 5 45, 0 25, 10 10 Z" fill="url(#bananaGrad)" />
            <path d="M 25 15 C 40 20, 45 40, 30 55 C 20 50, 15 30, 25 15 Z" fill="url(#bananaGrad)" />
            <path d="M 35 25 C 50 30, 55 50, 40 65 C 30 60, 25 40, 35 25 Z" fill="url(#bananaGrad)" />
            <path d="M 18 30 C 33 35, 38 55, 23 70 C 13 65, 8 45, 18 30 Z" fill="url(#bananaGrad)" />
            <path d="M 28 40 C 43 45, 48 65, 33 80 C 23 75, 18 55, 28 40 Z" fill="url(#bananaGrad)" />
            <path d="M 30 85 C 45 95, 45 130, 30 145 C 15 130, 15 95, 30 85 Z" fill="url(#flowerGrad)" />
          </g>
        </svg>
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        {children}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .banana-tree-left, .banana-tree-right {
            width: 100px !important;
            opacity: 0.7;
          }
        }
        @media (max-width: 600px) {
          .banana-tree-left, .banana-tree-right {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
