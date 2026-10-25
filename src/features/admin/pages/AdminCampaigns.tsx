import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { hasPermission } from '@/shared/utils/permissions';
import { campaignService } from '@/features/email/services/campaignService';
import { AdminModal } from '@/features/admin/components/AdminModal';
import {
  EmailCampaign,
  CampaignStatus,
  AudienceFilter,
  AudienceEstimateResult
} from '@/types';
import {
  Sparkles,
  Plus,
  Send,
  Eye,
  Copy,
  Trash2,
  Edit3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Search,
  Filter,
  AlertCircle,
  Monitor,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  Mail,
  Tag,
  Check,
  Crown,
  Star,
  ShoppingBag,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Info,
  Save
} from 'lucide-react';

export const TARGET_SEGMENT_KEYS: AudienceFilter[] = [
  'all_consented',
  'new_patrons',
  'vip_patrons',
  'completed_orders'
];

export const AUDIENCE_FILTER_LABELS: Record<string, { label: string; desc: string; badge: string; icon: any }> = {
  all_consented: {
    label: 'All Consented Patrons',
    desc: 'All joined members of the MUETY Patron Circle with marketing consent.',
    badge: 'Patron Circle',
    icon: Users
  },
  new_patrons: {
    label: 'New Atelier Patrons',
    desc: 'Consented patrons who registered or made inquiries within the last 30 days.',
    badge: 'Last 30 Days',
    icon: Sparkles
  },
  vip_patrons: {
    label: 'VIP Clients (High LTV)',
    desc: 'Consented patrons with cumulative order history of ₹50,000 or greater.',
    badge: '₹50,000+ LTV',
    icon: Star
  },
  completed_orders: {
    label: 'Verified Order Patrons',
    desc: 'Consented patrons who have at least one successfully placed order.',
    badge: 'Verified Orders',
    icon: ShoppingBag
  },
  patron_circle: {
    label: 'All Consented Patrons',
    desc: 'All joined members of the MUETY Patron Circle with marketing consent.',
    badge: 'Patron Circle',
    icon: Users
  },
  custom_segment: {
    label: 'Bespoke Curated Segment',
    desc: 'Consented patrons tailored for special atelier showcase releases.',
    badge: 'Bespoke Segment',
    icon: Tag
  }
};

