import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import edgeHandler, {
  isLegacyStoreHost,
  resolveLaunchDate,
  resolveStoreOrigin,
  isLaunchPassed,
  isForcedLiveMode,
  buildRedirectUrl
} from '../../netlify/edge-functions/launch-redirect.ts';

describe('Legacy Store Subdomain Consolidation & Permanent Redirect Suite', () => {
  const rootDir = process.cwd();
  const OFFICIAL_TEST_LAUNCH_DATE = '2026-11-01T08:00:00+05:30';
  const OFFICIAL_TEST_TIMESTAMP = new Date(OFFICIAL_TEST_LAUNCH_DATE).getTime();

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.LAUNCH_DATE = OFFICIAL_TEST_LAUNCH_DATE;
    process.env.STORE_URL = 'https://muety.in';
    delete process.env.LAUNCH_STATUS;
    delete process.env.LAUNCHED;
    delete process.env.MUETY_LAUNCH_MODE;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // Mock Edge Context helper
  const createMockContext = () => {
    let nextCalled = false;
    const context = {
      next: vi.fn(async () => {
        nextCalled = true;
        return new Response('Storefront Website Body', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      }),
      isNextCalled: () => nextCalled
    };
    return context;
  };

  describe('1. Store Origin & Launch Activation Resolution', () => {
    it('resolves primary storefront domain to https://muety.in', () => {
      expect(resolveStoreOrigin()).toBe('https://muety.in');
    });

    it('correctly interprets ISO 8601 timestamps', () => {
      const evaluation = isLaunchPassed(OFFICIAL_TEST_LAUNCH_DATE, OFFICIAL_TEST_TIMESTAMP);
      expect(evaluation.isValid).toBe(true);
      expect(evaluation.isPassed).toBe(true);
    });

    it('returns forced live mode as active for production store', () => {
      expect(isForcedLiveMode()).toBe(true);
    });
  });

  describe('2. Legacy Store Host Filtering & Redirect Loop Prevention', () => {
    it('identifies store.muety.in and www.store.muety.in as legacy domains requiring redirect', () => {
      expect(isLegacyStoreHost('store.muety.in')).toBe(true);
      expect(isLegacyStoreHost('www.store.muety.in')).toBe(true);
      expect(isLegacyStoreHost('STORE.MUETY.IN')).toBe(true);
      expect(isLegacyStoreHost('store.muety.in:443')).toBe(true);
    });

    it('rejects muety.in apex from being redirected (serves storefront directly)', () => {
      expect(isLegacyStoreHost('muety.in')).toBe(false);
      expect(isLegacyStoreHost('www.muety.in')).toBe(false);
    });

    it('rejects admin.muety.in from being redirected to store', () => {
      expect(isLegacyStoreHost('admin.muety.in')).toBe(false);
      expect(isLegacyStoreHost('www.admin.muety.in')).toBe(false);
    });

    it('rejects deploy previews and localhost', () => {
      expect(isLegacyStoreHost('deploy-preview-123--muetystore.netlify.app')).toBe(false);
      expect(isLegacyStoreHost('muetystore.netlify.app')).toBe(false);
      expect(isLegacyStoreHost('localhost')).toBe(false);
      expect(isLegacyStoreHost('127.0.0.1')).toBe(false);
    });
  });

  describe('3. URL & Query Parameter Preservation (buildRedirectUrl)', () => {
    it('redirects legacy store root (https://store.muety.in) to primary apex without trailing slash', () => {
      expect(buildRedirectUrl('https://store.muety.in')).toBe('https://muety.in');
      expect(buildRedirectUrl('https://store.muety.in/')).toBe('https://muety.in');
      expect(buildRedirectUrl('https://www.store.muety.in')).toBe('https://muety.in');
      expect(buildRedirectUrl('https://www.store.muety.in/')).toBe('https://muety.in');
    });

    it('preserves query parameters on root (e.g. utm_source, ref)', () => {
      expect(buildRedirectUrl('https://store.muety.in/?utm_source=instagram&ref=promo'))
        .toBe('https://muety.in/?utm_source=instagram&ref=promo');
      expect(buildRedirectUrl('https://www.store.muety.in/?aff=102'))
        .toBe('https://muety.in/?aff=102');
    });

    it('preserves product URLs exactly', () => {
      expect(buildRedirectUrl('https://store.muety.in/product/saree-01'))
        .toBe('https://muety.in/product/saree-01');
      expect(buildRedirectUrl('https://store.muety.in/product/kanchipuram?variant=123'))
        .toBe('https://muety.in/product/kanchipuram?variant=123');
    });

    it('preserves collection, category, and static page paths', () => {
      expect(buildRedirectUrl('https://store.muety.in/collections/silk'))
        .toBe('https://muety.in/collections/silk');
      expect(buildRedirectUrl('https://store.muety.in/categories/bridal'))
        .toBe('https://muety.in/categories/bridal');
      expect(buildRedirectUrl('https://store.muety.in/about'))
        .toBe('https://muety.in/about');
      expect(buildRedirectUrl('https://store.muety.in/contact'))
        .toBe('https://muety.in/contact');
    });

    it('preserves cart and checkout routes', () => {
      expect(buildRedirectUrl('https://store.muety.in/cart'))
        .toBe('https://muety.in/cart');
      expect(buildRedirectUrl('https://store.muety.in/checkout'))
        .toBe('https://muety.in/checkout');
    });

    it('preserves search query parameters and pagination', () => {
      expect(buildRedirectUrl('https://store.muety.in/search?q=silk&page=2'))
        .toBe('https://muety.in/search?q=silk&page=2');
      expect(buildRedirectUrl('https://store.muety.in/products?sort=price_desc&category=silk'))
        .toBe('https://muety.in/products?sort=price_desc&category=silk');
    });

    it('preserves URL-encoded characters in paths and query strings', () => {
      expect(buildRedirectUrl('https://store.muety.in/product/kanchipuram%20silk?color=red%20gold&tag=pure%20zari'))
        .toBe('https://muety.in/product/kanchipuram%20silk?color=red%20gold&tag=pure%20zari');
    });
  });

  describe('4. Edge Function Request Routing Scenarios', () => {
    it('serves primary storefront directly (calls context.next()) on muety.in', async () => {
      const req = new Request('https://muety.in/');
      const ctx = createMockContext();

      const res = await edgeHandler(req, ctx as any);
      expect(ctx.isNextCalled()).toBe(true);
      expect(res.status).toBe(200);
    });

    it('serves product page directly on muety.in/products', async () => {
      const req = new Request('https://muety.in/products');
      const ctx = createMockContext();

      const res = await edgeHandler(req, ctx as any);
      expect(ctx.isNextCalled()).toBe(true);
      expect(res.status).toBe(200);
    });

    it('serves admin.muety.in directly without redirection', async () => {
      const req = new Request('https://admin.muety.in/dashboard');
      const ctx = createMockContext();

      const res = await edgeHandler(req, ctx as any);
      expect(ctx.isNextCalled()).toBe(true);
      expect(res.status).toBe(200);
    });

    it('returns HTTP 301 Permanent Redirect when request arrives at store.muety.in', async () => {
      const req = new Request('https://store.muety.in/products/saree-01');
      const ctx = createMockContext();

      const res = await edgeHandler(req, ctx as any);
      expect(ctx.isNextCalled()).toBe(false);
      expect(res.status).toBe(301);
      expect(res.headers.get('Location')).toBe('https://muety.in/products/saree-01');
      expect(res.headers.get('X-Muety-Redirect')).toBe('legacy-store-to-apex-storefront');
    });

    it('returns HTTP 301 Permanent Redirect for www.store.muety.in root', async () => {
      const req = new Request('https://www.store.muety.in/?utm_source=instagram');
      const ctx = createMockContext();

      const res = await edgeHandler(req, ctx as any);
      expect(ctx.isNextCalled()).toBe(false);
      expect(res.status).toBe(301);
      expect(res.headers.get('Location')).toBe('https://muety.in/?utm_source=instagram');
    });
  });

  describe('5. Netlify Deployment Configuration & SEO Verification', () => {
    it('verifies netlify.toml configures edge_functions for launch-redirect on /*', () => {
      const netlifyToml = fs.readFileSync(path.join(rootDir, 'netlify.toml'), 'utf8');
      expect(netlifyToml).toContain('[[edge_functions]]');
      expect(netlifyToml).toContain('function = "launch-redirect"');
      expect(netlifyToml).toContain('path = "/*"');
    });

    it('verifies edge functions directory contains launch-redirect.ts and launch-config.ts', () => {
      const edgeDir = path.join(rootDir, 'netlify', 'edge-functions');
      expect(fs.existsSync(path.join(edgeDir, 'launch-redirect.ts'))).toBe(true);
      expect(fs.existsSync(path.join(edgeDir, 'launch-config.ts'))).toBe(true);
    });

    it('verifies public/robots.txt points to muety.in sitemap', () => {
      const robotsTxt = fs.readFileSync(path.join(rootDir, 'public', 'robots.txt'), 'utf8');
      expect(robotsTxt).toContain('Sitemap: https://muety.in/sitemap.xml');
      expect(robotsTxt).not.toContain('store.muety.in');
    });

    it('verifies public/sitemap.xml has all URLs updated to muety.in', () => {
      const sitemapXml = fs.readFileSync(path.join(rootDir, 'public', 'sitemap.xml'), 'utf8');
      expect(sitemapXml).toContain('https://muety.in/');
      expect(sitemapXml).toContain('https://muety.in/products');
      expect(sitemapXml).toContain('https://muety.in/categories');
      expect(sitemapXml).toContain('https://muety.in/about');
      expect(sitemapXml).toContain('https://muety.in/contact');
      expect(sitemapXml).not.toContain('store.muety.in');
    });

    it('verifies index.html specifies canonical link to muety.in', () => {
      const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
      expect(indexHtml).toContain('<link rel="canonical" href="https://muety.in" />');
      expect(indexHtml).not.toContain('<link rel="canonical" href="https://store.muety.in" />');
    });
  });
});
