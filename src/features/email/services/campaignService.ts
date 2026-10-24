import { getAuthHeaders } from '@/shared/utils/authHeader';
import {
  EmailCampaign,
  AudienceFilter,
  AudienceEstimateResult,
  CampaignDispatchResult
} from '@/types';

export const campaignService = {
  async listCampaigns(): Promise<EmailCampaign[]> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/campaigns/list', {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to list campaigns');
    }
    return data.campaigns || [];
  },

  async getAudienceEstimate(filter: AudienceFilter | AudienceFilter[]): Promise<AudienceEstimateResult> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/campaigns/audience-estimate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ filter })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to get audience estimate');
    }
    return data.estimate;
  },

  async saveCampaign(campaign: Partial<EmailCampaign>): Promise<EmailCampaign> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/campaigns/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ campaign })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to save campaign');
    }
    return data.campaign;
  },

  async duplicateCampaign(campaignId: string): Promise<EmailCampaign> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/campaigns/duplicate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ campaignId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to duplicate campaign');
    }
    return data.campaign;
  },

  async sendTestEmail(campaignId: string, recipient: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/campaigns/test-send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ campaignId, recipient })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.error || 'Failed to send test email');
    }
    return data;
  },

  async dispatchCampaign(campaignId: string, confirmBulkSend: boolean): Promise<CampaignDispatchResult> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/campaigns/dispatch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ campaignId, confirmBulkSend })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      let rawMsg = data.error?.message || data.message || data.result?.errors?.[0] || 'Campaign dispatch failed';
      rawMsg = rawMsg.replace(/^(FAILED_PRECONDITION|INVALID_ARGUMENT|CONFIGURATION_ERROR|ZERO_ELIGIBLE_RECIPIENTS|PROVIDER_NOT_CONFIGURED|CAMPAIGN_ALREADY_DISPATCHED):\s*/g, '');
      rawMsg = rawMsg.replace(/^(ZERO_ELIGIBLE_RECIPIENTS|PROVIDER_NOT_CONFIGURED|CAMPAIGN_ALREADY_DISPATCHED):\s*/g, '');
      throw new Error(rawMsg);
    }
    return data.result;
  },

  async publicUnsubscribe(email: string, token?: string, reason?: string): Promise<{ success: boolean; message: string; email: string }> {
    const res = await fetch('/api/email/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, reason })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to process unsubscribe request');
    }
    return data;
  }
};
