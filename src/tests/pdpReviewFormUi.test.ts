import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Product Detail Page (PDP) — MUETY Review Form UI System', () => {
  const pdpCode = fs.readFileSync(
    path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx'),
    'utf-8'
  );
  const cssCode = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/index.css'),
    'utf-8'
  );

  describe('1. Card Architecture & Header Row', () => {
    it('uses clean luxury card architecture with subtle top gold accent border and white background', () => {
      expect(cssCode).toContain('.pdp-muety-form-wrapper');
      expect(cssCode).toContain('background-color: #ffffff');
      expect(cssCode).toContain('border: 1px solid var(--brand-border)');
      expect(cssCode).toContain('border-top: 3px solid var(--brand-accent, #c9a227)');
      expect(pdpCode).toContain('className="pdp-muety-form-wrapper animate-fade-in"');
    });

    it('provides an integrated close button in the header row', () => {
      expect(pdpCode).toContain('className="pdp-muety-form-header-row"');
      expect(pdpCode).toContain('className="pdp-muety-form-close-btn"');
      expect(pdpCode).toContain('onClick={() => setShowReviewForm(false)}');
      expect(cssCode).toContain('.pdp-muety-form-close-btn');
    });

    it('renders the refined MUETY Patron Sanctuary badge without tacky hashtags', () => {
      expect(pdpCode).toContain('className="pdp-muety-form-badge"');
      expect(pdpCode).toContain('<span>MUETY Patron Sanctuary</span>');
      expect(pdpCode).not.toContain('# MUETY PATRON SANCTUARY');
      expect(cssCode).toContain('.pdp-muety-form-badge');
    });
  });

  describe('2. Unified Form Controls & Labels', () => {
    it('uses standard MUETY form-group and form-label styling with sentence case', () => {
      expect(pdpCode).toContain('className="form-group pdp-muety-form-group"');
      expect(pdpCode).toContain('className="form-label pdp-muety-form-label"');
      expect(pdpCode).toContain('<span>Your Full Name</span>');
      expect(pdpCode).toContain('<span className="pdp-req-star">*</span>');
      expect(pdpCode).toContain('<span className="pdp-opt-tag">(Optional)</span>');
    });

    it('applies standard form-input styling with gold focus glow', () => {
      expect(pdpCode).toContain('className="form-input pdp-muety-form-input"');
      expect(cssCode).toContain('.pdp-muety-form-input:focus');
      expect(cssCode).toContain('border-color: var(--brand-accent, #c9a227)');
      expect(cssCode).toContain('box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.16)');
    });
  });

  describe('3. Patron Star Rating & Feedback Badge', () => {
    it('provides interactive 5-star rating with hover preview', () => {
      expect(pdpCode).toContain('className="pdp-muety-stars-box"');
      expect(pdpCode).toContain('className="pdp-muety-star-btn"');
      expect(cssCode).toContain('.pdp-muety-star-btn:hover');
      expect(cssCode).toContain('transform: scale(1.18)');
    });

    it('displays modern rating feedback badge with score and drape description', () => {
      expect(pdpCode).toContain('className="pdp-muety-rating-badge"');
      expect(pdpCode).toContain('className="pdp-muety-rating-score"');
      expect(pdpCode).toContain('className="pdp-muety-rating-desc"');
      expect(pdpCode).toContain('Exceptional Drape');
      expect(cssCode).toContain('.pdp-muety-rating-badge');
    });
  });

  describe('4. Atelier Photo Dropzone & Action Buttons', () => {
    it('provides styled drape photograph upload button and preview box', () => {
      expect(pdpCode).toContain('className="pdp-muety-photo-dropzone"');
      expect(pdpCode).toContain('className="pdp-muety-photo-upload-btn"');
      expect(pdpCode).toContain('className="pdp-muety-photo-del-btn"');
      expect(cssCode).toContain('.pdp-muety-photo-dropzone');
      expect(cssCode).toContain('.pdp-muety-photo-upload-btn');
    });

    it('renders unified actions row with primary submit button, cancel button, and trust badge', () => {
      expect(pdpCode).toContain('className="pdp-muety-form-actions-row"');
      expect(pdpCode).toContain('className="btn btn-primary pdp-muety-submit-btn"');
      expect(pdpCode).toContain('className="btn btn-outline pdp-muety-cancel-btn"');
      expect(pdpCode).toContain('className="pdp-muety-trust-badge"');
      expect(cssCode).toContain('.pdp-muety-form-actions-row');
      expect(cssCode).toContain('.pdp-muety-submit-btn');
      expect(cssCode).toContain('.pdp-muety-cancel-btn');
    });
  });
});
