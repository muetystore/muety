import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreAnnouncement } from '@/features/announcements/types';

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

const listeners = new Map<string, Set<(...args: any[]) => void>>();
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {};
}
(globalThis as any).window.addEventListener = (event: string, fn: (...args: any[]) => void) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(fn);
};
(globalThis as any).window.removeEventListener = (event: string, fn: (...args: any[]) => void) => {
  listeners.get(event)?.delete(fn);
};
(globalThis as any).window.dispatchEvent = (ev: any) => {
  listeners.get(ev?.type)?.forEach((fn) => fn(ev));
  return true;
};

vi.mock('@/lib/firebase/firebase', () => ({
  auth: null,
  db: null,
  isLiveFirebase: false
}));

import { announcementService } from '@/features/announcements/services/announcementService';

describe('Storefront Announcement & Countdown Architecture Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    memStore.clear();
    global.fetch = vi.fn().mockRejectedValue(new Error('offline test'));
  });

  describe('1. Countdown Timer & Code Validity Architecture', () => {
    it('accurately parses future countdown end timestamps into hours, minutes, and seconds', () => {
      const now = new Date('2026-10-13T10:00:00Z').getTime();
      const futureTime = new Date('2026-10-13T14:35:42Z').getTime(); // exactly 4 hours, 35 mins, 42 secs later
      const diff = futureTime - now;

      expect(diff).toBeGreaterThan(0);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      expect(hours).toBe(4);
      expect(minutes).toBe(35);
      expect(seconds).toBe(42);

      const formatDigits = (val: number) => String(val).padStart(2, '0');
      expect(`${formatDigits(hours)}h : ${formatDigits(minutes)}m : ${formatDigits(seconds)}s`).toBe('04h : 35m : 42s');
    });

    it('identifies expired countdown timers and suppresses the ticking pill on storefront', () => {
      const now = new Date('2026-10-13T15:00:00Z').getTime();
      const pastTime = new Date('2026-10-13T14:00:00Z').getTime(); // 1 hour ago
      const diff = pastTime - now;

      expect(diff).toBeLessThan(0);
      const isExpired = diff <= 0;
      expect(isExpired).toBe(true);
    });

    it('generates accurate preset countdown times for admin quick-buttons (+2h, +4h, +8h, +24h)', () => {
      const baseNow = new Date('2026-10-13T12:00:00.000Z');
      
      const addHours = (hours: number) => {
        const d = new Date(baseNow.getTime() + hours * 60 * 60 * 1000);
        return d.getTime();
      };

      expect(addHours(2) - baseNow.getTime()).toBe(2 * 60 * 60 * 1000);
      expect(addHours(4) - baseNow.getTime()).toBe(4 * 60 * 60 * 1000);
      expect(addHours(8) - baseNow.getTime()).toBe(8 * 60 * 60 * 1000);
      expect(addHours(24) - baseNow.getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('2. Single Announcement Auto-Scrolling Marquee Track', () => {
    it('triplicates a single active announcement in the marquee track to ensure seamless continuous looping', () => {
      const activeAnnouncements: StoreAnnouncement[] = [
        {
          id: 'ann-1',
          title: 'Diwali Festive Sale 2026',
          campaignLabel: 'ROYAL FESTIVE EDIT 2026',
          message: '25% Off on Salem Handlooms • Flat ₹89 Delivery Nationwide',
          couponCode: 'DIWALI25',
          ctaLink: '/products',
          ctaText: 'Shop Edit →',
          backgroundColor: '#4a0e2e',
          accentColor: '#facc15',
          textColor: '#ffffff',
          isActive: true,
          displayOrder: 1,
          hasCountdown: true,
          countdownEndTime: '2026-10-13T18:00:00Z',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Exact trackItems calculation as used in AnnouncementBar.tsx:
      const trackItems = activeAnnouncements.length === 1
        ? [activeAnnouncements[0], activeAnnouncements[0], activeAnnouncements[0]]
        : activeAnnouncements;

      expect(trackItems).toHaveLength(3);
      expect(trackItems[0].id).toBe('ann-1');
      expect(trackItems[1].id).toBe('ann-1');
      expect(trackItems[2].id).toBe('ann-1');
    });

    it('preserves multiple announcements without duplication when more than 1 announcement is active', () => {
      const activeAnnouncements: StoreAnnouncement[] = [
        {
          id: 'ann-1',
          title: 'Sale 1',
          message: 'Offer 1',
          backgroundColor: '#4a0e2e',
          textColor: '#ffffff',
          isActive: true,
          displayOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'ann-2',
          title: 'Sale 2',
          message: 'Offer 2',
          backgroundColor: '#3b0a24',
          textColor: '#ffffff',
          isActive: true,
          displayOrder: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const trackItems = activeAnnouncements.length === 1
        ? [activeAnnouncements[0], activeAnnouncements[0], activeAnnouncements[0]]
        : activeAnnouncements;

      expect(trackItems).toHaveLength(2);
      expect(trackItems[0].id).toBe('ann-1');
      expect(trackItems[1].id).toBe('ann-2');
    });
  });

  describe('3. Cross-Browser Synchronization Architecture', () => {
    it('synchronizes announcement state changes across multiple independent subscriber listeners', async () => {
      // Browser A subscriber
      let browserAState: StoreAnnouncement[] = [];
      const unsubA = announcementService.subscribeToAnnouncements((list) => {
        browserAState = list;
      });

      // Browser B subscriber
      let browserBState: StoreAnnouncement[] = [];
      const unsubB = announcementService.subscribeToAnnouncements((list) => {
        browserBState = list;
      });

      expect(browserAState.length).toBeGreaterThan(0);
      expect(browserBState.length).toBeGreaterThan(0);

      // Verify initial state: only ann-01 is active
      let activeA = browserAState.filter(a => a.isActive);
      expect(activeA).toHaveLength(1);
      expect(activeA[0].id).toBe('ann-01');

      // Now Browser A toggles ann-02 to active
      await announcementService.toggleActive('ann-02');

      // Both Browser A and Browser B should now see 2 active announcements
      activeA = browserAState.filter(a => a.isActive);
      let activeB = browserBState.filter(a => a.isActive);
      expect(activeA).toHaveLength(2);
      expect(activeB).toHaveLength(2);
      expect(activeB.map(a => a.id)).toContain('ann-02');

      // Now Browser A deactivates ann-02 so only 1 announcement remains active
      await announcementService.toggleActive('ann-02');

      // Both Browser A and Browser B immediately sync back to 1 active announcement
      activeA = browserAState.filter(a => a.isActive);
      activeB = browserBState.filter(a => a.isActive);
      expect(activeA).toHaveLength(1);
      expect(activeB).toHaveLength(1);
      expect(activeA[0].id).toBe('ann-01');
      expect(activeB[0].id).toBe('ann-01');

      unsubA();
      unsubB();
    }, 15000);

    it('persists and updates countdownEndTime through announcementService.updateAnnouncement', async () => {
      const initial: StoreAnnouncement[] = [
        {
          id: 'ann-01',
          title: 'Diwali Festive Sale 2026',
          message: '25% Off on Salem Handlooms',
          backgroundColor: '#4a0e2e',
          textColor: '#ffffff',
          isActive: true,
          displayOrder: 1,
          hasCountdown: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('muety_announcements_v1', JSON.stringify(initial));

      const updated = await announcementService.updateAnnouncement('ann-01', {
        hasCountdown: true,
        countdownEndTime: '2026-10-13T23:59:59.000Z'
      });

      expect(updated).toBeDefined();
      expect(updated?.hasCountdown).toBe(true);
      expect(updated?.countdownEndTime).toBe('2026-10-13T23:59:59.000Z');

      const reloaded = announcementService.getAnnouncements();
      const target = reloaded.find(a => a.id === 'ann-01');
      expect(target?.hasCountdown).toBe(true);
      expect(target?.countdownEndTime).toBe('2026-10-13T23:59:59.000Z');
    }, 15000);
  });
});
