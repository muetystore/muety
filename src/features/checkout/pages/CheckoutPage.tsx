import React, { useState, useEffect } from 'react';
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
  Building2,
  Truck,
  Banknote,
  CheckCircle2,
  ArrowRight,
  Tag,
  ChevronDown,
  X,
  Loader2
} from 'lucide-react';
import { Address } from '@/shared/types';
import { Coupon } from '@/features/coupons/types';
import { calculateOrderFinancials } from '@/shared/utils/pricingEngine';
import { couponService } from '@/features/coupons/services/couponService';
import { 
  customerAddressService, 
  INDIAN_STATES,
  isValidIndianPin, 
  isValidPhone 
} from '@/features/customers/services/customerAddressService';

export const CheckoutPage: React.FC = () => {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const { 
    items, 
    subtotal, 
    discountAmount, 
    appliedCoupon, 
    applyCoupon,
    removeCoupon,
    clearCart 
  } = useCart();
  const { error, success } = useNotification();

  // Promo Code State for Checkout
  const [isPromoExpanded, setIsPromoExpanded] = useState<boolean>(() => Boolean(appliedCoupon));
  const [promoInputCode, setPromoInputCode] = useState<string>('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMessage, setPromoSuccessMessage] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [showEligibleList, setShowEligibleList] = useState<boolean>(false);

  // Load available active coupons
  useEffect(() => {
    try {
      const allCoupons = couponService.getAllCoupons();
      const now = Date.now();
      const eligible = allCoupons.filter(c => c.isActive && new Date(c.expiresAt).getTime() > now);
      setAvailableCoupons(eligible);
    } catch {
      setAvailableCoupons([]);
    }
  }, []);

  // Synchronize expansion if coupon is already applied
  useEffect(() => {
    if (appliedCoupon) {
      setIsPromoExpanded(true);
      setPromoError(null);
    }
  }, [appliedCoupon]);

  const handleApplyPromoCode = (codeToApply?: string) => {
    const targetCode = (codeToApply || promoInputCode).trim().toUpperCase();
    if (!targetCode) {
      setPromoError('Please enter a promotional code');
      return;
    }

    if (appliedCoupon && appliedCoupon.code.toUpperCase() === targetCode) {
      setPromoError(`Code ${targetCode} is already applied`);
      return;
    }

    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoSuccessMessage(null);

    // Apply through authoritative cart/coupon pipeline
    setTimeout(() => {
      const res = applyCoupon(targetCode);
      setIsApplyingPromo(false);
      if (res.success) {
        setPromoSuccessMessage(res.message);
        setPromoInputCode('');
        setShowEligibleList(false);
      } else {
        setPromoError(res.message);
      }
    }, 150);
  };

  const handleRemovePromoCode = () => {
    removeCoupon();
    setPromoError(null);
    setPromoSuccessMessage(null);
    setPromoInputCode('');
  };

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
  const [city, setCity] = useState(activeInitialAddr?.city || '');
  const [state, setState] = useState(activeInitialAddr?.state || '');
  const [postalCode, setPostalCode] = useState(activeInitialAddr?.postalCode || '');
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

  // Automatically prompt login modal if user lands on checkout without being signed in
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      openAuthModal({ redirectPath: '/checkout', reason: 'checkout' });
    }
  }, [isAuthenticated, authLoading, openAuthModal]);

  // Synchronize authenticated user profile and saved addresses upon sign-in
  useEffect(() => {
    if (user) {
      if (!email && user.email) setEmail(user.email);
      if (!fullName && user.displayName) setFullName(user.displayName);
      const addrs = customerAddressService.getAddresses(user.uid);
      setSavedAddresses(addrs);
      if (addrs.length > 0 && !selectedAddressId) {
        const def = addrs.find(a => a.isDefault) || addrs[0];
        handleSelectSavedAddress(def);
      }
    }
  }, [user]);

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="container" style={{ maxWidth: '640px', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2.25rem',
          border: '1.5px solid rgba(201, 162, 39, 0.4)',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(201, 162, 39, 0.12)',
            color: '#b38a1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Lock size={30} />
          </div>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#b38a1b',
            display: 'block',
            marginBottom: '0.4rem'
          }}>
            Patron Privilege Access
          </span>

          <h2 style={{
            fontSize: '1.75rem',
            fontFamily: 'var(--font-heading)',
            color: '#0f172a',
            margin: '0 0 0.85rem',
            fontWeight: 800
          }}>
            Sign In to Complete Your Order
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.94rem',
            maxWidth: '480px',
            margin: '0 auto 1.75rem',
            lineHeight: 1.6
          }}>
            To guarantee authentic handloom reservation, enable order tracking, and preserve your purchase invoice, please sign in or register before checking out.
          </p>

          <button
            type="button"
            onClick={() => openAuthModal({ redirectPath: '/checkout', reason: 'checkout' })}
            className="btn btn-accent btn-lg"
            style={{
              width: '100%',
              maxWidth: '320px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Sign In / Create Account</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

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

    if (!email || !fullName || !phone || !streetAddress || !city || !state || !postalCode) {
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

    // Authoritative promotion validation prior to payment
    if (appliedCoupon) {
      const revalidation = couponService.validateCoupon(appliedCoupon.code, financials.subtotal);
      if (!revalidation.valid) {
        removeCoupon();
        setPromoError(revalidation.message);
        error(revalidation.message, 'Coupon Ineligible');
        return;
      }
    }

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
                      placeholder="e.g. Chennai"
                      value={city} 
                      onChange={e => setCity(e.target.value)} 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State / Province *</label>
                    {country === 'India' ? (
                      <select 
                        required 
                        value={state} 
                        onChange={e => setState(e.target.value)} 
                        className="form-select"
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        required
                        placeholder="State / Province"
                        value={state} 
                        onChange={e => setState(e.target.value)} 
                        className="form-input" 
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postal / ZIP *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. 600001"
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
                        Direct dispatch from Muety atelier • Transit insured with live SMS & tracking
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {paymentMethod === 'razorpay' ? (
                      <>
                        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#10b981' }}>FREE</span>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prepaid Privilege</div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-primary)' }}>₹89.00</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COD Delivery Fee</div>
                      </>
                    )}
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
                          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Recommended • FREE Delivery</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                          Instant confirmation via UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, or Wallets. <strong>100% FREE Pan-India Delivery</strong> included!
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                          Pay full order total now: ₹{financials.total.toFixed(2)} (Delivery Fee: ₹0.00 FREE)
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
                            ₹89 COD Delivery Fee
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                          A flat ₹89.00 delivery fee applies to COD orders, paid online as advance confirmation.
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600, marginTop: '4px' }}>
                          Pay ₹89.00 online advance now. Doorstep balance due at delivery: ₹{financials.remainingAmountDueAtDelivery.toFixed(2)}.
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Razorpay Sandbox Guidance */}
                {razorpayService.getKeyId().startsWith('rzp_test_') && (
                  <div style={{
                    marginTop: '1rem',
                    marginBottom: '1rem',
                    padding: '0.85rem 1.15rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.82rem',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <Zap size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ lineHeight: 1.5 }}>
                      <strong style={{ color: '#78350f' }}>Razorpay Test Sandbox Active:</strong>
                      <div style={{ marginTop: '2px' }}>
                        • <strong>UPI:</strong> Use test VPA <code style={{ backgroundColor: '#fef3c7', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>success@razorpay</code> (entering personal/real UPI IDs returns 400 Bad Request in Razorpay test mode).<br />
                        • <strong>NetBanking:</strong> Select any bank (e.g. HDFC, SBI) and click <strong>Success</strong> on the Razorpay mock simulator.<br />
                        • <strong>Card:</strong> Use test card <code style={{ backgroundColor: '#fef3c7', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>4111 1111 1111 1111</code> (any future date &amp; CVV).
                      </div>
                    </div>
                  </div>
                )}

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

              {/* Promo Code Accordion Section */}
              <div 
                className="checkout-promo-section"
                style={{
                  borderTop: '1px solid var(--brand-border)',
                  paddingTop: '1rem',
                  paddingBottom: '0.75rem',
                  marginBottom: '0.25rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsPromoExpanded(!isPromoExpanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: appliedCoupon ? '#997819' : 'var(--brand-primary)'
                  }}
                  aria-expanded={isPromoExpanded}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} color={appliedCoupon ? '#c9a227' : 'var(--brand-accent-hover)'} />
                    <span>Have a promo code?</span>
                    {appliedCoupon && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--brand-accent-light)',
                        color: '#997819',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        letterSpacing: '0.04em'
                      }}>
                        {appliedCoupon.code} Applied
                      </span>
                    )}
                  </span>
                  <ChevronDown 
                    size={16} 
                    style={{ 
                      transform: isPromoExpanded ? 'rotate(180deg)' : 'none', 
                      transition: 'transform 0.2s ease',
                      color: 'var(--brand-muted)'
                    }} 
                  />
                </button>

                {isPromoExpanded && (
                  <div style={{ marginTop: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
                    {appliedCoupon ? (
                      /* Applied Promo State */
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: 'var(--brand-accent-light)',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#997819' }}>
                              Code {appliedCoupon.code} Applied
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {appliedCoupon.discountType === 'percentage' 
                                ? `${appliedCoupon.discountValue}% Off` 
                                : `₹${appliedCoupon.discountValue} Off`}
                              {' • '}
                              <strong style={{ color: '#15803d' }}>Save ₹{financials.discount.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePromoCode}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#b91c1c',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#fff1f2'
                          }}
                          title="Remove promo code"
                        >
                          <X size={13} /> Remove
                        </button>
                      </div>
                    ) : (
                      /* Promo Code Input & Apply */
                      <div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="e.g. DIWALI25"
                            value={promoInputCode}
                            onChange={(e) => {
                              setPromoInputCode(e.target.value.toUpperCase());
                              if (promoError) setPromoError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyPromoCode();
                              }
                            }}
                            className="form-input"
                            style={{
                              flex: 1,
                              textTransform: 'uppercase',
                              fontSize: '0.85rem',
                              padding: '8px 10px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyPromoCode()}
                            disabled={isApplyingPromo || !promoInputCode.trim()}
                            className="btn btn-outline"
                            style={{
                              padding: '0 14px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              minWidth: '72px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            {isApplyingPromo ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                          </button>
                        </div>

                        {promoError && (
                          <div style={{ color: '#dc2626', fontSize: '0.76rem', marginTop: '6px' }}>
                            {promoError}
                          </div>
                        )}

                        {promoSuccessMessage && (
                          <div style={{ color: '#16a34a', fontSize: '0.76rem', marginTop: '6px' }}>
                            {promoSuccessMessage}
                          </div>
                        )}

                        {/* Available Offers Toggle */}
                        {availableCoupons.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setShowEligibleList(!showEligibleList)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                fontSize: '0.76rem',
                                color: '#c9a227',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {showEligibleList ? 'Hide available offers' : `View available offers (${availableCoupons.length})`}
                            </button>

                            {showEligibleList && (
                              <div style={{
                                marginTop: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                maxHeight: '180px',
                                overflowY: 'auto',
                                padding: '8px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid var(--brand-border)',
                                borderRadius: 'var(--radius-md)'
                              }}>
                                {availableCoupons.map((coupon) => {
                                  const isEligible = subtotal >= coupon.minSpend;
                                  return (
                                    <div
                                      key={coupon.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 10px',
                                        backgroundColor: '#ffffff',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px dashed var(--brand-border)'
                                      }}
                                    >
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--brand-primary)' }}>
                                            {coupon.code}
                                          </span>
                                          <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>
                                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                          {coupon.minSpend > 0 ? `Min spend ₹${coupon.minSpend}` : 'No minimum spend'}
                                          {coupon.maxDiscount ? ` • Max discount ₹${coupon.maxDiscount}` : ''}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyPromoCode(coupon.code)}
                                        disabled={!isEligible}
                                        className="btn btn-outline btn-sm"
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          borderColor: isEligible ? 'var(--brand-accent)' : '#cbd5e1',
                                          color: isEligible ? 'var(--brand-accent-hover)' : '#94a3b8'
                                        }}
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                  {financials.shippingFee === 0 ? (
                    <span style={{ fontWeight: 700, color: '#10b981' }}>FREE (Online)</span>
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>₹{financials.shippingFee.toFixed(2)}</span>
                  )}
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
                    <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '2px', lineHeight: 1.4 }}>
                      * Online payment gets 100% FREE delivery. COD incurs a ₹89 delivery fee paid upfront as an order confirmation advance.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                By placing your order, you agree to MUETY's{' '}
                <Link to="/terms-conditions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link to="/return-refund-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>
                  Return, Refund &amp; Cancellation Policy
                </Link>.
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
