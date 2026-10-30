/**
 * Domain & Subdomain Routing Utilities for MUETY
 * 
 * Handles multi-subdomain routing for:
 * - admin.muety.in / www.admin.muety.in -> Dedicated Admin Panel
 * - store.muety.in / www.store.muety.in -> Customer Storefront (pre-launch & launch)
 * - muety.in / www.muety.in             -> Countdown (pre-launch) -> Storefront (post-launch)
 * - localhost / 127.0.0.1              -> Local Development (both accessible)
 */

export const getHostname = (): string => {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
};

/**
 * Returns true if current hostname is the administrative portal subdomain.
 */
export const isAdminDomain = (customHost?: string): boolean => {
  const host = (customHost ?? getHostname()).toLowerCase();
  return (
    host === 'admin.muety.in' ||
    host === 'www.admin.muety.in' ||
    host.startsWith('admin.') ||
    host.includes('admin')
  );
};

/**
 * Returns true if current hostname is the dedicated storefront subdomain.
 */
export const isStoreDomain = (customHost?: string): boolean => {
  const host = (customHost ?? getHostname()).toLowerCase();
  return (
    host === 'store.muety.in' ||
    host === 'www.store.muety.in' ||
    host.startsWith('store.')
  );
};

/**
 * Returns true if current hostname is the apex domain (muety.in or www.muety.in).
 */
export const isApexDomain = (customHost?: string): boolean => {
  const host = (customHost ?? getHostname()).toLowerCase();
  return host === 'muety.in' || host === 'www.muety.in';
};

/**
 * Returns true if running in local development or test environment.
 */
export const isLocalOrDev = (customHost?: string): boolean => {
  const host = (customHost ?? getHostname()).toLowerCase();
  return (
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes('localhost')
  );
};

/**
 * Checks whether store.muety.in should route/redirect to muety.in.
 * As per architecture requirements, store.muety.in is dedicated only to the customer storefront
 * and must never redirect to www.muety.in or muety.in. Always returns false.
 */
export const shouldRedirectStoreToRoot = (): boolean => {
  return false;
};

/**
 * Resolves the absolute storefront URL based on current environment.
 * Used for "View Storefront" links from Admin Panel and Countdown redirects.
 */
export const getCanonicalStoreUrl = (path = '/'): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isLocalOrDev()) {
    return cleanPath;
  }
  return `https://store.muety.in${cleanPath}`;
};

/**
 * Resolves the absolute admin portal URL.
 * Used to direct administrators to admin.muety.in from any domain.
 */
export const getAdminPortalUrl = (path = '/admin'): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isLocalOrDev()) {
    return cleanPath;
  }
  return `https://admin.muety.in${cleanPath}`;
};

/**
 * Checks if the hostname is candidate for post-launch apex consolidation (muety.in / www.muety.in).
 * Strips port if present.
 */
export const isRedirectableApexHost = (hostname?: string): boolean => {
  const host = (hostname ?? getHostname()).toLowerCase().trim().split(':')[0];
  return host === 'muety.in' || host === 'www.muety.in';
};

/**
 * Evaluates whether configured launch date has passed against a reference UTC timestamp.
 * Interprets ISO 8601 strings with timezone offsets accurately.
 */
export const isLaunchPassed = (
  launchDateStr?: string,
  referenceTime: number = Date.now()
): { isPassed: boolean; timestamp: number; isValid: boolean } => {
  if (!launchDateStr || typeof launchDateStr !== 'string' || !launchDateStr.trim()) {
    return { isPassed: false, timestamp: NaN, isValid: false };
  }
  const timestamp = new Date(launchDateStr.trim()).getTime();
  if (isNaN(timestamp)) {
    return { isPassed: false, timestamp: NaN, isValid: false };
  }
  return {
    isPassed: referenceTime >= timestamp,
    timestamp,
    isValid: true
  };
};

/**
 * Constructs the permanent 301 redirect target URL on store.muety.in,
 * preserving pathname, query string, and URL-encoded characters.
 */
export const buildRedirectUrl = (
  requestUrl: string,
  targetOrigin: string = 'https://store.muety.in'
): string => {
  const parsed = new URL(requestUrl);
  const cleanOrigin = targetOrigin.replace(/\/+$/, '');

  // Apex root with no query parameters -> canonical storefront root without trailing slash
  if ((parsed.pathname === '/' || parsed.pathname === '') && !parsed.search) {
    return cleanOrigin;
  }

  // Apex root with query parameters -> e.g. https://store.muety.in/?utm_source=...
  if (parsed.pathname === '/' || parsed.pathname === '') {
    return `${cleanOrigin}/${parsed.search}`;
  }

  // Subpath preservation: keeps pathname (including encoded characters) and query parameters
  return `${cleanOrigin}${parsed.pathname}${parsed.search}`;
};

/**
 * Determines whether a given request should be consolidated from apex to storefront.
 * Returns true ONLY if hostname is muety.in/www.muety.in AND launch timestamp has passed.
 */
export const shouldConsolidateApexDomain = (
  hostname?: string,
  launchDateStr?: string,
  referenceTime: number = Date.now()
): boolean => {
  if (!isRedirectableApexHost(hostname)) {
    return false;
  }
  const evalResult = isLaunchPassed(launchDateStr, referenceTime);
  return evalResult.isValid && evalResult.isPassed;
};
