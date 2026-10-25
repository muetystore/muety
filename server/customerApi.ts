import { getAdminFirestore, getAdminAuth, verifyIdTokenAndGetClaims } from './firebaseAdmin';

interface VerifiedAdminCaller {
  uid: string;
  email: string;
  roles: string[];
}

function assertAdminCaller(caller: any): asserts caller is VerifiedAdminCaller {
  if (!caller || typeof caller !== 'object' || !caller.email) {
    throw new Error('UNAUTHENTICATED: Authentication token is required.');
  }
  const isSuperAdmin = caller.roles?.includes('superadmin') || caller.roles?.includes('super_admin');
  const isAdmin = caller.roles?.includes('admin') || 
                  caller.roles?.includes('order_manager') || 
                  caller.roles?.includes('catalog_manager') ||
                  caller.roles?.includes('support_manager') ||
                  caller.roles?.includes('support_executive') ||
                  caller.roles?.includes('support_agent');

  if (!isSuperAdmin && !isAdmin) {
    throw new Error('PERMISSION_DENIED: Access restricted to authorized administrative staff.');
  }
}

const STAFF_ROLES = [
  'superadmin', 'super_admin', 'admin',
  'catalog_manager', 'product_executive',
  'order_manager', 'order_executive',
  'support_manager', 'support_executive', 'support_agent'
];

const KNOWN_ADMIN_EMAILS = [
  'superadmin@muety.in',
  'admin@muety.in',
  'catalog@muety.in',
  'kalvi@muety.in',
  'vignesh.admin@muety.in',
  'mohan.admin@muety.in'
];

function isStaffData(data: any): boolean {
  if (!data) return false;
  const role = (data.roleSlug || data.role || '').toLowerCase();
  if (STAFF_ROLES.includes(role)) return true;

  if (Array.isArray(data.roles) && data.roles.some((r: string) => STAFF_ROLES.includes(r.toLowerCase()))) {
    return true;
  }

  const email = (data.email || data.muetyEmail || '').toLowerCase().trim();
  if (KNOWN_ADMIN_EMAILS.includes(email)) return true;

  if (email.endsWith('@muety.in') || email.endsWith('@muetystore.com')) {
    if (email !== 'patron@muety.in' && data.role !== 'customer') {
      return true;
    }
  }

  return false;
}

