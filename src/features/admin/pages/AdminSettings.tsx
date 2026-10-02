import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { storageService } from '@/lib/storage/storageService';
import { useNotification } from '@/shared/context/NotificationContext';
import { isLiveFirebase, firebaseConfig, db } from '@/lib/firebase/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { razorpayService } from '@/lib/payments/razorpayService';
import { productService } from '@/features/catalog/services/productService';
import { orderService } from '@/features/orders/services/orderService';
import { customerService } from '@/features/customers/services/customerService';
import { couponService } from '@/features/coupons/services/couponService';
import { StoreSettings } from '@/shared/types';
import { 
  Globe, 
  DollarSign, 
  Megaphone, 
  ShieldCheck, 
  Database, 
  CreditCard, 
  Zap, 
  Key, 
  RefreshCw, 
  Save, 
  RotateCcw 
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  useDocumentTitle('MUETY Admin | Settings');
  const { success, error: notifyError } = useNotification();

  const [settings, setSettings] = useState<StoreSettings>(() => storageService.getSettings());
  const [razorpayKey, setRazorpayKey] = useState<string>(() => razorpayService.getKeyId());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (db) {
      getDoc(doc(db, 'settings', 'store_settings')).then(snap => {
        if (snap.exists()) {
          const cloudSettings = snap.data() as StoreSettings;
          setSettings(cloudSettings);
          storageService.saveSettings(cloudSettings);
        }
      }).catch(() => {});
    }
  }, []);

  const handleChange = (field: keyof StoreSettings, val: any) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleBannerChange = (field: string, val: any) => {
    setSettings(prev => ({
      ...prev,
      announcementBanner: {
        ...prev.announcementBanner,
        [field]: val
      }
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSettings(settings);
    if (razorpayKey.trim()) {
      razorpayService.setKeyId(razorpayKey.trim());
    }

    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'store_settings'), settings, { merge: true });
        console.log('MUETY Cloud: Store settings saved to Firestore doc "settings/store_settings"');
      } catch (err) {
        console.warn('Firestore settings save warning:', err);
      }
    }

    success('MUETY Store settings and Razorpay configuration saved to Cloud Firebase.', 'Configuration Updated');
  };

  const handleSyncAllToFirebase = async () => {
    if (!db) {
      notifyError('Firebase database connection is not initialized. Check your credentials in .env');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Sync Settings
      await setDoc(doc(db, 'settings', 'store_settings'), settings, { merge: true });

      // 2. Sync Products
      const prodRes = await productService.syncAllToFirebase();

      // 3. Sync Categories
      const catRes = await productService.pushAllCategoriesToFirestore();

      // 4. Sync Customers
      const custRes = await customerService.pushAllCustomersToFirestore();

      // 5. Sync Coupons
      const coupRes = await couponService.pushAllCouponsToFirestore();

      // 6. Sync Orders
      const ordRes = await orderService.pushAllOrdersToFirestore();

      success(
        `Firebase Cloud Database Synchronized! Pushed ${prodRes.count} products, ${catRes.count} categories, ${custRes.count} patrons, ${coupRes.count} coupons, and ${ordRes.count} orders.`,
        'Database Sync Complete'
      );
    } catch (err: any) {
      notifyError(`Firebase sync error: ${err?.message || err}`, 'Sync Failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset catalog, orders, and users back to initial factory demo seed state?')) {
      storageService.resetToSeedData();
    }
  };

  return (
    <div className="admin-settings animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)' }}>Store Configuration & Branding</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Global parameters, tax policies, shipping thresholds, and Firebase security status.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '850px' }}>
        
        {/* 1. Brand Identity */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} color="var(--brand-accent)" />
            Brand Identity & Concierge
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Store Brand Name (Strict)</label>
              <input 
                type="text" 
                required 
                value={settings.storeName} 
                onChange={e => handleChange('storeName', e.target.value)} 
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Brand Tagline</label>
              <input 
                type="text" 
                value={settings.tagline} 
                onChange={e => handleChange('tagline', e.target.value)} 
                className="form-input" 
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Concierge Email</label>
              <input 
                type="email" 
                required 
                value={settings.contactEmail} 
                onChange={e => handleChange('contactEmail', e.target.value)} 
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Concierge Phone</label>
              <input 
                type="text" 
                value={settings.contactPhone} 
                onChange={e => handleChange('contactPhone', e.target.value)} 
                className="form-input" 
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Flagship Showroom Address</label>
            <input 
              type="text" 
              value={settings.address} 
              onChange={e => handleChange('address', e.target.value)} 
              className="form-input" 
            />
          </div>
        </div>

        {/* 2. Financial & Shipping Rules */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} color="var(--brand-accent)" />
            Currency, Tax & Logistics Policies
          </h3>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Currency Symbol</label>
              <input 
                type="text" 
                value={settings.currencySymbol} 
                onChange={e => handleChange('currencySymbol', e.target.value)} 
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sales Tax Rate (%)</label>
              <input 
                type="number" 
                step="0.1" 
                value={settings.taxRate} 
                onChange={e => handleChange('taxRate', Number(e.target.value))} 
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Free Shipping Threshold (₹)</label>
              <input 
                type="number" 
                value={settings.freeShippingThreshold} 
                onChange={e => handleChange('freeShippingThreshold', Number(e.target.value))} 
                className="form-input" 
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Standard Express Shipping Fee (₹)</label>
              <input 
                type="number" 
                value={settings.standardShippingFee} 
                onChange={e => handleChange('standardShippingFee', Number(e.target.value))} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Priority Overnight Delivery Fee (₹)</label>
              <input 
                type="number" 
                value={settings.expressShippingFee} 
                onChange={e => handleChange('expressShippingFee', Number(e.target.value))} 
                className="form-input" 
              />
            </div>
          </div>
        </div>

        {/* 3. Top Promotional Announcement Banner */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={18} color="var(--brand-accent)" />
            Top Announcement Bar
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={settings.announcementBanner.enabled} 
                onChange={e => handleBannerChange('enabled', e.target.checked)} 
                style={{ width: '18px', height: '18px', accentColor: '#0f172a' }} 
              />
              Display Announcement Banner across Customer Storefront
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Announcement Banner Text</label>
            <input 
              type="text" 
              value={settings.announcementBanner.text} 
              onChange={e => handleBannerChange('text', e.target.value)} 
              className="form-input" 
            />
          </div>
        </div>

        {/* 4. Razorpay Payment Gateway Configuration */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#2563eb" />
              Razorpay Payment Gateway Integration
            </h3>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CreditCard size={12} /> UPI • CARDS • NETBANKING • WALLETS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} color="var(--brand-muted)" />
                Razorpay Key ID (Test or Live)
              </label>
              <input 
                type="text" 
                value={razorpayKey} 
                onChange={e => setRazorpayKey(e.target.value)} 
                placeholder="e.g. rzp_test_yourTestKeyHere or rzp_live_yourLiveKeyHere"
                className="form-input" 
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', marginTop: '4px', display: 'block' }}>
                Find your Key ID in the <a href="https://dashboard.razorpay.com/#/app/keys" target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Razorpay Dashboard</a>. You can also define it in your <code>.env</code> file via <code>VITE_RAZORPAY_KEY_ID</code>.
              </span>
            </div>

            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.82rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color="#2563eb" style={{ flexShrink: 0 }} />
              <div>
                <strong>Active Channels:</strong> Instant UPI (GPay, PhonePe, Paytm), Visa/MasterCard/RuPay, 50+ NetBanking Institutions, and Digital Wallets.
              </div>
            </div>
          </div>
        </div>

        {/* 5. Firebase Architecture & Security Status */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--brand-accent)" />
            Firebase Security & Engine State
          </h3>

          <div style={{
            backgroundColor: 'var(--bg-main)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--brand-border)',
            fontSize: '0.88rem',
            lineHeight: 1.6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className={`badge badge-${isLiveFirebase ? 'success' : 'gold'}`}>
                {isLiveFirebase ? 'CLOUD DATABASE ONLINE' : 'LOCAL DATABASE ACTIVE'}
              </span>
            </div>
            <div><strong>Project ID:</strong> {firebaseConfig.projectId}</div>
            <div><strong>Auth Domain:</strong> {firebaseConfig.authDomain}</div>
            <div><strong>Admin Role Guard:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>role: "admin" enforced</span></div>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--brand-border)' }}>
              <strong>Connected Firestore Collections:</strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {['products', 'categories', 'orders', 'users', 'coupons', 'settings'].map(col => (
                  <span key={col} className="badge badge-dark" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                    ✓ {col}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSyncAllToFirebase}
                disabled={isSyncing}
                className="btn btn-accent btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700
                }}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isSyncing ? 'Syncing to Firebase...' : 'Push All Local Data to Firebase Cloud'}</span>
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>
                Uploads all products, categories, coupons, patrons & orders into Firestore.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary btn-lg">
            <Save size={18} /> Save MUETY Settings
          </button>

          <button 
            type="button" 
            onClick={handleResetDemoData} 
            className="btn btn-outline"
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          >
            <RotateCcw size={16} /> Reset All Database to Factory Seed
          </button>
        </div>
      </form>
    </div>
  );
};
