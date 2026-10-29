import { db, auth } from '@/lib/firebase/firebase';
import { authService } from '@/features/auth/services/authService';

/**
 * Ensures the live Firebase Auth session is active and its token is fresh before
 * issuing privileged catalog writes (e.g. categories, products, counters) to Cloud Firestore.
 */
export async function ensureLiveAdminAuth(): Promise<void> {
  const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
  if (isTest || !db) return;
  if (!auth) return;

  if (!auth.currentUser) {
    try {
      await authService.waitForAuthReady();
    } catch {}
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Your administrative security session is disconnected or unauthenticated. Please sign in to MUETY Admin to authorize Firestore writes.');
  }

  try {
    // Force refresh ID token to ensure latest claims and that token has not expired
    await currentUser.getIdToken(true);
  } catch (refreshErr: any) {
    console.warn('[catalogAuthHelper] ID token refresh warning:', refreshErr?.message || refreshErr);
  }
}

