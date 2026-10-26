import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  ApplicationVerifier,
  sendPasswordResetEmail,
  updateProfile,
  linkWithPopup,
  linkWithRedirect,
  linkWithPhoneNumber,
  linkWithCredential,
  PhoneAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isLiveFirebase } from '@/lib/firebase/firebase';
import { UserProfile, AppRole } from '@/shared/types';
import { storageService } from '@/lib/storage/storageService';
import { getUserRoles, hasRole, hasAnyRole, hasPermission, Permission } from '@/shared/utils/permissions';

const CURRENT_USER_KEY = 'muety_current_session_user';

const CANONICAL_ADMIN_ROSTER: Record<string, { role: AppRole; roles: AppRole[]; displayName: string }> = {
  'superadmin@muety.in': {
    role: 'superadmin',
    roles: ['superadmin', 'admin'],
    displayName: 'MUETY Executive Super Admin'
  },
  'admin@muety.in': {
    role: 'admin',
    roles: ['admin'],
    displayName: 'MUETY Store Admin'
  },
  'catalog@muety.in': {
    role: 'catalog_manager',
    roles: ['catalog_manager'],
    displayName: 'MUETY Catalog Manager'
  },
  'vignesh.admin@muety.in': {
    role: 'admin',
    roles: ['admin'],
    displayName: 'vignesh'
  },
  'kalvi@muety.in': {
    role: 'admin',
    roles: ['admin'],
    displayName: 'arun'
  },
  'mohan.admin@muety.in': {
    role: 'admin',
    roles: ['admin'],
    displayName: 'mohan'
  }
};

const withTimeout = <T>(promise: Promise<T>, ms: number = 4000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
};

export const isGeneratedPatronName = (name?: string | null): boolean => {
  if (!name) return true;
  const clean = name.trim();
  if (!clean) return true;
  if (/^Patron(\s*\(?\d+\)?)?$/i.test(clean)) return true;
  if (/^MUETY Patron$/i.test(clean)) return true;
  if (/^Valued Patron$/i.test(clean)) return true;
  if (/^Valued Client$/i.test(clean)) return true;
  return false;
};

