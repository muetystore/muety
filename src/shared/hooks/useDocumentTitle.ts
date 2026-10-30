import { useEffect } from 'react';
import { getCanonicalStoreUrl } from '@/shared/utils/domainRouting';

/**
 * Sets document title according to MUETY brand requirements:
 * Page title format: MUETY | [Page Name]
 * Dynamically keeps the canonical URL tag synchronized to store.muety.in
 */
export function useDocumentTitle(pageName?: string, path?: string) {
  useEffect(() => {
    if (pageName) {
      document.title = `MUETY | ${pageName}`;
    } else {
      document.title = 'MUETY | Modern Luxury E-Commerce';
    }

    if (typeof document !== 'undefined') {
      const canonicalPath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
      const canonicalHref = getCanonicalStoreUrl(canonicalPath);
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonicalHref);
    }
  }, [pageName, path]);
}
