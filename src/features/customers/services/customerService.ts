import { UserProfile, CustomerProfile, CustomerStatus, Address } from '@/shared/types';
import { Order } from '@/features/orders/types';
import { storageService } from '@/lib/storage/storageService';
import { getUserRoles } from '@/shared/utils/permissions';
import { getAuthHeaders } from '@/shared/utils/authHeader';
import { isGeneratedPatronName } from '@/features/auth/services/authService';
import { 
  isVerifiedOrder, 
  isCompletedOrder, 
  calculateOrderNetRevenue, 
  filterCustomerOrders 
} from '@/shared/utils/orderMetrics';
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

const customerListeners = new Set<(customers: UserProfile[]) => void>();

const isTestEnv = (): boolean => {
  return (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST))) ||
    (typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.MODE === 'test'));
};

export function normalizeToE164(phone?: string | null, defaultCountryCode: string = '+91'): string {
  if (!phone) return '';
  const cleaned = String(phone).trim();
  const sanitized = cleaned.replace(/[^\d+]/g, '');
  if (!sanitized) return '';
  if (sanitized.startsWith('+')) {
    return sanitized;
  }
  const noLeadingZero = sanitized.replace(/^0+/, '');
  if (noLeadingZero.length === 10) {
    return `${defaultCountryCode}${noLeadingZero}`;
  }
  return `+${noLeadingZero}`;
}

export function normalizePhoneNumber(phone?: string | null): string {
  return normalizeToE164(phone);
}

