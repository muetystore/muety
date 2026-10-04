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
  User
} from 'lucide-react';

export const AdminOrders: React.FC = () => {
  useDocumentTitle('Orders ERP & Fulfillment');
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [orders, setOrders] = useState<Order[]>(storageService.getOrders());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Edit Tracking State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

  useEffect(() => {
    const unsubscribe = orderService.subscribeToAllOrders((liveOrders) => {
      setOrders(liveOrders);
      if (selectedOrder) {
        const matching = liveOrders.find(o => o.id === selectedOrder.id);
        if (matching) setSelectedOrder(matching);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [selectedOrder]);

  const openOrderDetails = (ord: Order) => {
    setSelectedOrder(ord);
    setTrackingNumber(ord.trackingNumber || '');
    setCourier(ord.courier || ord.trackingCarrier || 'Bluedart Express');
    setStatusNote('');
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const updated = await orderService.updateOrderStatus(orderId, newStatus, statusNote || undefined);
    if (updated) {
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }

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
      setSelectedOrder(updated);

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

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Order #</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Customer Patron</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Items Count</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Total (₹)</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
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
                      {ord.items.reduce((s: number, i: any) => s + i.quantity, 0)} saree(s)
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
                      <button onClick={() => openOrderDetails(ord)} className="btn btn-primary btn-sm">
                        <Eye size={14} /> View Order
                      </button>
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
            maxWidth: '850px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
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
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
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

              {/* Order Items Breakdown */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
                  Order Line Items ({selectedOrder.items?.length || 0})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={item.product?.images?.[0] || '/saree_model_individual.jpg'} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--brand-primary)' }}>{item.product?.name || 'MUETY Luxury Silk Saree'}</strong>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Qty: {item.quantity} x ₹{item.product?.price || 0}</span>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                        ₹{((item.product?.price || 0) * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--brand-border)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal</span>
                      <span>₹{(selectedOrder.subtotal || selectedOrder.total).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Shipping Charge</span>
                      <span>₹{(selectedOrder.shippingFee || 100).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                      <span>Grand Total</span>
                      <span>₹{selectedOrder.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.75rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button type="button" onClick={() => setSelectedOrder(null)} className="btn btn-outline">
                Close Order View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
