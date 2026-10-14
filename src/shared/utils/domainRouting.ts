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
 * Checks whether store.muety.in should route/redirect to muety.in (post-launch).
 * Driven by VITE_LAUNCHED='true' or VITE_REDIRECT_STORE_TO_ROOT='true'.
 */
export const shouldRedirectStoreToRoot = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const launched = import.meta.env.VITE_LAUNCHED;
    const redirectFlag = import.meta.env.VITE_REDIRECT_STORE_TO_ROOT;
    if (launched === 'true' || launched === '1' || redirectFlag === 'true' || redirectFlag === '1') {
      return true;
    }
  }
  return false;
};

/**
 * Resolves the absolute storefront URL based on current environment and launch state.
 * Used for "View Storefront" links from Admin Panel and Countdown redirects.
 */
export const getCanonicalStoreUrl = (path = '/'): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isLocalOrDev()) {
    return cleanPath;
  }
  const isPostLaunch = shouldRedirectStoreToRoot();
  const domain = isPostLaunch ? 'https://muety.in' : 'https://store.muety.in';
  return `${domain}${cleanPath}`;
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
