import { HeroBanner, CreateBannerInput, UpdateBannerInput } from '../types';
import { db, isLiveFirebase } from '@/lib/firebase/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

const STORAGE_KEY = 'muety_hero_banners_v1';

export const DEFAULT_BANNERS: HeroBanner[] = [
  {
    id: 'dasara-campaign',
    title: 'MUETY Dasara Festive Collection',
    subtitle: 'Tradition Meets Contemporary Atelier Elegance',
    image: '/dasara_campaign_banner_with_text.jpg',
    link: '/products',
    alt: 'MUETY Dasara Festive Collection - Tradition Meets Elegance',
    buttonText: 'Explore Edit',
    badgeText: 'ROYAL FESTIVE EDIT',
    objectPosition: 'center center',
    isActive: true,
    displayOrder: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'diwali-hero',
    title: 'Heritage Pure Mulberry Silk',
    subtitle: 'Salem Pit-Loom Weaves Handcrafted with Certified Tested Gold Zari',
    image: '/diwali_hero_banner.jpg',
    link: '/products',
    alt: 'MUETY Pure Mulberry Silk & Certified Gold Zari Sarees',
    buttonText: 'Shop Handlooms',
    badgeText: 'SILK MARK CERTIFIED',
    objectPosition: 'center 35%',
    isActive: true,
    displayOrder: 2,
    createdAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z'
  }
];

/**
 * Recursively cleans an object for Firestore by omitting any keys with `undefined` values.
 * Firestore setDoc throws an error if any field value is undefined.
 */
function cleanForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

class BannerService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: ((items: HeroBanner[]) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('muety_hero_banners_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && Array.isArray(event.data)) {
            this.setLocal(event.data, false);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization note:', e);
      }
    }
  }

  private getLocal(): HeroBanner[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BANNERS));
          return DEFAULT_BANNERS;
        }
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_BANNERS;
  }

  private setLocal(items: HeroBanner[], broadcast = true): void {
    const sorted = [...items].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      }
    } catch (e) {
      console.warn('Failed to persist hero banners to local storage:', e);
    }

    this.notifyListeners(sorted);

    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(sorted);
      } catch {}
    }
  }

  private notifyListeners(items: HeroBanner[]): void {
    this.listeners.forEach((l) => {
      try {
        l(items);
      } catch (e) {
        console.error('Error executing banner listener:', e);
      }
    });
  }

  public getBanners(): HeroBanner[] {
    return this.getLocal();
  }

  public getActiveBanners(): HeroBanner[] {
    const now = new Date().toISOString();
    return this.getLocal().filter((b) => {
      if (!b.isActive) return false;
      if (b.startDate && b.startDate > now) return false;
      if (b.endDate && b.endDate < now) return false;
      return true;
    });
  }

  public subscribeBanners(callback: (items: HeroBanner[]) => void): Unsubscribe {
    this.listeners.push(callback);
    callback(this.getLocal());

    let firestoreUnsub: Unsubscribe | null = null;
    if (db && isLiveFirebase) {
      try {
        const colRef = collection(db, 'banners');
        firestoreUnsub = onSnapshot(
          colRef,
          (snapshot) => {
            const cloudItems: HeroBanner[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as HeroBanner;
              if (data && data.id) {
                cloudItems.push(data);
              }
            });
            cloudItems.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            if (cloudItems.length > 0) {
              this.setLocal(cloudItems, true);
            }
          },
          (err) => {
            console.warn('Hero banners Firestore real-time listener note:', err);
          }
        );
      } catch (err) {
        console.warn('Failed to bind Firestore banners snapshot:', err);
      }
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  }

  public async createBanner(input: CreateBannerInput): Promise<HeroBanner> {
    const existing = this.getLocal();
    const id = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newBanner: HeroBanner = {
      ...input,
      id,
      displayOrder: input.displayOrder !== undefined ? input.displayOrder : existing.length + 1,
      isActive: input.isActive !== undefined ? input.isActive : true,
      createdAt: now,
      updatedAt: now
    };

    const updated = [...existing, newBanner];
    this.setLocal(updated, true);

    if (db && isLiveFirebase) {
      try {
        const firestorePayload = cleanForFirestore(newBanner);
        await setDoc(doc(db, 'banners', id), firestorePayload);
      } catch (err) {
        console.error('Failed to save banner to Firestore:', err);
        throw new Error(`Cloud database sync failed: ${err instanceof Error ? err.message : 'Unknown Firestore error'}`);
      }
    }

    return newBanner;
  }

  public async updateBanner(id: string, input: UpdateBannerInput): Promise<HeroBanner> {
    const existing = this.getLocal();
    const idx = existing.findIndex((b) => b.id === id);
    if (idx === -1) {
      throw new Error(`Banner with id ${id} not found.`);
    }

    const updatedBanner: HeroBanner = {
      ...existing[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...existing];
    updatedList[idx] = updatedBanner;
    this.setLocal(updatedList, true);

    if (db && isLiveFirebase) {
      try {
        const firestorePayload = cleanForFirestore(updatedBanner);
        await setDoc(doc(db, 'banners', id), firestorePayload, { merge: true });
      } catch (err) {
        console.error('Failed to update banner in Firestore:', err);
        throw new Error(`Cloud database sync failed: ${err instanceof Error ? err.message : 'Unknown Firestore error'}`);
      }
    }

    return updatedBanner;
  }

  public async deleteBanner(id: string): Promise<boolean> {
    const existing = this.getLocal();
    const filtered = existing.filter((b) => b.id !== id);
    this.setLocal(filtered, true);

    if (db && isLiveFirebase) {
      try {
        await deleteDoc(doc(db, 'banners', id));
      } catch (err) {
        console.error('Failed to delete banner from Firestore:', err);
        throw new Error(`Cloud database sync failed: ${err instanceof Error ? err.message : 'Unknown Firestore error'}`);
      }
    }

    return true;
  }

  public async toggleBannerActive(id: string): Promise<HeroBanner> {
    const existing = this.getLocal();
    const target = existing.find((b) => b.id === id);
    if (!target) {
      throw new Error(`Banner with id ${id} not found.`);
    }
    return this.updateBanner(id, { isActive: !target.isActive });
  }

  public async reorderBanners(orderedIds: string[]): Promise<HeroBanner[]> {
    const existing = this.getLocal();
    const updated = existing.map((item) => {
      const newIndex = orderedIds.indexOf(item.id);
      return {
        ...item,
        displayOrder: newIndex !== -1 ? newIndex + 1 : item.displayOrder
      };
    });

    const sorted = [...updated].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    this.setLocal(sorted, true);

    if (db && isLiveFirebase) {
      try {
        for (const item of sorted) {
          const firestorePayload = cleanForFirestore(item);
          await setDoc(doc(db, 'banners', item.id), firestorePayload, { merge: true });
        }
      } catch (err) {
        console.error('Failed to reorder banners in Firestore:', err);
        throw new Error(`Cloud database sync failed: ${err instanceof Error ? err.message : 'Unknown Firestore error'}`);
      }
    }

    return sorted;
  }
}

export const bannerService = new BannerService();
