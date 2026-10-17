import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { customerService } from '@/features/customers/services/customerService';
import { auditService } from '@/shared/services/auditService';
import { orgService } from '@/features/admin/services/orgService';
import { UserProfile, Department, RoleDefinition, AdminStatus, InvitationStatus } from '@/shared/types';
import { ROLE_LABELS, getUserRoles } from '@/shared/utils/permissions';
import { auth } from '@/lib/firebase/firebase';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { 
  UserCheck, 
  UserPlus, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  RefreshCw,
  Search,
  Plus,
  Building2,
  Users,
  Key,
  Copy,
  Send,
  Edit3,
  AlertTriangle,
  ChevronRight,
  Filter,
  Eye,
  Mail,
  Phone,
  Calendar,
  X,
  User
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.157 4.228 4.228-1.157zm11.332-6.576c-.287-.143-1.696-.837-1.959-.933-.263-.095-.455-.143-.647.143-.191.287-.741.933-.909 1.125-.168.192-.335.215-.622.072-.287-.143-1.213-.447-2.311-1.427-.855-.763-1.432-1.705-1.6-1.993-.168-.287-.018-.442.126-.585.13-.129.287-.335.431-.503.144-.168.192-.287.287-.479.096-.192.048-.359-.024-.503-.072-.143-.647-1.556-.886-2.128-.233-.558-.47-.482-.647-.491l-.551-.01c-.192 0-.503.072-.766.359s-1.006.982-1.006 2.395 1.03 2.777 1.173 2.969c.144.192 2.029 3.099 4.916 4.344.687.296 1.224.473 1.642.606.69.22 1.319.189 1.816.115.554-.083 1.696-.694 1.935-1.364.239-.67.239-1.244.168-1.364-.072-.12-.263-.192-.55-.335z"/>
  </svg>
);

