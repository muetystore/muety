import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Polyfills for Node test runner
const memoryStorage: Record<string, string> = {};
let cookieStore = '';
const windowListeners: Record<string, ((e: any) => void)[]> = {};

if (typeof (globalThis as any).CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params?: { detail?: any }) {
      this.type = type;
      this.detail = params?.detail;
    }
  };
}

if (typeof (globalThis as any).document === 'undefined') {
  const headChildren: any[] = [];
  (globalThis as any).document = {
    get cookie() {
      return cookieStore;
    },
    set cookie(val: string) {
      const parts = String(val).split(';')[0].trim();
      if (parts) {
        const [k, v] = parts.split('=');
        if (k && v !== undefined) {
          if (String(val).includes('max-age=0')) {
            const regex = new RegExp(`(^|; )${k}=[^;]*`);
            cookieStore = cookieStore.replace(regex, '').replace(/^; /, '').trim();
          } else {
            cookieStore = `${k}=${v}`;
          }
        }
      }
    },
    createElement: (tag: string) => {
      const el: any = {
        tagName: tag.toUpperCase(),
        src: '',
        async: false,
        dataset: {},
        setAttribute: (k: string, v: string) => {
          if (k.startsWith('data-')) {
            el.dataset[k.replace('data-', '')] = v;
          }
          el[k] = v;
        },
        getAttribute: (k: string) => {
          if (k.startsWith('data-')) {
            return el.dataset[k.replace('data-', '')] || null;
          }
          return el[k] || null;
        },
        remove: () => {
          const idx = headChildren.indexOf(el);
          if (idx !== -1) headChildren.splice(idx, 1);
        }
      };
      return el;
    },
    head: {
      get children() {
        return headChildren;
      },
      appendChild: (node: any) => {
        headChildren.push(node);
        return node;
      }
    },
    getElementById: (id: string) => {
      return headChildren.find((c: any) => c.id === id) || null;
    },
    querySelector: (sel: string) => {
      if (sel.includes("script[data-tracker='gtm']")) {
        return headChildren.find((c: any) => c.dataset?.tracker === 'gtm') || null;
      }
      if (sel.includes("script[data-tracker='clarity']")) {
        return headChildren.find((c: any) => c.dataset?.tracker === 'clarity') || null;
      }
      return null;
    },
    querySelectorAll: (sel: string) => {
      if (sel.includes('script[data-tracker]')) {
        return [...headChildren.filter((c: any) => c.dataset?.tracker)];
      }
      return [];
    }
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { protocol: 'https:' },
    addEventListener: (type: string, fn: any) => {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(fn);
    },
    removeEventListener: (type: string, fn: any) => {
      if (!windowListeners[type]) return;
      windowListeners[type] = windowListeners[type].filter(f => f !== fn);
    },
    dispatchEvent: (event: any) => {
      const listeners = windowListeners[event.type] || [];
      listeners.forEach(fn => fn(event));
      return true;
    }
  };
} else {
  const originalDispatch = (globalThis as any).window.dispatchEvent;
  (globalThis as any).window.addEventListener = (type: string, fn: any) => {
    if (!windowListeners[type]) windowListeners[type] = [];
    windowListeners[type].push(fn);
  };
  (globalThis as any).window.removeEventListener = (type: string, fn: any) => {
    if (!windowListeners[type]) return;
    windowListeners[type] = windowListeners[type].filter(f => f !== fn);
  };
  (globalThis as any).window.dispatchEvent = (event: any) => {
    const listeners = windowListeners[event.type] || [];
    listeners.forEach(fn => fn(event));
    if (typeof originalDispatch === 'function') {
      try { originalDispatch.call((globalThis as any).window, event); } catch {}
    }
    return true;
  };
}

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = String(val); },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

// Import services after polyfills
import { consentManager, CURRENT_POLICY_VERSION } from '../features/privacy/services/consentManager';
import { trackerService } from '../features/privacy/services/trackerService';
import { storageService } from '../lib/storage/storageService';
import { CookieConsentRecord } from '../features/privacy/types';

