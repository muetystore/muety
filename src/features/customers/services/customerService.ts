import { UserProfile, UserRole } from '@/shared/types';
import { storageService } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
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

  async saveCustomer(user: UserProfile): Promise<UserProfile> {
    storageService.saveUser(user);

    if (db) {
      try {
        await setDoc(doc(db, 'users', user.uid), user, { merge: true });
      } catch (err: any) {
        console.warn('Firestore user save warning:', err?.message || err);
      }
    }

    return user;
  },

  async createCustomer(data: {
    email: string;
    displayName: string;
    role?: UserRole;
    phoneNumber?: string;
  }): Promise<UserProfile> {
    const newUser: UserProfile = {
      uid: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: data.email.trim(),
      displayName: data.displayName.trim(),
      role: data.role || 'customer',
      phoneNumber: data.phoneNumber?.trim() || undefined,
      ordersCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };

    return this.saveCustomer(newUser);
  },

  async toggleCustomerBlock(uid: string): Promise<boolean> {
    const user = storageService.getUserById(uid);
    if (!user) return false;

    const isBlocked = !user.isBlocked;
    const updated: UserProfile = { ...user, isBlocked };
    await this.saveCustomer(updated);
    return isBlocked;
  },

  async deleteCustomer(uid: string): Promise<boolean> {
    const users = storageService.getUsers().filter(u => u.uid !== uid);
    storageService.saveUsers(users);

    if (db) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err) {}
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
      } catch (err) {}
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
      }

      await batch.commit();
      return { 
        success: true, 
        count: customers.length, 
        message: `Successfully pushed ${customers.length} customers into Firestore collection "users"!` 
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
