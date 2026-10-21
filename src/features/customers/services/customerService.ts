import { UserProfile, CustomerProfile, CustomerStatus, Address } from '@/shared/types';
import { Order } from '@/features/orders/types';
import { storageService } from '@/lib/storage/storageService';
import { getUserRoles } from '@/shared/utils/permissions';
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

export function isStaffOrAdminUser(u: UserProfile | null | undefined): boolean {
  if (!u) return false;
  const emailLower = (u.email || '').toLowerCase().trim();
  if (emailLower.endsWith('@muety.in') || emailLower.endsWith('@muetystore.com') || emailLower === 'kalvimohan03@gmail.com') {
    return true;
  }
  const roles = getUserRoles(u);
  const staffRoles = [
    'superadmin', 'super_admin', 'admin',
    'catalog_manager', 'product_executive',
    'order_manager', 'order_executive',
    'support_manager', 'support_executive', 'support_agent'
  ];
  return roles.some(r => staffRoles.includes(r)) || 
         staffRoles.includes(u.roleSlug || '') || 
         staffRoles.includes(u.role || '');
}

export function normalizeAdminUser(user: UserProfile): UserProfile {
  if (!user) return user;
  const userRoles = getUserRoles(user);
  const primaryRoleSlug = user.roleSlug || user.role || userRoles[0] || 'customer';

  let departmentId = user.departmentId;
  let departmentName = user.departmentName;

  if (['catalog_manager', 'product_executive'].includes(primaryRoleSlug)) {
    departmentId = 'products_catalog';
    departmentName = 'Products & Catalog';
  } else if (['order_manager', 'order_executive'].includes(primaryRoleSlug)) {
    departmentId = 'orders_fulfillment';
    departmentName = 'Orders & Fulfillment';
  } else if (['support_manager', 'support_executive', 'support_agent'].includes(primaryRoleSlug)) {
    departmentId = 'customer_support';
    departmentName = 'Customer Support';
  } else if (['superadmin', 'super_admin', 'admin'].includes(primaryRoleSlug)) {
    departmentId = 'management';
    departmentName = 'Management';
  }

  const roleNameMap: Record<string, string> = {
    superadmin: 'Super Admin',
    super_admin: 'Super Admin',
    admin: 'Admin',
    catalog_manager: 'Catalog Manager',
    product_executive: 'Product Executive',
    order_manager: 'Order Manager',
    order_executive: 'Order Executive',
    support_manager: 'Support Manager',
    support_executive: 'Support Executive',
    support_agent: 'Support Manager'
  };

  return {
    ...user,
    departmentId: departmentId || (isStaffOrAdminUser(user) ? 'management' : undefined),
    departmentName: departmentName || (isStaffOrAdminUser(user) ? 'Management' : undefined),
    roleSlug: primaryRoleSlug === 'super_admin' ? 'superadmin' : primaryRoleSlug,
    roleName: roleNameMap[primaryRoleSlug] || user.roleName || (isStaffOrAdminUser(user) ? primaryRoleSlug : 'Registered Patron')
  };
}

export interface CustomerMetrics {
  totalValidOrders: number;
  paidOrdersCount: number;
  netLifetimeSpend: number;
  orderCount: number; // Backward compatibility alias
  totalSpend: number; // Backward compatibility alias
  cancelledOrdersCount: number;
  failedOrdersCount: number;
  refundedOrdersCount: number;
  pendingOrdersCount: number;
  isVip: boolean;
  customerCategory: string;
  eligibleOrders: Order[];
  refundDataAvailable: boolean;
}

