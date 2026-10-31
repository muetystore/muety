import { ContactInquiry, InquiryCategory, InquiryStatus } from '@/types';
import { db, isLiveFirebase } from '@/lib/firebase/firebase';
import { 
  collection,
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

const STORAGE_KEY = 'muety_inquiries_v1';

const withTimeout = <T>(promise: Promise<T>, ms = 3500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
};

class InquiryService {
  private channel: BroadcastChannel | null = null;
  private inquiriesCache: ContactInquiry[] = [];

  constructor() {
    this.initStorage();
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('muety_inquiries_channel');
      }
    } catch {
      // Ignore broadcast channel errors
    }
  }

  private initStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      } else {
        this.inquiriesCache = JSON.parse(existing);
      }
    } catch {
      // LocalStorage error fallback
    }
  }

  getInquiries(): ContactInquiry[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return this.inquiriesCache;
  }

  saveInquiries(inquiries: ContactInquiry[]) {
    this.inquiriesCache = inquiries;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('muety_inquiries_updated'));
        }
      }
      if (this.channel) {
        this.channel.postMessage({ type: 'INQUIRIES_UPDATED' });
      }
    } catch (e) {
      console.warn('LocalStorage save inquiries error:', e);
    }
  }

  subscribeToInquiries(
    callback: (inquiries: ContactInquiry[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Deliver immediate cache first
    callback(this.getInquiries());

    if (isLiveFirebase && db) {
      try {
        const colRef = collection(db, 'inquiries');
        const unsub = onSnapshot(colRef, (snapshot) => {
          const liveList: ContactInquiry[] = [];
          if (!snapshot.empty) {
            snapshot.forEach(docSnap => {
              const data = docSnap.data() as ContactInquiry;
              if (data) {
                liveList.push({
                  ...data,
                  id: docSnap.id || data.id
                });
              }
            });
          }

          // Merge live Firestore inquiries with any recent unsynced local inquiries
          const localInquiries = this.getInquiries();
          const mergedMap = new Map<string, ContactInquiry>();

          liveList.forEach(item => {
            mergedMap.set(item.id, item);
          });

          const now = Date.now();
          localInquiries.forEach(loc => {
            if (!mergedMap.has(loc.id)) {
              const age = now - new Date(loc.createdAt || 0).getTime();
              // Retain recent local entries that may be in flight
              if (age < 20000) {
                mergedMap.set(loc.id, loc);
              }
            }
          });

          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );

          this.saveInquiries(merged);
          callback(merged);
        }, (err) => {
          console.warn('[inquiryService] Firestore onSnapshot error on inquiries:', err?.message || err);
          if (onError) onError(err);
          else callback(this.getInquiries());
        });

        return unsub;
      } catch (err: any) {
        console.warn('[inquiryService] Subscription setup error:', err?.message || err);
        if (onError) onError(err);
      }
    }

    const handler = () => callback(this.getInquiries());
    window.addEventListener('muety_inquiries_updated', handler);
    return () => window.removeEventListener('muety_inquiries_updated', handler);
  }

  async submitInquiry(data: {
    name: string;
    email: string;
    phone?: string;
    category?: InquiryCategory;
    subject?: string;
    message: string;
  }): Promise<ContactInquiry> {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const inquiryNumber = `MUET-INQ-${randomNum}`;
    const now = new Date().toISOString();

    const newInquiry: ContactInquiry = {
      id: `inq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      inquiryNumber,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || '',
      category: data.category || 'general',
      subject: data.subject?.trim() || `Inquiry from ${data.name.trim()}`,
      message: data.message.trim(),
      status: 'unread',
      createdAt: now,
      updatedAt: now
    };

    const list = this.getInquiries();
    list.unshift(newInquiry);
    this.saveInquiries(list);

    if (isLiveFirebase && db) {
      try {
        const docRef = doc(db, 'inquiries', newInquiry.id);
        withTimeout(setDoc(docRef, newInquiry, { merge: true }), 4000)
          .then(() => {
            console.log(`MUETY Cloud: Inquiry #${inquiryNumber} synced to Firestore.`);
          })
          .catch((fbErr) => {
            console.warn('Firestore background inquiry write timeout/error:', fbErr?.message || fbErr);
          });
      } catch (err) {
        console.warn('Firestore write init error:', err);
      }
    }

    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || 'Not Provided',
        category: (data.category || 'general').replace('_', ' ').toUpperCase(),
        inquiry_reference: inquiryNumber,
        subject: newInquiry.subject,
        message: data.message.trim(),
        _replyto: data.email.trim(),
        _subject: `[MUETY Inquiry #${inquiryNumber}] ${newInquiry.subject} (From: ${data.name.trim()})`,
        _template: 'table',
        _captcha: 'false'
      };

      fetch('https://formsubmit.co/ajax/support@muety.in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch((err) => {
        console.warn('Background FormSubmit dispatch notice:', err);
      });
    } catch {
      // Fire-and-forget fallback
    }

    return newInquiry;
  }

  async updateStatus(id: string, status: InquiryStatus, adminNotes?: string): Promise<ContactInquiry | null> {
    const list = this.getInquiries();
    const idx = list.findIndex(i => i.id === id || i.inquiryNumber === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : list[idx].adminNotes,
      updatedAt: new Date().toISOString()
    };

    this.saveInquiries(list);

    if (isLiveFirebase && db) {
      try {
        const docRef = doc(db, 'inquiries', list[idx].id);
        withTimeout(
          updateDoc(docRef, {
            status,
            adminNotes: list[idx].adminNotes || '',
            updatedAt: list[idx].updatedAt
          }),
          3500
        ).catch(err => console.warn('Firestore status update error:', err));
      } catch (err) {
        console.warn('Firestore update init error:', err);
      }
    }

    return list[idx];
  }

  async archiveInquiry(id: string): Promise<ContactInquiry | null> {
    const list = this.getInquiries();
    const idx = list.findIndex(i => i.id === id || i.inquiryNumber === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      archived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveInquiries(list);

    if (isLiveFirebase && db) {
      try {
        const docRef = doc(db, 'inquiries', list[idx].id);
        withTimeout(
          setDoc(docRef, list[idx], { merge: true }),
          3500
        ).catch(err => console.warn('Firestore archive inquiry error:', err));
      } catch (err) {
        console.warn('Firestore archive inquiry init error:', err);
      }
    }

    return list[idx];
  }

  async unarchiveInquiry(id: string): Promise<ContactInquiry | null> {
    const list = this.getInquiries();
    const idx = list.findIndex(i => i.id === id || i.inquiryNumber === id);
    if (idx === -1) return null;

    const cleanInquiry: ContactInquiry = {
      ...list[idx],
      archived: false,
      updatedAt: new Date().toISOString()
    };
    delete cleanInquiry.archivedAt;

    list[idx] = cleanInquiry;
    this.saveInquiries(list);

    if (isLiveFirebase && db) {
      try {
        const payload: Record<string, any> = { ...cleanInquiry };
        delete payload.archivedAt;
        const docRef = doc(db, 'inquiries', list[idx].id);
        withTimeout(
          setDoc(docRef, payload, { merge: true }),
          3500
        ).catch(err => console.warn('Firestore unarchive inquiry error:', err));
      } catch (err) {
        console.warn('Firestore unarchive inquiry init error:', err);
      }
    }

    return list[idx];
  }

  async deleteInquiry(id: string): Promise<boolean> {
    // For user data privacy & customer record retention, archive instead of deleting
    await this.archiveInquiry(id);
    return true;
  }
}

export const inquiryService = new InquiryService();
