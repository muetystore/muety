import { ContactInquiry, InquiryCategory, InquiryStatus } from '@/types';
import { db, isLiveFirebase } from '@/lib/firebase/firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

const STORAGE_KEY = 'muety_inquiries_v1';

const withTimeout = <T>(promise: Promise<T>, ms = 3000): Promise<T> => {
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

  private saveInquiries(inquiries: ContactInquiry[]) {
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
        withTimeout(setDoc(docRef, newInquiry, { merge: true }), 2500)
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

      fetch('https://formsubmit.co/ajax/muetystore@gmail.com', {
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

  updateStatus(id: string, status: InquiryStatus, adminNotes?: string): ContactInquiry | null {
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
          2500
        ).catch(err => console.warn('Firestore status update error:', err));
      } catch (err) {
        console.warn('Firestore update init error:', err);
      }
    }

    return list[idx];
  }

  deleteInquiry(id: string): boolean {
    const list = this.getInquiries();
    const filtered = list.filter(i => i.id !== id && i.inquiryNumber !== id);
    this.saveInquiries(filtered);

    if (isLiveFirebase && db) {
      try {
        const docRef = doc(db, 'inquiries', id);
        withTimeout(deleteDoc(docRef), 2500).catch(err =>
          console.warn('Firestore delete error:', err)
        );
      } catch (err) {
        console.warn('Firestore delete init error:', err);
      }
    }

    return true;
  }
}

export const inquiryService = new InquiryService();
