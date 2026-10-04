import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { customerService } from '@/features/customers/services/customerService';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { UserProfile, CustomerStatus, Order } from '@/types';
import { getUserRoles } from '@/shared/utils/permissions';
import { 
  Search, 
  UserX, 
  UserCheck, 
  Cloud, 
  Plus, 
  X,
  Users,
  Award,
  DollarSign,
  ShoppingBag,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  MessageSquare
} from 'lucide-react';

export const AdminCustomers: React.FC = () => {
  useDocumentTitle('Customer CRM');
  const { user: currentUser } = useAuth();
  const { success, warning, error } = useNotification();

  const [users, setUsers] = useState<UserProfile[]>(() => customerService.getAllCustomers());
  const [orders, setOrders] = useState<Order[]>(() => storageService.getOrders());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);

  // CRM Detail Notes State
  const [internalNotes, setInternalNotes] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((liveUsers) => {
      setUsers(liveUsers);
      setOrders(storageService.getOrders());
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Calculate CRM Metrics
  const totalCustomers = users.length;
  const activeCustomers = users.filter(u => !u.isBlocked).length;
  const vipCustomers = users.filter(u => u.customerStatus === 'VIP' || (u.totalSpent || 0) >= 50000).length;
  const repeatCustomers = users.filter(u => (u.ordersCount || 0) > 1).length;
  const totalLTV = users.reduce((sum, u) => sum + (u.totalSpent || 0), 0);
  const blockedCustomers = users.filter(u => u.isBlocked).length;

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase().trim();
    const matchesQuery = (u.displayName || '').toLowerCase().includes(q) || 
                         (u.email || '').toLowerCase().includes(q) ||
                         (u.phoneNumber || '').toLowerCase().includes(q);

    const isVip = u.customerStatus === 'VIP' || (u.totalSpent || 0) >= 50000;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'VIP' && isVip) ||
      (statusFilter === 'blocked' && u.isBlocked) ||
      (statusFilter === 'active' && !u.isBlocked);

    return matchesQuery && matchesStatus;
  });

  const openCustomerDetail = (u: UserProfile) => {
    setSelectedCustomer(u);
    setInternalNotes('');
  };

  const handleUpdateStatus = async (uid: string, newStatus: CustomerStatus) => {
    const updated = await customerService.updateCustomerStatus(uid, newStatus);
    if (updated) {
      if (selectedCustomer && selectedCustomer.uid === uid) {
        setSelectedCustomer(updated);
      }

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'support_manager',
        actorRole: getUserRoles(currentUser)[0] || 'support_manager',
        action: 'CUSTOMER_UPDATED',
        entityType: 'CUSTOMER',
        entityId: uid,
        reason: `Updated customer CRM status to ${newStatus}`
      });

      success(`Updated patron status to ${newStatus.toUpperCase()}`);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName || !newEmail) {
      warning('Please provide patron name and email address.');
      return;
    }

    try {
      const created = await customerService.createCustomer({
        displayName: newDisplayName,
        email: newEmail,
        phoneNumber: newPhone,
        customerStatus: 'active'
      });

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'support_manager',
        actorRole: getUserRoles(currentUser)[0] || 'support_manager',
        action: 'CUSTOMER_CREATED',
        entityType: 'CUSTOMER',
        entityId: created.uid,
        reason: `Enrolled new patron profile for ${newEmail}`
      });

      success(`Patron "${newDisplayName}" registered into CRM!`);
      setNewDisplayName('');
      setNewEmail('');
      setNewPhone('');
      setShowCreateModal(false);
    } catch (err: any) {
      error(err?.message || 'Failed to create patron.');
    }
  };

  return (
    <div className="admin-customers animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Customer CRM & Patron Relationship Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Comprehensive client profiles, order history, VIP statuses, and communication preferences.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontWeight: 700 }}>
          <Plus size={18} /> Enroll New Patron
        </button>
      </div>

      {/* CRM KPI Cards */}
      <div className="grid-4" style={{ gap: '1.5rem' }}>
        
        {/* Total Customers */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase' }}>Total Patrons</span>
            <Users size={18} color="var(--brand-primary)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            {totalCustomers}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 'auto', paddingTop: '6px' }}>{activeCustomers} active accounts</span>
        </div>

        {/* VIP Patrons */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#fffdf5', borderColor: '#fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>VIP Clients</span>
            <Award size={18} color="#d4af37" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', fontFamily: 'var(--font-heading)' }}>
            {vipCustomers}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 'auto', paddingTop: '6px' }}>High value spenders (&gt;₹50k)</span>
        </div>

        {/* Repeat Buyers */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase' }}>Repeat Patrons</span>
            <ShoppingBag size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            {repeatCustomers}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#10b981', marginTop: 'auto', paddingTop: '6px' }}>Multiple order history</span>
        </div>

        {/* Customer LTV */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase' }}>Total Client LTV</span>
            <DollarSign size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            ₹{totalLTV.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 'auto', paddingTop: '6px' }}>Cumulative spend volume</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by patron name, email, or phone..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }} 
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: '220px', margin: 0 }}
        >
          <option value="all">All CRM Categories ({totalCustomers})</option>
          <option value="active">Active Patrons</option>
          <option value="VIP">VIP Clients</option>
          <option value="blocked">Suspended Accounts</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Client Patron</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Contact Email</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>CRM Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Orders Count</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Total Spend (₹)</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Enrolled Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No patron profiles match current filters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isVip = u.customerStatus === 'VIP' || (u.totalSpent || 0) >= 50000;
                  return (
                    <tr key={u.uid} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#090d16',
                            color: '#d4af37',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(212, 175, 55, 0.3)'
                          }}>
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--brand-primary)', display: 'block' }}>{u.displayName}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.phoneNumber || 'Phone Not Registered'}</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {u.isBlocked ? (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                            Blocked
                          </span>
                        ) : isVip ? (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                            ★ VIP Client
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                            Active
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                        {u.ordersCount || 0} order(s)
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--brand-primary)' }}>
                        ₹{(u.totalSpent || 0).toLocaleString('en-IN')}
                      </td>

                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button onClick={() => openCustomerDetail(u)} className="btn btn-primary btn-sm">
                          CRM Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER CRM DETAIL DRAWER / MODAL */}
      {selectedCustomer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: '#090d16',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#d4af37',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {selectedCustomer.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: 'var(--font-heading)' }}>
                    {selectedCustomer.displayName}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#d4af37' }}>
                    Patron UID: {selectedCustomer.uid}
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setSelectedCustomer(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Quick Status Control */}
              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Client Status</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '2px' }}>
                    {(selectedCustomer.customerStatus || (selectedCustomer.isBlocked ? 'blocked' : 'active')).toUpperCase()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleUpdateStatus(selectedCustomer.uid, 'VIP')}
                    className="btn btn-outline-gold btn-sm"
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    ★ Mark VIP Client
                  </button>
                  <button 
                    onClick={() => customerService.toggleCustomerBlock(selectedCustomer.uid).then(() => setSelectedCustomer(null))}
                    className={`btn btn-sm ${selectedCustomer.isBlocked ? 'btn-success' : 'btn-danger'}`}
                  >
                    {selectedCustomer.isBlocked ? 'Re-enable Account' : 'Deactivate Account'}
                  </button>
                </div>
              </div>

              {/* 3 Metric Badges */}
              <div className="grid-3" style={{ gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Lifetime Spend</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '4px' }}>
                    ₹{(selectedCustomer.totalSpent || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Orders Completed</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '4px' }}>
                    {selectedCustomer.ordersCount || 0} orders
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Enrolled Since</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '4px' }}>
                    {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Contact Information & Consents */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '0.75rem' }}>
                  Contact Information & Marketing Preferences
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Primary Email</span>
                    <strong>{selectedCustomer.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Phone / WhatsApp</span>
                    <strong>{selectedCustomer.phoneNumber || 'Not Registered'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>WhatsApp Consent</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>Opted In (Verified)</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Email Marketing</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>Opted In</span>
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '0.75rem' }}>
                  Recent Order History ({orders.filter(o => o.customerEmail === selectedCustomer.email || o.customerId === selectedCustomer.uid).length})
                </h4>

                {orders.filter(o => o.customerEmail === selectedCustomer.email || o.customerId === selectedCustomer.uid).length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>No past order records found for this patron.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {orders.filter(o => o.customerEmail === selectedCustomer.email || o.customerId === selectedCustomer.uid).map(ord => (
                      <div key={ord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <strong>#{ord.orderNumber}</strong> ({new Date(ord.createdAt).toLocaleDateString()})
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                          ₹{ord.total.toLocaleString('en-IN')} ({ord.orderStatus.toUpperCase()})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.75rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="btn btn-outline">
                Close Profile View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW PATRON MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
              Enroll New Client Patron
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Manually register a customer profile into MUETY CRM and Cloud Firestore.
            </p>

            <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Patron Full Name *</label>
                <input type="text" required value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="e.g. Priyadarshini Sundaram" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address *</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="client@example.com" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone / WhatsApp</label>
                <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+91 93857 91540" className="form-input" />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>Enroll Patron</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
