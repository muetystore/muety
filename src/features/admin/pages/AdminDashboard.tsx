import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { storageService } from '@/lib/storage/storageService';
import { orderService } from '@/features/orders/services/orderService';
import { productService } from '@/features/catalog/services/productService';
import { useNotification } from '@/shared/context/NotificationContext';
import { 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  Plus,
  CloudUpload
} from 'lucide-react';
import { Order, Product } from '@/types';

export const AdminDashboard: React.FC = () => {
  useDocumentTitle('Admin Dashboard');
  const { success, error } = useNotification();

  const [orders, setOrders] = useState<Order[]>(storageService.getOrders());
  const [products, setProducts] = useState<Product[]>(storageService.getProducts());
  const [, setUsers] = useState(storageService.getUsers());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await productService.syncAllToFirebase();
      success(`Uploaded ${res.count} product(s) to your live Firebase Cloud Firestore!`, 'Firebase Synchronized');
    } catch (err: any) {
      error(err.message || 'Failed to sync to Firebase');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const unsubOrders = orderService.subscribeToAllOrders((liveOrders) => {
      setOrders(liveOrders);
    });

    const unsubProducts = productService.subscribeToProducts((liveProducts) => {
      setProducts(liveProducts);
      setUsers(storageService.getUsers());
    });

    return () => {
      if (typeof unsubOrders === 'function') unsubOrders();
      if (typeof unsubProducts === 'function') unsubProducts();
    };
  }, []);

  // Compute Accurate ERP & CRM Metrics from real Firestore / order store
  const totalRevenue = orders.reduce((sum, o) => o.orderStatus !== 'cancelled' ? sum + o.total : sum, 0);
  const totalOrders = orders.length;
  const nonCancelledOrders = orders.filter(o => o.orderStatus !== 'cancelled');
  const aov = nonCancelledOrders.length > 0 ? totalRevenue / nonCancelledOrders.length : 0;
  const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 5));
  const pendingOrders = orders.filter(o => ['pending', 'pending_payment', 'confirmed', 'processing'].includes(o.orderStatus));
  const uniqueCustomersCount = new Set(orders.map(o => o.customerEmail || o.customerId)).size;

  const handleQuickStatusUpdate = async (orderId: string, newStatus: Order['orderStatus']) => {
    await orderService.updateOrderStatus(orderId, newStatus);
    success(`Order status updated to ${newStatus.toUpperCase()}`, 'Order Updated');
  };

  return (
    <div className="admin-dashboard animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Welcome & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Executive Control & ERP Operations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Real-time catalog performance, inventory monitoring, and fulfillment tracking for MUETY.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleSyncToCloud}
            disabled={isSyncing}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff' }}
            title="Upload and sync all catalog items to Firebase Cloud Firestore"
          >
            <CloudUpload size={16} color="#2563eb" className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : `Push All to Firestore (${products.length})`}
          </button>

          <Link to="/admin/products" className="btn btn-primary btn-sm">
            <Plus size={16} /> New Product Creation
          </Link>
        </div>
      </div>

      {/* 4 Core Financial & ERP Metric Cards */}
      <div className="grid-4" style={{ gap: '1.5rem' }}>
        
        {/* Metric 1: Total Net Sales */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gross Sales
            </span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 'auto', paddingTop: '8px' }}>
            {nonCancelledOrders.length === 0 ? 'Waiting for first order' : `AOV: ₹${aov.toFixed(2)} (${nonCancelledOrders.length} order${nonCancelledOrders.length > 1 ? 's' : ''})`}
          </div>
        </div>

        {/* Metric 2: Completed / Total Orders */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Orders
            </span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', color: 'var(--brand-accent-hover)' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            {totalOrders}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 'auto', paddingTop: '8px' }}>
            {pendingOrders.length} pending fulfillment
          </div>
        </div>

        {/* Metric 3: Active Catalog & Clients */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Catalog
            </span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', color: 'var(--brand-primary)' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            {products.length} Products
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 'auto', paddingTop: '8px' }}>
            {uniqueCustomersCount > 0 ? `${uniqueCustomersCount} unique ordering patron(s)` : 'No client purchases yet'}
          </div>
        </div>


        {/* Metric 4: Low Stock Alert */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderColor: lowStockProducts.length > 0 ? '#fef08a' : 'var(--brand-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Low Stock Alerts
            </span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#f59e0b' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: lowStockProducts.length > 0 ? '#f59e0b' : 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
            {lowStockProducts.length} Items
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', marginTop: 'auto', paddingTop: '8px' }}>
            {lowStockProducts.length > 0 ? 'Requires artisan replenishment' : 'All stocks optimal'}
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockProducts.length > 0 && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fef08a',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#92400e' }}>
                Inventory Alert: {lowStockProducts.length} products have 5 or fewer units remaining.
              </div>
              <div style={{ fontSize: '0.82rem', color: '#b45309' }}>
                {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
              </div>
            </div>
          </div>
          <Link to="/admin/products" className="btn btn-outline-gold btn-sm" style={{ backgroundColor: '#ffffff' }}>
            Manage Inventory
          </Link>
        </div>
      )}

      {/* Live Atelier Creations Showcase */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: 0 }}>Active Atelier Creations ({products.length})</h3>
            <p style={{ color: 'var(--brand-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>Live inventory catalog synchronized with Firestore cloud.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/admin/products" className="btn btn-outline-gold btn-sm">
              Manage Products <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--brand-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Product</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>SKU</th>
                <th style={{ padding: '10px 12px' }}>Price</th>
                <th style={{ padding: '10px 12px' }}>Stock</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 6).map(prod => (
                <tr key={prod.id} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                  <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid var(--brand-border)', flexShrink: 0 }}>
                      <img src={(prod.images && prod.images[0]) || '/saree_model_individual.jpg'} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--brand-primary)', fontSize: '0.9rem', display: 'block' }}>{prod.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>{(prod.images?.length || 1)} photo(s) in gallery</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>{prod.category}</span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--brand-muted)', fontSize: '0.85rem' }}>
                    {prod.sku}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    ₹{(prod.price || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontWeight: 600, color: (prod.stock || 0) <= 3 ? '#ef4444' : (prod.stock || 0) <= 10 ? '#f59e0b' : '#10b981' }}>
                      {prod.stock || 0} in stock
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {prod.featured && <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>Featured</span>}
                      {prod.isNewArrival && <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>New</span>}
                      {!prod.featured && !prod.isNewArrival && <span style={{ color: 'var(--brand-muted)', fontSize: '0.78rem' }}>Standard</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <Link to="/admin/products" className="btn btn-outline btn-sm" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                      Edit in Products
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)' }}>Recent Client Orders</h3>
            <p style={{ color: 'var(--brand-muted)', fontSize: '0.85rem' }}>Live order status and dispatch management.</p>
          </div>
          <Link to="/admin/orders" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-accent-hover)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All Orders <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--brand-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Order ID</th>
                <th style={{ padding: '10px 12px' }}>Client</th>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Items</th>
                <th style={{ padding: '10px 12px' }}>Total</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Quick Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map(ord => (
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
                  <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                    {ord.items.reduce((s: number, i: any) => s + i.quantity, 0)} units
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    ₹{ord.total.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span className={`badge badge-${ord.orderStatus === 'delivered' ? 'success' : ord.orderStatus === 'shipped' ? 'gold' : 'dark'}`}>
                      {ord.orderStatus.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <select
                      value={ord.orderStatus}
                      onChange={(e) => handleQuickStatusUpdate(ord.id, e.target.value as any)}
                      className="form-select"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem', display: 'inline-block' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
