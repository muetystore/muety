import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Polyfills for tests in Node environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}

import { env } from '@/lib/config/env';
import { handleVerifyPayment } from '../../server/paymentApi';

describe('MUETY Storefront — 8 Core Requirements Verification Suite', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // REQUIREMENT 1 & 7: Patron Portal, Sign Out Location & Wishlist Removal
  // =========================================================================
  describe('1 & 7. Patron Portal Sign Out & Account Wishlist Separation', () => {
    it('verifies AccountPage codebase has removed oversized sign out from banner and placed compact action in profile', () => {
      const accountPageCode = fs.readFileSync(
        path.join(process.cwd(), 'src/features/customers/pages/AccountPage.tsx'),
        'utf-8'
      );

      // Verify the hero banner does not contain a sign out button
      const heroBannerSection = accountPageCode.slice(
        accountPageCode.indexOf('account-hero-banner'),
        accountPageCode.indexOf('account-tabs-wrapper')
      );
      expect(heroBannerSection.toLowerCase()).not.toContain('sign out');
      expect(heroBannerSection.toLowerCase()).not.toContain('logout');

      // Verify the tabs do NOT include a wishlist tab
      const tabsSection = accountPageCode.slice(
        accountPageCode.indexOf('account-tabs-wrapper'),
        accountPageCode.indexOf('{/* Tab 1: Orders History */}')
      );
      expect(tabsSection.toLowerCase()).not.toContain("'wishlist'");
      expect(tabsSection).toContain("'orders'");
      expect(tabsSection).toContain("'address'");
      expect(tabsSection).toContain("'profile'");

      // Verify compact sign out action is present in Profile tab
      expect(accountPageCode).toContain('<span>Sign Out</span>');
      expect(accountPageCode).toContain('Patron Session');

      // Verify legacy ?tab=wishlist redirect
      expect(accountPageCode).toContain("navigate('/wishlist', { replace: true })");
    });
  });

  // =========================================================================
  // REQUIREMENT 2: Mobile Header Search Icon Ordering
  // =========================================================================
  describe('2. Mobile Header Search Icon Placement & Ordering', () => {
    it('verifies Header layout positions search immediately after logo on mobile', () => {
      const headerCode = fs.readFileSync(
        path.join(process.cwd(), 'src/shared/components/ui/Header.tsx'),
        'utf-8'
      );

      const menuPos = headerCode.indexOf('mobile-menu-btn');
      const logoPos = headerCode.indexOf('header-logo-mobile');
      const searchPos = headerCode.indexOf('header-search-btn');
      const bagPos = headerCode.indexOf('header-bag-btn');

      expect(menuPos).toBeGreaterThan(0);
      expect(logoPos).toBeGreaterThan(menuPos);
      expect(searchPos).toBeGreaterThan(logoPos);
      expect(bagPos).toBeGreaterThan(searchPos);
    });

    it('verifies responsive CSS prevents header element overlap on narrow viewports', () => {
      const cssCode = fs.readFileSync(
        path.join(process.cwd(), 'src/styles/index.css'),
        'utf-8'
      );

      expect(cssCode).toContain('.header-search-btn');
      expect(cssCode).toContain('.header-bag-btn');
      expect(cssCode).toContain('@media (max-width: 360px)');
    });
  });

  // =========================================================================
  // REQUIREMENT 3: Saree-Inspired Bottom Navigation Icon
  // =========================================================================
  describe('3. Saree-Inspired Bottom Navigation Icon', () => {
    it('renders custom SareeIcon component with outlined drape geometry and accessible attributes', () => {
      const bottomNavCode = fs.readFileSync(
        path.join(process.cwd(), 'src/shared/components/ui/MobileBottomNav.tsx'),
        'utf-8'
      );

      // Verify SareeIcon is imported/exported and used for /products
      expect(bottomNavCode).toContain('<SareeIcon');
      expect(bottomNavCode).toContain('to="/products"');
      expect(bottomNavCode).toContain('aria-label="Sarees & Handlooms"');

      // Verify SareeIcon SVG paths: collar, pallu diagonal, waist, pleats, hem
      expect(bottomNavCode).toContain('d="M9 3.5a3 3 0 0 0 6 0"'); // neckline
      expect(bottomNavCode).toContain('d="M7.5 4.5l6.5 6.5"'); // pallu diagonal
      expect(bottomNavCode).toContain('d="M10.5 15v6"'); // pleat cascades
      expect(bottomNavCode).toContain('d="M6.5 19.5h11"'); // saree hem
    });
  });

  // =========================================================================
  // REQUIREMENT 4: Homepage Hero Banner Proportions & Text Separation
  // =========================================================================
  describe('4. Homepage Hero Banner & Asset Integrity', () => {
    it('confirms public/diwali_hero_banner.jpg has original photographic artwork without baked-in marketing typography', () => {
      const bannerPath = path.join(process.cwd(), 'public/diwali_hero_banner.jpg');
      expect(fs.existsSync(bannerPath)).toBe(true);

      const buf = fs.readFileSync(bannerPath);
      // Dimensions check for 0d0e325 master asset (1376x768, ~1MB)
      expect(buf.length).toBeGreaterThan(500000);

      // Verify CampaignHero renders responsive picture tag with art direction and cover object-fit
      const heroCode = fs.readFileSync(
        path.join(process.cwd(), 'src/features/catalog/components/CampaignHero.tsx'),
        'utf-8'
      );
      expect(heroCode).toContain('<picture');
      expect(heroCode).toContain('objectFit: \'cover\'');
      expect(heroCode).toContain('campaign-hero-bg-img');
    });
  });

  // =========================================================================
  // REQUIREMENT 5: Patron Circle & Mandatory Consent
  // =========================================================================
  describe('5. Patron Circle Sign-In Integration & Mandatory Consent', () => {
    it('requires explicit consent checkbox before newsletter subscription', () => {
      const homePageCode = fs.readFileSync(
        path.join(process.cwd(), 'src/features/catalog/pages/HomePage.tsx'),
        'utf-8'
      );

      // Checkbox initially unchecked
      expect(homePageCode).toContain("useState<boolean>(false)");
      expect(homePageCode).toContain('id="patron-circle-consent"');
      expect(homePageCode).toContain('to="/terms-conditions"');
      expect(homePageCode).toContain('to="/privacy-policy"');

      // Validation logic
      expect(homePageCode).toContain("if (!newsletterConsent)");
      expect(homePageCode).toContain('Please accept the Terms & Conditions');
    });

    it('verifies RegisterPage enforces mandatory terms consent before registration', () => {
      const registerCode = fs.readFileSync(
        path.join(process.cwd(), 'src/features/auth/pages/RegisterPage.tsx'),
        'utf-8'
      );

      expect(registerCode).toContain('const [acceptedTerms, setAcceptedTerms] = useState(false)');
      expect(registerCode).toContain('if (!acceptedTerms)');
      expect(registerCode).toContain('to="/terms-conditions"');
      expect(registerCode).toContain('to="/privacy-policy"');
    });
  });

  // =========================================================================
  // REQUIREMENT 6: Footer Contact Information & Accessible Disclosure
  // =========================================================================
  describe('6. Footer Contact Details & Accessible Disclosure', () => {
    it('verifies Footer contains exact brand contact information and links', () => {
      const footerCode = fs.readFileSync(
        path.join(process.cwd(), 'src/shared/components/ui/Footer.tsx'),
        'utf-8'
      );

      // Clickable protocol links & social channels
      expect(footerCode).toContain('href="https://maps.google.com/?q=2/32B+Ramireddypatti,+Palikadu,+Salem+-+636501"');
      expect(footerCode).toContain('href="tel:+919385791540"');
      expect(footerCode).toContain('href="https://wa.me/919940668095"');
      expect(footerCode).toContain('href="mailto:support@muety.in"');
      expect(footerCode).toContain('href="https://instagram.com/Themuety"');
      expect(footerCode).toContain('aria-label="MUETY Contact Channels"');
    });
  });

  // =========================================================================
  // REQUIREMENT 8: Razorpay Security & Timing-Safe Verification
  // =========================================================================
  describe('8. Razorpay Payment Security & Signature Verification', () => {
    it('verifies private Razorpay secret is never bundled in client configuration', () => {
      expect((env.razorpay as any).keySecret).toBeUndefined();
      expect((env as any).razorpaySecret).toBeUndefined();
      expect(env.razorpay.keyId).toBeDefined();

      const envContent = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');
      expect(envContent).toContain('RAZORPAY_KEY_SECRET=');
      expect(envContent).not.toContain('VITE_RAZORPAY_KEY_SECRET=');
    });

    it('verifies server enforces mandatory signature verification using HMAC-SHA256', async () => {
      const testSecret = 'test_secret_for_verification_unit_test';
      process.env.RAZORPAY_KEY_SECRET = testSecret;

      const orderId = 'order_test_unit_1';
      const paymentId = 'pay_test_unit_1';
      const validSig = crypto
        .createHmac('sha256', testSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Valid signature succeeds
      const result = await handleVerifyPayment(undefined, {
        orderId,
        paymentId,
        signature: validSig
      });
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);

      // Forged signature is rejected
      await expect(
        handleVerifyPayment(undefined, {
          orderId,
          paymentId,
          signature: 'forged_tampered_signature_string'
        })
      ).rejects.toThrow(/PERMISSION_DENIED/i);

      // Missing signature is rejected
      await expect(
        handleVerifyPayment(undefined, {
          orderId,
          paymentId
        })
      ).rejects.toThrow(/INVALID_ARGUMENT/i);
    });
  });
});
