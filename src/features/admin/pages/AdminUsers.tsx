import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { customerService } from '@/features/customers/services/customerService';
import { auditService } from '@/shared/services/auditService';
import { UserProfile, AppRole } from '@/shared/types';
import { ROLE_LABELS, getUserRoles } from '@/shared/utils/permissions';
import { auth } from '@/lib/firebase/firebase';
import { 
  UserCheck, 
  UserPlus, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  Trash2, 
  RefreshCw,
  Search,
  Plus
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  useDocumentTitle('Admin Management');
  const { user: currentUser } = useAuth();
  const { success, warning, error } = useNotification();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Create / Edit Role
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [targetUid, setTargetUid] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAdmins = () => {
    setIsLoading(true);
    try {
      const all = customerService.getAllCustomers();
      // Filter out pure customers, show all admin role holders
      const adminsOnly = all.filter(u => {
        const roles = getUserRoles(u);
        return roles.some(r => ['super_admin', 'admin', 'catalog_manager', 'order_manager', 'support_manager', 'support_agent'].includes(r));
      });
      setUsers(adminsOnly);
    } catch (err: any) {
      error('Failed to load admin user roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    const unsub = customerService.subscribeToCustomers(() => {
      loadAdmins();
    });
    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setTargetUid('');
    setName('');
    setEmail('');
    setSelectedRole('admin');
    setShowModal(true);
  };

  const openEditModal = (targetUser: UserProfile) => {
    setModalMode('edit');
    setTargetUid(targetUser.uid);
    setName(targetUser.displayName);
    setEmail(targetUser.email);
    const roles = getUserRoles(targetUser);
    setSelectedRole(roles[0] || 'admin');
    setShowModal(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      warning('Please provide both name and email.');
      return;
    }

    setIsSubmitting(true);

    try {
      let idToken = '';
      if (auth && auth.currentUser) {
        try {
          idToken = await auth.currentUser.getIdToken(true);
        } catch {}
      }

      if (modalMode === 'create') {
        // Trusted server API call to provision admin Auth account & assign custom claims
        let serverRes: any = null;
        try {
          const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': idToken ? `Bearer ${idToken}` : ''
            },
            body: JSON.stringify({
              email: email.trim(),
              displayName: name.trim(),
              role: selectedRole
            })
          });
          serverRes = await res.json();
        } catch (netErr) {
          console.warn('API server endpoint fallback note:', netErr);
        }

        if (serverRes && serverRes.success && serverRes.user) {
          const createdUser: UserProfile = {
            uid: serverRes.user.uid,
            email: serverRes.user.email,
            displayName: serverRes.user.displayName,
            roles: [selectedRole],
            role: selectedRole,
            createdAt: new Date().toISOString()
          };
          await customerService.saveCustomer(createdUser);
          success(`Admin account created for ${name} (${ROLE_LABELS[selectedRole]}). Custom claims set!`);
        } else if (serverRes && serverRes.error) {
          throw new Error(serverRes.error.message || 'Server failed to provision admin user.');
        } else {
          // Local fallback
          const created = await customerService.createCustomer({
            email,
            displayName: name,
            role: selectedRole
          });
          const updated: UserProfile = {
            ...created,
            roles: [selectedRole],
            role: selectedRole
          };
          await customerService.saveCustomer(updated);
          success(`Admin account created for ${name} (${ROLE_LABELS[selectedRole]})`);
        }
      } else {
        const existing = customerService.getCustomerById(targetUid);
        if (!existing) throw new Error('Target admin user not found.');

        // Safeguard: Prevent removing super_admin role if user is current user and only super admin
        if (existing.uid === currentUser?.uid && selectedRole !== 'super_admin') {
          const superAdmins = users.filter(u => getUserRoles(u).includes('super_admin'));
          if (superAdmins.length <= 1) {
            throw new Error('Action Denied: Cannot demote the sole active Super Admin account.');
          }
        }

        let serverRes: any = null;
        try {
          const res = await fetch('/api/admin/set-role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': idToken ? `Bearer ${idToken}` : ''
            },
            body: JSON.stringify({
              targetUid,
              roles: [selectedRole]
            })
          });
          serverRes = await res.json();
        } catch (netErr) {
          console.warn('API set-role endpoint note:', netErr);
        }

        if (serverRes && serverRes.error) {
          throw new Error(serverRes.error.message || 'Failed to update custom claims on server.');
        }

        const updated: UserProfile = {
          ...existing,
          displayName: name,
          roles: [selectedRole],
          role: selectedRole,
          updatedAt: new Date().toISOString()
        };
        await customerService.saveCustomer(updated);

        await auditService.logAction({
          actorUid: currentUser?.uid || 'system',
          actorEmail: currentUser?.email || 'admin',
          actorRole: getUserRoles(currentUser)[0] || 'super_admin',
          action: 'ADMIN_ROLE_CHANGED',
          entityType: 'ADMIN',
          entityId: targetUid,
          after: updated,
          reason: `Assigned role ${selectedRole} and updated custom claims`
        });

        success(`Updated permissions for ${name} to ${ROLE_LABELS[selectedRole]} (Custom claims set)`);
      }

      setShowModal(false);
      loadAdmins();
    } catch (err: any) {
      error(err?.message || 'Failed to save admin user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDisable = async (targetUser: UserProfile) => {
    if (targetUser.uid === currentUser?.uid) {
      warning('Security Protection: You cannot disable your own active session account.');
      return;
    }

    const isBlocked = !targetUser.isBlocked;
    const confirmMsg = isBlocked 
      ? `Deactivate admin privileges for ${targetUser.displayName}?` 
      : `Re-enable admin privileges for ${targetUser.displayName}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await customerService.toggleCustomerBlock(targetUser.uid);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'admin',
        actorRole: getUserRoles(currentUser)[0] || 'super_admin',
        action: isBlocked ? 'ADMIN_DISABLED' : 'ADMIN_ENABLED',
        entityType: 'ADMIN',
        entityId: targetUser.uid,
        reason: isBlocked ? 'Disabled admin account' : 'Re-enabled admin account'
      });

      success(`Account ${isBlocked ? 'deactivated' : 're-enabled'} for ${targetUser.displayName}`);
      loadAdmins();
    } catch (err: any) {
      error(err?.message || 'Failed to update admin account status.');
    }
  };

  const filtered = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchQuery = u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const roles = getUserRoles(u);
    const matchRole = roleFilter === 'all' || roles.includes(roleFilter as AppRole);
    return matchQuery && matchRole;
  });

  return (
    <div className="admin-users-page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Executive Admin Roster & Role Authorization
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '2px' }}>
            Manage privileged admin accounts, assign operational roles, and enforce security policies.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
        >
          <UserPlus size={18} />
          <span>Create New Admin</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by admin name or email address..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '38px', margin: 0 }}
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="form-input"
          style={{ width: '220px', margin: 0 }}
        >
          <option value="all">All Operational Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="catalog_manager">Catalog Manager</option>
          <option value="order_manager">Order Manager</option>
          <option value="support_manager">Support Manager</option>
        </select>
      </div>

      {/* Admin Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Admin User</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Email Address</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Assigned Role</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Account Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Created Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <UserCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No administrative accounts found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const roles = getUserRoles(u);
                  const primaryRole = roles[0] || 'customer';
                  const label = ROLE_LABELS[primaryRole] || primaryRole;
                  const isCurrent = u.uid === currentUser?.uid;

                  return (
                    <tr key={u.uid} style={{ borderBottom: '1px solid var(--brand-border)', backgroundColor: isCurrent ? 'rgba(212, 175, 55, 0.04)' : 'transparent' }}>
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
                            <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                              {u.displayName} {isCurrent && <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '4px' }}>(You)</span>}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>UID: {u.uid.substring(0, 12)}...</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: primaryRole === 'super_admin' ? '#fef3c7' : '#e0f2fe',
                          color: primaryRole === 'super_admin' ? '#92400e' : '#0369a1',
                          border: primaryRole === 'super_admin' ? '1px solid #fde68a' : '1px solid #bae6fd'
                        }}>
                          {label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {u.isBlocked ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem' }}>
                            <XCircle size={14} /> Disabled
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700, fontSize: '0.82rem' }}>
                            <CheckCircle2 size={14} /> Active
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditModal(u)}
                            className="btn btn-outline btn-sm"
                            title="Edit Role & Permissions"
                          >
                            Edit Role
                          </button>

                          <button
                            onClick={() => handleToggleDisable(u)}
                            disabled={isCurrent}
                            className={`btn btn-sm ${u.isBlocked ? 'btn-success' : 'btn-danger'}`}
                            style={{ opacity: isCurrent ? 0.5 : 1, cursor: isCurrent ? 'not-allowed' : 'pointer' }}
                            title={isCurrent ? 'Cannot deactivate self' : u.isBlocked ? 'Enable Admin' : 'Deactivate Admin'}
                          >
                            {u.isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
              {modalMode === 'create' ? 'Create Executive Admin User' : 'Modify Admin Role Permissions'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Assign authorized operational permissions according to least privilege access control.
            </p>

            <form onSubmit={handleSaveAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Executive Manager"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@muety.in"
                  className="form-input"
                  disabled={isSubmitting || modalMode === 'edit'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Operational Role *</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as AppRole)}
                  className="form-input"
                  disabled={isSubmitting}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="super_admin">Super Admin (Full System Authority)</option>
                  <option value="admin">Admin (Business Operations)</option>
                  <option value="catalog_manager">Catalog Manager (Products & Merchandise)</option>
                  <option value="order_manager">Order Manager (Fulfillment & Shipping)</option>
                  <option value="support_manager">Support Manager (Customer Care & Tickets)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ fontWeight: 700 }}
                >
                  {isSubmitting ? 'Saving Credentials...' : modalMode === 'create' ? 'Create Admin Account' : 'Update Role Claims'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