export function isStaffOrAdminUser(u: UserProfile | null | undefined): boolean {
  if (!u) return false;
  const emailLower = (u.email || '').toLowerCase().trim();
  if (emailLower.endsWith('@muety.in') || emailLower.endsWith('@muetystore.com')) {
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
  verifiedOrdersCount: number;
  completedOrdersCount: number;
  activeOrdersCount: number;
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
  hasIdentityConflict?: boolean;
  conflictingUids?: string[];
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

  const name1 = primary.displayName?.trim() || primary.fullName?.trim() || '';
  const name2 = secondary.displayName?.trim() || secondary.fullName?.trim() || '';
  const cleanName1 = name1 && !isGeneratedPatronName(name1) ? name1 : '';
  const cleanName2 = name2 && !isGeneratedPatronName(name2) ? name2 : '';

  const phoneNumber = preferSecondary
    ? (secondary.phoneNumber?.trim() || secondary.phone?.trim() || primary.phoneNumber?.trim() || primary.phone?.trim() || undefined)
    : (primary.phoneNumber?.trim() || primary.phone?.trim() || secondary.phoneNumber?.trim() || secondary.phone?.trim() || undefined);

  const cleanChosen = preferSecondary ? (cleanName2 || cleanName1) : (cleanName1 || cleanName2);
  const displayName = cleanChosen || (phoneNumber ? `Patron (${phoneNumber.slice(-4)})` : (mergedEmail ? mergedEmail.split('@')[0] : 'Patron'));

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
    const rawUsers = storageService.getUsers()
      .map(normalizeAdminUser)
      .filter(u => !isStaffOrAdminUser(u));

    const customerMap = new Map<string, UserProfile>();
    const emailMap = new Map<string, string>();
    const phoneToUidsMap = new Map<string, string[]>();

    rawUsers.forEach(u => {
      customerMap.set(u.uid, u);
      const e = (u.email || '').toLowerCase().trim();
      if (e) emailMap.set(e, u.uid);

      const p = normalizePhoneNumber(u.phoneNumber || u.phone);
      if (p) {
        const existing = phoneToUidsMap.get(p) || [];
        if (!existing.includes(u.uid)) existing.push(u.uid);
        phoneToUidsMap.set(p, existing);
      }
    });

    // Synthesize patrons from orders if an order exists with a customerId not yet in user store
    const orders = storageService.getOrders();
    orders.forEach(o => {
      const oEmail = (o.customerEmail || '').toLowerCase().trim();
      const oPhone = normalizePhoneNumber(o.customerPhone || o.shippingAddress?.phone || (o as any).phone);
      const oUid = o.customerId;

      // 1. Primary match: exact canonical UID
      let matchedUid: string | null = null;
      if (oUid && customerMap.has(oUid)) {
        matchedUid = oUid;
      } else if ((!oUid || oUid.startsWith('guest-')) && oEmail && emailMap.has(oEmail)) {
        // Fall back to verified email match ONLY for guest/unassigned orders
        matchedUid = emailMap.get(oEmail)!;
      }

      if (matchedUid && customerMap.has(matchedUid)) {
        const cust = customerMap.get(matchedUid)!;
        if ((!cust.addresses || cust.addresses.length === 0) && o.shippingAddress) {
          cust.addresses = [{
            id: `addr-ord-${o.id || o.orderNumber}`,
            fullName: o.shippingAddress.fullName || cust.displayName || 'Patron',
            phone: o.shippingAddress.phone || cust.phoneNumber || cust.phone || '',
            streetAddress: o.shippingAddress.streetAddress || '',
            apartment: o.shippingAddress.apartment || '',
            city: o.shippingAddress.city || '',
            state: o.shippingAddress.state || '',
            postalCode: o.shippingAddress.postalCode || '',
            country: o.shippingAddress.country || 'India',
            isDefault: true
          }];
        }
      } else if (oUid || (oEmail && !oEmail.endsWith('@muety.in')) || oPhone) {
        // Canonical customer profile for this UID (never reassigning to another user merely because phone matches)
        const synthUid = oUid || (oEmail ? `cust-email-${oEmail}` : `cust-ord-${o.id || o.orderNumber}`);
        const synthName = o.customerName || (o.shippingAddress?.fullName) || (oEmail ? oEmail.split('@')[0] : (oPhone ? `Patron (${oPhone.slice(-4)})` : 'Patron'));
        const addresses: Address[] = o.shippingAddress ? [{
          id: `addr-ord-${o.id || o.orderNumber}`,
          fullName: o.shippingAddress.fullName || synthName,
          phone: o.shippingAddress.phone || oPhone,
          streetAddress: o.shippingAddress.streetAddress || '',
          apartment: o.shippingAddress.apartment || '',
          city: o.shippingAddress.city || '',
          state: o.shippingAddress.state || '',
          postalCode: o.shippingAddress.postalCode || '',
          country: o.shippingAddress.country || 'India',
          isDefault: true
        }] : [];

        const synthUser: UserProfile = {
          uid: synthUid,
          email: oEmail,
          displayName: synthName,
          fullName: synthName,
          phoneNumber: o.customerPhone || o.shippingAddress?.phone || '',
          phone: o.customerPhone || o.shippingAddress?.phone || '',
          role: 'customer',
          roles: ['customer'],
          customerStatus: 'active',
          isBlocked: false,
          addresses,
          patronCircleMember: false,
          createdAt: o.createdAt || new Date().toISOString(),
          updatedAt: o.updatedAt || o.createdAt || new Date().toISOString()
        };

        customerMap.set(synthUid, synthUser);
        if (oEmail) emailMap.set(oEmail, synthUid);
        if (oPhone) {
          const existing = phoneToUidsMap.get(oPhone) || [];
          if (!existing.includes(synthUid)) existing.push(synthUid);
          phoneToUidsMap.set(oPhone, existing);
        }
      }
    });

    // Detect and annotate shared/conflicting phone numbers without silent merging
    customerMap.forEach(customer => {
      const p = normalizePhoneNumber(customer.phoneNumber || customer.phone);
      if (p && phoneToUidsMap.has(p)) {
        const uidsWithPhone = phoneToUidsMap.get(p)!;
        if (uidsWithPhone.length > 1) {
          (customer as any).hasIdentityConflict = true;
          (customer as any).conflictingUids = uidsWithPhone.filter(id => id !== customer.uid);
        }
      }
    });

    return Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
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
    const ordersList = allOrders !== undefined ? allOrders : storageService.getOrders();

    // If live orders have not finished loading, preserve confirmed aggregate fields from customer profile
    if (ordersList.length === 0 && (Number(customer.ordersCount) > 0 || Number(customer.totalSpent) > 0)) {
      const storedOrders = Number(customer.ordersCount) || 0;
      const storedSpend = Number(customer.totalSpent) || 0;
      return {
        totalValidOrders: storedOrders,
        verifiedOrdersCount: storedOrders,
        completedOrdersCount: storedOrders,
        activeOrdersCount: 0,
        paidOrdersCount: storedOrders,
        netLifetimeSpend: storedSpend,
        orderCount: storedOrders,
        totalSpend: storedSpend,
        cancelledOrdersCount: 0,
        failedOrdersCount: 0,
        refundedOrdersCount: 0,
        pendingOrdersCount: 0,
        isVip: customer.customerStatus === 'VIP' || storedSpend >= 50000,
        customerCategory: storedSpend >= 50000 ? 'VIP Patron' : (storedOrders >= 1 ? 'Active Buyer' : 'Standard Patron'),
        eligibleOrders: [],
        refundDataAvailable: true,
        hasIdentityConflict: (customer as any).hasIdentityConflict || false,
        conflictingUids: (customer as any).conflictingUids || []
      };
    }

    // Match orders strictly by canonical customer UID (and guest email for unassigned orders).
    // NEVER match by phone number to prevent order cross-contamination across shared-phone accounts!
    const userOrders = filterCustomerOrders(ordersList, customer.uid, customer.email);

    let totalValidOrders = 0;       // Verified non-cancelled, non-failed orders
    let completedOrdersCount = 0;   // Delivered orders
    let activeOrdersCount = 0;      // Pending/confirmed/processing/shipped
    let paidOrdersCount = 0;        // Payment captured
    let netLifetimeSpend = 0;       // Realized monetary revenue
    let cancelledOrdersCount = 0;
    let failedOrdersCount = 0;
    let refundedOrdersCount = 0;
    let pendingOrdersCount = 0;     // Awaiting payment capture
    let refundDataAvailable = true;

    for (const ord of userOrders) {
      if ((ord as any).refundDataIncomplete === true) {
        refundDataAvailable = false;
      }

      const isCancelled = ord.orderStatus === 'cancelled';
      const isFailed = ord.orderStatus === 'failed' || ord.paymentStatus === 'failed';
      const isRefunded = ord.paymentStatus === 'refunded' || (ord.orderStatus as string) === 'refunded';
      const isDelivered = isCompletedOrder(ord);
      const isPaid = ord.paymentStatus === 'paid';
      const isPending = ord.orderStatus === 'pending' || ord.paymentStatus === 'pending';

      if (isCancelled) {
        cancelledOrdersCount++;
      } else if (isFailed) {
        failedOrdersCount++;
      } else if (isRefunded) {
        refundedOrdersCount++;
        totalValidOrders++;
      } else if (isVerifiedOrder(ord)) {
        totalValidOrders++;

        if (isDelivered) {
          completedOrdersCount++;
        } else {
          activeOrdersCount++;
        }

        if (isPaid) {
          paidOrdersCount++;
        }

        if (isPending) {
          pendingOrdersCount++;
        }

        netLifetimeSpend += calculateOrderNetRevenue(ord);
      }
    }

    // Eliminate floating-point accumulation inaccuracies
    netLifetimeSpend = Math.round((netLifetimeSpend + Number.EPSILON) * 100) / 100;

    const isVip = (customer.customerStatus === 'VIP') || (netLifetimeSpend >= 50000);

    let customerCategory = 'Standard Patron';
    if (isVip) {
      customerCategory = 'VIP Patron';
    } else if (completedOrdersCount > 2 || paidOrdersCount > 2) {
      customerCategory = 'Loyal Patron';
    } else if (completedOrdersCount >= 1 || paidOrdersCount >= 1) {
      customerCategory = 'Active Buyer';
    } else {
      customerCategory = 'New Prospect';
    }

    return {
      totalValidOrders,
      verifiedOrdersCount: totalValidOrders,
      completedOrdersCount,
      activeOrdersCount,
      paidOrdersCount,
      netLifetimeSpend,
      orderCount: totalValidOrders, // Stable canonical alias for verified orders
      totalSpend: netLifetimeSpend,
      cancelledOrdersCount,
      failedOrdersCount,
      refundedOrdersCount,
      pendingOrdersCount,
      isVip,
      customerCategory,
      eligibleOrders: userOrders,
      refundDataAvailable,
      hasIdentityConflict: (customer as any).hasIdentityConflict || false,
      conflictingUids: (customer as any).conflictingUids || []
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
      marketingConsent: user.marketingConsent === true,
      whatsappConsent: (user as any).whatsappConsent === true,
      emailConsent: user.marketingConsent === true || (user as any).emailConsent === true,
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

    if (typeof window !== 'undefined') {
      getAuthHeaders().then(headers => {
        fetch('/api/customers/update', {
          method: 'POST',
          headers,
          body: JSON.stringify(sanitizedUser)
        }).catch(() => {});
      }).catch(() => {});
    }

    return sanitizedUser;
  },

  async updateCustomerContact(
    uid: string, 
    contactData: { 
      displayName: string; 
      email?: string;
      phoneNumber?: string; 
      alternatePhone?: string; 
      whatsappPhone?: string; 
    }
  ): Promise<UserProfile> {
    const existing = storageService.getUserById(uid) || this.getOnlyCustomers().find(c => c.uid === uid);
    if (!existing) throw new Error('Customer record not found.');

    const cleanEmail = contactData.email ? contactData.email.trim().toLowerCase() : existing.email;

    const updated: UserProfile = {
      ...existing,
      displayName: contactData.displayName.trim(),
      fullName: contactData.displayName.trim(),
      email: cleanEmail || existing.email,
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

  async togglePatronCircleMembership(uid: string, optIn: boolean): Promise<UserProfile> {
    const user = storageService.getUserById(uid) || this.getOnlyCustomers().find(c => c.uid === uid);
    if (!user) throw new Error('Customer profile not found.');

    const updated: UserProfile = {
      ...user,
      patronCircleMember: optIn,
      marketingConsent: optIn,
      patronCircleJoinedAt: optIn ? (user.patronCircleJoinedAt || new Date().toISOString()) : undefined,
      patronCircleConsentText: optIn ? (user.patronCircleConsentText || 'Enrolled in MUETY Patron Circle VIP Experience') : undefined,
      updatedAt: new Date().toISOString()
    };

    return this.saveCustomer(updated);
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

  async archiveCustomer(uid: string): Promise<UserProfile | null> {
    const users = storageService.getUsers();
    const idx = users.findIndex(u => u.uid === uid);
    if (idx === -1) return null;

    const updated: UserProfile = {
      ...users[idx],
      archived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users[idx] = updated;
    storageService.saveUsers(users);

    if (db) {
      try {
        await Promise.race([
          Promise.all([
            setDoc(doc(db, 'users', uid), updated, { merge: true }),
            setDoc(doc(db, 'customers', uid), updated, { merge: true })
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore archive timeout')), 2500))
        ]);
      } catch (err) {
        console.warn('[customerService] Firestore archive customer note:', err);
      }
    }

    return updated;
  },

  async unarchiveCustomer(uid: string): Promise<UserProfile | null> {
    const users = storageService.getUsers();
    const idx = users.findIndex(u => u.uid === uid);
    if (idx === -1) return null;

    const userToUpdate: UserProfile = { ...users[idx] };
    userToUpdate.archived = false;
    delete userToUpdate.archivedAt;
    userToUpdate.updatedAt = new Date().toISOString();

    users[idx] = userToUpdate;
    storageService.saveUsers(users);

    if (db) {
      try {
        const payload: Record<string, any> = { ...userToUpdate };
        delete payload.archivedAt;

        await Promise.race([
          Promise.all([
            setDoc(doc(db, 'users', uid), payload, { merge: true }),
            setDoc(doc(db, 'customers', uid), payload, { merge: true })
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore unarchive timeout')), 2500))
        ]);
      } catch (err) {
        console.warn('[customerService] Firestore unarchive customer note:', err);
      }
    }

    return userToUpdate;
  },

  async deleteCustomer(uid: string): Promise<boolean> {
    // For user data privacy & compliance, customer records must not be deleted. Archive instead.
    await this.archiveCustomer(uid);
    return true;
  },

  /**
   * Synchronize customer registry with server-authoritative Firestore data
   */
  async syncCustomers(): Promise<UserProfile[]> {
    try {
      if (typeof window !== 'undefined') {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/customers/list', {
          method: 'POST',
          headers,
          body: JSON.stringify({})
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.customers)) {
            const customerMap = new Map<string, UserProfile>();
            let createdCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            // Retain staff/admin accounts and offline-pending patrons from local storage
            storageService.getUsers().forEach(u => {
              if (u.uid && (isStaffOrAdminUser(u) || (u as any).isOfflinePending === true)) {
                customerMap.set(u.uid, u);
              }
            });

            // Merge server customers (server is authoritative; deleted patrons are removed)
            data.customers.forEach((c: UserProfile) => {
              if (c && c.uid) {
                if (customerMap.has(c.uid)) {
                  const existing = customerMap.get(c.uid)!;
                  const merged = mergeCustomerProfiles(existing, c);
                  const isSame = JSON.stringify(existing) === JSON.stringify(merged);
                  if (isSame) {
                    skippedCount++;
                  } else {
                    updatedCount++;
                    customerMap.set(c.uid, merged);
                  }
                } else {
                  createdCount++;
                  customerMap.set(c.uid, c);
                }
              }
            });

            const mergedList = Array.from(customerMap.values());
            storageService.saveUsers(mergedList);
            customerListeners.forEach(cb => {
              try { cb(mergedList); } catch {}
            });
            const resultList = mergedList.filter(u => !isStaffOrAdminUser(u));
            (resultList as any).stats = {
              read: data.stats?.read ?? (data.customers.length + storageService.getOrders().length),
              created: createdCount,
              updated: updatedCount,
              skipped: skippedCount,
              failed: 0,
              conflictsDetected: data.stats?.conflictsDetected ?? 0
            };
            return resultList;
          }
        }
      }
    } catch (err) {
      console.warn('[customerService] syncCustomers note:', err);
    }
    return this.getOnlyCustomers();
  },

  subscribeToCustomers(callback: (customers: UserProfile[]) => void): Unsubscribe {
    customerListeners.add(callback);
    // Only emit immediate local cache in offline or test environments to prevent UI flickering on refresh
    if (!db || isTestEnv()) {
      callback(this.getOnlyCustomers());
    }

    // Trigger background sync with server-authoritative Firestore endpoint
    this.syncCustomers().catch(() => {});

    const handleWindowUpdate = () => {
      callback(this.getOnlyCustomers());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('muety_users_updated', handleWindowUpdate);
      window.addEventListener('muety_customers_updated', handleWindowUpdate);
      window.addEventListener('muety_orders_updated', handleWindowUpdate);
    }

    let firestoreUnsub: Unsubscribe | null = null;
    if (db) {
      try {
        firestoreUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
          if (!snapshot.empty) {
            const customerMap = new Map<string, UserProfile>();
            
            // Only seed staff/admin accounts and offline-pending patrons from local storage
            storageService.getUsers().forEach(u => {
              if (u.uid && (isStaffOrAdminUser(u) || (u as any).isOfflinePending === true)) {
                customerMap.set(u.uid, u);
              }
            });

            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as any;
              const uid = raw.uid || docSnap.id;
              if (uid) {
                const incomingEmail = (raw.email && typeof raw.email === 'string' && raw.email.toLowerCase().trim() !== 'customer@muety.com')
                  ? raw.email.trim()
                  : '';

                // Look up any existing cached data for this customer to preserve known phone numbers and details
                const existing = customerMap.get(uid) || storageService.getUserById(uid);
                const rawPhone = raw.phoneNumber || raw.phone || '';
                const incomingPhone = rawPhone || existing?.phoneNumber || existing?.phone || '';

                const rawDisplayName = raw.displayName || raw.fullName || '';
                const existingDisplayName = existing?.displayName || existing?.fullName || '';

                let resolvedName = '';
                if (rawDisplayName && !isGeneratedPatronName(rawDisplayName)) {
                  resolvedName = rawDisplayName.trim();
                } else if (existingDisplayName && !isGeneratedPatronName(existingDisplayName)) {
                  resolvedName = existingDisplayName.trim();
                } else if (incomingPhone) {
                  resolvedName = `Patron (${incomingPhone.slice(-4)})`;
                } else if (incomingEmail) {
                  resolvedName = incomingEmail.split('@')[0];
                } else {
                  resolvedName = 'Patron';
                }

                const incoming: UserProfile = {
                  ...raw,
                  uid,
                  email: incomingEmail,
                  phoneNumber: incomingPhone || undefined,
                  phone: incomingPhone || undefined,
                  displayName: resolvedName,
                  fullName: resolvedName,
                  role: raw.role || 'customer',
                  customerStatus: raw.customerStatus || (raw.isBlocked ? 'blocked' : 'active'),
                  ordersCount: Number(raw.ordersCount) || Number(existing?.ordersCount) || 0,
                  totalSpent: Number(raw.totalSpent) || Number(existing?.totalSpent) || 0,
                  patronCircleMember: Boolean(raw.patronCircleMember || raw.joinCircle || raw.isPatronCircle || existing?.patronCircleMember),
                  addresses: Array.isArray(raw.addresses) ? raw.addresses : (existing?.addresses || []),
                  createdAt: raw.createdAt || existing?.createdAt || new Date().toISOString()
                };

                customerMap.set(uid, incoming);
              }
            });

            const mergedList = Array.from(customerMap.values());
            storageService.saveUsers(mergedList);
            callback(this.getOnlyCustomers());
          } else {
            callback(this.getOnlyCustomers());
          }
        }, (err: any) => {
          // If Firestore permission denied on client collection listener, do NOT clobber loaded patrons
          if (import.meta.env.DEV) {
            console.debug('[customerService] users collection listener note:', err?.message || err);
          }
        });
      } catch {}
    }

    return () => {
      customerListeners.delete(callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('muety_users_updated', handleWindowUpdate);
        window.removeEventListener('muety_customers_updated', handleWindowUpdate);
        window.removeEventListener('muety_orders_updated', handleWindowUpdate);
      }
      if (typeof firestoreUnsub === 'function') {
        try { firestoreUnsub(); } catch {}
      }
    };
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
