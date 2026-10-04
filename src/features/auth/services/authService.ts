import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isLiveFirebase } from '@/lib/firebase/firebase';
import { UserProfile, AppRole } from '@/shared/types';
import { storageService } from '@/lib/storage/storageService';
import { getUserRoles, hasRole, hasAnyRole, hasPermission, Permission } from '@/shared/utils/permissions';

const CURRENT_USER_KEY = 'muety_current_session_user';

const withTimeout = <T>(promise: Promise<T>, ms: number = 4000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
};

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
            this.setCurrentUser(null);
          }
        });
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
        const userDoc = await withTimeout(getDoc(doc(db, 'users', fbUser.uid)), 2000);
        if (userDoc && userDoc.exists && userDoc.exists()) {
          firestoreProfile = userDoc.data() as UserProfile;
        }
      } catch (err) {
        console.warn('Firestore fetch user profile skipped/timed out:', err);
      }
    }

    const combinedRoles: AppRole[] = (roles.length > 0 && (!roles.includes('customer') || roles.length > 1))
      ? roles
      : (firestoreProfile.roles || (firestoreProfile.role ? [firestoreProfile.role] : ['customer']));

    const profile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || firestoreProfile.email || '',
      displayName: fbUser.displayName || firestoreProfile.displayName || fbUser.email?.split('@')[0] || 'MUETY Patron',
      photoURL: fbUser.photoURL || firestoreProfile.photoURL,
      roles: combinedRoles,
      role: combinedRoles[0] || 'customer',
      phoneNumber: fbUser.phoneNumber || firestoreProfile.phoneNumber,
      createdAt: firestoreProfile.createdAt || new Date().toISOString()
    };

    delete (profile as any).password;
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

    const profile: UserProfile = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      roles: ['customer'],
      role: 'customer',
      createdAt: new Date().toISOString(),
      ordersCount: 0,
      totalSpent: 0
    };

    delete (profile as any).password;

    if (db && isLiveFirebase) {
      try {
        await withTimeout(setDoc(doc(db, 'users', uid), profile, { merge: true }), 2500);
      } catch (firestoreErr) {
        console.warn('Firestore setDoc user profile note:', firestoreErr);
      }
    }

    storageService.saveUser(profile);
    this.setCurrentUser(profile);
    return profile;
  }

  async loginWithGoogle(): Promise<UserProfile> {
    if (auth && isLiveFirebase) {
      try {
        const provider = new GoogleAuthProvider();
        const cred = await withTimeout(signInWithPopup(auth, provider), 10000);
        const profile = await this.fetchUserProfile(cred.user);
        
        // Ensure user document exists in Firestore
        if (db && isLiveFirebase) {
          try {
            await setDoc(doc(db, 'users', cred.user.uid), profile, { merge: true });
          } catch (docErr) {
            console.warn('Firestore setDoc Google user note:', docErr);
          }
        }
        
        this.setCurrentUser(profile);
        return profile;
      } catch (e: any) {
        console.warn('Firebase Google login error:', e);
        if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
          throw new Error('Google Sign-In popup was closed before completing authentication.');
        }
        if (e?.code === 'auth/unauthorized-domain') {
          throw new Error('This domain is not authorized for Google Sign-In in Firebase Console. Please add it under Authentication > Authorized domains.');
        }
        throw new Error(e?.message || 'Google Sign-In failed. Please check your credentials or network connection.');
      }
    }

    throw new Error('Firebase Authentication is not available. Please verify your Firebase project configuration.');
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
