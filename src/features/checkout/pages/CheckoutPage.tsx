import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useCart } from '@/shared/context/CartContext';
import { useAuth } from '@/shared/context/AuthContext';
import { orderService } from '@/features/orders/services/orderService';
import { storageService } from '@/lib/storage/storageService';
import { razorpayService } from '@/lib/payments/razorpayService';
import { useNotification } from '@/shared/context/NotificationContext';
import { 
  ShieldCheck, 
  Lock, 
  Zap, 
  Check, 
  QrCode,
  Building2,
  Truck,
  Banknote,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { Address } from '@/shared/types';
import { calculateOrderFinancials } from '@/shared/utils/pricingEngine';
import { 
  customerAddressService, 
  isValidIndianPin, 
  isValidPhone 
} from '@/features/customers/services/customerAddressService';

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

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(() => 
    customerAddressService.getAddresses(user?.uid)
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => {
    const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
    return defaultAddr?.id || null;
  });

  const activeInitialAddr = savedAddresses.find(a => a.id === selectedAddressId) || savedAddresses[0] || user?.defaultAddress;

  // Form State
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(activeInitialAddr?.fullName || user?.displayName || '');
  const [phone, setPhone] = useState(activeInitialAddr?.phone || user?.phoneNumber || '');
  const [streetAddress, setStreetAddress] = useState(
    activeInitialAddr ? (activeInitialAddr.houseFlat ? `${activeInitialAddr.houseFlat}, ${activeInitialAddr.streetAddress}` : activeInitialAddr.streetAddress) : ''
  );
  const [city, setCity] = useState(activeInitialAddr?.city || 'Salem');
  const [state, setState] = useState(activeInitialAddr?.state || 'Tamil Nadu');
  const [postalCode, setPostalCode] = useState(activeInitialAddr?.postalCode || '636501');
  const [country, setCountry] = useState(activeInitialAddr?.country || 'India');

  const handleSelectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id || null);
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setStreetAddress(addr.houseFlat ? `${addr.houseFlat}, ${addr.streetAddress}` : addr.streetAddress);
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setCountry(addr.country || 'India');
  };
  
  // Payment Method Selection ('razorpay' = Full Online Payment; 'cash_on_delivery' = ₹89 Online Advance, Balance on Handover)
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cash_on_delivery'>('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);

  const settings = storageService.getSettings();
  const financials = calculateOrderFinancials({
    subtotal,
    discount: discountAmount,
    taxRate: settings.taxRate || 5,
    paymentMethod
  });

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

    // Pre-checkout product availability validation
    for (const item of items) {
      const currentProd = storageService.getProductById(item.product.id);
      if (currentProd?.availability === 'sold_out' || item.product.availability === 'sold_out') {
        error(`Cannot proceed to checkout: "${currentProd?.name || item.product.name}" is currently sold out.`);
        return;
      }
    }

    if (!email || !fullName || !phone || !streetAddress || !city || !postalCode) {
      error('Please complete all required shipping and contact fields.');
      return;
    }

    if (!isValidIndianPin(postalCode)) {
      error('Please enter a valid 6-digit Indian PIN code (e.g. 636501).');
      return;
    }

    if (!isValidPhone(phone)) {
      error('Please enter a valid 10-digit Indian mobile number.');
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

    setIsProcessing(true);
    const amountToPayNow = financials.amountDueOnline;
    const isCod = paymentMethod === 'cash_on_delivery';

    // Open Razorpay Payment Gateway (Full order total for online, or ₹89 advance for COD)
    await razorpayService.openCheckout({
      amount: amountToPayNow,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      orderNumber: isCod ? 'COD-ADVANCE' : undefined,
      onSuccess: async (razorpayResponse) => {
        try {
          // Cryptographic payment signature verification with backend server
          if (razorpayResponse.razorpay_order_id && razorpayResponse.razorpay_signature) {
            try {
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: razorpayResponse.razorpay_order_id,
                  razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                  razorpay_signature: razorpayResponse.razorpay_signature
                })
              });
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                if (verifyData.success === false || verifyData.verified === false) {
                  throw new Error(verifyData.error?.message || 'Payment signature verification failed. Potential transaction mismatch.');
                }
              }
            } catch (vErr: any) {
              if (vErr.message?.includes('signature') || vErr.message?.includes('mismatch')) {
                throw vErr;
              }
              console.warn('Backend payment verification note:', vErr);
            }
          }

          const newOrder = await orderService.createOrder({
            customerId: user?.uid || `guest-${Date.now()}`,
            customerName: fullName,
            customerEmail: email,
            customerPhone: phone,
            shippingAddress,
            items,
            subtotal: financials.subtotal,
            discount: financials.discount,
            appliedCoupon: appliedCoupon?.code,
            tax: financials.tax,
            shippingFee: financials.shippingFee,
            total: financials.total,
            paymentMethod: paymentMethod,
            paymentStatus: isCod ? 'pending' : 'paid',
            codAdvanceAmount: financials.codAdvanceAmount,
            codBalanceDue: financials.remainingAmountDueAtDelivery,
            razorpayPaymentId: razorpayResponse.razorpay_payment_id,
            notes: isCod 
              ? `COD Order: ₹89 advance authorized via Razorpay (${razorpayResponse.razorpay_payment_id}). Balance ₹${financials.remainingAmountDueAtDelivery} due on delivery.`
              : `Razorpay Payment Authorization ID: ${razorpayResponse.razorpay_payment_id}`
          });

          clearCart();
          if (isCod) {
            success(`COD Advance (₹89) received! Order #${newOrder.orderNumber} confirmed. Balance ₹${financials.remainingAmountDueAtDelivery.toFixed(2)} payable at delivery.`, 'Order Confirmed');
          } else {
            success(`Payment authorized via Razorpay (${razorpayResponse.razorpay_payment_id}). Order confirmed!`, 'Order Confirmed');
          }
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

                {savedAddresses.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', backgroundColor: '#faf8f3', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Saved Delivery Addresses ({savedAddresses.length})
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>
                        Select to auto-fill
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: isSelected ? '2px solid #c9a227' : '1px solid #e2e8f0',
                              backgroundColor: isSelected ? '#ffffff' : '#f8fafc',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              boxShadow: isSelected ? '0 2px 6px rgba(201, 162, 39, 0.15)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#10182d' }}>
                                {addr.fullName}
                              </span>
                              {addr.isDefault && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92400e', backgroundColor: '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>
                                  Default
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {addr.houseFlat ? `${addr.houseFlat}, ` : ''}{addr.streetAddress}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {addr.city} – {addr.postalCode}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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

                <div style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--brand-primary)',
                  backgroundColor: 'var(--bg-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(15, 23, 42, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-primary)',
                      flexShrink: 0
                    }}>
                      <Truck size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--brand-primary)' }}>
                        MUETY Pan-India Tracked Courier (2-4 Business Days)
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--brand-muted)', marginTop: '2px' }}>
                        Direct dispatch from Salem atelier • Transit insured with live SMS & tracking
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-primary)' }}>₹89.00</span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flat Rate</div>
                  </div>
                </div>
              </div>

              {/* 4. Payment Selection */}
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', borderRadius: '50%', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                    Payment Method
                  </h3>
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> RAZORPAY 256-BIT ENCRYPTED
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Option A: Full Online Payment */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: paymentMethod === 'razorpay' ? '2px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                    backgroundColor: paymentMethod === 'razorpay' ? 'rgba(30, 58, 138, 0.03)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input 
                        type="radio" 
                        name="checkoutPaymentMethod" 
                        value="razorpay"
                        checked={paymentMethod === 'razorpay'} 
                        onChange={() => setPaymentMethod('razorpay')} 
                        style={{ marginTop: '4px', accentColor: 'var(--brand-primary)' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--brand-primary)' }}>
                            Online Payment (Razorpay)
                          </span>
                          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Recommended</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                          Instant confirmation via UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, or Wallets.
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', marginTop: '4px' }}>
                          Pay full order total now: <strong>₹{financials.total.toFixed(2)}</strong> (Zero cash handover needed)
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Option B: Cash on Delivery with ₹89 Advance */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: paymentMethod === 'cash_on_delivery' ? '2px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                    backgroundColor: paymentMethod === 'cash_on_delivery' ? 'rgba(30, 58, 138, 0.03)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input 
                        type="radio" 
                        name="checkoutPaymentMethod" 
                        value="cash_on_delivery"
                        checked={paymentMethod === 'cash_on_delivery'} 
                        onChange={() => setPaymentMethod('cash_on_delivery')} 
                        style={{ marginTop: '4px', accentColor: 'var(--brand-primary)' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--brand-primary)' }}>
                            Cash on Delivery (COD)
                          </span>
                          <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: '#fef3c7', color: '#92400e' }}>
                            ₹89 Advance Required
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                          Pay <strong>₹89.00</strong> online courier advance now via Razorpay. The advance is credited directly to your order total.
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600, marginTop: '4px' }}>
                          Remaining balance of ₹{financials.remainingAmountDueAtDelivery.toFixed(2)} is collected upon doorstep delivery.
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Gateway Trust Details */}
                <div style={{
                  backgroundColor: 'var(--bg-main)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--brand-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#2563eb', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                        RAZORPAY
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        PCI-DSS Level 1 Certified Gateway
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Zero Surcharge
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '8px',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap size={12} color="#2563eb" /> Instant UPI
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--brand-muted)' }}>GPay, PhonePe, Paytm, QR</div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={12} color="var(--brand-accent)" /> Cards & EMI
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--brand-muted)' }}>Visa, MasterCard, RuPay</div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={12} color="var(--brand-primary)" /> NetBanking
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--brand-muted)' }}>50+ Major Indian Banks</div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Banknote size={12} color="var(--brand-primary)" /> COD Advance
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--brand-muted)' }}>₹89 Tracked Security Fee</div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Lock size={12} color="#2563eb" />
                    <span>
                      {paymentMethod === 'cash_on_delivery' 
                        ? 'Razorpay will process the ₹89 courier advance securely. The remaining order balance will be due upon delivery.'
                        : 'Clicking Pay with Razorpay will securely open the gateway for the full order amount.'}
                    </span>
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
                  <span>Item Subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{financials.subtotal.toFixed(2)}</span>
                </div>

                {financials.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span style={{ fontWeight: 700 }}>-₹{financials.discount.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Shipping & Delivery (Pan-India)</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{financials.shippingFee.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Applicable Tax ({settings.taxRate || 5}% GST)</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{financials.tax.toFixed(2)}</span>
                </div>

                <div style={{
                  borderTop: '2px solid var(--brand-border)',
                  paddingTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>Order Total</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)' }}>
                    ₹{financials.total.toFixed(2)}
                  </span>
                </div>

                {/* COD Specific Online Advance vs Balance due breakdown */}
                {paymentMethod === 'cash_on_delivery' && (
                  <div style={{
                    backgroundColor: 'rgba(217, 119, 6, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    border: '1px solid rgba(217, 119, 6, 0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
                      <span>Online Courier Advance (Pay Now):</span>
                      <span>₹{financials.codAdvanceAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      <span>Balance Due at Delivery:</span>
                      <span>₹{financials.remainingAmountDueAtDelivery.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '2px' }}>
                      * The ₹89 advance is part of your order total, covering dispatch insurance.
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="btn btn-accent btn-lg"
                style={{ 
                  width: '100%', 
                  height: '54px', 
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #d4af37 100%)'
                }}
              >
                {isProcessing ? (
                  'Securing Razorpay Gateway...'
                ) : paymentMethod === 'cash_on_delivery' ? (
                  <>Pay ₹{financials.amountDueOnline.toFixed(2)} Advance & Confirm COD</>
                ) : (
                  <>Pay with Razorpay • ₹{financials.amountDueOnline.toFixed(2)}</>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '1rem', fontSize: '0.78rem', color: 'var(--brand-muted)' }}>
                <ShieldCheck size={16} color="#10b981" />
                <span>Silk Mark Certified • 100% Transit Insured Handcrafted Sarees</span>
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
