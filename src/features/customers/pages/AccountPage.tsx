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
  Briefcase,
  Settings,
  Link2,
  ChevronRight,
  AlertCircle,
  Phone,
  Sparkles,
  Lock
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
import { isGeneratedPatronName } from '@/features/auth/services/authService';

export const AccountPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  useDocumentTitle(
    currentTab === 'orders' ? 'My Orders — MUETY' :
    currentTab === 'address' ? 'Delivery Addresses — MUETY' :
    currentTab === 'profile' ? 'Profile Settings — MUETY' :
    currentTab === 'connected' ? 'Connected Accounts — MUETY' :
    'Account Dashboard — MUETY'
  );
  const { 
    user, 
    isAuthenticated, 
    logout, 
    updateCustomerProfile, 
    linkGoogleAccount, 
    sendPhoneLinkOtp, 
    verifyPhoneLinkOtp, 
    setupRecaptcha, 
    getConnectedStatus,
    recordPatronCircleConsent
  } = useAuth();
  const { wishlist } = useCart();
  const { success, warning } = useNotification();
  const navigate = useNavigate();

  const [isJoiningCircle, setIsJoiningCircle] = useState(false);

  const handleJoinPatronCircle = async () => {
    if (!user) return;
    setIsJoiningCircle(true);
    try {
      await recordPatronCircleConsent(user.uid, true, user.email, user.phoneNumber);
      success('Welcome to the MUETY Patron Circle! You now enjoy exclusive VIP benefits.', 'Patron Circle VIP');
    } catch (err: any) {
      warning(err.message || 'Unable to join Patron Circle.');
    } finally {
      setIsJoiningCircle(false);
    }
  };

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

  const hasGenuineName = Boolean(user?.displayName && !isGeneratedPatronName(user.displayName));

  // Profile edit state - If user has a generated fallback name like "Patron (1540)", initialize with empty string
  const [displayName, setDisplayName] = useState(() => 
    user?.displayName && !isGeneratedPatronName(user.displayName) ? user.displayName : ''
  );
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.displayName && !isGeneratedPatronName(user.displayName)) {
        setDisplayName(user.displayName);
      } else {
        setDisplayName('');
      }
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
    }
  }, [user?.displayName, user?.phoneNumber]);

  // Connected accounts state
  const connectedStatus = getConnectedStatus(user);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [linkPhoneCode, setLinkPhoneCode] = useState('+91');
  const [linkPhoneNumber, setLinkPhoneNumber] = useState('');
  const [linkPhoneOtp, setLinkPhoneOtp] = useState('');
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<any>(null);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneLinkStep, setPhoneLinkStep] = useState<'phone' | 'otp'>('phone');
  const [phoneLinkCooldown, setPhoneLinkCooldown] = useState(0);
  const [phoneLinkError, setPhoneLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (phoneLinkCooldown <= 0) return;
    const interval = setInterval(() => {
      setPhoneLinkCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneLinkCooldown]);

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
      orderId: ord.orderNumber || ord.id,
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
    // Fetch wishlist products (available for both guest and authenticated customers)
    const allProds = productService.getAllProducts();
    const savedProds = allProds.filter(p => wishlist.includes(p.id));
    setWishlistProducts(savedProds);

    if (!user) {
      setOrders([]);
      return;
    }

    // Real-time subscription to customer orders (matches both user.uid and user.email)
    const unsubscribe = orderService.subscribeToCustomerOrders(
      user.uid, 
      (userOrders) => {
        setOrders(userOrders);
      },
      undefined,
      user.email || undefined
    );

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=/account?tab=profile');
      return;
    }
    setProfileError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      const err = 'Please enter a valid full name (minimum 2 characters).';
      setProfileError(err);
      warning(err, 'Invalid Name');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateCustomerProfile({
        displayName: trimmedName,
        phoneNumber: phoneNumber.trim() || undefined
      });
      success('MUETY profile details updated successfully.', 'Profile Updated');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      const msg = err?.message || 'Failed to update profile. Please try again.';
      setProfileError(msg);
      warning(msg, 'Update Failed');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!user) return;
    setIsLinkingGoogle(true);
    try {
      await linkGoogleAccount(false);
      success('Google account connected successfully to your MUETY profile.', 'Google Linked');
    } catch (err: any) {
      console.warn('Google link note:', err);
      warning(err.message || 'Failed to connect Google account.', 'Linking Failed');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleOpenPhoneLinkModal = () => {
    setLinkPhoneCode('+91');
    setLinkPhoneNumber('');
    setLinkPhoneOtp('');
    setPhoneConfirmationResult(null);
    setPhoneLinkStep('phone');
    setPhoneLinkCooldown(0);
    setPhoneLinkError(null);
    setIsPhoneModalOpen(true);
  };

  const handleSendPhoneLinkOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLinkError(null);

    const cleanNumber = linkPhoneNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 10) {
      setPhoneLinkError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const fullPhone = `${linkPhoneCode}${cleanNumber}`;
    setIsSendingPhoneOtp(true);

    try {
      const verifier = setupRecaptcha('phone-link-recaptcha', { size: 'invisible' });
      const confirmationResult = await sendPhoneLinkOtp(fullPhone, verifier);
      setPhoneConfirmationResult(confirmationResult);
      setPhoneLinkStep('otp');
      setPhoneLinkCooldown(30);
      success(`Verification OTP dispatched to ${fullPhone}`, 'OTP Sent');
    } catch (err: any) {
      console.warn('Phone link OTP error:', err);
      setPhoneLinkError(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneLinkOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneConfirmationResult) {
      setPhoneLinkError('Session expired. Please request a new verification code.');
      return;
    }

    const cleanOtp = linkPhoneOtp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setPhoneLinkError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingPhoneOtp(true);
    setPhoneLinkError(null);

    try {
      const cleanNumber = linkPhoneNumber.replace(/\D/g, '');
      const fullPhone = `${linkPhoneCode}${cleanNumber}`;
      await verifyPhoneLinkOtp(phoneConfirmationResult, cleanOtp, fullPhone);
      success('Mobile phone number verified and linked securely.', 'Phone Linked');
      setIsPhoneModalOpen(false);
    } catch (err: any) {
      console.warn('Verify phone link error:', err);
      setPhoneLinkError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  return (
    <div className="account-page animate-fade-in" style={{ paddingBottom: 'calc(var(--bottom-safe-clearance, 78px) + 2rem)', minHeight: '80vh', width: '100%', boxSizing: 'border-box' }}>
      {/* 1. Compact Clean Account Page Header (No oversized welcome banner) */}
      <div className="account-page-header">
        <div className="container">
          <div className="account-header-inner">
            <div className="account-header-title-group">
              <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.12em', color: '#c9a227', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                MUETY PATRON SERVICES
              </span>
              <h1>My Account</h1>
            </div>

            <div className="account-header-meta-pill">
              {isAuthenticated && user ? (
                <>
                  <User size={14} color="#c9a227" />
                  <span>{hasGenuineName ? user.displayName : (connectedStatus.maskedPhone || user.phoneNumber || user.email || 'Patron Account')}</span>
                </>
              ) : (
                <>
                  <User size={14} color="#94a3b8" />
                  <span>Guest Patron</span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <Link to="/login?redirect=/account" style={{ color: '#c9a227', fontWeight: 700, textDecoration: 'none' }}>
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Tablet & Mobile Horizontal Navigation Bar (Visible only on < 992px) */}
        <div className="account-mobile-tabs">
          <button
            type="button"
            onClick={() => handleTabChange('profile')}
            className={`account-mobile-tab-btn ${currentTab === 'profile' ? 'active' : ''}`}
          >
            <User size={15} />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('orders')}
            className={`account-mobile-tab-btn ${currentTab === 'orders' ? 'active' : ''}`}
          >
            <Package size={15} />
            <span>My Orders {isAuthenticated ? `(${orders.length})` : ''}</span>
            {!isAuthenticated && <Lock size={12} color="#94a3b8" />}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('address')}
            className={`account-mobile-tab-btn ${currentTab === 'address' ? 'active' : ''}`}
          >
            <MapPin size={15} />
            <span>Saved Addresses {isAuthenticated ? `(${addresses.length})` : ''}</span>
            {!isAuthenticated && <Lock size={12} color="#94a3b8" />}
          </button>

          <Link
            to="/wishlist"
            className="account-mobile-tab-btn"
          >
            <Heart size={15} />
            <span>My Wishlist ({wishlist.length})</span>
          </Link>

          <button
            type="button"
            onClick={() => handleTabChange('connected')}
            className={`account-mobile-tab-btn ${currentTab === 'connected' ? 'active' : ''}`}
          >
            <Link2 size={15} />
            <span>Connected Accounts</span>
            {!isAuthenticated && <Lock size={12} color="#94a3b8" />}
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => logout()}
              className="account-mobile-tab-btn"
              style={{ color: '#b91c1c', borderColor: '#fecaca' }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/login?redirect=/account"
              className="account-mobile-tab-btn"
              style={{ backgroundColor: '#faf5ea', color: '#92400e', borderColor: '#fde68a' }}
            >
              <User size={15} />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Two-Column Desktop Layout */}
        <div className="account-layout-grid">
          {/* Left Column: Dedicated Account Navigation Sidebar (~260px) */}
          <aside className="account-sidebar" aria-label="Account Navigation Sidebar">
            {/* User Mini Card */}
            <div className="account-sidebar-user">
              <div className="account-sidebar-avatar">
                {isAuthenticated && hasGenuineName && user?.displayName ? (
                  user.displayName.charAt(0).toUpperCase()
                ) : (
                  <User size={20} color="var(--brand-accent)" />
                )}
              </div>
              <div className="account-sidebar-user-info">
                <h4 className="account-sidebar-user-name" title={isAuthenticated && hasGenuineName && user?.displayName ? user.displayName : (isAuthenticated ? 'Patron Account' : 'Guest')}>
                  {isAuthenticated && hasGenuineName && user?.displayName ? user.displayName : (isAuthenticated ? 'Patron Account' : 'Guest')}
                </h4>
                <p className="account-sidebar-user-sub">
                  {isAuthenticated ? (
                    connectedStatus.maskedPhone || user?.phoneNumber || user?.email || 'Valued Patron'
                  ) : (
                    'Guest Patron'
                  )}
                </p>
              </div>
            </div>

            {!isAuthenticated && (
              <div style={{ marginBottom: '1rem', padding: '0 4px' }}>
                <Link
                  to="/login?redirect=/account"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}
                >
                  Sign In / Register
                </Link>
              </div>
            )}

            {/* Sidebar Navigation Items in exact specified order:
                1. Profile
                2. My Orders
                3. Saved Addresses
                4. My Wishlist
                5. Connected Accounts
                6. Sign Out
            */}
            <nav className="account-sidebar-nav" aria-label="Account Navigation">
              {/* 1. Profile */}
              <button
                type="button"
                onClick={() => handleTabChange('profile')}
                className={`account-sidebar-item ${currentTab === 'profile' ? 'active' : ''}`}
              >
                <div className="account-sidebar-item-left">
                  <User size={18} />
                  <span>Profile</span>
                </div>
                <ChevronRight size={14} color="var(--brand-muted)" />
              </button>

              {/* 2. My Orders */}
              <button
                type="button"
                onClick={() => handleTabChange('orders')}
                className={`account-sidebar-item ${currentTab === 'orders' ? 'active' : ''}`}
              >
                <div className="account-sidebar-item-left">
                  <Package size={18} />
                  <span>My Orders</span>
                </div>
                {isAuthenticated ? (
                  <span className="account-sidebar-badge">{orders.length}</span>
                ) : (
                  <Lock size={13} color="#94a3b8" />
                )}
              </button>

              {/* 3. Saved Addresses */}
              <button
                type="button"
                onClick={() => handleTabChange('address')}
                className={`account-sidebar-item ${currentTab === 'address' ? 'active' : ''}`}
              >
                <div className="account-sidebar-item-left">
                  <MapPin size={18} />
                  <span>Saved Addresses</span>
                </div>
                {isAuthenticated ? (
                  <span className="account-sidebar-badge">{addresses.length}</span>
                ) : (
                  <Lock size={13} color="#94a3b8" />
                )}
              </button>

              {/* 4. My Wishlist */}
              <Link
                to="/wishlist"
                className="account-sidebar-item"
              >
                <div className="account-sidebar-item-left">
                  <Heart size={18} />
                  <span>My Wishlist</span>
                </div>
                {wishlist.length > 0 && (
                  <span className="account-sidebar-badge">{wishlist.length}</span>
                )}
              </Link>

              {/* 5. Connected Accounts */}
              <button
                type="button"
                onClick={() => handleTabChange('connected')}
                className={`account-sidebar-item ${currentTab === 'connected' ? 'active' : ''}`}
              >
                <div className="account-sidebar-item-left">
                  <Link2 size={18} />
                  <span>Connected Accounts</span>
                </div>
                {!isAuthenticated && (
                  <Lock size={13} color="#94a3b8" />
                )}
              </button>

              {/* 6. Sign Out (for Authenticated) */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="account-sidebar-item logout"
                >
                  <div className="account-sidebar-item-left">
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </div>
                </button>
              )}
            </nav>
          </aside>

          {/* Right Column: Main Content Area */}
          <main className="account-main-content">
            {/* Tab: Overview (Account Dashboard) */}
            {currentTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                {!isAuthenticated && (
                  <div className="card account-card-fluid" style={{ background: '#faf5ea', border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em', color: '#b45309', textTransform: 'uppercase' }}>
                          GUEST PATRON
                        </span>
                        <h3 style={{ margin: '4px 0 2px', fontSize: '1.2rem', color: 'var(--brand-primary)' }}>
                          Welcome to MUETY
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Sign in with your phone OTP or Google account to track orders and save addresses.
                        </p>
                      </div>
                      <Link to="/login?redirect=/account" className="btn btn-primary btn-sm" style={{ padding: '8px 18px', fontWeight: 700 }}>
                        Sign In / Register
                      </Link>
                    </div>
                  </div>
                )}

                {/* MUETY Patron Circle Luxury VIP Card */}
                {isAuthenticated && user && (
                  <div className="card account-card-fluid" style={{ 
                    background: user.patronCircleMember 
                      ? 'linear-gradient(135deg, #090d16 0%, #1a1612 100%)' 
                      : 'linear-gradient(135deg, #fffdfa 0%, #faf5ea 100%)',
                    border: `1px solid ${user.patronCircleMember ? '#d4af37' : '#fde68a'}`,
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    color: user.patronCircleMember ? '#ffffff' : 'var(--brand-primary)',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.08)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '240px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: user.patronCircleMember ? 'rgba(212, 175, 55, 0.2)' : '#fef3c7',
                          color: '#d4af37',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid rgba(212, 175, 55, 0.4)'
                        }}>
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
                              MUETY PATRON CIRCLE
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: user.patronCircleMember ? 'rgba(212, 175, 55, 0.25)' : '#e2e8f0',
                              color: user.patronCircleMember ? '#fef08a' : '#64748b'
                            }}>
                              {user.patronCircleMember ? '✨ Active Member' : 'Available Invitation'}
                            </span>
                          </div>
                          <h3 style={{ margin: '4px 0 2px', fontSize: '1.18rem', fontFamily: 'var(--font-heading)', color: user.patronCircleMember ? '#ffffff' : 'var(--brand-primary)' }}>
                            {user.patronCircleMember ? 'Exclusive VIP Patron Privileges' : 'Join the MUETY Patron Circle'}
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: user.patronCircleMember ? '#cbd5e1' : 'var(--text-secondary)', maxWidth: '580px' }}>
                            {user.patronCircleMember 
                              ? 'Welcome, esteemed patron. You have VIP reservation access to new handloom drops, private couture concierge, and festive private previews.'
                              : 'Experience Salem pure silks with priority drop reservations, invitation-only festival edits, and complimentary concierge assistance.'}
                          </p>
                        </div>
                      </div>

                      {!user.patronCircleMember && (
                        <button
                          type="button"
                          disabled={isJoiningCircle}
                          onClick={handleJoinPatronCircle}
                          className="btn btn-primary btn-sm"
                          style={{
                            padding: '10px 22px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#090d16',
                            borderColor: '#d4af37',
                            color: '#d4af37'
                          }}
                        >
                          <Sparkles size={15} />
                          {isJoiningCircle ? 'Joining Circle...' : 'Join Patron Circle'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Action Navigation Grid */}
                <div className="account-overview-grid">
                  {isAuthenticated ? (
                    <div 
                      className="account-nav-card"
                      onClick={() => handleTabChange('orders')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('orders'); }}
                    >
                      <div className="account-nav-card-left">
                        <div className="account-nav-card-icon">
                          <Package size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>My Orders</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                            {orders.length} order{orders.length === 1 ? '' : 's'} recorded
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--brand-muted)" />
                    </div>
                  ) : (
                    <Link 
                      to="/login?redirect=/account?tab=orders"
                      className="account-nav-card"
                    >
                      <div className="account-nav-card-left">
                        <div className="account-nav-card-icon">
                          <Package size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>My Orders</h4>
                            <Lock size={12} color="#94a3b8" />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                            Sign in to track orders
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--brand-muted)" />
                    </Link>
                  )}

                  {isAuthenticated ? (
                    <div 
                      className="account-nav-card"
                      onClick={() => handleTabChange('address')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('address'); }}
                    >
                      <div className="account-nav-card-left">
                        <div className="account-nav-card-icon">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Delivery Addresses</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                            {addresses.length} saved location{addresses.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--brand-muted)" />
                    </div>
                  ) : (
                    <Link 
                      to="/login?redirect=/account?tab=address"
                      className="account-nav-card"
                    >
                      <div className="account-nav-card-left">
                        <div className="account-nav-card-icon">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Delivery Addresses</h4>
                            <Lock size={12} color="#94a3b8" />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                            Sign in to manage addresses
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--brand-muted)" />
                    </Link>
                  )}

                  <Link 
                    to="/wishlist" 
                    className="account-nav-card"
                  >
                    <div className="account-nav-card-left">
                      <div className="account-nav-card-icon">
                        <Heart size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>My Wishlist</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                          {wishlist.length} saree{wishlist.length === 1 ? '' : 's'} saved
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--brand-muted)" />
                  </Link>

                  <div 
                    className="account-nav-card"
                    onClick={() => handleTabChange('profile')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('profile'); }}
                  >
                    <div className="account-nav-card-left">
                      <div className="account-nav-card-icon">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Profile Settings</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                          {hasGenuineName ? 'Personal details & name' : (isAuthenticated ? 'Add your full name' : 'Explore profile details')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--brand-muted)" />
                  </div>

                  {isAuthenticated ? (
                    <div 
                      className="account-nav-card"
                      onClick={() => handleTabChange('connected')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('connected'); }}
                    >
                      <div className="account-nav-card-left">
                        <div className="account-nav-card-icon">
                          <Link2 size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Connected Accounts</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                            {connectedStatus.isGoogleConnected && connectedStatus.isPhoneConnected 
                              ? 'Google & Phone linked' 
                              : connectedStatus.isGoogleConnected 
                                ? 'Google linked' 
                                : connectedStatus.isPhoneConnected 
                                  ? 'Phone verified' 
                                  : 'Google & Phone OTP'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--brand-muted)" />
                    </div>
                  ) : (
                    <Link 
                      to="/login?redirect=/account?tab=connected"
                      className="account-nav-card"
                    >
                      <div className="account-nav-card-left">
                        <div className="account-nav-card-icon">
                          <Link2 size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Connected Accounts</h4>
                            <Lock size={12} color="#94a3b8" />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                            Google & Phone OTP
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--brand-muted)" />
                    </Link>
                  )}
                </div>

                {/* Profile Summary Card */}
                <div className="card account-card-fluid">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--brand-primary)' }}>Account Summary</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                        Your authoritative patron profile details
                      </span>
                    </div>
                    {isAuthenticated ? (
                      <button 
                        onClick={() => handleTabChange('profile')}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Edit2 size={13} /> Edit Profile
                      </button>
                    ) : (
                      <Link 
                        to="/login?redirect=/account"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                      >
                        Sign In / Register
                      </Link>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand-muted)', fontWeight: 700 }}>
                        Full Name
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)', marginTop: '4px' }}>
                        {hasGenuineName && user?.displayName ? user.displayName : (isAuthenticated ? 'Not set (Add Name)' : 'Guest')}
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand-muted)', fontWeight: 700 }}>
                        Email Address
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)', marginTop: '4px' }}>
                        {user?.email || 'Not connected'}
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-border)' }}>
                      <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand-muted)', fontWeight: 700 }}>
                        Mobile Phone
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)', marginTop: '4px' }}>
                        {connectedStatus.maskedPhone || user?.phoneNumber || 'Not connected'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Tab 1: Orders History */}
        {currentTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            {!isAuthenticated || !user ? (
              <div className="account-guest-cta-card">
                <div className="account-guest-cta-icon-wrap">
                  <Package size={26} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Sign In to Access Your Orders
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                  View your pure silk handloom orders, live delivery tracking, invoices, and verified patron impressions.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <Link to="/login?redirect=/account?tab=orders" className="btn btn-primary btn-sm" style={{ padding: '8px 24px', fontWeight: 700 }}>
                    Sign In / Register
                  </Link>
                  <span style={{ fontSize: '0.76rem', color: 'var(--brand-muted)' }}>
                    Continue with Phone Number (OTP) or Google
                  </span>
                </div>
              </div>
            ) : orders.length === 0 ? (
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
            {!isAuthenticated || !user ? (
              <div className="account-guest-cta-card">
                <div className="account-guest-cta-icon-wrap">
                  <MapPin size={26} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Sign In to Manage Delivery Addresses
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                  Save your residence, atelier, and gifting destinations for rapid, one-click checkout.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <Link to="/login?redirect=/account?tab=address" className="btn btn-primary btn-sm" style={{ padding: '8px 24px', fontWeight: 700 }}>
                    Sign In / Register
                  </Link>
                  <span style={{ fontSize: '0.76rem', color: 'var(--brand-muted)' }}>
                    Continue with Phone Number (OTP) or Google
                  </span>
                </div>
              </div>
            ) : (
              <>
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
          </>
        )}
      </div>
        )}

        {/* Tab 4: Profile Settings (Focused Single Card) */}
        {currentTab === 'profile' && (
          <div className="account-form-wrapper" style={{ maxWidth: '720px' }}>
            {!isAuthenticated && (
              <div style={{
                backgroundColor: '#faf5ea',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <AlertCircle size={16} color="#b45309" />
                  <span style={{ fontSize: '0.84rem', color: '#92400e' }}>
                    You are exploring as a Guest. Sign in with Phone or Google to save changes to your profile.
                  </span>
                </div>
                <Link to="/login?redirect=/account?tab=profile" className="btn btn-primary btn-sm" style={{ padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700 }}>
                  Sign In / Register
                </Link>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="card account-card-fluid">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.85rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--brand-primary)' }}>Profile Settings</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                    Personal contact details and patron recipient name
                  </span>
                </div>
              </div>

              {profileError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.86rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{profileError}</span>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label" htmlFor="profile-fullname">Full Name *</label>
                <input 
                  id="profile-fullname"
                  type="text" 
                  required
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  placeholder="Enter your full name (e.g. Mohan Kumar)"
                  className="form-input" 
                  style={{ boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.76rem', color: 'var(--brand-muted)', marginTop: '4px', display: 'block' }}>
                  Used across your orders, dashboard greeting, delivery receipts, and invoices.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="email" 
                    disabled 
                    value={user?.email || 'No email connected'} 
                    className="form-input" 
                    style={{ backgroundColor: 'var(--bg-main)', opacity: 0.9, boxSizing: 'border-box', flex: 1 }} 
                  />
                  {connectedStatus.isGoogleConnected && (
                    <span className="badge-status-connected" title="Verified via Google OAuth">
                      <CheckCircle2 size={13} /> Verified Google
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)} 
                    placeholder="+91 93857 91540" 
                    className="form-input" 
                    style={{ boxSizing: 'border-box', flex: 1 }}
                  />
                  {connectedStatus.isPhoneConnected && (
                    <span className="badge-status-connected" title="Verified via Phone OTP">
                      <CheckCircle2 size={13} /> Verified
                    </span>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary account-save-btn"
                disabled={isSavingProfile}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {isSavingProfile ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Profile Changes</span>
                )}
              </button>
            </form>

            {/* Quick Link Card to Dedicated Connected Accounts */}
            <div className="card account-card-fluid" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div className="account-nav-card-icon" style={{ width: '40px', height: '40px' }}>
                  <Link2 size={18} color="#c9a227" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>Connected Accounts</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--brand-muted)' }}>
                    Manage linked Google and mobile phone OTP authentication methods.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('connected')}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Manage Connected Accounts</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Dedicated Connected Accounts Page */}
        {currentTab === 'connected' && (
          <div className="account-form-wrapper" style={{ maxWidth: '720px' }}>
            {!isAuthenticated || !user ? (
              <div className="card account-card-fluid account-guest-cta-card">
                <div className="account-guest-cta-icon">
                  <Link2 size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Sign In to Manage Connected Accounts
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                  Connect your Google account and mobile phone number for fast 1-tap OTP authentication and order tracking.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <Link to="/login?redirect=/account?tab=connected" className="btn btn-primary btn-sm" style={{ padding: '8px 24px', fontWeight: 700 }}>
                    Sign In / Register
                  </Link>
                  <span style={{ fontSize: '0.76rem', color: 'var(--brand-muted)' }}>
                    Continue with Phone Number (OTP) or Google
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div id="connected-accounts-section" className="account-connected-section">
                  <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link2 size={18} color="#c9a227" />
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--brand-primary)' }}>Connected Accounts</h3>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--brand-muted)' }}>
                      Connect both Google and mobile number to sign in effortlessly using either method.
                    </p>
                  </div>

                  {/* Row 1: Google Account */}
                  <div className="connected-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Google Account</span>
                          {connectedStatus.isGoogleConnected ? (
                            <span className="badge-status-connected">
                              <CheckCircle2 size={12} /> Connected
                            </span>
                          ) : (
                            <span className="badge-status-disconnected">Not connected</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {connectedStatus.googleEmail || user?.email || 'Link Google for instant 1-tap sign-in'}
                        </span>
                      </div>
                    </div>

                    {!connectedStatus.isGoogleConnected && (
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={isLinkingGoogle}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        {isLinkingGoogle ? (
                          <>
                            <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Link2 size={14} /> Connect Google Account
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Row 2: Phone Number */}
                  <div className="connected-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        backgroundColor: '#faf8f3', 
                        border: '1px solid #f1ece1', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--brand-primary)'
                      }}>
                        <Phone size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Mobile Phone</span>
                          {connectedStatus.isPhoneConnected ? (
                            <span className="badge-status-connected">
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          ) : (
                            <span className="badge-status-disconnected">Not connected</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', display: 'block' }}>
                          {connectedStatus.maskedPhone || user?.phoneNumber || 'Add mobile number for SMS OTP sign-in & live updates'}
                        </span>
                      </div>
                    </div>

                    {!connectedStatus.isPhoneConnected && (
                      <button
                        type="button"
                        onClick={handleOpenPhoneLinkModal}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={14} /> Add and verify phone number
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Management */}
                <div className="card account-card-fluid" style={{ marginTop: '1.5rem' }}>
                  <div style={{
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
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
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
                  Verified Purchase for Order #{reviewModalItem.orderId}
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

      {/* Phone Number Verification & Linking Modal */}
      {isPhoneModalOpen && (
        <div className="admin-modal-overlay">
          <div className="card account-card-fluid" style={{
            maxWidth: '460px',
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
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--brand-primary)' }}>
                  {phoneLinkStep === 'phone' ? 'Verify Mobile Number' : 'Enter Verification Code'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                  {phoneLinkStep === 'phone' 
                    ? 'Connect your phone number for secure OTP login' 
                    : `Enter the 6-digit code sent to ${linkPhoneCode} ${linkPhoneNumber}`}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsPhoneModalOpen(false)} 
                style={{ padding: '6px', color: 'var(--brand-muted)', background: 'none', border: 'none', cursor: 'pointer' }} 
                aria-label="Close Phone Verification"
              >
                <X size={20} />
              </button>
            </div>

            {phoneLinkError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.86rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{phoneLinkError}</span>
              </div>
            )}

            {phoneLinkStep === 'phone' ? (
              <form onSubmit={handleSendPhoneLinkOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mobile Phone Number *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={linkPhoneCode}
                      onChange={e => setLinkPhoneCode(e.target.value)}
                      className="form-input"
                      style={{ width: '90px', flexShrink: 0, paddingRight: '4px' }}
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+971">+971 (AE)</option>
                      <option value="+65">+65 (SG)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+60">+60 (MY)</option>
                      <option value="+94">+94 (LK)</option>
                    </select>
                    <input 
                      type="tel" 
                      required
                      placeholder="98765 43210"
                      value={linkPhoneNumber}
                      onChange={e => setLinkPhoneNumber(e.target.value)}
                      className="form-input"
                      style={{ flex: 1, boxSizing: 'border-box' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--brand-muted)', marginTop: '4px', display: 'block' }}>
                    Standard SMS rates may apply. A 6-digit verification code will be sent.
                  </span>
                </div>

                {/* Container for invisible reCAPTCHA */}
                <div id="phone-link-recaptcha" style={{ margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsPhoneModalOpen(false)}
                    className="btn btn-outline"
                    disabled={isSendingPhoneOtp}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSendingPhoneOtp || !linkPhoneNumber.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSendingPhoneOtp ? (
                      <>
                        <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <span>Send Verification Code</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneLinkOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>6-Digit Verification Code *</label>
                    <button
                      type="button"
                      onClick={() => setPhoneLinkStep('phone')}
                      style={{ background: 'none', border: 'none', color: '#c9a227', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Change Number
                    </button>
                  </div>
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={linkPhoneOtp}
                    onChange={e => setLinkPhoneOtp(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ fontSize: '1.25rem', letterSpacing: '0.25em', textAlign: 'center', fontWeight: 700, boxSizing: 'border-box' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--brand-muted)' }}>
                      Did not receive code?
                    </span>
                    <button
                      type="button"
                      disabled={phoneLinkCooldown > 0 || isSendingPhoneOtp}
                      onClick={handleSendPhoneLinkOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: phoneLinkCooldown > 0 ? 'var(--brand-muted)' : '#c9a227',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: phoneLinkCooldown > 0 ? 'not-allowed' : 'pointer',
                        padding: 0
                      }}
                    >
                      {phoneLinkCooldown > 0 ? `Resend Code in ${phoneLinkCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setPhoneLinkStep('phone')}
                    className="btn btn-outline"
                    disabled={isVerifyingPhoneOtp}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isVerifyingPhoneOtp || linkPhoneOtp.trim().length < 6}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isVerifyingPhoneOtp ? (
                      <>
                        <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify & Link Phone</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
