import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PDP Enhancements — Top Left Back Arrow, Swipe Transitions & Full Product Image Display', () => {
  const pdpCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
    'utf-8'
  );
  const cssCode = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/index.css'),
    'utf-8'
  );

  // =========================================================================
  // 1. TOP-LEFT BACK ARROW BUTTON
  // =========================================================================
  describe('1. Top-Left Corner Back Arrow (UI & UX)', () => {
    it('implements a floating circular back arrow button in the top-left corner of the product gallery', () => {
      expect(pdpCode).toContain('className="pdp-floating-back-btn"');
      expect(pdpCode).toContain('aria-label="Go back to previous page"');
      expect(pdpCode).toContain('<ArrowLeft');
      expect(cssCode).toContain('.pdp-floating-back-btn');
      expect(cssCode).toContain('position: absolute');
      expect(cssCode).toContain('top: 14px');
      expect(cssCode).toContain('left: 14px');
      expect(cssCode).toContain('border-radius: 50%');
    });

    it('enforces min 44x44px touch target on floating back button for mobile ergonomics', () => {
      expect(cssCode).toContain('min-width: 44px');
      expect(cssCode).toContain('min-height: 44px');
    });

    it('provides frosted glass luxury aesthetics with gold hover feedback', () => {
      expect(cssCode).toContain('backdrop-filter: blur(8px)');
      expect(cssCode).toContain('.pdp-floating-back-btn:hover');
      expect(cssCode).toContain('color: #C99A16');
    });

    it('implements handleGoBack navigating to previous page or falling back to /products', () => {
      expect(pdpCode).toContain('const handleGoBack =');
      expect(pdpCode).toContain('window.history.length > 1');
      expect(pdpCode).toContain("navigate(-1)");
      expect(pdpCode).toContain("navigate('/products')");
    });

    it('also renders a clean back arrow action in the breadcrumb bar', () => {
      expect(pdpCode).toContain('className="pdp-breadcrumb-back-btn"');
      expect(cssCode).toContain('.pdp-breadcrumb-back-btn');
    });
  });

  // =========================================================================
  // 2. PRODUCT IMAGE SWIPE TRANSITION
  // =========================================================================
  describe('2. Multi-Slide Continuous Swipe Transition UX', () => {
    it('implements continuous slider viewport and track structure', () => {
      expect(pdpCode).toContain('pdp-gallery-slider-viewport');
      expect(pdpCode).toContain('pdp-gallery-slider-track');
      expect(pdpCode).toContain('pdp-gallery-slide');
      expect(cssCode).toContain('.pdp-gallery-slider-viewport');
      expect(cssCode).toContain('.pdp-gallery-slider-track');
      expect(cssCode).toContain('.pdp-gallery-slide');
    });

    it('translates slider track continuously in real-time with touchDeltaX', () => {
      expect(pdpCode).toContain('translateX(calc(-${selectedImage * 100}% + ${touchDeltaX}px))');
      expect(pdpCode).toContain("transition: isSwipingGallery ? 'none' :");
    });

    it('renders all gallery images side-by-side inside the track so adjacent images are visible during swipe', () => {
      expect(pdpCode).toContain('galleryImages.map((img, idx) =>');
      expect(pdpCode).toContain('aria-hidden={selectedImage !== idx}');
    });

    it('applies tactile edge resistance when swiping at boundaries', () => {
      expect(pdpCode).toContain('const isAtStart = selectedImage === 0 && dx > 0;');
      expect(pdpCode).toContain('const isAtEnd = selectedImage === galleryImages.length - 1 && dx < 0;');
      expect(pdpCode).toContain('setTouchDeltaX(dx * 0.28);');
    });

    it('provides sleek pagination dots indicator on mobile', () => {
      expect(pdpCode).toContain('pdp-gallery-dots');
      expect(pdpCode).toContain('pdp-gallery-dot');
      expect(cssCode).toContain('.pdp-gallery-dots');
      expect(cssCode).toContain('.pdp-gallery-dot.active');
    });

    it('removes swipe chevron buttons in mobile view while relying only on finger swipe with smooth transition', () => {
      expect(cssCode).toContain('@media (max-width: 768px)');
      expect(cssCode).toContain('.pdp-gallery-nav-btn {\n    display: none !important;\n  }');
      // Finger swipe handlers remain attached
      expect(pdpCode).toContain('onTouchStart={handleGalleryTouchStart}');
      expect(pdpCode).toContain('onTouchMove={handleGalleryTouchMove}');
      expect(pdpCode).toContain('onTouchEnd={handleGalleryTouchEnd}');
    });

    it('maintains swipe buttons on other platforms (desktop and tablet > 768px)', () => {
      expect(pdpCode).toContain('pdp-gallery-nav-btn pdp-gallery-nav-prev');
      expect(pdpCode).toContain('pdp-gallery-nav-btn pdp-gallery-nav-next');
      expect(cssCode).toContain('.pdp-gallery-nav-btn {');
      expect(cssCode).toContain('display: flex;');
    });
  });

  // =========================================================================
  // 3. FULL PRODUCT IMAGE DISPLAY & DISABLED EXPAND GALLERY
  // =========================================================================
  describe('3. Full Product Image Presentation & Disabled Expand Gallery', () => {
    it('disables and removes the expand gallery button from the main image card', () => {
      expect(pdpCode).not.toContain('<button className="pdp-expand-btn"');
      expect(cssCode).toContain('.pdp-expand-btn {\n  display: none !important;\n}');
    });

    it('sets cursor to default on the main image card', () => {
      expect(cssCode).toContain('cursor: default');
    });

    it('uses object-fit: contain to ensure 100% of the saree image is fully visible without cropping', () => {
      expect(cssCode).toContain('.pdp-main-img');
      expect(cssCode).toContain('object-fit: contain');
      expect(cssCode).toContain('object-position: center');
    });

    it('uses 4:5 aspect ratio on mobile to prevent cropping tall ethnic wear images', () => {
      expect(cssCode).toContain('@media (max-width: 640px) {\n  .pdp-main-image-card {\n    aspect-ratio: 4 / 5;');
      expect(cssCode).toContain('max-height: 480px');
    });

    it('renders main image card on luxury warm ivory (#FAF8F3) background', () => {
      expect(cssCode).toContain('.pdp-main-image-card');
      expect(cssCode).toContain('background-color: #FAF8F3');
    });
  });
});
