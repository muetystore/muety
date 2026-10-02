import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { orderService } from '@/features/orders/services/orderService';
import { storageService } from '@/lib/storage/storageService';
import { useNotification } from '@/shared/context/NotificationContext';
import { Order, OrderStatus } from '@/types';
import { 
  Search, 
  Eye, 
  X, 
  Cloud, 
  Loader2, 
  Trash2
} from 'lucide-react';

export const AdminOrders: React.FC = () => {
  useDocumentTitle('MUETY Admin | Orders');
  const { success, error } = useNotification();

  const [orders, setOrders] = useState<Order[]>(storageService.getOrders());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const unsubscribe = orderService.subscribeToAllOrders((liveOrders) => {
      setOrders(liveOrders);
      if (selectedOrder) {
        const matching = liveOrders.find(o => o.id === selectedOrder.id);
        if (matching) setSelectedOrder(matching);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedOrder]);

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
                          (o.orderNumber || '').toLowerCase().includes(q) ||
                          (o.customerName || '').toLowerCase().includes(q) ||
                          (o.customerEmail || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const updated = await orderService.updateOrderStatus(orderId, status, statusNote || undefined);
    if (updated) {
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      success(`Order #${updated.orderNumber} updated to ${status.toUpperCase()}`, 'Status Updated');
      setStatusNote('');
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (window.confirm(`Permanently remove Order #${orderNumber} from Firebase and store records?`)) {
      await orderService.deleteOrder(orderId);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      success(`Order #${orderNumber} removed from Firebase.`, 'Order Removed');
    }
  };

  const handleClearAllOrders = async () => {
    if (window.confirm('Are you sure you want to remove ALL orders from Firebase and store records? This cannot be undone.')) {
      setIsClearing(true);
      try {
        const res = await orderService.clearAllOrdersFromFirestore();
        setSelectedOrder(null);
        success(res.message, 'Orders Cleared');
      } catch (err: any) {
        error(err?.message || 'Failed to clear orders.');
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handlePushAllToFirestore = async () => {
    setIsPushing(true);
    try {
      const result = await orderService.pushAllOrdersToFirestore();
      if (result.success) {
        success(result.message, 'Firestore Synchronized');
      } else {
        error(result.message, 'Sync Failed');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to push orders to Cloud Firestore.');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="admin-orders animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>Client Order Fulfillment</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              FIRESTORE "orders" SYNC ACTIVE
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Process shipments, track carrier assignments, and manage luxury delivery workflows with live instant dispatching.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleClearAllOrders} 
            disabled={isClearing || orders.length === 0}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: '#fca5a5', color: '#ef4444' }}
            title="Remove all orders from Firebase Firestore"
          >
            {isClearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {isClearing ? 'Clearing...' : 'Clear All Orders'}
          </button>

          <button 
            onClick={handlePushAllToFirestore} 
            disabled={isPushing}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'var(--brand-accent)', color: 'var(--brand-primary)' }}
            title="Push all order records directly to Firebase Firestore collection 'orders'"
          >
            {isPushing ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} color="var(--brand-accent)" />}
            {isPushing ? 'Syncing to Cloud...' : `Push Orders to Cloud (${orders.length})`}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', minWidth: '280px', maxWidth: '400px', flex: 1 }}>
          <input 
            type="text" 
            placeholder="Search by order #, client name, email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }} 
          />
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                border: statusFilter === st ? '1.5px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                backgroundColor: statusFilter === st ? 'var(--brand-primary)' : '#ffffff',
                color: statusFilter === st ? '#ffffff' : 'var(--text-primary)',
                transition: 'all var(--transition-fast)'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--brand-muted)' }}>
              <th style={{ padding: '10px 12px' }}>Order #</th>
              <th style={{ padding: '10px 12px' }}>Client</th>
              <th style={{ padding: '10px 12px' }}>Date</th>
              <th style={{ padding: '10px 12px' }}>Total</th>
              <th style={{ padding: '10px 12px' }}>Payment</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(ord => (
              <tr key={ord.id} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  #{ord.orderNumber}
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{ord.customerName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>{ord.customerEmail}</div>
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                  {new Date(ord.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  ₹{ord.total.toFixed(2)}
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                    {ord.paymentStatus.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span className={`badge badge-${ord.orderStatus === 'delivered' ? 'success' : ord.orderStatus === 'shipped' ? 'gold' : 'dark'}`}>
                    {ord.orderStatus.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => setSelectedOrder(ord)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px' }}
                    >
                      <Eye size={14} /> Details
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '6px 8px' }}
                      title="Remove order from Firebase"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details & Status Manager Modal */}
      {selectedOrder && (
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
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              padding: '2.5rem',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--brand-muted)' }}
            >
              <X size={22} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', textTransform: 'uppercase' }}>ORDER DETAILS</span>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--brand-primary)' }}>Order #{selectedOrder.orderNumber}</h2>
              </div>
              <span className={`badge badge-${selectedOrder.orderStatus === 'delivered' ? 'success' : 'gold'}`} style={{ padding: '0.4rem 0.8rem' }}>
                {selectedOrder.orderStatus.toUpperCase()}
              </span>
            </div>

            {/* Status Transition Controls */}
            <div style={{
              backgroundColor: 'var(--bg-main)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--brand-border)',
              marginBottom: '2rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Update Fulfillment Status</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                    className={`btn btn-sm ${selectedOrder.orderStatus === st ? 'btn-primary' : 'btn-outline'}`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Optional custom timeline event note (e.g. Courier airway bill assigned)..."
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Client & Delivery Info */}
            <div className="grid-2" style={{ marginBottom: '2rem', gap: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--brand-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Client Info</h4>
                <div style={{ fontWeight: 600 }}>{selectedOrder.customerName}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Email: {selectedOrder.customerEmail}<br />
                  Phone: {selectedOrder.customerPhone || 'N/A'}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--brand-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Delivery Address</h4>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {selectedOrder.shippingAddress.streetAddress}<br />
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}<br />
                  {selectedOrder.shippingAddress.country}
                </div>
              </div>
            </div>

            {/* Items */}
            <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '6px' }}>
              Purchased Creations ({selectedOrder.items.length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
              {selectedOrder.items.map((it: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <img src={it.product.images[0]} alt="" style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', backgroundColor: '#f8fafc', border: '1px solid var(--brand-border)', padding: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.product.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>
                        Qty: {it.quantity} {it.selectedColor ? `• ${it.selectedColor}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    ₹{(it.product.price * it.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Delete Actions */}
            <div style={{ borderTop: '2px solid var(--brand-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.orderNumber)}
                className="btn btn-outline"
                style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Remove this order permanently from Firebase and store records"
              >
                <Trash2 size={16} /> Remove Order from Firebase
              </button>

              <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Discount:</span>
                    <span>-₹{selectedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax:</span>
                  <span>₹{selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--brand-primary)', borderTop: '1px solid var(--brand-border)', paddingTop: '6px' }}>
                  <span>Total:</span>
                  <span>₹{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
