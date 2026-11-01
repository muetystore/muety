import { useEffect } from 'react';
import { getCanonicalStoreUrl } from '@/shared/utils/domainRouting';

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  price?: number;
  currency?: string;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

/**
 * Updates or creates a <meta> tag by name or property attribute.
 */
function updateMetaTag(attribute: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Removes a <meta> tag if present.
 */
function removeMetaTag(attribute: 'name' | 'property', key: string): void {
  if (typeof document === 'undefined') return;
  const element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

const DEFAULT_DESCRIPTION = 'MUETY - Luxury Handloom Sarees, Pure Mulberry Silk & Certified Zari Drapes. Authentic craftsmanship direct from Salem handloom artisans.';
const DEFAULT_OG_IMAGE = 'https://muety.in/diwali_hero_banner.webp';

/**
 * Advanced SEO hook that synchronizes document title, canonical link,
 * OpenGraph, Twitter Cards, and JSON-LD structured data in real time.
 */
export function useSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  price,
  currency = 'INR',
  jsonLd
}: SEOProps = {}): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Page Title
    const formattedTitle = title ? `MUETY | ${title}` : 'MUETY | Pure Silk Handlooms & Ethnic Luxury';
    document.title = formattedTitle;

    // 2. Canonical URL
    const activePath = canonicalPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    const canonicalUrl = getCanonicalStoreUrl(activePath);
    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 3. Meta Description
    updateMetaTag('name', 'description', description);

    // 4. OpenGraph Tags
    updateMetaTag('property', 'og:site_name', 'MUETY');
    updateMetaTag('property', 'og:title', formattedTitle);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('property', 'og:type', ogType);
    updateMetaTag('property', 'og:locale', 'en_IN');

    // Resolve absolute image URL for OpenGraph
    const absoluteImage = ogImage.startsWith('http') 
      ? ogImage 
      : `https://muety.in${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`;
    updateMetaTag('property', 'og:image', absoluteImage);

    // Product specific OpenGraph price meta
    if (ogType === 'product' && typeof price === 'number') {
      updateMetaTag('property', 'product:price:amount', price.toFixed(2));
      updateMetaTag('property', 'product:price:currency', currency);
    } else {
      removeMetaTag('property', 'product:price:amount');
      removeMetaTag('property', 'product:price:currency');
    }

    // 5. Twitter Card Tags
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', formattedTitle);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', absoluteImage);

    // 6. JSON-LD Structured Data
    const scriptId = 'muety-seo-jsonld';
    let scriptEl = document.head.querySelector(`#${scriptId}`) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl && scriptEl.parentNode) {
      scriptEl.parentNode.removeChild(scriptEl);
    }
  }, [title, description, canonicalPath, ogType, ogImage, price, currency, JSON.stringify(jsonLd)]);
}