function normalizePhone(p?: string | null, defaultCountryCode: string = '+91'): string {
  if (!p) return '';
  const cleaned = String(p).trim();
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

function isGeneratedPatronName(name?: string | null): boolean {
  if (!name) return true;
  const clean = name.trim();
  if (!clean) return true;
  if (/^Patron(\s*\(?\d+\)?)?$/i.test(clean)) return true;
  if (/^MUETY Patron/i.test(clean)) return true;
  if (/^Valued Patron/i.test(clean)) return true;
  return false;
}

/**
 * Normalizes raw Firestore document data into a consistent UserProfile structure
 */
function normalizeDocToUserProfile(docId: string, data: any): any {
  const uid = data.uid || docId;
  const rawEmail = data.email || '';
  const cleanEmail = (rawEmail && rawEmail.toLowerCase().trim() !== 'customer@muety.com') ? rawEmail.trim() : '';

  const rawPhone = data.phoneNumber || data.phone || '';
  const phone = rawPhone ? normalizePhone(String(rawPhone)) : '';

  const rawName = data.displayName?.trim() || data.fullName?.trim() || '';
  const displayName = (!rawName || isGeneratedPatronName(rawName))
    ? (phone ? `Patron (${phone.slice(-4)})` : (cleanEmail ? cleanEmail.split('@')[0] : 'Patron'))
    : rawName;

  return {
    uid,
    email: cleanEmail,
    displayName,
    fullName: displayName,
    phoneNumber: phone,
    phone,
    whatsappPhone: data.whatsappPhone ? normalizePhone(String(data.whatsappPhone)) : phone,
    alternatePhone: data.alternatePhone ? normalizePhone(String(data.alternatePhone)) : '',
    role: data.role || 'customer',
    roles: Array.isArray(data.roles) ? data.roles : ['customer'],
    customerStatus: data.customerStatus || (data.isBlocked ? 'blocked' : 'active'),
    isBlocked: Boolean(data.isBlocked || data.customerStatus === 'blocked'),
    addresses: Array.isArray(data.addresses) ? data.addresses : [],
    ordersCount: Number(data.ordersCount) || Number(data.orderCount) || 0,
    totalSpent: Number(data.totalSpent) || Number(data.totalSpend) || 0,
    patronCircleMember: Boolean(data.patronCircleMember || data.joinCircle || data.isPatronCircle),
    patronCircleJoinedAt: data.patronCircleJoinedAt || undefined,
    patronCircleConsentText: data.patronCircleConsentText || undefined,
    marketingConsent: data.marketingConsent !== undefined ? Boolean(data.marketingConsent) : undefined,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
    connectedProviders: Array.isArray(data.connectedProviders) ? data.connectedProviders : (phone ? ['phone'] : (cleanEmail ? ['google.com'] : []))
  };
}

/**
 * POST /api/customers/list
 * Server-authoritative customer list endpoint for Patron CRM.
 * Reads directly from Cloud Firestore collections ('users', 'customers', and 'orders') via Firebase Admin SDK.
 * Preserves canonical UID identities without silent merging by phone or email.
 */
export async function handleListCustomers(authHeader: string | undefined, _body?: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  const db = getAdminFirestore();
  if (!db) {
    return {
      success: true,
      customers: [],
      source: 'uninitialized_admin_firestore',
      message: 'Firestore Admin is not initialized; fallback to local mode.'
    };
  }

  const customerMap = new Map<string, any>();
  const emailToUidMap = new Map<string, string>();
  const phoneToUidsMap = new Map<string, string[]>();

  let customersRead = 0;
  let usersRead = 0;
  let ordersRead = 0;

  // 1. Fetch from 'customers' collection
  try {
    const customersSnap = await db.collection('customers').get();
    customersRead = customersSnap.size;
    customersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (!isStaffData(data)) {
        const profile = normalizeDocToUserProfile(docSnap.id, data);
        customerMap.set(profile.uid, profile);
        if (profile.email) {
          emailToUidMap.set(profile.email.toLowerCase(), profile.uid);
        }
        if (profile.phoneNumber) {
          const normP = normalizePhone(profile.phoneNumber);
          if (normP) {
            const list = phoneToUidsMap.get(normP) || [];
            if (!list.includes(profile.uid)) list.push(profile.uid);
            phoneToUidsMap.set(normP, list);
          }
        }
      }
    });
  } catch (err: any) {
    console.warn('[customerApi] Error reading customers collection:', err?.message || err);
  }

  // 2. Fetch from 'users' collection and reconcile by canonical UID (NEVER merge different UIDs by phone)
  try {
    const usersSnap = await db.collection('users').get();
    usersRead = usersSnap.size;
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (!isStaffData(data)) {
        const uid = data.uid || docSnap.id;
        const incoming = normalizeDocToUserProfile(uid, data);

        if (customerMap.has(uid)) {
          // Reconcile user profile fields for the exact same canonical UID
          const existing = customerMap.get(uid)!;
          customerMap.set(uid, {
            ...existing,
            ...incoming,
            uid,
            displayName: incoming.displayName || existing.displayName,
            fullName: incoming.fullName || existing.fullName,
            phoneNumber: incoming.phoneNumber || existing.phoneNumber,
            phone: incoming.phone || existing.phone,
            email: incoming.email || existing.email,
            addresses: (incoming.addresses && incoming.addresses.length > 0) ? incoming.addresses : existing.addresses,
            patronCircleMember: Boolean(incoming.patronCircleMember || existing.patronCircleMember),
            patronCircleJoinedAt: incoming.patronCircleJoinedAt || existing.patronCircleJoinedAt
          });
        } else {
          customerMap.set(uid, incoming);
        }

        if (incoming.email) {
          emailToUidMap.set(incoming.email.toLowerCase(), uid);
        }
        if (incoming.phoneNumber) {
          const normP = normalizePhone(incoming.phoneNumber);
          if (normP) {
            const list = phoneToUidsMap.get(normP) || [];
            if (!list.includes(uid)) list.push(uid);
            phoneToUidsMap.set(normP, list);
          }
        }
      }
    });
  } catch (err: any) {
    console.warn('[customerApi] Error reading users collection:', err?.message || err);
  }

  // 2.5 Ingest registered patrons from Firebase Authentication
  // Ensures Google Sign-In and Phone Auth patrons are never omitted from Patron CRM
  let authUsersRead = 0;
  try {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      const listUsersResult = await adminAuth.listUsers(1000);
      authUsersRead = listUsersResult.users.length;
      for (const u of listUsersResult.users) {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uPhone = normalizePhone(u.phoneNumber);
        
        // Skip administrative staff accounts
        if (
          KNOWN_ADMIN_EMAILS.includes(uEmail) || 
          (uEmail.endsWith('@muety.in') && uEmail !== 'patron@muety.in') ||
          (u.customClaims?.roles && Array.isArray(u.customClaims.roles) && u.customClaims.roles.some((r: string) => STAFF_ROLES.includes(r.toLowerCase()))) ||
          (u.customClaims?.role && STAFF_ROLES.includes(String(u.customClaims.role).toLowerCase()))
        ) {
          continue;
        }

        const uid = u.uid;
        const displayName = u.displayName?.trim() || (uEmail ? uEmail.split('@')[0] : (uPhone ? `Patron (${uPhone.slice(-4)})` : 'Patron'));
        const providers = u.providerData?.map(p => p.providerId) || [];
        if (uPhone && !providers.includes('phone')) providers.push('phone');

        if (!customerMap.has(uid)) {
          // Patron exists in Firebase Auth but document was missing or blocked by client rules
          const newPatron = {
            uid,
            email: uEmail,
            displayName,
            fullName: displayName,
            phoneNumber: uPhone,
            phone: uPhone,
            whatsappPhone: uPhone,
            alternatePhone: '',
            role: 'customer',
            roles: ['customer'],
            customerStatus: u.disabled ? 'blocked' : 'active',
            isBlocked: Boolean(u.disabled),
            addresses: [],
            ordersCount: 0,
            totalSpent: 0,
            patronCircleMember: false,
            createdAt: u.metadata.creationTime || new Date().toISOString(),
            updatedAt: u.metadata.lastSignInTime || u.metadata.creationTime || new Date().toISOString(),
            connectedProviders: providers.length > 0 ? providers : (uEmail ? ['google.com'] : ['phone'])
          };

          customerMap.set(uid, newPatron);
          if (uEmail) emailToUidMap.set(uEmail, uid);
          if (uPhone) {
            const list = phoneToUidsMap.get(uPhone) || [];
            if (!list.includes(uid)) list.push(uid);
            phoneToUidsMap.set(uPhone, list);
          }

          // Auto-provision the missing customer profile to Firestore via Admin SDK so it persists permanently
          if (db) {
            try {
              const baseProfile = {
                uid,
                email: uEmail,
                displayName,
                fullName: displayName,
                phoneNumber: uPhone,
                phone: uPhone,
                role: 'customer',
                roles: ['customer'],
                customerStatus: u.disabled ? 'blocked' : 'active',
                isBlocked: Boolean(u.disabled),
                createdAt: u.metadata.creationTime || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                connectedProviders: providers
              };
              await Promise.all([
                db.collection('users').doc(uid).set(baseProfile, { merge: true }),
                db.collection('customers').doc(uid).set(baseProfile, { merge: true })
              ]);
            } catch (pErr) {
              console.warn('[customerApi] Auto-provision patron doc note:', pErr);
            }
          }
        } else {
          // Enrich existing patron with real name / providers from Firebase Auth
          const existing = customerMap.get(uid)!;
          const merged = {
            ...existing,
            email: existing.email || uEmail,
            displayName: (existing.displayName && !existing.displayName.startsWith('Patron (')) ? existing.displayName : (displayName || existing.displayName),
            fullName: (existing.fullName && !existing.fullName.startsWith('Patron (')) ? existing.fullName : (displayName || existing.fullName),
            photoURL: existing.photoURL || u.photoURL,
            phoneNumber: existing.phoneNumber || uPhone,
            phone: existing.phone || uPhone,
            connectedProviders: Array.from(new Set([...(existing.connectedProviders || []), ...providers]))
          };
          customerMap.set(uid, merged);
        }
      }
    }
  } catch (authErr: any) {
    console.warn('[customerApi] Error reading Firebase Auth users:', authErr?.message || authErr);
  }

  // 3. Scan 'orders' collection to ensure any ordering patron with a customerId is registered
  // NEVER reassign order ownership to another user because phone matches
  try {
    const ordersSnap = await db.collection('orders').get();
    ordersRead = ordersSnap.size;
    ordersSnap.forEach(docSnap => {
      const o = docSnap.data() as any;
      const orderPhone = normalizePhone(o.customerPhone || o.shippingAddress?.phone || o.phone);
      const orderEmail = (o.customerEmail || '').toLowerCase().trim();
      const orderUid = o.customerId;

      // 1. Primary link: exact canonical UID
      let matchedUid: string | null = null;
      if (orderUid && customerMap.has(orderUid)) {
        matchedUid = orderUid;
      } else if ((!orderUid || orderUid.startsWith('guest-')) && orderEmail && emailToUidMap.has(orderEmail)) {
        matchedUid = emailToUidMap.get(orderEmail)!;
      }

      if (matchedUid && customerMap.has(matchedUid)) {
        const cust = customerMap.get(matchedUid)!;
        if ((!cust.addresses || cust.addresses.length === 0) && o.shippingAddress) {
          cust.addresses = [{
            id: `addr-ord-${docSnap.id}`,
            fullName: o.shippingAddress.fullName || cust.displayName,
            phone: o.shippingAddress.phone || cust.phoneNumber,
            streetAddress: o.shippingAddress.streetAddress || '',
            apartment: o.shippingAddress.apartment || '',
            city: o.shippingAddress.city || '',
            state: o.shippingAddress.state || '',
            postalCode: o.shippingAddress.postalCode || '',
            country: o.shippingAddress.country || 'India',
            isDefault: true
          }];
        }
      } else if (orderUid || (orderEmail && !orderEmail.endsWith('@muety.in')) || orderPhone) {
        // Canonical customer profile for this UID
        const synthUid = orderUid || (orderEmail ? `cust-email-${orderEmail}` : `cust-ord-${docSnap.id}`);
        const synthName = o.customerName || (o.shippingAddress?.fullName) || (orderEmail ? orderEmail.split('@')[0] : `Patron (${orderPhone.slice(-4)})`);
        const addresses = o.shippingAddress ? [{
          id: `addr-ord-${docSnap.id}`,
          fullName: o.shippingAddress.fullName || synthName,
          phone: o.shippingAddress.phone || orderPhone,
          streetAddress: o.shippingAddress.streetAddress || '',
          city: o.shippingAddress.city || '',
          state: o.shippingAddress.state || '',
          postalCode: o.shippingAddress.postalCode || '',
          country: o.shippingAddress.country || 'India',
          isDefault: true
        }] : [];

        const synthProfile = {
          uid: synthUid,
          email: orderEmail,
          displayName: synthName,
          fullName: synthName,
          phoneNumber: orderPhone,
          phone: orderPhone,
          role: 'customer',
          roles: ['customer'],
          customerStatus: 'active',
          isBlocked: false,
          addresses,
          createdAt: o.createdAt || new Date().toISOString(),
          updatedAt: o.updatedAt || o.createdAt || new Date().toISOString()
        };

        customerMap.set(synthUid, synthProfile);
        if (orderEmail) emailToUidMap.set(orderEmail, synthUid);
        if (orderPhone) {
          const list = phoneToUidsMap.get(orderPhone) || [];
          if (!list.includes(synthUid)) list.push(synthUid);
          phoneToUidsMap.set(orderPhone, list);
        }
      }
    });
  } catch (err: any) {
    console.warn('[customerApi] Error scanning orders for patrons:', err?.message || err);
  }

  // Annotate conflicting phone accounts without unauthorized account merging
  let conflictsDetected = 0;
  customerMap.forEach(customer => {
    const p = normalizePhone(customer.phoneNumber || customer.phone);
    if (p && phoneToUidsMap.has(p)) {
      const uidsWithPhone = phoneToUidsMap.get(p)!;
      if (uidsWithPhone.length > 1) {
        customer.hasIdentityConflict = true;
        customer.conflictingUids = uidsWithPhone.filter(id => id !== customer.uid);
        customer.conflictReason = 'shared_phone_number';
        conflictsDetected++;
      }
    }
  });

  const customersList = Array.from(customerMap.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  return {
    success: true,
    customers: customersList,
    count: customersList.length,
    stats: {
      read: customersRead + usersRead + ordersRead + authUsersRead,
      customersSnapCount: customersRead,
      usersSnapCount: usersRead,
      authUsersCount: authUsersRead,
      ordersSnapCount: ordersRead,
      conflictsDetected
    }
  };
}