export const AdminCampaigns: React.FC = () => {
  useDocumentTitle('Email Marketing & Campaigns — Executive Control Center');
  const { user } = useAuth();
  const { success, error, warning } = useNotification();

  const isSuperAdmin = user?.roles?.includes('superadmin') || user?.roles?.includes('super_admin');
  const canManage = hasPermission(user, 'campaigns.manage') || isSuperAdmin;

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Campaign Editor Modal
  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<EmailCampaign> | null>(null);
  const [selectedAudiences, setSelectedAudiences] = useState<AudienceFilter[]>(['all_consented']);
  const [audienceEstimate, setAudienceEstimate] = useState<AudienceEstimateResult | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Preview Modal
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Test Send Modal
  const [testModalCampaign, setTestModalCampaign] = useState<EmailCampaign | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Dispatch Confirmation Modal
  const [dispatchModalCampaign, setDispatchModalCampaign] = useState<EmailCampaign | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [confirmSendChecked, setConfirmSendChecked] = useState(false);
  const [modalEstimate, setModalEstimate] = useState<AudienceEstimateResult | null>(null);
  const [modalEstimating, setModalEstimating] = useState(false);

  // Automatically fetch live audience estimate when bulk dispatch modal opens
  useEffect(() => {
    if (dispatchModalCampaign) {
      setConfirmSendChecked(false);
      setModalEstimating(true);
      const auds = (dispatchModalCampaign.audienceFilters && dispatchModalCampaign.audienceFilters.length > 0)
        ? dispatchModalCampaign.audienceFilters
        : [dispatchModalCampaign.audienceFilter || 'all_consented'];

      campaignService.getAudienceEstimate(auds)
        .then(est => setModalEstimate(est))
        .catch(err => {
          console.warn('Audience estimate fetch error:', err);
          setModalEstimate(null);
        })
        .finally(() => setModalEstimating(false));
    } else {
      setModalEstimate(null);
    }
  }, [dispatchModalCampaign]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await campaignService.listCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      error(err.message || 'Failed to load promotional campaigns');
    } finally {
      setLoading(false);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadCampaigns();
    if (searchParams.get('create') === 'true') {
      const segParam = searchParams.get('segment') as AudienceFilter;
      const initialSeg = TARGET_SEGMENT_KEYS.includes(segParam) ? segParam : 'all_consented';
      handleOpenCreate(initialSeg);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleAudienceEstimate = async (filter: AudienceFilter | AudienceFilter[]) => {
    setEstimating(true);
    try {
      const estimate = await campaignService.getAudienceEstimate(filter);
      setAudienceEstimate(estimate);
    } catch (err: any) {
      console.warn('Audience estimate warning:', err);
    } finally {
      setEstimating(false);
    }
  };

  const handleToggleAudience = (filterKey: AudienceFilter) => {
    let next: AudienceFilter[];
    if (filterKey === 'all_consented') {
      next = ['all_consented'];
    } else {
      const withoutAll = selectedAudiences.filter(k => k !== 'all_consented');
      if (withoutAll.includes(filterKey)) {
        next = withoutAll.filter(k => k !== filterKey);
        if (next.length === 0) {
          next = ['all_consented'];
        }
      } else {
        next = [...withoutAll, filterKey];
      }
    }

    setSelectedAudiences(next);
    if (editingCampaign) {
      setEditingCampaign({
        ...editingCampaign,
        audienceFilters: next,
        audienceFilter: next.includes('all_consented') ? 'all_consented' : (next[0] || 'all_consented')
      });
    }
    handleAudienceEstimate(next);
  };

  const handleOpenCreate = (initialSegment?: AudienceFilter | React.MouseEvent) => {
    const validSegment: AudienceFilter = (typeof initialSegment === 'string' && TARGET_SEGMENT_KEYS.includes(initialSegment as AudienceFilter))
      ? (initialSegment as AudienceFilter)
      : 'all_consented';
    const newCamp: Partial<EmailCampaign> = {
      name: '',
      subject: '',
      headline: '',
      subheadline: '',
      previewText: '',
      bodyContent: '<p>Distinguished Patron,<br/><br/>We are delighted to present an exclusive showcase of handloom masterpieces, woven with pure silk and regal artistry.</p>',
      heroImageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c',
      ctaText: 'Explore Atelier Showcase',
      ctaUrl: 'https://store.muety.in',
      audienceFilter: validSegment,
      audienceFilters: [validSegment],
      senderIdentity: {
        email: 'promotions@muety.in',
        name: 'MUETY Promotions'
      },
      status: 'draft'
    };
    setSelectedAudiences([validSegment]);
    setEditingCampaign(newCamp);
    setShowEditor(true);
    handleAudienceEstimate([validSegment]);
  };

  const handleOpenEdit = (campaign: EmailCampaign) => {
    const auds: AudienceFilter[] = (campaign.audienceFilters && campaign.audienceFilters.length > 0)
      ? campaign.audienceFilters
      : [campaign.audienceFilter || 'all_consented'];
    setSelectedAudiences(auds);
    setEditingCampaign(campaign);
    setShowEditor(true);
    handleAudienceEstimate(auds);
  };

  const handleDuplicate = async (campaign: EmailCampaign) => {
    try {
      const copy = await campaignService.duplicateCampaign(campaign.id);
      success(`Campaign duplicated as "${copy.name}"`, 'Campaign Duplicated');
      await loadCampaigns();
    } catch (err: any) {
      error(err.message || 'Failed to duplicate campaign');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    if (!editingCampaign.name?.trim() || !editingCampaign.subject?.trim() || !editingCampaign.headline?.trim()) {
      warning('Please complete the campaign name, subject, and headline.');
      return;
    }

    try {
      const payloadToSave: Partial<EmailCampaign> = {
        ...editingCampaign,
        audienceFilters: selectedAudiences,
        audienceFilter: selectedAudiences.includes('all_consented')
          ? 'all_consented'
          : (selectedAudiences[0] || 'all_consented')
      };
      await campaignService.saveCampaign(payloadToSave);
      success('Campaign saved successfully.', 'Draft Saved');
      setShowEditor(false);
      setEditingCampaign(null);
      await loadCampaigns();
    } catch (err: any) {
      error(err.message || 'Failed to save campaign');
    }
  };

  const handleTestSend = async () => {
    if (!testModalCampaign || !testRecipient || !testRecipient.includes('@')) {
      error('Please provide a valid test recipient email address.');
      return;
    }

    setSendingTest(true);
    try {
      const res = await campaignService.sendTestEmail(testModalCampaign.id, testRecipient);
      if (res.success) {
        success(`Test transmission dispatched to ${testRecipient}.`, 'Test Email Sent');
        setTestModalCampaign(null);
      } else {
        error(res.error || 'Failed to send test email.');
      }
    } catch (err: any) {
      error(err.message || 'Error occurred while sending test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchModalCampaign) return;
    if (modalEstimate && modalEstimate.eligibleCount === 0) {
      warning('Cannot dispatch campaign: 0 consented patrons match this filter. Dispatch is disabled.');
      return;
    }
    if (!confirmSendChecked) {
      warning('You must confirm the bulk dispatch agreement checkbox before sending.');
      return;
    }

    setDispatching(true);
    try {
      const res = await campaignService.dispatchCampaign(dispatchModalCampaign.id, true);
      if (res.status === 'sent') {
        success(`Campaign successfully dispatched! Delivered to ${res.sentCount} patrons.`, 'Dispatch Complete');
      } else {
        error(`Dispatch completed with issues. Delivered: ${res.sentCount}, Failed: ${res.failedCount}`);
      }
      setCampaigns(prev => prev.map(c => {
        if (c.id === dispatchModalCampaign.id) {
          return {
            ...c,
            status: (res.status as CampaignStatus) || (res.sentCount > 0 ? 'sent' : 'failed'),
            deliveredCount: res.sentCount,
            failedCount: res.failedCount,
            sentAt: new Date().toISOString()
          };
        }
        return c;
      }));
      setDispatchModalCampaign(null);
      setConfirmSendChecked(false);
      await loadCampaigns();
    } catch (err: any) {
      error(err.message || 'Failed to dispatch promotional campaign');
    } finally {
      setDispatching(false);
    }
  };

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-dark"><Clock size={11} /> Draft</span>;
      case 'sending':
        return <span className="badge badge-gold"><RefreshCw size={11} className="animate-spin" /> Sending</span>;
      case 'sent':
        return <span className="badge badge-success"><CheckCircle2 size={11} /> Sent</span>;
      case 'failed':
        return <span className="badge badge-danger"><XCircle size={11} /> Failed</span>;
      case 'scheduled':
        return <span className="badge badge-warning"><Clock size={11} /> Scheduled</span>;
      case 'cancelled':
        return <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}>Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="admin-campaigns animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem', width: '100%' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            <Sparkles size={15} /> Patron CRM &bull; Module A
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Promotional Email Campaigns
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Create, test, and dispatch branded promotional showcases to marketing-consented patrons.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadCampaigns}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh campaigns"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>Create Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid-4" style={{ gap: '1.5rem' }}>
        {/* Metric 1 */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Campaigns</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(16, 23, 42, 0.08)', color: 'var(--brand-primary)' }}>
              <Mail size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            {campaigns.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 'auto', paddingTop: '6px' }}>Recorded in atelier history</span>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dispatched (Sent)</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-heading)' }}>
            {campaigns.filter(c => c.status === 'sent').length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 'auto', paddingTop: '6px' }}>Verified delivery pipeline</span>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Patron Deliveries</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(201, 162, 39, 0.12)', color: 'var(--brand-accent)' }}>
              <Send size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-accent)', fontFamily: 'var(--font-heading)' }}>
            {campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 'auto', paddingTop: '6px' }}>Private 1-to-1 transmissions</span>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Consent Integrity</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#0284c7' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            100%
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 'auto', paddingTop: '6px' }}>Strict consent &amp; suppression enforced</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {['all', 'draft', 'sending', 'sent', 'failed'].map(st => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 600,
                  textTransform: 'capitalize',
                  backgroundColor: isActive ? 'var(--brand-primary)' : '#f1f5f9',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {st}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
          <Search size={16} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search campaigns by name or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem', margin: 0 }}
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <RefreshCw size={26} className="animate-spin" color="var(--brand-accent)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)' }}>Loading promotional campaigns...</div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <Mail size={36} color="var(--brand-muted)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>No Campaigns Found</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Create your first promotional campaign to begin engaging marketing-consented patrons.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--brand-muted)', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 14px' }}>Campaign Name &amp; Subject</th>
                <th style={{ padding: '12px 14px' }}>Audience Segment</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Delivered / Failed</th>
                <th style={{ padding: '12px 14px' }}>Created Date</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map(camp => (
                <tr key={camp.id} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.92rem' }}>{camp.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {camp.subject}
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(camp.audienceFilters && camp.audienceFilters.length > 0 ? camp.audienceFilters : [camp.audienceFilter]).map(filterKey => (
                        <span
                          key={filterKey}
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: filterKey === 'patron_circle' ? 'rgba(201, 162, 39, 0.12)' : '#f1f5f9',
                            color: filterKey === 'patron_circle' ? 'var(--brand-accent)' : 'var(--brand-primary)',
                            border: filterKey === 'patron_circle' ? '1px solid rgba(201, 162, 39, 0.3)' : '1px solid #cbd5e1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {filterKey === 'patron_circle' && <Crown size={11} />}
                          {AUDIENCE_FILTER_LABELS[filterKey]?.label || filterKey}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px' }}>{getStatusBadge(camp.status)}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                      {camp.deliveredCount || 0} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>sent</span>
                    </div>
                    {camp.failedCount && camp.failedCount > 0 ? (
                      <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>{camp.failedCount} failed</div>
                    ) : null}
                  </td>
                  <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                    {new Date(camp.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewCampaign(camp)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px' }}
                        title="Preview Email"
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTestModalCampaign(camp);
                          setTestRecipient(user?.email || '');
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px', color: 'var(--brand-accent)' }}
                        title="Send Test Email"
                      >
                        <Send size={14} />
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(camp)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="Duplicate Campaign"
                          >
                            <Copy size={14} />
                          </button>

                          {camp.status === 'draft' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(camp)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontWeight: 600 }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDispatchModalCampaign(camp);
                                  setConfirmSendChecked(false);
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ fontWeight: 700 }}
                              >
                                Send &rarr;
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================
          CAMPAIGN EDITOR MODAL (AdminModal)
         ======================================================== */}
      {showEditor && editingCampaign && (
        <AdminModal
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            setEditingCampaign(null);
          }}
          title={editingCampaign.id ? 'Edit Promotional Campaign' : 'Create Promotional Campaign'}
          subtitle="Configure luxury messaging, branding, and verified recipient audience."
          headerIcon={<Mail size={20} color="var(--brand-accent)" />}
          maxWidth="860px"
        >
          <form
            onSubmit={handleSave}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Scrollable Form Body */}
            <div
              className="admin-modal-body"
              style={{
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                flex: '1 1 auto',
                minHeight: 0,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Section 1: Campaign Metadata & Subject */}
              <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--brand-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
                <Tag size={16} color="var(--brand-accent)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Campaign Identity &amp; Subject Line
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Internal Campaign Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 0 }}>
                      Internal Campaign Name *
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Admin-only reference name</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali Silk Festive Showcase 2026"
                    value={editingCampaign.name || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                  />
                </div>

                {/* Subject & Preview Text */}
                <div className="grid-2" style={{ gap: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 0 }}>
                        Email Subject Line *
                      </label>
                      <span style={{ fontSize: '0.72rem', color: (editingCampaign.subject?.length || 0) > 60 ? '#b45309' : 'var(--text-secondary)' }}>
                        {editingCampaign.subject?.length || 0}/60 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Exquisite Pure Mulberry Silk: Festive Privileges Await"
                      value={editingCampaign.subject || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, subject: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 0 }}>
                        Preview / Preheader Text
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Inbox snippet</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Brief inbox snippet displayed beside subject..."
                      value={editingCampaign.previewText || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, previewText: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Sender Identity */}
            <div style={{ padding: '1.25rem 1.5rem', borderRadius: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--brand-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="var(--brand-accent)" /> Sender Identity &amp; Authenticated Domain
                </div>
                <span style={{ fontSize: '0.72rem', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Verified Domain: muety.in
                </span>
              </div>

              <div className="grid-2" style={{ gap: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-primary)' }}>Display Name</label>
                  <input
                    type="text"
                    value={editingCampaign.senderIdentity?.name || 'MUETY Promotions'}
                    onChange={e => setEditingCampaign({
                      ...editingCampaign,
                      senderIdentity: {
                        email: editingCampaign.senderIdentity?.email || 'promotions@muety.in',
                        name: e.target.value
                      }
                    })}
                    className="form-input"
                    style={{ fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-primary)' }}>From Email Address</label>
                  <input
                    type="email"
                    value={editingCampaign.senderIdentity?.email || 'promotions@muety.in'}
                    onChange={e => setEditingCampaign({
                      ...editingCampaign,
                      senderIdentity: {
                        name: editingCampaign.senderIdentity?.name || 'MUETY Promotions',
                        email: e.target.value
                      }
                    })}
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Target Patron Audience & Multi-Selection */}
            <div style={{ padding: '1.5rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid var(--brand-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '0.75rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={17} color="var(--brand-accent)" /> Target Patron Audience &bull; Multi-Segment Selection
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Select one or more patron segments. Consented patrons matching any selected segment will receive this campaign.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#fafaf9', border: '1px solid var(--brand-border)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    {selectedAudiences.includes('all_consented')
                      ? 'Targeting All Consented'
                      : `Selected: ${selectedAudiences.length} segment${selectedAudiences.length > 1 ? 's' : ''}`}
                  </span>
                  {estimating && <RefreshCw size={13} className="animate-spin" color="var(--brand-accent)" />}
                </div>
              </div>

              {/* Multi-Select Cards Grid */}
              <div className="grid-2" style={{ gap: '0.85rem' }}>
                {TARGET_SEGMENT_KEYS.map(filterKey => {
                  const info = AUDIENCE_FILTER_LABELS[filterKey];
                  const isSelected = selectedAudiences.includes(filterKey);
                  const IconComponent = info.icon || Users;

                  return (
                    <button
                      type="button"
                      key={filterKey}
                      onClick={() => handleToggleAudience(filterKey)}
                      style={{
                        padding: '12px 14px',
                        textAlign: 'left',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid var(--brand-accent)'
                          : '1px solid var(--brand-border)',
                        backgroundColor: isSelected ? 'rgba(201, 162, 39, 0.08)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: isSelected ? '0 2px 10px rgba(201, 162, 39, 0.12)' : 'none',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              backgroundColor: isSelected ? 'var(--brand-accent)' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : 'var(--brand-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <IconComponent size={15} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                              {info.label}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: isSelected ? 'rgba(201, 162, 39, 0.2)' : '#f1f5f9',
                                color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                marginTop: '2px'
                              }}
                            >
                              {info.badge}
                            </span>
                          </div>
                        </div>

                        {/* Checkbox indicator */}
                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                          {isSelected ? (
                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                              <Check size={12} strokeWidth={3} />
                            </div>
                          ) : (
                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff' }} />
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4, paddingLeft: '36px' }}>
                        {info.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Estimation Pill */}
              {audienceEstimate && (
                <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                    <span style={{ color: '#166534', fontWeight: 600 }}>Estimated Consented Reach:</span>
                    <strong style={{ color: '#15803d', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                      {audienceEstimate.eligibleCount} patrons
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', color: '#166534', fontSize: '0.75rem' }}>
                    <span>Excluded (No Consent): <strong>{audienceEstimate.excludedNoConsentCount}</strong></span>
                    <span>Suppressed: <strong>{audienceEstimate.suppressedCount}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Email Creative Content */}
            <div style={{ padding: '1.5rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid var(--brand-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
                <Sparkles size={16} color="var(--brand-accent)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email Creative &amp; Editorial Body
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="grid-2" style={{ gap: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Headline *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Weaves for the Auspicious Season"
                      value={editingCampaign.headline || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, headline: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Subheadline</label>
                    <input
                      type="text"
                      placeholder="e.g. Handcrafted in Varanasi with 24k Gold Zari"
                      value={editingCampaign.subheadline || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, subheadline: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                    />
                  </div>
                </div>

                {/* Hero Image URL & Live Preview */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 0 }}>
                      Hero Banner Image URL
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Recommended aspect ratio 16:9 or 3:2</span>
                  </div>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={editingCampaign.heroImageUrl || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, heroImageUrl: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                  />

                  {/* Live Banner Preview */}
                  {editingCampaign.heroImageUrl && (
                    <div style={{ marginTop: '10px', position: 'relative', borderRadius: '8px', overflow: 'hidden', maxHeight: '140px', border: '1px solid var(--brand-border)', backgroundColor: '#f8fafc' }}>
                      <img
                        src={editingCampaign.heroImageUrl}
                        alt="Hero preview"
                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                        onError={(e: any) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.65)', color: '#ffffff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
                        Hero Banner Preview
                      </div>
                    </div>
                  )}
                </div>

                {/* Editorial Body Copy */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 0 }}>
                      Editorial Body Copy
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--brand-accent)', fontWeight: 600 }}>
                      HTML supported (&lt;p&gt;, &lt;strong&gt;, &lt;a&gt;)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editingCampaign.bodyContent || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, bodyContent: e.target.value })}
                    className="form-textarea"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5, padding: '0.75rem 0.9rem' }}
                    placeholder="<p>Distinguished Patron,<br/><br/>We are delighted to present an exclusive showcase...</p>"
                  />
                </div>

                {/* Call to Action and URL */}
                <div className="grid-2" style={{ gap: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Call to Action (Button Label)</label>
                    <input
                      type="text"
                      placeholder="e.g. Explore Royal Weaves"
                      value={editingCampaign.ctaText || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, ctaText: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Button Destination Link</label>
                    <input
                      type="url"
                      placeholder="https://store.muety.in/catalog"
                      value={editingCampaign.ctaUrl || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, ctaUrl: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.9rem', padding: '0.65rem 0.9rem' }}
                    />
                  </div>
                </div>

                {/* CTA Visual Preview Pill */}
                {editingCampaign.ctaText && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--brand-border)', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Button Preview:</span>
                    <div style={{ padding: '6px 16px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {editingCampaign.ctaText} &rarr;
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pinned Modal Footer */}
            <div
              className="admin-modal-footer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                {audienceEstimate ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', backgroundColor: '#f0fdf4', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                    <span>Target: <strong>{audienceEstimate.eligibleCount}</strong> eligible patrons ({selectedAudiences.length} segment{selectedAudiences.length > 1 ? 's' : ''})</span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>Select target segments in the form above</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditor(false);
                    setEditingCampaign(null);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    fontWeight: 700,
                    padding: '0.65rem 1.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'var(--brand-primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <Save size={15} color="var(--brand-accent)" />
                  <span>Save Campaign Draft</span>
                </button>
              </div>
            </div>
          </form>
        </AdminModal>
      )}

      {/* ========================================================
          LIVE VISUAL PREVIEW MODAL (AdminModal)
         ======================================================== */}
      {previewCampaign && (
        <AdminModal
          isOpen={!!previewCampaign}
          onClose={() => setPreviewCampaign(null)}
          title={`Email Preview: ${previewCampaign.name}`}
          subtitle="Real-time rendered HTML template preview with live viewport toggles"
          headerIcon={<Eye size={20} />}
          maxWidth="840px"
        >
          <div
            className="admin-modal-body"
            style={{
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              flex: '1 1 auto',
              minHeight: 0,
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            {/* Viewport Selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  backgroundColor: previewDevice === 'desktop' ? 'var(--brand-primary)' : '#f1f5f9',
                  color: previewDevice === 'desktop' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Monitor size={15} /> Desktop View (600px)
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  backgroundColor: previewDevice === 'mobile' ? 'var(--brand-primary)' : '#f1f5f9',
                  color: previewDevice === 'mobile' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={15} /> Mobile View (375px)
              </button>
            </div>

            {/* Email Canvas Preview */}
            <div style={{ backgroundColor: '#f1f5f9', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
              <div
                style={{
                  width: previewDevice === 'mobile' ? '375px' : '600px',
                  backgroundColor: '#faf8f3',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  border: '1px solid #e2d9cd',
                  transition: 'width 0.25s ease'
                }}
              >
                {/* Brand Header */}
                <div style={{ backgroundColor: '#090d16', textAlign: 'center', padding: '1.5rem', borderBottom: '2px solid #c99a16' }}>
                  <div style={{ fontSize: '1.5rem', fontFamily: 'Georgia, serif', color: '#c99a16', fontWeight: 800, letterSpacing: '0.15em' }}>
                    MUETY
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>
                    Royal Indian Handlooms &bull; Atelier
                  </div>
                </div>

                {/* Hero */}
                {previewCampaign.heroImageUrl && (
                  <div style={{ padding: '1rem' }}>
                    <img
                      src={previewCampaign.heroImageUrl}
                      alt="Hero"
                      style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e7ded0' }}
                    />
                  </div>
                )}

                {/* Content Card */}
                <div style={{ margin: '0 1rem 1rem', padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e7ded0' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#faf7f2', color: '#8c827a', padding: '3px 10px', borderRadius: '12px', border: '1px solid #dd3c5' }}>
                      Atelier Special Edition
                    </span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#090d16', margin: '10px 0 4px', fontFamily: 'Georgia, serif' }}>
                      {previewCampaign.headline}
                    </h2>
                    {previewCampaign.subheadline && (
                      <p style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                        {previewCampaign.subheadline}
                      </p>
                    )}
                  </div>

                  <div
                    style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.5rem' }}
                    dangerouslySetInnerHTML={{ __html: previewCampaign.bodyContent }}
                  />

                  {/* CTA */}
                  <div style={{ textAlign: 'center' }}>
                    <a
                      href={previewCampaign.ctaUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#090d16',
                        color: '#f4c430',
                        border: '1px solid #c99a16',
                        fontFamily: 'Georgia, serif',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        padding: '12px 24px',
                        borderRadius: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      {previewCampaign.ctaText || 'Explore Handlooms'} &rarr;
                    </a>
                  </div>
                </div>

                {/* Legal & Unsubscribe Footer */}
                <div style={{ backgroundColor: '#090d16', textAlign: 'center', padding: '1.25rem', fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid #1e293b' }}>
                  <div style={{ color: '#c99a16', fontWeight: 700, letterSpacing: '0.05em' }}>MUETY ATELIER</div>
                  <div style={{ marginTop: '2px', color: '#64748b' }}>Heritage Handloom Quarters, Tamil Nadu, India</div>
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e293b', fontSize: '0.68rem', color: '#64748b' }}>
                    You received this privileged correspondence because of verified MUETY patron membership.{' '}
                    <span style={{ color: '#c99a16', textDecoration: 'underline', cursor: 'pointer' }}>Unsubscribe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
            <button
              type="button"
              onClick={() => setPreviewCampaign(null)}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              Close Preview
            </button>
          </div>
        </AdminModal>
      )}

      {/* ========================================================
          TEST EMAIL SEND MODAL (AdminModal)
         ======================================================== */}
      {testModalCampaign && (
        <AdminModal
          isOpen={!!testModalCampaign}
          onClose={() => setTestModalCampaign(null)}
          title="Send Test Preview Email"
          subtitle="Sends an authentic rendered test email with [TEST PREVIEW] prefix"
          headerIcon={<Send size={20} />}
          maxWidth="480px"
        >
          <div className="admin-modal-body" style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Verify how <strong style={{ color: 'var(--brand-primary)' }}>"{testModalCampaign.name}"</strong> renders in Gmail, Apple Mail, and mobile clients before dispatching.
            </p>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Test Recipient Email *</label>
              <input
                type="email"
                required
                placeholder="admin@muety.in"
                value={testRecipient}
                onChange={e => setTestRecipient(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '1rem 1.5rem' }}>
            <button
              type="button"
              onClick={() => setTestModalCampaign(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sendingTest}
              onClick={handleTestSend}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              {sendingTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Send Test Email</span>
            </button>
          </div>
        </AdminModal>
      )}

      {/* ========================================================
          BULK DISPATCH CONFIRMATION MODAL (Strict Governance)
         ======================================================== */}
      {dispatchModalCampaign && (
        <AdminModal
          isOpen={!!dispatchModalCampaign}
          onClose={() => setDispatchModalCampaign(null)}
          title="Confirm Bulk Promotional Dispatch"
          subtitle="Audience segment verification and strict patron consent compliance"
          headerIcon={<AlertCircle size={20} color="#b45309" />}
          maxWidth="520px"
        >
          <div className="admin-modal-body" style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(() => {
              const audList = (dispatchModalCampaign.audienceFilters && dispatchModalCampaign.audienceFilters.length > 0)
                ? dispatchModalCampaign.audienceFilters
                : [dispatchModalCampaign.audienceFilter];
              const audLabel = audList.map(f => AUDIENCE_FILTER_LABELS[f]?.label || f).join(' + ');

              return (
                <>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                    You are preparing to dispatch <strong>"{dispatchModalCampaign.name}"</strong> to the{' '}
                    <strong style={{ color: 'var(--brand-accent)' }}>
                      {audLabel}
                    </strong>{' '}
                    target audience.
                  </p>

                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--brand-border)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Target Audience:</span>
                      <span style={{ fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'right' }}>
                        {audLabel}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Consent Filter:</span>
                      <span style={{ fontWeight: 700, color: '#16a34a' }}>&#10003; Strict Verified Opt-In</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Suppression List:</span>
                      <span style={{ fontWeight: 700, color: '#16a34a' }}>&#10003; Automatic Unsubscribe Exclusion</span>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Live Reach Estimation Card */}
            {modalEstimating ? (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                <RefreshCw size={14} className="animate-spin" />
                <span>Verifying eligible consented reach across patron database...</span>
              </div>
            ) : modalEstimate && modalEstimate.eligibleCount === 0 ? (
              <div style={{ padding: '0.9rem 1rem', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '0.82rem', color: '#991b1b', lineHeight: 1.45 }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#b91c1c' }}>
                  <AlertCircle size={16} color="#dc2626" /> Dispatch Disabled: 0 Eligible Recipients
                </strong>
                <div>
                  No patrons currently have verified marketing opt-in for this audience filter ({modalEstimate.excludedNoConsentCount} patrons excluded for missing consent). Marketing emails can only be delivered to patrons who have explicitly consented.
                </div>
              </div>
            ) : modalEstimate ? (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.82rem', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#16a34a" /> Verified Reach: <strong>{modalEstimate.eligibleCount} consented patrons</strong>
                </span>
                <span style={{ fontSize: '0.76rem', color: '#15803d' }}>
                  {modalEstimate.excludedNoConsentCount} unconsented excluded
                </span>
              </div>
            ) : null}

            <div style={{ padding: '0.85rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.4 }}>
              <strong>Consent Compliance Rule:</strong> Marketing emails are delivered individually. Patrons without explicit marketing consent or those on the suppression list are strictly excluded.
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--brand-primary)', cursor: (modalEstimate && modalEstimate.eligibleCount === 0) ? 'not-allowed' : 'pointer', opacity: (modalEstimate && modalEstimate.eligibleCount === 0) ? 0.6 : 1 }}>
              <input
                type="checkbox"
                disabled={modalEstimate !== null && modalEstimate.eligibleCount === 0}
                checked={confirmSendChecked}
                onChange={e => setConfirmSendChecked(e.target.checked)}
                style={{ marginTop: '2px', accentColor: 'var(--brand-accent)' }}
              />
              <span>
                I confirm that this promotional campaign has been reviewed and adheres to MUETY marketing consent policies.
              </span>
            </label>
          </div>

          <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '1rem 1.5rem' }}>
            <button
              type="button"
              onClick={() => setDispatchModalCampaign(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            {(() => {
              const isZeroReach = modalEstimate !== null && modalEstimate.eligibleCount === 0;
              return (
                <button
                  type="button"
                  disabled={!confirmSendChecked || dispatching || isZeroReach || modalEstimating}
                  onClick={handleConfirmDispatch}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  title={isZeroReach ? 'Cannot dispatch: 0 eligible consented recipients' : undefined}
                >
                  {dispatching ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>
                    {dispatching
                      ? 'Dispatching...'
                      : isZeroReach
                        ? '0 Reach — Dispatch Disabled'
                        : 'Confirm & Dispatch Campaign'}
                  </span>
                </button>
              );
            })()}
          </div>
        </AdminModal>
      )}
    </div>
  );
};
