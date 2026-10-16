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
  Cloud, 
  Loader2, 
  Trash2,
  Truck,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

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

  useEffect(() => {
    setLoading(true);
    setQueryError(null);

    const unsubscribe = orderService.subscribeToAllOrders(
      (liveOrders) => {
        setOrders(liveOrders);
        setLoading(false);
        setQueryError(null);
      },
      (err) => {
        setLoading(false);
        setQueryError(`Firestore Query / Permission Error: ${err?.message || 'Unable to sync live orders.'}`);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const openOrderDetails = (ord: Order) => {
    setSelectedOrderId(ord.id);
    setTrackingNumber(ord.trackingNumber || '');
    setCourier(ord.courier || ord.trackingCarrier || 'Bluedart Express');
    setStatusNote('');
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const updated = await orderService.updateOrderStatus(orderId, newStatus, statusNote || undefined);
    if (updated) {
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));

      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'order_manager',
        actorRole: getUserRoles(user)[0] || 'order_manager',
        action: 'ORDER_STATUS_CHANGED',
        entityType: 'ORDER',
        entityId: orderId,
        reason: `Changed order #${updated.orderNumber} status to ${newStatus}`
      });

      success(`Order #${updated.orderNumber} status updated to ${newStatus.toUpperCase()}`);
      setStatusNote('');
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsUpdatingTracking(true);
    try {
      const updated: Order = {
        ...selectedOrder,
        trackingNumber: trackingNumber.trim(),
        courier: courier.trim(),
        trackingCarrier: courier.trim(),
        updatedAt: new Date().toISOString()
      };

      storageService.createOrder(updated);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));

      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'order_manager',
        actorRole: getUserRoles(user)[0] || 'order_manager',
        action: 'ORDER_FULFILLMENT_UPDATED',
        entityType: 'ORDER',
        entityId: selectedOrder.id,
        reason: `Updated shipping courier (${courier}) and tracking number (${trackingNumber})`
      });

      success(`Updated shipping tracking details for Order #${selectedOrder.orderNumber}`);
    } catch (err: any) {
      error(err?.message || 'Failed to update tracking info.');
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNum: string) => {
    const confirmed = window.confirm(`Permanently remove Order #${orderNum} from store records? This action cannot be reversed.`);
    if (!confirmed) return;

    try {
      await orderService.deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrderId === orderId) {
        setSelectedOrderId(null);
      }

      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'order_manager',
        actorRole: getUserRoles(user)[0] || 'order_manager',
        action: 'ORDER_DELETED',
        entityType: 'ORDER',
        entityId: orderId,
        reason: `Admin deleted order #${orderNum}`
      });

      success(`Order #${orderNum} successfully removed from records.`);
    } catch (err: any) {
      error(err?.message || 'Failed to delete order.');
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
    const confirmed = window.confirm(`Found ${testOrders.length} automated test order(s). Purge them all now?`);
    if (!confirmed) return;

    try {
      for (const tOrd of testOrders) {
        await orderService.deleteOrder(tOrd.id);
      }
      setOrders(prev => prev.filter(o => !testOrders.some(t => t.id === o.id)));
      if (testOrders.some(t => t.id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
      success(`Successfully purged ${testOrders.length} test order(s).`);
    } catch (err: any) {
      error(err?.message || 'Failed to purge test orders.');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerEmail || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-orders animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Fulfillment & Order ERP Operations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Dispatch tracking, order status lifecycle management, and customer delivery snapshots.
          </p>
        </div>
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
            style={{ backgroundColor: '#dc2626', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} /> Purge Automated Test Orders
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
          style={{ width: '220px', margin: 0 }}
        >
          <option value="all">All Order Statuses ({orders.length})</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out For Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
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
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Items Count & SKU</th>
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
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Truck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No client orders found matching current filters.</p>
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
                      {new Date(ord.createdAt).toLocaleDateString()}
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
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button onClick={() => openOrderDetails(ord)} className="btn btn-primary btn-sm">
                          <Eye size={14} /> View Order
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)} 
                          className="btn btn-sm"
                          title="Delete Order"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            padding: '6px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER DETAIL & FULFILLMENT MODAL */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrderId(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: '#090d16',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: 'var(--font-heading)' }}>
                  Order #{selectedOrder.orderNumber}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#d4af37' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedOrderId(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                aria-label="Close Order Details"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Order Status & Quick Change */}
              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Current Fulfillment Status</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '2px' }}>
                    {selectedOrder.orderStatus.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="form-input"
                    style={{ margin: 0, width: '200px' }}
                  >
                    <option value="pending_payment">Pending Payment</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="out_for_delivery">Out For Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Courier & Tracking Form */}
              <form onSubmit={handleSaveTracking} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={18} color="var(--brand-accent)" /> Dispatch Courier & Tracking Details
                </h4>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Courier Carrier Name</label>
                    <input 
                      type="text" 
                      value={courier} 
                      onChange={e => setCourier(e.target.value)} 
                      placeholder="e.g. Bluedart / DTDC / India Post" 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Waybill / Tracking Reference #</label>
                    <input 
                      type="text" 
                      value={trackingNumber} 
                      onChange={e => setTrackingNumber(e.target.value)} 
                      placeholder="e.g. BD-9940182741" 
                      className="form-input" 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={isUpdatingTracking}>
                    {isUpdatingTracking ? 'Saving...' : 'Update Tracking Details'}
                  </button>
                </div>
              </form>

              {/* Client & Address Snapshot */}
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} color="var(--brand-accent)" /> Patron Profile Snapshot
                  </h4>
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                    <strong>Name:</strong> {selectedOrder.customerName}<br />
                    <strong>Email:</strong> {selectedOrder.customerEmail}<br />
                    {selectedOrder.customerPhone && <><strong>Phone:</strong> {selectedOrder.customerPhone}<br /></>}
                    <strong>Payment Method:</strong> {(selectedOrder.paymentMethod || 'Razorpay').toUpperCase()}<br />
                    <strong>Payment Status:</strong> <span style={{ color: selectedOrder.paymentStatus === 'paid' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{(selectedOrder.paymentStatus || 'paid').toUpperCase()}</span>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} color="var(--brand-accent)" /> Shipping Address Snapshot
                  </h4>
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    {selectedOrder.shippingAddress ? (
                      <>
                        <strong>{selectedOrder.shippingAddress.fullName}</strong><br />
                        {selectedOrder.shippingAddress.streetAddress}{selectedOrder.shippingAddress.apartment ? `, ${selectedOrder.shippingAddress.apartment}` : ''}<br />
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} – {selectedOrder.shippingAddress.postalCode}<br />
                        Phone: {selectedOrder.shippingAddress.phone}
                      </>
                    ) : 'Standard Registered Atelier Address'}
                  </div>
                </div>
              </div>

              {/* Order Items Breakdown with SKU details */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)' }}>
                    Order Line Items & Saree SKU Specifications ({selectedOrder.items?.length || 0})
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Official Master Catalog Verified
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(selectedOrder.items || []).map((item, idx) => {
                    const sku = getProductSku(item);
                    const prodName = item.product?.name || (item as any).name || 'MUETY Luxury Silk Saree';
                    const prodImage = item.product?.images?.[0] || (item as any).image || '/saree_model_individual.jpg';
                    const unitPrice = item.product?.price || (item as any).price || 0;
                    const lineTotal = unitPrice * (item.quantity || 1);
                    const categoryName = item.product?.category || 'Festive Silk Sarees';

                    return (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        padding: '12px 14px',
                        backgroundColor: '#ffffff'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                          <img 
                            src={prodImage} 
                            alt={prodName} 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/saree_model_individual.jpg'; }}
                            style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', flexShrink: 0 }} 
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
                                fontSize: '0.8rem', 
                                fontWeight: 700,
                                letterSpacing: '0.04em'
                              }}>
                                SKU: {sku}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span><strong>Category:</strong> {categoryName}</span>
                              <span><strong>Qty:</strong> {item.quantity} × ₹{unitPrice.toLocaleString('en-IN')}</span>
                              {item.selectedColor && (
                                <span><strong>Shade:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.selectedColor}</span></span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1rem', flexShrink: 0, paddingLeft: '12px' }}>
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--brand-border)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal</span>
                      <span>₹{(selectedOrder.subtotal || selectedOrder.total).toLocaleString('en-IN')}</span>
                    </div>
                    {selectedOrder.discount ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                        <span>Discount ({selectedOrder.appliedCoupon || 'Coupon'})</span>
                        <span>-₹{selectedOrder.discount.toLocaleString('en-IN')}</span>
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Shipping (Pan-India Tracked Courier)</span>
                      <span>₹{(selectedOrder.shippingFee !== undefined ? selectedOrder.shippingFee : 89).toLocaleString('en-IN')}</span>
                    </div>
                    {selectedOrder.tax ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tax (GST)</span>
                        <span>₹{selectedOrder.tax.toLocaleString('en-IN')}</span>
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                      <span>Grand Total</span>
                      <span>₹{selectedOrder.total.toLocaleString('en-IN')}</span>
                    </div>

                    {selectedOrder.paymentMethod === 'cash_on_delivery' && (
                      <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#92400e', fontWeight: 600 }}>
                          <span>COD Online Courier Advance:</span>
                          <span>₹{(selectedOrder.codAdvanceAmount || 89).toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78350f', fontWeight: 800, marginTop: '2px' }}>
                          <span>Balance Due from Customer on Delivery:</span>
                          <span>₹{(selectedOrder.codBalanceDue ?? (selectedOrder.total - 89)).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}

                    {selectedOrder.cancellationRequested && (
                      <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '0.85rem' }}>
                        <strong style={{ color: '#991b1b', display: 'block' }}>⚠️ Patron Requested Cancellation</strong>
                        <span style={{ color: '#7f1d1d' }}>Reason: {selectedOrder.cancellationReason || 'Patron requested order cancellation prior to dispatch.'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.75rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.orderNumber)} 
                className="btn btn-sm"
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} /> Delete Order Record
              </button>
              <button type="button" onClick={() => setSelectedOrderId(null)} className="btn btn-outline">
                Close Order View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
