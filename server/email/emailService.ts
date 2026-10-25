import crypto from 'crypto';
import { getAdminFirestore } from '../firebaseAdmin';
import { sendResendEmail, formatFromSender } from './resendClient';
import {
  EmailSettings,
  EmailCampaign,
  AudienceFilter,
  SuppressionRecord,
  TransactionalNotificationJob,
  AudienceEstimateResult,
  CampaignDispatchResult
} from './types';
import { renderOrderConfirmationEmail, OrderEmailData } from './templates/orderConfirmationTemplate';
import { renderAdminOrderNotificationEmail } from './templates/adminOrderNotificationTemplate';
import { renderPromotionalCampaign } from './templates/campaignTemplates';

function parseSenderConfig(envVal: string | undefined, defaultEmail: string, defaultName: string): { email: string; name: string } {
  if (!envVal || !envVal.trim()) return { email: defaultEmail, name: defaultName };
  const trimmed = envVal.trim();
  const match = trimmed.match(/^(?:(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?)$/);
  if (match) {
    return {
      name: (match[1] || defaultName).trim(),
      email: (match[2] || defaultEmail).trim().toLowerCase()
    };
  }
  if (trimmed.includes('@')) {
    return { email: trimmed.toLowerCase(), name: defaultName };
  }
  return { email: defaultEmail, name: defaultName };
}

const envOrdersSender = parseSenderConfig(
  process.env.RESEND_ORDERS_FROM_EMAIL,
  'orders@muety.in',
  'MUETY Orders'
);

const envMarketingSender = parseSenderConfig(
  process.env.RESEND_MARKETING_FROM_EMAIL,
  'promotions@muety.in',
  'MUETY Promotions'
);

// In-memory fallbacks when running without live Firestore or in unit test mode
let inMemorySettings: EmailSettings = {
  provider: 'resend',
  sendingDomain: 'muety.in',
  domainVerified: false,
  status: process.env.RESEND_API_KEY ? 'active' : 'not_configured',
  marketingSender: envMarketingSender,
  transactionalSender: envOrdersSender,
  replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'support@muety.in',
  centralOrdersRecipient: process.env.CENTRAL_ORDERS_RECIPIENT || 'orders@muety.in',
  managementRecipients: ['management@muety.in'],
  fulfillmentRecipients: ['fulfilment@muety.in'],
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

const inMemoryCampaigns = new Map<string, EmailCampaign>();
const inMemorySuppressionList = new Map<string, SuppressionRecord>();
const inMemoryTransactionalJobs = new Map<string, TransactionalNotificationJob>();

function getDb() {
  return getAdminFirestore();
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET || 'muety_patron_unsubscribe_secure_hmac';
  return crypto.createHmac('sha256', secret).update(normalizeEmail(email)).digest('hex').substring(0, 24);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expected = generateUnsubscribeToken(email);
  return token.toLowerCase() === expected.toLowerCase();
}

// ==========================================
// 1. EMAIL SETTINGS (Module A.2, B.4, C)
// ==========================================

export async function getEmailSettings(): Promise<EmailSettings> {
  const db = getDb();
  if (db) {
    try {
      const doc = await db.collection('emailSettings').doc('global').get();
      if (doc.exists) {
        const data = doc.data() as Partial<EmailSettings>;
        return {
          ...inMemorySettings,
          ...data,
          status: process.env.RESEND_API_KEY ? 'active' : 'not_configured'
        };
      }
    } catch (err) {
      console.warn('[EmailService] Firestore settings read failed, using cache:', err);
    }
  }

  return {
    ...inMemorySettings,
    status: process.env.RESEND_API_KEY ? 'active' : 'not_configured'
  };
}

export async function updateEmailSettings(
  updates: Partial<EmailSettings>,
  actorEmail: string
): Promise<EmailSettings> {
  const current = await getEmailSettings();
  const nextSettings: EmailSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
    status: process.env.RESEND_API_KEY ? 'active' : 'not_configured'
  };

  inMemorySettings = nextSettings;

  const db = getDb();
  if (db) {
    try {
      await db.collection('emailSettings').doc('global').set(nextSettings, { merge: true });
    } catch (err) {
      console.error('[EmailService] Failed to persist email settings to Firestore:', err);
    }
  }

  return nextSettings;
}

// ==========================================
// 2. SUPPRESSION LIST & CONSENT (Module A.3)
// ==========================================

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (inMemorySuppressionList.has(normalized)) return true;

  const db = getDb();
  if (db) {
    try {
      const doc = await db.collection('emailSuppressionList').doc(normalized).get();
      if (doc.exists) {
        return true;
      }
    } catch (err) {
      console.warn('[EmailService] Error checking suppression list in Firestore:', err);
    }
  }
  return false;
}

