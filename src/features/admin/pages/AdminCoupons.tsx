import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { couponService } from '@/features/coupons/services/couponService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Coupon } from '@/types';
import { getUserRoles } from '@/shared/utils/permissions';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { Plus, Tag, Trash2, Edit3, X } from 'lucide-react';

export const AdminCoupons: React.FC = () => {
  useDocumentTitle('MUETY Admin | Coupons');
  const { user } = useAuth();
  const { success, warning, error } = useNotification();

  const [coupons, setCoupons] = useState<Coupon[]>(() => couponService.getAllCoupons());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

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
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'COUPON_DELETED',
        entityType: 'SETTINGS',
        entityId: id,
        reason: `Deleted promo code ${codeName}`
      });
      success(`Promo code "${codeName}" deleted from Firestore.`, 'Coupon Removed');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const updated = { ...coupon, isActive: !coupon.isActive };
    await couponService.updateCoupon(updated);
    await auditService.logAction({
      actorUid: user?.uid || 'system',
      actorEmail: user?.email || 'admin',
      actorRole: getUserRoles(user)[0] || 'admin',
      action: 'COUPON_DISABLED',
      entityType: 'SETTINGS',
      entityId: coupon.id,
      reason: `Toggled promo code ${coupon.code} active state to ${updated.isActive}`
    });
    success(`Coupon ${coupon.code} is now ${updated.isActive ? 'Active' : 'Inactive'}. Synced to Firebase.`);
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
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'COUPON_UPDATED',
        entityType: 'SETTINGS',
        entityId: editingCoupon.id,
        before: editingCoupon,
        after: updated,
        reason: `Updated promo code ${code}`
      });
      success(`Coupon "${code}" updated in Firebase.`, 'Coupon Saved');
    } else {
      const couponId = `coup-${Date.now()}`;
      const newCoupon: Coupon = {
        id: couponId,
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        minSpend: Number(minSpend),
        expiresAt,
        description,
        isActive,
        usageCount: 0
      };
      await couponService.addCoupon(newCoupon);
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'COUPON_CREATED',
        entityType: 'SETTINGS',
        entityId: couponId,
        after: newCoupon,
        reason: `Created promo code ${code}`
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
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Configure percentage discounts, threshold incentives, and seasonal campaign promo codes directly on Firebase.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
          >
            <Plus size={18} />
            <span>Create Promo Code</span>
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
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCoupon ? 'Edit Promo Code' : 'Create New Promo Code'}
        subtitle="Configure discount rules, spend tiers, and expiration"
        headerIcon={<Tag size={20} />}
        maxWidth="580px"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Promo Code *</label>
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

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Discount Type</label>
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
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Discount Value *</label>
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

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Minimum Order Spend (₹)</label>
                <input 
                  type="number" 
                  min={0} 
                  value={minSpend} 
                  onChange={e => setMinSpend(Number(e.target.value))} 
                  className="form-input" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Expiration Date</label>
                <input 
                  type="date" 
                  value={expiresAt} 
                  onChange={e => setExpiresAt(e.target.value)} 
                  className="form-input" 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Internal Description / Notes</label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="e.g. 15% VIP holiday discount" 
                className="form-input" 
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button 
              type="button" 
              onClick={() => setModalOpen(false)} 
              className="btn btn-outline"
              style={{ fontWeight: 600, color: '#475569' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ fontWeight: 700 }}
            >
              {editingCoupon ? 'Save Changes' : 'Save Promo Code'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};
