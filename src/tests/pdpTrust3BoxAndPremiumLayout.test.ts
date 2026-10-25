import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PDP Trust 3-Box Details & Premium Flipkart/Meesho Layout System', () => {
  const pdpCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
    'utf-8'
  );
  const cssCode = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/index.css'),
    'utf-8'
  );

  // =========================================================================
  // 1. 3-BOX DETAILS SYSTEM (Flipkart: Return, COD, Assured / Meesho: Price, COD, Return)
  // =========================================================================
  describe('1. 3-Box Trust Feature Details Strip', () => {
    it('implements the 3-box trust strip container with accessible region role', () => {
      expect(pdpCode).toContain('className="pdp-trust-3box-strip pdp-trust-grid"');
      expect(pdpCode).toContain('role="region"');
      expect(pdpCode).toContain('aria-label="Customer trust and purchase guarantees"');
      expect(cssCode).toContain('.pdp-trust-3box-strip');
    });

    it('renders Box 1: 7-Day Returns with doorstep exchange & refund', () => {
      expect(pdpCode).toContain('pdp-icon-return');
      expect(pdpCode).toContain('<RotateCcw');
      expect(pdpCode).toContain('7-Day Returns');
      expect(pdpCode).toContain('Doorstep Exchange &amp; Refund');
      expect(cssCode).toContain('.pdp-icon-return');
    });

    it('renders Box 2: Cash on Delivery with pan-India note', () => {
      expect(pdpCode).toContain('pdp-icon-cod');
      expect(pdpCode).toContain('<Banknote');
      expect(pdpCode).toContain('Cash on Delivery');
      expect(pdpCode).toContain('Pay upon delivery pan-India');
      expect(cssCode).toContain('.pdp-icon-cod');
    });

    it('renders Box 3: MUETY Assured with 100% Pure Silk Mark Certification', () => {
      expect(pdpCode).toContain('pdp-icon-assured');
      expect(pdpCode).toContain('<ShieldCheck');
      expect(pdpCode).toContain('MUETY Assured');
      expect(pdpCode).toContain('100% Pure Silk Mark Certified');
      expect(cssCode).toContain('.pdp-icon-assured');
    });

    it('maintains backwards-compatible .pdp-trust-grid classes', () => {
      expect(cssCode).toContain('.pdp-trust-grid');
      expect(cssCode).toContain('.pdp-trust-item');
    });
  });

  // =========================================================================
  // 2. MEESHO-INSPIRED DIRECT WEAVER PRICE GUARANTEE TAG
  // =========================================================================
  describe('2. Direct Weaver Price Guarantee Pill', () => {
    it('displays the direct weaver price badge next to product pricing', () => {
      expect(pdpCode).toContain('className="pdp-best-price-tag"');
      expect(pdpCode).toContain('Direct Weaver Price • Zero Middleman Markup');
      expect(cssCode).toContain('.pdp-best-price-tag');
    });

    it('includes clear tax, GST and Salem artisan note', () => {
      expect(pdpCode).toContain('className="pdp-price-tax-note"');
      expect(pdpCode).toContain('Inclusive of all taxes • 5% GST • Handcrafted in Salem, India');
      expect(cssCode).toContain('.pdp-price-tax-note');
    });
  });

  // =========================================================================
  // 3. FLIPKART-INSPIRED SPECIAL OFFERS & COUPONS BANNER
  // =========================================================================
  describe('3. Special Savings & Bank Offers Banner', () => {
    it('renders the offers card with savings badge', () => {
      expect(pdpCode).toContain('className="pdp-offers-card"');
      expect(pdpCode).toContain('Apply offers for maximum savings');
      expect(pdpCode).toContain('Special Offers');
      expect(cssCode).toContain('.pdp-offers-card');
    });

    it('features active promotional coupons FESTIVE10 and MUETYFIRST with copy action', () => {
      expect(pdpCode).toContain('FESTIVE10');
      expect(pdpCode).toContain('MUETYFIRST');
      expect(pdpCode).toContain('handleCopyCoupon');
      expect(pdpCode).toContain('className="pdp-offer-copy-btn"');
      expect(cssCode).toContain('.pdp-offer-copy-btn');
    });
  });

  // =========================================================================
  // 4. FLIPKART-INSPIRED DELIVERY DETAILS & PINCODE CHECKER
  // =========================================================================
  describe('4. Delivery Details & Pincode Checker', () => {
    it('renders the interactive pincode form and check button', () => {
      expect(pdpCode).toContain('className="pdp-delivery-card"');
      expect(pdpCode).toContain('className="pdp-pincode-input"');
      expect(pdpCode).toContain('className="pdp-pincode-submit-btn"');
      expect(pdpCode).toContain('handlePincodeCheck');
      expect(cssCode).toContain('.pdp-delivery-card');
      expect(cssCode).toContain('.pdp-pincode-input');
    });

    it('displays dynamic estimated delivery date, courier and COD status upon check', () => {
      expect(pdpCode).toContain('pdp-delivery-result');
      expect(pdpCode).toContain('Delivery by <strong>{pincodeStatus.estimatedDate}</strong>');
      expect(pdpCode).toContain('Cash on Delivery Available for this location');
      expect(pdpCode).toContain('Pan-India Courier (₹89 Flat • Free above ₹15,000)');
      expect(cssCode).toContain('.pdp-delivery-result');
    });
  });

  // =========================================================================
  // 5. FLIPKART & MEESHO INSPIRED PRODUCT HIGHLIGHTS MATRIX
  // =========================================================================
  describe('5. Product Highlights Specifications Matrix', () => {
    it('renders structured 6-point fast-scan attribute card', () => {
      expect(pdpCode).toContain('className="pdp-highlights-card"');
      expect(pdpCode).toContain('Product Highlights');
      expect(pdpCode).toContain('Handcrafted Specs');
      expect(pdpCode).toContain('Fabric');
      expect(pdpCode).toContain('Silk Purity');
      expect(pdpCode).toContain('Zari Craft');
      expect(pdpCode).toContain('Blouse Piece');
      expect(pdpCode).toContain('Saree Length');
      expect(pdpCode).toContain('Occasion');
      expect(cssCode).toContain('.pdp-highlights-card');
      expect(cssCode).toContain('.pdp-highlights-grid');
    });
  });

  // =========================================================================
  // 6. MOBILE STICKY BOTTOM ACTION BAR (Flipkart & Meesho mobile pattern)
  // =========================================================================
  describe('6. Mobile Sticky Bottom Action Bar', () => {
    it('renders sticky bar container with product thumbnail, price, and instant CTA buttons', () => {
      expect(pdpCode).toContain('className={`pdp-mobile-sticky-bar ${isStickyBarVisible ? \'is-visible\' : \'\'}`}');
      expect(pdpCode).toContain('className="pdp-sticky-bar-thumb"');
      expect(pdpCode).toContain('className="pdp-sticky-btn pdp-sticky-cart-btn"');
      expect(pdpCode).toContain('className="pdp-sticky-btn pdp-sticky-buy-btn"');
      expect(cssCode).toContain('.pdp-mobile-sticky-bar');
      expect(cssCode).toContain('.pdp-sticky-btn');
    });

    it('hides sticky bar on desktop viewport and shows on mobile', () => {
      expect(cssCode).toContain('@media (min-width: 769px)');
      expect(cssCode).toContain('.pdp-mobile-sticky-bar {\n    display: none !important;\n  }');
    });
  });
});
