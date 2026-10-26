import { consentManager } from './consentManager';
import { CookieConsentRecord } from '../types';
import { authService } from '@/features/auth/services/authService';

declare global {
  interface Window {
    dataLayer?: any[];
    clarity?: (...args: any[]) => void;
  }
}

class TrackerService {
  private gtmInjected = false;
  private clarityInjected = false;
  private isInitialized = false;

  public init(): void {
    if (typeof window === 'undefined') return;
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Initialize dataLayer with default denied consent state (Google Consent Mode v2)
    window.dataLayer = window.dataLayer || [];
    function gtag(..._args: any[]) {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    }
    // Only set default if not already configured
    if (!window.dataLayer.some((item: any) => item?.[0] === 'consent' && item?.[1] === 'default')) {
      gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
      });
    }

    // Evaluate existing consent
    const currentConsent = consentManager.getConsent();
    if (currentConsent) {
      this.syncTrackers(currentConsent);
    }

    // Subscribe to future consent changes
    consentManager.subscribe((record) => {
      this.syncTrackers(record);
    });
  }

  public syncTrackers(record: CookieConsentRecord | null): void {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];

    const hasAnalytics = record?.categories.analytics === true;
    const hasMarketing = record?.categories.marketing === true;

    // 1. Google Consent Mode v2 Update
    window.dataLayer.push({
      event: 'muety_consent_update',
      consent: {
        analytics_storage: hasAnalytics ? 'granted' : 'denied',
        ad_storage: hasMarketing ? 'granted' : 'denied',
        ad_user_data: hasMarketing ? 'granted' : 'denied',
        ad_personalization: hasMarketing ? 'granted' : 'denied'
      }
    });

    // 2. Gate Analytics Trackers (GTM & Clarity)
    if (hasAnalytics) {
      this.loadGoogleTagManager();
      this.loadMicrosoftClarity();
    } else {
      this.disableAnalytics();
    }

    // 3. Gate Marketing Trackers & Patron Circle Enrollment
    if (hasMarketing) {
      window.dataLayer.push({ event: 'marketing_consent_granted' });
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('muety_cookie_marketing_consent', 'true');
        }
        const user = authService.getCurrentUser();
        if (user?.uid) {
          void authService.recordPatronCircleConsent(user.uid, true, user.email, user.phoneNumber);
        }
      } catch (err) {
        // Safe fallback in isolated test environments
      }
    } else {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('muety_cookie_marketing_consent', 'false');
        }
      } catch {}
    }
  }

  private loadGoogleTagManager(): void {
    if (this.gtmInjected || typeof document === 'undefined') return;
    this.gtmInjected = true;

    try {
      const gtmId = 'GTM-MW56GX6L';
      const script = document.createElement('script');
      script.id = 'muety-gtm-script';
      script.setAttribute('data-tracker', 'gtm');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
      document.head.appendChild(script);

      window.dataLayer?.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });
    } catch (err) {
      console.warn('[TrackerService] GTM injection note:', err);
    }
  }

  private loadMicrosoftClarity(): void {
    if (this.clarityInjected || typeof document === 'undefined') return;
    this.clarityInjected = true;

    try {
      const clarityId = 'ywlcm9h1bu';
      window.clarity = window.clarity || function() {
        (window.clarity as any).q = (window.clarity as any).q || [];
        // eslint-disable-next-line prefer-rest-params
        (window.clarity as any).q.push(arguments);
      };

      const script = document.createElement('script');
      script.id = 'muety-clarity-script';
      script.setAttribute('data-tracker', 'clarity');
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${clarityId}`;
      document.head.appendChild(script);
    } catch (err) {
      console.warn('[TrackerService] Clarity injection note:', err);
    }
  }


  private disableAnalytics(): void {
    // If scripts were already injected in DOM during this session, notify providers of withdrawal
    if (typeof window.clarity === 'function') {
      try {
        window.clarity('consent', false);
      } catch {}
    }
    window.dataLayer?.push({ event: 'analytics_consent_revoked' });
  }

  /**
   * Diagnostic helper for testing: indicates if scripts have been injected.
   */
  public getStatus() {
    return {
      gtmInjected: this.gtmInjected,
      clarityInjected: this.clarityInjected,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Test helper to reset internal flags between test cases.
   */
  public resetForTesting(): void {
    this.gtmInjected = false;
    this.clarityInjected = false;
    this.isInitialized = false;
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('muety-gtm-script')?.remove();
      document.getElementById('muety-clarity-script')?.remove();
    }
  }
}

export const trackerService = new TrackerService();
