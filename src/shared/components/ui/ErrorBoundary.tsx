import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#fffdfa'
        }}>
          <div style={{
            maxWidth: '520px',
            backgroundColor: '#ffffff',
            padding: '2.5rem 2rem',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              color: '#d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: '1.4rem',
              fontWeight: 700
            }}>
              M
            </div>

            <h2 style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: '1.6rem',
              color: '#1a1a1a',
              marginBottom: '0.75rem',
              fontWeight: 600
            }}>
              Creation Momentarily Paused
            </h2>

            <p style={{
              color: '#666',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '1.75rem'
            }}>
              Our atelier encountered a temporary presentation issue while curating this view.
              Please refresh or return to the main gallery.
            </p>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '0.7rem 1.4rem',
                  backgroundColor: '#1a1a1a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.04em'
                }}
              >
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '0.7rem 1.4rem',
                  backgroundColor: 'transparent',
                  color: '#1a1a1a',
                  border: '1px solid #d4af37',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.04em'
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
