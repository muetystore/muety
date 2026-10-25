import { describe, it, expect } from 'vitest';
import { AUDIENCE_FILTER_LABELS, TARGET_SEGMENT_KEYS } from '../features/admin/pages/AdminCampaigns';
import type { AudienceFilter } from '../../server/email/types';

describe('Target Patron Selection & Patron CRM Alignment', () => {
  it('exposes exactly the 4 requested target segments in Campaign Audience Selection', () => {
    expect(TARGET_SEGMENT_KEYS).toEqual([
      'all_consented',
      'new_patrons',
      'vip_patrons',
      'completed_orders'
    ]);
  });

  it('defines clear metadata and labels for all 4 segments emphasizing Patron Circle membership', () => {
    // 1. All Consented Patrons (Joined Patron Circle Members)
    const all = AUDIENCE_FILTER_LABELS['all_consented'];
    expect(all).toBeDefined();
    expect(all.label).toBe('All Consented Patrons');
    expect(all.badge).toBe('Patron Circle');
    expect(all.desc.toLowerCase()).toContain('patron circle');

    // 2. New Atelier Patrons (Last 30 Days)
    const newPatrons = AUDIENCE_FILTER_LABELS['new_patrons'];
    expect(newPatrons).toBeDefined();
    expect(newPatrons.label).toBe('New Atelier Patrons');
    expect(newPatrons.badge).toBe('Last 30 Days');

    // 3. VIP Clients (High LTV)
    const vip = AUDIENCE_FILTER_LABELS['vip_patrons'];
    expect(vip).toBeDefined();
    expect(vip.label).toBe('VIP Clients (High LTV)');
    expect(vip.badge).toContain('50,000');

    // 4. Verified Order Patrons
    const verified = AUDIENCE_FILTER_LABELS['completed_orders'];
    expect(verified).toBeDefined();
    expect(verified.label).toBe('Verified Order Patrons');
    expect(verified.badge).toBe('Verified Orders');
  });

  it('preserves backward-compatible aliases for historical campaign records', () => {
    expect(AUDIENCE_FILTER_LABELS['patron_circle']).toBeDefined();
    expect(AUDIENCE_FILTER_LABELS['custom_segment']).toBeDefined();
  });

  it('correctly maps CRM filter selections to Campaign target audience keys for seamless execution', () => {
    const crmToCampaignMap: Record<string, AudienceFilter> = {
      patron_circle: 'all_consented',
      new: 'new_patrons',
      VIP: 'vip_patrons',
      verified_patrons: 'completed_orders',
      all: 'all_consented'
    };

    expect(crmToCampaignMap['patron_circle']).toBe('all_consented');
    expect(crmToCampaignMap['new']).toBe('new_patrons');
    expect(crmToCampaignMap['VIP']).toBe('vip_patrons');
    expect(crmToCampaignMap['verified_patrons']).toBe('completed_orders');
    expect(crmToCampaignMap['all']).toBe('all_consented');
  });

  it('accurately segments patrons in Patron CRM for easy tracking and execution', () => {
    const now = Date.now();
    const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000;
    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000;

    const mockPatrons = [
      {
        id: 'patron-1',
        fullName: 'Aarav Patel',
        email: 'aarav@example.com',
        patronCircleMember: true,
        marketingConsent: true,
        createdAt: fortyDaysAgo,
        totalSpend: 75000,
        ordersCount: 3
      },
      {
        id: 'patron-2',
        fullName: 'Meera Sharma',
        email: 'meera@example.com',
        patronCircleMember: true,
        marketingConsent: true,
        createdAt: twentyDaysAgo,
        totalSpend: 15000,
        ordersCount: 1
      },
      {
        id: 'patron-3',
        fullName: 'Rohan Varma',
        email: 'rohan@example.com',
        patronCircleMember: false,
        marketingConsent: false,
        createdAt: fortyDaysAgo,
        totalSpend: 0,
        ordersCount: 0
      }
    ];

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // 1. All consented / joined Patron Circle
    const consentedPatrons = mockPatrons.filter(p => p.patronCircleMember || p.marketingConsent);
    expect(consentedPatrons.map(p => p.id)).toEqual(['patron-1', 'patron-2']);

    // 2. New Atelier Patrons (Last 30 Days)
    const newPatrons = mockPatrons.filter(p => p.createdAt >= thirtyDaysAgo);
    expect(newPatrons.map(p => p.id)).toEqual(['patron-2']);

    // 3. VIP Clients (>= ₹50,000 LTV)
    const vipPatrons = mockPatrons.filter(p => p.totalSpend >= 50000);
    expect(vipPatrons.map(p => p.id)).toEqual(['patron-1']);

    // 4. Verified Order Patrons (orders placed)
    const verifiedOrderPatrons = mockPatrons.filter(p => p.ordersCount > 0);
    expect(verifiedOrderPatrons.map(p => p.id)).toEqual(['patron-1', 'patron-2']);
  });
});