export async function handleUnsubscribe(
  email: string,
  reason = 'Patron requested 1-click unsubscribe'
): Promise<{ success: boolean; email: string; unsubscribedAt: string }> {
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();

  const record: SuppressionRecord = {
    email: normalized,
    reason,
    source: 'unsubscribe_link',
    createdAt: now
  };

  inMemorySuppressionList.set(normalized, record);

  const db = getDb();
  if (db) {
    try {
      // 1. Add to suppression list
      await db.collection('emailSuppressionList').doc(normalized).set(record);

      // 2. Revoke marketing consent on patron user & customer documents
      const userMatches = await db.collection('users').where('email', '==', normalized).get();
      const batch = db.batch();

      userMatches.forEach(docSnap => {
        batch.update(docSnap.ref, {
          marketingConsent: false,
          patronCircleMember: false,
          unsubscribedAt: now,
          updatedAt: now
        });
      });

      const customerMatches = await db.collection('customers').where('email', '==', normalized).get();
      customerMatches.forEach(docSnap => {
        batch.update(docSnap.ref, {
          marketingConsent: false,
          patronCircleMember: false,
          unsubscribedAt: now,
          updatedAt: now
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('[EmailService] Failed to record unsubscribe in Firestore:', err);
    }
  }

  return { success: true, email: normalized, unsubscribedAt: now };
}

// ==========================================
// 3. AUDIENCE ESTIMATION (Module A.3)
// ==========================================

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
  if (Array.isArray(data.roles) && data.roles.some((r: string) => STAFF_ROLES.includes(r.toLowerCase()))) return true;
  const email = (data.email || data.muetyEmail || '').toLowerCase().trim();
  if (KNOWN_ADMIN_EMAILS.includes(email)) return true;
  if (email.endsWith('@muety.in') || email.endsWith('@muetystore.com')) {
    if (email !== 'patron@muety.in' && data.role !== 'customer') return true;
  }
  return false;
}

function normalizeE164Phone(p?: string | null): string {
  if (!p) return '';
  const digits = String(p).replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  const noZero = digits.replace(/^0+/, '');
  return noZero.length === 10 ? `+91${noZero}` : `+${noZero}`;
}

export interface PatronCandidate {
  uid: string;
  email: string;
  phone?: string;
  name?: string;
  marketingConsent?: boolean;
  patronCircleMember?: boolean;
  createdAt?: string;
  customerStatus?: string;
  completedOrdersCount?: number;
  totalSpent?: number;
}

export async function fetchEligibleAudience(
  filter: AudienceFilter | AudienceFilter[] | string
): Promise<{ eligible: PatronCandidate[]; excludedNoConsent: number; suppressedCount: number }> {
  const db = getDb();
  const candidateMap = new Map<string, PatronCandidate>();
  const phoneToEmail = new Map<string, string>();

  if (db) {
    try {
      const [usersSnap, customersSnap, ordersSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('customers').get(),
        db.collection('orders').get().catch(() => ({ forEach: () => {} } as any))
      ]);

      // 1. Build contact phone-to-email fallback lookup for phone-authenticated patrons
      usersSnap.forEach(d => {
        const u = d.data();
        if (!isStaffData(u)) {
          const em = (u.email || '').trim().toLowerCase();
          const ph = normalizeE164Phone(u.phoneNumber || u.phone);
          if (em && ph && !phoneToEmail.has(ph)) {
            phoneToEmail.set(ph, em);
          }
        }
      });

      ordersSnap.forEach((d: any) => {
        const o = d.data();
        const em = (o.customerEmail || o.shippingAddress?.email || '').trim().toLowerCase();
        const ph = normalizeE164Phone(o.customerPhone || o.shippingAddress?.phone || o.phone);
        if (em && ph && !phoneToEmail.has(ph)) {
          phoneToEmail.set(ph, em);
        }
      });

      // 2. Ingest customers and users collections
      const processDoc = (docId: string, data: any) => {
        if (isStaffData(data)) return;

        const uid = data.uid || docId;
        let email = (data.email || '').trim().toLowerCase();
        const phone = normalizeE164Phone(data.phoneNumber || data.phone);

        // Fallback resolve email if patron authenticated via mobile OTP
        if (!email && phone && phoneToEmail.has(phone)) {
          email = phoneToEmail.get(phone)!;
        }

        // MUETY Business Rule: Patron Circle is the explicit consent.
        // Patrons outside Patron Circle are without consent from patron.
        const isCircle = Boolean(data.patronCircleMember || data.isPatronCircle || data.tier === 'patron_circle');
        const isConsented = isCircle || Boolean(data.marketingConsent || data.emailConsent);

        const existing = candidateMap.get(uid) || {
          uid,
          email: email || '',
          phone: phone || '',
          name: data.displayName || data.fullName || data.name || '',
          patronCircleMember: false,
          marketingConsent: false,
          createdAt: data.createdAt,
          customerStatus: data.customerStatus,
          completedOrdersCount: Number(data.completedOrdersCount) || Number(data.ordersCount) || 0,
          totalSpent: Number(data.totalSpent) || 0
        };

        if (email && !existing.email) existing.email = email;
        if (phone && !existing.phone) existing.phone = phone;
        if (isCircle) existing.patronCircleMember = true;
        if (isConsented) existing.marketingConsent = true;
        if (data.displayName && (!existing.name || existing.name.startsWith('Patron ('))) {
          existing.name = data.displayName;
        }
        if (data.createdAt && !existing.createdAt) existing.createdAt = data.createdAt;
        if (data.customerStatus && !existing.customerStatus) existing.customerStatus = data.customerStatus;
        if (data.completedOrdersCount) existing.completedOrdersCount = Math.max(existing.completedOrdersCount || 0, Number(data.completedOrdersCount));
        if (data.totalSpent) existing.totalSpent = Math.max(existing.totalSpent || 0, Number(data.totalSpent));

        candidateMap.set(uid, existing);
      };

      customersSnap.forEach(d => processDoc(d.id, d.data()));
      usersSnap.forEach(d => processDoc(d.id, d.data()));
    } catch (err) {
      console.warn('[EmailService] Firestore audience fetch note:', err);
    }
  }

  // Deduplicate candidates by email when email is present
  const byEmail = new Map<string, PatronCandidate>();
  let excludedNoConsent = 0;
  let suppressedCount = 0;
  const eligible: PatronCandidate[] = [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const filterList: AudienceFilter[] = Array.isArray(filter)
    ? filter
    : typeof filter === 'string' && filter.includes(',')
      ? filter.split(',').map(s => s.trim() as AudienceFilter)
      : [filter as AudienceFilter];

  const hasAll = filterList.includes('all_consented') || filterList.length === 0;

  for (const patron of candidateMap.values()) {
    // 1. Consent verification: In MUETY, Patron Circle is the explicit marketing consent
    if (!patron.marketingConsent && !patron.patronCircleMember) {
      excludedNoConsent++;
      continue;
    }

    // 2. Check suppression list (if email is present)
    if (patron.email && (await isEmailSuppressed(patron.email))) {
      suppressedCount++;
      continue;
    }

    // 3. Multi-segment evaluation: patron qualifies if they match ANY active filter
    if (!hasAll) {
      let matches = false;
      for (const f of filterList) {
        if (f === 'patron_circle' && patron.patronCircleMember === true) {
          matches = true;
          break;
        }
        if (f === 'new_patrons' && patron.createdAt && patron.createdAt >= thirtyDaysAgo) {
          matches = true;
          break;
        }
        if (f === 'completed_orders' && (patron.completedOrdersCount || 0) >= 1) {
          matches = true;
          break;
        }
        if (f === 'vip_patrons') {
          const isVip = patron.customerStatus === 'VIP' || (patron.totalSpent && patron.totalSpent >= 50000);
          if (isVip) {
            matches = true;
            break;
          }
        }
        if (f === 'custom_segment') {
          matches = true;
          break;
        }
      }
      if (!matches) {
        continue;
      }
    }

    // Deduplicate by normalized email
    if (patron.email) {
      const normEmail = normalizeEmail(patron.email);
      if (!byEmail.has(normEmail)) {
        byEmail.set(normEmail, patron);
        eligible.push(patron);
      }
    } else {
      eligible.push(patron);
    }
  }

  return { eligible, excludedNoConsent, suppressedCount };
}

export async function getAudienceEstimate(
  filter: AudienceFilter | AudienceFilter[] | string
): Promise<AudienceEstimateResult> {
  const { eligible, excludedNoConsent, suppressedCount } = await fetchEligibleAudience(filter);
  return {
    filter,
    eligibleCount: eligible.length,
    excludedNoConsentCount: excludedNoConsent,
    suppressedCount,
    totalChecked: eligible.length + excludedNoConsent + suppressedCount
  };
}

// ==========================================
// 4. PROMOTIONAL CAMPAIGNS (Module A.1, A.4)
// ==========================================

export async function listCampaigns(): Promise<EmailCampaign[]> {
  const db = getDb();
  if (db) {
    try {
      const snap = await db.collection('emailCampaigns').orderBy('createdAt', 'desc').get();
      const list: EmailCampaign[] = [];
      snap.forEach(d => list.push({ ...(d.data() as EmailCampaign), id: d.id }));
      return list;
    } catch (err) {
      console.warn('[EmailService] Firestore listCampaigns fallback:', err);
    }
  }

  return Array.from(inMemoryCampaigns.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getCampaignById(id: string): Promise<EmailCampaign | null> {
  const db = getDb();
  if (db) {
    try {
      const doc = await db.collection('emailCampaigns').doc(id).get();
      if (doc.exists) {
        return { ...(doc.data() as EmailCampaign), id: doc.id };
      }
    } catch (err) {
      console.warn('[EmailService] Firestore getCampaignById fallback:', err);
    }
  }
  return inMemoryCampaigns.get(id) || null;
}

export async function saveCampaign(
  campaign: Partial<EmailCampaign>,
  actorEmail: string
): Promise<EmailCampaign> {
  const id = campaign.id || `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const existing = id ? await getCampaignById(id) : null;

  const fullCampaign: EmailCampaign = {
    id,
    name: campaign.name || existing?.name || 'Untitled Atelier Campaign',
    subject: campaign.subject || existing?.subject || 'Exquisite Handlooms from MUETY Atelier',
    headline: campaign.headline || existing?.headline || 'A Celebration of Royal Weaves',
    subheadline: campaign.subheadline !== undefined ? campaign.subheadline : (existing?.subheadline || ''),
    previewText: campaign.previewText !== undefined ? campaign.previewText : (existing?.previewText || ''),
    bodyContent: campaign.bodyContent || existing?.bodyContent || '<p>Discover our newest pure silk creations.</p>',
    heroImageUrl: campaign.heroImageUrl || existing?.heroImageUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c',
    ctaText: campaign.ctaText || existing?.ctaText || 'Explore Handlooms',
    ctaUrl: campaign.ctaUrl || existing?.ctaUrl || 'https://store.muety.in',
    status: campaign.status || existing?.status || 'draft',
    audienceFilter: campaign.audienceFilter || (campaign.audienceFilters?.[0]) || existing?.audienceFilter || 'all_consented',
    audienceFilters: campaign.audienceFilters || (campaign.audienceFilter ? [campaign.audienceFilter] : existing?.audienceFilters) || ['all_consented'],
    senderIdentity: campaign.senderIdentity || existing?.senderIdentity || {
      email: 'promotions@muety.in',
      name: 'MUETY Promotions'
    },
    featuredProducts: campaign.featuredProducts || existing?.featuredProducts || [],
    recipientCount: typeof campaign.recipientCount === 'number' ? campaign.recipientCount : (existing?.recipientCount || 0),
    deliveredCount: typeof campaign.deliveredCount === 'number' ? campaign.deliveredCount : (existing?.deliveredCount || 0),
    failedCount: typeof campaign.failedCount === 'number' ? campaign.failedCount : (existing?.failedCount || 0),
    errorMessage: campaign.errorMessage !== undefined ? campaign.errorMessage : (existing?.errorMessage || ''),
    sentAt: campaign.sentAt || existing?.sentAt || (campaign.status === 'sent' ? now : undefined),
    createdAt: existing?.createdAt || campaign.createdAt || now,
    updatedAt: now,
    createdBy: existing?.createdBy || campaign.createdBy || actorEmail
  };

  inMemoryCampaigns.set(id, fullCampaign);

  const db = getDb();
  if (db) {
    try {
      const cleanData: Record<string, any> = {};
      for (const [k, v] of Object.entries(fullCampaign)) {
        if (v !== undefined) {
          cleanData[k] = v;
        }
      }
      await db.collection('emailCampaigns').doc(id).set(cleanData, { merge: true });
    } catch (err) {
      console.error('[EmailService] Failed to persist campaign to Firestore:', err);
      throw err;
    }
  }

  return fullCampaign;
}

export async function duplicateCampaign(id: string, actorEmail: string): Promise<EmailCampaign> {
  const original = await getCampaignById(id);
  if (!original) {
    throw new Error('Campaign not found');
  }

  const copyPayload: Partial<EmailCampaign> = {
    ...original,
    id: undefined,
    name: `${original.name} (Copy)`,
    status: 'draft',
    recipientCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    sentAt: undefined,
    createdAt: new Date().toISOString(),
    createdBy: actorEmail
  };

  return await saveCampaign(copyPayload, actorEmail);
}

export async function sendCampaignTestEmail(
  campaignId: string,
  testRecipient: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const settings = await getEmailSettings();
  const token = generateUnsubscribeToken(testRecipient);
  const storeUrl = process.env.MUETY_STORE_URL || 'https://store.muety.in';
  const unsubscribeUrl = `${storeUrl}/unsubscribe?email=${encodeURIComponent(testRecipient)}&token=${token}`;

  const html = renderPromotionalCampaign({
    campaignTitle: campaign.name,
    headline: campaign.headline,
    subheadline: campaign.subheadline,
    previewText: campaign.previewText,
    heroImageUrl: campaign.heroImageUrl,
    bodyContent: campaign.bodyContent,
    ctaText: campaign.ctaText,
    ctaUrl: campaign.ctaUrl,
    featuredProducts: campaign.featuredProducts,
    unsubscribeUrl,
    storeUrl
  });

  const fromSender = formatFromSender(campaign.senderIdentity.name, campaign.senderIdentity.email);

  return await sendResendEmail({
    from: fromSender,
    to: testRecipient,
    replyTo: settings.replyTo,
    subject: `[TEST PREVIEW] ${campaign.subject}`,
    html,
    idempotencyKey: `test_${campaignId}_${Date.now()}`
  });
}

export async function dispatchCampaign(
  campaignId: string,
  actorEmail: string
): Promise<CampaignDispatchResult> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'sent' || campaign.status === 'sending') {
    throw new Error(`FAILED_PRECONDITION: CAMPAIGN_ALREADY_DISPATCHED: Campaign cannot be dispatched in its current state (${campaign.status}).`);
  }

  const settings = await getEmailSettings();

  // Validate marketing sender configuration
  if (!settings.marketingSender?.email) {
    throw new Error('FAILED_PRECONDITION: SENDER_NOT_CONFIGURED: Marketing sender email is not configured.');
  }

  // Validate provider configuration
  if (!process.env.RESEND_API_KEY && !process.env.VITEST) {
    await saveCampaign({ ...campaign, status: 'draft', errorMessage: 'PROVIDER_NOT_CONFIGURED: Missing RESEND_API_KEY' }, actorEmail);
    throw new Error('FAILED_PRECONDITION: PROVIDER_NOT_CONFIGURED: Sending failed. Please configure RESEND_API_KEY on the server before dispatching live campaigns.');
  }

  // 1. Fetch eligible and consented patrons only
  const targetFilter = (campaign.audienceFilters && campaign.audienceFilters.length > 0)
    ? campaign.audienceFilters
    : campaign.audienceFilter;
  const { eligible } = await fetchEligibleAudience(targetFilter);

  if (eligible.length === 0) {
    await saveCampaign({ 
      ...campaign, 
      status: 'draft', 
      errorMessage: 'Zero eligible recipients matched the selected audience filter.' 
    }, actorEmail);
    throw new Error('FAILED_PRECONDITION: ZERO_ELIGIBLE_RECIPIENTS: Cannot dispatch promotional campaign. Zero eligible consented recipients match the selected audience segment.');
  }

  // Mark status as sending
  await saveCampaign({ ...campaign, status: 'sending', recipientCount: eligible.length }, actorEmail);

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const storeUrl = process.env.MUETY_STORE_URL || 'https://store.muety.in';

  // 2. Dispatch individually to ensure complete privacy (never expose one patron's email to another)
  for (const patron of eligible) {
    if (!patron.email || !patron.email.includes('@')) {
      console.warn(`[EmailService] Skipping recipient UID ${patron.uid} (${patron.name || 'Patron'}): No valid email address configured.`);
      continue;
    }
    try {
      const token = generateUnsubscribeToken(patron.email);
      const unsubscribeUrl = `${storeUrl}/unsubscribe?email=${encodeURIComponent(patron.email)}&token=${token}`;

      const html = renderPromotionalCampaign({
        campaignTitle: campaign.name,
        headline: campaign.headline,
        subheadline: campaign.subheadline,
        previewText: campaign.previewText,
        heroImageUrl: campaign.heroImageUrl,
        bodyContent: campaign.bodyContent,
        ctaText: campaign.ctaText,
        ctaUrl: campaign.ctaUrl,
        featuredProducts: campaign.featuredProducts,
        unsubscribeUrl,
        storeUrl
      });

      const fromSender = formatFromSender(campaign.senderIdentity.name, campaign.senderIdentity.email);
      const idempotencyKey = `cmp_${campaign.id}_${patron.email}`;

      const res = await sendResendEmail({
        from: fromSender,
        to: patron.email,
        replyTo: settings.replyTo,
        subject: campaign.subject,
        html,
        idempotencyKey
      });

      if (res.success) {
        sentCount++;
      } else {
        failedCount++;
        if (res.error) errors.push(`${patron.email}: ${res.error}`);
      }
    } catch (sendErr: any) {
      failedCount++;
      errors.push(`${patron.email}: ${sendErr.message}`);
    }
  }

  const finalStatus = sentCount > 0 ? 'sent' : 'failed';
  await saveCampaign({
    ...campaign,
    status: finalStatus,
    deliveredCount: sentCount,
    failedCount,
    sentAt: new Date().toISOString(),
    errorMessage: errors.length > 0 ? errors.slice(0, 3).join('; ') : ''
  }, actorEmail);

  return {
    campaignId,
    status: finalStatus,
    totalTargeted: eligible.length,
    sentCount,
    failedCount,
    errors
  };
}

// ==========================================
// 5. ORDER NOTIFICATION DISPATCHER (Module B)
// ==========================================

export async function processOrderConfirmationEmails(orderPayload: OrderEmailData): Promise<{
  patronNotified: boolean;
  adminNotified: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let patronNotified = false;
  let adminNotified = false;

  const db = getDb();
  const settings = await getEmailSettings();
  const storeUrl = process.env.MUETY_STORE_URL || 'https://store.muety.in';

  // -------------------------------------------------------------
  // Part 1: Patron Order Confirmation (Idempotent per Order ID)
  // -------------------------------------------------------------
  const patronJobId = `order_${orderPayload.id}_patron`;
  try {
    let alreadyProcessed = false;

    if (inMemoryTransactionalJobs.has(patronJobId)) {
      const existing = inMemoryTransactionalJobs.get(patronJobId);
      if (existing?.status === 'sent') alreadyProcessed = true;
    }

    if (!alreadyProcessed && db) {
      const jobDoc = await db.collection('emailTransactionalJobs').doc(patronJobId).get();
      if (jobDoc.exists && jobDoc.data()?.status === 'sent') {
        alreadyProcessed = true;
      }
    }

    if (alreadyProcessed) {
      console.log(`[EmailService] Patron confirmation already sent for order ${orderPayload.orderNumber}, skipping.`);
      patronNotified = true;
    } else if (orderPayload.customerEmail) {
      const { subject, html } = renderOrderConfirmationEmail(orderPayload, storeUrl);
      const fromSender = formatFromSender(settings.transactionalSender.name, settings.transactionalSender.email);

      const sendRes = await sendResendEmail({
        from: fromSender,
        to: orderPayload.customerEmail,
        replyTo: settings.replyTo,
        subject,
        html,
        idempotencyKey: patronJobId
      });

      const jobRecord: TransactionalNotificationJob = {
        jobId: patronJobId,
        orderId: orderPayload.id,
        orderNumber: orderPayload.orderNumber,
        recipient: orderPayload.customerEmail,
        type: 'patron_confirmation',
        status: sendRes.success ? 'sent' : 'failed',
        error: sendRes.error,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      };

      inMemoryTransactionalJobs.set(patronJobId, jobRecord);
      if (db) {
        await db.collection('emailTransactionalJobs').doc(patronJobId).set(jobRecord);
      }

      if (sendRes.success) {
        patronNotified = true;
      } else if (sendRes.error) {
        errors.push(`Patron email: ${sendRes.error}`);
      }
    }
  } catch (patronErr: any) {
    console.error(`[EmailService] Patron order notification failure for ${orderPayload.orderNumber}:`, patronErr);
    errors.push(`Patron email exception: ${patronErr.message}`);
  }

  // -------------------------------------------------------------
  // Part 2: Admin Operational Notification (Idempotent per Order ID)
  // -------------------------------------------------------------
  const adminJobId = `order_${orderPayload.id}_admin`;
  try {
    let adminAlreadyProcessed = false;

    if (inMemoryTransactionalJobs.has(adminJobId)) {
      const existing = inMemoryTransactionalJobs.get(adminJobId);
      if (existing?.status === 'sent') adminAlreadyProcessed = true;
    }

    if (!adminAlreadyProcessed && db) {
      const jobDoc = await db.collection('emailTransactionalJobs').doc(adminJobId).get();
      if (jobDoc.exists && jobDoc.data()?.status === 'sent') {
        adminAlreadyProcessed = true;
      }
    }

    if (adminAlreadyProcessed) {
      console.log(`[EmailService] Admin notification already sent for order ${orderPayload.orderNumber}, skipping.`);
      adminNotified = true;
    } else {
      // Aggregate configured admin recipients safely
      const adminRecipientsSet = new Set<string>();
      if (settings.centralOrdersRecipient) adminRecipientsSet.add(normalizeEmail(settings.centralOrdersRecipient));
      (settings.managementRecipients || []).forEach(r => adminRecipientsSet.add(normalizeEmail(r)));
      (settings.fulfillmentRecipients || []).forEach(r => adminRecipientsSet.add(normalizeEmail(r)));

      const adminRecipients = Array.from(adminRecipientsSet).filter(r => r && r.includes('@'));

      if (adminRecipients.length > 0) {
        const adminUrl = process.env.ADMIN_APP_URL || storeUrl;
        const { subject, html } = renderAdminOrderNotificationEmail(orderPayload, adminUrl);
        const fromSender = formatFromSender(settings.transactionalSender.name, settings.transactionalSender.email);

        const sendRes = await sendResendEmail({
          from: fromSender,
          to: adminRecipients,
          replyTo: settings.replyTo,
          subject,
          html,
          idempotencyKey: adminJobId
        });

        const jobRecord: TransactionalNotificationJob = {
          jobId: adminJobId,
          orderId: orderPayload.id,
          orderNumber: orderPayload.orderNumber,
          recipient: adminRecipients.join(', '),
          type: 'admin_notification',
          status: sendRes.success ? 'sent' : 'failed',
          error: sendRes.error,
          createdAt: new Date().toISOString(),
          processedAt: new Date().toISOString()
        };

        inMemoryTransactionalJobs.set(adminJobId, jobRecord);
        if (db) {
          await db.collection('emailTransactionalJobs').doc(adminJobId).set(jobRecord);
        }

        if (sendRes.success) {
          adminNotified = true;
        } else if (sendRes.error) {
          errors.push(`Admin email: ${sendRes.error}`);
        }
      }
    }
  } catch (adminErr: any) {
    console.error(`[EmailService] Admin order notification failure for ${orderPayload.orderNumber}:`, adminErr);
    errors.push(`Admin email exception: ${adminErr.message}`);
  }

  return { patronNotified, adminNotified, errors };
}

export async function listTransactionalJobs(limit = 50): Promise<TransactionalNotificationJob[]> {
  const db = getDb();
  if (db) {
    try {
      const snap = await db.collection('emailTransactionalJobs').orderBy('createdAt', 'desc').limit(limit).get();
      const list: TransactionalNotificationJob[] = [];
      snap.forEach(d => list.push(d.data() as TransactionalNotificationJob));
      return list;
    } catch (err) {
      console.warn('[EmailService] Firestore listTransactionalJobs note:', err);
    }
  }

  return Array.from(inMemoryTransactionalJobs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
