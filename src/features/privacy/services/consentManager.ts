import { CookieConsentRecord, ConsentCategory, ConsentCategories } from '../types';

export const CONSENT_COOKIE_NAME = 'muety_consent_v1';
export const CONSENT_STORAGE_KEY = 'muety_consent_v1';
export const CURRENT_SCHEMA_VERSION = 1;
export const CURRENT_POLICY_VERSION = '2026-10-25';
export const CONSENT_EXPIRATION_DAYS = 180;

const DEFAULT_CATEGORIES: ConsentCategories = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false
};

class ConsentManager {
  private inMemoryRecord: CookieConsentRecord | null = null;
  private subscribers = new Set<(record: CookieConsentRecord | null) => void>();

  constructor() {
    this.inMemoryRecord = this.readStoredConsent();
  }

  /**
   * Safely reads the consent record from first-party cookie, falling back to localStorage.
   */
  public getConsent(): CookieConsentRecord | null {
    if (this.inMemoryRecord) {
      return this.inMemoryRecord;
    }
    const stored = this.readStoredConsent();
    this.inMemoryRecord = stored;
    return stored;
  }

  /**
   * Evaluates if a given category has explicit user consent.
   * Strictly necessary is always true.
   */
  public hasConsent(category: ConsentCategory): boolean {
    if (category === 'necessary') return true;
    const consent = this.getConsent();
    if (!consent) return false;
    // If policy changed materially, consent is invalid until reaffirmed
    if (consent.policyVersion !== CURRENT_POLICY_VERSION) return false;
    return Boolean(consent.categories[category]);
  }

  /**
   * Returns true if the user has not yet made a valid consent decision for the current policy version.
   */
  public isConsentRequired(): boolean {
    const consent = this.getConsent();
    if (!consent) return true;
    if (consent.schemaVersion !== CURRENT_SCHEMA_VERSION) return true;
    if (consent.policyVersion !== CURRENT_POLICY_VERSION) return true;
    if (consent.action === 'withdrawn') return true;
    return false;
  }

  /**
   * Accepts all categories (necessary + preferences + analytics + marketing).
   */
  public acceptAll(): CookieConsentRecord {
    const record: CookieConsentRecord = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      policyVersion: CURRENT_POLICY_VERSION,
      timestamp: new Date().toISOString(),
      categories: {
        necessary: true,
        preferences: true,
        analytics: true,
        marketing: true
      },
      action: 'accept_all'
    };
    this.persistConsent(record);
    return record;
  }

  /**
   * Rejects all optional categories; strictly necessary remains active.
   */
  public rejectOptional(): CookieConsentRecord {
    const record: CookieConsentRecord = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      policyVersion: CURRENT_POLICY_VERSION,
      timestamp: new Date().toISOString(),
      categories: {
        necessary: true,
        preferences: false,
        analytics: false,
        marketing: false
      },
      action: 'reject_optional'
    };
    this.persistConsent(record);
    return record;
  }

  /**
   * Saves specific customized categories selected by the patron.
   */
  public saveCustomPreferences(choices: {
    preferences?: boolean;
    analytics?: boolean;
    marketing?: boolean;
  }): CookieConsentRecord {
    const record: CookieConsentRecord = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      policyVersion: CURRENT_POLICY_VERSION,
      timestamp: new Date().toISOString(),
      categories: {
        necessary: true,
        preferences: Boolean(choices.preferences),
        analytics: Boolean(choices.analytics),
        marketing: Boolean(choices.marketing)
      },
      action: 'customized'
    };
    this.persistConsent(record);
    return record;
  }

  /**
   * Withdraws all optional consents previously granted, keeping strictly necessary active.
   */
  public withdrawConsent(): CookieConsentRecord {
    const record: CookieConsentRecord = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      policyVersion: CURRENT_POLICY_VERSION,
      timestamp: new Date().toISOString(),
      categories: {
        necessary: true,
        preferences: false,
        analytics: false,
        marketing: false
      },
      action: 'withdrawn'
    };
    this.persistConsent(record);
    return record;
  }

  /**
   * Completely clears the consent record so the banner prompts again.
   */
  public resetConsent(): void {
    this.inMemoryRecord = null;
    this.clearStoredConsent();
    this.notifySubscribers(null);
  }

  /**
   * Subscribes to consent updates. Returns an unsubscription function.
   */
  public subscribe(callback: (record: CookieConsentRecord | null) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // =========================================================================
  // Internal Cookie and Storage Persistence
  // =========================================================================

  private readStoredConsent(): CookieConsentRecord | null {
    // 1. Try reading first-party cookie
    try {
      if (typeof document !== 'undefined' && document.cookie) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, ...valParts] = cookie.trim().split('=');
          if (name === CONSENT_COOKIE_NAME) {
            const rawVal = decodeURIComponent(valParts.join('='));
            const parsed = JSON.parse(rawVal);
            if (this.isValidRecord(parsed)) {
              return parsed;
            }
          }
        }
      }
    } catch (err) {
      // Cookie parsing error - proceed to localStorage fallback
    }

    // 2. Try localStorage fallback
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          if (this.isValidRecord(parsed)) {
            return parsed;
          }
        }
      }
    } catch (err) {
      // localStorage restricted or disabled
    }

    return null;
  }

  private persistConsent(record: CookieConsentRecord): void {
    this.inMemoryRecord = record;
    const serialized = JSON.stringify(record);
    const maxAge = CONSENT_EXPIRATION_DAYS * 24 * 60 * 60;

    // 1. Write first-party cookie with secure attributes
    try {
      if (typeof document !== 'undefined') {
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const secureFlag = isHttps ? '; Secure' : '';
        document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secureFlag}`;
      }
    } catch (err) {
      // Document cookie write failure
    }

    // 2. Dual-persist to localStorage for robustness across sub-resources
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
      }
    } catch (err) {
      // localStorage storage failure
    }

    this.notifySubscribers(record);
  }

  private clearStoredConsent(): void {
    try {
      if (typeof document !== 'undefined') {
        document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
      }
    } catch {}

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
      }
    } catch {}
  }

  private isValidRecord(obj: any): obj is CookieConsentRecord {
    if (!obj || typeof obj !== 'object') return false;
    if (typeof obj.schemaVersion !== 'number') return false;
    if (typeof obj.policyVersion !== 'string') return false;
    if (typeof obj.timestamp !== 'string') return false;
    if (!obj.categories || typeof obj.categories !== 'object') return false;
    if (obj.categories.necessary !== true) return false;
    return true;
  }

  private notifySubscribers(record: CookieConsentRecord | null): void {
    this.subscribers.forEach(cb => {
      try {
        cb(record);
      } catch (e) {
        console.warn('Error in consent subscriber:', e);
      }
    });

    if (typeof window !== 'undefined') {
      try {
        const evt = new CustomEvent('muety_consent_updated', { detail: record });
        window.dispatchEvent(evt);
      } catch {}
    }
  }

  /**
   * Resets internal cached record and reloads from cookie/storage for testing.
   */
  public resetForTesting(): void {
    this.inMemoryRecord = null;
    this.inMemoryRecord = this.readStoredConsent();
  }
}

export const consentManager = new ConsentManager();
