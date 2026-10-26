import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PDP Image Gallery Sticky Scrolling & Flipkart-Style Purchase Dock', () => {
  const pdpPath = path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx');
  const cssPath = path.join(process.cwd(), 'src/styles/index.css');

  const pdpCode = fs.readFileSync(pdpPath, 'utf-8');
  const cssCode = fs.readFileSync(cssPath, 'utf-8');

  describe('1. Product Image Gallery Sticky Scrolling (Zero Blank Spaces)', () => {
    it('configures .pdp-page with overflow-x: clip so child sticky elements stick reliably', () => {
      expect(cssCode).toContain('.pdp-page {');
      expect(cssCode).toContain('overflow-x: clip;');
    });

    it('sets .pdp-gallery-col to position: sticky on desktop with dynamic top variable', () => {
      expect(cssCode).toMatch(/\.pdp-gallery-col\s*\{[^}]*position:\s*sticky\s*!important;[^}]*top:\s*var\(--gallery-sticky-top,\s*88px\);/);
      expect(cssCode).toMatch(/\.pdp-gallery-col\s*\{[^}]*align-self:\s*start;/);
    });

    it('attaches galleryColRef and style with galleryStickyTop to .pdp-gallery-col', () => {
      expect(pdpCode).toContain('ref={galleryColRef}');
      expect(pdpCode).toContain('className="pdp-gallery-col"');
      expect(pdpCode).toContain('style={{ top: `${galleryStickyTop}px` }}');
    });

    it('calculates galleryStickyTop dynamically based on gallery height and viewport height', () => {
      expect(pdpCode).toContain('const [galleryStickyTop, setGalleryStickyTop] = useState<number>(88);');
      expect(pdpCode).toContain('galleryColRef.current.offsetHeight');
      expect(pdpCode).toContain('setGalleryStickyTop(topOffset)');
      expect(pdpCode).toContain('setGalleryStickyTop(targetTop)');
    });
  });

  describe('2. Flipkart-Inspired Purchase Dock (Unified Single Component Docked at Details End)', () => {
    it('renders unified .pdp-flipkart-sticky-dock inside .pdp-info-col', () => {
      expect(pdpCode).toContain('className="pdp-flipkart-sticky-dock is-visible"');
      expect(pdpCode).toContain('className="pdp-flipkart-dock-cart-btn"');
      expect(pdpCode).toContain('className="pdp-flipkart-dock-buy-btn"');
    });

    it('wires Add to Bag and Buy Now actions directly to the sticky dock', () => {
      expect(pdpCode).toContain('onClick={handleAddToBag}');
      expect(pdpCode).toContain('onClick={handleBuyNow}');
    });

    it('defines .pdp-flipkart-sticky-dock as sticky within the details column on desktop and permanently visible at details ending', () => {
      expect(cssCode).toContain('.pdp-flipkart-sticky-dock {');
      expect(cssCode).toContain('position: sticky;');
      expect(cssCode).toContain('bottom: 16px;');
      expect(cssCode).toContain('opacity: 1 !important;');
      expect(cssCode).toContain('pointer-events: auto !important;');
    });

    it('hides the redundant middle buy bar on desktop so only one component moves at bottom of details', () => {
      expect(cssCode).toContain('.pdp-actions-container .pdp-buttons-grid');
      expect(cssCode).toContain('display: none !important;');
    });

    it('hides the sticky dock on mobile screens where mobile sticky bar operates', () => {
      expect(cssCode).toContain('.pdp-flipkart-sticky-dock {\n  display: none !important;\n}');
    });

    it('styles PDP Add to Bag buttons with rich black color matching catalog page design', () => {
      expect(cssCode).toContain('.pdp-add-to-bag-btn {');
      expect(cssCode).toContain('background: #111827 !important;');
      expect(cssCode).toContain('color: #ffffff !important;');
      expect(cssCode).toContain('.pdp-flipkart-dock-cart-btn {');
      expect(cssCode).toContain('.pdp-flipkart-dock-buy-btn {');
      expect(cssCode).toContain('background: #c9a227 !important;');
    });

    it('configures .pdp-grid with 1.38fr 1fr ratio to increase details column width by 1cm', () => {
      expect(cssCode).toContain('grid-template-columns: 1.38fr 1fr;');
      expect(cssCode).toContain('grid-template-columns: 1.38fr 1fr !important;');
    });

    it('has category SKU eyebrow removed above title and exceptional summary section removed from reviews', () => {
      expect(pdpCode).not.toContain('<span className="pdp-category-sku">');
      expect(pdpCode).not.toContain('pdp-reviews-flipkart-summary');
      expect(pdpCode).toContain('className="pdp-specs-table-container"');
      expect(pdpCode).toContain('className="pdp-desc-heritage-box"');
    });
  });
});
