import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLink?: {
    to: string;
    label: string;
  };
  centered?: boolean;
  theme?: 'light' | 'dark';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actionLink,
  centered = false,
  theme = 'light'
}) => {
  const isDark = theme === 'dark';

  return (
    <div 
      className="section-header-component"
      style={{
        display: 'flex',
        flexDirection: centered ? 'column' : 'row',
        alignItems: centered ? 'center' : 'flex-end',
        justifyContent: centered ? 'center' : 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        textAlign: centered ? 'center' : 'left'
      }}
    >
      <div style={{ maxWidth: centered ? '720px' : '680px' }}>
        {eyebrow && (
          <span 
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isDark ? '#d4af37' : '#991b1b',
              marginBottom: '6px'
            }}
          >
            {eyebrow}
          </span>
        )}
        <h2 
          style={{
            fontSize: 'clamp(1.5rem, 3.2vw, 2.2rem)',
            fontWeight: 700,
            color: isDark ? '#ffffff' : 'var(--brand-primary, #0f172a)',
            lineHeight: 1.25,
            margin: 0
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p 
            style={{
              fontSize: 'clamp(0.85rem, 1.8vw, 0.96rem)',
              color: isDark ? '#94a3b8' : 'var(--text-secondary, #475569)',
              marginTop: '6px',
              marginBottom: 0,
              lineHeight: 1.5
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actionLink && (
        <Link
          to={actionLink.to}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: isDark ? '#d4af37' : 'var(--brand-primary, #0f172a)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm, 6px)',
            border: isDark ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid var(--brand-border, #e2e8f0)',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          className="section-header-action"
        >
          <span>{actionLink.label}</span>
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
};
