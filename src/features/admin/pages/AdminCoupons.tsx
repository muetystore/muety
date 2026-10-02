import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { couponService } from '@/features/coupons/services/couponService';
import { useNotification } from '@/shared/context/NotificationContext';
import { Coupon } from '@/types';
import { Plus, Tag, Trash2, Edit3, X, Cloud, Loader2 } from 'lucide-react';

export const AdminCoupons: React.FC = () => {
  useDocumentTitle('MUETY Admin | Coupons');
  const { success, warning, error } = useNotification();

  const [coupons, setCoupons] = useState<Coupon[]>(() => couponService.getAllCoupons());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minSpend, setMinSpend] = useState<number>(100);
  const [expiresAt, setExpiresAt] = useState('2027-12-31');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const unsubscribe = couponService.subscribeToCoupons((liveCoupons) => {
      setCoupons(liveCoupons);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCode(`MUETY${Math.floor(10 + Math.random() * 90)}`);
    setDiscountType('percentage');
    setDiscountValue(20);
    setMinSpend(150);
    setExpiresAt('2027-12-31');
    setDescription('Exclusive promotional discount code.');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinSpend(c.minSpend);
    setExpiresAt(c.expiresAt);
    setDescription(c.description || '');
    setIsActive(c.isActive);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, codeName: string) => {
    if (window.confirm(`Delete promo code "${codeName}"?`)) {
      await couponService.deleteCoupon(id);
      success(`Promo code "${codeName}" deleted from Firestore.`, 'Coupon Removed');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const updated = { ...coupon, isActive: !coupon.isActive };
    await couponService.updateCoupon(updated);
    success(`Coupon ${coupon.code} is now ${updated.isActive ? 'Active' : 'Inactive'}. Synced to Firebase.`);
  };

  const handlePushAllToFirestore = async () => {
    setIsPushing(true);
    try {
      const result = await couponService.pushAllCouponsToFirestore();
      if (result.success) {
        success(result.message, 'Firestore Synchronized');
      } else {
        error(result.message, 'Sync Failed');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to push coupons to Cloud Firestore.');
    } finally {
      setIsPushing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) {
      warning('Please provide code and discount value.');
      return;
    }

    if (editingCoupon) {
      const updated: Coupon = {
        ...editingCoupon,
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        minSpend: Number(minSpend),
        expiresAt,
        description,
        isActive
      };
      await couponService.updateCoupon(updated);
      success(`Coupon "${code}" updated in Firebase.`, 'Coupon Saved');
    } else {
      await couponService.addCoupon({
        id: `coup-${Date.now()}`,
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        minSpend: Number(minSpend),
        expiresAt,
        description,
        isActive,
        usageCount: 0
      });
      success(`Promo code "${code}" created and live on Firebase.`, 'Coupon Created');
    }

    setModalOpen(false);
  };

  return (
    <div className="admin-coupons animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>Promotions & Coupons</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              FIRESTORE "coupons" SYNC ACTIVE
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Configure percentage discounts, threshold incentives, and seasonal campaign promo codes synced to Firebase.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handlePushAllToFirestore} 
            disabled={isPushing}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'var(--brand-accent)', color: 'var(--brand-primary)' }}
            title="Push all coupon codes directly to Firebase Firestore collection 'coupons'"
          >
            {isPushing ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} color="var(--brand-accent)" />}
            {isPushing ? 'Syncing to Cloud...' : `Push Coupons to Cloud (${coupons.length})`}
          </button>

          <button onClick={openCreateModal} className="btn btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Create Promo Code
          </button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--brand-muted)' }}>
              <th style={{ padding: '10px 12px' }}>Code</th>
              <th style={{ padding: '10px 12px' }}>Discount</th>
              <th style={{ padding: '10px 12px' }}>Min Spend</th>
              <th style={{ padding: '10px 12px' }}>Usage Count</th>
              <th style={{ padding: '10px 12px' }}>Expiry Date</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                <td style={{ padding: '14px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} color="var(--brand-accent)" />
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem', color: 'var(--brand-primary)' }}>
                      {c.code}
                    </span>
                  </div>
                  {c.description && <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', marginTop: '2px' }}>{c.description}</div>}
                </td>
                <td style={{ padding: '14px 12px', fontWeight: 700, color: '#10b981' }}>
                  {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                  ₹{c.minSpend}
                </td>
                <td style={{ padding: '14px 12px', fontWeight: 600 }}>
                  {c.usageCount} times
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                  {c.expiresAt}
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <button
                    onClick={() => handleToggleActive(c)}
                    className={`badge badge-${c.isActive ? 'success' : 'danger'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button onClick={() => openEditModal(c)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(c.id, c.code)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '560px',
              width: '100%',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-xl)',
              position: 'relative'
            }}
          >
            <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--brand-muted)' }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
              {editingCoupon ? 'Edit Promo Code' : 'Create New Promo Code'}
            </h2>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Promo Code *</label>
                <input 
                  type="text" 
                  required 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  placeholder="e.g. VIP25" 
                  className="form-input" 
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                />
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Discount Type</label>
                  <select 
                    value={discountType} 
                    onChange={e => setDiscountType(e.target.value as any)} 
                    className="form-select"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Rupee Amount (₹)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Discount Value *</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    value={discountValue} 
                    onChange={e => setDiscountValue(Number(e.target.value))} 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Minimum Order Spend (₹)</label>
                  <input 
                    type="number" 
                    min={0} 
                    value={minSpend} 
                    onChange={e => setMinSpend(Number(e.target.value))} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expiration Date</label>
                  <input 
                    type="date" 
                    value={expiresAt} 
                    onChange={e => setExpiresAt(e.target.value)} 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Internal Description / Notes</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="e.g. 15% VIP holiday discount" 
                  className="form-input" 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Promo Code</button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
