import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { announcementService } from '@/features/announcements/services/announcementService';
import { StoreAnnouncement, CreateAnnouncementInput } from '@/features/announcements/types';
import { auditService } from '@/shared/services/auditService';
import { getUserRoles } from '@/shared/utils/permissions';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  Tag, 
  Sparkles, 
  ExternalLink,
  Eye,
  AlertCircle,
  Zap,
  Calendar
} from 'lucide-react';

const toLocalDatetimeInput = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
};

const toIsoFromLocalInput = (localStr?: string): string | undefined => {
  if (!localStr) return undefined;
  const d = new Date(localStr);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

const getPresetLocalTime = (type: '+2h' | '+4h' | '+8h' | '+24h' | 'today_eod' | 'tomorrow_eod'): string => {
  const d = new Date();
  if (type === '+2h') d.setHours(d.getHours() + 2);
  else if (type === '+4h') d.setHours(d.getHours() + 4);
  else if (type === '+8h') d.setHours(d.getHours() + 8);
  else if (type === '+24h') d.setDate(d.getDate() + 1);
  else if (type === 'today_eod') {
    d.setHours(23, 59, 0, 0);
  } else if (type === 'tomorrow_eod') {
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
  }
  return toLocalDatetimeInput(d.toISOString());
};

const formatDigits = (val: number) => String(val).padStart(2, '0');

export const AdminAnnouncements: React.FC = () => {
  useDocumentTitle('Storefront Announcements - Admin');
  const { user } = useAuth();
  const { success, warning } = useNotification();

  const [announcements, setAnnouncements] = useState<StoreAnnouncement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickTimerModalAnn, setQuickTimerModalAnn] = useState<StoreAnnouncement | null>(null);
  const [quickTimerValue, setQuickTimerValue] = useState<string>('');
  const [now, setNow] = useState<number>(Date.now());

  // Form State
  const [title, setTitle] = useState('');
  const [campaignLabel, setCampaignLabel] = useState('');
  const [message, setMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [ctaText, setCtaText] = useState('Shop Edit →');
  const [ctaLink, setCtaLink] = useState('/products');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [backgroundColor, setBackgroundColor] = useState('#4a0e2e');
  const [textColor, setTextColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#facc15');
  const [hasCountdown, setHasCountdown] = useState(false);
  const [countdownEndTime, setCountdownEndTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = () => {
    setAnnouncements(announcementService.getAllAnnouncements());
  };

  useEffect(() => {
    loadData();
    const unsub = announcementService.subscribeToAnnouncements((all) => {
      setAnnouncements(all);
    });
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      if (typeof unsub === 'function') unsub();
      clearInterval(interval);
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCampaignLabel('');
    setMessage('');
    setCouponCode('');
    setCtaText('Shop Edit →');
    setCtaLink('/products');
    setIsActive(true);
    setDisplayOrder(announcements.length + 1);
    setBackgroundColor('#4a0e2e');
    setTextColor('#ffffff');
    setAccentColor('#facc15');
    setHasCountdown(false);
    setCountdownEndTime('');
    setStartDate('');
    setEndDate('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann: StoreAnnouncement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setCampaignLabel(ann.campaignLabel || '');
    setMessage(ann.message);
    setCouponCode(ann.couponCode || '');
    setCtaText(ann.ctaText || 'Shop Edit →');
    setCtaLink(ann.ctaLink || '');
    setIsActive(ann.isActive);
    setDisplayOrder(ann.displayOrder);
    setBackgroundColor(ann.backgroundColor || '#4a0e2e');
    setTextColor(ann.textColor || '#ffffff');
    setAccentColor(ann.accentColor || '#facc15');
    setHasCountdown(Boolean(ann.hasCountdown));
    setCountdownEndTime(toLocalDatetimeInput(ann.countdownEndTime));
    setStartDate(toLocalDatetimeInput(ann.startDate));
    setEndDate(toLocalDatetimeInput(ann.endDate));
    setIsModalOpen(true);
  };

  const handleOpenQuickTimer = (ann: StoreAnnouncement) => {
    setQuickTimerModalAnn(ann);
    setQuickTimerValue(toLocalDatetimeInput(ann.countdownEndTime) || getPresetLocalTime('+4h'));
  };

  const handleSaveQuickTimer = async (enable: boolean) => {
    if (!quickTimerModalAnn) return;

    if (!enable) {
      await announcementService.updateAnnouncement(quickTimerModalAnn.id, {
        hasCountdown: false,
        countdownEndTime: undefined
      });
      success(`Countdown timer disabled for "${quickTimerModalAnn.title}".`, 'Timer Updated');
    } else {
      const iso = toIsoFromLocalInput(quickTimerValue);
      if (!iso) {
        warning('Please select a valid date & time.');
        return;
      }
      await announcementService.updateAnnouncement(quickTimerModalAnn.id, {
        hasCountdown: true,
        countdownEndTime: iso
      });
      success(`Countdown timer set until ${new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`, 'Timer Saved');
    }

    setQuickTimerModalAnn(null);
    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      warning('Please provide an announcement title and display message.');
      return;
    }

    const payload: CreateAnnouncementInput = {
      title: title.trim(),
      campaignLabel: campaignLabel.trim() || undefined,
      message: message.trim(),
      couponCode: couponCode.trim().toUpperCase() || undefined,
      ctaText: ctaText.trim() || undefined,
      ctaLink: ctaLink.trim() || undefined,
      isActive,
      displayOrder: Number(displayOrder) || 1,
      backgroundColor: backgroundColor.trim() || '#4a0e2e',
      textColor: textColor.trim() || '#ffffff',
      accentColor: accentColor.trim() || '#facc15',
      hasCountdown,
      countdownEndTime: hasCountdown && countdownEndTime ? toIsoFromLocalInput(countdownEndTime) : undefined,
      startDate: startDate ? toIsoFromLocalInput(startDate) : undefined,
      endDate: endDate ? toIsoFromLocalInput(endDate) : undefined
    };

    if (editingId) {
      await announcementService.updateAnnouncement(editingId, payload);
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'ANNOUNCEMENT_UPDATED',
        entityType: 'SETTINGS',
        entityId: editingId,
        reason: `Updated storefront announcement: ${title}`
      });
      success('Announcement updated successfully.', 'Changes Saved');
    } else {
      const created = await announcementService.createAnnouncement(payload);
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'ANNOUNCEMENT_CREATED',
        entityType: 'SETTINGS',
        entityId: created.id,
        reason: `Created new storefront announcement: ${title}`
      });
      success('New storefront announcement published.', 'Announcement Added');
    }

    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await announcementService.toggleActive(id);
    await auditService.logAction({
      actorUid: user?.uid || 'system',
      actorEmail: user?.email || 'admin',
      actorRole: getUserRoles(user)[0] || 'admin',
      action: 'ANNOUNCEMENT_STATUS_TOGGLED',
      entityType: 'SETTINGS',
      entityId: id,
      reason: `Toggled active state to ${!currentActive}`
    });
    success(`Announcement ${!currentActive ? 'enabled' : 'disabled'}.`, 'Status Updated');
    loadData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      await announcementService.deleteAnnouncement(id);
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'ANNOUNCEMENT_DELETED',
        entityType: 'SETTINGS',
        entityId: id,
        reason: `Deleted announcement ${name}`
      });
      success('Announcement removed.', 'Deleted');
      loadData();
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= announcements.length) return;

    const copy = [...announcements];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    const orderedIds = copy.map(a => a.id);
    await announcementService.reorderAnnouncements(orderedIds);
    loadData();
  };

  const activeCount = announcements.filter(a => a.isActive).length;
  const countdownCount = announcements.filter(a => a.isActive && a.hasCountdown).length;

  // Active countdown calculation for live preview
  const liveCountdownAnnouncement = announcements.find(
    a => a.isActive && a.hasCountdown && a.countdownEndTime && new Date(a.countdownEndTime).getTime() > now
  );

  const liveCountdownDiff = liveCountdownAnnouncement && liveCountdownAnnouncement.countdownEndTime
    ? new Date(liveCountdownAnnouncement.countdownEndTime).getTime() - now
    : 0;

  const liveCountdownTime = liveCountdownDiff > 0 ? {
    hours: Math.floor(liveCountdownDiff / (1000 * 60 * 60)),
    minutes: Math.floor((liveCountdownDiff / (1000 * 60)) % 60),
    seconds: Math.floor((liveCountdownDiff / 1000) % 60)
  } : null;

  return (
    <div className="admin-announcements animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>
              Storefront Announcements
            </h1>
            <span style={{
              fontSize: '0.75rem',
              backgroundColor: 'rgba(74, 14, 46, 0.12)',
              color: 'var(--brand-plum)',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(74, 14, 46, 0.25)'
            }}>
              Live Banner Engine
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Manage the continuous scrolling announcement strip, promotional coupon codes, and live campaign countdowns.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>Add Announcement</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            TOTAL ANNOUNCEMENTS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
            {announcements.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', marginTop: '4px' }}>
            Configured storefront messages
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            ACTIVE ON STOREFRONT
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px' }}>
            Scrolling in unified top bar
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            ACTIVE COUNTDOWNS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>
            {countdownCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#d97706', marginTop: '4px' }}>
            Live campaign timer pills
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            STRIP BEHAVIOR
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '6px' }}>
            {activeCount > 0 ? 'Continuous Marquee' : 'Hidden'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', marginTop: '4px' }}>
            Auto-smooth horizontal track
          </div>
        </div>
      </div>

      {/* Live Storefront Appearance Preview */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <Eye size={18} color="var(--brand-primary)" />
          <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--brand-primary)' }}>
            Live Storefront Appearance Preview
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)', marginLeft: 'auto' }}>
            Exact styling & countdown shown to visiting patrons
          </span>
        </div>

        <div style={{
          backgroundColor: '#4a0e2e',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          fontWeight: 600,
          border: '1px solid rgba(201, 162, 39, 0.4)',
          overflow: 'hidden'
        }}>
          {announcements.filter(a => a.isActive).length === 0 ? (
            <span style={{ opacity: 0.6 }}>No active announcements. The top announcement bar will be hidden.</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {announcements.filter(a => a.isActive).slice(0, 2).map((ann, idx) => (
                <span key={ann.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={13} color={ann.accentColor || '#facc15'} />
                  {ann.campaignLabel && (
                    <span style={{ color: ann.accentColor || '#facc15', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {ann.campaignLabel}
                    </span>
                  )}
                  {ann.campaignLabel && <span style={{ opacity: 0.5 }}>•</span>}
                  <span>{ann.message}</span>
                  {ann.couponCode && (
                    <span style={{
                      backgroundColor: 'rgba(250, 204, 21, 0.2)',
                      color: ann.accentColor || '#facc15',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(250, 204, 21, 0.4)',
                      fontWeight: 700
                    }}>
                      CODE: {ann.couponCode}
                    </span>
                  )}
                  {/* Live Countdown Pill in Preview */}
                  {ann.id === liveCountdownAnnouncement?.id && liveCountdownTime && (
                    <>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: '#fef08a',
                        fontWeight: 700,
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        <Clock size={12} />
                        <span>{formatDigits(liveCountdownTime.hours)}h</span>:
                        <span>{formatDigits(liveCountdownTime.minutes)}m</span>:
                        <span>{formatDigits(liveCountdownTime.seconds)}s</span>
                      </span>
                    </>
                  )}
                  {ann.ctaLink && (
                    <span style={{ color: ann.accentColor || '#facc15', textDecoration: 'underline', marginLeft: '4px' }}>
                      {ann.ctaText || 'Shop →'}
                    </span>
                  )}
                  {idx === 0 && announcements.filter(a => a.isActive).length > 1 && (
                    <span style={{ margin: '0 8px', opacity: 0.4 }}>✦</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>
          Configured Announcements ({announcements.length})
        </h3>

        {announcements.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--brand-muted)' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h4 style={{ margin: '0 0 0.5rem' }}>No Announcements Configured</h4>
            <p style={{ fontSize: '0.88rem', margin: 0 }}>Create your first announcement to display on the storefront.</p>
          </div>
        ) : (
          announcements.map((ann, idx) => {
            const hasTimer = ann.hasCountdown && ann.countdownEndTime;
            const timerTarget = hasTimer ? new Date(ann.countdownEndTime!).getTime() : 0;
            const isTimerExpired = hasTimer && timerTarget <= now;
            const timerDiff = hasTimer && !isTimerExpired ? timerTarget - now : 0;
            const timerHours = Math.floor(timerDiff / (1000 * 60 * 60));
            const timerMins = Math.floor((timerDiff / (1000 * 60)) % 60);

            return (
              <div 
                key={ann.id} 
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  borderLeft: ann.isActive ? '4px solid #059669' : '4px solid #cbd5e1'
                }}
              >
                {/* Left Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: 'var(--brand-muted)',
                      backgroundColor: '#f1f5f9',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      #{ann.displayOrder}
                    </span>

                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--brand-primary)' }}>
                      {ann.title}
                    </h4>

                    {ann.campaignLabel && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(201, 162, 39, 0.15)',
                        color: '#9a7b16',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid rgba(201, 162, 39, 0.3)'
                      }}>
                        {ann.campaignLabel}
                      </span>
                    )}

                    <span className={`badge badge-${ann.isActive ? 'success' : 'secondary'}`}>
                      {ann.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>

                    {/* Prominent Timer Badge */}
                    {hasTimer && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor: isTimerExpired ? '#fee2e2' : '#fef3c7',
                        color: isTimerExpired ? '#b91c1c' : '#b45309',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${isTimerExpired ? '#fca5a5' : '#fde68a'}`
                      }}>
                        <Clock size={12} /> 
                        {isTimerExpired 
                          ? `Timer Expired (${new Date(ann.countdownEndTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                          : `Live Timer: ${formatDigits(timerHours)}h ${formatDigits(timerMins)}m left (Ends ${new Date(ann.countdownEndTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                        }
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: '0.92rem', color: '#1e293b', fontWeight: 500 }}>
                    "{ann.message}"
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem', color: 'var(--brand-muted)', flexWrap: 'wrap' }}>
                    {ann.couponCode && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Tag size={12} /> Coupon: <strong>{ann.couponCode}</strong>
                      </span>
                    )}
                    {ann.ctaLink && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ExternalLink size={12} /> Link: <strong>{ann.ctaLink}</strong> ({ann.ctaText || 'CTA'})
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: ann.backgroundColor || '#4a0e2e', display: 'inline-block' }} />
                      Color: {ann.backgroundColor || '#4a0e2e'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Order Up / Down */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      onClick={() => handleMoveOrder(idx, 'up')}
                      disabled={idx === 0}
                      style={{
                        padding: '3px 6px',
                        border: '1px solid var(--brand-border)',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        opacity: idx === 0 ? 0.3 : 1
                      }}
                      title="Move priority up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(idx, 'down')}
                      disabled={idx === announcements.length - 1}
                      style={{
                        padding: '3px 6px',
                        border: '1px solid var(--brand-border)',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        cursor: idx === announcements.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: idx === announcements.length - 1 ? 0.3 : 1
                      }}
                      title="Move priority down"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  {/* Quick Set Timer Button */}
                  <button
                    onClick={() => handleOpenQuickTimer(ann)}
                    className="btn btn-outline btn-sm"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      borderColor: ann.hasCountdown ? '#f59e0b' : 'var(--brand-border)',
                      color: ann.hasCountdown ? '#b45309' : 'var(--text-secondary)',
                      backgroundColor: ann.hasCountdown ? '#fffbeb' : '#ffffff'
                    }}
                    title="Set or adjust campaign countdown timer"
                  >
                    <Clock size={14} color="#d97706" />
                    <span>{ann.hasCountdown ? 'Adjust Timer' : 'Set Timer'}</span>
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(ann.id, ann.isActive)}
                    className={`btn btn-sm ${ann.isActive ? 'btn-outline' : 'btn-secondary'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {ann.isActive ? <XCircle size={14} color="#ea580c" /> : <CheckCircle size={14} color="#059669" />}
                    <span>{ann.isActive ? 'Deactivate' : 'Activate'}</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(ann)}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(ann.id, ann.title)}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    title="Delete announcement"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QUICK TIMER MODAL */}
      {quickTimerModalAnn && (
        <AdminModal
          isOpen={Boolean(quickTimerModalAnn)}
          onClose={() => setQuickTimerModalAnn(null)}
          title={`Set Campaign Timer — ${quickTimerModalAnn.title}`}
          subtitle="Configure promotional code validity countdown on the storefront announcement bar."
          headerIcon={<Clock size={20} color="#d4af37" />}
        >
          <div className="admin-modal-body" style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', display: 'block', marginBottom: '4px' }}>
                Quick Expiry Presets
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: '+2 Hours', type: '+2h' as const },
                  { label: '+4 Hours', type: '+4h' as const },
                  { label: '+8 Hours', type: '+8h' as const },
                  { label: '+24 Hours', type: '+24h' as const },
                  { label: 'Today 11:59 PM', type: 'today_eod' as const },
                  { label: 'Tomorrow 11:59 PM', type: 'tomorrow_eod' as const }
                ].map(p => (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => setQuickTimerValue(getPresetLocalTime(p.type))}
                    className="btn btn-outline btn-sm"
                    style={{ backgroundColor: '#ffffff', fontSize: '0.78rem', padding: '4px 10px' }}
                  >
                    <Zap size={12} color="#d97706" /> {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                Countdown End Time (Your Local Time)
              </label>
              <input 
                type="datetime-local" 
                value={quickTimerValue} 
                onChange={e => setQuickTimerValue(e.target.value)} 
                className="form-input" 
                style={{ fontSize: '0.95rem' }}
              />
              <span style={{ fontSize: '0.76rem', color: 'var(--brand-muted)', marginTop: '4px', display: 'block' }}>
                When this countdown expires, the timer pill automatically disappears from the storefront.
              </span>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={() => handleSaveQuickTimer(false)}
              className="btn btn-outline"
              style={{ color: '#dc2626', borderColor: '#fca5a5', marginRight: 'auto' }}
            >
              Disable Timer
            </button>
            <button
              type="button"
              onClick={() => setQuickTimerModalAnn(null)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveQuickTimer(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Clock size={16} />
              <span>Apply Timer</span>
            </button>
          </div>
        </AdminModal>
      )}

      {/* FULL CREATE / EDIT MODAL */}
      {isModalOpen && (
        <AdminModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Edit Storefront Announcement' : 'Create Storefront Announcement'}
          subtitle="Configure promotional message, coupon code, and campaign countdown timer."
          headerIcon={<Megaphone size={20} color="#d4af37" />}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Scrollable Form Body */}
            <div className="admin-modal-body" style={{ overflowY: 'auto', maxHeight: '70vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Title / Internal Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                  Announcement Title (Internal Reference) *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Diwali Festive Sale 2026"
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="form-input" 
                />
              </div>

              {/* Campaign Label & Coupon Code */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Campaign Label (Optional Eyebrow)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. ROYAL FESTIVE EDIT 2026"
                    value={campaignLabel} 
                    onChange={e => setCampaignLabel(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Coupon Code (Optional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. DIWALI25"
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value)} 
                    className="form-input" 
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              {/* PROMINENT COUNTDOWN TIMER SECTION */}
              <div style={{
                backgroundColor: '#fffbeb',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #fde68a',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.92rem', color: '#92400e', fontWeight: 700 }}>
                  <input 
                    type="checkbox" 
                    checked={hasCountdown} 
                    onChange={e => {
                      setHasCountdown(e.target.checked);
                      if (e.target.checked && !countdownEndTime) {
                        setCountdownEndTime(getPresetLocalTime('+4h'));
                      }
                    }} 
                    style={{ width: '18px', height: '18px', accentColor: '#d97706' }}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} /> Enable Real Campaign Countdown Timer
                  </span>
                </label>

                {hasCountdown && (
                  <>
                    <div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78350f', display: 'block', marginBottom: '6px' }}>
                        Quick Expiry Presets:
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { label: '+2h', type: '+2h' as const },
                          { label: '+4h', type: '+4h' as const },
                          { label: '+8h', type: '+8h' as const },
                          { label: '+24h', type: '+24h' as const },
                          { label: 'Today 11:59 PM', type: 'today_eod' as const },
                          { label: 'Tomorrow 11:59 PM', type: 'tomorrow_eod' as const }
                        ].map(p => (
                          <button
                            key={p.type}
                            type="button"
                            onClick={() => setCountdownEndTime(getPresetLocalTime(p.type))}
                            className="btn btn-outline btn-sm"
                            style={{ backgroundColor: '#ffffff', fontSize: '0.74rem', padding: '3px 8px' }}
                          >
                            <Zap size={11} color="#d97706" /> {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', color: '#78350f', fontWeight: 600 }}>
                        Countdown End Timestamp (Your Local Browser Time)
                      </label>
                      <input 
                        type="datetime-local" 
                        required={hasCountdown}
                        value={countdownEndTime} 
                        onChange={e => setCountdownEndTime(e.target.value)} 
                        className="form-input" 
                        style={{ backgroundColor: '#ffffff' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '4px', display: 'block' }}>
                        Storefront displays live ticking: <strong>[04h : 15m : 20s]</strong> pill in the announcement bar.
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Display Message */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                  Display Message *
                </label>
                <textarea 
                  required 
                  rows={2}
                  placeholder="e.g. 25% Off on Salem Handlooms • Flat ₹89 Delivery Nationwide"
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  className="form-input" 
                />
              </div>

              {/* CTA Destination & Text */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    CTA Link Destination (Optional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. /products or /collections"
                    value={ctaLink} 
                    onChange={e => setCtaLink(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    CTA Text
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Shop Edit →"
                    value={ctaText} 
                    onChange={e => setCtaText(e.target.value)} 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Colors & Order */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Background Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="color" 
                      value={backgroundColor} 
                      onChange={e => setBackgroundColor(e.target.value)} 
                      style={{ width: '38px', height: '38px', padding: '2px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" 
                      value={backgroundColor} 
                      onChange={e => setBackgroundColor(e.target.value)} 
                      className="form-input" 
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Accent Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="color" 
                      value={accentColor} 
                      onChange={e => setAccentColor(e.target.value)} 
                      style={{ width: '38px', height: '38px', padding: '2px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" 
                      value={accentColor} 
                      onChange={e => setAccentColor(e.target.value)} 
                      className="form-input" 
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Display Priority</label>
                  <input 
                    type="number" 
                    min={1}
                    value={displayOrder} 
                    onChange={e => setDisplayOrder(parseInt(e.target.value) || 1)} 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Active Status Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.92rem', color: '#1e293b', fontWeight: 600, padding: '4px 0' }}>
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={e => setIsActive(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: '#059669' }}
                />
                <span>Publish as Active (Visible immediately on Storefront)</span>
              </label>
            </div>

            {/* Fixed Modal Footer */}
            <div className="admin-modal-footer">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                {editingId ? 'Save Changes' : 'Create Announcement'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

    </div>
  );
};
