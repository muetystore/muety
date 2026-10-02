import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { customerService } from '@/features/customers/services/customerService';
import { useNotification } from '@/shared/context/NotificationContext';
import { UserProfile, UserRole } from '@/shared/types';
import { 
  Search, 
  UserX, 
  UserCheck, 
  Cloud, 
  Plus, 
  Loader2, 
  X,
  Trash2
} from 'lucide-react';

export const AdminCustomers: React.FC = () => {
  useDocumentTitle('MUETY Admin | Customers');
  const { success, warning, error } = useNotification();
  const [users, setUsers] = useState<UserProfile[]>(() => customerService.getAllCustomers());
  const [search, setSearch] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // New Patron Form State
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('customer');

  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((liveUsers) => {
      setUsers(liveUsers);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phoneNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleUserBlock = async (uid: string) => {
    const isBlocked = await customerService.toggleCustomerBlock(uid);
    success(
      `Patron status updated to ${isBlocked ? 'SUSPENDED' : 'ACTIVE'}. Synced with Firebase.`, 
      'Security Registry'
    );
  };

  const handlePushAllToFirestore = async () => {
    setIsPushing(true);
    try {
      const result = await customerService.pushAllCustomersToFirestore();
      if (result.success) {
        success(result.message, 'Firestore Synchronized');
      } else {
        error(result.message, 'Sync Failed');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to push customers to Cloud Firestore.');
    } finally {
      setIsPushing(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName || !newEmail) {
      warning('Please provide patron name and email address.');
      return;
    }

    try {
      await customerService.createCustomer({
        displayName: newDisplayName,
        email: newEmail,
        phoneNumber: newPhone,
        role: newRole
      });

      success(`Patron "${newDisplayName}" registered and saved to Firebase Firestore.`, 'Patron Enrolled');
      setNewDisplayName('');
      setNewEmail('');
      setNewPhone('');
      setNewRole('customer');
      setShowModal(false);
    } catch (err: any) {
      error(err?.message || 'Failed to create patron.');
    }
  };

  const handleDeleteCustomer = async (uid: string, name: string) => {
    if (window.confirm(`Permanently remove patron profile for "${name}" from Firestore & store records?`)) {
      await customerService.deleteCustomer(uid);
      success(`Patron "${name}" deleted from database.`, 'Record Removed');
    }
  };

  return (
    <div className="admin-customers animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>Customer & Patron Directory</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              FIRESTORE "users" SYNC ACTIVE
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Overview of registered clients, spending volume, and role privileges synced live to Firebase Cloud.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handlePushAllToFirestore} 
            disabled={isPushing}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'var(--brand-accent)', color: 'var(--brand-primary)' }}
            title="Push all customer profiles directly to Firebase Firestore collection 'users'"
          >
            {isPushing ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} color="var(--brand-accent)" />}
            {isPushing ? 'Syncing to Cloud...' : `Push Customers to Cloud (${users.length})`}
          </button>

          <button 
            onClick={() => setShowModal(true)} 
            className="btn btn-accent"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Enroll New Patron
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
          <input 
            type="text" 
            placeholder="Search patrons by name, email, or phone..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }} 
          />
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--brand-muted)', fontWeight: 600 }}>
          Showing {filteredUsers.length} of {users.length} Patrons
        </div>
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--brand-muted)' }}>
              <th style={{ padding: '10px 12px' }}>Client / Patron</th>
              <th style={{ padding: '10px 12px' }}>Role</th>
              <th style={{ padding: '10px 12px' }}>Orders</th>
              <th style={{ padding: '10px 12px' }}>Total Spent</th>
              <th style={{ padding: '10px 12px' }}>Joined Date</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--brand-muted)' }}>
                  No patrons found matching your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.uid} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: u.role === 'admin' ? '#0f172a' : 'var(--brand-primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        flexShrink: 0
                      }}>
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {u.displayName}
                          {u.role === 'admin' && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              MASTER
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>{u.email}</div>
                        {u.phoneNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--brand-secondary)' }}>{u.phoneNumber}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span className={`badge badge-${(u.role || 'customer') === 'admin' ? 'gold' : 'dark'}`} style={{ fontSize: '0.72rem' }}>
                      {(u.role || 'customer').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 600 }}>
                    {u.ordersCount || 0} Orders
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    ₹{(u.totalSpent || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '2026-01-01'}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span className={`badge badge-${u.isBlocked ? 'danger' : 'success'}`}>
                      {u.isBlocked ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    {u.role !== 'admin' && (
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => toggleUserBlock(u.uid)}
                          className={`btn btn-sm ${u.isBlocked ? 'btn-secondary' : 'btn-outline'}`}
                          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                          title={u.isBlocked ? 'Restore Patron Access' : 'Suspend Patron Account'}
                        >
                          {u.isBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
                          {u.isBlocked ? 'Unblock' : 'Suspend'}
                        </button>

                        <button
                          onClick={() => handleDeleteCustomer(u.uid, u.displayName)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '4px 8px' }}
                          title="Delete Patron"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Enroll Patron Modal */}
      {showModal && (
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
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--brand-primary)' }}>
              Enroll New Patron
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Create a client account saved immediately to your Firebase Firestore database.
            </p>

            <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={newDisplayName} 
                  onChange={e => setNewDisplayName(e.target.value)} 
                  placeholder="e.g. Lord Alistair Croft" 
                  className="form-input" 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                  placeholder="e.g. alistair@croft-estate.com" 
                  className="form-input" 
                />
              </div>

              <div className="grid-2" style={{ gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone (Optional)</label>
                  <input 
                    type="text" 
                    value={newPhone} 
                    onChange={e => setNewPhone(e.target.value)} 
                    placeholder="+1 555-0199" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Account Role</label>
                  <select 
                    value={newRole} 
                    onChange={e => setNewRole(e.target.value as UserRole)} 
                    className="form-select"
                  >
                    <option value="customer">Customer / Patron</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" style={{ flex: 1 }}>
                  Save to Firebase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
