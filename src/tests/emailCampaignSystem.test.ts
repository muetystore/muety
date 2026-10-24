import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/firebaseAdmin', () => ({
  verifyIdTokenAndGetClaims: vi.fn().mockImplementation(async (authHeader?: string) => {
    if (!authHeader) return null;
    if (authHeader.includes('superadmin')) {
      return { uid: 'superadmin-1', email: 'superadmin@muety.in', roles: ['superadmin'] };
    }
    if (authHeader.includes('admin')) {
      return { uid: 'admin-1', email: 'admin@muety.in', roles: ['admin'] };
    }
    if (authHeader.includes('customer')) {
      return { uid: 'customer-1', email: 'patron@example.com', roles: ['customer'] };
    }
    return null;
  }),
  getAdminAuth: vi.fn().mockReturnValue(null),
  getAdminFirestore: vi.fn().mockReturnValue(null)
}));

import {
  getEmailSettings,
  updateEmailSettings,
  saveCampaign,
  getCampaignById,
  duplicateCampaign,
  handleUnsubscribe,
  isEmailSuppressed,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  sendCampaignTestEmail,
  dispatchCampaign,
  fetchEligibleAudience,
  getAudienceEstimate
} from '../../server/email/emailService';
import {
  handleGetEmailSettings,
  handleUpdateEmailSettings,
  handleSaveCampaign,
  handleDispatchCampaign,
  handlePublicUnsubscribe
} from '../../server/email/emailApi';
import { renderPromotionalCampaign } from '../../server/email/templates/campaignTemplates';
import { formatFromSender, normalizeFromSender } from '../../server/email/resendClient';

