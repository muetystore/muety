/**
 * Netlify Edge Function: Post-Launch Domain Consolidation & Permanent Redirect
 *
 * Responsibilities:
 * 1. Checks incoming hostname. Only requests to the old apex domain (muety.in, www.muety.in)
 *    are candidates for consolidation. All other hosts (store.muety.in, admin.muety.in,
 *    deploy previews, localhost) pass through directly to avoid redirect loops and
 *    preserve domain isolation.
 * 2. Evaluates the configured LAUNCH_DATE against current UTC timestamp.
 *    - Interprets ISO 8601 strings with timezone offsets (e.g., 2026-11-01T08:00:00+05:30).
 *    - Before launch (Date.now() < launchTimestamp): passes through (context.next()) to serve
 *      the launch countdown page and assets.
 *    - At or after launch (Date.now() >= launchTimestamp): returns HTTP 301 Permanent Redirect
 *      to the corresponding destination on store.muety.in.
 * 3. Preserves path, query parameters, and URL-encoded characters.
 * 4. Fails safely on missing or invalid launch date by keeping the launch page accessible
 *    and logging a descriptive error.
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
 * Checks if the hostname is the old primary apex domain (muety.in / www.muety.in).
 * Strips port numbers if present.
 */
export function isRedirectableApexHost(hostname: string, requestHeaders?: Headers): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase().trim().split(':')[0];
  if (host === 'muety.in' || host === 'www.muety.in') {
    return true;
  }
  // Allow test header in non-production / test runner environments
  if (requestHeaders) {
    const testHost = requestHeaders.get('x-muety-test-host');
    if (testHost && (testHost === 'muety.in' || testHost === 'www.muety.in')) {
      return true;
    }
  }
  return false;
}

/**
 * Retrieves the configured launch date from runtime environment or build configuration.
 */
export function resolveLaunchDate(): string | undefined {
  // 1. Netlify Edge runtime environment
  if (typeof Netlify !== 'undefined' && (Netlify as any).env?.get) {
    const netlifyEnv = (Netlify as any).env.get('LAUNCH_DATE') || (Netlify as any).env.get('VITE_LAUNCH_DATE');
    if (netlifyEnv) return netlifyEnv;
  }
  // 2. Deno runtime environment
  if (typeof Deno !== 'undefined' && (Deno as any).env?.get) {
    const denoEnv = (Deno as any).env.get('LAUNCH_DATE') || (Deno as any).env.get('VITE_LAUNCH_DATE');
    if (denoEnv) return denoEnv;
  }
  // 3. Node/Process runtime environment (unit testing)
  if (typeof process !== 'undefined' && process.env) {
    const procEnv = process.env.LAUNCH_DATE || process.env.VITE_LAUNCH_DATE;
    if (procEnv) return procEnv;
  }
  // 4. Build-time baked snapshot fallback
  return launchConfig?.launchDate;
}

/**
 * Retrieves the target storefront origin from environment or build configuration.
 */
export function resolveStoreOrigin(): string {
  let origin = 'https://store.muety.in';
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
}

/**
 * Checks for explicit live override flags (e.g. LAUNCH_STATUS=LIVE or MUETY_LAUNCH_MODE=force_live).
 */
export function isForcedLiveMode(): boolean {
  const checkVal = (v?: string | null) => {
    if (!v) return false;
    const clean = v.trim().toLowerCase();
    return clean === 'live' || clean === 'true' || clean === 'force_live';
  };
  if (typeof Netlify !== 'undefined' && (Netlify as any).env?.get) {
    if (checkVal((Netlify as any).env.get('LAUNCH_STATUS')) || checkVal((Netlify as any).env.get('LAUNCHED')) || checkVal((Netlify as any).env.get('MUETY_LAUNCH_MODE'))) {
      return true;
    }
  }
  if (typeof Deno !== 'undefined' && (Deno as any).env?.get) {
    if (checkVal((Deno as any).env.get('LAUNCH_STATUS')) || checkVal((Deno as any).env.get('LAUNCHED')) || checkVal((Deno as any).env.get('MUETY_LAUNCH_MODE'))) {
      return true;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    if (checkVal(process.env.LAUNCH_STATUS) || checkVal(process.env.LAUNCHED) || checkVal(process.env.MUETY_LAUNCH_MODE)) {
      return true;
    }
  }
  return false;
}

/**
 * Builds the exact storefront destination URL preserving path, query parameters,
 * and URL-encoded characters.
 */
export function buildRedirectUrl(requestUrl: string, storeOrigin: string = resolveStoreOrigin()): string {
  const parsed = new URL(requestUrl);
  const cleanOrigin = storeOrigin.replace(/\/+$/, '');

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
}

/**
 * Netlify Edge Function Default Handler
 */
export default async function handler(request: Request, context: EdgeContext): Promise<Response> {
  const url = new URL(request.url);

  // 1. Host Filter: Only handle apex domain requests (muety.in / www.muety.in)
  // Subdomains (store.muety.in, admin.muety.in) and deploy previews MUST NOT redirect.
  if (!isRedirectableApexHost(url.hostname, request.headers)) {
    return context.next();
  }

  // 2. Resolve configured launch date
  const launchDateStr = resolveLaunchDate();
  const launchEvaluation = isLaunchPassed(launchDateStr);

  // 3. Failsafe: If launch date is missing or invalid, do not redirect.
  // Log configuration error and let countdown page remain accessible.
  if (!launchEvaluation.isValid) {
    console.error(`[LaunchRedirect] Invalid or missing LAUNCH_DATE configuration ("${launchDateStr}"). Failsafe active: serving countdown page.`);
    return context.next();
  }

  // 4. Evaluation: Redirect only when current UTC time >= launch timestamp (or forced live)
  const isLive = launchEvaluation.isPassed || isForcedLiveMode();
  if (!isLive) {
    // Before launch: serve the existing countdown site normally
    return context.next();
  }

  // 5. Post-Launch: Return HTTP 301 Permanent Redirect to corresponding store.muety.in URL
  const destinationUrl = buildRedirectUrl(request.url);

  return new Response(null, {
    status: 301,
    headers: {
      Location: destinationUrl,
      'Cache-Control': 'public, max-age=86400',
      'X-Muety-Redirect': 'post-launch-consolidation'
    }
  });
}

export const config = {
  path: "/*"
};
