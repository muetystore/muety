import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import edgeHandler, {
  isRedirectableApexHost,
  resolveLaunchDate,
  resolveStoreOrigin,
  isLaunchPassed,
  isForcedLiveMode,
  buildRedirectUrl
} from '../../netlify/edge-functions/launch-redirect.ts';

describe('Post-Launch Domain Consolidation & Permanent Redirect Suite', () => {
  const rootDir = process.cwd();
  const OFFICIAL_TEST_LAUNCH_DATE = '2026-11-01T08:00:00+05:30';
  const OFFICIAL_TEST_TIMESTAMP = new Date(OFFICIAL_TEST_LAUNCH_DATE).getTime();

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.LAUNCH_DATE = OFFICIAL_TEST_LAUNCH_DATE;
    process.env.STORE_URL = 'https://store.muety.in';
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
        return new Response('Countdown Website Body', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      }),
      isNextCalled: () => nextCalled
    };
    return context;
  };

  describe('1. ISO 8601 Timezone Offset Parsing & Launch Activation Calculation', () => {
    it('correctly interprets ISO 8601 timezone offsets (+05:30 IST) against UTC timestamp', () => {
      const evaluation = isLaunchPassed(OFFICIAL_TEST_LAUNCH_DATE, OFFICIAL_TEST_TIMESTAMP);
      expect(evaluation.isValid).toBe(true);
      expect(evaluation.timestamp).toBe(OFFICIAL_TEST_TIMESTAMP);

      // 1 ms before launch: not passed
      const beforeEval = isLaunchPassed(OFFICIAL_TEST_LAUNCH_DATE, OFFICIAL_TEST_TIMESTAMP - 1);
      expect(beforeEval.isPassed).toBe(false);

      // Exact moment of launch: passed
      const exactEval = isLaunchPassed(OFFICIAL_TEST_LAUNCH_DATE, OFFICIAL_TEST_TIMESTAMP);
      expect(exactEval.isPassed).toBe(true);

      // 1 ms after launch: passed
      const afterEval = isLaunchPassed(OFFICIAL_TEST_LAUNCH_DATE, OFFICIAL_TEST_TIMESTAMP + 1);
      expect(afterEval.isPassed).toBe(true);
    });

    it('correctly compares UTC representation against UTC Z timestamp', () => {
      // 2026-11-01T08:00:00+05:30 is 2026-11-01T02:30:00.000Z in UTC
      const utcIso = '2026-11-01T02:30:00.000Z';
      const evalIst = isLaunchPassed(OFFICIAL_TEST_LAUNCH_DATE, OFFICIAL_TEST_TIMESTAMP);
      const evalUtc = isLaunchPassed(utcIso, OFFICIAL_TEST_TIMESTAMP);
      expect(evalIst.timestamp).toBe(evalUtc.timestamp);
    });

    it('fails safely when LAUNCH_DATE is missing, empty, or invalid', () => {
      const emptyEval = isLaunchPassed('');
      expect(emptyEval.isValid).toBe(false);
      expect(emptyEval.isPassed).toBe(false);

      const nullEval = isLaunchPassed(undefined);
      expect(nullEval.isValid).toBe(false);

      const invalidEval = isLaunchPassed('invalid-date-string');
      expect(invalidEval.isValid).toBe(false);
      expect(isNaN(invalidEval.timestamp)).toBe(true);
    });
  });

  describe('2. Host Filtering & Redirect Loop Prevention', () => {
    it('identifies muety.in and www.muety.in as candidate apex domains', () => {
      expect(isRedirectableApexHost('muety.in')).toBe(true);
      expect(isRedirectableApexHost('www.muety.in')).toBe(true);
      expect(isRedirectableApexHost('MUETY.IN')).toBe(true);
      expect(isRedirectableApexHost('muety.in:443')).toBe(true);
    });

    it('rejects store.muety.in from being redirected (prevents redirect loop)', () => {
      expect(isRedirectableApexHost('store.muety.in')).toBe(false);
      expect(isRedirectableApexHost('www.store.muety.in')).toBe(false);
    });

    it('rejects admin.muety.in from apex consolidation', () => {
      expect(isRedirectableApexHost('admin.muety.in')).toBe(false);
      expect(isRedirectableApexHost('www.admin.muety.in')).toBe(false);
    });

    it('rejects deploy previews and localhost', () => {
      expect(isRedirectableApexHost('deploy-preview-123--muetystore.netlify.app')).toBe(false);
      expect(isRedirectableApexHost('muetystore.netlify.app')).toBe(false);
      expect(isRedirectableApexHost('localhost')).toBe(false);
      expect(isRedirectableApexHost('127.0.0.1')).toBe(false);
    });
  });

  describe('3. URL & Query Parameter Preservation (buildRedirectUrl)', () => {
    it('redirects apex root (https://muety.in) to storefront homepage without trailing slash', () => {
      expect(buildRedirectUrl('https://muety.in')).toBe('https://store.muety.in');
      expect(buildRedirectUrl('https://muety.in/')).toBe('https://store.muety.in');
      expect(buildRedirectUrl('https://www.muety.in')).toBe('https://store.muety.in');
      expect(buildRedirectUrl('https://www.muety.in/')).toBe('https://store.muety.in');
    });

    it('preserves query parameters on root (e.g. utm_source, ref)', () => {
      expect(buildRedirectUrl('https://muety.in/?utm_source=instagram&ref=promo'))
        .toBe('https://store.muety.in/?utm_source=instagram&ref=promo');
      expect(buildRedirectUrl('https://www.muety.in/?aff=102'))
        .toBe('https://store.muety.in/?aff=102');
    });

    it('preserves product URLs exactly', () => {
      expect(buildRedirectUrl('https://muety.in/product/saree-01'))
        .toBe('https://store.muety.in/product/saree-01');
      expect(buildRedirectUrl('https://muety.in/product/kanchipuram?variant=123'))
        .toBe('https://store.muety.in/product/kanchipuram?variant=123');
    });

    it('preserves collection, category, and static page paths', () => {
      expect(buildRedirectUrl('https://muety.in/collections/silk'))
        .toBe('https://store.muety.in/collections/silk');
      expect(buildRedirectUrl('https://muety.in/categories/bridal'))
        .toBe('https://store.muety.in/categories/bridal');
      expect(buildRedirectUrl('https://muety.in/about'))
        .toBe('https://store.muety.in/about');
      expect(buildRedirectUrl('https://muety.in/contact'))
        .toBe('https://store.muety.in/contact');
    });

    it('preserves cart and checkout routes', () => {
      expect(buildRedirectUrl('https://muety.in/cart'))
        .toBe('https://store.muety.in/cart');
      expect(buildRedirectUrl('https://muety.in/checkout'))
        .toBe('https://store.muety.in/checkout');
    });

    it('preserves search query parameters and pagination', () => {
      expect(buildRedirectUrl('https://muety.in/search?q=silk&page=2'))
        .toBe('https://store.muety.in/search?q=silk&page=2');
      expect(buildRedirectUrl('https://muety.in/products?sort=price_desc&category=silk'))
        .toBe('https://store.muety.in/products?sort=price_desc&category=silk');
    });

    it('preserves URL-encoded characters in paths and query strings', () => {
      expect(buildRedirectUrl('https://muety.in/product/kanchipuram%20silk?color=red%20gold&tag=pure%20zari'))
        .toBe('https://store.muety.in/product/kanchipuram%20silk?color=red%20gold&tag=pure%20zari');
    });

    it('preserves unknown paths without forcing them to the homepage', () => {
      expect(buildRedirectUrl('https://muety.in/custom/deep/unknown/path?test=1'))
        .toBe('https://store.muety.in/custom/deep/unknown/path?test=1');
    });
  });

  describe('4. Edge Function Request Routing Scenarios', () => {
    describe('Before Launch Scenarios', () => {
      beforeEach(() => {
        // Mock current time to 1 hour BEFORE launch
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP - 3600000);
      });

      it('serves countdown page (calls context.next()) on muety.in homepage', async () => {
        const req = new Request('https://muety.in/');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });

      it('does not redirect muety.in/product/test prematurely', async () => {
        const req = new Request('https://muety.in/product/test');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });

      it('serves countdown and legal documents normally', async () => {
        const req = new Request('https://muety.in/countdown.html');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });

      it('leaves store.muety.in independently accessible', async () => {
        const req = new Request('https://store.muety.in/');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });
    });

    describe('At & After Launch Scenarios', () => {
      it('activates redirect at the exact configured launch timestamp', async () => {
        // Exact moment
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP);

        const req = new Request('https://muety.in/');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(false);
        expect(res.status).toBe(301);
        expect(res.headers.get('Location')).toBe('https://store.muety.in');
        expect(res.headers.get('X-Muety-Redirect')).toBe('post-launch-consolidation');
      });

      it('returns HTTP 301 and preserves product path after launch', async () => {
        // 1 hour after launch
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP + 3600000);

        const req = new Request('https://muety.in/product/saree-01');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(false);
        expect(res.status).toBe(301);
        expect(res.headers.get('Location')).toBe('https://store.muety.in/product/saree-01');
      });

      it('returns HTTP 301 and preserves query strings after launch', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP + 10000);

        const req = new Request('https://muety.in/search?q=silk&page=2');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(res.status).toBe(301);
        expect(res.headers.get('Location')).toBe('https://store.muety.in/search?q=silk&page=2');
      });

      it('returns HTTP 301 for cart and checkout', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP + 10000);

        const reqCart = new Request('https://muety.in/cart');
        const ctxCart = createMockContext();
        const resCart = await edgeHandler(reqCart, ctxCart as any);
        expect(resCart.status).toBe(301);
        expect(resCart.headers.get('Location')).toBe('https://store.muety.in/cart');

        const reqCheckout = new Request('https://muety.in/checkout');
        const ctxCheckout = createMockContext();
        const resCheckout = await edgeHandler(reqCheckout, ctxCheckout as any);
        expect(resCheckout.status).toBe(301);
        expect(resCheckout.headers.get('Location')).toBe('https://store.muety.in/checkout');
      });

      it('returns HTTP 301 for www.muety.in and maps to store.muety.in', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP + 5000);

        const req = new Request('https://www.muety.in/collections/bridal');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(res.status).toBe(301);
        expect(res.headers.get('Location')).toBe('https://store.muety.in/collections/bridal');
      });

      it('never redirects store.muety.in even after launch (prevents loops)', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP + 500000);

        const req = new Request('https://store.muety.in/product/saree-01');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });

      it('never redirects admin.muety.in', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP + 500000);

        const req = new Request('https://admin.muety.in/dashboard');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });

      it('never redirects Netlify deploy previews', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(OFFICIAL_TEST_TIMESTAMP + 500000);

        const req = new Request('https://deploy-preview-99--muetystore.netlify.app/product/saree-01');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });
    });

    describe('Fail-Safe & Misconfiguration Behavior', () => {
      it('fails safely by passing through to countdown page when LAUNCH_DATE is missing', async () => {
        delete process.env.LAUNCH_DATE;
        delete process.env.VITE_LAUNCH_DATE;
        // Mock resolveLaunchDate returning undefined
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Set an invalid string in env
        process.env.LAUNCH_DATE = '';

        const req = new Request('https://muety.in/');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
      });

      it('fails safely by passing through when LAUNCH_DATE is malformed', async () => {
        process.env.LAUNCH_DATE = 'not-a-valid-date';
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const req = new Request('https://muety.in/product/saree-01');
        const ctx = createMockContext();

        const res = await edgeHandler(req, ctx as any);
        expect(ctx.isNextCalled()).toBe(true);
        expect(res.status).toBe(200);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
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

    it('verifies public/robots.txt points to store.muety.in sitemap', () => {
      const robotsTxt = fs.readFileSync(path.join(rootDir, 'public', 'robots.txt'), 'utf8');
      expect(robotsTxt).toContain('Sitemap: https://store.muety.in/sitemap.xml');
      expect(robotsTxt).not.toContain('https://www.muety.in/sitemap.xml');
    });

    it('verifies public/sitemap.xml has all URLs updated to store.muety.in', () => {
      const sitemapXml = fs.readFileSync(path.join(rootDir, 'public', 'sitemap.xml'), 'utf8');
      expect(sitemapXml).toContain('https://store.muety.in/');
      expect(sitemapXml).toContain('https://store.muety.in/products');
      expect(sitemapXml).toContain('https://store.muety.in/categories');
      expect(sitemapXml).toContain('https://store.muety.in/about');
      expect(sitemapXml).toContain('https://store.muety.in/contact');
      expect(sitemapXml).not.toContain('https://www.muety.in');
    });

    it('verifies index.html specifies canonical link to store.muety.in', () => {
      const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
      expect(indexHtml).toContain('<link rel="canonical" href="https://store.muety.in" />');
    });
  });
});

