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

      setMockHostname('store.muety.in');
      expect(isAdminDomain()).toBe(false);
    });
  });

  describe('2. Storefront Domain Detection (isStoreDomain)', () => {
    it('identifies store.muety.in as storefront domain', () => {
      expect(isStoreDomain('store.muety.in')).toBe(true);
    });

    it('identifies www.store.muety.in as storefront domain', () => {
      expect(isStoreDomain('www.store.muety.in')).toBe(true);
    });

    it('rejects admin.muety.in from storefront classification', () => {
      expect(isStoreDomain('admin.muety.in')).toBe(false);
    });

    it('rejects apex muety.in before post-launch aliasing', () => {
      expect(isStoreDomain('muety.in')).toBe(false);
    });
  });

  describe('3. Apex Domain Detection (isApexDomain)', () => {
    it('identifies muety.in as apex countdown domain', () => {
      expect(isApexDomain('muety.in')).toBe(true);
    });

    it('identifies www.muety.in as apex countdown domain', () => {
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
      setMockHostname('store.muety.in');
      expect(getAdminPortalUrl('/admin/dashboard')).toBe('https://admin.muety.in/admin/dashboard');
      expect(getAdminPortalUrl('login')).toBe('https://admin.muety.in/login');
    });

    it('generates store.muety.in URL for storefront in production', () => {
      setMockHostname('admin.muety.in');
      expect(getCanonicalStoreUrl('/')).toBe('https://store.muety.in/');
      expect(getCanonicalStoreUrl('/products')).toBe('https://store.muety.in/products');
    });
  });

  describe('6. Multi-Domain Architecture Invariants (Validation Requirements)', () => {
    it('1. store.muety.in selects the storefront and is not categorized as admin', () => {
      expect(isStoreDomain('store.muety.in')).toBe(true);
      expect(isAdminDomain('store.muety.in')).toBe(false);
      expect(isApexDomain('store.muety.in')).toBe(false);
    });

    it('2. admin.muety.in selects the admin app and is not categorized as storefront', () => {
      expect(isAdminDomain('admin.muety.in')).toBe(true);
      expect(isStoreDomain('admin.muety.in')).toBe(false);
      expect(isApexDomain('admin.muety.in')).toBe(false);
    });

    it('3. /admin/dashboard works when formed for direct loading', () => {
      setMockHostname('store.muety.in');
      expect(getAdminPortalUrl('/admin/dashboard')).toBe('https://admin.muety.in/admin/dashboard');
    });

    it('4. muety.in and www.muety.in retain apex classification for countdown', () => {
      expect(isApexDomain('muety.in')).toBe(true);
      expect(isApexDomain('www.muety.in')).toBe(true);
      expect(isStoreDomain('muety.in')).toBe(false);
      expect(isAdminDomain('muety.in')).toBe(false);
    });

    it('5. storefront requests do not navigate to www.muety.in (shouldRedirectStoreToRoot is false)', () => {
      expect(shouldRedirectStoreToRoot()).toBe(false);
      setMockHostname('store.muety.in');
      expect(getCanonicalStoreUrl('/')).toBe('https://store.muety.in/');
      expect(getCanonicalStoreUrl('/products')).toBe('https://store.muety.in/products');
    });

    it('6. redirects configuration in public/_redirects and netlify.toml has 200 rewrites for admin and store', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const redirectsContent = fs.readFileSync(path.resolve(process.cwd(), 'public/_redirects'), 'utf8');
      const netlifyTomlContent = fs.readFileSync(path.resolve(process.cwd(), 'netlify.toml'), 'utf8');

      // Verify no permanent 301/302 redirects from store.muety.in to www.muety.in
      expect(redirectsContent).not.toMatch(/https:\/\/store\.muety\.in\/\*\s+https:\/\/www\.muety\.in/);
      expect(redirectsContent).not.toMatch(/https:\/\/store\.muety\.in\/\*\s+https:\/\/muety\.in/);

      // Verify 200 rewrites to /index.html for admin and store
      expect(redirectsContent).toContain('https://admin.muety.in/      /index.html                      200');
      expect(redirectsContent).toContain('https://admin.muety.in/*     /index.html                      200');
      expect(redirectsContent).toContain('https://store.muety.in/      /index.html                      200');
      expect(redirectsContent).toContain('https://store.muety.in/*     /index.html                      200');

      // Verify netlify.toml has mirrored 200 rewrites
      expect(netlifyTomlContent).toContain('from = "https://admin.muety.in/*"');
      expect(netlifyTomlContent).toContain('from = "https://store.muety.in/*"');
    });
  });
});
