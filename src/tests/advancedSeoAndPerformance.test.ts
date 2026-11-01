import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  getCloudinaryUrl, 
  getOptimizedImageUrl, 
  getCloudinarySrcSet 
} from '@/lib/media/cloudinary';

describe('Advanced SEO & Performance Suite', () => {
  describe('Cloudinary image optimization and local WebP resolution', () => {
    it('resolves uncompressed local JPEG fallbacks to their lightweight WebP variants', () => {
      expect(getOptimizedImageUrl('/saree_model_individual.jpg')).toBe('/saree_model_individual.webp');
      expect(getOptimizedImageUrl('/saree_fabric_detail.jpg')).toBe('/saree_fabric_detail.webp');
      expect(getOptimizedImageUrl('/saree_model_drape.jpg')).toBe('/saree_model_drape.webp');
      expect(getOptimizedImageUrl('/diwali_hero_banner.jpg')).toBe('/diwali_hero_banner.webp');
      expect(getOptimizedImageUrl('/dasara_campaign_banner_with_text.jpg')).toBe('/dasara_campaign_banner_with_text.webp');
    });

    it('injects f_auto and q_auto parameters for Cloudinary delivery URLs', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/muety-atelier/image/upload/v12345/saree_1.jpg';
      const optimized = getCloudinaryUrl(cloudinaryUrl, {
        width: 600,
        height: 648,
        crop: 'fill',
        format: 'auto',
        quality: 'auto'
      });

      expect(optimized).toContain('c_fill');
      expect(optimized).toContain('w_600');
      expect(optimized).toContain('h_648');
      expect(optimized).toContain('f_auto');
      expect(optimized).toContain('q_auto');
    });

    it('replaces existing transformation parameters without corrupting URLs', () => {
      const alreadyTransformed = 'https://res.cloudinary.com/muety-atelier/image/upload/c_scale,w_200/v12345/saree_1.jpg';
      const reOptimized = getCloudinaryUrl(alreadyTransformed, {
        width: 800,
        crop: 'fill',
        format: 'auto',
        quality: 'auto'
      });

      expect(reOptimized).toContain('w_800');
      expect(reOptimized).not.toContain('w_200');
    });

    it('generates responsive srcSet string for Cloudinary images across specified breakpoints', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/muety-atelier/image/upload/v12345/saree_sample.jpg';
      const srcSet = getCloudinarySrcSet(cloudinaryUrl, [300, 600], { crop: 'fill' });

      expect(srcSet).toBeDefined();
      expect(srcSet).toContain('w_300');
      expect(srcSet).toContain('300w');
      expect(srcSet).toContain('w_600');
      expect(srcSet).toContain('600w');
    });

    it('returns undefined srcSet for local relative assets without error', () => {
      expect(getCloudinarySrcSet('/saree_model_individual.webp')).toBeUndefined();
    });
  });

  describe('Structured Data Schema generation for Advanced SEO', () => {
    it('constructs valid Organization schema with canonical brand domain', () => {
      const orgSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MUETY',
        url: 'https://muety.in',
        logo: 'https://muety.in/muety-logo-opt.png'
      };

      expect(orgSchema['@type']).toBe('Organization');
      expect(orgSchema.url).toBe('https://muety.in');
      expect(orgSchema.logo).toContain('muety-logo-opt.png');
    });

    it('constructs valid Product schema with price in INR and stock availability', () => {
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Pink Kanjivaram Silk Saree',
        sku: 'SR-PINK-01',
        brand: { '@type': 'Brand', name: 'MUETY' },
        offers: {
          '@type': 'Offer',
          url: 'https://muety.in/products/pink-kanjivaram-silk-saree',
          priceCurrency: 'INR',
          price: 18999,
          itemCondition: 'https://schema.org/NewCondition',
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: 'MUETY' }
        }
      };

      expect(productSchema['@type']).toBe('Product');
      expect(productSchema.offers.priceCurrency).toBe('INR');
      expect(productSchema.offers.price).toBe(18999);
      expect(productSchema.offers.availability).toBe('https://schema.org/InStock');
      expect(productSchema.offers.url).toContain('https://muety.in/products/');
    });
  });
});
