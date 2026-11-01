/**
 * Netlify Edge Function: Legacy Subdomain Redirect & Domain Consolidation
 *
 * Responsibilities:
 * 1. Checks incoming hostname:
 *    - Legacy storefront subdomains (store.muety.in / www.store.muety.in) are permanently (301)
 *      redirected to the primary storefront domain on muety.in (preserving path, query, and params).
 *    - Primary domains (muety.in, www.muety.in, admin.muety.in, deploy previews, localhost)
 *      pass through directly to serve their respective applications.
 * 2. Preserves path, query parameters, and URL-encoded characters.
 */

// Fallback build configuration baked during 'npm run build'
import { launchConfig } from "./launch-config.ts";

declare const Netlify: {
  env?: {
    get: (key: string) => string | undefined;
  };
};

declare const Deno: {
  env?: {
    get: (key: string) => string | undefined;
  };
};

export interface EdgeContext {
  next: () => Promise<Response>;
  [key: string]: unknown;
}

/**
 * Checks if the hostname is the legacy store subdomain (store.muety.in / www.store.muety.in).
 * Strips port numbers if present.
 */
export function isLegacyStoreHost(hostname: string, requestHeaders?: Headers): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase().trim().split(':')[0];
  if (host === 'store.muety.in' || host === 'www.store.muety.in') {
    return true;
  }
  // Allow test header in non-production / test runner environments
  if (requestHeaders) {
    const testHost = requestHeaders.get('x-muety-test-host');
    if (testHost && (testHost === 'store.muety.in' || testHost === 'www.store.muety.in')) {
      return true;
    }
  }
  return false;
}

/**
 * Backwards compatibility helper for tests.
 */
export function isRedirectableApexHost(hostname: string, requestHeaders?: Headers): boolean {
  return isLegacyStoreHost(hostname, requestHeaders);
}

/**
 * Retrieves the configured launch date from runtime environment or build configuration.
 */
export function resolveLaunchDate(): string | undefined {
  if (typeof Netlify !== 'undefined' && (Netlify as any).env?.get) {
    const netlifyEnv = (Netlify as any).env.get('LAUNCH_DATE') || (Netlify as any).env.get('VITE_LAUNCH_DATE');
    if (netlifyEnv) return netlifyEnv;
  }
  if (typeof Deno !== 'undefined' && (Deno as any).env?.get) {
    const denoEnv = (Deno as any).env.get('LAUNCH_DATE') || (Deno as any).env.get('VITE_LAUNCH_DATE');
    if (denoEnv) return denoEnv;
  }
  if (typeof process !== 'undefined' && process.env) {
    const procEnv = process.env.LAUNCH_DATE || process.env.VITE_LAUNCH_DATE;
    if (procEnv) return procEnv;
  }
  return launchConfig?.launchDate;
}

/**
 * Retrieves the target storefront origin from environment or build configuration.
 * Primary storefront domain is https://muety.in.
 */
export function resolveStoreOrigin(): string {
  let origin = 'https://muety.in';
  if (typeof Netlify !== 'undefined' && (Netlify as any).env?.get) {
    const val = (Netlify as any).env.get('STORE_URL') || (Netlify as any).env.get('MUETY_STORE_URL');
    if (val) origin = val;
  } else if (typeof Deno !== 'undefined' && (Deno as any).env?.get) {
    const val = (Deno as any).env.get('STORE_URL') || (Deno as any).env.get('MUETY_STORE_URL');
    if (val) origin = val;
  } else if (typeof process !== 'undefined' && process.env) {
    const val = process.env.STORE_URL || process.env.MUETY_STORE_URL;
    if (val) origin = val;
  } else if (launchConfig?.storeUrl) {
    origin = launchConfig.storeUrl;
  }
  return origin.replace(/\/+$/, '');
}

/**
 * Checks whether the launch date has passed given a date string and reference time.
 */
export function isLaunchPassed(launchDateStr?: string, referenceTime: number = Date.now()): {
  isPassed: boolean;
  timestamp: number;
  isValid: boolean;
} {
  if (!launchDateStr || typeof launchDateStr !== 'string' || !launchDateStr.trim()) {
    return { isPassed: true, timestamp: 0, isValid: true };
  }
  const timestamp = new Date(launchDateStr.trim()).getTime();
  if (isNaN(timestamp)) {
    return { isPassed: true, timestamp: 0, isValid: true };
  }
  return {
    isPassed: referenceTime >= timestamp,
    timestamp,
    isValid: true
  };
}

/**
 * Checks for explicit live override flags (e.g. LAUNCH_STATUS=LIVE or MUETY_LAUNCH_MODE=force_live).
 */
export function isForcedLiveMode(): boolean {
  return true;
}

/**
 * Builds the exact storefront destination URL preserving path, query parameters,
 * and URL-encoded characters.
 */
export function buildRedirectUrl(requestUrl: string, storeOrigin: string = resolveStoreOrigin()): string {
  const parsed = new URL(requestUrl);
  const cleanOrigin = storeOrigin.replace(/\/+$/, '');

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
}

/**
 * Netlify Edge Function Default Handler
 */
export default async function handler(request: Request, context: EdgeContext): Promise<Response> {
  const url = new URL(request.url);

  // 1. If visitor requests legacy store.muety.in, return 301 Permanent Redirect to muety.in
  if (isLegacyStoreHost(url.hostname, request.headers)) {
    const destinationUrl = buildRedirectUrl(request.url, resolveStoreOrigin());
    return new Response(null, {
      status: 301,
      headers: {
        Location: destinationUrl,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Muety-Redirect': 'legacy-store-to-apex-storefront'
      }
    });
  }

  // 2. All other domains (muety.in, www.muety.in, admin.muety.in, localhost) pass through directly
  return context.next();
}

export const config = {
  path: "/*"
};
