import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { customerService, isStaffOrAdminUser, CustomerMetrics } from '@/features/customers/services/customerService';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { authService } from '@/features/auth/services/authService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { UserProfile, CustomerStatus, Address } from '@/shared/types';
import { Order } from '@/features/orders/types';
import { getUserRoles } from '@/shared/utils/permissions';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { 
  Search, 
  UserX, 
  UserCheck, 
  Users,
  Award,
  DollarSign,
  ShoppingBag,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Calendar,
  KeyRound,
  Send,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const AdminCustomers: React.FC = () => {
  useDocumentTitle('Customer CRM & Patron Directory');
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { success, warning, error: notifyError } = useNotification();

  // State
  const [customers, setCustomers] = useState<UserProfile[]>(() => customerService.getOnlyCustomers());
  const [orders, setOrders] = useState<Order[]>(() => storageService.getOrders());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contact' | 'addresses' | 'orders' | 'account'>('overview');

  // Contact Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAltPhone, setEditAltPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Address Form State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrApartment, setAddrApartment] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [addrCountry, setAddrCountry] = useState('India');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Password reset & Account action loading
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Subscribe to live customers & orders
  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((liveUsers) => {
      const canonicalCustomers = liveUsers.filter(u => !isStaffOrAdminUser(u));
      setCustomers(canonicalCustomers);
      const liveOrders = storageService.getOrders();
      setOrders(liveOrders);

      // Keep selected customer synchronized if modal is open
      if (selectedCustomer) {
        const updated = canonicalCustomers.find(u => u.uid === selectedCustomer.uid);
        if (updated) setSelectedCustomer(updated);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [selectedCustomer?.uid]);

  // Derive per-customer metrics map for fast lookup
  const customerMetricsMap = useMemo(() => {
    const map = new Map<string, CustomerMetrics>();
    customers.forEach(c => {
      map.set(c.uid, customerService.calculateCustomerMetrics(c, orders));
    });
    return map;
  }, [customers, orders]);

  // CRM Aggregate KPI Metrics
  const totalCustomers = customers.length;
  const activeAccounts = customers.filter(u => !u.isBlocked).length;
  const vipCustomersCount = customers.filter(u => {
    const m = customerMetricsMap.get(u.uid);
    return u.customerStatus === 'VIP' || (m && m.isVip);
  }).length;
  const totalLTV = customers.reduce((sum, u) => {
    const m = customerMetricsMap.get(u.uid);
    return sum + (m ? m.totalSpend : 0);
  }, 0);

  // Filtered customer directory
  const filteredCustomers = useMemo(() => {
    return customers.filter(u => {
      const q = search.toLowerCase().trim();
      const matchesQuery = !q || 
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phoneNumber || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q);

      const m = customerMetricsMap.get(u.uid);
      const isVip = u.customerStatus === 'VIP' || (m && m.isVip);

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = !u.isBlocked;
      else if (statusFilter === 'VIP') matchesStatus = !!isVip;
      else if (statusFilter === 'blocked') matchesStatus = !!u.isBlocked;

      return matchesQuery && matchesStatus;
    });
  }, [customers, search, statusFilter, customerMetricsMap]);

  // Open Workspace Modal
  const handleOpenCustomer = (customer: UserProfile, tab: 'overview' | 'contact' | 'addresses' | 'orders' | 'account' = 'overview') => {
    setSelectedCustomer(customer);
    setActiveTab(tab);
    setEditName(customer.displayName || customer.fullName || '');
    setEditPhone(customer.phoneNumber || customer.phone || '');
    setEditAltPhone(customer.alternatePhone || '');
    setEditWhatsapp(customer.whatsappPhone || customer.phoneNumber || '');
  };

  // Close Workspace Modal
  const handleCloseModal = () => {
    setSelectedCustomer(null);
    setShowAddressModal(false);
    setEditingAddressId(null);
  };

  // Save Contact Information
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!editName.trim()) {
      warning('Customer full name is required.');
      return;
    }

    setIsSavingContact(true);
    try {
      const prevName = selectedCustomer.displayName;
      const prevPhone = selectedCustomer.phoneNumber || selectedCustomer.phone;

      const updated = await customerService.updateCustomerContact(selectedCustomer.uid, {
        displayName: editName,
        phoneNumber: editPhone,
        alternatePhone: editAltPhone,
        whatsappPhone: editWhatsapp
      });

      setSelectedCustomer(updated);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'admin@muety.in',
        actorRole: getUserRoles(currentUser)[0] || 'admin',
        action: 'CUSTOMER_CONTACT_UPDATED',
        entityType: 'CUSTOMER',
        entityId: selectedCustomer.uid,
        reason: `Updated contact profile for ${selectedCustomer.email}. Name: "${prevName}" -> "${editName}". Phone: "${prevPhone || 'none'}" -> "${editPhone || 'none'}"`
      });

      success('Patron contact details updated successfully.');
    } catch (err: any) {
      notifyError(err?.message || 'Failed to update customer contact details.');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Toggle Account Block / Suspension
  const handleToggleAccountStatus = async () => {
    if (!selectedCustomer) return;
    setIsTogglingStatus(true);
    try {
      const willBlock = !selectedCustomer.isBlocked;
      const newStatus: CustomerStatus = willBlock ? 'blocked' : 'active';
      const updated = await customerService.updateCustomerStatus(selectedCustomer.uid, newStatus);
      if (updated) setSelectedCustomer(updated);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'admin@muety.in',
        actorRole: getUserRoles(currentUser)[0] || 'admin',
        action: willBlock ? 'CUSTOMER_BLOCKED' : 'CUSTOMER_UNBLOCKED',
        entityType: 'CUSTOMER',
        entityId: selectedCustomer.uid,
        reason: `${willBlock ? 'Suspended' : 'Re-enabled'} patron account for ${selectedCustomer.email}`
      });

      success(`Account ${willBlock ? 'suspended' : 're-enabled'} successfully.`);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to change account status.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Trigger Password Reset Email
  const handleSendPasswordReset = async () => {
    if (!selectedCustomer?.email) return;
    setIsSendingReset(true);
    try {
      await authService.sendPasswordReset(selectedCustomer.email);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'admin@muety.in',
        actorRole: getUserRoles(currentUser)[0] || 'admin',
        action: 'PASSWORD_RESET_DISPATCHED',
        entityType: 'CUSTOMER',
        entityId: selectedCustomer.uid,
        reason: `Dispatched secure password reset email to patron: ${selectedCustomer.email}`
      });

      success(`Password recovery instructions dispatched to ${selectedCustomer.email}.`);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to send password recovery email. Verify network and email settings.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Address Handlers
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrFullName(selectedCustomer?.displayName || '');
    setAddrPhone(selectedCustomer?.phoneNumber || selectedCustomer?.phone || '');
    setAddrStreet('');
    setAddrApartment('');
    setAddrCity('');
    setAddrState('');
    setAddrPostalCode('');
    setAddrCountry('India');
    setAddrIsDefault((selectedCustomer?.addresses || []).length === 0);
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: Address) => {
    if (!addr.id) return;
    setEditingAddressId(addr.id);
    setAddrFullName(addr.fullName);
    setAddrPhone(addr.phone);
    setAddrStreet(addr.streetAddress);
    setAddrApartment(addr.apartment || '');
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPostalCode(addr.postalCode);
    setAddrCountry(addr.country || 'India');
    setAddrIsDefault(!!addr.isDefault);
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!addrFullName.trim() || !addrPhone.trim() || !addrStreet.trim() || !addrCity.trim() || !addrState.trim() || !addrPostalCode.trim()) {
      warning('Please fill in all required address fields (Recipient, Phone, Street, City, State, PIN Code).');
      return;
    }

    setIsSavingAddress(true);
    try {
      const addressData: Address = {
        fullName: addrFullName.trim(),
        phone: addrPhone.trim(),
        streetAddress: addrStreet.trim(),
        apartment: addrApartment.trim() || undefined,
        city: addrCity.trim(),
        state: addrState.trim(),
        postalCode: addrPostalCode.trim(),
        country: addrCountry.trim() || 'India',
        isDefault: addrIsDefault
      };

      let updated: UserProfile;
      if (editingAddressId) {
        updated = await customerService.updateCustomerAddress(selectedCustomer.uid, editingAddressId, addressData);
        await auditService.logAction({
          actorUid: currentUser?.uid || 'system',
          actorEmail: currentUser?.email || 'admin@muety.in',
          actorRole: getUserRoles(currentUser)[0] || 'admin',
          action: 'CUSTOMER_ADDRESS_UPDATED',
          entityType: 'CUSTOMER',
          entityId: selectedCustomer.uid,
          reason: `Updated delivery address ID ${editingAddressId} for ${selectedCustomer.email}`
        });
        success('Delivery address updated in customer profile.');
      } else {
        updated = await customerService.addCustomerAddress(selectedCustomer.uid, addressData);
        await auditService.logAction({
          actorUid: currentUser?.uid || 'system',
          actorEmail: currentUser?.email || 'admin@muety.in',
          actorRole: getUserRoles(currentUser)[0] || 'admin',
          action: 'CUSTOMER_ADDRESS_ADDED',
          entityType: 'CUSTOMER',
          entityId: selectedCustomer.uid,
          reason: `Added new delivery address for ${selectedCustomer.email} in ${addressData.city}, ${addressData.state}`
        });
        success('New delivery address added to customer profile.');
      }

      setSelectedCustomer(updated);
      setShowAddressModal(false);
      setEditingAddressId(null);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to save address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!selectedCustomer) return;
    if (!window.confirm('Are you sure you want to remove this delivery address from the customer profile? Historical order invoices and past snapshots will not be modified.')) {
      return;
    }

    try {
      const updated = await customerService.deleteCustomerAddress(selectedCustomer.uid, addressId);
      setSelectedCustomer(updated);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'admin@muety.in',
        actorRole: getUserRoles(currentUser)[0] || 'admin',
        action: 'CUSTOMER_ADDRESS_DELETED',
        entityType: 'CUSTOMER',
        entityId: selectedCustomer.uid,
        reason: `Removed saved delivery address ID ${addressId} from patron ${selectedCustomer.email}`
      });

      success('Delivery address removed from customer profile.');
    } catch (err: any) {
      notifyError(err?.message || 'Failed to delete address.');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!selectedCustomer) return;
    try {
      const updated = await customerService.setDefaultCustomerAddress(selectedCustomer.uid, addressId);
      setSelectedCustomer(updated);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'system',
        actorEmail: currentUser?.email || 'admin@muety.in',
        actorRole: getUserRoles(currentUser)[0] || 'admin',
        action: 'CUSTOMER_DEFAULT_ADDRESS_CHANGED',
        entityType: 'CUSTOMER',
        entityId: selectedCustomer.uid,
        reason: `Set address ID ${addressId} as default delivery address for ${selectedCustomer.email}`
      });

      success('Default delivery address updated.');
    } catch (err: any) {
      notifyError(err?.message || 'Failed to set default address.');
    }
  };

  // Selected customer derived metrics and orders
  const selectedCustomerMetrics = selectedCustomer ? customerMetricsMap.get(selectedCustomer.uid) || customerService.calculateCustomerMetrics(selectedCustomer, orders) : null;
  const customerOrdersList = useMemo(() => {
    if (!selectedCustomer) return [];
    const cEmail = (selectedCustomer.email || '').toLowerCase().trim();
    return orders.filter(o => 
      (o.customerId && o.customerId === selectedCustomer.uid) ||
      (o.customerEmail && o.customerEmail.toLowerCase().trim() === cEmail)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedCustomer, orders]);

  return (
    <div className="admin-customers animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem', width: '100%' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Customer CRM & Patron Relationship Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Canonical registered storefront patrons, verified order histories, delivery books, and relationship metrics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px' }}>
          <ShieldCheck size={16} color="#16a34a" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d' }}>Storefront Auth Synchronized</span>
        </div>
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
          <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 'auto', paddingTop: '6px' }}>{activeAccounts} active patron accounts</span>
        </div>

        {/* VIP Patrons */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#fffdf5', borderColor: '#fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>VIP Clients</span>
            <Award size={18} color="#d4af37" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', fontFamily: 'var(--font-heading)' }}>
            {vipCustomersCount}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 'auto', paddingTop: '6px' }}>Spend volume &ge; ₹50,000</span>
        </div>

        {/* Total Orders Volume */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase' }}>Verified Orders</span>
            <ShoppingBag size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            {orders.filter(o => o.orderStatus !== 'cancelled' && o.orderStatus !== 'failed').length}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#10b981', marginTop: 'auto', paddingTop: '6px' }}>Completed & active orders</span>
        </div>

        {/* Customer Total LTV */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase' }}>Cumulative Spend</span>
            <DollarSign size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            ₹{totalLTV.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 'auto', paddingTop: '6px' }}>Gross completed order revenue</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search patron by name, email, or phone number..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: '220px', margin: 0 }}
          >
            <option value="all">All Patron Categories ({totalCustomers})</option>
            <option value="active">Active Accounts</option>
            <option value="VIP">VIP Clients (&ge;₹50k spend)</option>
            <option value="blocked">Suspended Accounts</option>
          </select>
        </div>
      </div>

      {/* Responsive Customer Directory: Desktop Table + Mobile Stacked Cards */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
        
        {/* Desktop & Tablet Table */}
        <div className="admin-table-container" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Patron Details</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Contact Information</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Account & Tier</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'center' }}>Completed Orders</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Lifetime Spend</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Registration</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                    <Users size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--brand-primary)' }}>
                      No registered patrons match your search criteria.
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                      Try adjusting the search query or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const metrics = customerMetricsMap.get(customer.uid) || customerService.calculateCustomerMetrics(customer, orders);
                  const isBlocked = !!customer.isBlocked;
                  const isVip = metrics.isVip || customer.customerStatus === 'VIP';
                  const displayName = customer.displayName || customer.fullName || 'Patron';

                  return (
                    <tr 
                      key={customer.uid} 
                      style={{ 
                        borderBottom: '1px solid var(--brand-border)',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="admin-table-row"
                    >
                      {/* Patron Name & Avatar */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: '#090d16',
                            color: '#d4af37',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            flexShrink: 0
                          }}>
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--brand-primary)', display: 'block', fontSize: '0.92rem' }}>
                              {displayName}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              UID: {customer.uid.substring(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: customer.email ? 'var(--text-primary)' : '#94a3b8', fontWeight: customer.email ? 500 : 400, fontStyle: customer.email ? 'normal' : 'italic' }}>
                            {customer.email || 'Not connected'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {customer.phoneNumber || customer.phone || 'No phone registered'}
                          </span>
                        </div>
                      </td>

                      {/* Account Status & VIP Tier */}
                      <td style={{ padding: '14px 18px' }}>
                        {isBlocked ? (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <UserX size={12} /> Suspended
                          </span>
                        ) : isVip ? (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Award size={13} color="#d4af37" /> VIP Patron
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Active Patron
                          </span>
                        )}
                      </td>

                      {/* Orders Count */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ 
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          backgroundColor: metrics.orderCount > 0 ? '#f1f5f9' : '#fafafa',
                          color: metrics.orderCount > 0 ? 'var(--brand-primary)' : '#94a3b8'
                        }}>
                          {metrics.orderCount}
                        </span>
                      </td>

                      {/* Lifetime Spend */}
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--brand-primary)' }}>
                        ₹{metrics.totalSpend.toLocaleString('en-IN')}
                      </td>

                      {/* Enrolled Date */}
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                        {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleOpenCustomer(customer)} 
                          className="btn btn-primary btn-sm"
                          style={{ fontWeight: 600, padding: '6px 14px' }}
                        >
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

      {/* CUSTOMER DETAILS WORKSPACE MODAL */}
      {selectedCustomer && (
        <AdminModal
          isOpen={!!selectedCustomer}
          onClose={handleCloseModal}
          title={selectedCustomer.displayName || selectedCustomer.fullName || 'Patron Workspace'}
          subtitle={`Patron Record #${selectedCustomer.uid} • Registered ${new Date(selectedCustomer.createdAt).toLocaleDateString('en-IN')}`}
          headerIcon={<Users size={20} />}
          maxWidth="840px"
        >
          {/* Modal Navigation Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            overflowX: 'auto',
            padding: '0 1rem'
          }}>
            {[
              { key: 'overview', label: 'Overview', icon: <Layers size={15} /> },
              { key: 'contact', label: 'Contact Details', icon: <Mail size={15} /> },
              { key: 'addresses', label: `Delivery Addresses (${(selectedCustomer.addresses || []).length})`, icon: <MapPin size={15} /> },
              { key: 'orders', label: `Order History (${customerOrdersList.length})`, icon: <ShoppingBag size={15} /> },
              { key: 'account', label: 'Account & Login', icon: <KeyRound size={15} /> }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? 'var(--brand-primary)' : '#64748b',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '3px solid #d4af37' : '3px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Modal Body Container with Scroll */}
          <div style={{ padding: '1.75rem', overflowY: 'auto', maxHeight: 'calc(82vh - 160px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* TAB A: OVERVIEW */}
            {activeTab === 'overview' && selectedCustomerMetrics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Account Status Card */}
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: selectedCustomer.isBlocked ? '#fff1f2' : selectedCustomerMetrics.isVip ? '#fffdf5' : '#f8fafc',
                  border: `1px solid ${selectedCustomer.isBlocked ? '#fecdd3' : selectedCustomerMetrics.isVip ? '#fde68a' : '#e2e8f0'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      Current Account Status & Tier
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                        {selectedCustomerMetrics.customerCategory}
                      </span>
                      {selectedCustomer.isBlocked ? (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                          Account Suspended
                        </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                          Storefront Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('contact')}
                      className="btn btn-outline btn-sm"
                    >
                      <Edit2 size={14} /> Edit Contact Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="btn btn-outline-gold btn-sm"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      <ShoppingBag size={14} /> View All Orders
                    </button>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid-3" style={{ gap: '1rem' }}>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Total Lifetime Spend
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '4px' }}>
                      ₹{selectedCustomerMetrics.totalSpend.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      Calculated from real completed orders
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Completed Orders Count
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '4px' }}>
                      {selectedCustomerMetrics.orderCount} orders
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      Excluding cancelled & refunded orders
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Patron Since
                    </span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '6px' }}>
                      {new Date(selectedCustomer.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '2px', display: 'block' }}>
                      Storefront Registration
                    </span>
                  </div>
                </div>

                {/* Primary Contact Snapshot */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontWeight: 700 }}>
                    Profile Snapshot
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Full Legal Name</span>
                      <strong>{selectedCustomer.displayName || selectedCustomer.fullName || 'Not provided'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Storefront Email</span>
                      <strong style={{ color: selectedCustomer.email ? 'var(--brand-primary)' : '#94a3b8', fontStyle: selectedCustomer.email ? 'normal' : 'italic' }}>
                        {selectedCustomer.email || 'Not connected'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Primary Phone</span>
                      <strong>{selectedCustomer.phoneNumber || selectedCustomer.phone || 'None registered'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Default Delivery City</span>
                      <strong>
                        {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 
                          ? `${selectedCustomer.addresses.find(a => a.isDefault)?.city || selectedCustomer.addresses[0].city}, ${selectedCustomer.addresses.find(a => a.isDefault)?.state || selectedCustomer.addresses[0].state}`
                          : 'No saved address'}
                      </strong>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB B: CONTACT INFORMATION */}
            {activeTab === 'contact' && (
              <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Info size={18} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.4 }}>
                    Patron contact numbers and names update their CRM record. The primary login email is anchored to Firebase Authentication and cannot be arbitrarily overwritten from profile forms.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Patron Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="e.g. Priyadarshini Sundaram"
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Primary Contact Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="+91 93857 91540"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>WhatsApp Number</label>
                    <input
                      type="tel"
                      value={editWhatsapp}
                      onChange={e => setEditWhatsapp(e.target.value)}
                      placeholder="+91 93857 91540"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Alternate Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={editAltPhone}
                    onChange={e => setEditAltPhone(e.target.value)}
                    placeholder="e.g. Office / Landline"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Storefront Authentication Email (Read-Only)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedCustomer.email || 'Not connected'}
                    className="form-input"
                    style={{ backgroundColor: '#f1f5f9', color: selectedCustomer.email ? '#334155' : '#94a3b8', cursor: 'not-allowed', fontStyle: selectedCustomer.email ? 'normal' : 'italic' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Email modification requires a verified account credentials flow.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={isSavingContact}
                    className="btn btn-primary"
                    style={{ fontWeight: 700 }}
                  >
                    {isSavingContact ? 'Saving Changes...' : 'Save Contact Details'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB C: DELIVERY ADDRESSES */}
            {activeTab === 'addresses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                      Saved Delivery Addresses
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Delivery addresses stored in the customer's account book. Modifying addresses here will never alter historical order records or invoices.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 700 }}
                  >
                    <Plus size={16} /> Add Delivery Address
                  </button>
                </div>

                {(!selectedCustomer.addresses || selectedCustomer.addresses.length === 0) ? (
                  <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 'var(--radius-md)' }}>
                    <MapPin size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--brand-primary)' }}>No saved delivery addresses on file.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Click "Add Delivery Address" above to register a shipping address for this patron.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {selectedCustomer.addresses.map((addr, index) => {
                      const isDef = !!addr.isDefault;
                      return (
                        <div
                          key={addr.id || `addr-${index}`}
                          style={{
                            padding: '1.25rem',
                            backgroundColor: isDef ? '#fffdf5' : '#ffffff',
                            border: `1px solid ${isDef ? '#fde68a' : 'var(--brand-border)'}`,
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', display: 'block' }}>
                                {addr.fullName}
                              </strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Phone: {addr.phone}
                              </span>
                            </div>

                            {isDef && (
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                                ★ Default
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            <div>{addr.streetAddress}</div>
                            {addr.apartment && <div>{addr.apartment}</div>}
                            <div>{addr.city}, {addr.state} - {addr.postalCode}</div>
                            <div>{addr.country || 'India'}</div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                            {!isDef ? (
                              <button
                                type="button"
                                onClick={() => addr.id && handleSetDefaultAddress(addr.id)}
                                style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                              >
                                Set as Default
                              </button>
                            ) : <span />}

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditAddress(addr)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                title="Edit Address"
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => addr.id && handleDeleteAddress(addr.id)}
                                className="btn btn-danger btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                title="Delete Address"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB D: ORDER HISTORY */}
            {activeTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                    Patron Order History ({customerOrdersList.length})
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Canonical Orders Ledger
                  </span>
                </div>

                {customerOrdersList.length === 0 ? (
                  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 'var(--radius-md)' }}>
                    <ShoppingBag size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--brand-primary)' }}>No past orders found for this patron.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Orders placed via the storefront checkout will automatically attach to this customer history.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customerOrdersList.map(ord => {
                      const isCancelled = ord.orderStatus === 'cancelled';
                      const isDelivered = ord.orderStatus === 'delivered';

                      return (
                        <div
                          key={ord.id}
                          style={{
                            padding: '1.25rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--brand-border)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '1.05rem', color: 'var(--brand-primary)' }}>
                                  #{ord.orderNumber}
                                </strong>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  • {new Date(ord.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                {ord.items.length} item(s) • Payment: {ord.paymentMethod?.toUpperCase()} ({ord.paymentStatus?.toUpperCase() || 'PAID'})
                              </span>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                                ₹{ord.total.toLocaleString('en-IN')}
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                {isCancelled ? (
                                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                                    Cancelled
                                  </span>
                                ) : isDelivered ? (
                                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                    Delivered
                                  </span>
                                ) : (
                                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e' }}>
                                    {ord.orderStatus.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Shipping address snapshot indicator */}
                          {ord.shippingAddress && (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                              <strong>Shipping Snapshot:</strong> {ord.shippingAddress.fullName}, {ord.shippingAddress.streetAddress}, {ord.shippingAddress.city}, {ord.shippingAddress.state} - {ord.shippingAddress.postalCode}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #f8fafc' }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleCloseModal();
                                navigate(`/admin/orders?search=${ord.orderNumber}`);
                              }}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              Open in Orders Manager <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB E: ACCOUNT & LOGIN */}
            {activeTab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Security Card */}
                <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} color="#15803d" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                      Firebase Authentication Architecture
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    MUETY ERP relies on canonical Google Cloud Firebase Authentication. Customer passwords are cryptographic hashes managed strictly in Firebase Auth and are never viewable or stored in plaintext by administrators.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Account UID</span>
                      <code style={{ fontSize: '0.8rem', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                        {selectedCustomer.uid}
                      </code>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Storefront Registered Email</span>
                      <strong style={{ color: selectedCustomer.email ? 'var(--brand-primary)' : '#94a3b8', fontStyle: selectedCustomer.email ? 'normal' : 'italic' }}>
                        {selectedCustomer.email || 'Not connected'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Password Recovery Action */}
                <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                      Send Password Recovery / Reset
                    </h5>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      {selectedCustomer.email 
                        ? `Dispatches an official Firebase Auth recovery link directly to ${selectedCustomer.email}.`
                        : 'Not available: This patron signed in via mobile OTP with no connected email.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSendingReset || !selectedCustomer.email}
                    onClick={handleSendPasswordReset}
                    className="btn btn-outline-gold btn-sm"
                    style={{ backgroundColor: '#ffffff', fontWeight: 700, opacity: selectedCustomer.email ? 1 : 0.6 }}
                  >
                    <Send size={14} /> {isSendingReset ? 'Sending Instructions...' : 'Dispatch Password Reset'}
                  </button>
                </div>

                {/* Account Suspension / Activation Toggle */}
                <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderColor: selectedCustomer.isBlocked ? '#fecdd3' : undefined }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.92rem', color: selectedCustomer.isBlocked ? '#b91c1c' : 'var(--brand-primary)', fontWeight: 700 }}>
                      {selectedCustomer.isBlocked ? 'Account is Currently Suspended' : 'Account Status: Active'}
                    </h5>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      {selectedCustomer.isBlocked 
                        ? 'Patron is currently blocked from signing in and placing orders.' 
                        : 'Patron has full access to the storefront catalog, cart, and checkout.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isTogglingStatus}
                    onClick={handleToggleAccountStatus}
                    className={`btn btn-sm ${selectedCustomer.isBlocked ? 'btn-success' : 'btn-danger'}`}
                    style={{ fontWeight: 700 }}
                  >
                    {isTogglingStatus ? 'Updating Status...' : selectedCustomer.isBlocked ? 'Re-enable Patron Account' : 'Suspend Patron Account'}
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Modal Fixed Footer */}
          <div style={{
            padding: '1rem 1.75rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              MUETY Patron CRM v2.0
            </span>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-outline"
              style={{ fontWeight: 600 }}
            >
              Close Workspace
            </button>
          </div>
        </AdminModal>
      )}

      {/* ADD / EDIT DELIVERY ADDRESS MODAL */}
      {showAddressModal && (
        <AdminModal
          isOpen={showAddressModal}
          onClose={() => {
            setShowAddressModal(false);
            setEditingAddressId(null);
          }}
          title={editingAddressId ? 'Edit Delivery Address' : 'Add Delivery Address'}
          subtitle="Updates customer delivery book without altering historical order records"
          headerIcon={<MapPin size={20} />}
          maxWidth="600px"
        >
          <form onSubmit={handleSaveAddress}>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(75vh - 120px)', overflowY: 'auto' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={addrFullName}
                    onChange={e => setAddrFullName(e.target.value)}
                    placeholder="Recipient Full Name"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={addrPhone}
                    onChange={e => setAddrPhone(e.target.value)}
                    placeholder="+91 93857 91540"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Street Address / Door No *</label>
                <input
                  type="text"
                  required
                  value={addrStreet}
                  onChange={e => setAddrStreet(e.target.value)}
                  placeholder="e.g. 14, Royal Palm Avenue"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Apartment, Suite, Landmark (Optional)</label>
                <input
                  type="text"
                  value={addrApartment}
                  onChange={e => setAddrApartment(e.target.value)}
                  placeholder="e.g. Near Grand Mall"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>City / Town *</label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={e => setAddrCity(e.target.value)}
                    placeholder="e.g. Chennai"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>State *</label>
                  <input
                    type="text"
                    required
                    value={addrState}
                    onChange={e => setAddrState(e.target.value)}
                    placeholder="e.g. Tamil Nadu"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>PIN / Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={addrPostalCode}
                    onChange={e => setAddrPostalCode(e.target.value)}
                    placeholder="e.g. 600001"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Country</label>
                  <input
                    type="text"
                    required
                    value={addrCountry}
                    onChange={e => setAddrCountry(e.target.value)}
                    placeholder="India"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="addrDefaultCheckbox"
                  checked={addrIsDefault}
                  onChange={e => setAddrIsDefault(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="addrDefaultCheckbox" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', cursor: 'pointer' }}>
                  Set as default delivery address for this patron
                </label>
              </div>

            </div>

            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddressModal(false);
                  setEditingAddressId(null);
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingAddress}
                className="btn btn-primary"
                style={{ fontWeight: 700 }}
              >
                {isSavingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

    </div>
  );
};
