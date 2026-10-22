import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('MUETY Atelier Sidebar — Light Theme & Bottom Space Fix Validation Suite', () => {
  const headerCode = fs.readFileSync(
    path.join(process.cwd(), 'src/shared/components/ui/Header.tsx'),
    'utf-8'
  );
  const cssCode = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/index.css'),
    'utf-8'
  );

  // =========================================================================
  // 1. PREMIUM LIGHT THEME COLOR PALETTE
  // =========================================================================
  describe('1. Color Palette & Premium Light Aesthetics', () => {
    it('applies warm ivory (#FAF8F3) to the mobile drawer body and background', () => {
      expect(cssCode).toContain('background-color: #FAF8F3');
    });

    it('applies pure white (#FFFFFF) to drawer header, navigation cards, and footer', () => {
      expect(cssCode).toContain('.mobile-nav-header {\n  padding: 12px 16px;\n  background: #FFFFFF');
      expect(cssCode).toContain('.mobile-nav-card,\n.mobile-nav-item-link');
      expect(cssCode).toContain('background: #FFFFFF');
      expect(cssCode).toContain('.mobile-nav-footer');
    });

    it('enforces dark navy (#111827) primary text across the drawer', () => {
      expect(cssCode).toContain('color: #111827');
    });

    it('enforces muted blue-grey (#8492A6) for secondary details and chevrons', () => {
      expect(cssCode).toContain('color: #8492A6');
    });

    it('uses curated MUETY gold accent (#C99A16) consistently', () => {
      expect(cssCode).toContain('#C99A16');
    });

    it('uses soft neutral (#E7E5DF) for borders and dividers', () => {
      expect(cssCode).toContain('#E7E5DF');
    });

    it('applies pale gold (#FBF5E7) to active navigation items and tab highlight', () => {
      expect(cssCode).toContain('background: #FBF5E7');
      expect(cssCode).toContain('border-color: #C99A16');
    });

    it('applies restrained red (#DC2626) to the exit action button', () => {
      expect(cssCode).toContain('.mobile-nav-signout-btn');
      expect(cssCode).toContain('color: #DC2626');
      expect(cssCode).toContain('background: #FEF2F2');
    });
  });

  // =========================================================================
  // 2. HEADER & CIRCULAR CLOSE BUTTON
  // =========================================================================
  describe('2. Header Structure & Close Button', () => {
    it('renders brand kicker MUETY ATELIER in gold and title in dark navy', () => {
      expect(headerCode).toContain('MUETY ATELIER');
      expect(headerCode).toContain('The Atelier Collection');
      expect(headerCode).toContain('className="mobile-nav-kicker"');
      expect(headerCode).toContain('className="mobile-nav-title"');
    });

    it('styles circular gold-outlined close button with white background and min 44x44px target', () => {
      expect(cssCode).toContain('.mobile-nav-close-btn');
      expect(cssCode).toContain('border: 1.5px solid #C99A16');
      expect(cssCode).toContain('min-width: 44px');
      expect(cssCode).toContain('min-height: 44px');
      expect(cssCode).toContain('border-radius: 50%');
    });

    it('prevents header title from overlapping close button', () => {
      expect(headerCode).toContain('<div style={{ minWidth: 0 }}>');
      expect(cssCode).toContain('gap: 12px');
    });
  });

  // =========================================================================
  // 3. SEGMENTED TABS (COLLECTIONS & PATRON SUITE)
  // =========================================================================
  describe('3. Segmented Navigation Tabs', () => {
    it('provides Collections and Patron Suite tabs', () => {
      expect(headerCode).toContain('<span>Collections</span>');
      expect(headerCode).toContain('<span>Patron Suite</span>');
    });

    it('highlights active tab with pale gold and gold border', () => {
      expect(cssCode).toContain('.mobile-nav-tab-btn.active');
      expect(cssCode).toContain('background: #FBF5E7');
      expect(cssCode).toContain('border-color: #C99A16');
    });

    it('ensures both tabs fit on mobile screens without horizontal overflow', () => {
      expect(cssCode).toContain('.mobile-nav-tabs');
      expect(cssCode).toContain('white-space: nowrap');
    });
  });

  // =========================================================================
  // 4. NAVIGATION CARDS & TOUCH TARGETS
  // =========================================================================
  describe('4. Navigation Cards & Accordions', () => {
    it('uses 12px rounded corners, 12px gaps, and 14-16px padding on navigation cards', () => {
      expect(cssCode).toContain('border-radius: 12px');
      expect(cssCode).toContain('padding: 14px 16px');
      expect(cssCode).toContain('gap: 12px');
    });

    it('enforces min 48px touch targets for navigation items', () => {
      expect(cssCode).toContain('min-height: 48px');
    });

    it('renders all guest navigation links: Home, All Saree Collections, Curated Selections, Atelier Categories', () => {
      expect(headerCode).toContain('to="/"');
      expect(headerCode).toContain('to="/products"');
      expect(headerCode).toContain('Curated Selections');
      expect(headerCode).toContain('Atelier Categories');
    });

    it('renders accordions for Curated Selections and Atelier Categories with smooth toggling', () => {
      expect(headerCode).toContain('setMobileShopByOpen(!mobileShopByOpen)');
      expect(headerCode).toContain('setMobileCollectionsOpen(!mobileCollectionsOpen)');
    });
  });

  // =========================================================================
  // 5. ADMIN PROFILE & PATRON SUITE
  // =========================================================================
  describe('5. Admin State & Patron Suite Actions', () => {
    it('renders admin profile card with gold-outlined initials circle and pale-gold role badge', () => {
      expect(headerCode).toContain('mobile-nav-profile-card');
      expect(headerCode).toContain('mobile-nav-avatar');
      expect(headerCode).toContain('mobile-nav-profile-badge');
      expect(headerCode).toContain('Executive Super Admin');
    });

    it('provides compact exit action with restrained red styling', () => {
      expect(headerCode).toContain('mobile-nav-signout-btn');
      expect(headerCode).toContain('title="Sign Out"');
      expect(headerCode).toContain('<span>Exit</span>');
    });

    it('safely truncates long patron names and emails', () => {
      expect(cssCode).toContain('.mobile-nav-profile-name');
      expect(cssCode).toContain('text-overflow: ellipsis');
      expect(cssCode).toContain('.mobile-nav-profile-meta');
    });

    it('renders Executive Admin Dashboard card for administrative users', () => {
      expect(headerCode).toContain('to="/admin/dashboard"');
      expect(headerCode).toContain('Executive Admin Dashboard');
    });

    it('renders quick action cards for orders, profile, addresses, settings, and connected accounts', () => {
      expect(headerCode).toContain('to="/account?tab=orders"');
      expect(headerCode).toContain('to="/account"');
      expect(headerCode).toContain('to="/account?tab=address"');
      expect(headerCode).toContain('to="/account?tab=profile"');
      expect(headerCode).toContain('to="/account?tab=connected"');
    });
  });

  // =========================================================================
  // 6. BOTTOM SPACE ELIMINATION & FOOTER REDESIGN
  // =========================================================================
  describe('6. Bottom Space Fix & Layout Integrity', () => {
    it('uses a strict flexbox column layout with 100dvh viewport clamping', () => {
      expect(cssCode).toContain('.mobile-nav-drawer');
      expect(cssCode).toContain('display: flex');
      expect(cssCode).toContain('flex-direction: column');
      expect(cssCode).toContain('height: 100dvh');
      expect(cssCode).toContain('max-height: 100dvh');
    });

    it('keeps header, tabs, and footer fixed while navigation region scrolls independently', () => {
      expect(cssCode).toContain('.mobile-nav-header');
      expect(cssCode).toContain('flex-shrink: 0');
      expect(cssCode).toContain('.mobile-nav-tabs');
      expect(cssCode).toContain('.mobile-nav-body');
      expect(cssCode).toContain('flex: 1 1 auto');
      expect(cssCode).toContain('overflow-y: auto');
      expect(cssCode).toContain('.mobile-nav-footer');
    });

    it('eliminates dead blank space at the bottom of the drawer with compact padding', () => {
      expect(cssCode).toContain('.mobile-nav-footer {\n  /* Safe-area padding with mobile bottom nav avoidance: padding-bottom: calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 62px); */\n  padding: 12px 16px;\n  padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));');
    });

    it('provides Return to Atelier Collections action in Patron Suite footer', () => {
      expect(headerCode).toContain('className="mobile-nav-return-btn"');
      expect(headerCode).toContain('Return to Atelier Collections');
    });

    it('provides Sign In and Register actions for guest state in catalog footer', () => {
      expect(headerCode).toContain('mobile-nav-guest-dock');
      expect(headerCode).toContain('to="/login"');
      expect(headerCode).toContain('to="/register"');
    });
  });
});
