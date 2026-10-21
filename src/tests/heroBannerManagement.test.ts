import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeroBanner } from '@/features/banners/types';

// In-memory mock for environments without browser globals
const memStore = new Map<string, string>();
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => memStore.set(k, String(v)),
    removeItem: (k: string) => memStore.delete(k),
    clear: () => memStore.clear(),
  };
}

vi.mock('@/lib/firebase/firebase', () => ({
  auth: null,
  db: null,
  isLiveFirebase: false
}));

import { bannerService, DEFAULT_BANNERS } from '@/features/banners/services/bannerService';

describe('Hero Banner Management & Storefront Architecture Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    memStore.clear();
  });

  describe('1. Default Banners & Initialization', () => {
    it('initializes with default heritage banners when storage is empty', () => {
      const banners = bannerService.getBanners();
      expect(banners.length).toBeGreaterThanOrEqual(2);
      expect(banners[0].id).toBe('dasara-campaign');
      expect(banners[0].image).toBe('/dasara_campaign_banner_with_text.jpg');
      expect(banners[1].id).toBe('diwali-hero');
    });

    it('returns only active banners for storefront carousel display', () => {
      const active = bannerService.getActiveBanners();
      expect(active.length).toBeGreaterThan(0);
      active.forEach(banner => {
        expect(banner.isActive).toBe(true);
      });
    });
  });

  describe('2. Banner CRUD Operations', () => {
    it('creates a new hero banner with auto-generated id and timestamps', async () => {
      const newBanner = await bannerService.createBanner({
        title: 'Salem Silk Summer Capsule',
        subtitle: 'Handloomed lightweight tissue zari sarees',
        image: 'https://res.cloudinary.com/muety/image/upload/v1/banners/summer.jpg',
        link: '/category/pure-silk-sarees',
        alt: 'Salem Silk Summer Capsule Saree',
        buttonText: 'View Summer Edit',
        badgeText: 'SUMMER 2026',
        objectPosition: 'center 35%',
        isActive: true,
        displayOrder: 3
      });

      expect(newBanner.id).toBeDefined();
      expect(newBanner.title).toBe('Salem Silk Summer Capsule');
      expect(newBanner.createdAt).toBeDefined();

      const all = bannerService.getBanners();
      const found = all.find(b => b.id === newBanner.id);
      expect(found).toBeDefined();
      expect(found?.image).toBe('https://res.cloudinary.com/muety/image/upload/v1/banners/summer.jpg');
    });

    it('creates banner successfully when optional fields like subtitle are omitted or undefined', async () => {
      const bannerWithoutSubtitle = await bannerService.createBanner({
        title: 'Minimal Festive Banner',
        subtitle: undefined,
        image: '/minimal.jpg',
        link: '/products',
        alt: 'Minimal',
        buttonText: undefined,
        badgeText: 'FESTIVE EDIT',
        mobileImage: undefined,
        isActive: true,
        displayOrder: 4
      });

      expect(bannerWithoutSubtitle.id).toBeDefined();
      expect(bannerWithoutSubtitle.title).toBe('Minimal Festive Banner');
      expect(bannerWithoutSubtitle.badgeText).toBe('FESTIVE EDIT');

      const all = bannerService.getBanners();
      const found = all.find(b => b.id === bannerWithoutSubtitle.id);
      expect(found).toBeDefined();
    });

    it('updates existing banner fields cleanly', async () => {
      const banners = bannerService.getBanners();
      const first = banners[0];

      const updated = await bannerService.updateBanner(first.id, {
        title: 'Updated Dasara Gala Edit',
        buttonText: 'Explore Now',
        objectPosition: 'center top'
      });

      expect(updated.title).toBe('Updated Dasara Gala Edit');
      expect(updated.buttonText).toBe('Explore Now');
      expect(updated.objectPosition).toBe('center top');
      expect(updated.image).toBe(first.image); // preserved

      const fetched = bannerService.getBanners().find(b => b.id === first.id);
      expect(fetched?.title).toBe('Updated Dasara Gala Edit');
    });

    it('toggles banner active status between true and false', async () => {
      const banners = bannerService.getBanners();
      const first = banners[0];
      const initialStatus = first.isActive;

      const toggled = await bannerService.toggleBannerActive(first.id);
      expect(toggled.isActive).toBe(!initialStatus);

      const secondToggle = await bannerService.toggleBannerActive(first.id);
      expect(secondToggle.isActive).toBe(initialStatus);
    });

    it('deletes a banner and removes it from list', async () => {
      const created = await bannerService.createBanner({
        title: 'Temporary Flash Sale',
        image: '/temp.jpg',
        link: '/products',
        alt: 'Temp',
        isActive: true,
        displayOrder: 99
      });

      expect(bannerService.getBanners().some(b => b.id === created.id)).toBe(true);

      const deleted = await bannerService.deleteBanner(created.id);
      expect(deleted).toBe(true);
      expect(bannerService.getBanners().some(b => b.id === created.id)).toBe(false);
    });
  });

  describe('3. Ordering & Sequence Management', () => {
    it('reorders banners according to specified id sequence', async () => {
      const banners = bannerService.getBanners();
      expect(banners.length).toBeGreaterThanOrEqual(2);

      const reversedIds = [banners[1].id, banners[0].id];
      const reordered = await bannerService.reorderBanners(reversedIds);

      expect(reordered[0].id).toBe(banners[1].id);
      expect(reordered[0].displayOrder).toBe(1);
      expect(reordered[1].id).toBe(banners[0].id);
      expect(reordered[1].displayOrder).toBe(2);
    });
  });

  describe('4. Subscription & Realtime Broadcast', () => {
    it('notifies registered listeners when banners change', async () => {
      let callbackCount = 0;
      let lastItems: HeroBanner[] = [];

      const unsub = bannerService.subscribeBanners((items) => {
        callbackCount++;
        lastItems = items;
      });

      expect(callbackCount).toBe(1); // initial sync

      await bannerService.createBanner({
        title: 'Subscriber Test Banner',
        image: '/sub.jpg',
        link: '/products',
        alt: 'Sub',
        isActive: true,
        displayOrder: 10
      });

      expect(callbackCount).toBeGreaterThanOrEqual(2);
      expect(lastItems.some(b => b.title === 'Subscriber Test Banner')).toBe(true);

      unsub();
    });
  });
});
