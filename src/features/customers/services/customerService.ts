import { UserProfile, CustomerProfile, CustomerStatus, UserRole } from '@/shared/types';
import { storageService } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';

export const customerService = {
  getAllCustomers(): UserProfile[] {
    return storageService.getUsers();
  },

  getCustomerById(uid: string): UserProfile | undefined {
    return storageService.getUserById(uid);
  },

  getCustomerProfile(uid: string): CustomerProfile | undefined {
    const user = storageService.getUserById(uid);
    if (!user) return undefined;

    return {
      customerId: user.uid,
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      phone: user.phoneNumber,
      whatsappPhone: user.whatsappPhone || user.phoneNumber,
      photoURL: user.photoURL,
      addresses: user.addresses || [],
      defaultShippingAddressId: user.defaultShippingAddressId,
      defaultBillingAddressId: user.defaultBillingAddressId,
      wishlistCount: 0,
      orderCount: user.ordersCount || 0,
      totalSpend: user.totalSpent || 0,
      customerStatus: user.customerStatus || (user.isBlocked ? 'blocked' : (user.totalSpent && user.totalSpent > 50000 ? 'VIP' : 'active')),
      marketingConsent: true,
      whatsappConsent: true,
      emailConsent: true,
      internalNotes: '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt || user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  },

  async addCrmNote(customerId: string, noteText: string, authorEmail: string): Promise<{ noteId: string; noteText: string; authorEmail: string; createdAt: string }> {
    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const notePayload = {
      noteId,
      customerId,
      noteText: noteText.trim(),
      authorEmail,
      createdAt: now
    };

    if (db) {
      try {
        await setDoc(doc(db, 'customers', customerId, 'crmNotes', noteId), notePayload);
      } catch (err: any) {
        console.warn('Firestore setDoc crmNotes warning:', err?.message || err);
      }
    }

    try {
      if (typeof window !== 'undefined') {
        const key = `muety_crm_notes_${customerId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift(notePayload);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch {}

    return notePayload;
  },

  async getCrmNotes(customerId: string): Promise<Array<{ noteId: string; noteText: string; authorEmail: string; createdAt: string }>> {
    if (db) {
      try {
        const snap = await getDocs(collection(db, 'customers', customerId, 'crmNotes'));
        if (!snap.empty) {
          return snap.docs.map((d: any) => d.data() as any);
        }
      } catch {}
    }

    try {
      if (typeof window !== 'undefined') {
        const key = `muety_crm_notes_${customerId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
      }
    } catch {}

    return [];
  },

  async saveCustomer(user: UserProfile): Promise<UserProfile> {
    // Strip internalNotes from main user/customer doc so customers cannot read CRM notes on their profile doc
    const sanitizedUser = { ...user };
    delete (sanitizedUser as any).internalNotes;

    storageService.saveUser(sanitizedUser);

    if (db) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizedUser, { merge: true });
        await setDoc(doc(db, 'customers', user.uid), sanitizedUser, { merge: true });
      } catch (err: any) {
        console.warn('Firestore user/customer save warning:', err?.message || err);
      }
    }

    return sanitizedUser;
  },

  async updateCustomerStatus(uid: string, status: CustomerStatus, notes?: string): Promise<UserProfile | undefined> {
    const user = storageService.getUserById(uid);
    if (!user) return undefined;

    const updated: UserProfile = {
      ...user,
      customerStatus: status,
      isBlocked: status === 'blocked',
      updatedAt: new Date().toISOString()
    };

    await this.saveCustomer(updated);
    return updated;
  },

  async createCustomer(data: {
    email: string;
    displayName: string;
    role?: UserRole;
    phoneNumber?: string;
    customerStatus?: CustomerStatus;
  }): Promise<UserProfile> {
    const newUser: UserProfile = {
      uid: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: data.email.trim(),
      displayName: data.displayName.trim(),
      role: data.role || 'customer',
      phoneNumber: data.phoneNumber?.trim() || undefined,
      ordersCount: 0,
      totalSpent: 0,
      customerStatus: data.customerStatus || 'active',
      createdAt: new Date().toISOString()
    };

    return this.saveCustomer(newUser);
  },

  async toggleCustomerBlock(uid: string): Promise<boolean> {
    const user = storageService.getUserById(uid);
    if (!user) return false;

    const isBlocked = !user.isBlocked;
    const customerStatus: CustomerStatus = isBlocked ? 'blocked' : 'active';
    const updated: UserProfile = { ...user, isBlocked, customerStatus };
    await this.saveCustomer(updated);
    return isBlocked;
  },

  async deleteCustomer(uid: string): Promise<boolean> {
    const users = storageService.getUsers().filter(u => u.uid !== uid);
    storageService.saveUsers(users);

    if (db) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        await deleteDoc(doc(db, 'customers', uid));
      } catch {}
    }

    return true;
  },

  subscribeToCustomers(callback: (customers: UserProfile[]) => void): Unsubscribe {
    callback(storageService.getUsers());

    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
          if (!snapshot.empty) {
            const cloudUsers: UserProfile[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as any;
              if (raw && (raw.uid || docSnap.id)) {
                const sanitized: UserProfile = {
                  ...raw,
                  uid: raw.uid || docSnap.id,
                  email: raw.email || 'customer@muety.com',
                  displayName: raw.displayName || 'MUETY Patron',
                  role: raw.role || 'customer',
                  customerStatus: raw.customerStatus || (raw.isBlocked ? 'blocked' : 'active'),
                  ordersCount: Number(raw.ordersCount) || 0,
                  totalSpent: Number(raw.totalSpent) || 0,
                  createdAt: raw.createdAt || new Date().toISOString()
                };
                cloudUsers.push(sanitized);
              }
            });

            storageService.saveUsers(cloudUsers);
            callback(cloudUsers);
          } else {
            callback(storageService.getUsers());
          }
        }, () => {
          callback(storageService.getUsers());
        });

        return unsubscribe;
      } catch {}
    }

    return () => {};
  },

  async pushAllCustomersToFirestore(): Promise<{ success: boolean; count: number; message: string }> {
    if (!db) {
      return { success: false, count: 0, message: 'Firebase Firestore is not initialized.' };
    }

    try {
      const customers = storageService.getUsers();
      if (customers.length === 0) {
        return { success: true, count: 0, message: 'No customer profiles to push.' };
      }

      const batch = writeBatch(db);
      for (const customer of customers) {
        const docRef = doc(db, 'users', customer.uid);
        batch.set(docRef, customer, { merge: true });
        const cDocRef = doc(db, 'customers', customer.uid);
        batch.set(cDocRef, customer, { merge: true });
      }

      await batch.commit();
      return { 
        success: true, 
        count: customers.length, 
        message: `Successfully pushed ${customers.length} customers into Firestore collections "users" & "customers"!` 
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to push customers to Firestore.'
      };
    }
  }
};

