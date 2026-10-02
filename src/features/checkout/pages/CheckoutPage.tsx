import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useCart } from '@/shared/context/CartContext';
import { useAuth } from '@/shared/context/AuthContext';
import { orderService } from '@/features/orders/services/orderService';
import { razorpayService } from '@/lib/payments/razorpayService';
import { useNotification } from '@/shared/context/NotificationContext';
import { 
  ShieldCheck, 
  Lock, 
  Zap, 
  Check, 
  QrCode,
  Building2
} from 'lucide-react';
import { Address } from '@/shared/types';

export const CheckoutPage: React.FC = () => {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    items, 
    subtotal, 
    discountAmount, 
    appliedCoupon, 
    shippingFee, 
    taxAmount, 
    grandTotal, 
    clearCart 
  } = useCart();
  const { error, success } = useNotification();

  // Form State
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.displayName || user?.defaultAddress?.fullName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || user?.defaultAddress?.phone || '');
  const [streetAddress, setStreetAddress] = useState(user?.defaultAddress?.streetAddress || '');
  const [city, setCity] = useState(user?.defaultAddress?.city || '');
  const [state, setState] = useState(user?.defaultAddress?.state || '');
  const [postalCode, setPostalCode] = useState(user?.defaultAddress?.postalCode || '');
  const [country, setCountry] = useState(user?.defaultAddress?.country || 'India');
  
  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2>Your Bag is Empty</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link to="/products" className="btn btn-primary">Return to Catalog</Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !fullName || !phone || !streetAddress || !city || !postalCode) {
      error('Please complete all required shipping and contact fields.');
      return;
    }

    const shippingAddress: Address = {
      fullName,
      phone,
      streetAddress,
      city,
      state,
      postalCode,
      country
    };

    const finalShipping = shippingMethod === 'express' ? shippingFee + 20 : shippingFee;
    const finalTotal = Number((subtotal - discountAmount + taxAmount + finalShipping).toFixed(2));

    setIsProcessing(true);

    // Open Razorpay Payment Gateway
    await razorpayService.openCheckout({
      amount: finalTotal,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      onSuccess: async (razorpayResponse) => {
        try {
          const newOrder = await orderService.createOrder({
            customerId: user?.uid || `guest-${Date.now()}`,
            customerName: fullName,
            customerEmail: email,
            customerPhone: phone,
            shippingAddress,
            items,
            subtotal,
            discount: discountAmount,
            appliedCoupon: appliedCoupon?.code,
            tax: taxAmount,
            shippingFee: finalShipping,
            total: finalTotal,
            paymentMethod: 'razorpay',
            paymentStatus: 'paid',
            razorpayPaymentId: razorpayResponse.razorpay_payment_id,
            notes: `Razorpay Payment Authorization ID: ${razorpayResponse.razorpay_payment_id}`
          });

          clearCart();
          success(`Payment authorized via Razorpay (${razorpayResponse.razorpay_payment_id}). Order confirmed!`, 'Order Confirmed');
          navigate(`/order-confirmation/${newOrder.id}`);
        } catch (err: any) {
          error(err.message || 'Failed to record order. Please contact support.');
          setIsProcessing(false);
        }
      },
      onFailure: (err) => {
        error(err?.description || 'Razorpay transaction was cancelled or declined.');
        setIsProcessing(false);
      },
      onDismiss: () => {
        setIsProcessing(false);
      }
    });
  };

  return (
    <div className="checkout-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Checkout Header */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--brand-border)', padding: '1.5rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>MUETY Express Checkout</h1>
            <span style={{ fontSize: '0.85rem', color: 'var(--brand-muted)' }}>Encrypted 256-Bit SSL Connection & Real-Time Vault Dispatch</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
              <Lock size={16} /> Secure Payment Vault
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
              <ShieldCheck size={16} color="var(--brand-accent)" /> 100% Transit Insured
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2.5rem' }}>
        <form onSubmit={handlePlaceOrder}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '3rem',
            alignItems: 'start'
          }} className="checkout-grid">
            
            {/* Left: Shipping & Payment Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* 1. Contact Info */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '24px', height: '24px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', borderRadius: '50%', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  Contact Information
                </h3>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      required 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      className="form-input" 
                    />
                  </div>
                </div>
              </div>

              {/* 2. Shipping Address */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '24px', height: '24px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', borderRadius: '50%', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                  Delivery Address
                </h3>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address *</label>
                  <input 
                    type="text" 
                    required 
                    value={streetAddress} 
                    onChange={e => setStreetAddress(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input 
                      type="text" 
                      required 
                      value={city} 
                      onChange={e => setCity(e.target.value)} 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State / Province</label>
                    <input 
                      type="text" 
                      value={state} 
                      onChange={e => setState(e.target.value)} 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postal / ZIP *</label>
                    <input 
                      type="text" 
                      required 
                      value={postalCode} 
                      onChange={e => setPostalCode(e.target.value)} 
                      className="form-input" 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Country / Region</label>
                  <select 
                    value={country} 
                    onChange={e => setCountry(e.target.value)} 
                    className="form-select"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Japan">Japan</option>
                  </select>
                </div>
              </div>

              {/* 3. Delivery Method */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '24px', height: '24px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', borderRadius: '50%', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                  Shipping Service
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: shippingMethod === 'standard' ? '2px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                    backgroundColor: shippingMethod === 'standard' ? 'var(--bg-main)' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="radio" 
                        name="shippingMethod" 
                        checked={shippingMethod === 'standard'} 
                        onChange={() => setShippingMethod('standard')} 
                        style={{ accentColor: '#0f172a' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>MUETY Global Express (2-4 Business Days)</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>Signature-required tracked courier</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700 }}>{shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}</span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: shippingMethod === 'express' ? '2px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                    backgroundColor: shippingMethod === 'express' ? 'var(--bg-main)' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="radio" 
                        name="shippingMethod" 
                        checked={shippingMethod === 'express'} 
                        onChange={() => setShippingMethod('express')} 
                        style={{ accentColor: '#0f172a' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Priority White-Glove Overnight</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>Direct morning dispatch + insurance</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700 }}>₹{(shippingFee + 20).toFixed(2)}</span>
                  </label>
                </div>
              </div>

              {/* 4. Payment Options (Razorpay Secure Gateway) */}
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', borderRadius: '50%', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                    Payment Vault
                  </h3>
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> RAZORPAY 256-BIT ENCRYPTED
                  </span>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-main)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5.px solid rgba(37, 99, 235, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#2563eb', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                        RAZORPAY
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        India & Global Multi-Channel Gateway
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Zero Surcharge
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Zap size={14} color="#2563eb" /> Instant UPI
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>GPay, PhonePe, Paytm, BHIM, QR</div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <ShieldCheck size={14} color="var(--brand-accent)" /> Cards & EMI
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>Visa, MasterCard, RuPay, Amex</div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Building2 size={14} color="var(--brand-primary)" /> NetBanking
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>50+ Major Banks Supported</div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <QrCode size={14} color="var(--brand-primary)" /> Wallets & PayLater
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>Amazon Pay, Mobikwik, Simpl</div>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.06)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Lock size={14} color="#2563eb" />
                    <span>Clicking <strong>Pay with Razorpay</strong> will securely open the payment gateway.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary Breakdown */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--brand-border)',
              padding: '2rem',
              boxShadow: 'var(--shadow-md)',
              position: 'sticky',
              top: '100px'
            }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
                Your Atelier Selection ({items.length})
              </h3>

              {/* Items Mini List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '4px' }}>
                {items.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img 
                      src={item.product.images[0]} 
                      alt={item.product.name} 
                      style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', backgroundColor: '#f8fafc', border: '1px solid var(--brand-border)', padding: '2px' }} 
                    />
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-primary)', lineHeight: 1.3 }}>
                        {item.product.name}
                      </h5>
                      <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>
                        Qty: {item.quantity} {item.selectedColor ? `• ${item.selectedColor}` : ''}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--brand-border)', paddingTop: '1.25rem', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span style={{ fontWeight: 700 }}>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Shipping</span>
                  <span style={{ fontWeight: 600 }}>
                    {shippingMethod === 'express' ? `₹${(shippingFee + 20).toFixed(2)}` : (shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Tax</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{taxAmount.toFixed(2)}</span>
                </div>

                <div style={{
                  borderTop: '2px solid var(--brand-border)',
                  paddingTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>Total Due</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)' }}>
                    ₹{(grandTotal + (shippingMethod === 'express' ? 20 : 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="btn btn-accent btn-lg"
                style={{ 
                  width: '100%', 
                  height: '54px', 
                  fontSize: '1.05rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #d4af37 100%)'
                }}
              >
                {isProcessing ? (
                  'Securing Razorpay Gateway...'
                ) : (
                  <>Pay with Razorpay • ₹{(grandTotal + (shippingMethod === 'express' ? 20 : 0)).toFixed(2)}</>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '1rem', fontSize: '0.78rem', color: 'var(--brand-muted)' }}>
                <ShieldCheck size={16} color="#10b981" />
                <span>30-Day Money-Back Guarantee</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .checkout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
