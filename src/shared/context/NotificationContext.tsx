import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showToast = (message: string, type: ToastType = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type, title };
    
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const success = (message: string, title?: string) => showToast(message, 'success', title || 'Success');
  const error = (message: string, title?: string) => showToast(message, 'error', title || 'Error');
  const info = (message: string, title?: string) => showToast(message, 'info', title || 'Notice');
  const warning = (message: string, title?: string) => showToast(message, 'warning', title || 'Warning');

  return (
    <NotificationContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      
      {/* Toast Render Container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100vw - 48px)'
      }}>
        {toasts.map(toast => {
          const bgColor = '#0f172a';
          let borderColor = '#334155';
          let IconComponent = Info;
          let iconColor = '#38bdf8';

          if (toast.type === 'success') {
            borderColor = '#10b981';
            IconComponent = CheckCircle2;
            iconColor = '#10b981';
          } else if (toast.type === 'error') {
            borderColor = '#ef4444';
            IconComponent = AlertCircle;
            iconColor = '#ef4444';
          } else if (toast.type === 'warning') {
            borderColor = '#d4af37';
            IconComponent = AlertTriangle;
            iconColor = '#d4af37';
          }

          return (
            <div
              key={toast.id}
              style={{
                backgroundColor: bgColor,
                color: '#ffffff',
                borderLeft: `4px solid ${borderColor}`,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <IconComponent size={20} color={iconColor} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.4' }}>
                {toast.title && <div style={{ fontWeight: 600, marginBottom: '2px', color: '#f8fafc' }}>{toast.title}</div>}
                <div style={{ color: '#cbd5e1' }}>{toast.message}</div>
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