export function mergeCustomerProfiles(primary: UserProfile, secondary: Partial<UserProfile>): UserProfile {
  // Reject merging unrelated identities if both possess different non-empty UIDs
  if (primary.uid && secondary.uid && primary.uid !== secondary.uid) {
    throw new Error(`SECURITY_ERROR: Cannot merge disparate customer identities with conflicting UIDs: "${primary.uid}" vs "${secondary.uid}"`);
  }

  const mergedUid = primary.uid || secondary.uid || `usr-${Date.now()}`;
  const rawEmail = primary.email || secondary.email || '';
  const cleanEmail = rawEmail.toLowerCase().trim() === 'customer@muety.com' ? '' : rawEmail.toLowerCase().trim();
  const mergedEmail = cleanEmail;

  // Field precedence: evaluate timestamps if available to prevent stale data overwriting newer verified data
  const primaryUpdated = primary.updatedAt ? new Date(primary.updatedAt).getTime() : 0;
  const secondaryUpdated = secondary.updatedAt ? new Date(secondary.updatedAt).getTime() : 0;
  const preferSecondary = secondaryUpdated > primaryUpdated && secondaryUpdated > 0;

  const displayName = preferSecondary
    ? (secondary.displayName?.trim() || secondary.fullName?.trim() || primary.displayName?.trim() || primary.fullName?.trim() || mergedEmail.split('@')[0] || 'Patron')
    : (primary.displayName?.trim() || primary.fullName?.trim() || secondary.displayName?.trim() || secondary.fullName?.trim() || mergedEmail.split('@')[0] || 'Patron');

  const phoneNumber = preferSecondary
    ? (secondary.phoneNumber?.trim() || secondary.phone?.trim() || primary.phoneNumber?.trim() || primary.phone?.trim() || undefined)
    : (primary.phoneNumber?.trim() || primary.phone?.trim() || secondary.phoneNumber?.trim() || secondary.phone?.trim() || undefined);

  const whatsappPhone = preferSecondary
    ? (secondary.whatsappPhone?.trim() || primary.whatsappPhone?.trim() || phoneNumber)
    : (primary.whatsappPhone?.trim() || secondary.whatsappPhone?.trim() || phoneNumber);

  const alternatePhone = preferSecondary
    ? (secondary.alternatePhone?.trim() || primary.alternatePhone?.trim() || undefined)
    : (primary.alternatePhone?.trim() || secondary.alternatePhone?.trim() || undefined);

  // Suspension & Block status safety: if either record is blocked, the merged profile remains blocked
  const isBlocked = Boolean(primary.isBlocked || secondary.isBlocked);
  const customerStatus: CustomerStatus = isBlocked ? 'blocked' : (primary.customerStatus === 'VIP' || secondary.customerStatus === 'VIP' ? 'VIP' : (primary.customerStatus || secondary.customerStatus || 'active'));

  // Active & Invitation status resolution: prioritize active and accepted status
  const status = isBlocked
    ? 'disabled'
    : ((primary.status === 'active' || secondary.status === 'active')
        ? 'active'
        : (preferSecondary ? (secondary.status || primary.status) : (primary.status || secondary.status)));

  const invitationStatus = (primary.invitationStatus === 'accepted' || secondary.invitationStatus === 'accepted')
    ? 'accepted'
    : (preferSecondary ? (secondary.invitationStatus || primary.invitationStatus) : (primary.invitationStatus || secondary.invitationStatus));

  // Merge addresses deduplicated by id or street+postal
  const addressMap = new Map<string, Address>();
  (primary.addresses || []).forEach(a => {
    const key = a.id || `${a.streetAddress}_${a.postalCode}`;
    addressMap.set(key, a);
  });
  (secondary.addresses || []).forEach(a => {
    const key = a.id || `${a.streetAddress}_${a.postalCode}`;
    if (!addressMap.has(key)) {
      addressMap.set(key, a);
    }
  });
  const mergedAddresses = Array.from(addressMap.values());

  // Timestamp precedence: earliest created, latest updated
  const createdAt = (primary.createdAt && secondary.createdAt)
    ? (new Date(primary.createdAt).getTime() < new Date(secondary.createdAt).getTime() ? primary.createdAt : secondary.createdAt)
    : (primary.createdAt || secondary.createdAt || new Date().toISOString());

  const updatedAt = new Date().toISOString();

  return {
    ...primary,
    ...secondary,
    uid: mergedUid,
    email: mergedEmail,
    displayName,
    fullName: displayName,
    phoneNumber,
    phone: phoneNumber,
    whatsappPhone,
    alternatePhone,
    isBlocked,
    status: status as any,
    invitationStatus: invitationStatus as any,
    customerStatus,
    addresses: mergedAddresses,
    defaultAddress: primary.defaultAddress || secondary.defaultAddress || mergedAddresses.find(a => a.isDefault) || mergedAddresses[0],
    defaultShippingAddressId: primary.defaultShippingAddressId || secondary.defaultShippingAddressId || mergedAddresses.find(a => a.isDefault)?.id,
    createdAt,
    updatedAt
  };
}

