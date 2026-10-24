import { verifyIdTokenAndGetClaims } from '../firebaseAdmin';
import { sendResendEmail } from './resendClient';
import {
  getEmailSettings,
  updateEmailSettings,
  getAudienceEstimate,
  listCampaigns,
  getCampaignById,
  saveCampaign,
  duplicateCampaign,
  sendCampaignTestEmail,
  dispatchCampaign,
  handleUnsubscribe,
  verifyUnsubscribeToken,
  listTransactionalJobs
} from './emailService';
import { AudienceFilter, EmailCampaign, EmailSettings } from './types';

export function formatFromSender(name?: string, email?: string): string {
  const cleanEmail = (email || 'orders@muety.in').trim().replace(/[<>]/g, '');
  const cleanName = (name || '').trim().replace(/["'`<>]/g, '').trim();
  if (!cleanName || cleanName.toLowerCase() === cleanEmail.toLowerCase()) {
    return cleanEmail;
  }
  return `${cleanName} <${cleanEmail}>`;
}

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
  const isAdmin = caller.roles?.includes('admin') || caller.roles?.includes('order_manager') || caller.roles?.includes('catalog_manager');

  if (!isSuperAdmin && !isAdmin) {
    throw new Error('PERMISSION_DENIED: Access restricted to authorized administrative staff.');
  }
}

function assertSuperAdminCaller(caller: any): asserts caller is VerifiedAdminCaller {
  if (!caller || typeof caller !== 'object' || !caller.email) {
    throw new Error('UNAUTHENTICATED: Authentication token is required.');
  }
  const isSuperAdmin = caller.roles?.includes('superadmin') || caller.roles?.includes('super_admin');
  if (!isSuperAdmin) {
    throw new Error('PERMISSION_DENIED: Only a Super Administrator can modify provider configuration and verified sender identities.');
  }
}

/**
 * GET /api/email/settings
 */
export async function handleGetEmailSettings(authHeader: string | undefined) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);
  const settings = await getEmailSettings();
  return { success: true, settings };
}

/**
 * POST /api/email/settings
 */
export async function handleUpdateEmailSettings(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertSuperAdminCaller(caller);

  if (!body || typeof body !== 'object') {
    throw new Error('INVALID_ARGUMENT: Settings payload is missing.');
  }

  const updates: Partial<EmailSettings> = {};
  if (body.marketingSender && typeof body.marketingSender === 'object') {
    updates.marketingSender = {
      email: String(body.marketingSender.email || '').trim().toLowerCase(),
      name: String(body.marketingSender.name || '').trim()
    };
  }
  if (body.transactionalSender && typeof body.transactionalSender === 'object') {
    updates.transactionalSender = {
      email: String(body.transactionalSender.email || '').trim().toLowerCase(),
      name: String(body.transactionalSender.name || '').trim()
    };
  }
  if (body.replyTo) updates.replyTo = String(body.replyTo).trim().toLowerCase();
  if (body.centralOrdersRecipient) updates.centralOrdersRecipient = String(body.centralOrdersRecipient).trim().toLowerCase();
  if (Array.isArray(body.managementRecipients)) {
    updates.managementRecipients = body.managementRecipients.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean);
  }
  if (Array.isArray(body.fulfillmentRecipients)) {
    updates.fulfillmentRecipients = body.fulfillmentRecipients.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean);
  }
  if (body.sendingDomain) updates.sendingDomain = String(body.sendingDomain).trim().toLowerCase();

  const saved = await updateEmailSettings(updates, caller.email);
  return { success: true, settings: saved };
}

/**
 * POST /api/email/test-connection
 */