/**
 * POST /api/customers/update
 * Updates customer contact, status, or addresses with server admin authority
 */
export async function handleUpdateCustomerServer(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  if (!body || !body.uid) {
    throw new Error('INVALID_ARGUMENT: Customer uid is required.');
  }

  const db = getAdminFirestore();
  const uid = body.uid;
  const updates = { ...body };
  delete updates.internalNotes; // Never persist internal notes to user profile directly

  updates.updatedAt = new Date().toISOString();

  if (db) {
    try {
      const batch = db.batch();
      const userRef = db.collection('users').doc(uid);
      const custRef = db.collection('customers').doc(uid);
      batch.set(userRef, updates, { merge: true });
      batch.set(custRef, updates, { merge: true });
      await batch.commit();
    } catch (err: any) {
      console.warn('[customerApi] Firestore update error:', err?.message || err);
    }
  }

  return {
    success: true,
    customer: updates
  };
}

/**
 * POST /api/customers/delete
 * Permanently deletes patron from Firebase Auth, Firestore users, customers, and associated records
 */
export async function handleDeleteCustomerServer(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  if (!body || !body.uid) {
    throw new Error('INVALID_ARGUMENT: Customer uid is required.');
  }

  const uid = body.uid;
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  if (db) {
    try {
      const custDocRef = db.collection('customers').doc(uid);
      const notesSnap = await custDocRef.collection('crmNotes').get();
      for (const n of notesSnap.docs) {
        await n.ref.delete();
      }

      await Promise.all([
        db.collection('users').doc(uid).delete(),
        custDocRef.delete(),
        db.collection('carts').doc(uid).delete(),
        db.collection('wishlists').doc(uid).delete()
      ]);

      // Delete associated inquiries
      if (body.email) {
        const inqSnap = await db.collection('inquiries').where('email', '==', body.email).get();
        for (const i of inqSnap.docs) {
          await i.ref.delete();
        }
      }
    } catch (err: any) {
      console.warn('[customerApi] Firestore delete error:', err?.message || err);
    }
  }

  if (auth) {
    try {
      await auth.deleteUser(uid);
    } catch (authErr: any) {
      // If user was already deleted from Auth, do not fail
      console.warn('[customerApi] Auth user delete notice:', authErr?.message || authErr);
    }
  }

  return {
    success: true,
    message: `Patron account ${uid} permanently deleted.`
  };
}