describe('MUETY Cookie Consent & Privacy Controls Test Suite', () => {
  beforeEach(() => {
    cookieStore = '';
    Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]);

    // Clear head children scripts
    if ((globalThis as any).document?.head?.children) {
      (globalThis as any).document.head.children.length = 0;
    }

    consentManager.resetForTesting();
    trackerService.resetForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Consent Manager Core & DPDP Act Principles', () => {
    it('initializes with no preselected optional categories for a new visitor', () => {
      expect(consentManager.isConsentRequired()).toBe(true);
      expect(consentManager.hasConsent('necessary')).toBe(true);
      expect(consentManager.hasConsent('preferences')).toBe(false);
      expect(consentManager.hasConsent('analytics')).toBe(false);
      expect(consentManager.hasConsent('marketing')).toBe(false);
      expect(consentManager.getConsent()).toBeNull();
    });

    it('records "acceptAll" affirmative consent across all categories', () => {
      let eventPayload: CookieConsentRecord | null = null;
      const listener = (e: Event) => {
        eventPayload = (e as CustomEvent<CookieConsentRecord>).detail;
      };
      (globalThis as any).window.addEventListener('muety_consent_updated', listener);

      const record = consentManager.acceptAll();

      (globalThis as any).window.removeEventListener('muety_consent_updated', listener);

      expect(record.action).toBe('accept_all');
      expect(record.categories.necessary).toBe(true);
      expect(record.categories.preferences).toBe(true);
      expect(record.categories.analytics).toBe(true);
      expect(record.categories.marketing).toBe(true);
      expect(record.policyVersion).toBe(CURRENT_POLICY_VERSION);
      expect(consentManager.isConsentRequired()).toBe(false);
      expect(consentManager.hasConsent('analytics')).toBe(true);
      expect(eventPayload).toEqual(record);
    });

    it('records "rejectOptional" keeping strictly necessary only', () => {
      const record = consentManager.rejectOptional();

      expect(record.action).toBe('reject_optional');
      expect(record.categories.necessary).toBe(true);
      expect(record.categories.preferences).toBe(false);
      expect(record.categories.analytics).toBe(false);
      expect(record.categories.marketing).toBe(false);
      expect(consentManager.isConsentRequired()).toBe(false);
      expect(consentManager.hasConsent('necessary')).toBe(true);
      expect(consentManager.hasConsent('analytics')).toBe(false);
    });

    it('records granular choices via "saveCustomPreferences"', () => {
      const record = consentManager.saveCustomPreferences({
        preferences: true,
        analytics: false,
        marketing: false
      });

      expect(record.action).toBe('customized');
      expect(record.categories.necessary).toBe(true);
      expect(record.categories.preferences).toBe(true);
      expect(record.categories.analytics).toBe(false);
      expect(record.categories.marketing).toBe(false);
      expect(consentManager.hasConsent('preferences')).toBe(true);
      expect(consentManager.hasConsent('analytics')).toBe(false);
    });

    it('withdraws consent cleanly and sets consent as required again', () => {
      consentManager.acceptAll();
      expect(consentManager.hasConsent('analytics')).toBe(true);

      const record = consentManager.withdrawConsent();
      expect(record.action).toBe('withdrawn');
      expect(record.categories.necessary).toBe(true);
      expect(record.categories.analytics).toBe(false);
      expect(record.categories.preferences).toBe(false);
      expect(record.categories.marketing).toBe(false);
      expect(consentManager.isConsentRequired()).toBe(true);
    });

    it('prompts re-consent when policy version is bumped', () => {
      const oldRecord: CookieConsentRecord = {
        schemaVersion: 1,
        policyVersion: '2025-01-01', // Outdated version
        timestamp: new Date().toISOString(),
        categories: {
          necessary: true,
          preferences: true,
          analytics: true,
          marketing: true
        },
        action: 'accept_all'
      };

      (globalThis as any).localStorage.setItem('muety_consent_v1', JSON.stringify(oldRecord));
      consentManager.resetForTesting();

      expect(consentManager.isConsentRequired()).toBe(true);
    });
  });

  describe('2. Third-Party Tracker Gating (GTM & Clarity)', () => {
    it('verifies index.html does NOT inject GTM or Clarity unconditionally', () => {
      const indexPath = path.resolve(__dirname, '../../index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf8');

      // The unconsented automatic inline scripts must NOT exist in index.html
      expect(indexHtml).not.toContain('https://www.googletagmanager.com/gtm.js?id=GTM-MW56GX6L');
      expect(indexHtml).not.toContain('https://www.clarity.ms/tag/ywlcm9h1bu');
      expect(indexHtml).not.toContain("window.clarity('start'");
    });

    it('configures Google Consent Mode v2 default with denied permissions before consent', () => {
      const dataLayer: any[] = [];
      (globalThis as any).window.dataLayer = dataLayer;

      trackerService.init();

      const consentDefaultCall = dataLayer.find(
        entry => entry && entry[0] === 'consent' && entry[1] === 'default'
      );
      expect(consentDefaultCall).toBeDefined();
      expect(consentDefaultCall[2]).toMatchObject({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    });

    it('injects tracker scripts only upon affirmative analytics consent', () => {
      (globalThis as any).document.querySelectorAll("script[data-tracker]").forEach((s: any) => s.remove());

      // Reject optional
      const rejectRecord = consentManager.rejectOptional();
      trackerService.syncTrackers(rejectRecord);

      // No trackers should be present
      expect((globalThis as any).document.querySelector("script[data-tracker='gtm']")).toBeNull();
      expect((globalThis as any).document.querySelector("script[data-tracker='clarity']")).toBeNull();

      // Accept all (analytics = true)
      const acceptRecord = consentManager.acceptAll();
      trackerService.syncTrackers(acceptRecord);

      // Trackers should now be dynamically injected
      const gtmScript = (globalThis as any).document.querySelector("script[data-tracker='gtm']");
      const clarityScript = (globalThis as any).document.querySelector("script[data-tracker='clarity']");

      expect(gtmScript).not.toBeNull();
      expect(gtmScript?.src).toContain('GTM-MW56GX6L');
      expect(clarityScript).not.toBeNull();
      expect(clarityScript?.src).toContain('ywlcm9h1bu');
    });
  });

  describe('3. Local Storage & Preferences Gating', () => {
    it('prevents saving recently viewed items when preferences consent is not given', () => {
      consentManager.rejectOptional(); // preferences = false

      storageService.addRecentlyViewed('prod-kanchipuram-silk-001');

      const viewed = storageService.getRecentlyViewed();
      expect(viewed).not.toContain('prod-kanchipuram-silk-001');
    });

    it('allows saving recently viewed items when preferences consent is granted', () => {
      consentManager.saveCustomPreferences({
        preferences: true,
        analytics: false,
        marketing: false
      });

      storageService.addRecentlyViewed('prod-kanchipuram-silk-001');

      const viewed = storageService.getRecentlyViewed();
      expect(viewed).toContain('prod-kanchipuram-silk-001');
    });

    it('purges recently viewed items when preferences consent is revoked', () => {
      consentManager.saveCustomPreferences({
        preferences: true,
        analytics: false,
        marketing: false
      });
      storageService.addRecentlyViewed('prod-bridal-banarasi-002');
      expect(storageService.getRecentlyViewed()).toContain('prod-bridal-banarasi-002');

      // Now revoke preferences
      consentManager.rejectOptional();

      expect(storageService.getRecentlyViewed()).toEqual([]);
    });
  });

  describe('4. UI Integrity, Accessibility & Content Requirements', () => {
    it('verifies CookieConsentBanner contains the exact required banner copy', () => {
      const bannerFilePath = path.resolve(__dirname, '../features/privacy/components/CookieConsentBanner.tsx');
      const content = fs.readFileSync(bannerFilePath, 'utf8');

      // Heading: Your privacy matters at MUETY
      expect(content).toContain('Your privacy matters at MUETY');

      // Exact copy sentence:
      // "We use essential cookies to keep the store working. With your permission, we may also use analytics and marketing cookies to improve your shopping experience."
      expect(content).toContain('We use essential cookies to keep the store working');
      expect(content).toContain('With your permission, we may also use analytics and marketing cookies to improve your shopping experience');

      // Actions: Accept all, Reject optional, Customize
      expect(content).toContain('Accept all');
      expect(content).toContain('Reject optional');
      expect(content).toContain('Customize');
    });

    it('verifies strictly necessary cookies are locked and cannot be disabled', () => {
      const bannerFilePath = path.resolve(__dirname, '../features/privacy/components/CookieConsentBanner.tsx');
      const content = fs.readFileSync(bannerFilePath, 'utf8');

      expect(content).toContain('Always Active');
      expect(content).toContain('cookie-switch is-locked');
      expect(content).toContain('aria-disabled="true"');
    });

    it('verifies Cookie Policy page exists with comprehensive DPDP Act disclosures', () => {
      const policyFilePath = path.resolve(__dirname, '../features/info/pages/CookiePolicyPage.tsx');
      expect(fs.existsSync(policyFilePath)).toBe(true);

      const content = fs.readFileSync(policyFilePath, 'utf8');
      expect(content).toContain('Cookie Policy');
      expect(content).toContain('Digital Personal Data Protection');
      expect(content).toContain('2023');
      expect(content).toContain('Information Technology Act, 2000');
      expect(content).toContain('Strictly Necessary');
      expect(content).toContain('Preferences');
      expect(content).toContain('Analytics');
      expect(content).toContain('Marketing');
      expect(content).toContain('GTM-MW56GX6L');
      expect(content).toContain('ywlcm9h1bu');
      expect(content).toContain('180 days');
    });

    it('verifies Footer contains persistent Cookie Policy and Cookie Preferences links', () => {
      const footerFilePath = path.resolve(__dirname, '../shared/components/ui/Footer.tsx');
      const content = fs.readFileSync(footerFilePath, 'utf8');

      expect(content).toContain('to="/cookie-policy"');
      expect(content).toContain('Cookie Policy');
      expect(content).toContain('muety_open_cookie_settings');
      expect(content).toContain('Cookie Preferences');
    });

    it('verifies Privacy Policy cross-links to Cookie Policy', () => {
      const privacyFilePath = path.resolve(__dirname, '../features/info/pages/PrivacyPage.tsx');
      const content = fs.readFileSync(privacyFilePath, 'utf8');

      expect(content).toContain('to="/cookie-policy"');
      expect(content).toContain('View MUETY Cookie Policy');
      expect(content).toContain('muety_open_cookie_settings');
    });
  });
});
