import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AppRole } from '@/types';
import { authService } from '@/features/auth/services/authService';
import { hasRole, hasAnyRole, hasPermission, Permission, getUserRoles } from '@/shared/utils/permissions';

export interface AuthModalConfig {
  redirectPath?: string;
  onSuccess?: () => void;
  reason?: 'checkout' | 'buy_now' | 'general';
  message?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  roles: AppRole[];
  role: AppRole | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalConfig: AuthModalConfig | null;
  openAuthModal: (config?: AuthModalConfig) => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (email: string, pass: string, name: string) => Promise<UserProfile>;
  loginWithGoogle: (useRedirectOnMobile?: boolean) => Promise<UserProfile>;
  sendPhoneOtp: (phoneNumber: string, appVerifier: any) => Promise<any>;
  verifyPhoneOtp: (confirmationResult: any, code: string) => Promise<UserProfile>;
  setupRecaptcha: (containerIdOrElement: string | HTMLElement, options?: any) => any;
  recordPatronCircleConsent: (uid: string, optIn: boolean, email?: string, phone?: string) => Promise<void>;
  updateCustomerProfile: (updates: { displayName?: string; phoneNumber?: string; photoURL?: string }) => Promise<UserProfile>;
  linkGoogleAccount: (useRedirectOnMobile?: boolean) => Promise<UserProfile>;
  sendPhoneLinkOtp: (phoneNumber: string, appVerifier: any) => Promise<any>;
  verifyPhoneLinkOtp: (confirmationResult: any, code: string, phoneToSave?: string) => Promise<UserProfile>;
  getConnectedStatus: (targetUser?: UserProfile | null) => {
    isGoogleConnected: boolean;
    googleEmail: string | null;
    isPhoneConnected: boolean;
    phoneNumber: string | null;
    maskedPhone: string | null;
  };
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalConfig, setAuthModalConfig] = useState<AuthModalConfig | null>(null);

  const openAuthModal = (config?: AuthModalConfig) => {
    setAuthModalConfig(config || { redirectPath: '/checkout', reason: 'checkout' });
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalConfig(null);
  };

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

  const loginWithGoogle = async (useRedirectOnMobile: boolean = false) => {
    setIsLoading(true);
    try {
      const u = await authService.loginWithGoogle(useRedirectOnMobile);
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneOtp = async (phoneNumber: string, appVerifier: any) => {
    setIsLoading(true);
    try {
      return await authService.sendPhoneOtp(phoneNumber, appVerifier);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneOtp = async (confirmationResult: any, code: string) => {
    setIsLoading(true);
    try {
      const u = await authService.verifyPhoneOtp(confirmationResult, code);
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const setupRecaptcha = (containerIdOrElement: string | HTMLElement, options?: any) => {
    return authService.setupRecaptcha(containerIdOrElement, options);
  };

  const recordPatronCircleConsent = async (uid: string, optIn: boolean, email?: string, phone?: string) => {
    return authService.recordPatronCircleConsent(uid, optIn, email, phone);
  };

  const updateCustomerProfile = async (updates: { displayName?: string; phoneNumber?: string; photoURL?: string }) => {
    setIsLoading(true);
    try {
      const u = await authService.updateCustomerProfile(updates);
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const linkGoogleAccount = async (useRedirectOnMobile: boolean = false) => {
    setIsLoading(true);
    try {
      const u = await authService.linkGoogleAccount(useRedirectOnMobile);
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneLinkOtp = async (phoneNumber: string, appVerifier: any) => {
    setIsLoading(true);
    try {
      return await authService.sendPhoneLinkOtp(phoneNumber, appVerifier);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneLinkOtp = async (confirmationResult: any, code: string, phoneToSave?: string) => {
    setIsLoading(true);
    try {
      const u = await authService.verifyPhoneLinkOtp(confirmationResult, code, phoneToSave);
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectedStatus = (targetUser?: UserProfile | null) => {
    return authService.getConnectedStatus(targetUser !== undefined ? targetUser : user);
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
      isAuthModalOpen,
      authModalConfig,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      loginWithGoogle,
      sendPhoneOtp,
      verifyPhoneOtp,
      setupRecaptcha,
      recordPatronCircleConsent,
      updateCustomerProfile,
      linkGoogleAccount,
      sendPhoneLinkOtp,
      verifyPhoneLinkOtp,
      getConnectedStatus,
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
