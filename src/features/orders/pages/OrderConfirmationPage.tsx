import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { orderService } from '@/features/orders/services/orderService';
import { Order } from '@/types';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Package, 
  Printer, 
  Clock
} from 'lucide-react';
import { Logo } from '@/shared/components/ui/Logo';

export const OrderConfirmationPage: React.FC = () => {
  useDocumentTitle('Order Confirmation');
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Fire confetti on mount
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#0f172a', '#e5c07b', '#10b981']
      });
    } catch {
      // safe fallback
    }

    if (!orderId) return;

    // Real-time Firebase Firestore / Multi-tab Subscription
    const unsubscribe = orderService.subscribeToOrder(orderId, (liveOrder) => {
      if (liveOrder) {
        setOrder(liveOrder);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  if (!order) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2>Order Record Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
          We could not locate this order in the MUETY database.
        </p>
        <Link to="/" className="btn btn-primary">Return to MUETY Home</Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="order-confirmation-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div className="container" style={{ maxWidth: '840px', marginTop: '3rem' }}>
        
        {/* Success Banner */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--brand-border)',
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '2rem'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '2px solid #a7f3d0'
          }}>
            <CheckCircle2 size={40} />
          </div>

          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-accent-hover)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ORDER CONFIRMED & IN PREPARATION
          </span>

          <h1 style={{ fontSize: '2.4rem', color: 'var(--brand-primary)', marginTop: '6px', marginBottom: '0.75rem' }}>
            Thank You for Your Patronage
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '540px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Your order <strong>#{order.orderNumber}</strong> has been received by the MUETY atelier concierge. A confirmation email has been dispatched to <strong>{order.customerEmail}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handlePrint} className="btn btn-outline btn-sm">
              <Printer size={16} /> Print Official Receipt
            </button>
            <Link to="/account?tab=orders" className="btn btn-primary btn-sm">
              <Package size={16} /> Track Order in Account
            </Link>
          </div>
        </div>

        {/* Live Status Timeline */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="var(--brand-accent)" />
              Live Order Progress & Tracking
            </h3>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              REALTIME STATUS SYNC
            </span>
          </div>

          {order.trackingNumber && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-main)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--brand-border)',
              marginBottom: '1.5rem',
              fontSize: '0.88rem'
            }}>
              <div>
                <span style={{ color: 'var(--brand-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Carrier & Tracking</span>
                <strong>{order.trackingCarrier}</strong>: {order.trackingNumber}
              </div>
              <span className={`badge badge-${order.orderStatus === 'delivered' ? 'success' : 'dark'}`}>
                {order.orderStatus.toUpperCase()}
              </span>
            </div>
          )}

          {/* Timeline Events */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: '2px solid var(--brand-border)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
            {order.timeline.map((event: any, idx: number) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '-1.95rem',
                  top: '2px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-accent)',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 2px var(--brand-accent)'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{event.label}</h5>
                  <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>{event.timestamp}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{event.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Itemized Invoice Receipt (Printable) */}
        <div id="printable-receipt" className="card" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--brand-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <Logo size="lg" showTagline />
              <div style={{ fontSize: '0.82rem', color: 'var(--brand-muted)', marginTop: '8px' }}>
                MUETY Atelier, 2/32 Ramireddypatti, Salem, Tamil Nadu – 636501, India<br />
                GST / Tax ID: 33AAACM0000A1Z5
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}>COMMERCIAL INVOICE</h3>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Order #{order.orderNumber}<br />
                Date: {new Date(order.createdAt).toLocaleDateString()}<br />
                Status: <strong style={{ color: '#10b981' }}>PAID</strong>
              </div>
            </div>
          </div>

          {/* Shipping & Billing info */}
          <div className="grid-2" style={{ marginBottom: '2rem', gap: '2rem' }}>
            <div>
              <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-muted)', marginBottom: '6px' }}>
                Delivering To
              </h5>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                {order.shippingAddress.fullName}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {order.shippingAddress.streetAddress}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.country}<br />
                Phone: {order.shippingAddress.phone}
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-muted)', marginBottom: '6px' }}>
                Payment Summary
              </h5>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Method: <strong>{order.paymentMethod === 'razorpay' ? 'Razorpay Secure Gateway' : order.paymentMethod.replace(/_/g, ' ').toUpperCase()}</strong><br />
                {order.razorpayPaymentId && (
                  <>Razorpay Ref: <code style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.82rem' }}>{order.razorpayPaymentId}</code><br /></>
                )}
                Payment Status: <strong style={{ color: order.paymentStatus === 'paid' ? '#10b981' : '#f59e0b' }}>
                  {order.paymentStatus === 'paid' ? 'Authorized & Settled' : 'Pending on Handover'}
                </strong><br />
                Applied Promo: <strong>{order.appliedCoupon || 'None'}</strong>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--brand-border)', textAlign: 'left', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--brand-muted)' }}>
                <th style={{ padding: '10px 0' }}>Item Description</th>
                <th style={{ padding: '10px 0', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px 0', textAlign: 'right' }}>Unit Price</th>
                <th style={{ padding: '10px 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--brand-border)', fontSize: '0.92rem' }}>
                  <td style={{ padding: '14px 0' }}>
                    <div style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{item.product.name}</div>
                    {(item.selectedColor || item.selectedSize) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                        {item.selectedColor} {item.selectedSize ? `• ${item.selectedSize}` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 0', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '14px 0', textAlign: 'right' }}>₹{item.product.price.toFixed(2)}</td>
                  <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: 700 }}>
                    ₹{(item.product.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Discount ({order.appliedCoupon}):</span>
                  <span>-₹{order.discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Express Shipping:</span>
                <span>{order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee.toFixed(2)}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Estimated Tax:</span>
                <span>₹{order.tax.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '2px solid var(--brand-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: 'var(--brand-primary)' }}>
                <span>Total Paid:</span>
                <span>₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <Link to="/" className="btn btn-primary">
            Continue Exploring MUETY &rarr;
          </Link>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};
