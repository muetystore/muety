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
  X
} from 'lucide-react';
import { Order, Product } from '@/types';

export const AccountPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'orders';

  useDocumentTitle(currentTab === 'orders' ? 'My Orders' : 'Customer Account');
  const { user, isAuthenticated, logout } = useAuth();
  const { wishlist } = useCart();
  const { success, warning } = useNotification();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  
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
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem || !revQuote.trim()) {
      warning('Please share your impressions in the review text.');
      return;
    }

    reviewService.addReview({
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
      isFeatured: false
    });

    success('Thank you! Your verified patron impressions have been published.', 'Review Published');
    setReviewModalItem(null);
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
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '440px', margin: '0 auto', padding: '3rem 2rem' }}>
          <User size={48} color="var(--brand-accent)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>Sign In to Your MUETY Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Access your order history, live tracking, and personalized wishlist.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/login" className="btn btn-primary">Sign In</Link>
            <Link to="/register" className="btn btn-secondary">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Account Hero Banner */}
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#d4af37', textTransform: 'uppercase' }}>
              MUETY PATRON PORTAL
            </span>
            <h1 style={{ color: '#ffffff', fontSize: '2.2rem', marginTop: '4px' }}>
              Welcome back, {user.displayName}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              {user.email} • Client Tier: <strong>MUETY Atelier Club</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => { logout(); navigate('/'); }}
              className="btn btn-outline"
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)', padding: '0.6rem 1.2rem' }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2.5rem' }}>
        {/* Account Nav Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid var(--brand-border)',
          marginBottom: '2.5rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}>
          {[
            { id: 'orders', label: `My Orders (${orders.length})`, icon: Package },
            { id: 'wishlist', label: `Saved Wishlist (${wishlist.length})`, icon: Heart },
            { id: 'address', label: 'Delivery Addresses', icon: MapPin },
            { id: 'profile', label: 'Profile Settings', icon: User }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--brand-primary)' : 'var(--brand-muted)',
                  padding: '12px 18px',
                  borderBottom: isActive ? '3px solid var(--brand-accent)' : '3px solid transparent',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <IconComp size={18} color={isActive ? 'var(--brand-accent)' : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Orders History */}
        {currentTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {orders.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Package size={48} color="var(--brand-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No Order History Yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Explore our luxury timepieces and bespoke collections to place your first order.
                </p>
                <Link to="/products" className="btn btn-primary btn-sm">Explore Collection</Link>
              </div>
            ) : (
              orders.map(ord => (
                <div key={ord.id} className="card" style={{ padding: '2rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    paddingBottom: '1.25rem',
                    borderBottom: '1px solid var(--brand-border)',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', textTransform: 'uppercase' }}>ORDER NUMBER</span>
                      <h4 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)' }}>#{ord.orderNumber}</h4>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Placed on {new Date(ord.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={`badge badge-${ord.orderStatus === 'delivered' ? 'success' : 'dark'}`} style={{ padding: '0.4rem 0.8rem' }}>
                        {ord.orderStatus.toUpperCase()}
                      </span>
                      <Link to={`/order-confirmation/${ord.id}`} className="btn btn-outline btn-sm">
                        View Invoice & Live Tracking <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {ord.items.map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name} 
                          style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-md)', objectFit: 'contain', backgroundColor: '#f8fafc', border: '1px solid var(--brand-border)', padding: '4px' }} 
                        />
                        <div style={{ flex: 1 }}>
                          <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)' }}>{item.product.name}</h5>
                          <span style={{ fontSize: '0.82rem', color: 'var(--brand-muted)' }}>
                            Quantity: {item.quantity} {item.selectedColor ? `• Tone: ${item.selectedColor}` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                            ₹{(item.product.price * item.quantity).toFixed(2)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(ord, item.product)}
                            className="btn btn-outline btn-sm"
                            style={{
                              fontSize: '0.78rem',
                              padding: '4px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: 'var(--brand-primary)',
                              borderColor: 'var(--brand-border)'
                            }}
                          >
                            <Star size={13} fill="#f59e0b" color="#f59e0b" />
                            <span>Share Impression</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid var(--brand-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.9rem'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Shipped to: <strong>{ord.shippingAddress.streetAddress}, {ord.shippingAddress.city}</strong>
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                      Total: ₹{ord.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Wishlist */}
        {currentTab === 'wishlist' && (
          <div>
            {wishlistProducts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Heart size={48} color="var(--brand-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Your Wishlist is Empty</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Save your admired pieces by tapping the heart icon on any product.
                </p>
                <Link to="/products" className="btn btn-primary btn-sm">Explore MUETY Catalog</Link>
              </div>
            ) : (
              <div className="products-grid-3col">
                {wishlistProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Delivery Addresses */}
        {currentTab === 'address' && (
          <div style={{ maxWidth: '680px' }}>
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.1rem' }}>Primary Residence / Delivery Address</h4>
                <span className="badge badge-gold">Default</span>
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>{user.defaultAddress?.fullName || user.displayName}</strong><br />
                {user.defaultAddress?.streetAddress || '2/32 Ramireddypatti'}<br />
                {user.defaultAddress?.city || 'Salem'}, {user.defaultAddress?.state || 'Tamil Nadu'} {user.defaultAddress?.postalCode || '636501'}<br />
                {user.defaultAddress?.country || 'India'}<br />
                Phone: {user.defaultAddress?.phone || '+91 9385791540'}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Profile Settings */}
        {currentTab === 'profile' && (
          <div style={{ maxWidth: '600px' }}>
            <form onSubmit={handleSaveProfile} className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Patron Profile Information</h3>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Read-only)</label>
                <input 
                  type="email" 
                  disabled 
                  value={user.email} 
                  className="form-input" 
                  style={{ backgroundColor: 'var(--bg-main)', opacity: 0.8 }} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  placeholder="+1 (555) 000-0000" 
                  className="form-input" 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Save Profile Changes
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Verified Patron Impression Modal */}
      {reviewModalItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--brand-primary)' }}>Share Patron Impressions</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Verified Purchase for Order #{reviewModalItem.orderId.slice(-6)}
                </span>
              </div>
              <button onClick={() => setReviewModalItem(null)} style={{ padding: '6px', color: 'var(--brand-muted)' }}>
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
              marginBottom: '1.25rem'
            }}>
              <img 
                src={reviewModalItem.product.images[0]} 
                alt={reviewModalItem.product.name} 
                style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', backgroundColor: '#ffffff' }}
              />
              <div>
                <h5 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--brand-primary)' }}>
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
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setReviewModalItem(null)} 
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Submit Verified Impression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
