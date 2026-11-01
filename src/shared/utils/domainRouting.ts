/**
 * Domain & Subdomain Routing Utilities for MUETY
 * 
 * Handles multi-domain routing for:
 * - admin.muety.in / www.admin.muety.in -> Dedicated Admin Panel
 * - muety.in / www.muety.in             -> Customer Storefront & Primary Brand Domain
 * - store.muety.in / www.store.muety.in -> Legacy Subdomain (301 Permanent Redirect to muety.in)
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
 * Returns true if current hostname is the legacy storefront subdomain (store.muety.in).
 */
export const isLegacyStoreDomain = (customHost?: string): boolean => {
  const host = (customHost ?? getHostname()).toLowerCase();
  return (
    host === 'store.muety.in' ||
    host === 'www.store.muety.in' ||
    host.startsWith('store.')
  );
};

/**
 * Returns true if current hostname is the primary storefront domain (muety.in or www.muety.in).
 */
export const isStoreDomain = (customHost?: string): boolean => {
  const host = (customHost ?? getHostname()).toLowerCase();
  return (
    host === 'muety.in' ||
    host === 'www.muety.in' ||
    isLegacyStoreDomain(host)
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
 * Checks whether the current hostname should redirect to muety.in.
 * As per client requirements, store.muety.in is removed and must redirect to muety.in.
 */
export const shouldRedirectStoreToRoot = (customHost?: string): boolean => {
  const host = (customHost ?? getHostname()).toLowerCase();
  return isLegacyStoreDomain(host);
};

/**
 * Resolves the absolute storefront URL based on current environment.
 * Primary storefront domain is https://muety.in.
 * Used for "View Storefront" links from Admin Panel, canonical tags, and transactional emails.
 */
export const getCanonicalStoreUrl = (path = '/'): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isLocalOrDev()) {
    return cleanPath;
  }
  return `https://muety.in${cleanPath}`;
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
 * Checks if the hostname is candidate for legacy store redirect to apex (store.muety.in).
 * Strips port if present.
 */
export const isLegacyStoreHost = (hostname?: string): boolean => {
  const host = (hostname ?? getHostname()).toLowerCase().trim().split(':')[0];
  return host === 'store.muety.in' || host === 'www.store.muety.in';
};

/**
 * Legacy alias for backwards compatibility with previous test suites.
 */
export const isRedirectableApexHost = (hostname?: string): boolean => {
  return isLegacyStoreHost(hostname);
};

/**
 * Constructs the permanent 301 redirect target URL on muety.in,
 * preserving pathname, query string, and URL-encoded characters.
 */
export const buildRedirectUrl = (
  requestUrl: string,
  targetOrigin: string = 'https://muety.in'
): string => {
  const parsed = new URL(requestUrl);
  const cleanOrigin = targetOrigin.replace(/\/+$/, '');

  // Root with no query parameters -> canonical storefront root without trailing slash
  if ((parsed.pathname === '/' || parsed.pathname === '') && !parsed.search) {
    return cleanOrigin;
  }

  // Root with query parameters -> e.g. https://muety.in/?utm_source=...
  if (parsed.pathname === '/' || parsed.pathname === '') {
    return `${cleanOrigin}/${parsed.search}`;
  }

  // Subpath preservation: keeps pathname (including encoded characters) and query parameters
  return `${cleanOrigin}${parsed.pathname}${parsed.search}`;
};

/**
 * Checks if incoming request hostname should be redirected to muety.in.
 */
export const shouldConsolidateApexDomain = (
  hostname?: string
): boolean => {
  return isLegacyStoreHost(hostname);
};
