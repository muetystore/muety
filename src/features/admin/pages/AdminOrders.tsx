import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { orderService } from '@/features/orders/services/orderService';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Order, OrderStatus } from '@/types';
import { getUserRoles } from '@/shared/utils/permissions';
import { 
  Search, 
  Eye, 
  X, 
  Loader2, 
  Trash2,
  Archive,
  ArchiveRestore,
  Truck,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  MapPin,
  CreditCard,
  Printer,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  MessageCircle,
  Check,
  Tag,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';
import { AdminModal } from '@/features/admin/components/AdminModal';

const POPULAR_COURIERS = [
  'Blue Dart Express',
  'DTDC Express',
  'Delhivery Express',
  'India Post / Speed Post',
  'Shadowfax',
  'MUETY Global Express'
];

const formatOrderTimelineDate = (timestampOrIso: string | undefined, fallbackIso?: string): string => {
  if (!timestampOrIso && !fallbackIso) return '';
  const dateToParse = (timestampOrIso && (timestampOrIso.includes('T') || timestampOrIso.endsWith('Z')))
    ? timestampOrIso
    : (fallbackIso || timestampOrIso);

  try {
    const d = new Date(dateToParse!);
    if (isNaN(d.getTime())) return timestampOrIso || '';
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return timestampOrIso || '';
  }
};

export const AdminOrders: React.FC = () => {
  useDocumentTitle('Orders ERP & Fulfillment');
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Derive currently selected order from live orders list to prevent any state flickering
  const selectedOrder = React.useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Edit Tracking State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

  // Helper to extract or resolve the SKU for any order line item
  const getProductSku = (item: any): string => {
    if (item?.product?.sku && String(item.product.sku).trim()) {
      return String(item.product.sku).trim();
    }
    if (item?.sku && String(item.sku).trim()) {
      return String(item.sku).trim();
    }
    const pId = item?.product?.id || item?.productId || item?.id;
    if (pId) {
      const prod = storageService.getProductById(pId);
      if (prod?.sku && String(prod.sku).trim()) {
        return String(prod.sku).trim();
      }
    }
    return 'MUETY-LUXE';
  };

  const handleCopy = (text: string, fieldKey: string, msg: string = 'Copied to clipboard') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    success(msg);
    setTimeout(() => {
      setCopiedField(prev => (prev === fieldKey ? null : prev));
    }, 2200);
  };

  const getCleanPhone = (phone?: string): string => {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '');
  };

  const getTrackingUrl = (courierName: string, awb: string): string => {
    if (!awb) return '';
    const name = courierName.toLowerCase();
    if (name.includes('blue dart') || name.includes('bluedart')) {
      return `https://www.bluedart.com/tracking?trackNumber=${encodeURIComponent(awb)}`;
    }
    if (name.includes('delhivery')) {
      return `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`;
    }
    if (name.includes('dtdc')) {
      return `https://www.dtdc.in/tracking/shipment-tracking.asp?strCnno=${encodeURIComponent(awb)}`;
    }
    if (name.includes('india post') || name.includes('speed post')) {
      return `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`;
    }
    return `https://www.google.com/search?q=track+${encodeURIComponent(courierName)}+${encodeURIComponent(awb)}`;
  };

  useEffect(() => {
    setLoading(true);
    setQueryError(null);

    let liveReceived = false;

    const unsubscribe = orderService.subscribeToAllOrders(
      (liveOrders) => {
        liveReceived = true;
        setOrders(liveOrders);
        setLoading(false);
        setQueryError(null);
      },
      (err) => {
        setLoading(false);
        const currentOrders = storageService.getOrders();
        setOrders(prev => prev.length > 0 ? prev : currentOrders);
        if (currentOrders.length === 0 && orders.length === 0) {
          setQueryError(`Live Sync Note: ${err?.message || 'Using synchronized order ledger.'}`);
        }
      }
    );

    const fallbackTimer = setTimeout(() => {
      if (!liveReceived) {
        setOrders(storageService.getOrders());
        setLoading(false);
      }
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const openOrderDetails = (ord: Order) => {
    setSelectedOrderId(ord.id);
    setTrackingNumber(ord.trackingNumber || '');
    setCourier(ord.courier || ord.trackingCarrier || 'Blue Dart Express');
    setStatusNote('');
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updated = await orderService.updateOrderStatus(orderId, newStatus, statusNote || undefined);
      if (updated) {
        setOrders(prev => prev.map(o => (o.id === orderId || o.orderNumber === orderId) ? updated : o));

        await auditService.logAction({
          actorUid: user?.uid || 'system',
          actorEmail: user?.email || 'order_manager',
          actorRole: getUserRoles(user)[0] || 'order_manager',
          action: 'ORDER_STATUS_CHANGED',
          entityType: 'ORDER',
          entityId: orderId,
          reason: `Changed order #${updated.orderNumber} status to ${newStatus}`
        });

        success(`Order #${updated.orderNumber} status transitioned to ${newStatus.replace(/_/g, ' ').toUpperCase()}`);
        setStatusNote('');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to update order status.');
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsUpdatingTracking(true);
    try {
      const updated = await orderService.updateOrderTracking(selectedOrder.id, {
        trackingNumber: trackingNumber.trim(),
        courier: courier.trim(),
        trackingCarrier: courier.trim(),
        statusNote: statusNote.trim() || undefined
      });

      if (updated) {
        setOrders(prev => prev.map(o => (o.id === updated.id || o.orderNumber === updated.orderNumber) ? updated : o));

        await auditService.logAction({
          actorUid: user?.uid || 'system',
          actorEmail: user?.email || 'order_manager',
          actorRole: getUserRoles(user)[0] || 'order_manager',
          action: 'ORDER_FULFILLMENT_UPDATED',
          entityType: 'ORDER',
          entityId: selectedOrder.id,
          reason: `Updated shipping courier (${courier}) and tracking number (${trackingNumber})`
        });

        success(`Logistics & tracking details updated for Order #${selectedOrder.orderNumber}`);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to update tracking info.');
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  const handleArchiveOrder = async (orderId: string, orderNum: string) => {
    const confirmed = window.confirm(`Archive Order #${orderNum}?\n\nThis order will be safely archived from active processing, while preserving all customer information, privacy, and financial audit history.`);
    if (!confirmed) return;

    try {
      await orderService.archiveOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, archived: true, archivedAt: new Date().toISOString() } : o));

      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'order_manager',
        actorRole: getUserRoles(user)[0] || 'order_manager',
        action: 'ORDER_ARCHIVED',
        entityType: 'ORDER',
        entityId: orderId,
        reason: `Admin archived order #${orderNum}`
      });

      success(`Order #${orderNum} moved to archives.`);
    } catch (err: any) {
      error(err?.message || 'Failed to archive order.');
    }
  };

  const handleUnarchiveOrder = async (orderId: string, orderNum: string) => {
    try {
      await orderService.unarchiveOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, archived: false, archivedAt: undefined } : o));

      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'order_manager',
        actorRole: getUserRoles(user)[0] || 'order_manager',
        action: 'ORDER_UNARCHIVED',
        entityType: 'ORDER',
        entityId: orderId,
        reason: `Admin restored order #${orderNum} from archives`
      });

      success(`Order #${orderNum} restored from archives to active list.`);
    } catch (err: any) {
      error(err?.message || 'Failed to restore order.');
    }
  };

  const handleCreateSampleOrder = async () => {
    setIsCreatingSample(true);
    try {
      const products = storageService.getProducts();
      const sampleProd = products.find(p => (p.stock ?? 1) > 0) || products[0] || {
        id: 'saree-kanchi-01',
        name: 'Kanchipuram Pure Mulberry Silk Saree',
        sku: 'KD-01',
        price: 24500,
        category: 'Pure Silk Sarees',
        images: ['/saree_model_individual.jpg']
      };

      const unitPrice = sampleProd.price || 24500;
      const discountVal = Math.round(unitPrice * 0.1);
      const taxVal = Math.round((unitPrice - discountVal) * 0.05);
      const grandTotal = unitPrice - discountVal + taxVal;

      const newOrder = await orderService.createOrder({
        customerId: user?.uid || 'patron-vip-001',
        customerName: user?.displayName || 'MUETY Patron VIP',
        customerEmail: user?.email || 'patron@muety.in',
        customerPhone: '+91 98401 23456',
        shippingAddress: {
          id: 'addr-sample',
          fullName: user?.displayName || 'MUETY Patron VIP',
          streetAddress: '42, Silk Weavers Enclave, Temple Road',
          apartment: 'Villa 7, Heritage Square',
          city: 'Kanchipuram',
          state: 'Tamil Nadu',
          postalCode: '631501',
          country: 'India',
          phone: '+91 98401 23456',
          isDefault: true
        },
        items: [
          {
            product: sampleProd as any,
            quantity: 1,
            selectedColor: 'Peacock Royal Blue & Pure Gold Zari'
          }
        ],
        subtotal: unitPrice,
        discount: discountVal,
        appliedCoupon: 'ROYALTY10',
        tax: taxVal,
        shippingFee: 0,
        total: grandTotal,
        paymentMethod: 'razorpay' as any,
        paymentStatus: 'paid' as any,
        razorpayPaymentId: 'pay_MUETY_' + Math.random().toString(36).substring(2, 9).toUpperCase()
      });

      if (newOrder) {
        setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
        setSelectedOrderId(newOrder.id);
        success(`Sample demonstration Order #${newOrder.orderNumber} created successfully!`);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to create sample order.');
    } finally {
      setIsCreatingSample(false);
    }
  };

  const testOrders = orders.filter(o =>
    (o.customerEmail || '').includes('@example.com') ||
    (o.customerEmail || '').includes('test') ||
    (o.items || []).some((i: any) => i.product?.id?.startsWith('saree-') || i.product?.name === 'Silk Saree')
  );

  const handlePurgeTestOrders = async () => {
    if (testOrders.length === 0) {
      success('No mock or automated test orders detected in database.');
      return;
    }
    const confirmed = window.confirm(`Found ${testOrders.length} automated test order(s). Archive them all now to preserve history?`);
    if (!confirmed) return;

    try {
      for (const tOrd of testOrders) {
        await orderService.archiveOrder(tOrd.id);
      }
      setOrders(prev => prev.map(o => testOrders.some(t => t.id === o.id) ? { ...o, archived: true, archivedAt: new Date().toISOString() } : o));
      success(`Successfully archived ${testOrders.length} test order(s).`);
    } catch (err: any) {
      error(err?.message || 'Failed to archive test orders.');
    }
  };

  const filteredOrders = orders.filter(o => {
    const isArchived = Boolean(o.archived);
    if (statusFilter === 'archived') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
      if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;
    }
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerEmail || '').toLowerCase().includes(q);
    return matchesSearch;
  });

  // Calculate lifecycle stepper index
  const getLifecycleStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'pending_payment':
      case 'confirmed':
        return 0;
      case 'processing':
        return 1;
      case 'packed':
        return 2;
      case 'shipped':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const LIFECYCLE_STAGES = [
    { key: 'confirmed', label: 'Confirmed', desc: 'Paid & Captured' },
    { key: 'processing', label: 'QC & Prep', desc: 'Silk Atelier Check' },
    { key: 'packed', label: 'Packed', desc: 'Luxury Box Sealed' },
    { key: 'shipped', label: 'In Transit', desc: 'Handed to Courier' },
    { key: 'delivered', label: 'Delivered', desc: 'Received by Patron' },
  ];

  return (
    <div className="admin-orders animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '4rem' }}>
      
      {/* Scoped Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #admin-printable-order-invoice,
          #admin-printable-order-invoice * {
            visibility: visible !important;
          }
          #admin-printable-order-invoice {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 32px !important;
            margin: 0 !important;
            z-index: 9999999 !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Fulfillment &amp; Order ERP Operations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Dispatch tracking, order status lifecycle management, and customer delivery snapshots.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateSampleOrder}
          disabled={isCreatingSample}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, padding: '8px 16px' }}
        >
          {isCreatingSample ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} color="var(--brand-accent)" />}
          <span>Create Sample Saree Order</span>
        </button>
      </div>

      {/* Automated / Test Orders Notice */}
      {testOrders.length > 0 && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          color: '#92400e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <span>Detected <strong>{testOrders.length} automated / test order(s)</strong> created outside live catalog transactions.</span>
          </div>
          <button
            type="button"
            onClick={handlePurgeTestOrders}
            className="btn btn-sm"
            style={{ backgroundColor: '#b45309', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Archive size={14} /> Archive Automated Test Orders
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by order #, client name, or email..." 
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
          style={{ width: '240px', margin: 0 }}
        >
          <option value="all">Active Orders ({orders.filter(o => !o.archived).length})</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out For Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="archived">📦 Archived Orders ({orders.filter(o => Boolean(o.archived)).length})</option>
        </select>
      </div>

      {/* Query Error Notice */}
      {queryError && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #f87171',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#991b1b'
        }}>
          <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.9rem' }}>
            <strong>Database Query Notice:</strong> {queryError}
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setQueryError(null);
              orderService.subscribeToAllOrders(
                (live) => { setOrders(live); setLoading(false); setQueryError(null); },
                (err) => { setLoading(false); setQueryError(`Firestore Query / Permission Error: ${err?.message || 'Unable to sync live orders.'}`); }
              );
            }}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Order #</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Customer Patron</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Items Count &amp; SKU</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Total (₹)</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--brand-accent)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Syncing live client orders from Firestore...</p>
                  </td>
                </tr>
              ) : queryError ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#b91c1c' }}>
                    <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>Unable to load live orders</p>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{queryError}</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                    <Truck size={42} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1rem', color: '#334155' }}>
                      No client orders found matching current filters.
                    </p>
                    <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                      You can generate a sample pure silk saree demonstration order to test fulfillment and inspect the View Order modal.
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateSampleOrder}
                      disabled={isCreatingSample}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                    >
                      {isCreatingSample ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Create Sample Saree Order
                    </button>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(ord => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
                      #{ord.orderNumber}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{ord.customerName}</div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{ord.customerEmail}</span>
                    </td>

                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {ord.items.reduce((s: number, i: any) => s + i.quantity, 0)} saree(s)
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {ord.items.map((i: any, idx: number) => (
                          <span key={idx} style={{
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            padding: '1px 6px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '3px',
                            color: '#0f172a',
                            fontWeight: 700
                          }}>
                            {getProductSku(i)}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--brand-primary)' }}>
                      ₹{ord.total.toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: ord.orderStatus === 'delivered' ? '#dcfce7' : ord.orderStatus === 'shipped' ? '#e0f2fe' : ord.orderStatus === 'cancelled' ? '#fee2e2' : '#fef3c7',
                          color: ord.orderStatus === 'delivered' ? '#15803d' : ord.orderStatus === 'shipped' ? '#0369a1' : ord.orderStatus === 'cancelled' ? '#b91c1c' : '#b45309'
                        }}>
                          {ord.orderStatus.replace('_', ' ').toUpperCase()}
                        </span>
                        {ord.archived && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Archive size={10} /> ARCHIVED
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button onClick={() => openOrderDetails(ord)} className="btn btn-primary btn-sm">
                          <Eye size={14} /> View Order
                        </button>
                        {ord.archived ? (
                          <button 
                            onClick={() => handleUnarchiveOrder(ord.id, ord.orderNumber)} 
                            className="btn btn-sm"
                            title="Restore Order from Archives"
                            style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ArchiveRestore size={14} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleArchiveOrder(ord.id, ord.orderNumber)} 
                            className="btn btn-sm"
                            title="Archive Order (Preserve Customer & Financial Records)"
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UPGRADED LUXURY VIEW ORDER MODAL & FULFILLMENT COMMAND CENTER             */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <AdminModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          title={`Order #${selectedOrder.orderNumber}`}
          subtitle={`Placed on ${new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(selectedOrder.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • Patron: ${selectedOrder.customerName}`}
          headerIcon={<ShoppingBag size={20} />}
          maxWidth="min(980px, calc(100vw - 32px))"
        >
          {/* Scrollable Modal Body */}
          <div className="admin-modal-body" style={{
            padding: '1.5rem',
            overflowY: 'auto',
            maxHeight: 'calc(88dvh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: '#f8fafc'
          }}>
            
            {/* 1. LIFECYCLE PROGRESS STEPPER & STAGE ADVANCER */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Order Fulfillment Progression
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                      Current Status: <span style={{ color: selectedOrder.orderStatus === 'delivered' ? '#16a34a' : selectedOrder.orderStatus === 'cancelled' ? '#dc2626' : 'var(--brand-accent)' }}>
                        {selectedOrder.orderStatus.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Quick Status Transition Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Advance Stage:</label>
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="form-input"
                    style={{ margin: 0, width: '190px', fontWeight: 700, padding: '7px 12px', fontSize: '0.85rem', borderColor: '#cbd5e1' }}
                  >
                    <option value="pending_payment">1. Pending Payment</option>
                    <option value="confirmed">2. Confirmed (Captured)</option>
                    <option value="processing">3. Atelier QC &amp; Prep</option>
                    <option value="packed">4. Packed &amp; Sealed</option>
                    <option value="shipped">5. Shipped (In Transit)</option>
                    <option value="out_for_delivery">6. Out For Delivery</option>
                    <option value="delivered">7. Delivered to Patron</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Cancellation Warning if Cancelled */}
              {selectedOrder.orderStatus === 'cancelled' ? (
                <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b' }}>
                  <XCircle size={20} color="#dc2626" />
                  <div style={{ fontSize: '0.88rem' }}>
                    <strong>This order has been cancelled.</strong> {selectedOrder.cancellationReason ? `Reason: ${selectedOrder.cancellationReason}` : 'No further automated delivery dispatches are scheduled.'}
                  </div>
                </div>
              ) : (
                /* Visual Horizontal Stepper */
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginTop: '0.5rem' }}>
                  {LIFECYCLE_STAGES.map((st, idx) => {
                    const currentIdx = getLifecycleStepIndex(selectedOrder.orderStatus);
                    const isPassed = idx < currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <React.Fragment key={st.key}>
                        {/* Connecting Line */}
                        {idx > 0 && (
                          <div style={{
                            flex: 1,
                            height: '3px',
                            backgroundColor: isPassed || isCurrent ? '#d4af37' : '#e2e8f0',
                            transition: 'background-color 0.3s ease',
                            margin: '0 4px',
                            position: 'relative',
                            top: '-12px'
                          }} />
                        )}

                        {/* Step Node */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '70px', zIndex: 2 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isPassed ? '#10b981' : isCurrent ? '#090d16' : '#ffffff',
                            color: isPassed ? '#ffffff' : isCurrent ? '#fbbf24' : '#94a3b8',
                            border: isPassed ? '2px solid #10b981' : isCurrent ? '2px solid #fbbf24' : '2px solid #cbd5e1',
                            boxShadow: isCurrent ? '0 0 0 4px rgba(251, 191, 36, 0.2)' : 'none',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            transition: 'all 0.3s ease'
                          }}>
                            {isPassed ? <Check size={16} /> : (idx + 1)}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--brand-primary)' : isPassed ? '#0f172a' : '#94a3b8', marginTop: '6px' }}>
                            {st.label}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'none' }}>
                            {st.desc}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. CONSIGNMENT LOGISTICS & LIVE COURIER TRACKING HUB */}
            <form onSubmit={handleSaveTracking} style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(212, 175, 55, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                    <Truck size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 800 }}>
                      Consignment Logistics &amp; Courier Tracking
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Carrier allocation, airway bill number (AWB), and tracking coordinates.
                    </span>
                  </div>
                </div>

                {trackingNumber && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(trackingNumber, 'awb', 'AWB Tracking Number copied!')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      {copiedField === 'awb' ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                      <span>{copiedField === 'awb' ? 'Copied' : 'Copy AWB'}</span>
                    </button>

                    <a
                      href={getTrackingUrl(courier, trackingNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0369a1' }}
                    >
                      <ExternalLink size={13} />
                      <span>Track Online</span>
                    </a>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Courier Carrier Partner</label>
                  <input 
                    type="text" 
                    value={courier} 
                    onChange={e => setCourier(e.target.value)} 
                    placeholder="e.g. Blue Dart, DTDC, Delhivery, India Post" 
                    list="couriers-datalist"
                    className="form-input" 
                    style={{ fontSize: '0.88rem', borderColor: '#cbd5e1' }}
                  />
                  <datalist id="couriers-datalist">
                    {POPULAR_COURIERS.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Waybill / Tracking Reference # (AWB)</label>
                  <input 
                    type="text" 
                    value={trackingNumber} 
                    onChange={e => setTrackingNumber(e.target.value)} 
                    placeholder="e.g. BD-9940182741" 
                    className="form-input" 
                    style={{ fontSize: '0.88rem', fontFamily: 'monospace', fontWeight: 700, borderColor: '#cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Fulfillment Remark / Dispatch Note (Optional)</label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    placeholder="e.g. Handed to Blue Dart pickup associate at 04:30 PM with tamper-proof seal"
                    className="form-input"
                    style={{ fontSize: '0.82rem', borderColor: '#cbd5e1' }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-secondary btn-sm" 
                  disabled={isUpdatingTracking}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, height: '40px', padding: '0 16px' }}
                >
                  {isUpdatingTracking && <RefreshCw size={14} className="animate-spin" />}
                  {isUpdatingTracking ? 'Saving...' : 'Save Logistics Info'}
                </button>
              </div>
            </form>

            {/* 3. PATRON IDENTITY & DELIVERY DESTINATION COMMAND GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              
              {/* Patron Card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} color="var(--brand-accent)" />
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--brand-primary)', fontWeight: 800 }}>
                      Patron Profile Snapshot
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                    Verified Customer
                  </span>
                </div>
                
                {/* Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: '#090d16',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    border: '2px solid rgba(251, 191, 36, 0.4)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    flexShrink: 0
                  }}>
                    {(selectedOrder.customerName || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--brand-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedOrder.customerName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Patron UID: <code style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', color: '#334155' }}>
                        {selectedOrder.customerId ? selectedOrder.customerId.slice(0, 14) + '...' : 'Guest Checkout'}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Direct Action Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <a
                    href={`mailto:${selectedOrder.customerEmail}`}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.74rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Mail size={12} color="var(--brand-accent)" /> Email Patron
                  </a>

                  {selectedOrder.customerPhone && (
                    <>
                      <a
                        href={`tel:${getCleanPhone(selectedOrder.customerPhone)}`}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.74rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Phone size={12} color="#16a34a" /> Call
                      </a>
                      <a
                        href={`https://wa.me/${getCleanPhone(selectedOrder.customerPhone)}?text=${encodeURIComponent(`Hello ${selectedOrder.customerName}, regarding your MUETY order #${selectedOrder.orderNumber}:`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.74rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857' }}
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </>
                  )}
                </div>

                {/* Details Key-Value List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Email:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedOrder.customerEmail}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Phone:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedOrder.customerPhone || 'Not provided'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Payment Mode:</span>
                    <span style={{
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      fontSize: '0.76rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: selectedOrder.paymentMethod === 'cash_on_delivery' ? '#fffbeb' : '#f0fdf4',
                      color: selectedOrder.paymentMethod === 'cash_on_delivery' ? '#b45309' : '#166534',
                      border: `1px solid ${selectedOrder.paymentMethod === 'cash_on_delivery' ? '#fde68a' : '#bbf7d0'}`
                    }}>
                      {selectedOrder.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Razorpay Gateway'}
                    </span>
                  </div>
                  {selectedOrder.razorpayPaymentId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Gateway Ref:</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOrder.razorpayPaymentId!, 'pg_id', 'Payment ID copied!')}
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <code style={{ fontSize: '0.74rem', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px' }}>
                          {selectedOrder.razorpayPaymentId}
                        </code>
                        {copiedField === 'pg_id' ? <Check size={11} color="#16a34a" /> : <Copy size={11} color="#94a3b8" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address Card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} color="var(--brand-accent)" />
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--brand-primary)', fontWeight: 800 }}>
                      Delivery Destination &amp; Consignee
                    </h4>
                  </div>
                  {selectedOrder.shippingAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        const addr = selectedOrder.shippingAddress;
                        const label = `${addr.fullName || selectedOrder.customerName}\n${addr.streetAddress}${addr.apartment ? '\n' + addr.apartment : ''}\n${addr.city}, ${addr.state} - ${addr.postalCode}\nPhone: ${addr.phone || selectedOrder.customerPhone || ''}`;
                        handleCopy(label, 'shipping_label', 'Complete shipping label copied!');
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedField === 'shipping_label' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      <span>{copiedField === 'shipping_label' ? 'Copied' : 'Copy Shipping Label'}</span>
                    </button>
                  )}
                </div>

                {selectedOrder.shippingAddress ? (
                  <div style={{ fontSize: '0.86rem', lineHeight: 1.6, color: '#334155', backgroundColor: '#fbfcfd', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--brand-primary)', marginBottom: '2px' }}>
                      {selectedOrder.shippingAddress.fullName || selectedOrder.customerName}
                    </div>
                    <div>{selectedOrder.shippingAddress.streetAddress}</div>
                    {selectedOrder.shippingAddress.apartment && (
                      <div>{selectedOrder.shippingAddress.apartment}</div>
                    )}
                    <div style={{ marginTop: '2px' }}>
                      <strong style={{ color: '#0f172a' }}>{selectedOrder.shippingAddress.city}</strong>, {selectedOrder.shippingAddress.state} – <span style={{ fontWeight: 800, color: 'var(--brand-primary)', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>{selectedOrder.shippingAddress.postalCode}</span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: '6px', fontSize: '0.82rem' }}>
                      Contact Phone: <strong style={{ color: '#0f172a' }}>{selectedOrder.shippingAddress.phone || selectedOrder.customerPhone || 'N/A'}</strong>
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#090d16', color: '#fbbf24', fontWeight: 700 }}>
                        {selectedOrder.shippingAddress.country || 'India'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', padding: '1.5rem 0', textAlign: 'center' }}>
                    No physical delivery address recorded for this order snapshot.
                  </div>
                )}
              </div>
            </div>

            {/* 4. ORDERED SAREE ITEMS & MASTER SKU SPECIFICATIONS */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageCheck size={18} color="var(--brand-accent)" />
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 800 }}>
                    Ordered Saree Items &amp; Master SKU Specifications ({selectedOrder.items?.length || 0})
                  </h4>
                </div>
                <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                  MUETY Master Catalog Verified
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedOrder.items || []).map((item, idx) => {
                  const sku = getProductSku(item);
                  const prodName = item.product?.name || (item as any).name || 'MUETY Luxury Silk Saree';
                  const prodImage = item.product?.images?.[0] || (item as any).image || '/saree_model_individual.jpg';
                  const unitPrice = item.product?.price || (item as any).price || 0;
                  const lineTotal = unitPrice * (item.quantity || 1);
                  const categoryName = item.product?.category || 'Festive Pure Silk Sarees';

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        padding: '12px 14px',
                        backgroundColor: '#fafbfc'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                        <img 
                          src={prodImage} 
                          alt={prodName} 
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/saree_model_individual.jpg'; }}
                          style={{ 
                            width: '64px', 
                            height: '64px', 
                            objectFit: 'cover', 
                            borderRadius: '8px', 
                            border: '1px solid #cbd5e1', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                            flexShrink: 0 
                          }} 
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--brand-primary)' }}>{prodName}</strong>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              backgroundColor: '#090d16', 
                              color: '#fbbf24', 
                              fontFamily: 'monospace', 
                              fontSize: '0.78rem', 
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}>
                              SKU: {sku}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <span><strong>Collection:</strong> {categoryName}</span>
                            <span><strong>Quantity:</strong> {item.quantity} × ₹{unitPrice.toLocaleString('en-IN')}</span>
                            {item.selectedColor && (
                              <span><strong>Shade:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.selectedColor}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1.1rem', flexShrink: 0, paddingLeft: '14px' }}>
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 5. FINANCIAL LEDGER & BREAKDOWN */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Items Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    ₹{(selectedOrder.subtotal || selectedOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {selectedOrder.discount ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={14} /> Privilege Coupon Discount ({selectedOrder.appliedCoupon || 'PROMO'})
                    </span>
                    <span>-₹{selectedOrder.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Tracked Courier Delivery (Pan-India)</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedOrder.shippingFee === 0 
                      ? 'FREE (₹0.00)' 
                      : `₹${(selectedOrder.shippingFee !== undefined ? selectedOrder.shippingFee : (selectedOrder.paymentMethod === 'cash_on_delivery' ? 89 : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>

                {selectedOrder.tax ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.86rem' }}>
                    <span>Embedded GST (5% Integrated Silk Saree Tax — Included in Price)</span>
                    <span style={{ fontWeight: 600, color: '#475569' }}>₹{selectedOrder.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}

                {/* Grand Total */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--brand-primary)',
                  paddingTop: '10px',
                  borderTop: '2px dashed #cbd5e1',
                  marginTop: '4px'
                }}>
                  <span>Net Order Total</span>
                  <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)', fontSize: '1.35rem' }}>
                    ₹{selectedOrder.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* COD Specific Ledger */}
                {selectedOrder.paymentMethod === 'cash_on_delivery' && (
                  <div style={{ marginTop: '10px', padding: '12px 14px', backgroundColor: '#fffdf5', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#92400e', fontWeight: 600 }}>
                      <span>COD Courier Advance Authorized Online:</span>
                      <span>₹{(selectedOrder.codAdvanceAmount || 89).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78350f', fontWeight: 800, fontSize: '0.95rem', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #fde68a' }}>
                      <span>Remaining Cash Balance Due upon Delivery:</span>
                      <span>₹{(selectedOrder.codBalanceDue ?? (selectedOrder.total - 89)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. ORDER LIFECYCLE TIMELINE AUDIT */}
            {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
                  <Clock size={16} color="var(--brand-accent)" />
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--brand-primary)', fontWeight: 800 }}>
                    Order Status &amp; Fulfillment Audit Trail
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '8px' }}>
                  {selectedOrder.timeline.map((event, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: idx === selectedOrder.timeline.length - 1 ? '#10b981' : '#cbd5e1',
                        marginTop: '5px',
                        flexShrink: 0
                      }} />
                      <div style={{ fontSize: '0.84rem', flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{event.label || event.status}</div>
                        {event.description && <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1px' }}>{event.description}</div>}
                        <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '2px' }}>
                          {formatOrderTimelineDate(event.timestamp, selectedOrder.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. DEDICATED PRINTABLE TAX INVOICE & DISPATCH SLIP (Hidden on Screen, Visible on Print) */}
            <div id="admin-printable-order-invoice" style={{ display: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #090d16', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 4px', color: '#090d16', letterSpacing: '0.05em' }}>
                    MUETY LUXURY ATELIER
                  </h1>
                  <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                    Pure Handloom Silk &amp; Heritage Sarees<br />
                    Temple Road, Kanchipuram, Tamil Nadu - 631501<br />
                    GSTIN: 33AAAAA0000A1Z5 • Email: concierge@muety.in
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#090d16' }}>TAX INVOICE</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>Invoice #: INV-{selectedOrder.orderNumber}</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>Date: {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN')}</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>Payment Mode: {selectedOrder.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery (Advance Paid)' : 'Razorpay Prepaid'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '12px', lineHeight: 1.5 }}>
                <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', textTransform: 'uppercase', color: '#090d16' }}>Billed To:</strong>
                  <div>{selectedOrder.customerName}</div>
                  <div>Email: {selectedOrder.customerEmail}</div>
                  <div>Phone: {selectedOrder.customerPhone || 'N/A'}</div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', textTransform: 'uppercase', color: '#090d16' }}>Shipped / Consigned To:</strong>
                  {selectedOrder.shippingAddress ? (
                    <>
                      <div>{selectedOrder.shippingAddress.fullName || selectedOrder.customerName}</div>
                      <div>{selectedOrder.shippingAddress.streetAddress} {selectedOrder.shippingAddress.apartment || ''}</div>
                      <div>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.postalCode}</div>
                      <div>Phone: {selectedOrder.shippingAddress.phone || selectedOrder.customerPhone || ''}</div>
                    </>
                  ) : (
                    <div>Same as patron billing address.</div>
                  )}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #090d16', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>#</th>
                    <th style={{ padding: '8px' }}>Item &amp; Description</th>
                    <th style={{ padding: '8px' }}>SKU</th>
                    <th style={{ padding: '8px' }}>HSN Code</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Unit Rate (₹)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((i: any, idx: number) => {
                    const price = i.product?.price || i.price || 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px' }}>{idx + 1}</td>
                        <td style={{ padding: '8px' }}>
                          <strong>{i.product?.name || i.name || 'Pure Silk Saree'}</strong>
                          {i.selectedColor && <div style={{ fontSize: '11px', color: '#64748b' }}>Color: {i.selectedColor}</div>}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'monospace' }}>{getProductSku(i)}</td>
                        <td style={{ padding: '8px' }}>5007 (Silk Sarees)</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{i.quantity}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{price.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{(price * i.quantity).toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px', fontSize: '12px' }}>
                <div style={{ width: '280px', lineHeight: 1.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>₹{(selectedOrder.subtotal || selectedOrder.total).toLocaleString('en-IN')}</span>
                  </div>
                  {selectedOrder.discount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                      <span>Discount ({selectedOrder.appliedCoupon || 'PROMO'}):</span>
                      <span>-₹{selectedOrder.discount.toLocaleString('en-IN')}</span>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Courier Delivery:</span>
                    <span>{selectedOrder.shippingFee === 0 ? 'FREE' : `₹${selectedOrder.shippingFee}`}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Integrated GST (5%):</span>
                    <span>₹{selectedOrder.tax ? selectedOrder.tax.toLocaleString('en-IN') : 'Included'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #090d16', paddingTop: '6px', fontSize: '14px', fontWeight: 900 }}>
                    <span>Net Amount:</span>
                    <span>₹{selectedOrder.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
                <div>
                  <p style={{ margin: 0 }}>This is a computer-generated tax invoice and requires no physical seal.</p>
                  <p style={{ margin: '2px 0 0' }}>Thank you for honoring MUETY heritage craftsmanship.</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #090d16', width: '160px', marginBottom: '4px' }}></div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>

          </div>

          {/* Modal Fixed Footer */}
          <div style={{
            padding: '1rem 1.75rem',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}>
            {selectedOrder.archived ? (
              <button 
                type="button" 
                onClick={() => handleUnarchiveOrder(selectedOrder.id, selectedOrder.orderNumber)} 
                className="btn btn-sm"
                style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ArchiveRestore size={14} /> Restore Order from Archives
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => handleArchiveOrder(selectedOrder.id, selectedOrder.orderNumber)} 
                className="btn btn-sm"
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Archive size={14} /> Archive Order Record
              </button>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => window.print()} 
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Printer size={14} /> Print Invoice &amp; Slip
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedOrderId(null)} 
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700, minWidth: '95px' }}
              >
                Close View
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
};