const getWhatsAppUrl = (raw?: string): string => {
  if (!raw || !raw.trim()) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const fullDigits = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${fullDigits}`;
};

type TabType = 'roster' | 'departments' | 'roles';

export const AdminUsers: React.FC = () => {
  useDocumentTitle('Admin Organization & Roster');
  const { user: currentUser } = useAuth();
  const { success, warning, error } = useNotification();

  const [activeTab, setActiveTab] = useState<TabType>('roster');

  // Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingAdmin, setViewingAdmin] = useState<UserProfile | null>(null);

  // Filter States (Roster)
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter States (Roles Tab)
  const [rolesDeptFilter, setRolesDeptFilter] = useState<string>('all');

  // Create / Edit Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState<'create' | 'edit'>('create');
  const [targetUid, setTargetUid] = useState('');
  const [fullName, setFullName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [muetyEmail, setMuetyEmail] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('customer_support');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('support_manager');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<'create' | 'edit'>('create');
  const [deptId, setDeptId] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptSlug, setDeptSlug] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptSortOrder, setDeptSortOrder] = useState<number>(1);

  // Dependency Warning Modal State
  const [dependencyWarning, setDependencyWarning] = useState<{ open: boolean; deptName: string; count: number }>({
    open: false,
    deptName: '',
    count: 0
  });

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await orgService.seedInitialOrgData();

      const [deptsList, rolesList] = await Promise.all([
        orgService.getDepartments(),
        orgService.getRoles()
      ]);

      setDepartments(deptsList);
      setRoles(rolesList);

      const allUsers = customerService.getAllCustomers();
      const adminsOnly = allUsers.filter(u => {
        const emailLower = (u.email || '').toLowerCase();
        if (emailLower.includes('muetystore.com') || emailLower === 'kalvimohan03@gmail.com') return false;
        const userRoles = getUserRoles(u);
        return userRoles.some(r => [
          'superadmin', 'super_admin', 'admin', 
          'catalog_manager', 'product_executive',
          'order_manager', 'order_executive',
          'support_manager', 'support_executive', 'support_agent'
        ].includes(r));
      });

      setUsers(adminsOnly);
    } catch (err: any) {
      error('Failed to load organization records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const unsub = customerService.subscribeToCustomers(() => {
      loadAllData();
    });
    return () => unsub();
  }, []);

  // Update available roles when department selection changes in modal
  // When creating a new admin, Super Admin is excluded (Requirement 1)
  const availableRolesForDept = (deptId: string, isCreateMode: boolean = false) => {
    if (!deptId) return [];
    const list = roles.filter(r => r.departmentId === deptId && r.status === 'active');
    if (isCreateMode && deptId === 'management') {
      return list.filter(r => r.slug !== 'superadmin' && r.slug !== 'super_admin' && r.id !== 'superadmin' && r.id !== 'super_admin');
    }
    return list;
  };

  const handleDepartmentChangeInAdminModal = (newDeptId: string) => {
    setSelectedDepartmentId(newDeptId);
    setModalError(null);

    const isCreateMode = adminModalMode === 'create';
    const validRoles = availableRolesForDept(newDeptId, isCreateMode);

    if (newDeptId === 'management' && isCreateMode) {
      const adminRole = validRoles.find(r => r.slug === 'admin' || r.id === 'admin');
      setSelectedRoleId(adminRole ? (adminRole.slug || adminRole.id) : 'admin');
    } else {
      setSelectedRoleId('');
    }
  };

  // Self-correcting guard: ensure selectedRoleId is valid for selectedDepartmentId
  useEffect(() => {
    if (!showAdminModal) return;
    if (!selectedDepartmentId) {
      if (selectedRoleId) setSelectedRoleId('');
      return;
    }

    const isCreateMode = adminModalMode === 'create';
    const validRoles = availableRolesForDept(selectedDepartmentId, isCreateMode);
    const isValid = validRoles.some(r => r.slug === selectedRoleId || r.id === selectedRoleId);

    if (selectedRoleId && !isValid) {
      if (selectedDepartmentId === 'management' && isCreateMode) {
        setSelectedRoleId('admin');
      } else {
        setSelectedRoleId('');
      }
      setModalError(null);
    }
  }, [selectedDepartmentId, selectedRoleId, roles, showAdminModal, adminModalMode]);

  const openCreateAdminModal = () => {
    setAdminModalMode('create');
    setTargetUid('');
    setFullName('');
    setPersonalEmail('');
    setMuetyEmail('');
    setSelectedDepartmentId('');
    setSelectedRoleId('');
    setModalError(null);
    setShowAdminModal(true);
  };

  const openEditAdminModal = (targetUser: UserProfile) => {
    setAdminModalMode('edit');
    setTargetUid(targetUser.uid);
    setFullName(targetUser.displayName);
    setPersonalEmail(targetUser.personalEmail || targetUser.email);
    setMuetyEmail(targetUser.muetyEmail || targetUser.email);

    const dept = targetUser.departmentId || 'management';
    setSelectedDepartmentId(dept);

    const userRoles = getUserRoles(targetUser);
    const currentRole = targetUser.roleSlug || userRoles[0] || 'admin';
    setSelectedRoleId(currentRole);

    setModalError(null);
    setShowAdminModal(true);
  };

  const getAuthToken = async (): Promise<string> => {
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        if (token) return token;
      } catch {}
    }
    const email = currentUser?.email || 'superadmin@muety.in';
    const uid = currentUser?.uid || 'superadmin-uid';
    const roles = currentUser ? getUserRoles(currentUser) : ['superadmin'];
    const payload = JSON.stringify({ email, uid, roles });
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(payload)}.signature`;
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setModalError('Full Name must be at least 2 characters long.');
      return;
    }

    if (!personalEmail.trim() || !personalEmail.includes('@')) {
      setModalError('Please enter a valid Personal Email address.');
      return;
    }

    if (!muetyEmail.trim() || !muetyEmail.includes('@')) {
      setModalError('Please enter a valid MUETY Login Email.');
      return;
    }

    if (!muetyEmail.trim().toLowerCase().endsWith('@muety.in')) {
      setModalError('MUETY Login Email must end with domain @muety.in');
      return;
    }

    if (!selectedDepartmentId) {
      setModalError('Department selection is required.');
      return;
    }

    if (!selectedRoleId) {
      setModalError('Operational Role selection is required.');
      return;
    }

    if (adminModalMode === 'create' && (selectedRoleId === 'superadmin' || selectedRoleId === 'super_admin')) {
      setModalError('Super Admin already exists and cannot be created through admin provisioning.');
      return;
    }

    // Verify role belongs to department
    const validRoles = availableRolesForDept(selectedDepartmentId, adminModalMode === 'create');
    const selectedRoleDef = validRoles.find(r => r.slug === selectedRoleId || r.id === selectedRoleId);
    if (!selectedRoleDef) {
      setModalError('Please select a valid operational role.');
      return;
    }

    if (selectedRoleDef.departmentId !== selectedDepartmentId) {
      setModalError('Selected role does not belong to the selected department.');
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await getAuthToken();

      if (adminModalMode === 'create') {
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : ''
          },
          body: JSON.stringify({
            action: 'create-user',
            fullName: fullName.trim(),
            personalEmail: personalEmail.trim().toLowerCase(),
            muetyEmail: muetyEmail.trim().toLowerCase(),
            departmentId: selectedDepartmentId,
            roleId: selectedRoleId
          })
        });

        let serverRes: any = null;
        try {
          serverRes = await res.json();
        } catch {
          // Response is not JSON (e.g. 404 HTML fallback)
        }

        if (res.ok && serverRes && serverRes.success && serverRes.user) {
          const createdUser: UserProfile = {
            ...serverRes.user,
            createdAt: new Date().toISOString()
          };
          await customerService.saveCustomer(createdUser);
          if (serverRes.warning) {
            warning(serverRes.warning);
          } else {
            success('Admin user created and invitation sent.');
          }
          success(`Invitation setup link ready for ${personalEmail.trim().toLowerCase()}`);
          setShowAdminModal(false);
          loadAllData();
        } else {
          let errMsg = serverRes?.error?.message || serverRes?.message;
          if (!errMsg) {
            if (res.status === 404) {
              errMsg = 'Admin API endpoint was not found on this domain. Check serverless function deployment on Netlify.';
            } else if (res.status === 401 || res.status === 403) {
              errMsg = 'Permission Denied: Only authenticated Super Admin can provision new admin accounts.';
            } else {
              errMsg = `Failed to provision admin user (HTTP ${res.status}).`;
            }
          }
          if (serverRes?.code === 'INVITATION_EMAIL_PROVIDER_REJECTED' || errMsg.includes('Verify the MUETY sending domain')) {
            errMsg = 'Admin account created, but invitation email could not be sent. Verify the MUETY sending domain in Resend.';
          } else if (errMsg.includes('credentials are not configured') || errMsg.includes('Firebase server credentials')) {
            errMsg = 'Admin provisioning is unavailable because Firebase server credentials are not configured.';
          }
          setModalError(errMsg);
          error(errMsg);
        }
      } else {
        // Edit Mode
        const existing = customerService.getCustomerById(targetUid);
        if (!existing) throw new Error('Target admin user not found.');

        if (existing.uid === currentUser?.uid && selectedRoleId !== 'superadmin' && selectedRoleId !== 'super_admin') {
          const superAdmins = users.filter(u => getUserRoles(u).includes('superadmin'));
          if (superAdmins.length <= 1) {
            throw new Error('Action Denied: Cannot demote the sole active Super Admin account.');
          }
        }

        const res = await fetch('/api/admin/update-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : ''
          },
          body: JSON.stringify({
            action: 'update-role',
            targetUid,
            departmentId: selectedDepartmentId,
            roleId: selectedRoleId
          })
        });

        let serverRes: any = null;
        try {
          serverRes = await res.json();
        } catch {}

        if (!res.ok || (serverRes && serverRes.error)) {
          throw new Error(serverRes?.error?.message || `Failed to update custom claims on server (HTTP ${res.status}).`);
        }

        const dept = departments.find(d => d.id === selectedDepartmentId);
        const rDef = roles.find(r => r.slug === selectedRoleId || r.id === selectedRoleId);

        const updated: UserProfile = {
          ...existing,
          displayName: fullName.trim(),
          departmentId: selectedDepartmentId,
          departmentName: dept?.name || selectedDepartmentId,
          roleId: selectedRoleId,
          roleName: rDef?.name || selectedRoleId,
          roleSlug: selectedRoleId,
          role: selectedRoleId as any,
          roles: [selectedRoleId as any],
          updatedAt: new Date().toISOString()
        };

        await customerService.saveCustomer(updated);

        await auditService.logAction({
          actorUid: currentUser?.uid || 'system',
          actorEmail: currentUser?.email || 'admin',
          actorRole: getUserRoles(currentUser)[0] || 'superadmin',
          action: 'ADMIN_ROLE_UPDATED',
          entityType: 'ADMIN',
          entityId: targetUid,
          after: updated,
          reason: `Assigned role ${rDef?.name || selectedRoleId} under department ${dept?.name || selectedDepartmentId}`
        });

        success(`Updated role for ${fullName} to ${rDef?.name || selectedRoleId}`);
        setShowAdminModal(false);
        loadAllData();
      }
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save admin user credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (u: UserProfile) => {
    try {
      const idToken = await getAuthToken();

      const targetEmail = u.personalEmail || u.email;

      const res = await fetch('/api/admin/resend-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify({ action: 'resend-invitation', targetUid: u.uid })
      });

      let serverRes: any = null;
      try {
        serverRes = await res.json();
      } catch {}

      if (res.ok && serverRes && serverRes.success) {
        success('Admin invitation sent.');
        success(`Fresh invitation dispatched to ${targetEmail}`);
        const updated = {
          ...u,
          invitationStatus: 'sent' as InvitationStatus,
          invitationSentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await customerService.saveCustomer(updated);
        loadAllData();
      } else {
        let errMsg = serverRes?.error?.message || serverRes?.message || `Failed to resend admin invitation (HTTP ${res.status}).`;
        if (serverRes?.code === 'INVITATION_EMAIL_PROVIDER_REJECTED' || errMsg.includes('Verify the MUETY sending domain')) {
          errMsg = 'Admin account created, but invitation email could not be sent. Verify the MUETY sending domain in Resend.';
        } else if (errMsg.includes('credentials are not configured') || errMsg.includes('Firebase server credentials')) {
          errMsg = 'Admin provisioning is unavailable because Firebase server credentials are not configured.';
        }
        error(errMsg);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to resend invitation.');
    }
  };

  const handleCopySetupLink = (u: UserProfile) => {
    const link = (u as any).invitationLink || `https://muety.in/admin/login?email=${encodeURIComponent(u.muetyEmail || u.email)}`;
    navigator.clipboard?.writeText(link);
    success('Secure setup link copied.');
  };

  const handleToggleDisableUser = async (targetUser: UserProfile) => {
    if (targetUser.uid === currentUser?.uid) {
      warning('Security Protection: You cannot disable your own active session account.');
      return;
    }

    const isCurrentlyBlocked = targetUser.isBlocked || targetUser.status === 'disabled';
    const nextDisabledState = !isCurrentlyBlocked;
    const confirmMsg = nextDisabledState
      ? `Deactivate admin privileges for ${targetUser.displayName}?`
      : `Re-enable admin privileges for ${targetUser.displayName}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const idToken = await getAuthToken();

      const res = await fetch('/api/admin/disable-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify({ action: 'disable-user', targetUid: targetUser.uid, disabled: nextDisabledState })
      });

      let serverRes: any = null;
      try {
        serverRes = await res.json();
      } catch {}

      if (!res.ok || (serverRes && serverRes.error)) {
        throw new Error(serverRes?.error?.message || `Failed to update account status on server (HTTP ${res.status}).`);
      }

      const nextStatus: AdminStatus = nextDisabledState ? 'disabled' : 'active';
      const updated: UserProfile = {
        ...targetUser,
        isBlocked: nextDisabledState,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      };

      await customerService.saveCustomer(updated);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'admin',
        actorRole: getUserRoles(currentUser)[0] || 'superadmin',
        action: nextDisabledState ? 'ADMIN_DISABLED' : 'ADMIN_ENABLED',
        entityType: 'ADMIN',
        entityId: targetUser.uid,
        reason: nextDisabledState ? 'Deactivated admin user' : 'Re-enabled admin user'
      });

      success(`Account ${nextDisabledState ? 'deactivated' : 're-enabled'} for ${targetUser.displayName}`);
      loadAllData();
    } catch (err: any) {
      error(err?.message || 'Failed to update admin account status.');
    }
  };

  // Filtered Roster Users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchName = (u.displayName || '').toLowerCase().includes(q);
    const matchMuety = (u.muetyEmail || u.email || '').toLowerCase().includes(q);
    const matchPersonal = (u.personalEmail || '').toLowerCase().includes(q);
    const matchQuery = matchName || matchMuety || matchPersonal;

    const matchDept = deptFilter === 'all' || u.departmentId === deptFilter;
    const matchRole = roleFilter === 'all' || u.roleSlug === roleFilter || u.role === roleFilter;

    let matchStatus = true;
    if (statusFilter === 'active') matchStatus = !u.isBlocked && u.status !== 'invited' && u.status !== 'disabled';
    if (statusFilter === 'invited') matchStatus = u.status === 'invited' || u.invitationStatus === 'pending' || u.invitationStatus === 'sent';
    if (statusFilter === 'disabled') matchStatus = u.isBlocked || u.status === 'disabled';

    return matchQuery && matchDept && matchRole && matchStatus;
  });

  // Department Actions
  const handleToggleDepartmentStatus = async (dept: Department) => {
    const isDisabling = dept.status === 'active';
    if (isDisabling) {
      // Check active admin dependencies
      const activeAdmins = users.filter(u => u.departmentId === dept.id && !u.isBlocked && u.status !== 'disabled');
      if (activeAdmins.length > 0) {
        setDependencyWarning({
          open: true,
          deptName: dept.name,
          count: activeAdmins.length
        });
        return;
      }
    }

    try {
      const nextStatus = isDisabling ? 'disabled' : 'active';
      const updatedDepts = departments.map(d => d.id === dept.id ? { ...d, status: nextStatus as any } : d);
      setDepartments(updatedDepts);

      let idToken = '';
      if (auth && auth.currentUser) {
        try { idToken = await auth.currentUser.getIdToken(true); } catch {}
      }

      await fetch('/api/admin/update-department', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify({ departmentId: dept.id, status: nextStatus })
      });

      success(`Department "${dept.name}" status updated to ${nextStatus}.`);
    } catch (err: any) {
      error(err?.message || 'Failed to update department status.');
      loadAllData();
    }
  };

  return (
    <div className="admin-users-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Executive Admin Roster & Organization System
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Manage departments, operational roles, and privileged admin user accounts with data-driven authorization.
          </p>
        </div>

        <button
          onClick={openCreateAdminModal}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
        >
          <UserPlus size={18} />
          <span>Create New Admin</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid var(--brand-border)',
        marginBottom: '1.75rem'
      }}>
        <button
          onClick={() => setActiveTab('roster')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: activeTab === 'roster' ? '#d4af37' : '#94a3b8',
            borderBottom: activeTab === 'roster' ? '3px solid #d4af37' : '3px solid transparent',
            marginBottom: '-2px',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={18} />
          <span>Admin Roster</span>
          <span style={{ backgroundColor: activeTab === 'roster' ? 'rgba(212,175,55,0.2)' : '#1e293b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: activeTab === 'departments' ? '#d4af37' : '#94a3b8',
            borderBottom: activeTab === 'departments' ? '3px solid #d4af37' : '3px solid transparent',
            marginBottom: '-2px',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Building2 size={18} />
          <span>Departments</span>
          <span style={{ backgroundColor: activeTab === 'departments' ? 'rgba(212,175,55,0.2)' : '#1e293b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>
            {departments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: activeTab === 'roles' ? '#d4af37' : '#94a3b8',
            borderBottom: activeTab === 'roles' ? '3px solid #d4af37' : '3px solid transparent',
            marginBottom: '-2px',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Shield size={18} />
          <span>Roles & Permissions</span>
          <span style={{ backgroundColor: activeTab === 'roles' ? 'rgba(212,175,55,0.2)' : '#1e293b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>
            {roles.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ADMIN ROSTER */}
      {activeTab === 'roster' && (
        <>
          {/* Filters Bar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by name, MUETY login or personal email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', margin: 0 }}
              />
            </div>

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="form-input"
              style={{ width: '200px', margin: 0 }}
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="form-input"
              style={{ width: '200px', margin: 0 }}
            >
              <option value="all">All Operational Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="support_manager">Support Manager</option>
              <option value="support_executive">Support Executive</option>
              <option value="order_manager">Order Manager</option>
              <option value="order_executive">Order Executive</option>
              <option value="catalog_manager">Catalog Manager</option>
              <option value="product_executive">Product Executive</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: '160px', margin: 0 }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited / Pending</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Admin Roster Desktop Table */}
          <div className="admin-show-desktop card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Admin User</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>MUETY Login</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Personal Email</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Department</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Role</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Created Date</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <UserCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>No administrative accounts found matching filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const userRoles = getUserRoles(u);
                      const primaryRoleSlug = u.roleSlug || userRoles[0] || 'admin';
                      const roleDef = roles.find(r => r.slug === primaryRoleSlug || r.id === primaryRoleSlug);
                      const roleLabel = roleDef ? roleDef.name : ROLE_LABELS[primaryRoleSlug as keyof typeof ROLE_LABELS] || primaryRoleSlug;

                      const deptDef = departments.find(d => d.id === u.departmentId);
                      const deptLabel = deptDef ? deptDef.name : u.departmentName || 'Management';

                      const isCurrent = u.uid === currentUser?.uid;
                      const isInvited = u.status === 'invited' || u.invitationStatus === 'pending' || u.invitationStatus === 'sent';

                      return (
                        <tr key={u.uid} style={{ borderBottom: '1px solid var(--brand-border)', backgroundColor: isCurrent ? 'rgba(212, 175, 55, 0.04)' : 'transparent' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div 
                              onClick={() => setViewingAdmin(u)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                              title="Click to view individual admin profile"
                            >
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
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                overflow: 'hidden'
                              }}>
                                {(u.profilePhotoUrl || u.photoURL) ? (
                                  <img src={u.profilePhotoUrl || u.photoURL} alt={u.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span>{(u.displayName || 'A').charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                                  {u.displayName} {isCurrent && <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '4px' }}>(You)</span>}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>UID: {u.uid.substring(0, 12)}...</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {u.muetyEmail || u.email}
                          </td>

                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            {u.personalEmail || u.email}
                          </td>

                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                              <Building2 size={14} color="#94a3b8" />
                              {deptLabel}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: primaryRoleSlug === 'superadmin' || primaryRoleSlug === 'super_admin' ? '#fef3c7' : '#e0f2fe',
                              color: primaryRoleSlug === 'superadmin' || primaryRoleSlug === 'super_admin' ? '#92400e' : '#0369a1',
                              border: primaryRoleSlug === 'superadmin' || primaryRoleSlug === 'super_admin' ? '1px solid #fde68a' : '1px solid #bae6fd'
                            }}>
                              {roleLabel}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {u.isBlocked || u.status === 'disabled' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', backgroundColor: '#fef2f2', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                                <XCircle size={14} /> DISABLED
                              </span>
                            ) : isInvited ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 700, fontSize: '0.82rem', backgroundColor: '#fffbebeb', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <RefreshCw size={14} /> INVITED
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700, fontSize: '0.82rem', backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                <CheckCircle2 size={14} /> ACTIVE
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => setViewingAdmin(u)}
                                className="btn btn-outline btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#94a3b8', color: '#334155' }}
                                title="View Individual Admin Profile"
                              >
                                <Eye size={13} />
                                <span>View Profile</span>
                              </button>

                              {isInvited && (
                                <>
                                  <button
                                    onClick={() => handleCopySetupLink(u)}
                                    className="btn btn-outline btn-sm"
                                    style={{ borderColor: '#d97706', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Copy secure password setup link"
                                  >
                                    <Copy size={13} />
                                    <span>Copy Setup Link</span>
                                  </button>

                                  <button
                                    onClick={() => handleResendInvitation(u)}
                                    className="btn btn-outline btn-sm"
                                    style={{ borderColor: '#2563eb', color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Resend invitation email to personal email"
                                  >
                                    <Send size={13} />
                                    <span>Resend</span>
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => openEditAdminModal(u)}
                                className="btn btn-outline btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Modify Department & Role"
                              >
                                <Edit3 size={13} />
                                <span>Edit Role</span>
                              </button>

                              <button
                                onClick={() => handleToggleDisableUser(u)}
                                disabled={isCurrent}
                                className={`btn btn-sm ${u.isBlocked || u.status === 'disabled' ? 'btn-success' : 'btn-danger'}`}
                                style={{ opacity: isCurrent ? 0.5 : 1, cursor: isCurrent ? 'not-allowed' : 'pointer' }}
                                title={isCurrent ? 'Cannot deactivate self' : (u.isBlocked || u.status === 'disabled') ? 'Enable Admin' : 'Disable Admin'}
                              >
                                {u.isBlocked || u.status === 'disabled' ? <Unlock size={14} /> : <Lock size={14} />}
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

          {/* Admin Roster Mobile Cards */}
          <div className="admin-show-mobile admin-mobile-card-grid">
            {filteredUsers.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <UserCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No administrative accounts found.</p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const userRoles = getUserRoles(u);
                const primaryRoleSlug = u.roleSlug || userRoles[0] || 'admin';
                const roleDef = roles.find(r => r.slug === primaryRoleSlug || r.id === primaryRoleSlug);
                const roleLabel = roleDef ? roleDef.name : ROLE_LABELS[primaryRoleSlug as keyof typeof ROLE_LABELS] || primaryRoleSlug;

                const deptDef = departments.find(d => d.id === u.departmentId);
                const deptLabel = deptDef ? deptDef.name : u.departmentName || 'Management';
                const isCurrent = u.uid === currentUser?.uid;
                const isInvited = u.status === 'invited' || u.invitationStatus === 'pending' || u.invitationStatus === 'sent';

                return (
                  <div key={u.uid} className="admin-mobile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#090d16',
                          color: '#d4af37',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1.5px solid #d4af37',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {(u.profilePhotoUrl || u.photoURL) ? (
                            <img src={u.profilePhotoUrl || u.photoURL} alt={u.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span>{(u.displayName || 'A').charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div>
                          <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>
                            {u.displayName} {isCurrent && <span style={{ fontSize: '0.7rem', color: '#10b981' }}>(You)</span>}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.muetyEmail || u.email}</span>
                        </div>
                      </div>

                      {u.isBlocked || u.status === 'disabled' ? (
                        <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>DISABLED</span>
                      ) : isInvited ? (
                        <span style={{ color: '#d97706', fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#fffbebeb', padding: '2px 6px', borderRadius: '4px' }}>INVITED</span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>ACTIVE</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', backgroundColor: '#f8fafc', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, display: 'block' }}>DEPARTMENT</span>
                        <strong style={{ color: '#0f172a' }}>{deptLabel}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, display: 'block' }}>ROLE</span>
                        <strong style={{ color: '#d4af37' }}>{roleLabel}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button onClick={() => setViewingAdmin(u)} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        View Profile
                      </button>
                      <button onClick={() => openEditAdminModal(u)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        Edit Role
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', fontWeight: 700 }}>MUETY Departments</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Organizational boundaries and functional units.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {departments.map(dept => {
              const activeCount = users.filter(u => u.departmentId === dept.id && !u.isBlocked && u.status !== 'disabled').length;
              const deptRoles = roles.filter(r => r.departmentId === dept.id);

              return (
                <div key={dept.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0 }}>{dept.name}</h3>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Slug: {dept.slug}</span>
                        </div>
                      </div>

                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: dept.status === 'active' ? '#ecfdf5' : '#fef2f2',
                        color: dept.status === 'active' ? '#047857' : '#b91c1c',
                        border: dept.status === 'active' ? '1px solid #a7f3d0' : '1px solid #fecaca'
                      }}>
                        {dept.status.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      {dept.description}
                    </p>

                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: '#64748b', borderTop: '1px solid var(--brand-border)', paddingTop: '10px' }}>
                      <div>
                        <strong>Assigned Admins:</strong> <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{activeCount}</span>
                      </div>
                      <div>
                        <strong>Roles:</strong> <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{deptRoles.length}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                    <button
                      onClick={() => handleToggleDepartmentStatus(dept)}
                      className={`btn btn-sm ${dept.status === 'active' ? 'btn-outline' : 'btn-success'}`}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {dept.status === 'active' ? 'Disable Department' : 'Enable Department'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Roles & Permission Definitions</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Functional roles mapped strictly to departments.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={16} color="#94a3b8" />
              <select
                value={rolesDeptFilter}
                onChange={e => setRolesDeptFilter(e.target.value)}
                className="form-input"
                style={{ width: '220px', margin: 0 }}
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {roles.filter(r => rolesDeptFilter === 'all' || r.departmentId === rolesDeptFilter).map(rDef => {
              const activeCount = users.filter(u => u.roleSlug === rDef.slug || u.roleId === rDef.id).length;
              const permKeys = Object.keys(rDef.permissions || {}).filter(k => rDef.permissions[k]);

              return (
                <div key={rDef.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0 }}>{rDef.name}</h3>
                        <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>Department: {rDef.departmentName}</span>
                      </div>

                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: rDef.slug === 'superadmin' ? '#fef3c7' : '#f0f9ff',
                        color: rDef.slug === 'superadmin' ? '#92400e' : '#0369a1',
                        border: '1px solid rgba(2, 132, 199, 0.2)'
                      }}>
                        {rDef.slug}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {rDef.description}
                    </p>

                    <div style={{ marginBottom: '1rem' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>Granted Permissions ({permKeys.length}):</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                        {permKeys.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No explicit permissions set</span>
                        ) : (
                          permKeys.map(pk => (
                            <span key={pk} style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                              {pk}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--brand-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Active Users: <strong style={{ color: 'var(--brand-primary)' }}>{activeCount}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT ADMIN MODAL */}
      {/* Create / Edit Admin Modal */}
      <AdminModal
        isOpen={showAdminModal}
        onClose={() => !isSubmitting && setShowAdminModal(false)}
        title={adminModalMode === 'create' ? 'Create MUETY Admin User' : 'Modify Admin Operational Role'}
        subtitle={adminModalMode === 'create' ? 'Provision account identity and send onboarding setup invitation.' : 'Update assigned department and authorized operational permissions.'}
        headerIcon={<Shield size={20} />}
        maxWidth="640px"
        disableClose={isSubmitting}
      >
        <form onSubmit={handleSaveAdmin} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="admin-modal-body">
            {modalError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {/* SECTION 1: Identity & Communications */}
            <div style={{ border: '1px solid var(--brand-border)', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#f8fafc' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '1rem' }}>
                1. EMPLOYEE IDENTITY & COMMUNICATIONS
              </h4>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Personal Email Address *</label>
                <input
                  type="email"
                  required
                  value={personalEmail}
                  onChange={e => setPersonalEmail(e.target.value)}
                  placeholder="e.g. arun@gmail.com"
                  className="form-input"
                  disabled={isSubmitting}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Invitation link and password setup instructions will be sent here.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">MUETY Login Email (@muety.in) *</label>
                <input
                  type="email"
                  required
                  value={muetyEmail}
                  onChange={e => setMuetyEmail(e.target.value)}
                  placeholder="e.g. arun.kumar@muety.in"
                  className="form-input"
                  disabled={isSubmitting || adminModalMode === 'edit'}
                />
                <span style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                  Authoritative login identity for Firebase Authentication portal.
                </span>
              </div>
            </div>

            {/* SECTION 2: Organizational Authorization */}
            <div style={{ border: '1px solid var(--brand-border)', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '1rem' }}>
                2. ORGANIZATIONAL AUTHORIZATION
              </h4>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Department *</label>
                <select
                  value={selectedDepartmentId}
                  onChange={e => handleDepartmentChangeInAdminModal(e.target.value)}
                  className="form-input"
                  disabled={isSubmitting}
                  style={{ cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value="">Select Department...</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Operational Role *</label>
                <select
                  value={selectedRoleId}
                  onChange={e => {
                    setSelectedRoleId(e.target.value);
                    setModalError(null);
                  }}
                  className="form-input"
                  disabled={isSubmitting || !selectedDepartmentId}
                  style={{ cursor: 'pointer', fontWeight: 600 }}
                >
                  {(!selectedRoleId || availableRolesForDept(selectedDepartmentId, adminModalMode === 'create').length > 1) && (
                    <option value="">Select Operational Role...</option>
                  )}
                  {availableRolesForDept(selectedDepartmentId, adminModalMode === 'create').map(role => (
                    <option key={role.id} value={role.slug || role.id}>{role.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {selectedDepartmentId === 'management' && adminModalMode === 'create'
                    ? 'Management user creation is limited to the Admin role. Super Admin is a unique system role.'
                    : 'Roles are strictly scoped to the selected department.'}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={() => setShowAdminModal(false)}
              className="btn btn-outline"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || (adminModalMode === 'create' && (!fullName.trim() || fullName.trim().length < 2 || !personalEmail.includes('@') || !muetyEmail.trim().toLowerCase().endsWith('@muety.in') || !selectedDepartmentId || !selectedRoleId))}
              style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Processing Credentials...</span>
                </>
              ) : adminModalMode === 'create' ? (
                <>
                  <Send size={16} />
                  <span>Send Invitation & Create Admin</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Update Role Claims</span>
                </>
              )}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* DEPENDENCY WARNING MODAL */}
      <AdminModal
        isOpen={dependencyWarning.open}
        onClose={() => setDependencyWarning({ open: false, deptName: '', count: 0 })}
        title="Cannot Disable Department"
        headerIcon={<AlertTriangle size={20} color="#ef4444" />}
        maxWidth="480px"
      >
        <div className="admin-modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <AlertTriangle size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '0.5rem' }}>
            Department Dependency Warning
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
            Department <strong>"{dependencyWarning.deptName}"</strong> cannot be disabled because <strong>{dependencyWarning.count} active admin user(s)</strong> are currently assigned to it.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
            Please reassign or disable the dependent active admins first before disabling this department.
          </p>
        </div>
        <div className="admin-modal-footer" style={{ justifyContent: 'center' }}>
          <button
            onClick={() => setDependencyWarning({ open: false, deptName: '', count: 0 })}
            className="btn btn-primary"
            style={{ minWidth: '160px', fontWeight: 700 }}
          >
            Understood
          </button>
        </div>
      </AdminModal>
      {/* INDIVIDUAL ADMIN PROFILE MODAL */}
      <AdminModal
        isOpen={!!viewingAdmin}
        onClose={() => setViewingAdmin(null)}
        showHeader={false}
        maxWidth="660px"
      >
        {viewingAdmin && (
          <>
            {/* Header Banner */}
            <div style={{
              backgroundColor: '#090d16',
              padding: '1.75rem 2rem',
              color: '#ffffff',
              position: 'relative',
              borderBottom: '3px solid #d4af37',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                style={{
                  position: 'absolute',
                  right: '1.25rem',
                  top: '1.25rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Close"
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  color: '#d4af37',
                  fontSize: '2rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #d4af37',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {(viewingAdmin.profilePhotoUrl || viewingAdmin.photoURL) ? (
                    <img
                      src={viewingAdmin.profilePhotoUrl || viewingAdmin.photoURL}
                      alt={viewingAdmin.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{(viewingAdmin.displayName || viewingAdmin.email || 'A').charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{viewingAdmin.displayName || viewingAdmin.fullName}</span>
                    {viewingAdmin.uid === currentUser?.uid && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '4px' }}>
                        You
                      </span>
                    )}
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', margin: '4px 0 8px 0' }}>
                    {roles.find(r => r.slug === viewingAdmin.roleSlug || r.id === viewingAdmin.roleSlug)?.name || viewingAdmin.roleName || viewingAdmin.roleSlug || 'Admin User'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: (viewingAdmin.isBlocked || viewingAdmin.status === 'disabled') ? '#fee2e2' : ((viewingAdmin.status === 'invited' || viewingAdmin.invitationStatus === 'pending' || viewingAdmin.invitationStatus === 'sent') ? '#fef3c7' : '#dcfce7'),
                      color: (viewingAdmin.isBlocked || viewingAdmin.status === 'disabled') ? '#991b1b' : ((viewingAdmin.status === 'invited' || viewingAdmin.invitationStatus === 'pending' || viewingAdmin.invitationStatus === 'sent') ? '#92400e' : '#166534')
                    }}>
                      {(viewingAdmin.isBlocked || viewingAdmin.status === 'disabled') ? 'DISABLED' : ((viewingAdmin.status === 'invited' || viewingAdmin.invitationStatus === 'pending' || viewingAdmin.invitationStatus === 'sent') ? 'INVITED' : 'ACTIVE')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      UID: {viewingAdmin.uid}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="admin-modal-body" style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Contact Details */}
              <div>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Contact Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Primary Contact Number</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Phone size={14} color="#64748b" />
                      {viewingAdmin.phone || viewingAdmin.phoneNumber || 'Not specified'}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: 600 }}>WhatsApp Number</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <WhatsAppIcon size={16} color="#25D366" />
                        {viewingAdmin.whatsappNumber || viewingAdmin.alternatePhone || 'Not specified'}
                      </span>
                      {(viewingAdmin.whatsappNumber || viewingAdmin.alternatePhone) && getWhatsAppUrl(viewingAdmin.whatsappNumber || viewingAdmin.alternatePhone) && (
                        <a
                          href={getWhatsAppUrl(viewingAdmin.whatsappNumber || viewingAdmin.alternatePhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: '#25D366',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)'
                          }}
                          title="Chat on WhatsApp"
                        >
                          <WhatsAppIcon size={12} color="#ffffff" />
                          <span>Open WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Credentials */}
              <div>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Account Credentials & Emails
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: 600 }}>MUETY Login Email</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Mail size={14} color="#d4af37" />
                      {viewingAdmin.muetyEmail || viewingAdmin.email}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Personal Email</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Mail size={14} color="#64748b" />
                      {viewingAdmin.personalEmail || viewingAdmin.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organization Details */}
              <div>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Organization & Access Control
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Department</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Building2 size={14} color="#64748b" />
                      {departments.find(d => d.id === viewingAdmin.departmentId)?.name || viewingAdmin.departmentName || 'Management'}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Operational Role</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#d4af37', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Shield size={14} color="#d4af37" />
                      {roles.find(r => r.slug === viewingAdmin.roleSlug || r.id === viewingAdmin.roleSlug)?.name || viewingAdmin.roleName || viewingAdmin.roleSlug || 'Admin'}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Provisioning Date</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Calendar size={14} color="#64748b" />
                      {new Date(viewingAdmin.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {viewingAdmin.bio && (
                <div>
                  <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Operational Bio & Notes
                  </h3>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', color: '#334155', fontSize: '0.88rem', lineHeight: '1.5' }}>
                    {viewingAdmin.bio}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="admin-modal-footer" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                className="btn btn-outline btn-sm"
                style={{ fontWeight: 600, color: '#475569' }}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingAdmin;
                    setViewingAdmin(null);
                    openEditAdminModal(target);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                >
                  <Edit3 size={14} />
                  <span>Edit Role & Dept</span>
                </button>
              </div>
            </div>
          </>
        )}
      </AdminModal>
    </div>
  );
};
