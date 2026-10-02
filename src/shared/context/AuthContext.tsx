import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AppRole } from '@/types';
import { authService } from '@/features/auth/services/authService';
import { hasRole, hasAnyRole, hasPermission, Permission, getUserRoles } from '@/shared/utils/permissions';

interface AuthContextType {
  user: UserProfile | null;
  roles: AppRole[];
  role: AppRole | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (email: string, pass: string, name: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((newUser) => {
      setUser(newUser);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const u = await authService.login(email, pass);
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      const u = await authService.register(email, pass, name);
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const u = await authService.loginWithGoogle();
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    return authService.sendPasswordReset(email);
  };

  const userRoles = getUserRoles(user);
  const role = userRoles[0] || null;
  const isAdmin = hasAnyRole(user, ['super_admin', 'admin', 'catalog_manager', 'order_manager', 'support_agent']);
  const isAuthenticated = !!user;

  const checkHasRole = (targetRole: AppRole) => hasRole(user, targetRole);
  const checkHasAnyRole = (targetRoles: AppRole[]) => hasAnyRole(user, targetRoles);
  const checkHasPermission = (permission: Permission) => hasPermission(user, permission);

  return (
    <AuthContext.Provider value={{
      user,
      roles: userRoles,
      role,
      isAdmin,
      isAuthenticated,
      isLoading,
      login,
      register,
      loginWithGoogle,
      logout,
      sendPasswordReset,
      hasRole: checkHasRole,
      hasAnyRole: checkHasAnyRole,
      hasPermission: checkHasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
