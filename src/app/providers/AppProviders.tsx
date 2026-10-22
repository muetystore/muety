import React, { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/shared/context/AuthContext';
import { CartProvider } from '@/shared/context/CartContext';
import { NotificationProvider } from '@/shared/context/NotificationContext';

interface AppProvidersProps {
  children: ReactNode;
}
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NotificationProvider>
          <AuthProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};