export async function handleTestEmailConnection(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  const recipient = typeof body?.recipient === 'string' && body.recipient.includes('@')
    ? body.recipient.trim().toLowerCase()
    : caller.email;

  if (!recipient || !recipient.includes('@')) {
    throw new Error('INVALID_ARGUMENT: A valid recipient email is required for health test.');
  }

  const settings = await getEmailSettings();
  const fromSender = formatFromSender(settings.transactionalSender?.name, settings.transactionalSender?.email);

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">MUETY Email System Test</h2>
      <p style="color: #334155;">This is a verified test email sent from the Executive Control Center to validate provider health.</p>
      <div style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px; color: #475569;">
        <div><strong>Provider:</strong> ${settings.provider}</div>
        <div><strong>Sender:</strong> ${fromSender}</div>
        <div><strong>Server Time:</strong> ${new Date().toISOString()}</div>
      </div>
      <p style="color: #15803d; font-weight: bold; margin-top: 16px;">&#10003; Provider pipeline and domain routing operational.</p>
    </div>
  `;

  const result = await sendResendEmail({
    from: fromSender,
    to: recipient,
    replyTo: settings.replyTo,
    subject: `[MUETY Health Check] Provider Connection Test (${new Date().toLocaleTimeString('en-IN')})`,
    html,
    idempotencyKey: `health_test_${Date.now()}`
  });

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
    provider: settings.provider,
    testedRecipient: recipient
  };
}

/**
 * POST /api/email/campaigns/list
 */
export async function handleListCampaigns(authHeader: string | undefined) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  const campaigns = await listCampaigns();
  return { success: true, campaigns };
}

/**
 * POST /api/email/campaigns/audience-estimate
 */
export async function handleGetAudienceEstimate(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  const filter = body?.filter || body?.filters || 'all_consented';
  const estimate = await getAudienceEstimate(filter);
  return { success: true, estimate };
}

/**
 * POST /api/email/campaigns/save
 */
export async function handleSaveCampaign(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  if (!body?.campaign || typeof body.campaign !== 'object') {
    throw new Error('INVALID_ARGUMENT: Campaign data is required.');
  }

  const campaign = await saveCampaign(body.campaign, caller.email);
  return { success: true, campaign };
}

/**
 * POST /api/email/campaigns/duplicate
 */
export async function handleDuplicateCampaign(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  const campaignId = String(body?.campaignId || '').trim();
  if (!campaignId) {
    throw new Error('INVALID_ARGUMENT: campaignId is required.');
  }

  const copy = await duplicateCampaign(campaignId, caller.email);
  return { success: true, campaign: copy };
}

/**
 * POST /api/email/campaigns/test-send
 */
export async function handleSendCampaignTest(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  const campaignId = String(body?.campaignId || '').trim();
  const recipient = String(body?.recipient || caller.email).trim().toLowerCase();

  if (!campaignId) throw new Error('INVALID_ARGUMENT: campaignId is required.');
  if (!recipient || !recipient.includes('@')) throw new Error('INVALID_ARGUMENT: A valid recipient email is required.');

  const res = await sendCampaignTestEmail(campaignId, recipient);
  return { success: res.success, messageId: res.messageId, error: res.error };
}

/**
 * POST /api/email/campaigns/dispatch
 */
export async function handleDispatchCampaign(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);

  const campaignId = String(body?.campaignId || '').trim();
  const confirm = Boolean(body?.confirmBulkSend);

  if (!campaignId) throw new Error('INVALID_ARGUMENT: campaignId is required.');
  if (!confirm) {
    throw new Error('FAILED_PRECONDITION: Explicit confirmation (confirmBulkSend: true) is strictly required before sending a bulk promotional campaign.');
  }

  const result = await dispatchCampaign(campaignId, caller.email);
  return { success: result.status === 'sent', result };
}

/**
 * POST /api/email/unsubscribe (Public endpoint)
 */
export async function handlePublicUnsubscribe(body: any) {
  const email = String(body?.email || '').trim().toLowerCase();
  const token = String(body?.token || '').trim();
  const reason = String(body?.reason || 'Patron 1-click unsubscribe preference').trim();

  if (!email || !email.includes('@')) {
    throw new Error('INVALID_ARGUMENT: A valid email address is required to process unsubscribe.');
  }

  // Verify HMAC token if provided or proceed safely
  if (token && !verifyUnsubscribeToken(email, token)) {
    console.warn(`[EmailApi] Unsubscribe token mismatch for ${email}, but proceeding with patron unsubscribe safely.`);
  }

  const res = await handleUnsubscribe(email, reason);
  return {
    success: true,
    message: `The email address ${res.email} has been immediately unsubscribed and added to the MUETY suppression list.`,
    email: res.email,
    unsubscribedAt: res.unsubscribedAt
  };
}

/**
 * POST /api/email/transactional-jobs
 */
export async function handleListTransactionalJobs(authHeader: string | undefined) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  assertAdminCaller(caller);
  const jobs = await listTransactionalJobs(50);
  return { success: true, jobs };
}
