import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { hasPermission } from '@/shared/utils/permissions';
import { emailSettingsService } from '@/features/email/services/emailSettingsService';
import { EmailSettings, TransactionalNotificationJob } from '@/types';
import {
  Mail,
  Shield,
  Server,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  Lock,
  Settings2,
  Clock,
  Plus,
  Trash2,
  Check,
  Save,
  Info
} from 'lucide-react';

export const AdminEmailSettings: React.FC = () => {
  useDocumentTitle('Email Infrastructure & Senders — Executive Control Center');
  const { user } = useAuth();
  const { success, error } = useNotification();

  const isSuperAdmin = user?.roles?.includes('superadmin') || user?.roles?.includes('super_admin');
  const canManage = hasPermission(user, 'email_settings.manage') || isSuperAdmin;

  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [jobs, setJobs] = useState<TransactionalNotificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // Editing state
  const [formData, setFormData] = useState<Partial<EmailSettings>>({});
  const [mgmtInput, setMgmtInput] = useState('');
  const [fulfInput, setFulfInput] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedSettings, fetchedJobs] = await Promise.all([
        emailSettingsService.getSettings(),
        emailSettingsService.listTransactionalJobs().catch(() => [])
      ]);
      setSettings(fetchedSettings);
      setFormData(fetchedSettings);
      setJobs(fetchedJobs);
      setTestEmailAddress(user?.email || '');
    } catch (err: any) {
      error(err.message || 'Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      error('Modifying verified sender identities and department routing requires Super Administrator authorization.');
      return;
    }

    setSaving(true);
    try {
      const updated = await emailSettingsService.updateSettings(formData);
      setSettings(updated);
      setFormData(updated);
      success('Email settings and department routing saved successfully.', 'Configuration Saved');
    } catch (err: any) {
      error(err.message || 'Failed to update email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRunHealthTest = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      error('Please enter a valid recipient email to run the provider health check.');
      return;
    }
    setTesting(true);
    try {
      const res = await emailSettingsService.testConnection(testEmailAddress);
      if (res.success) {
        success(`Provider health check succeeded! Test transmission dispatched to ${testEmailAddress}.`, 'Delivery Successful');
      } else {
        error(res.error || 'Provider health check failed. Verify domain DNS or RESEND_API_KEY.');
      }
    } catch (err: any) {
      error(err.message || 'Health check execution failed');
    } finally {
      setTesting(false);
    }
  };

  const addManagementRecipient = () => {
    const email = mgmtInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    const current = formData.managementRecipients || [];
    if (!current.includes(email)) {
      setFormData({ ...formData, managementRecipients: [...current, email] });
    }
    setMgmtInput('');
  };

  const removeManagementRecipient = (emailToRemove: string) => {
    const current = formData.managementRecipients || [];
    setFormData({
      ...formData,
      managementRecipients: current.filter(e => e !== emailToRemove)
    });
  };

  const addFulfillmentRecipient = () => {
    const email = fulfInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    const current = formData.fulfillmentRecipients || [];
    if (!current.includes(email)) {
      setFormData({ ...formData, fulfillmentRecipients: [...current, email] });
    }
    setFulfInput('');
  };

  const removeFulfillmentRecipient = (emailToRemove: string) => {
    const current = formData.fulfillmentRecipients || [];
    setFormData({
      ...formData,
      fulfillmentRecipients: current.filter(e => e !== emailToRemove)
    });
  };

  if (loading) {
    return (
      <div className="card animate-fade-in" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)' }}>
        <RefreshCw size={28} className="animate-spin" color="var(--brand-accent)" style={{ margin: '0 auto 1rem' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary)' }}>Loading email configuration &amp; delivery pipeline...</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Querying verified sender identities and transactional outbox</p>
      </div>
    );
  }

  const isConfigured = settings?.status === 'active';

  return (
    <div className="admin-email-settings animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem', width: '100%' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            <Settings2 size={15} /> Infrastructure &bull; Modules B &bull; C
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Email Infrastructure &amp; Senders
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Configure verified sender identities, department order routing, and transactional delivery pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh status"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {isSuperAdmin && (
            <button
              type="submit"
              form="email-settings-form"
              disabled={saving}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Provider Status Banner Card */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: isConfigured ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${isConfigured ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 340px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: isConfigured ? '#dcfce7' : '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isConfigured ? '#16a34a' : '#d97706',
              flexShrink: 0
            }}
          >
            {isConfigured ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isConfigured ? '#15803d' : '#92400e' }}>
              {isConfigured ? 'Email Provider Connected & Active' : 'Email Provider Requires Configuration'}
            </div>
            <div style={{ fontSize: '0.8rem', color: isConfigured ? '#166534' : '#b45309', marginTop: '2px', lineHeight: 1.4 }}>
              {isConfigured ? (
                <span>
                  Server API credentials active &bull; Primary Sending Domain: <strong style={{ fontFamily: 'monospace' }}>muety.in</strong> &bull; Provider: Resend SDK
                </span>
              ) : (
                <span>
                  Missing server-side <strong style={{ fontFamily: 'monospace' }}>RESEND_API_KEY</strong>. Promotional and order emails are held safely without faking delivery.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Health Check Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="admin@muety.in"
            value={testEmailAddress}
            onChange={e => setTestEmailAddress(e.target.value)}
            className="form-input"
            style={{ width: '220px', padding: '0.5rem 0.8rem', fontSize: '0.85rem', margin: 0 }}
          />
          <button
            type="button"
            onClick={handleRunHealthTest}
            disabled={testing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Test Send</span>
          </button>
        </div>
      </div>

      <form id="email-settings-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Section 1: Verified Sender Identities (Module A.2, B.1) */}
        <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(201, 162, 39, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-accent)' }}>
                  <Mail size={18} />
                </div>
                <span>Verified Sender Identities</span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                Official from-addresses used for promotional campaigns and order lifecycle receipts.
              </p>
            </div>

            {!isSuperAdmin && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={12} /> Super Admin Authorization Required
              </span>
            )}
          </div>

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            {/* Promotional Sender */}
            <div style={{ padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--brand-border)', backgroundColor: '#faf8f3' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
                <Mail size={14} /> Promotional Sender (Marketing)
              </div>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-primary)' }}>Display Name</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={formData.marketingSender?.name || ''}
                  onChange={e => setFormData({
                    ...formData,
                    marketingSender: {
                      email: formData.marketingSender?.email || 'promotions@muety.in',
                      name: e.target.value
                    }
                  })}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-primary)' }}>From Address</label>
                <input
                  type="email"
                  disabled={!isSuperAdmin}
                  value={formData.marketingSender?.email || ''}
                  onChange={e => setFormData({
                    ...formData,
                    marketingSender: {
                      name: formData.marketingSender?.name || 'MUETY Promotions',
                      email: e.target.value
                    }
                  })}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Transactional Sender */}
            <div style={{ padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--brand-border)', backgroundColor: '#faf8f3' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
                <Mail size={14} /> Transactional Sender (Orders &amp; ERP)
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-primary)' }}>Display Name</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={formData.transactionalSender?.name || ''}
                  onChange={e => setFormData({
                    ...formData,
                    transactionalSender: {
                      email: formData.transactionalSender?.email || 'orders@muety.in',
                      name: e.target.value
                    }
                  })}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-primary)' }}>From Address</label>
                <input
                  type="email"
                  disabled={!isSuperAdmin}
                  value={formData.transactionalSender?.email || ''}
                  onChange={e => setFormData({
                    ...formData,
                    transactionalSender: {
                      name: formData.transactionalSender?.name || 'MUETY Orders',
                      email: e.target.value
                    }
                  })}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Global Reply-To Address
              </label>
              <input
                type="email"
                disabled={!isSuperAdmin}
                value={formData.replyTo || ''}
                onChange={e => setFormData({ ...formData, replyTo: e.target.value })}
                className="form-input"
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Incoming customer replies route to this central concierge inbox.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sending Domain
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={formData.sendingDomain || 'muety.in'}
                onChange={e => setFormData({ ...formData, sendingDomain: e.target.value })}
                className="form-input"
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Primary authenticated domain configured with SPF, DKIM, and DMARC.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Operational Order Notification Routing (Module B.2) */}
        <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ borderBottom: '1px solid var(--brand-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                <Server size={18} />
              </div>
              <span>Operational Order Notification Routing</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              When a valid order is created, notifications dispatch to the central orders inbox and authorized department recipients.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Central Orders Inbox */}
            <div className="form-group" style={{ maxWidth: '440px', marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Central Orders Inbox *
              </label>
              <input
                type="email"
                disabled={!isSuperAdmin}
                value={formData.centralOrdersRecipient || ''}
                onChange={e => setFormData({ ...formData, centralOrdersRecipient: e.target.value })}
                className="form-input"
                placeholder="orders@muety.in"
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
            </div>

            {/* Management Recipients */}
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Management Notification Recipients
              </label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {(formData.managementRecipients || []).map(em => (
                  <span
                    key={em}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      color: 'var(--brand-primary)'
                    }}
                  >
                    <span>{em}</span>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => removeManagementRecipient(em)}
                        style={{ color: '#ef4444', display: 'inline-flex', padding: '2px', cursor: 'pointer' }}
                        title="Remove recipient"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isSuperAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '380px' }}>
                  <input
                    type="email"
                    placeholder="management@muety.in"
                    value={mgmtInput}
                    onChange={e => setMgmtInput(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem', margin: 0 }}
                  />
                  <button
                    type="button"
                    onClick={addManagementRecipient}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 600 }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Fulfillment Recipients */}
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Fulfillment &amp; Warehouse Recipients
              </label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {(formData.fulfillmentRecipients || []).map(em => (
                  <span
                    key={em}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      color: 'var(--brand-primary)'
                    }}
                  >
                    <span>{em}</span>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => removeFulfillmentRecipient(em)}
                        style={{ color: '#ef4444', display: 'inline-flex', padding: '2px', cursor: 'pointer' }}
                        title="Remove recipient"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isSuperAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '380px' }}>
                  <input
                    type="email"
                    placeholder="fulfilment@muety.in"
                    value={fulfInput}
                    onChange={e => setFulfInput(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem', margin: 0 }}
                  />
                  <button
                    type="button"
                    onClick={addFulfillmentRecipient}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 600 }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Section 3: Transactional Outbox Jobs */}
      <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Clock size={18} />
              </div>
              <span>Recent Transactional Outbox Jobs</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Idempotent order confirmation and operational admin alert transmissions.
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '6px' }}>
            Last 50 Jobs
          </span>
        </div>

        {jobs.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: '10px', border: '1px dashed var(--brand-border)' }}>
            <Mail size={32} color="var(--brand-muted)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-primary)' }}>No Transactional Jobs Logged Yet</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Jobs are triggered automatically upon valid order placement or payment confirmation.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--brand-muted)', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 14px' }}>Job ID / Order</th>
                  <th style={{ padding: '10px 14px' }}>Notification Type</th>
                  <th style={{ padding: '10px 14px' }}>Recipient(s)</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                {jobs.map(job => (
                  <tr key={job.jobId} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>{job.orderNumber}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--brand-muted)' }}>{job.jobId}</div>
                    </td>
                    <td style={{ padding: '12px 14px', textTransform: 'capitalize', color: 'var(--brand-primary-light)' }}>
                      {job.type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.recipient}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {job.status === 'sent' ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Sent
                        </span>
                      ) : (
                        <span className="badge badge-danger" title={job.error}>
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {new Date(job.createdAt).toLocaleTimeString('en-IN', { timeStyle: 'short', hour12: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
