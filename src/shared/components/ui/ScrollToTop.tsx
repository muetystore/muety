import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Automatically scrolls window to top on forward route change (PUSH/REPLACE),
 * but preserves scroll position on back/forward browser history navigation (POP)
 * and when returning to catalog or admin products views with saved scroll state.
 * Also reports client-side SPA route transitions to Meta Pixel (fbq).
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();

  // Enforce manual browser scroll restoration to prevent Chrome from prematurely
  // jumping active PDP pages to previous scroll coordinates before route transitions finish.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {}
    }
  }, []);

  // Track PageView in Meta Pixel on client-side SPA route changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
      try {
        (window as any).fbq('track', 'PageView');
      } catch {}
    }
  }, [pathname, search]);

  useEffect(() => {
    // 1. When navigating backward via browser back button or navigate(-1) (POP),
    // preserve the previous scroll position so the user is returned to the exact spot.
    if (navType === 'POP') {
      return;
    }

    // 2. Do not force (0, 0) if returning to storefront catalog with saved scroll state
    if (pathname === '/products') {
      try {
        const raw = sessionStorage.getItem('muety_storefront_catalog_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.scrollY === 'number' && parsed.scrollY > 0) {
            return;
          }
        }
      } catch {}
    }

    // 3. Do not force (0, 0) if returning to Admin Products ERP with saved scroll state
    if (pathname === '/admin/products') {
      try {
        const raw = sessionStorage.getItem('muety_admin_products_view_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.scrollY === 'number' && parsed.scrollY > 0) {
            return;
          }
        }
      } catch {}
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname, search, navType]);

  return null;
};
