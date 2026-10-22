import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Polyfills for tests in Node environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

(globalThis as any).localStorage = localStorageMock;
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: localStorageMock,
    dispatchEvent: () => true
  };
}

import { couponService } from '@/features/coupons/services/couponService';
import { storageService } from '@/lib/storage/storageService';
import { calculateOrderFinancials } from '@/shared/utils/pricingEngine';
import { Coupon } from '@/features/coupons/types';

describe('MUETY Storefront — 4 New Improvements Verification Suite', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. MOBILE NAVIGATION UI & CLOSE (X) BUTTON
  // =========================================================================
  describe('1. Mobile Navigation Drawer UI & Close Button', () => {
    const headerCode = fs.readFileSync(
      path.join(process.cwd(), 'src/shared/components/ui/Header.tsx'),
      'utf-8'
    );
    const cssCode = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/index.css'),
      'utf-8'
    );

    it('implements prominent close button inside mobile navigation drawer header', () => {
      expect(headerCode).toContain('className="mobile-nav-drawer"');
      expect(headerCode).toContain('className="mobile-nav-header"');
      expect(headerCode).toContain('className="mobile-nav-close-btn"');
      expect(headerCode).toContain('onClick={() => setMobileMenuOpen(false)}');
      expect(headerCode).toContain('aria-label="Close Store Navigation"');
    });

    it('enforces min 44x44px touch target on mobile close button', () => {
      expect(cssCode).toContain('.mobile-nav-close-btn');
      expect(cssCode).toContain('min-width: 44px');
      expect(cssCode).toContain('min-height: 44px');
    });

    it('locks background scrolling when mobile menu drawer is open', () => {
      expect(headerCode).toContain('mobileMenuOpen');
      expect(headerCode).toContain("document.body.style.overflow = 'hidden'");
    });

    it('provides semi-transparent backdrop with click-to-dismiss behavior', () => {
      expect(headerCode).toContain('className="mobile-nav-backdrop"');
      expect(cssCode).toContain('.mobile-nav-backdrop');
      expect(cssCode).toContain('backdrop-filter: blur(4px)');
      expect(cssCode).toContain('z-index: 99998');
    });

    it('clamps drawer height to viewport and enables independent scrolling', () => {
      expect(cssCode).toContain('.mobile-nav-drawer');
      expect(cssCode).toContain('max-height: 100dvh');
      expect(cssCode).toContain('.mobile-nav-body');
      expect(cssCode).toContain('overflow-y: auto');
      expect(cssCode).toContain('-webkit-overflow-scrolling: touch');
    });

    it('pads bottom of mobile drawer to prevent overlap with MobileBottomNav', () => {
      expect(cssCode).toContain('.mobile-nav-footer');
      expect(cssCode).toContain('padding-bottom: calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 62px)');
    });
  });

  // =========================================================================
  // 2. SWIPEABLE PRODUCT IMAGES ON PDP
  // =========================================================================
  describe('2. Swipeable Product Detail Gallery', () => {
    const pdpCode = fs.readFileSync(
      path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
      'utf-8'
    );
    const cssCode = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/index.css'),
      'utf-8'
    );

    it('implements touchstart, touchmove, and touchend handlers for gallery swiping', () => {
      expect(pdpCode).toContain('onTouchStart={handleGalleryTouchStart}');
      expect(pdpCode).toContain('onTouchMove={handleGalleryTouchMove}');
      expect(pdpCode).toContain('onTouchEnd={handleGalleryTouchEnd}');
      expect(pdpCode).toContain('onTouchCancel={handleGalleryTouchEnd}');
    });

    it('preserves native vertical scrolling via pan-y touch action', () => {
      expect(pdpCode).toContain("touchAction: 'pan-y'");
    });

    it('implements a responsive swipe threshold (45px) with edge clamping', () => {
      expect(pdpCode).toContain('const swipeThreshold = 45;');
      expect(pdpCode).toContain('selectedImage < galleryImages.length - 1');
      expect(pdpCode).toContain('selectedImage > 0');
    });

    it('provides accessible previous and next chevron navigation controls', () => {
      expect(pdpCode).toContain('pdp-gallery-nav-prev');
      expect(pdpCode).toContain('pdp-gallery-nav-next');
      expect(pdpCode).toContain('aria-label="Previous product image"');
      expect(pdpCode).toContain('aria-label="Next product image"');
      expect(cssCode).toContain('.pdp-gallery-nav-btn');
    });

    it('displays an image counter indicator badge (e.g. 1 / N)', () => {
      expect(pdpCode).toContain('pdp-gallery-counter-badge');
      expect(pdpCode).toContain('{selectedImage + 1} / {galleryImages.length}');
      expect(cssCode).toContain('.pdp-gallery-counter-badge');
    });
  });

  // =========================================================================
  // 3. HIDE SMALL BUY NOW ON PRODUCT LISTING CARDS
  // =========================================================================
  describe('3. Single Full-Width Action on Product Cards', () => {
    const cardCode = fs.readFileSync(
      path.join(process.cwd(), 'src/features/catalog/components/ProductCard.tsx'),
      'utf-8'
    );
    const pdpCode = fs.readFileSync(
      path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
      'utf-8'
    );

    it('removes secondary Buy Now button from ProductCard component', () => {
      expect(cardCode).not.toContain('product-card-btn-buy');
      expect(cardCode).not.toContain('handleBuyNow');
      expect(cardCode).not.toContain('Zap');
    });

    it('styles Add to Bag button as full width on product cards', () => {
      expect(cardCode).toContain('product-card-btn-add');
      expect(cardCode).toContain("width: '100%'");
      expect(cardCode).toContain("flex: 1");
    });

    it('retains both Add to Bag and Buy Now buttons on ProductDetailPage', () => {
      expect(pdpCode).toContain('pdp-add-to-bag-btn');
      expect(pdpCode).toContain('pdp-buy-now-btn');
      expect(pdpCode).toContain('Buy Now');
    });
  });

  // =========================================================================
  // 4. PROMO-CODE APPLICATION IN CHECKOUT
  // =========================================================================
  describe('4. Promo-Code Application and Synchronization in Checkout', () => {
    const checkoutCode = fs.readFileSync(
      path.join(process.cwd(), 'src/features/checkout/pages/CheckoutPage.tsx'),
      'utf-8'
    );

    it('renders collapsible "Have a promo code?" accordion collapsed by default', () => {
      expect(checkoutCode).toContain('const [isPromoExpanded, setIsPromoExpanded] = useState<boolean>(() => Boolean(appliedCoupon));');
      expect(checkoutCode).toContain('Have a promo code?');
      expect(checkoutCode).toContain('aria-expanded={isPromoExpanded}');
    });

    it('includes promo input field, apply button, and eligible offers list', () => {
      expect(checkoutCode).toContain('value={promoInputCode}');
      expect(checkoutCode).toContain('handleApplyPromoCode()');
      expect(checkoutCode).toContain('couponService.getAllCoupons');
      expect(checkoutCode).toContain('couponService.validateCoupon');
    });

    it('integrates with CartContext for global promo state synchronization', () => {
      expect(checkoutCode).toContain('appliedCoupon');
      expect(checkoutCode).toContain('applyCoupon');
      expect(checkoutCode).toContain('removeCoupon');
    });

    it('displays applied coupon badge, savings amount, and remove button', () => {
      expect(checkoutCode).toContain('Applied');
      expect(checkoutCode).toContain('handleRemovePromoCode');
      expect(checkoutCode).toContain('title="Remove promo code"');
    });

    it('authoritatively revalidates promo code prior to order placement', () => {
      expect(checkoutCode).toContain('handlePlaceOrder');
      expect(checkoutCode).toContain('couponService.validateCoupon(appliedCoupon.code');
    });

    it('correctly calculates order financials with valid promo discount', () => {
      // Subtotal 12,000, 0 discount, online free shipping (0 fee)
      const baseFinancials = calculateOrderFinancials({ subtotal: 12000, discount: 0, paymentMethod: 'razorpay' });
      expect(baseFinancials.subtotal).toBe(12000);
      expect(baseFinancials.discount).toBe(0);
      expect(baseFinancials.shippingFee).toBe(0);
      // Tax is 5% of 12000 = 600, Total = 12600
      expect(baseFinancials.tax).toBe(600);
      expect(baseFinancials.total).toBe(12600);

      // 1200 discount applied
      const discountedFinancials = calculateOrderFinancials({
        subtotal: 12000,
        discount: 1200,
        paymentMethod: 'razorpay'
      });
      expect(discountedFinancials.discount).toBe(1200);
      expect(discountedFinancials.taxableAmount).toBe(10800);
      // Tax is 5% of 10800 = 540, Total = 11340
      expect(discountedFinancials.tax).toBe(540);
      expect(discountedFinancials.total).toBe(11340);
    });

    it('validates active coupons from couponService correctly', () => {
      const mockCoupon: Coupon = {
        id: 'cp_diwali25',
        code: 'DIWALI25',
        discountType: 'percentage',
        discountValue: 25,
        minSpend: 5000,
        maxDiscount: 2500,
        isActive: true,
        usageCount: 0,
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
      };

      storageService.saveCoupons([mockCoupon]);
      const coupons = couponService.getAllCoupons();
      expect(coupons.length).toBe(1);
      expect(coupons[0].code).toBe('DIWALI25');

      const validation = couponService.validateCoupon('DIWALI25', 8000);
      expect(validation.valid).toBe(true);
      expect(validation.discountAmount).toBe(2000); // 25% of 8000 is 2000 <= max 2500

      // Below min spend
      const invalidValidation = couponService.validateCoupon('DIWALI25', 2000);
      expect(invalidValidation.valid).toBe(false);
    });
  });
});
