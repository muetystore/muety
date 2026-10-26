import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { productService } from '../features/catalog/services/productService';

describe('Product Care Details Architecture & Admin ERP Synchronization', () => {
  const adminEditorPath = path.join(process.cwd(), 'src/features/admin/pages/AdminProductEditor.tsx');
  const pdpPath = path.join(process.cwd(), 'src/features/catalog/pages/ProductDetailPage.tsx');
  const servicePath = path.join(process.cwd(), 'src/features/catalog/services/productService.ts');
  const cssPath = path.join(process.cwd(), 'src/styles/index.css');

  const adminEditorCode = fs.readFileSync(adminEditorPath, 'utf-8');
  const pdpCode = fs.readFileSync(pdpPath, 'utf-8');
  const serviceCode = fs.readFileSync(servicePath, 'utf-8');
  const cssCode = fs.readFileSync(cssPath, 'utf-8');

  describe('1. Admin Product Editor ERP Care Details Input', () => {
    it('provides a dedicated Product Care Details section with clear labeling', () => {
      expect(adminEditorCode).toContain('Product Care Details (Drape Care &amp; Preservation)');
      expect(adminEditorCode).toContain('Admin-controlled: Displays on storefront PDP under Product Details &amp; Highlights');
    });

    it('provides rich quick-preset insertion buttons for artisanal care guidance', () => {
      expect(adminEditorCode).toContain('Dry Clean Only');
      expect(adminEditorCode).toContain('Store in Breathable Muslin / Cotton Bag');
      expect(adminEditorCode).toContain('Air Periodically in Mild Shade');
      expect(adminEditorCode).toContain('Iron on Reverse with Low Heat');
      expect(adminEditorCode).toContain('Avoid Direct Perfume or Chemical Spray on Zari');
      expect(adminEditorCode).toContain('Refold Periodically along New Creases');
    });

    it('provides a multiline textarea for comprehensive care instructions', () => {
      expect(adminEditorCode).toMatch(/<textarea[\s\S]*value=\{careInstructions\}[\s\S]*onChange=\{e\s*=>\s*\{\s*setCareInstructions\(e\.target\.value\)/);
    });

    it('synchronizes care details with specifications and highlights upon save', () => {
      expect(adminEditorCode).toContain("'Care Instructions': careInstructions.trim() || 'Dry Clean Only.'");
      expect(adminEditorCode).toMatch(/isCare && cleanCare \? careShort : h\.value\.trim\(\)/);
    });

    it('loads existing care instructions from careInstructions or specifications on edit', () => {
      expect(adminEditorCode).toContain("const loadedCare = prod.careInstructions || prod.specifications?.['Care Instructions'] || prod.specifications?.['Product Care'] || '';");
      expect(adminEditorCode).toContain('setCareInstructions(loadedCare);');
    });
  });

  describe('2. Product Service Mappings & Firestore Payload Persistence', () => {
    it('maps careInstructions in mapFirestoreDocToProduct from all field variations', () => {
      expect(serviceCode).toContain("careInstructions: raw.careInstructions || raw.care || raw.specifications?.['Care Instructions'] || raw.specifications?.['Product Care'] || raw.specifications?.['Care'] || '',");
    });

    it('persists careInstructions to Firestore update payload', () => {
      expect(serviceCode).toContain("careInstructions: updated.careInstructions || '',");
    });

    it('preserves careInstructions in memory and storage', () => {
      const sample = productService.mapFirestoreDocToProduct('p-test-care', {
        title: 'Kanjivaram Silk Saree',
        careInstructions: 'Dry Clean Only. Wrap in pure unbleached cotton.'
      });
      expect(sample.careInstructions).toBe('Dry Clean Only. Wrap in pure unbleached cotton.');
    });
  });

  describe('3. Storefront Product Detail Page Presentation', () => {
    it('resolves care instructions with authentic silk care guidance fallback', () => {
      expect(pdpCode).toContain("const adminCareText = useMemo(() => {");
      expect(pdpCode).toContain("product?.specifications?.['Care Instructions']");
      expect(pdpCode).toContain('Dry Clean Only.\\n• Store wrapped in pure breathable muslin or cotton fabric.');
    });

    it('includes care instructions in fast-scan highlights', () => {
      expect(pdpCode).toContain("label: 'Care Instructions'");
      expect(pdpCode).toContain("adminCareText.split('\\n')[0]");
    });

    it('displays the Product Care tab pill and smooth scrolls to care details', () => {
      expect(pdpCode).toContain("setActiveDetailTab('care')");
      expect(pdpCode).toContain("document.getElementById('pdp-accordion-care')");
      expect(pdpCode).toContain('Product Care');
    });

    it('renders structured care list with luxury gold diamond bullets', () => {
      expect(pdpCode).toContain('className="pdp-care-details-card"');
      expect(pdpCode).toContain('Atelier Preservation Guidelines');
      expect(pdpCode).toContain('className="pdp-care-bullet"');
      expect(pdpCode).toContain('✦');
    });

    it('defines luxury styles for pdp-care-details-card in index.css', () => {
      expect(cssCode).toContain('.pdp-care-details-card {');
      expect(cssCode).toContain('.pdp-care-header {');
      expect(cssCode).toContain('.pdp-care-badge-label {');
      expect(cssCode).toContain('.pdp-care-item {');
      expect(cssCode).toContain('.pdp-care-bullet {');
    });
  });
});
