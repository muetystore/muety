import { getAuthHeaders } from '@/shared/utils/authHeader';
import { EmailSettings, TransactionalNotificationJob } from '@/types';

export const emailSettingsService = {
  async getSettings(): Promise<EmailSettings> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/settings/get', {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to fetch email settings');
    }
    return data.settings;
  },

  async updateSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/settings/update', {
      method: 'POST',
      headers,
      body: JSON.stringify(settings)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to update email settings');
    }
    return data.settings;
  },

  async testConnection(recipient?: string): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/test-connection', {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Test email failed');
    }
    return data;
  },

  async listTransactionalJobs(): Promise<TransactionalNotificationJob[]> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/transactional-jobs', {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to fetch transactional jobs');
    }
    return data.jobs || [];
  }
};
