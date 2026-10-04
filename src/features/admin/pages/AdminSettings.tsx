import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { isLiveFirebase, db } from '@/lib/firebase/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { StoreSettings } from '@/shared/types';
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
  FileText
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  useDocumentTitle('Store Settings & ERP Config');
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const s = storageService.getSettings();
    return {
      storeName: s.storeName || 'MUETY',
      legalBusinessName: (s as any).legalBusinessName || 'muety',
      gstin: (s as any).gstin || '33HFCPR2838F2ZD',
      tagline: s.tagline || 'Sarees for Your Story',
      contactEmail: (s as any).contactEmail || 'support@muety.in',
      ordersEmail: (s as any).ordersEmail || 'orders@muety.in',
      contactPhone: (s as any).contactPhone || '9385791540',
      whatsappPhone: (s as any).whatsappPhone || '9940668095',
      instagramHandle: (s as any).instagramHandle || '@Themuety',
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
      freeShippingThreshold: s.freeShippingThreshold || 2000,
      standardShippingFee: s.standardShippingFee || 100,
      expressShippingFee: s.expressShippingFee || 250,
      shippingCountry: (s as any).shippingCountry || 'India',
      policy: (s as any).policy || {
        returnsAccepted: false,
        refundsOffered: false,
        cancellationsOffered: false,
        disclaimerText: 'Orders are non-returnable, non-refundable, and non-cancellable, subject to mandatory consumer protection laws.'
      },
      announcementBanner: s.announcementBanner || {
        enabled: true,
        text: 'Complimentary Pan-India Express Delivery on orders over ₹2,000'
      }
    };
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (db && isLiveFirebase) {
      getDoc(doc(db, 'storeSettings', 'config')).then(snap => {
        if (snap.exists()) {
          const cloud = snap.data() as StoreSettings;
          setSettings(prev => ({ ...prev, ...cloud }));
        }
      }).catch(() => {});
    }
  }, []);

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
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: '0 0 1.25rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={22} color="var(--brand-accent)" /> Official Support & Contact Channels
          </h3>

          <div className="grid-2" style={{ gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Customer Support Email *</label>
              <input 
                type="email" 
                required 
                value={settings.contactEmail} 
                onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Orders Dispatch Email *</label>
              <input 
                type="email" 
                required 
                value={settings.ordersEmail} 
                onChange={e => setSettings({ ...settings, ordersEmail: e.target.value })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Direct Phone Line *</label>
              <input 
                type="tel" 
                required 
                value={settings.contactPhone} 
                onChange={e => setSettings({ ...settings, contactPhone: e.target.value })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">WhatsApp Concierge Phone *</label>
              <input 
                type="tel" 
                required 
                value={settings.whatsappPhone} 
                onChange={e => setSettings({ ...settings, whatsappPhone: e.target.value })} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Instagram Handle</label>
              <input 
                type="text" 
                value={settings.instagramHandle} 
                onChange={e => setSettings({ ...settings, instagramHandle: e.target.value })} 
                className="form-input" 
              />
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
            <h4 style={{ margin: '0 0 8px', color: '#92400e', fontSize: '0.95rem' }}>Official Customer Policy Position</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.88rem', color: '#b45309' }}>
              <div>Returns: <strong>Not Accepted</strong></div>
              <div>Refunds: <strong>Not Offered</strong></div>
              <div>Cancellations: <strong>Not Offered</strong></div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '8px', margin: 0 }}>
              Client policy position is declared upfront across product pages, cart drawers, policy documents, and receipts.
            </p>
          </div>
        </div>

      </form>
    </div>
  );
};
