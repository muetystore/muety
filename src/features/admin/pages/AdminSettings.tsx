import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { isLiveFirebase, db } from '@/lib/firebase/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getUserRoles } from '@/shared/utils/permissions';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Save, 
  Megaphone, 
  CreditCard, 
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  Globe,
  Send,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  Layers
} from 'lucide-react';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { StoreSettings, ContactChannel, ContactChannelType } from '@/shared/types';
import { ensureContactChannels, computeChannelLink } from '@/shared/utils/contactChannels';

function renderChannelIcon(type: ContactChannelType, size: number = 16) {
  switch (type) {
    case 'phone': return <Phone size={size} color="#d4af37" />;
    case 'whatsapp': return <MessageCircle size={size} color="#25D366" />;
    case 'email': return <Mail size={size} color="#3b82f6" />;
    case 'instagram': return <Instagram size={size} color="#E1306C" />;
    case 'facebook': return <Facebook size={size} color="#1877F2" />;
    case 'youtube': return <Youtube size={size} color="#FF0000" />;
    case 'twitter': return <Twitter size={size} color="#1DA1F2" />;
    case 'linkedin': return <Linkedin size={size} color="#0A66C2" />;
    case 'telegram': return <Send size={size} color="#229ED9" />;
    case 'location': return <MapPin size={size} color="#eab308" />;
    case 'pinterest':
    case 'custom':
    default:
      return <Globe size={size} color="#64748b" />;
  }
}

