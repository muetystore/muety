import { describe, it, expect, afterEach } from 'vitest';
import {
  isAdminDomain,
  isStoreDomain,
  isApexDomain,
  isLocalOrDev,
  shouldRedirectStoreToRoot,
  getCanonicalStoreUrl,
  getAdminPortalUrl
} from '@/shared/utils/domainRouting';

if (typeof (global as any).window === 'undefined') {
  (global as any).window = {
    location: { hostname: 'localhost', pathname: '/', search: '' }
  };
}

describe('Domain & Subdomain Routing Utilities Suite', () => {
  const setMockHostname = (hostname: string) => {
    (global as any).window.location = {
      hostname,
      pathname: '/',
      search: ''
    };
  };

  afterEach(() => {
    setMockHostname('localhost');
  });

  describe('1. Admin Domain Detection (isAdminDomain)', () => {
    it('identifies admin.muety.in as admin domain', () => {
      expect(isAdminDomain('admin.muety.in')).toBe(true);
    });

    it('identifies www.admin.muety.in as admin domain', () => {
      expect(isAdminDomain('www.admin.muety.in')).toBe(true);
    });

    it('identifies dev admin subdomain as admin domain', () => {
      expect(isAdminDomain('admin.localhost')).toBe(true);
    });

    it('rejects store.muety.in from being identified as admin', () => {
      expect(isAdminDomain('store.muety.in')).toBe(false);
    });

    it('rejects muety.in apex domain from being identified as admin', () => {
      expect(isAdminDomain('muety.in')).toBe(false);
    });

    it('rejects plain localhost from being identified as admin', () => {
      expect(isAdminDomain('localhost')).toBe(false);
    });

    it('uses window.location when no argument is passed', () => {
      setMockHostname('admin.muety.in');
      expect(isAdminDomain()).toBe(true);

      setMockHostname('muety.in');
      expect(isAdminDomain()).toBe(false);
    });
  });

  describe('2. Storefront Domain Detection (isStoreDomain)', () => {
    it('identifies muety.in as primary storefront domain', () => {
      expect(isStoreDomain('muety.in')).toBe(true);
    });

    it('identifies www.muety.in as primary storefront domain', () => {
      expect(isStoreDomain('www.muety.in')).toBe(true);
    });

    it('identifies store.muety.in as legacy store domain', () => {
      expect(isStoreDomain('store.muety.in')).toBe(true);
    });

    it('rejects admin.muety.in from storefront classification', () => {
      expect(isStoreDomain('admin.muety.in')).toBe(false);
    });
  });

  describe('3. Apex Domain Detection (isApexDomain)', () => {
    it('identifies muety.in as apex domain', () => {
      expect(isApexDomain('muety.in')).toBe(true);
    });

    it('identifies www.muety.in as apex domain', () => {
      expect(isApexDomain('www.muety.in')).toBe(true);
    });

    it('rejects subdomains from apex classification', () => {
      expect(isApexDomain('store.muety.in')).toBe(false);
      expect(isApexDomain('admin.muety.in')).toBe(false);
    });
  });

  describe('4. Local / Dev Environment Detection (isLocalOrDev)', () => {
    it('identifies localhost and 127.0.0.1 as local dev', () => {
      expect(isLocalOrDev('localhost')).toBe(true);
      expect(isLocalOrDev('127.0.0.1')).toBe(true);
    });

    it('rejects production subdomains from dev classification', () => {
      expect(isLocalOrDev('admin.muety.in')).toBe(false);
      expect(isLocalOrDev('store.muety.in')).toBe(false);
      expect(isLocalOrDev('muety.in')).toBe(false);
    });
  });

  describe('5. Canonical URL Generators', () => {
    it('generates relative URLs when on localhost', () => {
      setMockHostname('localhost');
      expect(getCanonicalStoreUrl('/')).toBe('/');
      expect(getCanonicalStoreUrl('/products')).toBe('/products');
      expect(getAdminPortalUrl('/admin/dashboard')).toBe('/admin/dashboard');
    });

    it('generates absolute admin.muety.in URLs in production', () => {
      setMockHostname('muety.in');
      expect(getAdminPortalUrl('/admin/dashboard')).toBe('https://admin.muety.in/admin/dashboard');
      expect(getAdminPortalUrl('login')).toBe('https://admin.muety.in/login');
    });

    it('generates muety.in URL for storefront in production', () => {
      setMockHostname('admin.muety.in');
      expect(getCanonicalStoreUrl('/')).toBe('https://muety.in/');
      expect(getCanonicalStoreUrl('/products')).toBe('https://muety.in/products');
    });
  });

  describe('6. Multi-Domain Architecture Invariants (Validation Requirements)', () => {
    it('1. muety.in serves the storefront and is not categorized as admin', () => {
      expect(isStoreDomain('muety.in')).toBe(true);
      expect(isAdminDomain('muety.in')).toBe(false);
      expect(isApexDomain('muety.in')).toBe(true);
    });

    it('2. admin.muety.in selects the admin app and is not categorized as storefront', () => {
      expect(isAdminDomain('admin.muety.in')).toBe(true);
      expect(isStoreDomain('admin.muety.in')).toBe(false);
      expect(isApexDomain('admin.muety.in')).toBe(false);
    });

    it('3. /admin/dashboard works when formed for direct loading', () => {
      setMockHostname('muety.in');
      expect(getAdminPortalUrl('/admin/dashboard')).toBe('https://admin.muety.in/admin/dashboard');
    });

    it('4. legacy store.muety.in triggers redirect to root (shouldRedirectStoreToRoot is true)', () => {
      expect(shouldRedirectStoreToRoot('store.muety.in')).toBe(true);
      expect(shouldRedirectStoreToRoot('www.store.muety.in')).toBe(true);
      expect(shouldRedirectStoreToRoot('muety.in')).toBe(false);
      setMockHostname('muety.in');
      expect(getCanonicalStoreUrl('/')).toBe('https://muety.in/');
      expect(getCanonicalStoreUrl('/products')).toBe('https://muety.in/products');
    });

    it('5. redirects configuration in public/_redirects and netlify.toml routes muety.in to /index.html and redirects store.muety.in', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const redirectsContent = fs.readFileSync(path.resolve(process.cwd(), 'public/_redirects'), 'utf8');
      const netlifyTomlContent = fs.readFileSync(path.resolve(process.cwd(), 'netlify.toml'), 'utf8');

      // Verify permanent 301 redirect from store.muety.in to muety.in
      expect(redirectsContent).toContain('https://store.muety.in/*     https://muety.in/:splat          301!');
      expect(netlifyTomlContent).toContain('from = "https://store.muety.in/*"');
      expect(netlifyTomlContent).toContain('to = "https://muety.in/:splat"');
      expect(netlifyTomlContent).toContain('status = 301');

      // Verify 200 rewrites to /index.html for admin and muety.in
      expect(redirectsContent).toContain('https://admin.muety.in/      /index.html                      200');
      expect(redirectsContent).toContain('https://admin.muety.in/*     /index.html                      200');
      expect(redirectsContent).toContain('https://muety.in/            /index.html                      200');
      expect(redirectsContent).toContain('https://muety.in/*           /index.html                      200');

      // Verify netlify.toml has mirrored 200 rewrites
      expect(netlifyTomlContent).toContain('from = "https://admin.muety.in/*"');
      expect(netlifyTomlContent).toContain('from = "https://muety.in/*"');
    });
  });
});
