import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  headerIcon?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
  disableClose?: boolean;
  showHeader?: boolean;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  title = '',
  subtitle,
  headerIcon,
  maxWidth = '640px',
  children,
  disableClose = false,
  showHeader = true
}) => {
  // Lock background body scroll and bind Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, disableClose, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="admin-modal-overlay animate-fade-in"
      onClick={() => !disableClose && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div
        className="admin-modal-content animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth }}
      >
        {/* Modal Header */}
        {showHeader && (
          <div className="admin-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              {headerIcon && (
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d4af37',
                  flexShrink: 0
                }}>
                  {headerIcon}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <h2
                  id="admin-modal-title"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: 0,
                    fontFamily: 'var(--font-heading)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {title}
                </h2>
                {subtitle && (
                  <p style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    margin: '2px 0 0 0',
                    lineHeight: 1.3
                  }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={disableClose}
              onClick={onClose}
              aria-label="Close modal"
              style={{
                color: '#ffffff',
                background: 'transparent',
                border: 'none',
                cursor: disableClose ? 'not-allowed' : 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
                flexShrink: 0,
                marginLeft: '12px'
              }}
              onMouseEnter={e => {
                if (!disableClose) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Modal Body & Footer */}
        {children}
      </div>
    </div>,
    document.body
  );
};