describe('MODULE A — Promotional Email Campaign & Marketing Consent System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('01. Email Settings & Super Admin Authorization', () => {
    it('returns default configuration with promotions@muety.in and support@muety.in', async () => {
      const settings = await getEmailSettings();
      expect(settings.marketingSender.email).toBe('promotions@muety.in');
      expect(settings.marketingSender.name).toBe('MUETY Promotions');
      expect(settings.replyTo).toBe('support@muety.in');
      expect(settings.sendingDomain).toBe('muety.in');
    });

    it('allows Super Admin to update email settings via API', async () => {
      const res = await handleUpdateEmailSettings('Bearer superadmin-token', {
        marketingSender: { email: 'vip-offers@muety.in', name: 'MUETY Privileges' },
        replyTo: 'concierge@muety.in'
      });
      expect(res.success).toBe(true);
      expect(res.settings.marketingSender.email).toBe('vip-offers@muety.in');
      expect(res.settings.replyTo).toBe('concierge@muety.in');
    });

    it('rejects ordinary admin and unauthenticated users from modifying email sender configuration', async () => {
      await expect(
        handleUpdateEmailSettings('Bearer admin-token', { replyTo: 'hacker@muety.in' })
      ).rejects.toThrow('PERMISSION_DENIED');

      await expect(
        handleUpdateEmailSettings(undefined, { replyTo: 'hacker@muety.in' })
      ).rejects.toThrow('UNAUTHENTICATED');
    });
  });

  describe('02. Marketing Consent & Unsubscribe Suppression', () => {
    it('generates and verifies secure HMAC unsubscribe tokens for patrons', () => {
      const email = 'patron.sharma@example.com';
      const token = generateUnsubscribeToken(email);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(verifyUnsubscribeToken(email, token)).toBe(true);
      expect(verifyUnsubscribeToken(email, 'invalid_token_xyz')).toBe(false);
    });

    it('immediately suppresses unsubscribed email addresses from subsequent campaigns', async () => {
      const email = 'optout.patron@example.com';
      expect(await isEmailSuppressed(email)).toBe(false);

      const unsubRes = await handleUnsubscribe(email, 'Patron clicked email footer unsubscribe');
      expect(unsubRes.success).toBe(true);
      expect(unsubRes.email).toBe(email);

      // Verify email is now strictly suppressed
      expect(await isEmailSuppressed(email)).toBe(true);
    });

    it('processes public 1-click unsubscribe endpoint safely', async () => {
      const email = 'instant.leave@example.com';
      const token = generateUnsubscribeToken(email);

      const res = await handlePublicUnsubscribe({
        email,
        token,
        reason: 'Too many emails'
      });

      expect(res.success).toBe(true);
      expect(res.email).toBe(email);
      expect(await isEmailSuppressed(email)).toBe(true);
    });
  });

  describe('03. Campaign Creation, Duplication & Preview', () => {
    it('creates campaign in draft state with MUETY luxury defaults', async () => {
      const camp = await saveCampaign({
        name: 'Diwali Banarasi Silk Edit',
        subject: 'Auspicious Pure Katan Silk — Special Festive Privileges',
        headline: 'Handwoven Splendor for the Grand Celebrations',
        audienceFilter: 'all_consented'
      }, 'admin@muety.in');

      expect(camp.id).toBeDefined();
      expect(camp.status).toBe('draft');
      expect(camp.recipientCount).toBe(0);
      expect(camp.senderIdentity.email).toBe('promotions@muety.in');
    });

    it('duplicates existing campaign with draft status and pristine statistics', async () => {
      const original = await saveCampaign({
        name: 'Varanasi Master Weavers Showcase',
        subject: 'Rare 24k Gold Zari Weaves',
        deliveredCount: 450,
        status: 'sent'
      }, 'admin@muety.in');

      const copy = await duplicateCampaign(original.id, 'admin@muety.in');
      expect(copy.name).toBe('Varanasi Master Weavers Showcase (Copy)');
      expect(copy.status).toBe('draft');
      expect(copy.deliveredCount).toBe(0);
      expect(copy.sentAt).toBeUndefined();
    });

    it('renders responsive promotional campaign template with MUETY atelier branding & unsubscribe link', () => {
      const html = renderPromotionalCampaign({
        campaignTitle: 'Heritage Katan Edit',
        headline: 'The Grand Varanasi Collection',
        previewText: 'Exclusive preview of master handlooms',
        bodyContent: '<p>Woven with royal grace.</p>',
        unsubscribeUrl: 'https://store.muety.in/unsubscribe?email=test%40example.com&token=123',
        storeUrl: 'https://store.muety.in'
      });

      expect(html).toContain('MUETY');
      expect(html).toContain('The Grand Varanasi Collection');
      expect(html).toContain('Unsubscribe from Promotional Emails');
      expect(html).toContain('https://store.muety.in/unsubscribe?email=test%40example.com&token=123');
    });

    it('sends authentic test preview email with [TEST PREVIEW] prefix', async () => {
      const camp = await saveCampaign({
        name: 'Test Send Validation Edit',
        subject: 'Royal Mulberry Silk Arrival',
        headline: 'Exclusive Silk Preview'
      }, 'admin@muety.in');

      const res = await sendCampaignTestEmail(camp.id, 'admin.tester@muety.in');
      expect(res.success).toBe(true);
    });
  });

  describe('04. Bulk Dispatch Confirmation Governance', () => {
    it('strictly requires explicit confirmBulkSend: true before executing bulk campaign dispatch', async () => {
      const camp = await saveCampaign({
        name: 'Festive Flash Privileges',
        subject: '48-Hour Heritage Offer'
      }, 'admin@muety.in');

      // Attempt dispatch without confirmBulkSend
      await expect(
        handleDispatchCampaign('Bearer admin-token', {
          campaignId: camp.id,
          confirmBulkSend: false
        })
      ).rejects.toThrow('FAILED_PRECONDITION');
    });
  });

  describe('05. Sender Identity Formatting & Patron Circle Multi-Selection', () => {
    it('normalizes sender from field and strips double quotes to prevent provider rejection', () => {
      // Test quoted name format
      const quoted = '"MUETY Orders" <orders@muety.in>';
      expect(normalizeFromSender(quoted)).toBe('MUETY Orders <orders@muety.in>');

      // Test formatFromSender helper
      expect(formatFromSender('MUETY Orders', 'orders@muety.in')).toBe('MUETY Orders <orders@muety.in>');
      expect(formatFromSender('"MUETY Promotions"', 'promotions@muety.in')).toBe('MUETY Promotions <promotions@muety.in>');
      expect(formatFromSender('', 'orders@muety.in')).toBe('orders@muety.in');
    });

    it('estimates and saves campaigns with patron_circle audience segment', async () => {
      const estimate = await getAudienceEstimate('patron_circle');
      expect(estimate.filter).toBe('patron_circle');
      expect(typeof estimate.eligibleCount).toBe('number');

      const camp = await saveCampaign({
        name: 'Patron Circle Private Access',
        subject: 'Private Atelier Showcase for Circle Members',
        headline: 'Exclusive Silk Privileges',
        audienceFilter: 'patron_circle',
        audienceFilters: ['patron_circle']
      }, 'admin@muety.in');

      expect(camp.audienceFilter).toBe('patron_circle');
      expect(camp.audienceFilters).toEqual(['patron_circle']);
    });

    it('supports multi-selection audience estimation and campaign persistence', async () => {
      const multiFilters = ['patron_circle', 'vip_patrons'] as const;
      const estimate = await getAudienceEstimate([...multiFilters]);
      expect(estimate.filter).toEqual(['patron_circle', 'vip_patrons']);
      expect(typeof estimate.eligibleCount).toBe('number');

      const camp = await saveCampaign({
        name: 'Multi-Segment Festive Gala',
        subject: 'Privileges for Patron Circle & VIP Clients',
        headline: 'Grand Festive Edit',
        audienceFilters: ['patron_circle', 'vip_patrons']
      }, 'admin@muety.in');

      expect(camp.audienceFilters).toEqual(['patron_circle', 'vip_patrons']);
      expect(camp.audienceFilter).toBe('patron_circle');
    });
  });
});
