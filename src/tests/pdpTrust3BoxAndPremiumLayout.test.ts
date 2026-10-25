import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PDP Trust 3-Box Details & Premium Layout System — Redesign Verification', () => {
  const pdpCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
    'utf-8'
  );
  const cssCode = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/index.css'),
    'utf-8'
  );

  // =========================================================================
  // 1. 3-BOX VERIFIED POLICY TRUST DETAILS STRIP
  // =========================================================================
  describe('1. 3-Box Trust Feature Details Strip', () => {
    it('implements the 3-box trust strip container with accessible region role', () => {
      expect(pdpCode).toContain('className="pdp-trust-3box-strip pdp-trust-grid"');
      expect(pdpCode).toContain('role="region"');
      expect(pdpCode).toContain('aria-label="Customer trust and purchase guarantees"');
      expect(cssCode).toContain('.pdp-trust-3box-strip');
    });

    it('renders Box 1: Return & Refund Policy with accurate 3-day window link', () => {
      expect(pdpCode).toContain('pdp-icon-return');
      expect(pdpCode).toContain('<RotateCcw');
      expect(pdpCode).toContain('Return &amp; Refund Policy');
      expect(pdpCode).toContain('to="/return-refund-policy"');
      expect(pdpCode).toContain('3-Day Window for Defects');
      expect(cssCode).toContain('.pdp-icon-return');
      expect(cssCode).toContain('.pdp-trust-link');
    });

    it('renders Box 2: Payment Options with prepaid free delivery and COD note', () => {
      expect(pdpCode).toContain('pdp-icon-cod');
      expect(pdpCode).toContain('<Banknote');
      expect(pdpCode).toContain('Payment Options');
      expect(pdpCode).toContain('to="/shipping-policy"');
      expect(pdpCode).toContain('Prepaid Free Delivery');
      expect(pdpCode).toContain('COD (₹89 Advance)');
      expect(cssCode).toContain('.pdp-icon-cod');
    });

    it('renders Box 3: Product Information with handcrafted pure silk details', () => {
      expect(pdpCode).toContain('pdp-icon-assured');
      expect(pdpCode).toContain('<ShieldCheck');
      expect(pdpCode).toContain('Product Information');
      expect(pdpCode).toContain('href="#pdp-tabs-section"');
      expect(pdpCode).toContain('Handcrafted Pure Silk');
      expect(pdpCode).toContain('Salem Atelier Weave');
      expect(cssCode).toContain('.pdp-icon-assured');
    });

    it('maintains backwards-compatible .pdp-trust-grid classes', () => {
      expect(cssCode).toContain('.pdp-trust-grid');
      expect(cssCode).toContain('.pdp-trust-item');
    });
  });

  // =========================================================================
  // 2. MEESHO-INSPIRED DIRECT WEAVER PRICE GUARANTEE TAG & TAX INCLUSIVE NOTE
  // =========================================================================
  describe('2. Direct Weaver Price Guarantee Pill & Tax-Inclusive Pricing', () => {
    it('displays the direct weaver price badge next to product pricing', () => {
      expect(pdpCode).toContain('className="pdp-best-price-tag"');
      expect(pdpCode).toContain('Direct Weaver Price • Zero Middleman Markup');
      expect(cssCode).toContain('.pdp-best-price-tag');
    });

    it('displays clean tax-inclusive pricing note without separate GST billing', () => {
      expect(pdpCode).toContain('className="pdp-price-tax-note"');
      expect(pdpCode).toContain('Inclusive of all applicable taxes • Handcrafted in Salem, India');
      // Must NOT contain separate GST billing in customer view
      expect(pdpCode).not.toContain('• 5% GST •');
      expect(cssCode).toContain('.pdp-price-tax-note');
    });
  });

  // =========================================================================
  // 3. FLIPKART-INSPIRED DYNAMIC ADMIN-MANAGED OFFERS & COUPONS BANNER
  // =========================================================================
  describe('3. Admin-Managed Special Savings & Offers Banner', () => {
    it('renders the dynamic offers card with savings badge', () => {
      expect(pdpCode).toContain('className="pdp-offers-card"');
      expect(pdpCode).toContain('Apply offers for maximum savings');
      expect(pdpCode).toContain('Special Offers');
      expect(cssCode).toContain('.pdp-offers-card');
    });

    it('loads active coupons dynamically and provides Apply and Applied actions', () => {
      expect(pdpCode).toContain('couponService.getActiveCoupons()');
      expect(pdpCode).toContain('applyCoupon(cp.code');
      expect(pdpCode).toContain('pdp-offer-remove-btn');
      expect(pdpCode).toContain('pdp-offer-effective-banner');
      expect(cssCode).toContain('.pdp-offer-effective-banner');
    });
  });

  // =========================================================================
  // 4. DESKTOP SECONDARY GALLERY FILL & REMOVAL OF REDUNDANT SHIPPING CARD
  // =========================================================================
  describe('4. Desktop Secondary Gallery Fill & Clean Policy Architecture', () => {
    it('removes the redundant shipping info card from the PDP layout', () => {
      // User request 3: [Shipping & delivery information- section to remove
      expect(pdpCode).not.toContain('className="pdp-shipping-info-card"');
      expect(pdpCode).not.toContain('Shipping &amp; delivery information');
      // Crucial: Must NOT contain speculative estimated date checker or delivery-card form
      expect(pdpCode).not.toContain('pdp-delivery-card');
      expect(pdpCode).not.toContain('handlePincodeCheck');
    });

    it('fills desktop blank space below gallery with secondary product views', () => {
      // User request 1: product image below blank space fill to display another product image on only desktop view
      expect(pdpCode).toContain('className="pdp-desktop-secondary-gallery"');
      expect(pdpCode).toContain('className="pdp-desktop-extra-image-card"');
      expect(cssCode).toContain('.pdp-desktop-secondary-gallery');
      expect(cssCode).toContain('.pdp-desktop-extra-image-card');
    });

    it('strictly preserves mobile invariance by hiding desktop secondary gallery on mobile', () => {
      // User request 2: in mobile view don't change current system
      expect(cssCode).toContain('.pdp-desktop-secondary-gallery {');
      expect(cssCode).toContain('display: none !important;');
      expect(cssCode).toContain('@media (min-width: 993px)');
      expect(cssCode).toContain('display: flex !important;');
    });
  });

  // =========================================================================
  // 5. ADMIN-MANAGED PRODUCT HIGHLIGHTS MATRIX
  // =========================================================================
  describe('5. Product Highlights Specifications Matrix', () => {
    it('renders structured admin-managed attribute card from product highlights', () => {
      expect(pdpCode).toContain('className="pdp-highlights-card"');
      expect(pdpCode).toContain('Product Highlights');
      expect(pdpCode).toContain('Handcrafted Specs');
      expect(pdpCode).toContain('displayHighlights.map');
      expect(cssCode).toContain('.pdp-highlights-card');
      expect(cssCode).toContain('.pdp-highlights-grid');
    });
  });

  // =========================================================================
  // 6. MOBILE STICKY BOTTOM ACTION BAR (Flipkart & Meesho mobile pattern)
  // =========================================================================
  describe('6. Mobile Sticky Bottom Action Bar', () => {
    it('renders sticky bar container with debounced purchase actions', () => {
      expect(pdpCode).toContain('className={`pdp-mobile-sticky-bar ${isStickyBarVisible ? \'is-visible\' : \'\'}`}');
      expect(pdpCode).toContain('className="pdp-sticky-bar-thumb"');
      expect(pdpCode).toContain('onClick={handleAddToBag}');
      expect(pdpCode).toContain('onClick={handleBuyNow}');
      expect(cssCode).toContain('.pdp-mobile-sticky-bar');
      expect(cssCode).toContain('.pdp-sticky-btn');
    });

    it('hides sticky bar on desktop viewport and shows on mobile', () => {
      expect(cssCode).toContain('@media (min-width: 769px)');
      expect(cssCode).toContain('.pdp-mobile-sticky-bar {\n    display: none !important;\n  }');
    });
  });
});