export const AdminSettings: React.FC = () => {
  useDocumentTitle('Store Settings & ERP Config');
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const s = storageService.getSettings();
    return ensureContactChannels({
      storeName: s.storeName || 'MUETY',
      legalBusinessName: (s as any).legalBusinessName || 'muety',
      gstin: (s as any).gstin || '33HFCPR2838F2ZD',
      tagline: s.tagline || 'Sarees for Your Story',
      contactEmail: (s as any).contactEmail || 'support@muety.in',
      ordersEmail: (s as any).ordersEmail || 'orders@muety.in',
      contactPhone: (s as any).contactPhone || '9385791540',
      whatsappPhone: (s as any).whatsappPhone || '9940668095',
      instagramHandle: (s as any).instagramHandle || '@Themuety',
      contactChannels: s.contactChannels,
      registeredAddress: (s as any).registeredAddress || {
        buildingNo: '2/32B',
        street: 'Ramireddypatti, Palikadu',
        city: 'Salem',
        state: 'Tamil Nadu',
        postalCode: '636501',
        country: 'India'
      },
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: s.taxRate || 5,
      freeShippingThreshold: s.freeShippingThreshold !== undefined ? s.freeShippingThreshold : 0,
      standardShippingFee: s.standardShippingFee !== undefined ? s.standardShippingFee : 89,
      expressShippingFee: s.expressShippingFee !== undefined ? s.expressShippingFee : 89,
      shippingCountry: (s as any).shippingCountry || 'India',
      policy: (s as any).policy || {
        returnsAccepted: false, 
        refundsOffered: false,
        cancellationsOffered: false,
        disclaimerText: 'Orders are non-returnable, non-refundable, and non-cancellable, subject to mandatory consumer protection laws.'
      },
      announcementBanner: s.announcementBanner || {
        enabled: true,
        text: 'Pan-India Insured Courier Delivery (₹89 Flat) | Silk Mark Certified Salem Handlooms'
      }
    });
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ContactChannel | null>(null);
  const [channelForm, setChannelForm] = useState<{
    id: string;
    name: string;
    type: ContactChannelType;
    value: string;
    link: string;
    showInFooter: boolean;
    enabled: boolean;
  }>({
    id: '',
    name: '',
    type: 'phone',
    value: '',
    link: '',
    showInFooter: true,
    enabled: true
  });

  useEffect(() => {
    if (db && isLiveFirebase) {
      getDoc(doc(db, 'storeSettings', 'config')).then(snap => {
        if (snap.exists()) {
          const cloud = snap.data() as StoreSettings;
          setSettings(prev => ensureContactChannels({ ...prev, ...cloud }));
        }
      }).catch(() => {});
    }
  }, []);

  const updateQuickContactField = (field: 'contactEmail' | 'ordersEmail' | 'contactPhone' | 'whatsappPhone' | 'instagramHandle', val: string) => {
    setSettings(prev => {
      const nextSettings = { ...prev, [field]: val };
      const channels = (prev.contactChannels || []).map(ch => {
        if (field === 'contactEmail' && ch.id === 'channel-email-support') {
          return { ...ch, value: val, link: computeChannelLink('email', val) };
        }
        if (field === 'ordersEmail' && ch.id === 'channel-email-orders') {
          return { ...ch, value: val, link: computeChannelLink('email', val) };
        }
        if (field === 'contactPhone' && ch.id === 'channel-phone') {
          return { ...ch, value: val, link: computeChannelLink('phone', val) };
        }
        if (field === 'whatsappPhone' && ch.id === 'channel-whatsapp') {
          return { ...ch, value: val, link: computeChannelLink('whatsapp', val) };
        }
        if (field === 'instagramHandle' && ch.id === 'channel-instagram') {
          return { ...ch, value: val, link: computeChannelLink('instagram', val) };
        }
        return ch;
      });
      return { ...nextSettings, contactChannels: channels };
    });
  };

  const handleToggleFooter = (channelId: string) => {
    setSettings(prev => {
      const channels = (prev.contactChannels || []).map(ch => {
        if (ch.id === channelId) {
          return { ...ch, showInFooter: !ch.showInFooter };
        }
        return ch;
      });
      return { ...prev, contactChannels: channels };
    });
  };

  const handleToggleEnabled = (channelId: string) => {
    setSettings(prev => {
      const channels = (prev.contactChannels || []).map(ch => {
        if (ch.id === channelId) {
          return { ...ch, enabled: !ch.enabled };
        }
        return ch;
      });
      return { ...prev, contactChannels: channels };
    });
  };

  const handleDeleteChannel = (channelId: string) => {
    setSettings(prev => ({
      ...prev,
      contactChannels: (prev.contactChannels || []).filter(ch => ch.id !== channelId)
    }));
  };

  const openAddChannelModal = () => {
    setEditingChannel(null);
    setChannelForm({
      id: '',
      name: '',
      type: 'phone',
      value: '',
      link: '',
      showInFooter: true,
      enabled: true
    });
    setShowChannelModal(true);
  };

  const openEditChannelModal = (ch: ContactChannel) => {
    setEditingChannel(ch);
    setChannelForm({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      value: ch.value,
      link: ch.link || computeChannelLink(ch.type, ch.value),
      showInFooter: ch.showInFooter,
      enabled: ch.enabled !== false
    });
    setShowChannelModal(true);
  };

  const handleSaveChannelModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.name.trim() || !channelForm.value.trim()) {
      notifyError('Please specify both a channel name and contact value.');
      return;
    }

    const computed = computeChannelLink(channelForm.type, channelForm.value);
    const finalLink = channelForm.link.trim() || computed;

    setSettings(prev => {
      const channels = [...(prev.contactChannels || [])];
      let updatedSettings = { ...prev };

      if (channelForm.id) {
        // Edit existing
        const updatedChannels = channels.map(ch => {
          if (ch.id === channelForm.id) {
            return {
              ...ch,
              name: channelForm.name.trim(),
              type: channelForm.type,
              value: channelForm.value.trim(),
              link: finalLink,
              showInFooter: channelForm.showInFooter,
              enabled: channelForm.enabled
            };
          }
          return ch;
        });

        // Sync primary fields if this was a canonical channel
        if (channelForm.id === 'channel-phone') updatedSettings.contactPhone = channelForm.value.trim();
        if (channelForm.id === 'channel-whatsapp') updatedSettings.whatsappPhone = channelForm.value.trim();
        if (channelForm.id === 'channel-email-support') updatedSettings.contactEmail = channelForm.value.trim();
        if (channelForm.id === 'channel-email-orders') updatedSettings.ordersEmail = channelForm.value.trim();
        if (channelForm.id === 'channel-instagram') updatedSettings.instagramHandle = channelForm.value.trim();

        return { ...updatedSettings, contactChannels: updatedChannels };
      } else {
        // Add new
        const newCh: ContactChannel = {
          id: `channel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: channelForm.name.trim(),
          type: channelForm.type,
          value: channelForm.value.trim(),
          link: finalLink,
          showInFooter: channelForm.showInFooter,
          enabled: channelForm.enabled,
          order: channels.length + 1
        };
        return { ...prev, contactChannels: [...channels, newCh] };
      }
    });

    setShowChannelModal(false);
    setEditingChannel(null);
  };

  const handleMoveChannel = (id: string, direction: 'up' | 'down') => {
    setSettings(prev => {
      const channels = [...(prev.contactChannels || [])];
      const index = channels.findIndex(c => c.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= channels.length) return prev;

      const updated = [...channels];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);

      return {
        ...prev,
        contactChannels: updated.map((c, i) => ({ ...c, order: i + 1 }))
      };
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      storageService.saveSettings(settings);

      if (db && isLiveFirebase) {
        await setDoc(doc(db, 'storeSettings', 'config'), settings, { merge: true });
        await setDoc(doc(db, 'settings', 'store_settings'), settings, { merge: true });
      }

      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'SETTINGS_UPDATED',
        entityType: 'SETTINGS',
        entityId: 'storeSettings/config',
        reason: 'Updated store business info, GSTIN, and policy configurations'
      });

      success('MUETY Store ERP settings saved and synced with Cloud Firestore!');
    } catch (err: any) {
      notifyError(err?.message || 'Failed to save store settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-settings animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Store Configuration & Business Registry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Official business entity details, GSTIN, registered address, and customer policy declarations.
          </p>
        </div>

        <button 
          type="submit" 
          form="store-settings-form"
          className="btn btn-primary" 
          disabled={isSaving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
        >
          <Save size={18} />
          <span>{isSaving ? 'Saving Config...' : 'Save Settings'}</span>
        </button>
      </div>

      <form id="store-settings-form" onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Section 1: Business Entity & Tax Identity */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: '0 0 1.25rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={22} color="var(--brand-accent)" /> Legal Business Entity & GSTIN
          </h3>

          <div className="grid-2" style={{ gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Legal Business Name *</label>
              <input 
                type="text" 
                required 
                value={settings.legalBusinessName} 
                onChange={e => setSettings({ ...settings, legalBusinessName: e.target.value })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">GSTIN Registration Number *</label>
              <input 
                type="text" 
                required 
                value={settings.gstin} 
                onChange={e => setSettings({ ...settings, gstin: e.target.value })} 
                className="form-input" 
                style={{ fontFamily: 'monospace', fontWeight: 700 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Brand Display Name</label>
              <input 
                type="text" 
                value={settings.storeName} 
                onChange={e => setSettings({ ...settings, storeName: e.target.value })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Brand Tagline</label>
              <input 
                type="text" 
                value={settings.tagline} 
                onChange={e => setSettings({ ...settings, tagline: e.target.value })} 
                className="form-input" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Channels & Support Emails */}
        <div className="card" style={{ padding: '2rem', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius-lg, 12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-accent)'
                }}>
                  <Mail size={20} />
                </span>
                <span>Official Support & Contact Channels</span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '6px 0 0', lineHeight: 1.5 }}>
                Official client communication channels, customer care desk, and storefront footer social touchpoints.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddChannelModal}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '0.55rem 1.1rem', borderRadius: '8px' }}
            >
              <Plus size={16} />
              <span>Add New Channel</span>
            </button>
          </div>

          {/* Quick Contact Form Cards Grid */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Customer Support Email */}
            <div style={{
              padding: '1.15rem',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={15} color="#3b82f6" />
                  <span>Customer Support Email *</span>
                </label>
                <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                  Primary Patron Care
                </span>
              </div>
              <input 
                type="email" 
                required 
                value={settings.contactEmail} 
                onChange={e => updateQuickContactField('contactEmail', e.target.value)} 
                className="form-input" 
                placeholder="support@muety.in"
                style={{ fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.76rem', color: '#64748b' }}>
                <span>Inbound ticketing & inquiries</span>
                <a href={`mailto:${settings.contactEmail}`} style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>Test mailto</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Orders Dispatch Email */}
            <div style={{
              padding: '1.15rem',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} color="#059669" />
                  <span>Orders Dispatch Email *</span>
                </label>
                <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 600 }}>
                  Logistics & Tracking
                </span>
              </div>
              <input 
                type="email" 
                required 
                value={settings.ordersEmail} 
                onChange={e => updateQuickContactField('ordersEmail', e.target.value)} 
                className="form-input" 
                placeholder="orders@muety.in"
                style={{ fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.76rem', color: '#64748b' }}>
                <span>Shipment dispatches & receipts</span>
                <a href={`mailto:${settings.ordersEmail}`} style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>Test mailto</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Direct Phone Helpline */}
            <div style={{
              padding: '1.15rem',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={15} color="#d4af37" />
                  <span>Direct Phone Helpline *</span>
                </label>
                <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#fefce8', color: '#a16207', fontWeight: 600 }}>
                  Voice Line
                </span>
              </div>
              <input 
                type="tel" 
                required 
                value={settings.contactPhone} 
                onChange={e => updateQuickContactField('contactPhone', e.target.value)} 
                className="form-input" 
                placeholder="9385791540"
                style={{ fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.76rem', color: '#64748b' }}>
                <span>Standard voice line for patrons</span>
                <a href={`tel:${settings.contactPhone}`} style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>Test tel:</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* WhatsApp Concierge Phone */}
            <div style={{
              padding: '1.15rem',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={15} color="#25D366" />
                  <span>WhatsApp Concierge Phone *</span>
                </label>
                <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 600 }}>
                  Instant WhatsApp
                </span>
              </div>
              <input 
                type="tel" 
                required 
                value={settings.whatsappPhone} 
                onChange={e => updateQuickContactField('whatsappPhone', e.target.value)} 
                className="form-input" 
                placeholder="9940668095"
                style={{ fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.76rem', color: '#64748b' }}>
                <span>Patron styling & bridal concierge</span>
                <a href={`https://wa.me/91${settings.whatsappPhone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>Test wa.me</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Instagram Handle */}
            <div style={{
              padding: '1.15rem',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Instagram size={15} color="#E1306C" />
                  <span>Instagram Handle</span>
                </label>
                <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#fdf2f8', color: '#be185d', fontWeight: 600 }}>
                  Official Social
                </span>
              </div>
              <input 
                type="text" 
                value={settings.instagramHandle} 
                onChange={e => updateQuickContactField('instagramHandle', e.target.value)} 
                className="form-input" 
                placeholder="@Themuety"
                style={{ fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.76rem', color: '#64748b' }}>
                <span>Brand lookbooks & atelier updates</span>
                <a href={`https://instagram.com/${settings.instagramHandle?.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>Test Instagram</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>

          {/* Channel Roster & Storefront Footer Visibility Control Panel */}
          <div style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid var(--brand-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brand-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="var(--brand-accent)" />
                    <span>Storefront Footer Channels</span>
                  </h4>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    color: '#92400e',
                    fontWeight: 700,
                    border: '1px solid rgba(212, 175, 55, 0.3)'
                  }}>
                    {(settings.contactChannels || []).filter(c => c.enabled !== false && c.showInFooter).length} Active in Footer
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '4px 0 0' }}>
                  Manage the interactive contact icons shown in the website footer. Use the arrow buttons to reorder, and toggle <strong>"Shown in Footer"</strong> to display or hide icons.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddChannelModal}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, borderColor: '#d4af37', color: 'var(--brand-primary)' }}
              >
                <Plus size={14} color="#d4af37" />
                <span>Add Channel</span>
              </button>
            </div>

            {/* Channels List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(settings.contactChannels || []).map((ch, idx, arr) => {
                const targetUrl = ch.link || computeChannelLink(ch.type, ch.value);
                const isFooterVisible = ch.showInFooter && ch.enabled !== false;

                return (
                  <div
                    key={ch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      padding: '0.95rem 1.25rem',
                      backgroundColor: ch.enabled === false ? '#f8fafc' : isFooterVisible ? '#ffffff' : '#fcfcfc',
                      border: `1.5px solid ${isFooterVisible ? 'rgba(212, 175, 55, 0.45)' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      transition: 'all 0.2s ease',
                      boxShadow: isFooterVisible ? '0 3px 12px rgba(212, 175, 55, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Left: Reorder Buttons, Icon, Name & Value */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '260px', flex: 1 }}>
                      {/* Reorder Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveChannel(ch.id, 'up')}
                          title="Move channel up"
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: '2px',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            color: idx === 0 ? '#cbd5e1' : '#64748b',
                            lineHeight: 1
                          }}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === arr.length - 1}
                          onClick={() => handleMoveChannel(ch.id, 'down')}
                          title="Move channel down"
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: '2px',
                            cursor: idx === arr.length - 1 ? 'not-allowed' : 'pointer',
                            color: idx === arr.length - 1 ? '#cbd5e1' : '#64748b',
                            lineHeight: 1
                          }}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>

                      {/* Icon */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: isFooterVisible ? 'rgba(212, 175, 55, 0.12)' : 'rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {renderChannelIcon(ch.type, 20)}
                      </div>

                      {/* Details */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: ch.enabled === false ? '#94a3b8' : 'var(--brand-primary)' }}>
                            {ch.name}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontWeight: 700
                          }}>
                            {ch.type}
                          </span>
                          {ch.isPrimary && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              fontWeight: 700
                            }}>
                              Primary
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          <span style={{ fontWeight: 500 }}>{ch.value}</span>
                          {targetUrl && (
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Preview link: ${targetUrl}`}
                              style={{ color: 'var(--brand-accent)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.78rem' }}
                            >
                              <ExternalLink size={12} />
                              <span style={{ textDecoration: 'underline' }}>Test Link</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Footer Toggle, Status Toggle, Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Show In Footer Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleFooter(ch.id)}
                        title={ch.showInFooter ? 'Click to hide this channel from the website footer' : 'Click to show this channel in the website footer'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 13px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: ch.showInFooter ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                          backgroundColor: ch.showInFooter ? 'rgba(22, 163, 74, 0.1)' : '#f8fafc',
                          color: ch.showInFooter ? '#15803d' : '#64748b'
                        }}
                      >
                        {ch.showInFooter ? <Eye size={14} color="#15803d" /> : <EyeOff size={14} color="#94a3b8" />}
                        <span>{ch.showInFooter ? 'Shown in Footer' : 'Hidden from Footer'}</span>
                      </button>

                      {/* Enabled / Active Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(ch.id)}
                        title={ch.enabled !== false ? 'Active channel (click to pause)' : 'Paused channel (click to activate)'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 11px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: ch.enabled !== false ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                          backgroundColor: ch.enabled !== false ? '#f0fdf4' : '#fffbeb',
                          color: ch.enabled !== false ? '#15803d' : '#b45309'
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ch.enabled !== false ? '#16a34a' : '#f59e0b' }} />
                        <span>{ch.enabled !== false ? 'Active' : 'Paused'}</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditChannelModal(ch)}
                        title="Edit channel details"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: 'var(--brand-primary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete Button (Allowed for non-primary channels or custom channels) */}
                      {!ch.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(ch.id)}
                          title="Remove custom channel"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff5f5',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff5f5')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Registered Address */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: '0 0 1.25rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} color="var(--brand-accent)" /> Registered Atelier Office Address
          </h3>

          <div className="grid-2" style={{ gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Building / Flat / Door No. *</label>
              <input 
                type="text" 
                required 
                value={settings.registeredAddress.buildingNo} 
                onChange={e => setSettings({ ...settings, registeredAddress: { ...settings.registeredAddress, buildingNo: e.target.value } })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Road / Street / Village *</label>
              <input 
                type="text" 
                required 
                value={settings.registeredAddress.street} 
                onChange={e => setSettings({ ...settings, registeredAddress: { ...settings.registeredAddress, street: e.target.value } })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">City *</label>
              <input 
                type="text" 
                required 
                value={settings.registeredAddress.city} 
                onChange={e => setSettings({ ...settings, registeredAddress: { ...settings.registeredAddress, city: e.target.value } })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">State & Postal Code *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  required 
                  value={settings.registeredAddress.state} 
                  onChange={e => setSettings({ ...settings, registeredAddress: { ...settings.registeredAddress, state: e.target.value } })} 
                  className="form-input" 
                  style={{ flex: 1 }}
                />
                <input 
                  type="text" 
                  required 
                  value={settings.registeredAddress.postalCode} 
                  onChange={e => setSettings({ ...settings, registeredAddress: { ...settings.registeredAddress, postalCode: e.target.value } })} 
                  className="form-input" 
                  style={{ width: '120px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Shipping & Policy Declarations */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: '0 0 1.25rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={22} color="var(--brand-accent)" /> Shipping & Customer Policy Declarations
          </h3>

          <div className="grid-3" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Shipping Coverage Region</label>
              <input type="text" value={settings.shippingCountry} onChange={e => setSettings({ ...settings, shippingCountry: e.target.value })} className="form-input" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Standard Shipping Fee (₹) *</label>
              <input type="number" required min={0} value={settings.standardShippingFee} onChange={e => setSettings({ ...settings, standardShippingFee: Number(e.target.value) })} className="form-input" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Free Shipping Threshold (₹) *</label>
              <input type="number" required min={0} value={settings.freeShippingThreshold} onChange={e => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })} className="form-input" />
            </div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: '#fffdf5', border: '1px solid #fde68a', borderRadius: 'var(--radius-lg)' }}>
            <h4 style={{ margin: '0 0 8px', color: '#92400e', fontSize: '0.95rem' }}>Official Customer Policy Position (Effective 18 Oct 2026)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: '#b45309' }}>
              <div>Review Window: <strong>3 Days (Damaged/Defective)</strong></div>
              <div>Change of Mind: <strong>Not Accepted</strong></div>
              <div>Cancellation: <strong>Before Dispatch / Processing</strong></div>
              <div>Evidence: <strong>Unboxing Video Required</strong></div>
              <div>COD Advance: <strong>₹89 Online Confirmation Fee</strong></div>
              <div>Statutory Rights: <strong>Fully Preserved per Law</strong></div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '10px', margin: 0 }}>
              Published policies are live at <code>/shipping-policy</code>, <code>/return-refund-policy</code>, <code>/privacy-policy</code>, and <code>/terms-conditions</code>.
            </p>
          </div>
        </div>

        {/* Section 5: Storefront Visuals & Hero Banners */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={22} color="var(--brand-accent)" /> Storefront Hero Banners & Campaign Visuals
            </h3>

            <Link
              to="/admin/banners"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <span>Setup Banner Images</span>
              <span>→</span>
            </Link>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
            Configure high-resolution campaign banner photography featured at the top of the store homepage. You can upload images, customize titles, set destination links, and adjust auto-scroll display sequence.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#faf8f5', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.86rem', color: 'var(--brand-primary)' }}>
              <strong>Optimal Specification:</strong> 1920 × 750px (Desktop / 2.5:1 ratio) • JPG / PNG / WebP under 15MB
            </div>
            <Link to="/admin/banners" style={{ fontSize: '0.86rem', color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'underline' }}>
              Open Banner Manager
            </Link>
          </div>
        </div>

      </form>

      {/* Add / Edit Contact Channel Modal using standard AdminModal */}
      <AdminModal
        isOpen={showChannelModal}
        onClose={() => {
          setShowChannelModal(false);
          setEditingChannel(null);
        }}
        title={editingChannel ? 'Edit Support & Contact Channel' : 'Add Support & Contact Channel'}
        subtitle="Configure communication identifiers, direct action protocols, and storefront footer visibility."
        headerIcon={renderChannelIcon(channelForm.type, 20)}
        maxWidth="620px"
      >
        <form onSubmit={handleSaveChannelModal} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
            {/* Channel Name / Label */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                Channel Name / Label *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VIP Concierge Line, Chennai Atelier Studio, YouTube Channel"
                value={channelForm.name}
                onChange={e => setChannelForm({ ...channelForm, name: e.target.value })}
                className="form-input"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div className="grid-2" style={{ gap: '1rem' }}>
              {/* Channel Type */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                  Channel Type *
                </label>
                <select
                  value={channelForm.type}
                  onChange={e => setChannelForm({ ...channelForm, type: e.target.value as ContactChannelType })}
                  className="form-input"
                  style={{ cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value="phone">📞 Phone Line</option>
                  <option value="whatsapp">💬 WhatsApp Concierge</option>
                  <option value="email">✉️ Email Address</option>
                  <option value="instagram">📸 Instagram Profile</option>
                  <option value="facebook">📘 Facebook Page</option>
                  <option value="youtube">🔴 YouTube Channel</option>
                  <option value="twitter">🐦 Twitter / X</option>
                  <option value="telegram">✈️ Telegram</option>
                  <option value="linkedin">💼 LinkedIn Company</option>
                  <option value="location">📍 Studio / Map Location</option>
                  <option value="custom">🌐 Custom Website / Link</option>
                </select>
              </div>

              {/* Contact Value */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                  Contact Value / Destination *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    channelForm.type === 'phone' ? 'e.g. 9385791540' :
                    channelForm.type === 'whatsapp' ? 'e.g. 9940668095' :
                    channelForm.type === 'email' ? 'e.g. support@muety.in' :
                    channelForm.type === 'instagram' ? 'e.g. @Themuety' :
                    channelForm.type === 'location' ? 'e.g. 2/32B Ramireddypatti, Salem' :
                    'e.g. Handle, number or URL'
                  }
                  value={channelForm.value}
                  onChange={e => setChannelForm({ ...channelForm, value: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            {/* Direct URL / Action Link */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Direct URL / Action Protocol (Optional Override)
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                  Auto-generated if left blank
                </span>
              </div>
              <input
                type="text"
                placeholder={computeChannelLink(channelForm.type, channelForm.value) || 'Auto-generated link'}
                value={channelForm.link}
                onChange={e => setChannelForm({ ...channelForm, link: e.target.value })}
                className="form-input"
                style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                <Sparkles size={12} color="#d4af37" />
                <span>Computed target:</span>
                <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' }}>
                  {computeChannelLink(channelForm.type, channelForm.value) || 'Provide value above to preview'}
                </span>
              </div>
            </div>

            {/* Toggle Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Show In Footer Toggle */}
              <div
                onClick={() => setChannelForm(prev => ({ ...prev, showInFooter: !prev.showInFooter }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1.5px solid ${channelForm.showInFooter ? '#16a34a' : '#e2e8f0'}`,
                  backgroundColor: channelForm.showInFooter ? 'rgba(22, 163, 74, 0.04)' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: channelForm.showInFooter ? 'rgba(22, 163, 74, 0.12)' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: channelForm.showInFooter ? '#15803d' : '#94a3b8'
                  }}>
                    {channelForm.showInFooter ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Show in Storefront Footer
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Render a dedicated luxury icon button for this channel in the website footer.
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: channelForm.showInFooter ? '#16a34a' : '#cbd5e1',
                  position: 'relative',
                  transition: 'background-color 0.2s ease',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: channelForm.showInFooter ? '23px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* Channel Active / Enabled Toggle */}
              <div
                onClick={() => setChannelForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1.5px solid ${channelForm.enabled ? '#0284c7' : '#e2e8f0'}`,
                  backgroundColor: channelForm.enabled ? 'rgba(2, 132, 199, 0.04)' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: channelForm.enabled ? 'rgba(2, 132, 199, 0.12)' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: channelForm.enabled ? '#0369a1' : '#94a3b8'
                  }}>
                    {channelForm.enabled ? <CheckCircle2 size={18} /> : <X size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Channel Active / Operational
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Enable communication through this channel across all store touchpoints.
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: channelForm.enabled ? '#0284c7' : '#cbd5e1',
                  position: 'relative',
                  transition: 'background-color 0.2s ease',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: channelForm.enabled ? '23px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={() => { setShowChannelModal(false); setEditingChannel(null); }}
              className="btn btn-outline"
              style={{ fontWeight: 600, color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Save size={16} />
              <span>{editingChannel ? 'Save Channel Changes' : 'Add Channel'}</span>
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};