export function sanitizeClientFirestoreProfile(profile: Partial<UserProfile>): Record<string, any> {
  const sanitized: Record<string, any> = { ...profile };
  const protectedKeys = [
    'roles', 'role', 'roleId', 'roleSlug', 'roleName',
    'departmentId', 'departmentName', 'department',
    'permissions', 'status', 'invitationStatus', 'invitationSentAt', 'invitationAcceptedAt',
    'createdBy', 'isBlocked', 'customerStatus',
    'ordersCount', 'totalSpent', 'orderCount', 'totalSpend', 'internalNotes', 'password'
  ];
  for (const k of protectedKeys) {
    delete sanitized[k];
  }
  return sanitized;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];

  private constructor() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_USER_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        delete parsed.password;
        if (parsed && parsed.email && CANONICAL_ADMIN_ROSTER[parsed.email.toLowerCase()]) {
          const canonical = CANONICAL_ADMIN_ROSTER[parsed.email.toLowerCase()];
          parsed.roles = canonical.roles;
          parsed.role = canonical.role;
        }
        this.currentUser = parsed;
      } catch {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }

    if (auth && isLiveFirebase) {
      try {
        onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
          if (fbUser) {
            try {
              const profile = await this.fetchUserProfile(fbUser);
              this.setCurrentUser(profile);
            } catch (e) {
              console.warn('onAuthStateChanged profile fetch note:', e);
            }
          } else {
            const saved = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_USER_KEY) : null;
            if (!saved) {
              this.setCurrentUser(null);
            }
          }
        });

        if (typeof window !== 'undefined') {
          this.handleRedirectResult().catch(() => {});
        }
      } catch (authInitErr) {
        console.warn('Firebase onAuthStateChanged init note:', authInitErr);
      }
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private setCurrentUser(user: UserProfile | null) {
    if (user) {
      delete (user as any).password;
      if (user.email && CANONICAL_ADMIN_ROSTER[user.email.toLowerCase()]) {
        const canonical = CANONICAL_ADMIN_ROSTER[user.email.toLowerCase()];
        user.roles = canonical.roles;
        user.role = canonical.role;
      }

      // If user accepted marketing cookies, auto-enroll into Patron Circle for email campaigns
      if (typeof window !== 'undefined' && localStorage.getItem('muety_cookie_marketing_consent') === 'true') {
        if (!user.patronCircleMember || !user.marketingConsent) {
          user.patronCircleMember = true;
          user.marketingConsent = true;
          user.patronCircleJoinedAt = user.patronCircleJoinedAt || new Date().toISOString();
          user.patronCircleConsentText = user.patronCircleConsentText || "Enrolled via Marketing Cookie Preferences";
          if (user.email && user.email.includes('@')) {
            try {
              const cleanEmail = user.email.trim().toLowerCase();
              const subs: string[] = JSON.parse(localStorage.getItem('muety_newsletter_subs') || '[]');
              if (!subs.includes(cleanEmail)) {
                subs.push(cleanEmail);
                localStorage.setItem('muety_newsletter_subs', JSON.stringify(subs));
              }
            } catch {}
          }
        }
      }
    }
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        storageService.saveUser(user);
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
    this.listeners.forEach(cb => cb(user));
  }

  private async fetchUserProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    let roles: AppRole[] = ['customer'];

    try {
      const idTokenResult = await fbUser.getIdTokenResult(true);
      if (Array.isArray(idTokenResult.claims.roles)) {
        roles = idTokenResult.claims.roles as AppRole[];
      } else if (typeof idTokenResult.claims.role === 'string') {
        roles = [idTokenResult.claims.role as AppRole];
      }
    } catch (claimErr) {
      console.warn('Failed to retrieve Firebase custom claims:', claimErr);
    }

    let firestoreProfile: Partial<UserProfile> = {};

    if (db && isLiveFirebase) {
      try {
        const userDoc = await withTimeout(getDoc(doc(db, 'users', fbUser.uid)), 8000);
        if (userDoc && userDoc.exists && userDoc.exists()) {
          firestoreProfile = userDoc.data() as UserProfile;
        }
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.debug('[AuthService] Firestore profile fetch deferred/timed out:', err?.message || err);
        }
      }
    }

    const userEmail = (fbUser.email || firestoreProfile.email || '').toLowerCase();
    let resolvedRoles: AppRole[] = (roles.length > 0 && (!roles.includes('customer') || roles.length > 1))
      ? roles
      : (firestoreProfile.roles || (firestoreProfile.role ? [firestoreProfile.role] : []));

    if (userEmail && CANONICAL_ADMIN_ROSTER[userEmail]) {
      resolvedRoles = CANONICAL_ADMIN_ROSTER[userEmail].roles;
    } else if (resolvedRoles.length === 0 || (resolvedRoles.length === 1 && resolvedRoles[0] === 'customer')) {
      const knownUser = userEmail ? storageService.getUsers().find(u => (u.email || '').toLowerCase() === userEmail) : null;
      if (knownUser) {
        const seedRoles = getUserRoles(knownUser);
        if (seedRoles.some(r => r !== 'customer')) {
          resolvedRoles = seedRoles;
        }
      }
    }

    if (resolvedRoles.length === 0) {
      resolvedRoles = ['customer'];
    }

    const isAdmin = resolvedRoles.some(r => r !== 'customer');

    const defaultDisplayName = fbUser.phoneNumber 
      ? `Patron (${fbUser.phoneNumber.slice(-4)})` 
      : (fbUser.email ? fbUser.email.split('@')[0] : 'Patron');

    const localSavedUser = storageService.getUserById(fbUser.uid);

    // isGeneratedPatronName is declared at file scope and exported

    let resolvedDisplayName = '';
    // Priority 1: Real saved name in Firestore customer profile
    if (firestoreProfile.displayName && !isGeneratedPatronName(firestoreProfile.displayName)) {
      resolvedDisplayName = firestoreProfile.displayName.trim();
    } else if (firestoreProfile.fullName && !isGeneratedPatronName(firestoreProfile.fullName)) {
      resolvedDisplayName = firestoreProfile.fullName.trim();
    } 
    // Priority 2: Real saved name in local persistence
    else if (localSavedUser?.displayName && !isGeneratedPatronName(localSavedUser.displayName)) {
      resolvedDisplayName = localSavedUser.displayName.trim();
    } else if (localSavedUser?.fullName && !isGeneratedPatronName(localSavedUser.fullName)) {
      resolvedDisplayName = localSavedUser.fullName.trim();
    }
    // Priority 3: Firebase Auth displayName if real (e.g. from Google or previous updateProfile)
    else if (fbUser.displayName && !isGeneratedPatronName(fbUser.displayName)) {
      resolvedDisplayName = fbUser.displayName.trim();
    }
    // Priority 4: Canonical admin roster
    else if (userEmail && CANONICAL_ADMIN_ROSTER[userEmail]?.displayName) {
      resolvedDisplayName = CANONICAL_ADMIN_ROSTER[userEmail].displayName;
    }
    // Priority 5: Generated fallback default (only when no real name exists)
    else {
      resolvedDisplayName = defaultDisplayName;
    }

    // Synchronize Firebase Auth's displayName if it differs from the real saved name
    if (auth && isLiveFirebase && !isGeneratedPatronName(resolvedDisplayName) && fbUser.displayName !== resolvedDisplayName) {
      try {
        updateProfile(fbUser, { displayName: resolvedDisplayName }).catch(() => {});
      } catch {}
    }

    // Provider tracking
    const providerIds: string[] = [];
    if (fbUser.providerData) {
      fbUser.providerData.forEach(p => {
        if (p.providerId && !providerIds.includes(p.providerId)) {
          providerIds.push(p.providerId);
        }
      });
    }
    if (fbUser.phoneNumber && !providerIds.includes('phone')) {
      providerIds.push('phone');
    }
    if (localSavedUser?.connectedProviders) {
      localSavedUser.connectedProviders.forEach(p => {
        if (!providerIds.includes(p)) providerIds.push(p);
      });
    }

    const resolvedPhone = fbUser.phoneNumber || firestoreProfile.phoneNumber || (firestoreProfile as any).phone || localSavedUser?.phoneNumber || localSavedUser?.phone || '';

    const profile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || firestoreProfile.email || localSavedUser?.email || '',
      displayName: resolvedDisplayName,
      fullName: resolvedDisplayName,
      photoURL: fbUser.photoURL || firestoreProfile.photoURL || localSavedUser?.photoURL,
      roles: resolvedRoles,
      role: resolvedRoles[0] || 'customer',
      phoneNumber: resolvedPhone,
      phone: resolvedPhone,
      whatsappPhone: (firestoreProfile as any).whatsappPhone || localSavedUser?.whatsappPhone || resolvedPhone,
      isBlocked: firestoreProfile.isBlocked || false,
      status: isAdmin ? (firestoreProfile.isBlocked ? 'disabled' : 'active') : (firestoreProfile.status || 'active'),
      invitationStatus: isAdmin ? 'accepted' : firestoreProfile.invitationStatus,
      customerStatus: firestoreProfile.customerStatus || (firestoreProfile.isBlocked ? 'blocked' : 'active'),
      addresses: firestoreProfile.addresses || localSavedUser?.addresses || [],
      defaultAddress: firestoreProfile.defaultAddress || localSavedUser?.defaultAddress,
      defaultShippingAddressId: firestoreProfile.defaultShippingAddressId || localSavedUser?.defaultShippingAddressId,
      connectedProviders: providerIds,
      createdAt: firestoreProfile.createdAt || localSavedUser?.createdAt || new Date().toISOString(),
      ...(firestoreProfile.marketingConsent !== undefined ? { marketingConsent: firestoreProfile.marketingConsent } : (localSavedUser?.marketingConsent !== undefined ? { marketingConsent: localSavedUser.marketingConsent } : {})),
      ...((firestoreProfile as any).patronCircleMember !== undefined ? { patronCircleMember: (firestoreProfile as any).patronCircleMember } : (localSavedUser?.patronCircleMember !== undefined ? { patronCircleMember: localSavedUser.patronCircleMember } : {})),
      ...((firestoreProfile as any).patronCircleJoinedAt !== undefined ? { patronCircleJoinedAt: (firestoreProfile as any).patronCircleJoinedAt } : (localSavedUser?.patronCircleJoinedAt !== undefined ? { patronCircleJoinedAt: localSavedUser.patronCircleJoinedAt } : {}))
    };

    if (typeof localStorage !== 'undefined' && localStorage.getItem('muety_cookie_marketing_consent') === 'true') {
      profile.patronCircleMember = true;
      profile.marketingConsent = true;
      profile.patronCircleJoinedAt = (profile as any).patronCircleJoinedAt || new Date().toISOString();
      profile.patronCircleConsentText = (profile as any).patronCircleConsentText || "Enrolled via Marketing Cookie Preferences";
      if (profile.email && profile.email.includes('@')) {
        try {
          const cleanEmail = profile.email.trim().toLowerCase();
          const subs: string[] = JSON.parse(localStorage.getItem('muety_newsletter_subs') || '[]');
          if (!subs.includes(cleanEmail)) {
            subs.push(cleanEmail);
            localStorage.setItem('muety_newsletter_subs', JSON.stringify(subs));
          }
        } catch {}
      }
    }

    delete (profile as any).password;

    storageService.saveUser(profile);

    if (db && isLiveFirebase && isAdmin) {
      try {
        const syncData = {
          uid: fbUser.uid,
          email: userEmail,
          displayName: profile.displayName,
          roles: resolvedRoles,
          role: resolvedRoles[0],
          status: profile.isBlocked ? 'disabled' : 'active',
          invitationStatus: 'accepted',
          customerStatus: 'active',
          invitationAcceptedAt: firestoreProfile.invitationAcceptedAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', fbUser.uid), syncData, { merge: true });

        // Only sync to /admins if user has superadmin or admin claims, catching rule rejections silently
        if (resolvedRoles.some(r => ['superadmin', 'super_admin', 'admin'].includes(r))) {
          await setDoc(doc(db, 'admins', fbUser.uid), syncData, { merge: true }).catch(err => {
            if (import.meta.env.DEV) {
              console.debug('[AuthService] Admin roster write note:', err?.message || err);
            }
          });
        }
      } catch (syncErr: any) {
        if (import.meta.env.DEV) {
          console.debug('[AuthService] Firestore admin profile sync note:', syncErr?.message || syncErr);
        }
      }
    }

    return profile;
  }

  async login(email: string, pass: string): Promise<UserProfile> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }
    if (!pass) {
      throw new Error('Please enter your password.');
    }

    if (auth && isLiveFirebase) {
      try {
        const cred = await withTimeout(signInWithEmailAndPassword(auth, cleanEmail, pass), 4500);
        const profile = await this.fetchUserProfile(cred.user);
        this.setCurrentUser(profile);
        return profile;
      } catch (error: any) {
        console.warn('Firebase signIn note:', error?.code || error?.message);
        if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found') {
          throw new Error('Invalid authentication credentials. Access Denied.');
        }
      }
    }

    // Offline / Local fallback authentication
    const users = storageService.getUsers();
    const matched = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!matched) {
      throw new Error('No account found with this email address. Please register for a new account.');
    }

    if (matched.isBlocked) {
      throw new Error('This account has been suspended by MUETY Security.');
    }

    const roles = getUserRoles(matched);
    const profile: UserProfile = {
      ...matched,
      roles,
      role: roles[0] || 'customer'
    };

    delete (profile as any).password;
    this.setCurrentUser(profile);
    return profile;
  }

  async register(email: string, pass: string, displayName: string): Promise<UserProfile> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || '').trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!pass || pass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    let uid = `usr-${Date.now()}`;

    if (auth && isLiveFirebase) {
      try {
        const cred = await withTimeout(createUserWithEmailAndPassword(auth, cleanEmail, pass), 4500);
        uid = cred.user.uid;
        try {
          await updateProfile(cred.user, { displayName: cleanName });
        } catch {}
      } catch (fbErr: any) {
        if (fbErr?.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please log in.');
        }
      }
    }

    const hasMarketingCookieConsent = typeof localStorage !== 'undefined' && localStorage.getItem('muety_cookie_marketing_consent') === 'true';
    const profile: UserProfile = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      roles: ['customer'],
      role: 'customer',
      createdAt: new Date().toISOString(),
      ordersCount: 0,
      totalSpent: 0,
      ...(hasMarketingCookieConsent ? {
        patronCircleMember: true,
        marketingConsent: true,
        patronCircleJoinedAt: new Date().toISOString(),
        patronCircleConsentText: "Enrolled via Marketing Cookie Preferences"
      } : {})
    };

    delete (profile as any).password;

    if (db && isLiveFirebase) {
      try {
        const clientPayload = sanitizeClientFirestoreProfile(profile);
        await withTimeout(setDoc(doc(db, 'users', uid), clientPayload, { merge: true }), 2500);
      } catch (firestoreErr) {
        console.warn('Firestore setDoc user profile note:', firestoreErr);
      }
    }

    storageService.saveUser(profile);
    this.setCurrentUser(profile);
    return profile;
  }

  async loginWithGoogle(useRedirectOnMobile: boolean = false): Promise<UserProfile> {
    if (auth && isLiveFirebase) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        const isMobile = typeof window !== 'undefined' && 
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        let cred;
        if (useRedirectOnMobile && isMobile) {
          await signInWithRedirect(auth, provider);
          return new Promise(() => {}); // Execution will pause as page navigates to Google
        }

        try {
          cred = await withTimeout(signInWithPopup(auth, provider), 30000);
        } catch (popupErr: any) {
          if (popupErr?.code === 'auth/popup-blocked' && isMobile) {
            console.info('[AuthService] Popup blocked on mobile browser, falling back to redirect.');
            await signInWithRedirect(auth, provider);
            return new Promise(() => {});
          }
          throw popupErr;
        }

        const profile = await this.fetchUserProfile(cred.user);
        
        // Ensure user document exists in Firestore /users and /customers (complying with security rules)
        if (db && isLiveFirebase) {
          try {
            const clientPayload = sanitizeClientFirestoreProfile(profile);
            await Promise.all([
              setDoc(doc(db, 'users', cred.user.uid), clientPayload, { merge: true }),
              setDoc(doc(db, 'customers', cred.user.uid), clientPayload, { merge: true })
            ]);
          } catch (docErr) {
            console.warn('Firestore setDoc Google user note:', docErr);
          }
        }
        
        storageService.saveUser(profile);
        this.setCurrentUser(profile);

        if (typeof window !== 'undefined' && localStorage.getItem('muety_cookie_marketing_consent') === 'true') {
          void this.recordPatronCircleConsent(profile.uid, true, profile.email, profile.phoneNumber);
        }

        return profile;
      } catch (e: any) {
        console.warn('Firebase Google login error:', e);
        if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
          throw new Error('Google Sign-In was cancelled.');
        }
        if (e?.code === 'auth/unauthorized-domain') {
          throw new Error('This domain is not authorized for Google Sign-In in Firebase Console. Please add it under Authentication > Authorized domains.');
        }
        if (e?.code === 'auth/account-exists-with-different-credential') {
          throw new Error('An account with this email address already exists. Please sign in with your original method to link your accounts.');
        }
        throw new Error(e?.message || 'Google Sign-In failed. Please check your credentials or network connection.');
      }
    }

    // Local / development fallback if live Firebase is not active
    const fallbackUser: UserProfile = {
      uid: `usr-google-${Date.now()}`,
      email: 'patron.google@muety.in',
      displayName: 'MUETY Atelier Patron',
      roles: ['customer'],
      role: 'customer',
      createdAt: new Date().toISOString(),
      customerStatus: 'active'
    };
    storageService.saveUser(fallbackUser);
    this.setCurrentUser(fallbackUser);
    return fallbackUser;
  }

  public async handleRedirectResult(): Promise<UserProfile | null> {
    if (auth && isLiveFirebase) {
      try {
        const cred = await getRedirectResult(auth);
        if (cred && cred.user) {
          const profile = await this.fetchUserProfile(cred.user);
          if (db && isLiveFirebase) {
            try {
              const clientPayload = sanitizeClientFirestoreProfile(profile);
              await Promise.all([
                setDoc(doc(db, 'users', cred.user.uid), clientPayload, { merge: true }),
                setDoc(doc(db, 'customers', cred.user.uid), clientPayload, { merge: true })
              ]);
            } catch {}
          }
          this.setCurrentUser(profile);

          // Check if patron circle preference was selected before mobile redirect or via marketing cookies
          if (typeof window !== 'undefined') {
            const optIn = sessionStorage.getItem('muety_patron_opt_in') === 'true' ||
                          localStorage.getItem('muety_cookie_marketing_consent') === 'true';
            if (optIn) {
              await this.recordPatronCircleConsent(profile.uid, true, profile.email, profile.phoneNumber);
            }
            sessionStorage.removeItem('muety_patron_opt_in');
          }

          return profile;
        }
      } catch (err: any) {
        console.warn('[AuthService] getRedirectResult note:', err?.code || err?.message);
      }
    }
    return null;
  }

  setupRecaptcha(
    containerIdOrElement: string | HTMLElement, 
    options?: { size?: 'invisible' | 'normal'; callback?: () => void }
  ): RecaptchaVerifier {
    if (!auth) {
      throw new Error('Firebase Authentication is not initialized.');
    }

    const containerId = typeof containerIdOrElement === 'string' ? containerIdOrElement : null;
    const container = typeof containerIdOrElement === 'string'
      ? (typeof document !== 'undefined' ? document.getElementById(containerIdOrElement) : null)
      : containerIdOrElement;

    // 1. Clean up any existing verifier registered globally on window or container
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.recaptchaVerifier) {
        try {
          win.recaptchaVerifier.clear();
        } catch {}
        win.recaptchaVerifier = null;
      }
      if (containerId && win[`recaptchaVerifier_${containerId}`]) {
        try {
          win[`recaptchaVerifier_${containerId}`].clear();
        } catch {}
        win[`recaptchaVerifier_${containerId}`] = null;
      }
    }

    // 2. Clear any lingering DOM child nodes inside the container element so grecaptcha doesn't throw 'reCAPTCHA has already been rendered in this element'
    if (container) {
      try {
        container.innerHTML = '';
      } catch {}
    }

    // 3. Create fresh RecaptchaVerifier
    const verifier = new RecaptchaVerifier(auth, containerIdOrElement, {
      size: options?.size || 'invisible',
      callback: () => {
        if (options?.callback) options.callback();
      },
      'expired-callback': () => {
        console.warn('[AuthService] reCAPTCHA token expired.');
      }
    });

    if (typeof window !== 'undefined') {
      const win = window as any;
      win.recaptchaVerifier = verifier;
      if (containerId) {
        win[`recaptchaVerifier_${containerId}`] = verifier;
      }
    }

    return verifier;
  }

  async sendPhoneOtp(
    phoneNumber: string, 
    appVerifier: ApplicationVerifier
  ): Promise<ConfirmationResult> {
    const rawDigits = (phoneNumber || '').replace(/[^\d+]/g, '');
    if (!rawDigits || !rawDigits.startsWith('+') || rawDigits.length < 10) {
      throw new Error('Please enter a valid mobile number with country code (e.g. +91 98765 43210).');
    }

    if (auth && isLiveFirebase) {
      try {
        const confirmationResult = await signInWithPhoneNumber(auth, rawDigits, appVerifier);
        return confirmationResult;
      } catch (err: any) {
        console.warn('[AuthService] signInWithPhoneNumber note:', err?.code || err?.message);
        if (err?.code === 'auth/invalid-phone-number') {
          throw new Error('The mobile phone number format is invalid. Please verify the country code and number.');
        }
        if (err?.code === 'auth/missing-phone-number') {
          throw new Error('Please enter your mobile phone number.');
        }
        if (err?.code === 'auth/quota-exceeded') {
          throw new Error('SMS verification quota exceeded for today. Please continue with Google Sign-In or contact concierge.');
        }
        if (err?.code === 'auth/too-many-requests') {
          throw new Error('Too many verification requests. Please wait a few moments before trying again.');
        }
        if (err?.code === 'auth/captcha-check-failed') {
          throw new Error('Security verification (reCAPTCHA) could not be completed. Please refresh and try again.');
        }
        if (
          err?.code === 'auth/billing-not-enabled' ||
          err?.message?.includes('billing-not-enabled') ||
          err?.message?.includes('BILLING_NOT_ENABLED')
        ) {
          throw new Error('SMS verification gateway is currently completing billing activation or temporarily restricted. Please sign in with Google or use your patron account.');
        }
        throw new Error(err?.message || 'Failed to send OTP verification code via SMS. Please try again.');
      }
    }

    // Local / offline fallback mock confirmation result for development / automated testing
    return {
      verificationId: 'local-mock-verification-id',
      confirm: async (verificationCode: string) => {
        if (verificationCode !== '123456') {
          const err: any = new Error('Invalid verification code.');
          err.code = 'auth/invalid-verification-code';
          throw err;
        }
        const mockFbUser: any = {
          uid: `usr-phone-${rawDigits.slice(-10)}`,
          phoneNumber: rawDigits,
          displayName: `Patron (${rawDigits.slice(-4)})`,
          email: null,
          getIdTokenResult: async () => ({ claims: { role: 'customer', roles: ['customer'] } })
        };
        return { user: mockFbUser };
      }
    } as unknown as ConfirmationResult;
  }

  async verifyPhoneOtp(
    confirmationResult: ConfirmationResult, 
    verificationCode: string
  ): Promise<UserProfile> {
    const cleanCode = (verificationCode || '').trim();
    if (!cleanCode || cleanCode.length < 6) {
      throw new Error('Please enter the complete 6-digit verification code.');
    }

    try {
      const cred = await confirmationResult.confirm(cleanCode);
      const profile = await this.fetchUserProfile(cred.user);

      if (db && isLiveFirebase) {
        try {
          const clientPayload = sanitizeClientFirestoreProfile(profile);
          await Promise.all([
            setDoc(doc(db, 'users', cred.user.uid), clientPayload, { merge: true }),
            setDoc(doc(db, 'customers', cred.user.uid), clientPayload, { merge: true })
          ]);
        } catch (docErr) {
          console.warn('Firestore setDoc Phone user note:', docErr);
        }
      }

      storageService.saveUser(profile);
      this.setCurrentUser(profile);

      if (typeof window !== 'undefined' && localStorage.getItem('muety_cookie_marketing_consent') === 'true') {
        void this.recordPatronCircleConsent(profile.uid, true, profile.email, profile.phoneNumber);
      }

      return profile;
    } catch (err: any) {
      console.warn('[AuthService] confirm OTP note:', err?.code || err?.message);
      if (err?.code === 'auth/invalid-verification-code') {
        throw new Error('Incorrect verification code. Please check the 6-digit OTP and try again.');
      }
      if (err?.code === 'auth/code-expired') {
        throw new Error('Verification code has expired. Please click "Resend Code" to receive a new OTP.');
      }
      throw new Error(err?.message || 'Verification failed. Please check the OTP or request a new code.');
    }
  }

  async recordPatronCircleConsent(
    uid: string, 
    optIn: boolean, 
    email?: string, 
    phone?: string
  ): Promise<void> {
    if (!uid) return;

    // If optIn is false, preserve any previously stored preference rather than silently overwriting it!
    if (!optIn) {
      return;
    }

    const timestamp = new Date().toISOString();
    const consentText = "Yes, I'd like to join the MUETY Patron Circle and receive exclusive collection previews, bridal updates and invitations.";
    const consentPayload: Record<string, any> = {
      patronCircleMember: true,
      marketingConsent: true,
      patronCircleConsentText: consentText,
      patronCircleConsentVersion: '1.0',
      patronCircleJoinedAt: timestamp,
      updatedAt: timestamp
    };
    if (email) consentPayload.email = email;
    if (phone) {
      consentPayload.phoneNumber = phone;
      consentPayload.phone = phone;
    }

    // 1. Update in storageService local user and in-memory currentUser immediately
    try {
      const localUser = storageService.getUserById(uid) || (this.currentUser?.uid === uid ? this.currentUser : null);
      if (localUser) {
        const updated = {
          ...localUser,
          ...consentPayload
        };
        storageService.saveUser(updated);
        if (this.currentUser?.uid === uid) {
          this.setCurrentUser(updated);
        }
      }
    } catch {}

    // 2. Save newsletter subscription email idempotently
    if (email && email.includes('@')) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const existing: string[] = JSON.parse(localStorage.getItem('muety_newsletter_subs') || '[]');
        if (!existing.includes(cleanEmail)) {
          existing.push(cleanEmail);
          localStorage.setItem('muety_newsletter_subs', JSON.stringify(existing));
        }
      } catch {}
    }

    // 3. Update in Firestore /users/{uid} and /customers/{uid}
    if (db && isLiveFirebase) {
      try {
        await withTimeout(setDoc(doc(db, 'users', uid), consentPayload, { merge: true }), 2500);
      } catch (err) {
        console.warn('[AuthService] Firestore Patron Circle consent write note:', err);
      }

      try {
        await withTimeout(setDoc(doc(db, 'customers', uid), {
          marketingConsent: true,
          updatedAt: timestamp
        }, { merge: true }), 2500);
      } catch {}
    }
  }

  async updateCustomerProfile(updates: { 
    displayName?: string; 
    phoneNumber?: string;
    photoURL?: string;
  }): Promise<UserProfile> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.uid) {
      throw new Error('You must be signed in to update your profile.');
    }

    const cleanName = updates.displayName !== undefined ? updates.displayName.trim() : currentUser.displayName;
    if (updates.displayName !== undefined) {
      if (!cleanName || cleanName.length < 2) {
        throw new Error('Please enter a valid full name (minimum 2 characters).');
      }
    }

    const cleanPhone = updates.phoneNumber !== undefined ? updates.phoneNumber.trim() : currentUser.phoneNumber;

    // 1. Update Firebase Auth displayName if live Firebase is active
    if (auth && isLiveFirebase && auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { 
          displayName: cleanName,
          photoURL: updates.photoURL || auth.currentUser.photoURL || undefined
        });
      } catch (authErr: any) {
        console.warn('[AuthService] Firebase updateProfile note:', authErr?.message || authErr);
      }
    }

    // 2. Prepare updated UserProfile payload
    const timestamp = new Date().toISOString();
    const updatedUser: UserProfile = {
      ...currentUser,
      displayName: cleanName,
      fullName: cleanName,
      phoneNumber: cleanPhone,
      photoURL: updates.photoURL || currentUser.photoURL,
      updatedAt: timestamp
    };

    // 3. Write to Firestore /users/{uid} and /customers/{uid}
    if (db && isLiveFirebase) {
      try {
        const firestorePayload: Record<string, any> = {
          displayName: cleanName,
          fullName: cleanName,
          updatedAt: timestamp
        };
        if (cleanPhone) {
          firestorePayload.phoneNumber = cleanPhone;
          firestorePayload.phone = cleanPhone;
        }
        if (updates.photoURL) {
          firestorePayload.photoURL = updates.photoURL;
        }

        await withTimeout(Promise.all([
          setDoc(doc(db, 'users', currentUser.uid), firestorePayload, { merge: true }),
          setDoc(doc(db, 'customers', currentUser.uid), firestorePayload, { merge: true })
        ]), 5000);
      } catch (dbErr: any) {
        console.error('[AuthService] Failed to save profile to Firestore:', dbErr);
        throw new Error(dbErr?.message || 'Failed to persist profile changes to the server. Please check your connection.');
      }
    }

    // 4. Save to local storageService
    storageService.saveUser(updatedUser);

    // 5. Update in-memory user and notify subscribers
    this.setCurrentUser(updatedUser);

    return updatedUser;
  }

  async linkGoogleAccount(useRedirectOnMobile: boolean = false, mockEmail?: string): Promise<UserProfile> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be signed in to link your Google account.');
    }

    if (auth && isLiveFirebase && auth.currentUser) {
      const fbUser = auth.currentUser;
      const alreadyHasGoogle = (fbUser.providerData || []).some(p => p.providerId === 'google.com');
      if (alreadyHasGoogle) {
        throw new Error('Your Google account is already connected to this profile.');
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const cred = await linkWithPopup(fbUser, provider);
        const profile = await this.fetchUserProfile(cred.user);

        // Also persist linked Google email to Firestore /users and /customers
        if (db && cred.user.email) {
          const emailData = {
            email: cred.user.email,
            updatedAt: new Date().toISOString()
          };
          try {
            await Promise.all([
              setDoc(doc(db, 'users', cred.user.uid), emailData, { merge: true }),
              setDoc(doc(db, 'customers', cred.user.uid), emailData, { merge: true })
            ]);
          } catch {}
        }

        storageService.saveUser(profile);
        this.setCurrentUser(profile);
        return profile;
      } catch (err: any) {
        if (err?.code === 'auth/credential-already-in-use') {
          throw new Error('This Google account is already linked to another MUETY account. To use that account, please sign in with it directly.');
        }
        if (err?.code === 'auth/provider-already-linked') {
          throw new Error('Your Google account is already connected.');
        }
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          throw new Error('Google connection was cancelled.');
        }
        if (err?.code === 'auth/requires-recent-login') {
          throw new Error('For security, please sign out and sign in again before connecting a new account.');
        }
        throw new Error(err?.message || 'Failed to connect Google account.');
      }
    }

    // Fallback/mock mode
    const updated: UserProfile = {
      ...currentUser,
      email: mockEmail || currentUser.email || 'connected.google@muety.in',
      connectedProviders: Array.from(new Set([...(currentUser.connectedProviders || ['phone']), 'google.com']))
    };
    storageService.saveUser(updated);
    this.setCurrentUser(updated);
    return updated;
  }

  async sendPhoneLinkOtp(
    phoneNumber: string,
    appVerifier: ApplicationVerifier
  ): Promise<ConfirmationResult> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be signed in to verify a phone number.');
    }

    const rawDigits = (phoneNumber || '').replace(/[^\d+]/g, '');
    if (!rawDigits || !rawDigits.startsWith('+') || rawDigits.length < 10) {
      throw new Error('Please enter a valid mobile number with country code (e.g. +91 98765 43210).');
    }

    if (auth && isLiveFirebase && auth.currentUser) {
      const isAlreadyLinked = !!auth.currentUser.phoneNumber || 
        (auth.currentUser.providerData || []).some(p => p.providerId === 'phone');
      if (isAlreadyLinked) {
        throw new Error('A mobile number is already verified and connected to this account.');
      }

      try {
        const confirmationResult = await linkWithPhoneNumber(auth.currentUser, rawDigits, appVerifier);
        return confirmationResult;
      } catch (err: any) {
        if (err?.code === 'auth/credential-already-in-use') {
          throw new Error('This mobile number is already linked to another MUETY account.');
        }
        if (err?.code === 'auth/invalid-phone-number') {
          throw new Error('The mobile number format is invalid. Please verify the country code.');
        }
        if (err?.code === 'auth/quota-exceeded') {
          throw new Error('SMS verification quota exceeded. Please try again later.');
        }
        if (err?.code === 'auth/too-many-requests') {
          throw new Error('Too many verification attempts. Please wait a moment before trying again.');
        }
        throw new Error(err?.message || 'Failed to send OTP code to your mobile number.');
      }
    }

    // Fallback/mock mode
    return {
      verificationId: 'local-mock-link-verification-id',
      confirm: async (verificationCode: string) => {
        if (verificationCode !== '123456') {
          const err: any = new Error('Invalid verification code.');
          err.code = 'auth/invalid-verification-code';
          throw err;
        }
        const updated = {
          ...currentUser,
          phoneNumber: rawDigits,
          connectedProviders: Array.from(new Set([...(currentUser.connectedProviders || ['google.com']), 'phone']))
        };
        storageService.saveUser(updated);
        this.setCurrentUser(updated);
        const mockFbUser = {
          uid: currentUser.uid,
          email: currentUser.email || null,
          displayName: currentUser.displayName || null,
          phoneNumber: rawDigits,
          getIdTokenResult: async () => ({ claims: { role: currentUser.role || 'customer' } }),
          providerData: [
            ...(currentUser.email ? [{ providerId: 'google.com', email: currentUser.email }] : []),
            { providerId: 'phone', phoneNumber: rawDigits }
          ]
        };
        return { user: mockFbUser };
      }
    } as unknown as ConfirmationResult;
  }

  async verifyPhoneLinkOtp(
    confirmationResult: ConfirmationResult,
    verificationCode: string,
    phoneNumberToSave?: string
  ): Promise<UserProfile> {
    const cleanCode = (verificationCode || '').trim();
    if (!cleanCode || cleanCode.length < 6) {
      throw new Error('Please enter the complete 6-digit verification code.');
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error('You must be signed in.');

    try {
      const cred = await confirmationResult.confirm(cleanCode);
      const fbUser = cred.user || (auth && auth.currentUser);
      const targetPhone = phoneNumberToSave || fbUser?.phoneNumber || currentUser.phoneNumber;

      if (!isLiveFirebase) {
        const updated: UserProfile = {
          ...currentUser,
          phoneNumber: targetPhone,
          connectedProviders: Array.from(new Set([...(currentUser.connectedProviders || ['google.com']), 'phone']))
        };
        storageService.saveUser(updated);
        this.setCurrentUser(updated);
        return updated;
      }

      const profile = await this.fetchUserProfile(fbUser);

      if (db && isLiveFirebase && targetPhone) {
        try {
          const phoneData = {
            phoneNumber: targetPhone,
            phone: targetPhone,
            updatedAt: new Date().toISOString()
          };
          await Promise.all([
            setDoc(doc(db, 'users', currentUser.uid), phoneData, { merge: true }),
            setDoc(doc(db, 'customers', currentUser.uid), phoneData, { merge: true })
          ]);
        } catch {}
      }

      this.setCurrentUser(profile);
      return profile;
    } catch (err: any) {
      if (err?.code === 'auth/invalid-verification-code') {
        throw new Error('Incorrect verification code. Please check the 6-digit OTP and try again.');
      }
      if (err?.code === 'auth/code-expired') {
        throw new Error('Verification code has expired. Please request a new OTP.');
      }
      if (err?.code === 'auth/credential-already-in-use') {
        throw new Error('This phone number is already linked to another account.');
      }
      throw new Error(err?.message || 'Phone verification failed.');
    }
  }

  isGeneratedPatronName(name?: string | null): boolean {
    return isGeneratedPatronName(name);
  }

  getConnectedStatus(user?: UserProfile | null): {
    isGoogleConnected: boolean;
    googleEmail: string | null;
    isPhoneConnected: boolean;
    phoneNumber: string | null;
    maskedPhone: string | null;
  } {
    const targetUser = user || this.getCurrentUser();
    const fbUser = auth && isLiveFirebase ? auth.currentUser : null;

    const providerList: string[] = [];
    if (fbUser?.providerData) {
      fbUser.providerData.forEach(p => {
        if (p.providerId && !providerList.includes(p.providerId)) {
          providerList.push(p.providerId);
        }
      });
    }
    if (targetUser?.connectedProviders) {
      targetUser.connectedProviders.forEach(p => {
        if (!providerList.includes(p)) providerList.push(p);
      });
    }

    const hasGoogleProvider = providerList.includes('google.com');
    const hasEmail = Boolean(targetUser?.email && targetUser.email.includes('@'));
    const isGoogleConnected = hasGoogleProvider || hasEmail;
    const googleEmail = targetUser?.email || fbUser?.email || null;

    const hasPhoneProvider = providerList.includes('phone');
    const rawPhone = targetUser?.phoneNumber || (targetUser as any)?.phone || fbUser?.phoneNumber || null;
    const isPhoneConnected = hasPhoneProvider || Boolean(rawPhone && rawPhone.trim().length >= 8);

    let maskedPhone: string | null = null;
    if (rawPhone) {
      const clean = rawPhone.trim();
      const hasPlus = clean.startsWith('+');
      const digitsOnly = clean.replace(/\D/g, '');
      if (digitsOnly.length >= 10) {
        const countryDigits = hasPlus && digitsOnly.length > 10 ? digitsOnly.slice(0, digitsOnly.length - 10) : '';
        const countryPrefix = countryDigits ? `+${countryDigits} ` : (hasPlus ? '+91 ' : '');
        const national10 = digitsOnly.slice(-10);
        maskedPhone = `${countryPrefix}${national10.slice(0, 2)}*** **${national10.slice(-3)}`;
      } else {
        maskedPhone = rawPhone;
      }
    }

    return {
      isGoogleConnected,
      googleEmail,
      isPhoneConnected,
      phoneNumber: rawPhone,
      maskedPhone
    };
  }

  async logout(): Promise<void> {
    if (auth && isLiveFirebase) {
      try {
        await fbSignOut(auth);
      } catch {}
    }
    this.setCurrentUser(null);
  }

  async sendPasswordReset(email: string): Promise<void> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Please enter your account email address.');
    if (auth && isLiveFirebase) {
      await withTimeout(sendPasswordResetEmail(auth, cleanEmail), 4000);
      return;
    }
  }

  public hasRole(role: AppRole): boolean {
    return hasRole(this.currentUser, role);
  }

  public hasAnyRole(roles: AppRole[]): boolean {
    return hasAnyRole(this.currentUser, roles);
  }

  public hasPermission(permission: Permission): boolean {
    return hasPermission(this.currentUser, permission);
  }

  public isAdmin(): boolean {
    return this.hasAnyRole(['super_admin', 'admin', 'catalog_manager', 'order_manager', 'support_agent']);
  }
}

export const authService = AuthService.getInstance();
