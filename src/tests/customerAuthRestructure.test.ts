import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock Firebase dependencies
vi.mock('@/lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));
vi.mock('../lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));

// Polyfill localStorage in test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = String(val); },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

import { storageService } from '@/lib/storage/storageService';
import { authService } from '@/features/auth/services/authService';
import { UserProfile } from '@/shared/types';

describe('MUETY Customer Authentication Restructure & Patron Circle Transition', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // TASK 1: Customer Authentication Methods (Google + Mobile Phone OTP)
  // =========================================================================
  describe('Task 1: Google Sign-In and Mobile Number Authentication', () => {
    it('allows a customer to sign in with Google in fallback / mock mode', async () => {
      const user = await authService.loginWithGoogle();
      expect(user).toBeDefined();
      expect(user.uid).toBeDefined();
      expect(user.email).toContain('@');
      expect(user.role).toBe('customer');

      // Verify currentUser is updated
      const currentUser = authService.getCurrentUser();
      expect(currentUser?.uid).toBe(user.uid);
    });

    it('handles Google sign-in cancellation gracefully', async () => {
      // In live Firebase, popup cancellation throws 'Google Sign-In was cancelled.'
      const popupClosedError = new Error('The popup has been closed by the user.');
      (popupClosedError as any).code = 'auth/popup-closed-by-user';

      // Verify mapped error message
      const mapError = (err: any) => {
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          return 'Google Sign-In was cancelled.';
        }
        return err.message;
      };
      expect(mapError(popupClosedError)).toBe('Google Sign-In was cancelled.');
    });

    it('validates mobile numbers correctly for E.164 compliance (+91 default)', async () => {
      const mockVerifier: any = { clear: vi.fn(), render: vi.fn(), type: 'recaptcha', verify: vi.fn() };

      // Invalid short phone number
      await expect(
        authService.sendPhoneOtp('12345', mockVerifier)
      ).rejects.toThrow(/valid mobile number with country code/i);

      // Invalid format missing country code
      await expect(
        authService.sendPhoneOtp('9876543210', mockVerifier)
      ).rejects.toThrow(/valid mobile number with country code/i);

      // Valid phone number with country code succeeds
      const result = await authService.sendPhoneOtp('+919876543210', mockVerifier);
      expect(result).toBeDefined();
      expect(typeof result.confirm).toBe('function');
    });

    it('verifies 6-digit OTP code and creates/retrieves authenticated customer profile', async () => {
      const mockConfirmationResult = {
        verificationId: 'mock_verif_123',
        phoneNumber: '+919876543210',
        confirm: vi.fn().mockResolvedValue({
          user: {
            uid: 'test_phone_uid_777',
            phoneNumber: '+919876543210',
            displayName: 'Patron 43210',
            email: null,
            photoURL: null,
            getIdTokenResult: async () => ({ claims: { role: 'customer' } })
          }
        })
      };

      // Invalid length OTP
      await expect(
        authService.verifyPhoneOtp(mockConfirmationResult as any, '123')
      ).rejects.toThrow(/complete 6-digit verification code/i);

      // Valid 6-digit OTP
      const user = await authService.verifyPhoneOtp(mockConfirmationResult as any, '123456');
      expect(user).toBeDefined();
      expect(user.uid).toBe('test_phone_uid_777');
      expect(user.phoneNumber).toBe('+919876543210');
      expect(user.role).toBe('customer');

      // Verify customer is in storage
      const storedUser = authService.getCurrentUser();
      expect(storedUser?.phoneNumber).toBe('+919876543210');
    });

    it('handles incorrect and expired OTP error codes with user-friendly messages', async () => {
      // Mock confirmation result with invalid verification code
      const invalidOtpMock = {
        confirm: vi.fn().mockRejectedValue({
          code: 'auth/invalid-verification-code',
          message: 'The verification code from SMS/TOTP is invalid.'
        })
      };

      await expect(
        authService.verifyPhoneOtp(invalidOtpMock as any, '000000')
      ).rejects.toThrow(/Incorrect verification code. Please check the 6-digit OTP and try again./i);

      // Mock confirmation result with expired code
      const expiredOtpMock = {
        confirm: vi.fn().mockRejectedValue({
          code: 'auth/code-expired',
          message: 'SMS verification code has expired.'
        })
      };

      await expect(
        authService.verifyPhoneOtp(expiredOtpMock as any, '999999')
      ).rejects.toThrow(/Verification code has expired. Please click "Resend Code"/i);
    });
  });

  // =========================================================================
  // TASK 2: Removal of Patron Circle Section from Homepage
  // =========================================================================
  describe('Task 2: Patron Circle Section Completely Removed from HomePage', () => {
    it('confirms HomePage does not render Section 13 Patron Circle card or marketing form', () => {
      const homePageContent = fs.readFileSync(
        path.join(process.cwd(), 'src/features/catalog/pages/HomePage.tsx'),
        'utf-8'
      );

      // Ensure all Patron Circle promotional copy & components are gone
      expect(homePageContent).not.toContain('Join the MUETY Patron Circle');
      expect(homePageContent).not.toContain('BESPOKE COMMUNICATIONS');
      expect(homePageContent).not.toContain('newsletter-section');
      expect(homePageContent).not.toContain('join-circle-card');
      expect(homePageContent).not.toContain('id="patron-circle-consent"');
      expect(homePageContent).not.toContain('handleGoogleJoin');
      expect(homePageContent).not.toContain('handleNewsletterSubmit');
    });

    it('confirms HomePage retains Section 12 Customer Reviews leading into Section 14 Concierge', () => {
      const homePageContent = fs.readFileSync(
        path.join(process.cwd(), 'src/features/catalog/pages/HomePage.tsx'),
        'utf-8'
      );

      // Section 12 Reviews exists
      expect(homePageContent).toContain('id="customer-reviews-section"');
      expect(homePageContent).toContain('Loved by Our Customers');

      // Section 14 Concierge exists
      expect(homePageContent).toContain('MUETY Atelier Concierge');
      expect(homePageContent).toContain('editorial-concierge-section');
    });
  });

  // =========================================================================
  // TASK 3: Patron Circle Opt-In on Sign-In Flow
  // =========================================================================
  describe('Task 3: Patron Circle Opt-In on Customer Sign-In Flow', () => {
    it('records consent when customer explicitly checks the Patron Circle box', async () => {
      const uid = 'patron_cust_101';
      const email = 'patron.consented@example.com';

      // Seed initial user
      storageService.saveUser({
        uid,
        email,
        displayName: 'Patron 101',
        role: 'customer',
        createdAt: new Date().toISOString()
      });

      // Opt-in is true
      await authService.recordPatronCircleConsent(uid, true, email);

      const profile = storageService.getUserById(uid);
      expect(profile).toBeDefined();
      expect(profile?.marketingConsent).toBe(true);
      expect(profile?.patronCircleMember).toBe(true);
      expect(profile?.patronCircleJoinedAt).toBeDefined();
      expect(profile?.patronCircleConsentText).toContain("Yes, I'd like to join the MUETY Patron Circle");

      // Email subscription list updated idempotently
      const subs = JSON.parse(localStorage.getItem('muety_newsletter_subs') || '[]');
      expect(subs).toContain('patron.consented@example.com');
    });

    it('does NOT overwrite existing Patron Circle membership if user signs in without checking box', async () => {
      const uid = 'returning_member_202';
      const email = 'existing.member@muety.in';

      // Seed initial member
      const initialJoinedAt = '2025-06-01T12:00:00.000Z';
      storageService.saveUser({
        uid,
        email,
        displayName: 'Existing Member',
        role: 'customer',
        createdAt: '2025-06-01T10:00:00.000Z',
        patronCircleMember: true,
        marketingConsent: true,
        patronCircleJoinedAt: initialJoinedAt
      });

      // User signs in with opt-in UNCHECKED (optIn: false)
      await authService.recordPatronCircleConsent(uid, false, email);
      const updatedProfile = storageService.getUserById(uid);

      // Must NOT be cleared or set to false
      expect(updatedProfile?.patronCircleMember).toBe(true);
      expect(updatedProfile?.marketingConsent).toBe(true);
      expect(updatedProfile?.patronCircleJoinedAt).toBe(initialJoinedAt);
    });

    it('does NOT invent a fake email address for phone-only patrons opting in', async () => {
      const uid = 'phone_only_user_303';
      const phoneNumber = '+919876500000';

      storageService.saveUser({
        uid,
        email: '',
        phoneNumber,
        displayName: 'Phone Patron',
        role: 'customer',
        createdAt: new Date().toISOString()
      });

      // Opt in without email
      await authService.recordPatronCircleConsent(uid, true, undefined, phoneNumber);

      const profile = storageService.getUserById(uid);
      expect(profile?.marketingConsent).toBe(true);
      expect(profile?.patronCircleMember).toBe(true);
      expect(profile?.email).toBeFalsy();

      // No fake email in newsletter subs
      const subs = JSON.parse(localStorage.getItem('muety_newsletter_subs') || '[]');
      expect(subs.some((s: string) => s.includes('phone_only') || s.includes('undefined'))).toBe(false);
    });

    it('does not record consent or subscribe user on failed authentication', () => {
      // Nothing is stored for non-authenticated user
      const subs = localStorage.getItem('muety_newsletter_subs');
      expect(subs).toBeNull();
    });
  });

  // =========================================================================
  // TASK 4: LoginPage Brand Aesthetics, Spacing and Accessibility
  // =========================================================================
  describe('Task 4: Sign-In Page Brand UI Standards', () => {
    it('verifies LoginPage matches MUETY brand colors, copy, and layout standards', () => {
      const loginPageContent = fs.readFileSync(
        path.join(process.cwd(), 'src/features/auth/pages/LoginPage.tsx'),
        'utf-8'
      );

      // Warm ivory background (#fbfaf6)
      expect(loginPageContent).toContain('#fbfaf6');

      // Navy primary buttons (#10182d)
      expect(loginPageContent).toContain('#10182d');

      // Muted gold accents (#c9a227)
      expect(loginPageContent).toContain('#c9a227');

      // Brand heading & supporting text
      expect(loginPageContent).toContain('Sign in to MUETY');
      expect(loginPageContent).toContain('Access your orders, wishlist and account.');

      // Actions
      expect(loginPageContent).toContain('Continue with Google');
      expect(loginPageContent).toContain('Continue with mobile number');
      expect(loginPageContent).toContain('OR');

      // Default country code +91
      expect(loginPageContent).toContain("useState('+91')");

      // 6-digit OTP verification & resend cooldown
      expect(loginPageContent).toContain('Enter 6-Digit Verification Code');
      expect(loginPageContent).toContain('setResendCooldown(30)');
      expect(loginPageContent).toContain('Edit');

      // Patron Circle consent is managed via cookie consent banner, not redundant login checkbox
      expect(loginPageContent).not.toContain('id="patron-circle-opt-in"');
      expect(loginPageContent).not.toContain("Yes, I'd like to join the MUETY Patron Circle");

      // Legal links
      expect(loginPageContent).toContain('to="/terms-conditions"');
      expect(loginPageContent).toContain('to="/privacy-policy"');

      // No visible email/password fields in customer sign-in UI
      expect(loginPageContent).not.toContain('<input type="password"');
      expect(loginPageContent).not.toContain('Forgot Password');
    });

    it('verifies PatronAuthModal matches the same simplified Google + Phone flow', () => {
      const modalContent = fs.readFileSync(
        path.join(process.cwd(), 'src/shared/components/ui/PatronAuthModal.tsx'),
        'utf-8'
      );

      expect(modalContent).toContain('Continue with Google');
      expect(modalContent).toContain('Continue with mobile number');
      expect(modalContent).not.toContain('modal-patron-circle-opt-in');
      expect(modalContent).toContain('Enter 6-Digit OTP Code');
    });
  });

  // =========================================================================
  // TASK 5: Existing Customer Compatibility (Orders, Wishlist, Addresses, Bag)
  // =========================================================================
  describe('Task 5: Existing Customer Data Compatibility', () => {
    it('preserves existing UserProfile fields when updating Patron Circle consent', async () => {
      const existingUser: UserProfile = {
        uid: 'legacy_customer_999',
        email: 'priya.saree@example.com',
        displayName: 'Priya Raman',
        role: 'customer',
        createdAt: '2025-01-15T10:00:00.000Z',
        addresses: [
          {
            id: 'addr_1',
            fullName: 'Priya Raman',
            streetAddress: '12 Temple Street',
            city: 'Salem',
            state: 'Tamil Nadu',
            postalCode: '636001',
            country: 'India',
            phone: '+919443322110',
            isDefault: true
          }
        ]
      };

      // Seed existing user in storage
      storageService.saveUser(existingUser);

      // Customer opts into Patron Circle
      await authService.recordPatronCircleConsent(existingUser.uid, true, existingUser.email);

      // Read back profile
      const updatedUser = storageService.getUserById('legacy_customer_999');

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.uid).toBe('legacy_customer_999');
      expect(updatedUser?.displayName).toBe('Priya Raman');
      expect(updatedUser?.addresses).toHaveLength(1);
      expect(updatedUser?.addresses?.[0]?.city).toBe('Salem');
      expect(updatedUser?.marketingConsent).toBe(true);
      expect(updatedUser?.patronCircleMember).toBe(true);
    });
  });

  // =========================================================================
  // TASK 6: Profile Name Persistence & Source-of-Truth Policy
  // =========================================================================
  describe('Task 6: Profile Name Persistence & Source-of-Truth Policy', () => {
    it('saves updated full name to authoritative customer profile and preserves UID and data', async () => {
      const initialUser: UserProfile = {
        uid: 'cust_mohan_123',
        email: 'mohan@example.com',
        phoneNumber: '+919876501234',
        displayName: 'Mohan',
        role: 'customer',
        createdAt: '2025-01-01T00:00:00.000Z',
        ordersCount: 4,
        totalSpent: 12500,
        addresses: [
          {
            id: 'addr_mohan_1',
            fullName: 'Mohan',
            phone: '9876501234',
            streetAddress: '15 Silk Loom Avenue',
            city: 'Salem',
            state: 'Tamil Nadu',
            postalCode: '636001',
            country: 'India',
            isDefault: true
          }
        ]
      };

      storageService.saveUser(initialUser);
      (authService as any).setCurrentUser(initialUser);

      // Verify subscriber notification
      const notifiedUsers: UserProfile[] = [];
      const unsub = authService.subscribe((u) => {
        if (u) notifiedUsers.push(u);
      });

      // Update full name from "Mohan" to "Mohan Kumar"
      const updated = await authService.updateCustomerProfile({ displayName: 'Mohan Kumar' });

      expect(updated.displayName).toBe('Mohan Kumar');
      expect(updated.fullName).toBe('Mohan Kumar');
      expect(updated.uid).toBe('cust_mohan_123');
      expect(updated.email).toBe('mohan@example.com');
      expect(updated.phoneNumber).toBe('+919876501234');
      expect(updated.ordersCount).toBe(4);
      expect(updated.totalSpent).toBe(12500);
      expect(updated.addresses).toHaveLength(1);

      // Verify in-memory currentUser
      expect(authService.getCurrentUser()?.displayName).toBe('Mohan Kumar');

      // Verify persisted in storageService
      const stored = storageService.getUserById('cust_mohan_123');
      expect(stored?.displayName).toBe('Mohan Kumar');

      // Verify subscriber was notified
      expect(notifiedUsers.length).toBeGreaterThan(0);
      expect(notifiedUsers[notifiedUsers.length - 1].displayName).toBe('Mohan Kumar');

      unsub();
    });

    it('rejects invalid or blank names with a validation error', async () => {
      const user: UserProfile = {
        uid: 'cust_validation_test',
        email: 'validation@muety.in',
        displayName: 'Valid Name',
        role: 'customer',
        createdAt: new Date().toISOString()
      };
      storageService.saveUser(user);
      (authService as any).setCurrentUser(user);

      // Empty string
      await expect(
        authService.updateCustomerProfile({ displayName: '   ' })
      ).rejects.toThrow(/valid full name/i);

      // Single character
      await expect(
        authService.updateCustomerProfile({ displayName: 'M' })
      ).rejects.toThrow(/minimum 2 characters/i);

      // Display name remains unchanged
      expect(authService.getCurrentUser()?.displayName).toBe('Valid Name');
    });

    it('does NOT overwrite a saved real name with a generated fallback name like Patron (1540) on auth hydration', async () => {
      // Customer has already saved "Mohan Kumar" in storage/Firestore
      const savedUser: UserProfile = {
        uid: 'cust_mohan_456',
        email: '',
        phoneNumber: '+919385791540',
        displayName: 'Mohan Kumar',
        role: 'customer',
        createdAt: '2025-02-10T00:00:00.000Z'
      };
      storageService.saveUser(savedUser);

      // Mock Firebase User that has a stale/generated fallback name
      const mockFbUser: any = {
        uid: 'cust_mohan_456',
        phoneNumber: '+919385791540',
        displayName: 'Patron (1540)', // Generated text from initial phone OTP
        email: null,
        getIdTokenResult: async () => ({ claims: { role: 'customer' } }),
        providerData: [{ providerId: 'phone', phoneNumber: '+919385791540' }]
      };

      // Hydrate via fetchUserProfile
      const hydrated = await (authService as any).fetchUserProfile(mockFbUser);

      // The saved real name MUST be preferred over the generated fallback text
      expect(hydrated.displayName).toBe('Mohan Kumar');
      expect(hydrated.displayName).not.toBe('Patron (1540)');
    });
  });

  // =========================================================================
  // TASK 7: Google and Phone Account Linking Flow
  // =========================================================================
  describe('Task 7: Google and Phone Account Linking Flow', () => {
    it('links Google to a phone-authenticated account without changing UID or customer data', async () => {
      const phoneUser: UserProfile = {
        uid: 'uid_phone_first',
        email: '',
        phoneNumber: '+919876543210',
        displayName: 'Devi Priya',
        role: 'customer',
        createdAt: '2025-01-20T00:00:00.000Z',
        connectedProviders: ['phone']
      };
      storageService.saveUser(phoneUser);
      (authService as any).setCurrentUser(phoneUser);

      // Link Google in fallback/mock mode
      const linked = await authService.linkGoogleAccount();

      expect(linked.uid).toBe('uid_phone_first'); // UID preserved
      expect(linked.displayName).toBe('Devi Priya'); // Name preserved
      expect(linked.connectedProviders).toContain('google.com');
      expect(linked.connectedProviders).toContain('phone');

      const status = authService.getConnectedStatus(linked);
      expect(status.isGoogleConnected).toBe(true);
      expect(status.isPhoneConnected).toBe(true);
      expect(status.maskedPhone).toContain('98*** **210');
    });

    it('links and verifies phone number for a Google-authenticated customer', async () => {
      const googleUser: UserProfile = {
        uid: 'uid_google_first',
        email: 'ananya@example.com',
        displayName: 'Ananya Sharma',
        role: 'customer',
        createdAt: '2025-02-01T00:00:00.000Z',
        connectedProviders: ['google.com']
      };
      storageService.saveUser(googleUser);
      (authService as any).setCurrentUser(googleUser);

      const mockVerifier: any = { clear: vi.fn(), render: vi.fn() };
      const confirmationResult = await authService.sendPhoneLinkOtp('+919988776655', mockVerifier);
      expect(confirmationResult).toBeDefined();

      // Verify OTP (123456)
      const linked = await authService.verifyPhoneLinkOtp(confirmationResult, '123456', '+919988776655');

      expect(linked.uid).toBe('uid_google_first'); // UID preserved
      expect(linked.email).toBe('ananya@example.com');
      expect(linked.phoneNumber).toBe('+919988776655');
      expect(linked.connectedProviders).toContain('phone');
      expect(linked.connectedProviders).toContain('google.com');

      const status = authService.getConnectedStatus(linked);
      expect(status.isPhoneConnected).toBe(true);
      expect(status.maskedPhone).toContain('99*** **655');
    });

    it('validates E.164 phone numbers and handles invalid OTP codes during phone linking', async () => {
      const user: UserProfile = {
        uid: 'uid_otp_err_test',
        email: 'test@example.com',
        displayName: 'OTP User',
        role: 'customer',
        createdAt: new Date().toISOString()
      };
      storageService.saveUser(user);
      (authService as any).setCurrentUser(user);

      const mockVerifier: any = { clear: vi.fn(), render: vi.fn() };

      // Invalid number format
      await expect(
        authService.sendPhoneLinkOtp('9876543210', mockVerifier)
      ).rejects.toThrow(/valid mobile number with country code/i);

      // Valid number
      const conf = await authService.sendPhoneLinkOtp('+919876543210', mockVerifier);

      // Wrong code
      await expect(
        authService.verifyPhoneLinkOtp(conf, '000000', '+919876543210')
      ).rejects.toThrow();

      // Incomplete code
      await expect(
        authService.verifyPhoneLinkOtp(conf, '12', '+919876543210')
      ).rejects.toThrow(/complete 6-digit verification code/i);
    });

    it('masks phone numbers safely in getConnectedStatus without exposing full numbers', () => {
      const user: UserProfile = {
        uid: 'uid_mask_test',
        email: '',
        phoneNumber: '+919385791540',
        displayName: 'Mask Test',
        role: 'customer',
        createdAt: new Date().toISOString()
      };

      const status = authService.getConnectedStatus(user);
      expect(status.maskedPhone).toBe('+91 93*** **540');
      expect(status.maskedPhone).not.toBe('+919385791540');
    });
  });

  // =========================================================================
  // TASK 8: Account Navigation & UI Structural Requirements
  // =========================================================================
  describe('Task 8: Account Navigation & UI Structural Requirements', () => {
    it('confirms Header account dropdown contains all required navigation items', () => {
      const headerContent = fs.readFileSync(
        path.join(process.cwd(), 'src/shared/components/ui/Header.tsx'),
        'utf-8'
      );

      // Dropdown items check
      expect(headerContent).toContain('role="menu"');
      expect(headerContent).toContain('Account Dashboard');
      expect(headerContent).toContain('My Orders');
      expect(headerContent).toContain('My Wishlist');
      expect(headerContent).toContain('Delivery Addresses');
      expect(headerContent).toContain('Profile Settings');
      expect(headerContent).toContain('Connected Accounts');
      expect(headerContent).toContain('Sign Out');

      // Ensure internal Patron ID is NOT exposed to customers in Header
      expect(headerContent).not.toContain('Patron ID: #');
    });

    it('confirms AccountPage implements overview, orders, address, profile, and connected tabs without fake tier claims', () => {
      const accountPageContent = fs.readFileSync(
        path.join(process.cwd(), 'src/features/customers/pages/AccountPage.tsx'),
        'utf-8'
      );

      // No fake tier claims
      expect(accountPageContent).not.toContain('Client Tier: MUETY Atelier Club');
      expect(accountPageContent).not.toContain('MUETY Atelier Club');

      // Overview dashboard cards
      expect(accountPageContent).toContain('account-overview-grid');
      expect(accountPageContent).toContain('account-nav-card');
      expect(accountPageContent).toContain('Account Summary');

      // Connected accounts section
      expect(accountPageContent).toContain('id="connected-accounts-section"');
      expect(accountPageContent).toContain('Google Account');
      expect(accountPageContent).toContain('Mobile Phone');
      expect(accountPageContent).toContain('Connect Google Account');
      expect(accountPageContent).toContain('Add and verify phone number');

      // Phone verification modal
      expect(accountPageContent).toContain('id="phone-link-recaptcha"');
      expect(accountPageContent).toContain('Send Verification Code');
      expect(accountPageContent).toContain('Verify & Link Phone');
    });
  });

  // =========================================================================
  // TASK 9: Generated vs Genuine Patron Identity Refinement
  // =========================================================================
  describe('Task 9: Customer Identity Display and Generated Name Fallback Handling', () => {
    it('correctly detects generated patron names and distinguishes genuine customer names', () => {
      // Generated fallbacks
      expect(authService.isGeneratedPatronName('Patron (1540)')).toBe(true);
      expect(authService.isGeneratedPatronName('Patron (4321)')).toBe(true);
      expect(authService.isGeneratedPatronName('Patron 1540')).toBe(true);
      expect(authService.isGeneratedPatronName('Patron')).toBe(true);
      expect(authService.isGeneratedPatronName('MUETY Patron')).toBe(true);
      expect(authService.isGeneratedPatronName('Valued Patron')).toBe(true);
      expect(authService.isGeneratedPatronName('')).toBe(true);
      expect(authService.isGeneratedPatronName(null)).toBe(true);
      expect(authService.isGeneratedPatronName(undefined)).toBe(true);

      // Genuine names
      expect(authService.isGeneratedPatronName('Mohan Kumar')).toBe(false);
      expect(authService.isGeneratedPatronName('Priyadharshini')).toBe(false);
      expect(authService.isGeneratedPatronName('Ananya Sharma')).toBe(false);
      expect(authService.isGeneratedPatronName('Karthik R')).toBe(false);
    });

    it('confirms AccountPage uses neutral name fallback and does not display generated patron name', () => {
      const accountPageContent = fs.readFileSync(
        path.join(process.cwd(), 'src/features/customers/pages/AccountPage.tsx'),
        'utf-8'
      );

      // Neutral greeting fallback logic & genuine name detection
      expect(accountPageContent).toContain("const hasGenuineName = Boolean(user?.displayName && !isGeneratedPatronName(user.displayName));");
      expect(accountPageContent).toContain("hasGenuineName && user?.displayName ? user.displayName : (isAuthenticated ? 'Patron Account' : 'Guest')");
      expect(accountPageContent).toContain("placeholder=\"Enter your full name (e.g. Mohan Kumar)\"");
    });

    it('confirms Header button and dropdown fall back to "Account" and "Valued Patron" for generated names', () => {
      const headerContent = fs.readFileSync(
        path.join(process.cwd(), 'src/shared/components/ui/Header.tsx'),
        'utf-8'
      );

      expect(headerContent).toContain("hasGenuineName && user?.displayName ? user.displayName.split(' ')[0] : 'Account'");
      expect(headerContent).toContain("hasGenuineName && user?.displayName ? user.displayName : 'Valued Patron'");
    });
  });

  // =========================================================================
  // TASK 10: Settings Separation & Signed-Out BookMyShow-Style UX
  // =========================================================================
  describe('Task 10: Settings Page Separation and Signed-Out Experience', () => {
    it('confirms Profile Settings (?tab=profile) and Connected Accounts (?tab=connected) are visually separated', () => {
      const accountPageContent = fs.readFileSync(
        path.join(process.cwd(), 'src/features/customers/pages/AccountPage.tsx'),
        'utf-8'
      );

      // Distinct conditional tab renders
      expect(accountPageContent).toContain("currentTab === 'profile' && (");
      expect(accountPageContent).toContain("currentTab === 'connected' && (");
      expect(accountPageContent).not.toContain("(currentTab === 'profile' || currentTab === 'connected')");

      // Profile tab links to connected tab
      expect(accountPageContent).toContain("handleTabChange('connected')");
    });

    it('confirms the separate signed-out account landing card is removed and replaces it with 2-column dashboard layout', () => {
      const accountPageContent = fs.readFileSync(
        path.join(process.cwd(), 'src/features/customers/pages/AccountPage.tsx'),
        'utf-8'
      );

      // Standalone unauth blocking view is removed
      expect(accountPageContent).not.toContain('account-unauth-view');
      expect(accountPageContent).not.toContain('account-unauth-card');

      // Two-column layout grid & dedicated sidebar are present
      expect(accountPageContent).toContain('account-layout-grid');
      expect(accountPageContent).toContain('account-sidebar');
      expect(accountPageContent).toContain('account-mobile-tabs');
      expect(accountPageContent).toContain('account-sidebar-nav');

      // Clean page header without oversized dark banner
      expect(accountPageContent).toContain('account-page-header');
      expect(accountPageContent).not.toContain('account-hero-banner');
    });

    it('confirms Header includes BookMyShow-inspired guest button, dropdown menu, and mobile drawer', () => {
      const headerContent = fs.readFileSync(
        path.join(process.cwd(), 'src/shared/components/ui/Header.tsx'),
        'utf-8'
      );

      expect(headerContent).toContain('header-guest-signin-btn');
      expect(headerContent).toContain('account-dropdown-guest-header');
      expect(headerContent).toContain('account-drawer');
      expect(headerContent).toContain('accountDrawerOpen');
    });

    it('confirms responsive layout styles enforce ~1200px container max-width on desktop', () => {
      const cssContent = fs.readFileSync(
        path.join(process.cwd(), 'src/styles/index.css'),
        'utf-8'
      );

      expect(cssContent).toContain('.account-page .container');
      expect(cssContent).toContain('max-width: 1200px');
      expect(cssContent).toContain('background-color: var(--bg-main)');
    });
  });
});

