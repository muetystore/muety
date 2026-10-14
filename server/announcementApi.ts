import fs from 'fs';
import path from 'path';
import { getFirebaseAdminApp } from './firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

export interface ServerAnnouncement {
  id: string;
  title: string;
  campaignLabel?: string;
  message: string;
  couponCode?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
  displayOrder: number;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  hasCountdown?: boolean;
  countdownEndTime?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

const INITIAL_ANNOUNCEMENTS: ServerAnnouncement[] = [
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
    title: 'Salem Atelier Pure Silk Mark Certification',
    campaignLabel: 'SILK MARK INDIA',
    message: '100% Pure Mulberry Silk & 24K Certified Gold Zari Handcrafted on Heritage Pit Looms',
    ctaText: 'Explore Atelier →',
    ctaLink: '/about',
    isActive: true,
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
    isActive: true,
    displayOrder: 3,
    backgroundColor: '#4a0e2e',
    textColor: '#ffffff',
    accentColor: '#facc15',
    hasCountdown: false,
    createdAt: '2026-10-03T00:00:00Z',
    updatedAt: '2026-10-03T00:00:00Z'
  }
];

const STORE_FILE = path.resolve(process.cwd(), 'server', 'announcements_store.json');

function readStore(): ServerAnnouncement[] {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[AnnouncementApi] Read store note:', err);
  }
  return INITIAL_ANNOUNCEMENTS;
}

function writeStore(items: ServerAnnouncement[]): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AnnouncementApi] Write store note:', err);
  }
}

export async function handleGetAnnouncements(): Promise<{ success: true; announcements: ServerAnnouncement[] }> {
  // Try Firestore if available
  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    try {
      const db = getFirestore(adminApp);
      const snapshot = await db.collection('announcements').get();
      if (!snapshot.empty) {
        const cloud: ServerAnnouncement[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as ServerAnnouncement;
          cloud.push({ ...data, id: docSnap.id || data.id });
        });
        cloud.sort((a, b) => a.displayOrder - b.displayOrder);
        writeStore(cloud);
        return { success: true, announcements: cloud };
      }
    } catch (e) {
      // Fallback to local store
    }
  }

  const list = readStore();
  return { success: true, announcements: list };
}

export async function handleSaveAnnouncements(payload: { announcements?: ServerAnnouncement[]; update?: ServerAnnouncement }): Promise<{ success: boolean; announcements: ServerAnnouncement[] }> {
  let current = readStore();

  if (Array.isArray(payload.announcements)) {
    current = payload.announcements;
  } else if (payload.update) {
    const idx = current.findIndex(a => a.id === payload.update!.id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...payload.update, updatedAt: new Date().toISOString() };
    } else {
      current.push(payload.update);
    }
  }

  writeStore(current);

  // Sync to Firestore in background if available
  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    try {
      const db = getFirestore(adminApp);
      const batch = db.batch();
      for (const item of current) {
        const ref = db.collection('announcements').doc(item.id);
        batch.set(ref, item, { merge: true });
      }
      await batch.commit();
    } catch (e) {
      console.warn('[AnnouncementApi] Firestore sync note:', e);
    }
  }

  return { success: true, announcements: current };
}
