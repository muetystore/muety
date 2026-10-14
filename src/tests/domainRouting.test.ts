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

    it('generates pre-launch store.muety.in URL for storefront', () => {
      setMockHostname('admin.muety.in');
      expect(getCanonicalStoreUrl('/')).toBe('https://store.muety.in/');
      expect(getCanonicalStoreUrl('/products')).toBe('https://store.muety.in/products');
    });
  });
});
