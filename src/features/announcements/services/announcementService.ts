import { StoreAnnouncement, CreateAnnouncementInput, UpdateAnnouncementInput } from '../types';
import { db } from '@/lib/firebase/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

const STORAGE_KEY = 'muety_announcements_v1';

const INITIAL_ANNOUNCEMENTS: StoreAnnouncement[] = [
  {
    id: 'ann-01',
    title: 'Diwali Festive Sale 2026',
    campaignLabel: 'ROYAL FESTIVE EDIT 2026',
    message: '25% Off on Salem Handlooms • Flat ₹89 Delivery Nationwide',
    couponCode: 'DIWALI25',
    ctaText: 'Shop Edit →',
    ctaLink: '/products',
    isActive: true,
    displayOrder: 1,
    backgroundColor: '#4a0e2e',
    textColor: '#ffffff',
    accentColor: '#facc15',
    hasCountdown: true,
    countdownEndTime: new Date(Date.now() + 4 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z'
  },
  {
    id: 'ann-02',
    title: 'Muety Atelier Pure Silk Mark Certification',
    campaignLabel: 'SILK MARK INDIA',
    message: '100% Pure Mulberry Silk & 24K Certified Gold Zari Handcrafted on Heritage Pit Looms',
    ctaText: 'Explore Atelier →',
    ctaLink: '/about',
    isActive: false,
    displayOrder: 2,
    backgroundColor: '#3b0a24',
    textColor: '#ffffff',
    accentColor: '#eab308',
    hasCountdown: false,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z'
  },
  {
    id: 'ann-03',
    title: 'Courier Shipping Guarantee',
    campaignLabel: 'MUETY DIRECT',
    message: 'Insured Courier Delivery Flat ₹89 Across All Pincodes in India',
    ctaText: 'View Policies →',
    ctaLink: '/shipping',
    isActive: false,
    displayOrder: 3,
    backgroundColor: '#4a0e2e',
    textColor: '#ffffff',
    accentColor: '#facc15',
    hasCountdown: false,
    createdAt: '2026-10-03T00:00:00Z',
    updatedAt: '2026-10-03T00:00:00Z'
  }
];

class AnnouncementService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: ((items: StoreAnnouncement[]) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('muety_announcements_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && Array.isArray(event.data)) {
            this.setLocal(event.data, false);
          }
        };
      } catch (e) {
        // Fallback
      }
    }

    // Initial server fetch in background
    this.fetchFromServer().catch(() => {});
  }

  private getLocal(): StoreAnnouncement[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse local announcements:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_ANNOUNCEMENTS));
  }

  private setLocal(items: StoreAnnouncement[], broadcast: boolean = true): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch (e) {
      console.warn('Failed to save local announcements:', e);
    }

    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(items);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_announcements_updated', { detail: items }));
    }

    this.listeners.forEach(cb => cb(items));
  }

  private async fetchFromServer(): Promise<StoreAnnouncement[] | null> {
    try {
      if (typeof fetch === 'undefined') return null;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.announcements) && data.announcements.length > 0) {
          this.setLocal(data.announcements, false);
          return data.announcements;
        }
      }
    } catch {
      // Offline, network change, or server unreachable
    }
    return null;
  }

  private async postToServer(announcements: StoreAnnouncement[]): Promise<void> {
    try {
      if (typeof fetch === 'undefined') return;
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcements })
      });
    } catch (err) {
      // Offline fallback
    }
  }

  getAllAnnouncements(): StoreAnnouncement[] {
    return this.getLocal().sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getAnnouncements(): StoreAnnouncement[] {
    return this.getAllAnnouncements();
  }

  getActiveAnnouncements(): StoreAnnouncement[] {
    const now = new Date().getTime();
    return this.getAllAnnouncements().filter(ann => {
      if (!ann.isActive) return false;
      if (ann.startDate && new Date(ann.startDate).getTime() > now) return false;
      if (ann.endDate && new Date(ann.endDate).getTime() < now) return false;
      return true;
    });
  }

  async createAnnouncement(input: CreateAnnouncementInput): Promise<StoreAnnouncement> {
    const id = `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const newAnn: StoreAnnouncement = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now
    };

    const current = this.getLocal();
    const updated = [...current, newAnn];
    this.setLocal(updated);
    this.postToServer(updated);

    if (db) {
      try {
        await setDoc(doc(db, 'announcements', id), newAnn, { merge: true });
      } catch (err) {
        console.warn('Firestore announcement save note:', err);
      }
    }

    return newAnn;
  }

  async updateAnnouncement(id: string, input: UpdateAnnouncementInput): Promise<StoreAnnouncement | null> {
    const current = this.getLocal();
    const idx = current.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const updatedAnn: StoreAnnouncement = {
      ...current[idx],
      ...input,
      updatedAt: new Date().toISOString()
    };

    current[idx] = updatedAnn;
    this.setLocal(current);
    this.postToServer(current);

    if (db) {
      try {
        await setDoc(doc(db, 'announcements', id), updatedAnn, { merge: true });
      } catch (err) {
        console.warn('Firestore announcement update note:', err);
      }
    }

    return updatedAnn;
  }

  async toggleActive(id: string): Promise<StoreAnnouncement | null> {
    const current = this.getLocal();
    const target = current.find(a => a.id === id);
    if (!target) return null;
    return this.updateAnnouncement(id, { isActive: !target.isActive });
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const current = this.getLocal();
    const filtered = current.filter(a => a.id !== id);
    this.setLocal(filtered);
    this.postToServer(filtered);

    if (db) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (err) {
        console.warn('Firestore announcement delete note:', err);
      }
    }

    return true;
  }

  async reorderAnnouncements(orderedIds: string[]): Promise<StoreAnnouncement[]> {
    const current = this.getLocal();
    const idMap = new Map(current.map(a => [a.id, a]));
    const updated: StoreAnnouncement[] = [];

    orderedIds.forEach((id, idx) => {
      const item = idMap.get(id);
      if (item) {
        const reordered = { ...item, displayOrder: idx + 1, updatedAt: new Date().toISOString() };
        updated.push(reordered);
        idMap.delete(id);
      }
    });

    Array.from(idMap.values()).forEach((item, idx) => {
      updated.push({ ...item, displayOrder: orderedIds.length + idx + 1 });
    });

    this.setLocal(updated);
    this.postToServer(updated);

    if (db) {
      try {
        for (const item of updated) {
          await setDoc(doc(db, 'announcements', item.id), item, { merge: true });
        }
      } catch (err) {
        console.warn('Firestore reorder batch note:', err);
      }
    }

    return updated;
  }

  subscribeToAnnouncements(callback: (announcements: StoreAnnouncement[]) => void): Unsubscribe {
    this.listeners.push(callback);
    callback(this.getAllAnnouncements());

    // 1. Fetch from server immediately to guarantee cross-browser synchronization
    this.fetchFromServer().then((srv) => {
      if (srv) callback(srv);
    });

    // 2. Poll server periodically for cross-browser live updates when tab is active
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      this.fetchFromServer();
    }, 12000);

    // 3. Tab visibility / window focus instant re-sync
    const handleFocus = () => {
      this.fetchFromServer();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleFocus);
    }

    // 4. Firestore real-time onSnapshot listener
    let firestoreUnsub: Unsubscribe | undefined;
    if (db) {
      try {
        firestoreUnsub = onSnapshot(collection(db, 'announcements'), (snapshot) => {
          if (!snapshot.empty) {
            const cloud: StoreAnnouncement[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data() as StoreAnnouncement;
              if (data && (data.id || docSnap.id)) {
                cloud.push({ ...data, id: docSnap.id || data.id });
              }
            });
            cloud.sort((a, b) => a.displayOrder - b.displayOrder);
            this.setLocal(cloud, false);
            callback(cloud);
          } else {
            // Seed Firestore with initial announcements if empty
            if (db) {
              const firestoreDb = db;
              INITIAL_ANNOUNCEMENTS.forEach(ann => {
                setDoc(doc(firestoreDb, 'announcements', ann.id), ann, { merge: true }).catch(() => {});
              });
            }
            callback(this.getAllAnnouncements());
          }

        }, (err) => {
          console.warn('Firestore announcements listener note:', err);
          callback(this.getAllAnnouncements());
        });
      } catch (err) {
        console.warn('Failed to attach Firestore announcements listener:', err);
      }
    }

    // 5. Local event listener
    const localHandler = () => callback(this.getAllAnnouncements());
    if (typeof window !== 'undefined') {
      window.addEventListener('muety_announcements_updated', localHandler);
    }

    return () => {
      clearInterval(pollInterval);
      this.listeners = this.listeners.filter(cb => cb !== callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('muety_announcements_updated', localHandler);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleFocus);
      }
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  }
}

export const announcementService = new AnnouncementService();
