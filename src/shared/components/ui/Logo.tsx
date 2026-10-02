import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'light' | 'dark' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  to?: string;
  showImage?: boolean;
  imageOnly?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showTagline = false,
  className = '',
  to = '/',
  showImage = true,
  imageOnly = false,
  orientation
}) => {
  const isVertical = orientation === 'vertical' || (orientation === undefined && (size === 'lg' || size === 'xl') && showTagline);

  let imageSize = '44px';
  let fontSize = '1.45rem';
  let letterSpacing = '0.12em';
  let taglineSize = '0.62rem';

  if (size === 'sm') {
    imageSize = '32px';
    fontSize = '1.15rem';
    letterSpacing = '0.1em';
    taglineSize = '0.55rem';
  } else if (size === 'md') {
    imageSize = '44px';
    fontSize = '1.45rem';
    letterSpacing = '0.12em';
    taglineSize = '0.62rem';
  } else if (size === 'lg') {
    imageSize = isVertical ? '84px' : '56px';
    fontSize = '1.85rem';
    letterSpacing = '0.15em';
    taglineSize = '0.7rem';
  } else if (size === 'xl') {
    imageSize = isVertical ? '120px' : '72px';
    fontSize = '2.4rem';
    letterSpacing = '0.18em';
    taglineSize = '0.8rem';
  }

  let textColor = '#3b0d11';
  let tagColor = '#854d0e';
  let shadow = '0 2px 8px rgba(212, 175, 55, 0.25)';

  if (variant === 'light') {
    textColor = '#ffffff';
    tagColor = '#cbd5e1';
    shadow = '0 0 12px rgba(212, 175, 55, 0.4)';
  } else if (variant === 'gold') {
    textColor = '#d4af37';
    tagColor = '#fef08a';
    shadow = '0 0 12px rgba(212, 175, 55, 0.5)';
  } else if (variant === 'dark') {
    textColor = '#1e1b18';
    tagColor = '#78350f';
  }

  const LogoContent = (
    <div 
      className={`muety-brand-logo ${className}`} 
      style={{
        display: 'inline-flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        gap: '0.75rem',
        textDecoration: 'none',
        userSelect: 'none'
      }}
    >
      {showImage && (
        <div style={{
          position: 'relative',
          width: imageSize,
          height: imageSize,
          borderRadius: '50%',
          padding: '1.5px',
          background: 'linear-gradient(135deg, #f59e0b, #d4af37, #b45309, #d4af37)',
          boxShadow: shadow,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <img 
            src="/muety-logo.png" 
            alt="MUETY Logo" 
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        </div>
      )}

      {!imageOnly && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isVertical ? 'center' : 'flex-start',
          textAlign: isVertical ? 'center' : 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize,
            letterSpacing,
            color: textColor,
            lineHeight: 1.1,
            transition: 'transform var(--transition-fast)'
          }}>
            <span>MUETY</span>
            <span style={{
              display: 'inline-block',
              width: size === 'sm' ? '4px' : size === 'lg' || size === 'xl' ? '8px' : '6px',
              height: size === 'sm' ? '4px' : size === 'lg' || size === 'xl' ? '8px' : '6px',
              backgroundColor: '#d4af37',
              borderRadius: '50%',
              boxShadow: '0 0 6px rgba(212,175,55,0.7)'
            }} />
          </div>

          <span style={{
            fontSize: taglineSize,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: tagColor,
            marginTop: '3px',
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif"
          }}>
            {showTagline ? 'SAREES FOR YOUR STORY' : 'SAREES • ETHNIC WEAR'}
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} style={{ textDecoration: 'none', display: 'inline-flex' }}>{LogoContent}</Link>;
  }

  return LogoContent;
};
