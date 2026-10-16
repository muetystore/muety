import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAuth } from '@/shared/context/AuthContext';
import { useCart } from '@/shared/context/CartContext';
import { orderService } from '@/features/orders/services/orderService';
import { productService } from '@/features/catalog/services/productService';
import { reviewService } from '@/features/reviews/services/reviewService';
import { useNotification } from '@/shared/context/NotificationContext';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { 
  Package, 
  Heart, 
  MapPin, 
  User, 
  LogOut, 
  ExternalLink,
  ShieldCheck,
  Star,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Home,
  Briefcase
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/media/cloudinary';
import { Order, Product } from '@/types';
import { 
  customerAddressService, 
  INDIAN_STATES, 
  isValidIndianPin, 
  isValidPhone 
} from '@/features/customers/services/customerAddressService';
import { Address } from '@/shared/types';

export const AccountPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'orders';

  useDocumentTitle(currentTab === 'orders' ? 'My Orders' : 'Customer Account');
  const { user, isAuthenticated, logout } = useAuth();
  const { wishlist } = useCart();
  const { success, warning } = useNotification();
  const navigate = useNavigate();

  // If user navigates with legacy ?tab=wishlist, redirect to dedicated /wishlist page
  useEffect(() => {
    if (searchParams.get('tab') === 'wishlist') {
      navigate('/wishlist', { replace: true });
    }
  }, [searchParams, navigate]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  
  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>(() => 
    user ? customerAddressService.getAddresses(user.uid) : []
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrHouseFlat, setAddrHouseFlat] = useState('');
  const [addrStreetAddress, setAddrStreetAddress] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('Tamil Nadu');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [addrType, setAddrType] = useState<'home' | 'work' | 'other'>('home');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Profile edit state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  // Review submission modal state
  const [reviewModalItem, setReviewModalItem] = useState<{
    orderId: string;
    product: Product;
    city: string;
    country: string;
  } | null>(null);

  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revQuote, setRevQuote] = useState('');
  const [revPhotoFile, setRevPhotoFile] = useState<File | null>(null);
  const [revPhotoPreview, setRevPhotoPreview] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleOpenReviewModal = (ord: Order, prod: Product) => {
    setReviewModalItem({
      orderId: ord.id,
      product: prod,
      city: ord.shippingAddress?.city || 'Salem',
      country: ord.shippingAddress?.country || 'India'
    });
    setRevRating(5);
    setRevTitle('');
    setRevQuote('');
    setRevPhotoFile(null);
    setRevPhotoPreview(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      warning('Please choose a valid photo file (JPEG, PNG, or WEBP).', 'Invalid Image Format');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      warning('Image size must be 5MB or less.', 'File Too Large');
      return;
    }

    setRevPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      setRevPhotoPreview(uploadEvt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem || !revQuote.trim()) {
      warning('Please share your impressions in the review text.');
      return;
    }

    setIsSubmittingReview(true);
    let uploadedPhotoUrl: string | undefined = undefined;

    if (revPhotoFile) {
      try {
        const uploadRes = await uploadToCloudinary(revPhotoFile, {
          folder: 'muety/reviews',
          publicId: `patron_rev_${Date.now()}`
        });
        if (uploadRes && uploadRes.url) {
          uploadedPhotoUrl = uploadRes.url;
        }
      } catch (err: any) {
        console.warn('Review photo Cloudinary upload note:', err);
        // Fallback to local preview data URL if upload service is unreachable in dev/offline
        if (revPhotoPreview) {
          uploadedPhotoUrl = revPhotoPreview;
        }
      }
    }

    try {
      await reviewService.addReview({
        userId: user?.uid,
        orderId: reviewModalItem.orderId,
        productId: reviewModalItem.product.id,
        productName: reviewModalItem.product.name,
        authorName: user?.displayName || 'MUETY Patron',
        authorLocation: `${reviewModalItem.city}, ${reviewModalItem.country}`,
        rating: revRating,
        title: revTitle.trim() || 'Exceptional Quality',
        quote: revQuote.trim(),
        verifiedPurchase: true,
        status: 'approved',
        isFeatured: false,
        showOnHome: false,
        photoUrl: uploadedPhotoUrl
      });

      success('Thank you! Your verified patron impressions and photograph have been recorded.', 'Review Published');
      setReviewModalItem(null);
    } catch (err: any) {
      warning(err.message || 'Unable to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRequestCancel = async (orderId: string) => {
    const reason = window.prompt('Please provide the reason for your order cancellation request:');
    if (!reason || !reason.trim()) return;

    try {
      await orderService.requestCancellation(orderId, reason.trim());
      success('Cancellation request submitted. We will review prior to dispatch.', 'Request Submitted');
    } catch (err: any) {
      warning(err.message || 'Unable to submit cancellation request.');
    }
  };

  useEffect(() => {
    if (!user) return;

    // Real-time subscription to customer orders
    const unsubscribe = orderService.subscribeToCustomerOrders(user.uid, (userOrders) => {
      setOrders(userOrders);
    });

    // Fetch wishlist products
    const allProds = productService.getAllProducts();
    const savedProds = allProds.filter(p => wishlist.includes(p.id));
    setWishlistProducts(savedProds);

    return () => {
      unsubscribe();
    };
  }, [user, wishlist]);

  useEffect(() => {
    if (user) {
      setAddresses(customerAddressService.getAddresses(user.uid));
    }
    const handleSync = (e: any) => {
      if (e.detail) setAddresses(e.detail);
    };
    window.addEventListener('muety_addresses_updated', handleSync);
    return () => window.removeEventListener('muety_addresses_updated', handleSync);
  }, [user]);

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrFullName(user?.displayName || '');
    setAddrPhone(user?.phoneNumber || '');
    setAddrHouseFlat('');
    setAddrStreetAddress('');
    setAddrLandmark('');
    setAddrCity('Salem');
    setAddrState('Tamil Nadu');
    setAddrPostalCode('636501');
    setAddrType('home');
    setAddrIsDefault(addresses.length === 0);
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: Address) => {
    setEditingAddressId(addr.id || null);
    setAddrFullName(addr.fullName);
    setAddrPhone(addr.phone);
    setAddrHouseFlat(addr.houseFlat || '');
    setAddrStreetAddress(addr.streetAddress);
    setAddrLandmark(addr.landmark || '');
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPostalCode(addr.postalCode);
    setAddrType(addr.type || 'home');
    setAddrIsDefault(Boolean(addr.isDefault));
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);

    if (!addrFullName.trim() || !addrPhone.trim() || !addrStreetAddress.trim() || !addrCity.trim() || !addrPostalCode.trim()) {
      setAddressError('Please fill in all mandatory fields.');
      return;
    }

    if (!isValidIndianPin(addrPostalCode)) {
      setAddressError('Please enter a valid 6-digit Indian PIN code (e.g. 636501).');
      return;
    }

    if (!isValidPhone(addrPhone)) {
      setAddressError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    const addrData: Omit<Address, 'id'> = {
      fullName: addrFullName.trim(),
      phone: addrPhone.trim(),
      houseFlat: addrHouseFlat.trim() || undefined,
      streetAddress: addrStreetAddress.trim(),
      landmark: addrLandmark.trim() || undefined,
      city: addrCity.trim(),
      state: addrState,
      postalCode: addrPostalCode.trim(),
      country: 'India',
      type: addrType,
      isDefault: addrIsDefault
    };

    if (editingAddressId) {
      customerAddressService.updateAddress(user?.uid, editingAddressId, addrData);
      setAddresses(customerAddressService.getAddresses(user?.uid));
      success('Delivery address updated successfully.', 'Address Updated');
    } else {
      customerAddressService.addAddress(user?.uid, addrData);
      setAddresses(customerAddressService.getAddresses(user?.uid));
      success('New delivery address saved to your account.', 'Address Added');
    }

    setIsAddressModalOpen(false);
  };

  const handleDeleteAddress = (addressId?: string) => {
    if (!addressId) return;
    const confirmed = window.confirm('Are you sure you want to remove this delivery address from your profile?');
    if (confirmed) {
      customerAddressService.deleteAddress(user?.uid, addressId);
      setAddresses(customerAddressService.getAddresses(user?.uid));
      success('Delivery address removed.', 'Address Deleted');
    }
  };

  const handleSetDefaultAddress = (addressId?: string) => {
    if (!addressId) return;
    customerAddressService.setDefaultAddress(user?.uid, addressId);
    setAddresses(customerAddressService.getAddresses(user?.uid));
    success('Primary delivery address updated.', 'Default Address Updated');
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    success('MUETY profile details updated successfully.', 'Profile Updated');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="account-unauth-view container" style={{ padding: 'clamp(2.5rem, 6vw, 5rem) 1rem', textAlign: 'center', boxSizing: 'border-box' }}>
        <div className="card account-unauth-card" style={{ maxWidth: '440px', width: '100%', margin: '0 auto', padding: 'clamp(2rem, 5vw, 3rem) clamp(1.25rem, 4vw, 2rem)', boxSizing: 'border-box' }}>
          <User size={48} color="var(--brand-accent)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.6rem)', marginBottom: '0.75rem', wordBreak: 'break-word' }}>Sign In to Your MUETY Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Access your order history, live tracking, and personalized wishlist.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', boxSizing: 'border-box' }}>Sign In</Link>
            <Link to="/register" className="btn btn-secondary" style={{ width: '100%', boxSizing: 'border-box' }}>Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page animate-fade-in" style={{ paddingBottom: 'calc(var(--bottom-safe-clearance, 78px) + 2rem)', minHeight: '80vh', width: '100%', boxSizing: 'border-box' }}>
      {/* Account Hero Banner */}
      <div className="account-hero-banner">
        <div className="container">
          <div className="account-hero-content">
            <div style={{ minWidth: 0, flex: '1 1 280px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
                MUETY PATRON PORTAL
              </span>
              <h1 style={{ color: '#ffffff', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                Welcome back, {user.displayName}
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.92rem', wordBreak: 'break-word', overflowWrap: 'break-word', marginTop: '4px' }}>
                {user.email} • Client Tier: <strong>MUETY Atelier Club</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
        {/* Account Nav Tabs */}
        <div className="account-tabs-wrapper">
          {[
            { id: 'orders', label: `My Orders (${orders.length})`, icon: Package },
            { id: 'address', label: 'Delivery Addresses', icon: MapPin },
            { id: 'profile', label: 'Profile Settings', icon: User }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`account-tab-btn ${isActive ? 'active' : ''}`}
              >
                <IconComp size={18} color={isActive ? 'var(--brand-accent)' : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Orders History */}
        {currentTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            {orders.length === 0 ? (
              <div className="card account-card-fluid" style={{ textAlign: 'center', padding: 'clamp(2.5rem, 6vw, 4rem) 1.5rem' }}>
                <Package size={48} color="var(--brand-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No Order History Yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Explore our pure silk sarees and heritage handloom collections to place your first order.
                </p>
                <Link to="/products" className="btn btn-primary btn-sm">Explore Collection</Link>
              </div>
            ) : (
              orders.map(ord => (
                <div key={ord.id} className="card account-card-fluid">
                  <div className="account-order-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    paddingBottom: '1.25rem',
                    borderBottom: '1px solid var(--brand-border)',
                    marginBottom: '1.25rem',
                    minWidth: 0
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ORDER NUMBER</span>
                      <h4 style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', wordBreak: 'break-all' }}>#{ord.orderNumber}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Placed on {new Date(ord.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {ord.cancellationRequested ? (
                        <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.75rem' }}>
                          Cancellation Pending Concierge Review
                        </span>
                      ) : ord.orderStatus === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleRequestCancel(ord.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#b91c1c', borderColor: '#fca5a5', fontSize: '0.78rem', padding: '4px 10px' }}
                        >
                          Request Cancellation
                        </button>
                      ) : null}
                      <span className={`badge badge-${ord.orderStatus === 'delivered' ? 'success' : ord.orderStatus === 'cancelled' ? 'danger' : 'dark'}`} style={{ padding: '0.35rem 0.75rem' }}>
                        {ord.orderStatus.toUpperCase()}
                      </span>
                      <Link to={`/order-confirmation/${ord.id}`} className="btn btn-outline btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                        View Invoice & Tracking <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {ord.items.map((item: any, i: number) => (
                      <div key={i} className="account-order-item" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name} 
                          style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', objectFit: 'contain', backgroundColor: '#f8fafc', border: '1px solid var(--brand-border)', padding: '3px', flexShrink: 0 }} 
                        />
                        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                          <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)', wordBreak: 'break-word' }}>{item.product.name}</h5>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                            Quantity: {item.quantity} {item.selectedColor ? `• Tone: ${item.selectedColor}` : ''}
                          </span>
                        </div>
                        <div className="account-order-item-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                            ₹{(item.product.price * item.quantity).toFixed(2)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(ord, item.product)}
                            className="btn btn-outline btn-sm"
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--brand-primary)',
                              borderColor: 'var(--brand-border)'
                            }}
                          >
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            <span>Share Impression</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--brand-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    fontSize: '0.88rem'
                  }}>
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word', flex: '1 1 200px' }}>
                      Shipped to: <strong>{ord.shippingAddress.streetAddress}, {ord.shippingAddress.city}</strong>
                    </span>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                        Total: ₹{ord.total.toFixed(2)}
                      </span>
                      {ord.paymentMethod === 'cash_on_delivery' && (
                        <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                          COD: ₹{(ord.codAdvanceAmount || 89).toFixed(2)} Advance Paid • Balance ₹{(ord.codBalanceDue ?? (ord.total - 89)).toFixed(2)} on Delivery
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}


        {/* Tab 3: Delivery Addresses (Multi-Address Management) */}
        {currentTab === 'address' && (
          <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--brand-primary)' }}>
                  Delivery Addresses ({addresses.length})
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Manage multiple residences, atelier studios, and gifting destinations.
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                <span>Add New Address</span>
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="card account-card-fluid" style={{ textAlign: 'center', padding: 'clamp(3rem, 6vw, 4.5rem) 1.5rem' }}>
                <MapPin size={48} color="var(--brand-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No Saved Addresses Found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  Save your home, office, or gift delivery destinations for instant 1-click checkout.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Add Your First Delivery Address
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem'
              }}>
                {addresses.map((addr) => {
                  const isDefault = Boolean(addr.isDefault);
                  return (
                    <div 
                      key={addr.id}
                      className="card"
                      style={{
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: isDefault ? '1.5px solid #c9a227' : '1px solid var(--brand-border)',
                        backgroundColor: isDefault ? '#faf8f3' : '#ffffff',
                        position: 'relative',
                        boxShadow: isDefault ? '0 4px 14px rgba(201, 162, 39, 0.12)' : 'var(--shadow-sm)'
                      }}
                    >
                      {/* Top Badges */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: addr.type === 'work' ? '#e0f2fe' : '#f1f5f9',
                            color: addr.type === 'work' ? '#0369a1' : '#334155',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            {addr.type === 'work' ? <Briefcase size={12} /> : <Home size={12} />}
                            {addr.type || 'Home'}
                          </span>

                          {isDefault && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a'
                            }}>
                              <CheckCircle2 size={12} color="#b45309" /> Default Delivery
                            </span>
                          )}
                        </div>

                        {/* Recipient info */}
                        <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '4px' }}>
                          {addr.fullName}
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--brand-muted)', marginBottom: '8px' }}>
                          Phone: {addr.phone}
                        </div>

                        {/* Address body */}
                        <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word', marginBottom: '1.25rem' }}>
                          {addr.houseFlat && <span>{addr.houseFlat}, </span>}
                          <span>{addr.streetAddress}</span>
                          {addr.landmark && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Landmark: {addr.landmark}</div>}
                          <div>{addr.city}, {addr.state} – <strong>{addr.postalCode}</strong></div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{addr.country || 'India'}</div>
                        </div>
                      </div>

                      {/* Card actions */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid rgba(0,0,0,0.06)',
                        gap: '6px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditAddress(addr)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Edit Address"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#b91c1c', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Delete Address"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>

                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Profile Settings */}
        {currentTab === 'profile' && (
          <div className="account-form-wrapper">
            <form onSubmit={handleSaveProfile} className="card account-card-fluid">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Patron Profile Information</h3>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  className="form-input" 
                  style={{ boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Read-only)</label>
                <input 
                  type="email" 
                  disabled 
                  value={user.email} 
                  className="form-input" 
                  style={{ backgroundColor: 'var(--bg-main)', opacity: 0.8, boxSizing: 'border-box' }} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  placeholder="+91 93857 91540" 
                  className="form-input" 
                  style={{ boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" className="btn btn-primary account-save-btn">
                Save Profile Changes
              </button>

              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--brand-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', margin: 0, color: 'var(--brand-primary)', fontWeight: 600 }}>
                    Patron Session
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--brand-muted)' }}>
                    Securely sign out of your account on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/'); }}
                  className="btn btn-outline"
                  style={{
                    color: '#b91c1c',
                    borderColor: '#fca5a5',
                    padding: '0.5rem 1rem',
                    fontSize: '0.84rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Verified Patron Impression Modal */}
      {reviewModalItem && (
        <div className="admin-modal-overlay">
          <div className="card account-card-fluid" style={{
            maxWidth: '560px',
            width: '100%',
            maxHeight: 'calc(100dvh - 32px)',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--brand-primary)' }}>Share Patron Impressions</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Verified Purchase for Order #{reviewModalItem.orderId.slice(-6)}
                </span>
              </div>
              <button onClick={() => setReviewModalItem(null)} style={{ padding: '6px', color: 'var(--brand-muted)' }} aria-label="Close Modal">
                <X size={20} />
              </button>
            </div>

            {/* Product Summary Header */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              backgroundColor: 'var(--bg-main)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--brand-border)',
              marginBottom: '1.25rem',
              boxSizing: 'border-box'
            }}>
              <img 
                src={reviewModalItem.product.images[0]} 
                alt={reviewModalItem.product.name} 
                style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', backgroundColor: '#ffffff', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <h5 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--brand-primary)', wordBreak: 'break-word' }}>
                  {reviewModalItem.product.name}
                </h5>
                <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> Verified Patron Purchase
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Rating */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Your Rating</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      type="button"
                      key={starVal}
                      onClick={() => setRevRating(starVal)}
                      style={{
                        padding: '4px',
                        color: starVal <= revRating ? '#f59e0b' : '#cbd5e1',
                        transition: 'transform 0.1s ease'
                      }}
                      aria-label={`${starVal} Star`}
                    >
                      <Star size={26} fill={starVal <= revRating ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-primary)', marginLeft: '6px' }}>
                    {revRating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Headline */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Headline / Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Masterpiece craftsmanship and exceptional packaging"
                  value={revTitle} 
                  onChange={e => setRevTitle(e.target.value)} 
                  className="form-input" 
                  style={{ boxSizing: 'border-box' }}
                />
              </div>

              {/* Impressions text */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Detailed Impressions / Review *</label>
                <textarea 
                  required 
                  rows={4}
                  placeholder="Share your experience with the craftsmanship, fit, delivery, and bespoke details..."
                  value={revQuote} 
                  onChange={e => setRevQuote(e.target.value)} 
                  className="form-input" 
                  style={{ boxSizing: 'border-box' }}
                />
              </div>

              {/* Customer Photo Upload */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Customer Photograph (Optional)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>JPEG, PNG, WEBP (Max 5MB)</span>
                </label>
                
                {revPhotoPreview ? (
                  <div style={{
                    position: 'relative',
                    width: '120px',
                    height: '140px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid var(--brand-accent)',
                    backgroundColor: '#000000'
                  }}>
                    <img 
                      src={revPhotoPreview} 
                      alt="Review Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button
                      type="button"
                      onClick={() => { setRevPhotoFile(null); setRevPhotoPreview(null); }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      aria-label="Remove photograph"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    border: '1.5px dashed var(--brand-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-main)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    textAlign: 'center'
                  }}>
                    <Camera size={24} color="var(--brand-primary)" style={{ marginBottom: '6px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                      Upload Your Draped Portrait
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--brand-muted)', marginTop: '2px' }}>
                      Share how you styled this MUETY saree to be featured on our homepage
                    </span>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp" 
                      onChange={handlePhotoSelect} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={() => setReviewModalItem(null)} 
                  className="btn btn-outline"
                  disabled={isSubmittingReview}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmittingReview}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingReview ? (
                    <>
                      <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>Recording Impression...</span>
                    </>
                  ) : (
                    <span>Submit Verified Impression</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Delivery Address Modal */}
      {isAddressModalOpen && (
        <div className="admin-modal-overlay">
          <div className="card account-card-fluid" style={{
            maxWidth: '580px',
            width: '100%',
            maxHeight: 'calc(100dvh - 32px)',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
            boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--brand-border)',
              paddingBottom: '0.85rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--brand-primary)' }}>
                  {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {editingAddressId ? 'Update your saved delivery address details' : 'Save address for rapid 1-click checkout'}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddressModalOpen(false)} 
                style={{ padding: '6px', color: 'var(--brand-muted)', background: 'none', border: 'none', cursor: 'pointer' }} 
                aria-label="Close Address Modal"
              >
                <X size={20} />
              </button>
            </div>

            {addressError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.86rem',
                marginBottom: '1rem'
              }}>
                {addressError}
              </div>
            )}

            <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Row 1: Full Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Recipient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyadharshini"
                    value={addrFullName}
                    onChange={(e) => setAddrFullName(e.target.value)}
                    className="form-input"
                    style={{ boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="form-input"
                    style={{ boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Row 2: House / Flat No. & Landmark */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Flat / House No. / Building</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 4B, Sri Krishna Apts"
                    value={addrHouseFlat}
                    onChange={(e) => setAddrHouseFlat(e.target.value)}
                    className="form-input"
                    style={{ boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Landmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Salem New Bus Stand"
                    value={addrLandmark}
                    onChange={(e) => setAddrLandmark(e.target.value)}
                    className="form-input"
                    style={{ boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Row 3: Street & Locality */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Street Address & Locality *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2/32 Ramireddypatti, Meyyanur Main Road"
                  value={addrStreetAddress}
                  onChange={(e) => setAddrStreetAddress(e.target.value)}
                  className="form-input"
                  style={{ boxSizing: 'border-box' }}
                />
              </div>

              {/* Row 4: City, State, PIN code */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">City / Town *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salem"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="form-input"
                    style={{ boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">State *</label>
                  <select
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="form-input"
                    style={{ boxSizing: 'border-box' }}
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">PIN Code (6 digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 636501"
                    value={addrPostalCode}
                    onChange={(e) => setAddrPostalCode(e.target.value)}
                    className="form-input"
                    style={{ boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Row 5: Address Type */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Address Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(['home', 'work', 'other'] as const).map((t) => (
                    <label
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: addrType === t ? '1.5px solid #c9a227' : '1px solid var(--brand-border)',
                        backgroundColor: addrType === t ? '#faf8f3' : '#ffffff',
                        fontSize: '0.84rem',
                        fontWeight: addrType === t ? 700 : 500,
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      <input
                        type="radio"
                        name="addressType"
                        value={t}
                        checked={addrType === t}
                        onChange={() => setAddrType(t)}
                        style={{ display: 'none' }}
                      />
                      {t === 'home' && <Home size={13} />}
                      {t === 'work' && <Briefcase size={13} />}
                      {t === 'other' && <MapPin size={13} />}
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Row 6: Default Address Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  id="addrDefaultCheckbox"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="addrDefaultCheckbox" style={{ fontSize: '0.86rem', color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 500 }}>
                  Make this my default delivery address for future orders
                </label>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem', borderTop: '1px solid var(--brand-border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingAddressId ? 'Save Changes' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
