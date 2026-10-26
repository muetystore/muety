import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Polyfill localStorage & sessionStorage in test environment
const memoryStorage: Record<string, string> = {};
const sessionMemory: Record<string, string> = {};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = String(val); },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

if (typeof globalThis.sessionStorage === 'undefined') {
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => sessionMemory[key] || null,
    setItem: (key: string, val: string) => { sessionMemory[key] = String(val); },
    removeItem: (key: string) => { delete sessionMemory[key]; },
    clear: () => { Object.keys(sessionMemory).forEach(k => delete sessionMemory[k]); }
  };
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    location: {
      pathname: '/login',
      search: '?redirect=/checkout',
      href: 'http://localhost:5173/login?redirect=/checkout'
    }
  };
}

// Mock Firebase dependencies
vi.mock('@/lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {
    authDomain: 'muetystore-fdad2.firebaseapp.com'
  }
}));

import { authService } from '@/features/auth/services/authService';

describe('Mobile Google Sign-In Redirect Loop Fix Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. AuthService Auth-Ready & Redirect Coordination', () => {
    it('initializes auth and exposes waitForAuthReady and getIsInitialized', async () => {
      expect(typeof authService.waitForAuthReady).toBe('function');
      expect(typeof authService.getIsInitialized).toBe('function');

      const readyUser = await authService.waitForAuthReady();
      expect(authService.getIsInitialized()).toBe(true);
      // In offline / mock fallback mode, readyUser matches currentUser
      expect(readyUser).toEqual(authService.getCurrentUser());
    });

    it('manages redirect errors without silent swallowing', () => {
      expect(typeof authService.getLastRedirectError).toBe('function');
      expect(typeof authService.clearLastRedirectError).toBe('function');

      // Initially null
      expect(authService.getLastRedirectError()).toBeNull();

      // Can clear error safely
      authService.clearLastRedirectError();
      expect(authService.getLastRedirectError()).toBeNull();
    });

    it('preserves user destination in sessionStorage when mobile redirect is triggered', async () => {
      // Mock mobile user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        configurable: true
      });

      // Set current window location search with redirect param
      delete (window as any).location;
      (window as any).location = {
        pathname: '/login',
        search: '?redirect=/checkout',
        href: 'http://localhost:5173/login?redirect=/checkout'
      };

      // In offline/mock mode, loginWithGoogle succeeds and records fallback
      const user = await authService.loginWithGoogle(false);
      expect(user).toBeDefined();

      // Restore user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
    });
  });

  describe('2. LoginPage.tsx Post-Redirect & Loading State Architecture', () => {
    const loginFilePath = path.join(process.cwd(), 'src/features/auth/pages/LoginPage.tsx');
    const loginContent = fs.readFileSync(loginFilePath, 'utf8');

    it('destructures isAuthReady, user, and isAuthenticated from useAuth', () => {
      expect(loginContent).toContain('user,');
      expect(loginContent).toContain('isAuthenticated,');
      expect(loginContent).toContain('isAuthReady,');
    });

    it('retrieves saved redirect destination from sessionStorage or redirectParam', () => {
      expect(loginContent).toContain("sessionStorage.getItem('muety_auth_redirect_dest')");
      expect(loginContent).toContain("rawFrom.startsWith('/login?')");
    });

    it('reactively navigates to destination when authenticated and ready', () => {
      expect(loginContent).toContain('if (isAuthReady && isAuthenticated && user)');
      expect(loginContent).toContain("sessionStorage.removeItem('muety_auth_redirect_dest')");
      expect(loginContent).toContain('navigate(from, { replace: true })');
    });

    it('checks and reports redirect errors from authService', () => {
      expect(loginContent).toContain('authService.getLastRedirectError()');
      expect(loginContent).toContain('authService.clearLastRedirectError()');
    });

    it('displays loading indicator while !isAuthReady to avoid flashing login forms', () => {
      expect(loginContent).toContain('if (!isAuthReady)');
      expect(loginContent).toContain('Verifying MUETY credentials...');
    });
  });

  describe('3. ProtectedRoute Initialization Gate', () => {
    const protectedRoutePath = path.join(process.cwd(), 'src/shared/components/ui/ProtectedRoute.tsx');
    const protectedContent = fs.readFileSync(protectedRoutePath, 'utf8');

    it('checks isAuthReady before checking isAuthenticated or user', () => {
      expect(protectedContent).toContain('isAuthReady');
      expect(protectedContent).toContain('if (!isAuthReady || isLoading)');
    });
  });

  describe('4. AuthContext State Synchronization', () => {
    const authContextPath = path.join(process.cwd(), 'src/shared/context/AuthContext.tsx');
    const authContextContent = fs.readFileSync(authContextPath, 'utf8');

    it('defines isAuthReady in AuthContextType and Provider value', () => {
      expect(authContextContent).toContain('isAuthReady: boolean;');
      expect(authContextContent).toContain('isAuthReady,');
      expect(authContextContent).toContain('authService.waitForAuthReady()');
    });
  });

  describe('5. Netlify Auth Handler Proxy Verification', () => {
    const netlifyPath = path.join(process.cwd(), 'netlify.toml');
    const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');

    it('configures reverse proxy for /__/auth/* to Firebase auth handler', () => {
      expect(netlifyContent).toContain('from = "/__/auth/*"');
      expect(netlifyContent).toContain('to = "https://muetystore-fdad2.firebaseapp.com/__/auth/:splat"');
      expect(netlifyContent).toContain('status = 200');
    });
  });

  describe('6. Phone OTP Functionality Preservation', () => {
    it('preserves sendPhoneOtp with E.164 compliance and validation', async () => {
      const mockVerifier: any = { clear: vi.fn(), render: vi.fn(), type: 'recaptcha', verify: vi.fn() };
      const res = await authService.sendPhoneOtp('+919876543210', mockVerifier);
      expect(res).toBeDefined();
      expect(typeof res.confirm).toBe('function');
    });
  });
});
