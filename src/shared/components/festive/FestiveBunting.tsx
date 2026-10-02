import React from 'react';

interface FestiveBuntingProps {
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const FestiveBunting: React.FC<FestiveBuntingProps> = ({ 
  rows = 2, 
  className = '',
  style = {}
}) => {
  return (
    <div 
      className={`festive-bunting-container ${className}`}
      style={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        pointerEvents: 'none',
        zIndex: 2,
        ...style
      }}
    >
      <svg
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: '100%',
          minHeight: rows > 1 ? '100px' : '65px',
          display: 'block'
        }}
      >
        <defs>
          <filter id="buntingShadow" x="-10%" y="-10%" width="130%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.35" />
          </filter>
          <linearGradient id="goldString" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        <path
          d="M -20 15 Q 360 70 720 30 T 1460 20"
          fill="none"
          stroke="#991b1b"
          strokeWidth="3.5"
        />
        <path
          d="M -20 15 Q 360 70 720 30 T 1460 20"
          fill="none"
          stroke="url(#goldString)"
          strokeWidth="1.8"
        />

        {[
          { x1: 20, y1: 22, cx: 35, cy: 75, x2: 50, y2: 26, color: '#38bdf8' },
          { x1: 65, y1: 28, cx: 80, cy: 82, x2: 95, y2: 33, color: '#f97316' },
          { x1: 110, y1: 35, cx: 125, cy: 90, x2: 140, y2: 40, color: '#ef4444' },
          { x1: 155, y1: 42, cx: 170, cy: 98, x2: 185, y2: 47, color: '#eab308' },
          { x1: 200, y1: 49, cx: 215, cy: 104, x2: 230, y2: 53, color: '#10b981' },
          { x1: 245, y1: 55, cx: 260, cy: 108, x2: 275, y2: 58, color: '#ec4899' },
          { x1: 290, y1: 60, cx: 305, cy: 112, x2: 320, y2: 62, color: '#8b5cf6' },
          { x1: 335, y1: 63, cx: 350, cy: 114, x2: 365, y2: 63, color: '#f59e0b' },
          { x1: 380, y1: 62, cx: 395, cy: 113, x2: 410, y2: 60, color: '#14b8a6' },
          { x1: 425, y1: 58, cx: 440, cy: 108, x2: 455, y2: 55, color: '#ef4444' },
          { x1: 470, y1: 53, cx: 485, cy: 102, x2: 500, y2: 49, color: '#eab308' },
          { x1: 515, y1: 47, cx: 530, cy: 95, x2: 545, y2: 43, color: '#38bdf8' },
          { x1: 560, y1: 41, cx: 575, cy: 88, x2: 590, y2: 37, color: '#f97316' },
          { x1: 605, y1: 36, cx: 620, cy: 82, x2: 635, y2: 33, color: '#10b981' },
          { x1: 650, y1: 32, cx: 665, cy: 77, x2: 680, y2: 30, color: '#d946ef' },
          { x1: 695, y1: 30, cx: 710, cy: 75, x2: 725, y2: 30, color: '#eab308' },
          { x1: 740, y1: 30, cx: 755, cy: 77, x2: 770, y2: 32, color: '#ef4444' },
          { x1: 785, y1: 33, cx: 800, cy: 83, x2: 815, y2: 36, color: '#14b8a6' },
          { x1: 830, y1: 37, cx: 845, cy: 89, x2: 860, y2: 41, color: '#f97316' },
          { x1: 875, y1: 43, cx: 890, cy: 96, x2: 905, y2: 47, color: '#38bdf8' },
          { x1: 920, y1: 49, cx: 935, cy: 103, x2: 950, y2: 53, color: '#ec4899' },
          { x1: 965, y1: 55, cx: 980, cy: 109, x2: 995, y2: 58, color: '#eab308' },
          { x1: 1010, y1: 60, cx: 1025, cy: 112, x2: 1040, y2: 62, color: '#10b981' },
          { x1: 1055, y1: 62, cx: 1070, cy: 113, x2: 1085, y2: 60, color: '#8b5cf6' },
          { x1: 1100, y1: 58, cx: 1115, cy: 108, x2: 1130, y2: 54, color: '#f59e0b' },
          { x1: 1145, y1: 52, cx: 1160, cy: 101, x2: 1175, y2: 48, color: '#ef4444' },
          { x1: 1190, y1: 46, cx: 1205, cy: 94, x2: 1220, y2: 41, color: '#38bdf8' },
          { x1: 1235, y1: 39, cx: 1250, cy: 86, x2: 1265, y2: 35, color: '#f97316' },
          { x1: 1280, y1: 33, cx: 1295, cy: 79, x2: 1310, y2: 29, color: '#10b981' },
          { x1: 1325, y1: 28, cx: 1340, cy: 73, x2: 1355, y2: 25, color: '#eab308' },
          { x1: 1370, y1: 24, cx: 1385, cy: 68, x2: 1400, y2: 22, color: '#ec4899' },
          { x1: 1415, y1: 21, cx: 1430, cy: 64, x2: 1445, y2: 20, color: '#38bdf8' }
        ].map((flag, idx) => (
          <polygon
            key={`flag1-${idx}`}
            points={`${flag.x1},${flag.y1} ${flag.cx},${flag.cy} ${flag.x2},${flag.y2}`}
            fill={flag.color}
            filter="url(#buntingShadow)"
            opacity="0.95"
            style={{
              transformOrigin: `${flag.cx}px ${flag.y1}px`,
              animation: `swayBunting 3s ease-in-out infinite alternate ${idx * 0.1}s`
            }}
          />
        ))}

        {rows > 1 && (
          <>
            <path
              d="M -20 60 Q 380 145 740 100 T 1460 65"
              fill="none"
              stroke="#7c2d12"
              strokeWidth="3"
            />
            <path
              d="M -20 60 Q 380 145 740 100 T 1460 65"
              fill="none"
              stroke="url(#goldString)"
              strokeWidth="1.5"
            />

            {[
              { x1: 30, y1: 67, cx: 48, cy: 118, x2: 65, y2: 74, color: '#eab308' },
              { x1: 85, y1: 79, cx: 103, cy: 131, x2: 120, y2: 87, color: '#10b981' },
              { x1: 140, y1: 92, cx: 158, cy: 144, x2: 175, y2: 99, color: '#ef4444' },
              { x1: 195, y1: 104, cx: 213, cy: 155, x2: 230, y2: 110, color: '#38bdf8' },
              { x1: 250, y1: 114, cx: 268, cy: 163, x2: 285, y2: 119, color: '#f97316' },
              { x1: 305, y1: 122, cx: 323, cy: 169, x2: 340, y2: 125, color: '#ec4899' },
              { x1: 360, y1: 127, cx: 378, cy: 172, x2: 395, y2: 128, color: '#8b5cf6' },
              { x1: 415, y1: 128, cx: 433, cy: 171, x2: 450, y2: 126, color: '#14b8a6' },
              { x1: 470, y1: 124, cx: 488, cy: 166, x2: 505, y2: 120, color: '#f59e0b' },
              { x1: 525, y1: 117, cx: 543, cy: 157, x2: 560, y2: 112, color: '#ef4444' },
              { x1: 580, y1: 108, cx: 598, cy: 147, x2: 615, y2: 102, color: '#10b981' },
              { x1: 635, y1: 99, cx: 653, cy: 137, x2: 670, y2: 94, color: '#eab308' },
              { x1: 690, y1: 92, cx: 708, cy: 129, x2: 725, y2: 89, color: '#38bdf8' },
              { x1: 745, y1: 89, cx: 763, cy: 127, x2: 780, y2: 90, color: '#d946ef' },
              { x1: 800, y1: 92, cx: 818, cy: 132, x2: 835, y2: 96, color: '#f97316' },
              { x1: 855, y1: 99, cx: 873, cy: 140, x2: 890, y2: 104, color: '#14b8a6' },
              { x1: 910, y1: 107, cx: 928, cy: 149, x2: 945, y2: 113, color: '#ef4444' },
              { x1: 965, y1: 115, cx: 983, cy: 158, x2: 1000, y2: 120, color: '#eab308' },
              { x1: 1020, y1: 121, cx: 1038, cy: 164, x2: 1055, y2: 123, color: '#10b981' },
              { x1: 1075, y1: 123, cx: 1093, cy: 165, x2: 1110, y2: 122, color: '#ec4899' },
              { x1: 1130, y1: 120, cx: 1148, cy: 160, x2: 1165, y2: 116, color: '#38bdf8' },
              { x1: 1185, y1: 113, cx: 1203, cy: 151, x2: 1220, y2: 108, color: '#f97316' },
              { x1: 1240, y1: 104, cx: 1258, cy: 140, x2: 1275, y2: 98, color: '#8b5cf6' },
              { x1: 1295, y1: 93, cx: 1313, cy: 128, x2: 1330, y2: 87, color: '#10b981' },
              { x1: 1350, y1: 82, cx: 1368, cy: 116, x2: 1385, y2: 76, color: '#eab308' },
              { x1: 1405, y1: 72, cx: 1423, cy: 104, x2: 1440, y2: 67, color: '#ef4444' }
            ].map((flag, idx) => (
              <polygon
                key={`flag2-${idx}`}
                points={`${flag.x1},${flag.y1} ${flag.cx},${flag.cy} ${flag.x2},${flag.y2}`}
                fill={flag.color}
                filter="url(#buntingShadow)"
                opacity="0.9"
                style={{
                  transformOrigin: `${flag.cx}px ${flag.y1}px`,
                  animation: `swayBunting 3.4s ease-in-out infinite alternate ${idx * 0.12 + 0.5}s`
                }}
              />
            ))}
          </>
        )}
      </svg>
    </div>
  );
};