export const customerService = {
  getAllCustomers(): UserProfile[] {
    return storageService.getUsers().map(normalizeAdminUser);
  },

  getOnlyCustomers(): UserProfile[] {
    return storageService.getUsers()
      .map(normalizeAdminUser)
      .filter(u => !isStaffOrAdminUser(u));
  },

  getCustomerById(uid: string): UserProfile | undefined {
    const u = storageService.getUserById(uid);
    if (!u) return undefined;
    const cleanUser = {
      ...u,
      email: (u.email && u.email.toLowerCase().trim() !== 'customer@muety.com') ? u.email.trim() : ''
    };
    return normalizeAdminUser(cleanUser);
  },

  /**
   * Derive real order metrics, net lifetime spend, and VIP category from canonical order source
   */
  calculateCustomerMetrics(customer: UserProfile, allOrders?: Order[]): CustomerMetrics {
    const ordersList = allOrders || storageService.getOrders();
    const customerEmailLower = (customer.email || '').toLowerCase().trim();

    // Match orders by customerId (exact UID) or customerEmail
    const rawUserOrders = ordersList.filter(o => 
      (o.customerId && o.customerId === customer.uid) ||
      (o.customerEmail && o.customerEmail.toLowerCase().trim() === customerEmailLower)
    );

    // Deduplicate orders by unique canonical order id or orderNumber
    const seenOrderKeys = new Set<string>();
    const userOrders: Order[] = [];
    for (const o of rawUserOrders) {
      const key = o.id || o.orderNumber;
      if (key && !seenOrderKeys.has(key)) {
        seenOrderKeys.add(key);
        userOrders.push(o);
      }
    }

    // Sort descending by creation date
    userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let totalValidOrders = 0;
    let paidOrdersCount = 0;
    let netLifetimeSpend = 0;
    let cancelledOrdersCount = 0;
    let failedOrdersCount = 0;
    let refundedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let refundDataAvailable = true;

    for (const ord of userOrders) {
      if ((ord as any).refundDataIncomplete === true) {
        refundDataAvailable = false;
      }

      const isCancelled = ord.orderStatus === 'cancelled';
      const isFailed = ord.orderStatus === 'failed' || ord.paymentStatus === 'failed';
      const isRefunded = ord.paymentStatus === 'refunded';
      const isPaid = ord.paymentStatus === 'paid';
      const isCodPending = ord.paymentMethod === 'cash_on_delivery' && ord.paymentStatus !== 'paid';
      const isPending = isCodPending || ord.paymentStatus === 'pending';

      if (isCancelled) {
        cancelledOrdersCount++;
      } else if (isFailed) {
        failedOrdersCount++;
      } else if (isRefunded) {
        refundedOrdersCount++;
        totalValidOrders++;
        // Fully refunded orders count as a past valid transaction but contribute ₹0 to net spend
      } else if (isPaid) {
        paidOrdersCount++;
        totalValidOrders++;
        const rawTotal = Number(ord.total) || 0;
        // Subtract partial refunds if present
        const partialRefund = Number((ord as any).refundedAmount || (ord as any).refundAmount) || 0;
        const netOrderSpend = Math.max(0, rawTotal - partialRefund);
        netLifetimeSpend += netOrderSpend;
      } else if (isPending) {
        pendingOrdersCount++;
        totalValidOrders++;
        // Pending payments (e.g. unpaid COD) count as placed active orders, but not realized spend until captured
      } else {
        totalValidOrders++;
        netLifetimeSpend += Number(ord.total) || 0;
      }
    }

    const isVip = (customer.customerStatus === 'VIP') || (netLifetimeSpend >= 50000);

    let customerCategory = 'Standard Patron';
    if (isVip) {
      customerCategory = 'VIP Patron';
    } else if (paidOrdersCount > 2) {
      customerCategory = 'Loyal Patron';
    } else if (paidOrdersCount === 1 || paidOrdersCount === 2) {
      customerCategory = 'Active Buyer';
    } else {
      customerCategory = 'New Prospect';
    }

    return {
      totalValidOrders,
      paidOrdersCount,
      netLifetimeSpend,
      orderCount: paidOrdersCount,
      totalSpend: netLifetimeSpend,
      cancelledOrdersCount,
      failedOrdersCount,
      refundedOrdersCount,
      pendingOrdersCount,
      isVip,
      customerCategory,
      eligibleOrders: userOrders,
      refundDataAvailable
    };
  },

  getCustomerProfile(uid: string): CustomerProfile | undefined {
    const user = storageService.getUserById(uid);
    if (!user) return undefined;

    const metrics = this.calculateCustomerMetrics(user);

    return {
      customerId: user.uid,
      uid: user.uid,
      displayName: user.displayName || user.fullName || 'Patron',
      email: user.email,
      phone: user.phoneNumber || user.phone,
      whatsappPhone: user.whatsappPhone || user.phoneNumber || user.phone,
      photoURL: user.photoURL || user.profilePhotoUrl,
      addresses: user.addresses || [],
      defaultShippingAddressId: user.defaultShippingAddressId,
      defaultBillingAddressId: user.defaultBillingAddressId,
      wishlistCount: 0,
      orderCount: metrics.paidOrdersCount,
      totalSpend: metrics.netLifetimeSpend,
      customerStatus: user.customerStatus || (user.isBlocked ? 'blocked' : (metrics.isVip ? 'VIP' : 'active')),
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
        await Promise.race([
          setDoc(doc(db, 'customers', customerId, 'crmNotes', noteId), notePayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore note write timeout')), 1200))
        ]);
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
        const writes = [
          setDoc(doc(db, 'users', user.uid), sanitizedUser, { merge: true }),
          setDoc(doc(db, 'customers', user.uid), sanitizedUser, { merge: true })
        ];
        if (isStaffOrAdminUser(user)) {
          writes.push(setDoc(doc(db, 'admins', user.uid), sanitizedUser, { merge: true }));
        }

        await Promise.race([
          Promise.all(writes),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 1500))
        ]);
      } catch (err: any) {
        console.warn('Firestore user/customer save warning:', err?.message || err);
      }
    }

    return sanitizedUser;
  },

  async updateCustomerContact(
    uid: string, 
    contactData: { 
      displayName: string; 
      phoneNumber?: string; 
      alternatePhone?: string; 
      whatsappPhone?: string; 
    }
  ): Promise<UserProfile> {
    const existing = storageService.getUserById(uid);
    if (!existing) throw new Error('Customer record not found.');

    const updated: UserProfile = {
      ...existing,
      displayName: contactData.displayName.trim(),
      fullName: contactData.displayName.trim(),
      phoneNumber: contactData.phoneNumber?.trim() || undefined,
      phone: contactData.phoneNumber?.trim() || undefined,
      alternatePhone: contactData.alternatePhone?.trim() || undefined,
      whatsappPhone: contactData.whatsappPhone?.trim() || contactData.phoneNumber?.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    return this.saveCustomer(updated);
  },

  async updateCustomerStatus(uid: string, status: CustomerStatus): Promise<UserProfile | undefined> {
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

  async toggleCustomerBlock(uid: string): Promise<boolean> {
    const user = storageService.getUserById(uid);
    if (!user) return false;

    const isBlocked = !user.isBlocked;
    const customerStatus: CustomerStatus = isBlocked ? 'blocked' : 'active';
    const updated: UserProfile = { ...user, isBlocked, customerStatus, updatedAt: new Date().toISOString() };
    await this.saveCustomer(updated);
    return isBlocked;
  },

  /**
   * Address management methods
   * IMPORTANT: Delivery addresses are attached directly to the customer profile document.
   * Modifying or deleting customer saved addresses NEVER mutates historical order shipping snapshots.
   */
  async addCustomerAddress(uid: string, address: Address): Promise<UserProfile> {
    const user = storageService.getUserById(uid);
    if (!user) throw new Error('Customer profile not found.');

    const addressId = address.id || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const currentAddresses = user.addresses || [];
    const isFirst = currentAddresses.length === 0;
    const isDefault = address.isDefault !== undefined ? address.isDefault : isFirst;

    const newAddressItem: Address = {
      ...address,
      id: addressId,
      isDefault
    };

    const updatedAddresses = isDefault
      ? currentAddresses.map(a => ({ ...a, isDefault: false }))
      : [...currentAddresses];

    updatedAddresses.push(newAddressItem);

    const updatedUser: UserProfile = {
      ...user,
      addresses: updatedAddresses,
      defaultAddress: isDefault ? newAddressItem : (user.defaultAddress || newAddressItem),
      defaultShippingAddressId: isDefault ? addressId : (user.defaultShippingAddressId || addressId),
      updatedAt: new Date().toISOString()
    };

    return this.saveCustomer(updatedUser);
  },

  async updateCustomerAddress(uid: string, addressId: string, addressUpdates: Partial<Address>): Promise<UserProfile> {
    const user = storageService.getUserById(uid);
    if (!user) throw new Error('Customer profile not found.');

    const currentAddresses = user.addresses || [];
    const targetIndex = currentAddresses.findIndex(a => a.id === addressId);
    if (targetIndex === -1) throw new Error('Target address not found.');

    const willBeDefault = addressUpdates.isDefault ?? currentAddresses[targetIndex].isDefault;

    const updatedAddresses = currentAddresses.map((addr, idx) => {
      if (idx === targetIndex) {
        return {
          ...addr,
          ...addressUpdates,
          id: addressId
        };
      }
      if (willBeDefault) {
        return { ...addr, isDefault: false };
      }
      return addr;
    });

    const targetAddr = updatedAddresses[targetIndex];
    const updatedUser: UserProfile = {
      ...user,
      addresses: updatedAddresses,
      defaultAddress: willBeDefault ? targetAddr : user.defaultAddress,
      defaultShippingAddressId: willBeDefault ? addressId : user.defaultShippingAddressId,
      updatedAt: new Date().toISOString()
    };

    return this.saveCustomer(updatedUser);
  },

  async deleteCustomerAddress(uid: string, addressId: string): Promise<UserProfile> {
    const user = storageService.getUserById(uid);
    if (!user) throw new Error('Customer profile not found.');

    const currentAddresses = (user.addresses || []).filter(a => a.id !== addressId);
    
    // If we deleted the default address and remaining addresses exist, mark the first one as default
    if (currentAddresses.length > 0 && !currentAddresses.some(a => a.isDefault)) {
      currentAddresses[0] = { ...currentAddresses[0], isDefault: true };
    }

    const newDefault = currentAddresses.find(a => a.isDefault) || currentAddresses[0];

    const updatedUser: UserProfile = {
      ...user,
      addresses: currentAddresses,
      defaultAddress: newDefault,
      defaultShippingAddressId: newDefault?.id,
      updatedAt: new Date().toISOString()
    };

    return this.saveCustomer(updatedUser);
  },

  async setDefaultCustomerAddress(uid: string, addressId: string): Promise<UserProfile> {
    return this.updateCustomerAddress(uid, addressId, { isDefault: true });
  },

  async deleteCustomer(uid: string): Promise<boolean> {
    const users = storageService.getUsers().filter(u => u.uid !== uid);
    storageService.saveUsers(users);

    if (db) {
      try {
        await Promise.race([
          Promise.all([
            deleteDoc(doc(db, 'users', uid)),
            deleteDoc(doc(db, 'customers', uid))
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore delete timeout')), 1200))
        ]);
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
            const customerMap = new Map<string, UserProfile>();
            
            // Seed from existing local storage first
            storageService.getUsers().forEach(u => {
              if (u.uid) customerMap.set(u.uid, u);
            });

            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as any;
              const uid = raw.uid || docSnap.id;
              if (uid) {
                const incomingEmail = (raw.email && typeof raw.email === 'string' && raw.email.toLowerCase().trim() !== 'customer@muety.com')
                  ? raw.email.trim()
                  : '';

                const incoming: UserProfile = {
                  ...raw,
                  uid,
                  email: incomingEmail,
                  displayName: raw.displayName || raw.fullName || 'MUETY Patron',
                  role: raw.role || 'customer',
                  customerStatus: raw.customerStatus || (raw.isBlocked ? 'blocked' : 'active'),
                  ordersCount: Number(raw.ordersCount) || 0,
                  totalSpent: Number(raw.totalSpent) || 0,
                  addresses: Array.isArray(raw.addresses) ? raw.addresses : [],
                  createdAt: raw.createdAt || new Date().toISOString()
                };

                if (customerMap.has(uid)) {
                  customerMap.set(uid, mergeCustomerProfiles(customerMap.get(uid)!, incoming));
                } else {
                  customerMap.set(uid, incoming);
                }
              }
            });

            const mergedList = Array.from(customerMap.values());
            storageService.saveUsers(mergedList);
            callback(mergedList);
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
