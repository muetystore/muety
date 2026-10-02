import { useEffect } from 'react';

/**
 * Sets document title according to MUETY brand requirements:
 * Page title format: MUETY | [Page Name]
 */
export function useDocumentTitle(pageName?: string) {
  useEffect(() => {
    if (pageName) {
      document.title = `MUETY | ${pageName}`;
    } else {
      document.title = 'MUETY | Modern Luxury E-Commerce';
    }
  }, [pageName]);
}
