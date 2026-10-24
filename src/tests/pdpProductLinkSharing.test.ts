import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Product Detail Page (PDP) — Product Link Sharing Feature', () => {
  const pdpCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
    'utf-8'
  );
  const cssCode = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/index.css'),
    'utf-8'
  );

  describe('1. Share Buttons & Triggers (UI/UX)', () => {
    it('provides a prominent Share button in the secondary action row next to Wishlist', () => {
      expect(pdpCode).toContain('className="pdp-secondary-actions"');
      expect(pdpCode).toContain('className="pdp-share-btn"');
      expect(pdpCode).toContain('aria-label="Share product"');
      expect(pdpCode).toContain('onClick={() => setIsShareModalOpen(true)}');
      expect(pdpCode).toContain('<Share2 size={17} />');
    });

    it('provides a secondary Share button in the top breadcrumb navigation bar', () => {
      expect(pdpCode).toContain('className="pdp-breadcrumb-share-btn"');
      expect(pdpCode).toContain('aria-label="Share this saree"');
      expect(pdpCode).toContain('<Share2 size={13} />');
    });

    it('enforces luxury styling for share button matching brand aesthetic', () => {
      expect(cssCode).toContain('.pdp-secondary-actions');
      expect(cssCode).toContain('.pdp-share-btn');
      expect(cssCode).toContain('border: 1px solid var(--brand-border)');
      expect(cssCode).toContain('.pdp-share-btn:hover');
      expect(cssCode).toContain('border-color: var(--brand-accent)');
      expect(cssCode).toContain('.pdp-breadcrumb-share-btn');
    });
  });

  describe('2. Luxury Atelier Share Modal (Modal Architecture & Portals)', () => {
    it('mounts the share modal through createPortal onto document.body', () => {
      expect(pdpCode).toContain('isShareModalOpen && product && createPortal(');
      expect(pdpCode).toContain('document.body');
      expect(pdpCode).toContain('className="pdp-share-modal-overlay"');
      expect(pdpCode).toContain('className="pdp-share-modal-card"');
      expect(pdpCode).toContain('role="dialog"');
      expect(pdpCode).toContain('aria-modal="true"');
      expect(pdpCode).toContain('aria-labelledby="pdp-share-modal-title"');
    });

    it('displays product preview card with image, title, price, and category', () => {
      expect(pdpCode).toContain('className="pdp-share-product-preview"');
      expect(pdpCode).toContain('className="pdp-share-product-thumb"');
      expect(pdpCode).toContain('className="pdp-share-product-name"');
      expect(pdpCode).toContain('className="pdp-share-product-meta"');
      expect(pdpCode).toContain("₹{product.price.toLocaleString('en-IN')}");
      // Preserves customer privacy: must not expose SKU in patron storefront
      expect(pdpCode).not.toContain('• SKU:');
    });

    it('supports keyboard Escape key to close the modal', () => {
      expect(pdpCode).toContain("e.key === 'Escape' && isShareModalOpen");
      expect(pdpCode).toContain('setIsShareModalOpen(false)');
    });
  });

  describe('3. Canonical URL Generation & One-Click Copy', () => {
    it('constructs canonical product share URL using slug or product ID', () => {
      expect(pdpCode).toContain('const shareUrl = useMemo(');
      expect(pdpCode).toContain('${window.location.origin}/products/${product.slug || product.id}');
    });

    it('includes a dedicated read-only link input with Copy Link action button', () => {
      expect(pdpCode).toContain('id="pdp-share-link-input"');
      expect(pdpCode).toContain('className="pdp-share-input"');
      expect(pdpCode).toContain('className={`pdp-share-copy-btn ${isLinkCopied ? \'copied\' : \'\'}`}');
      expect(pdpCode).toContain('onClick={handleCopyLink}');
    });

    it('handles clipboard writeText with fallback support and toast feedback', () => {
      expect(pdpCode).toContain('const handleCopyLink = async () =>');
      expect(pdpCode).toContain('navigator.clipboard.writeText(shareUrl)');
      expect(pdpCode).toContain("document.execCommand('copy')");
      expect(pdpCode).toContain("success('Product link copied to clipboard!')");
      expect(pdpCode).toContain('setIsLinkCopied(true)');
    });
  });

  describe('4. Multi-Channel Social Sharing & Native Web Share API', () => {
    it('supports direct WhatsApp sharing with pre-formatted product message and URL', () => {
      expect(pdpCode).toContain("handleShareChannel('whatsapp')");
      expect(pdpCode).toContain('https://api.whatsapp.com/send?text=');
      expect(pdpCode).toContain('className="pdp-share-channel-btn pdp-share-btn-whatsapp"');
    });

    it('supports Facebook, X (Twitter), Pinterest, and Email channels', () => {
      expect(pdpCode).toContain("handleShareChannel('facebook')");
      expect(pdpCode).toContain('https://www.facebook.com/sharer/sharer.php?u=');
      expect(pdpCode).toContain("handleShareChannel('twitter')");
      expect(pdpCode).toContain('https://twitter.com/intent/tweet?text=');
      expect(pdpCode).toContain("handleShareChannel('pinterest')");
      expect(pdpCode).toContain('https://pinterest.com/pin/create/button/?');
      expect(pdpCode).toContain("handleShareChannel('email')");
      expect(pdpCode).toContain('mailto:?subject=');
    });

    it('detects and enables native Web Share API (navigator.share) when supported', () => {
      expect(pdpCode).toContain("const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';");
      expect(pdpCode).toContain('const handleNativeShare = async () =>');
      expect(pdpCode).toContain('await navigator.share(');
      expect(pdpCode).toContain('{hasNativeShare && (');
      expect(pdpCode).toContain('className="pdp-share-channel-btn pdp-share-btn-native"');
    });
  });
});
