import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { reviewService } from '@/features/reviews/services/reviewService';
import { storageService } from '@/lib/storage/storageService';
import { useCart } from '@/shared/context/CartContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { 
  Star, 
  Heart, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Minus, 
  Plus, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Zap
} from 'lucide-react';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { Product, Review, PatronReview } from '@/types';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, toggleWishlist, isInWishlist, setIsDrawerOpen } = useCart();
  const { success, warning } = useNotification();

  const [product, setProduct] = useState<Product | null>(null);
  const [liveReviews, setLiveReviews] = useState<PatronReview[]>([]);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = React.useRef<number>(0);

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews' | 'shipping'>('details');

  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setZoomOrigin({ x: 50, y: 50 });
    setIsDragging(false);
  };

  useEffect(() => {
    let isMounted = true;
    if (id) {
      const cached = productService.getProductBySlug(id);
      if (cached) {
        setProduct(cached);
        storageService.addRecentlyViewed(cached.id);
        setSelectedImage(0);
        resetZoom();
        if (cached.colors && cached.colors.length > 0) setSelectedColor(cached.colors[0]);
        if (cached.sizes && cached.sizes.length > 0) setSelectedSize(cached.sizes[0]);
        setQuantity(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      productService.fetchProductBySlug(id).then(found => {
        if (isMounted && found) {
          setProduct(found);
          storageService.addRecentlyViewed(found.id);
          if (!cached) {
            setSelectedImage(0);
            resetZoom();
            if (found.colors && found.colors.length > 0) setSelectedColor(found.colors[0]);
            if (found.sizes && found.sizes.length > 0) setSelectedSize(found.sizes[0]);
            setQuantity(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    }
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    if (!product && !id) return;
    const targetId = product?.id || product?.slug || id || '';
    if (!targetId) return;

    const unsub = reviewService.subscribeToProductReviews(targetId, (revs) => {
      setLiveReviews(revs);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [product?.id, product?.slug, id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen || !product) return;
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        resetZoom();
      } else if (e.key === 'ArrowLeft') {
        resetZoom();
        setSelectedImage(prev => (prev > 0 ? prev - 1 : product.images.length - 1));
      } else if (e.key === 'ArrowRight') {
        resetZoom();
        setSelectedImage(prev => (prev < product.images.length - 1 ? prev + 1 : 0));
      }
    };

    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      resetZoom();
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, product]);

  const handleImageDoubleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (zoomScale === 1) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomOrigin({ x, y });
      setZoomScale(2.3);
      setPanOffset({ x: 0, y: 0 });
    } else {
      resetZoom();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      e.preventDefault();
      e.stopPropagation();
      setPanOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoomScale === 1) {
        setZoomScale(2.5);
      } else {
        resetZoom();
      }
    }
    lastTapRef.current = now;

    if (e.touches.length === 1 && zoomScale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    if (isDragging && e.touches.length === 1 && zoomScale > 1) {
      setPanOffset({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useDocumentTitle(product?.name || 'Creation Details');

  if (!product) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2>Creation Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
          The requested luxury piece could not be located in our active catalog.
        </p>
        <Link to="/products" className="btn btn-primary">Return to Catalog</Link>
      </div>
    );
  }

  const isSaved = isInWishlist(product.id);
  const relatedProducts = productService.getRelatedProducts(product.id, 4, product);

  const effectiveReviewCount = liveReviews.length > 0 ? liveReviews.length : (product.reviewCount || 0);
  const calculatedAvg = liveReviews.length > 0 
    ? (liveReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / liveReviews.length)
    : (product.rating || 5.0);
  const effectiveRating = Number(calculatedAvg.toFixed(1));

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAuthor = reviewerName.trim();
    const cleanComment = reviewComment.trim();
    const cleanTitle = reviewTitle.trim() || 'Patron Review';

    if (!cleanAuthor || !cleanComment) {
      warning('Please provide your name and review comment.', 'Missing Information');
      return;
    }

    try {
      const createdReview = await reviewService.addReview({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        authorName: cleanAuthor,
        authorLocation: 'India',
        rating: reviewRating,
        title: cleanTitle,
        quote: cleanComment,
        comment: cleanComment,
        status: 'approved',
        isFeatured: false,
        verifiedPurchase: true
      });

      // Audit Log for REVIEW_CREATED
      await auditService.logAction({
        actorUid: user?.uid || 'patron-guest',
        actorEmail: user?.email || 'patron@muety.in',
        actorRole: (user?.roles?.[0] as any) || 'customer',
        action: 'REVIEW_CREATED',
        entityType: 'PRODUCT',
        entityId: createdReview.id,
        after: createdReview,
        reason: `Submitted review for ${product.name}`
      });

      success('Thank you! Your testimonial has been published to Firestore.', 'Review Added');
      setReviewerName('');
      setReviewTitle('');
      setReviewComment('');
      setShowReviewForm(false);
    } catch (err: any) {
      warning(err?.message || 'Failed to submit review.');
    }
  };

  const isSoldOut = product.availability === 'sold_out' || product.stock === 0;
  const isManualSoldOut = product.availability === 'sold_out';

  return (
    <div className="product-detail-page pdp-page animate-fade-in">
      <div className="pdp-breadcrumb-bar">
        <div className="container">
          <div className="pdp-breadcrumb-inner">
            <Link to="/" className="pdp-breadcrumb-link">Home</Link>
            <ChevronRight size={13} style={{ flexShrink: 0 }} />
            <Link to="/products" className="pdp-breadcrumb-link">Catalog</Link>
            <ChevronRight size={13} style={{ flexShrink: 0 }} />
            <Link to={`/category/${product.categorySlug}`} className="pdp-breadcrumb-link">{product.category}</Link>
            <ChevronRight size={13} style={{ flexShrink: 0 }} />
            <span className="pdp-breadcrumb-current">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: 'clamp(1rem, 2.5vw, 2.5rem)' }}>
        <div className="pdp-grid">
          <div className="pdp-gallery-col">
            <div 
              className="pdp-main-image-card"
              onClick={() => setIsLightboxOpen(true)}
              title="Click to view high-resolution saree drape"
            >
              <img 
                src={product.images[selectedImage] || product.images[0]} 
                alt={product.name}
                className="pdp-main-img"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                className="pdp-expand-btn"
                aria-label="Expand image gallery"
              >
                <Maximize2 size={13} /> Expand Gallery
              </button>
            </div>

            {product.images.length > 1 && (
              <div className="pdp-thumbnails-strip">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`pdp-thumbnail-btn ${selectedImage === idx ? 'active' : ''}`}
                    aria-label={`View creation drape ${idx + 1}`}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pdp-info-col">
            <div className="pdp-header-meta">
              <span className="pdp-category-sku">
                {product.category} • SKU: {product.sku || product.id.slice(0, 8).toUpperCase()}
              </span>

              {isManualSoldOut && (
                <span className="pdp-soldout-pill">
                  🔴 SOLD OUT
                </span>
              )}
            </div>

            <h1 className="pdp-title">
              {product.name}
            </h1>

            <div className="pdp-rating-row">
              <div className="pdp-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill={i < Math.floor(effectiveRating) ? '#f59e0b' : 'none'} color="#f59e0b" />
                ))}
              </div>
              <span className="pdp-rating-score">
                {effectiveRating.toFixed(1)}
              </span>
              <button 
                type="button"
                onClick={() => {
                  setActiveTab('reviews');
                  const el = document.getElementById('pdp-tabs-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="pdp-review-count"
              >
                ({effectiveReviewCount} {effectiveReviewCount === 1 ? 'verified review' : 'verified reviews'})
              </button>
            </div>

            <div className="pdp-price-row">
              <span className="pdp-price-current">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="pdp-price-original">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="pdp-discount-badge">
                    -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {product.shortDescription && (
              <p className="pdp-description-short">
                {product.shortDescription}
              </p>
            )}

            {product.colors && product.colors.length > 0 && (
              <div className="pdp-shade-group">
                <label className="pdp-shade-label">
                  Finish / Shade: <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{selectedColor}</span>
                </label>
                <div className="pdp-shade-list">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`pdp-shade-chip ${selectedColor === color ? 'active' : ''}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Responsive Actions: Stepper + Wishlist + Cart + Buy Now */}
            <div className="pdp-actions-container">
              <div className="pdp-qty-wishlist-row">
                <div className="pdp-qty-wrapper">
                  <span className="pdp-qty-label">Quantity</span>
                  <div className="pdp-stepper">
                    <button 
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="pdp-stepper-btn"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="pdp-stepper-num">
                      {quantity}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setQuantity(prev => Math.min(product.stock || 99, prev + 1))}
                      className="pdp-stepper-btn"
                      aria-label="Increase quantity"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={`pdp-wishlist-btn ${isSaved ? 'saved' : ''}`}
                  aria-label="Wishlist"
                >
                  <Heart size={18} fill={isSaved ? '#ef4444' : 'none'} color={isSaved ? '#ef4444' : 'currentColor'} />
                  <span>{isSaved ? 'Saved' : 'Wishlist'}</span>
                </button>
              </div>

              <div className="pdp-buttons-grid">
                <button
                  type="button"
                  onClick={() => {
                    if (isSoldOut) return;
                    addToCart(product, quantity, selectedColor, selectedSize);
                  }}
                  disabled={isSoldOut}
                  className="btn btn-primary pdp-add-to-bag-btn"
                >
                  <ShoppingBag size={18} />
                  <span>{isSoldOut ? 'SOLD OUT' : 'Add to Bag'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isSoldOut) return;
                    addToCart(product, quantity, selectedColor, selectedSize);
                    setIsDrawerOpen(false);
                    navigate('/checkout');
                  }}
                  disabled={isSoldOut}
                  className="btn btn-accent pdp-buy-now-btn"
                >
                  <Zap size={18} fill="currentColor" />
                  <span>Buy Now</span>
                </button>
              </div>
            </div>

            {/* Value Proposition Cards */}
            <div className="pdp-trust-grid">
              <div className="pdp-trust-item">
                <div className="pdp-trust-icon-box">
                  <Truck size={19} />
                </div>
                <div>
                  <div className="pdp-trust-title">Pan-India Courier (₹89 Flat)</div>
                  <div className="pdp-trust-sub">Muety Atelier dispatch • Insured transit</div>
                </div>
              </div>

              <div className="pdp-trust-item">
                <div className="pdp-trust-icon-box">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <div className="pdp-trust-title">Silk Mark Certified</div>
                  <div className="pdp-trust-sub">100% Pure Mulberry Silk Guarantee</div>
                </div>
              </div>
            </div>

            {/* Atelier Concierge Whatsapp */}
            <div className="pdp-concierge-box">
              <a
                href={`https://wa.me/919940668095?text=${encodeURIComponent(`Hello MUETY Atelier, I am enquiring about "${product.name}" (SKU: ${product.sku || product.id}). Could you assist with drape consultation and availability?`)}`}
                target="_blank"
                rel="noreferrer"
                className="pdp-concierge-link"
              >
                <span>💬</span>
                <span>Enquire with Muety Atelier Concierge about this saree</span>
              </a>
            </div>
          </div>
        </div>

        {/* Product Information Tabs */}
        <div id="pdp-tabs-section" className="pdp-tabs-container">
          {/* Mobile Tab Dropdown Selector (shown on mobile, hidden on desktop) */}
          <div className="pdp-tabs-mobile-dropdown">
            <label htmlFor="pdp-mobile-tab-select" className="pdp-tabs-mobile-label">
              Product Details Section
            </label>
            <div className="pdp-tabs-select-wrapper">
              <select
                id="pdp-mobile-tab-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="pdp-tabs-select"
                aria-label="Select product details section"
              >
                <option value="details">Description &amp; Craft</option>
                <option value="specs">Specifications</option>
                <option value="reviews">
                  Patron Reviews ({liveReviews.length || (product.reviews ? product.reviews.length : product.reviewCount || 0)})
                </option>
                <option value="shipping">Shipping &amp; Care</option>
              </select>
              <ChevronDown size={18} className="pdp-tabs-select-icon" />
            </div>
          </div>

          {/* Desktop/Tablet Horizontal Tabs (hidden on mobile, shown on desktop) */}
          <div className="pdp-tabs-nav">
            {(['details', 'specs', 'reviews', 'shipping'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pdp-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'details' && 'Description & Craft'}
                {tab === 'specs' && 'Specifications'}
                {tab === 'reviews' && `Patron Reviews (${liveReviews.length || (product.reviews ? product.reviews.length : product.reviewCount || 0)})`}
                {tab === 'shipping' && 'Shipping & Care'}
              </button>
            ))}
          </div>

          <div style={{ minHeight: '200px' }}>
            {activeTab === 'details' && (
              <div style={{ maxWidth: '800px', lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
                <p style={{ marginBottom: '1.25rem' }}>{product.description}</p>
                <p>
                  Every MUETY piece is handcrafted by master artisans in accordance with centuries-old heritage techniques. From the initial thread selection to the final hand-finishing, quality control is uncompromising.
                </p>
              </div>
            )}

            {activeTab === 'specs' && (
              <div style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(product.specifications || {}).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--brand-border)', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>{key}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)', margin: 0 }}>Patron Testimonials</h3>
                    <p style={{ color: 'var(--brand-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>Authentic feedback from verified collectors.</p>
                  </div>
                  <button onClick={() => setShowReviewForm(!showReviewForm)} className="btn btn-outline btn-sm">
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </div>

                {showReviewForm && (
                  <form onSubmit={handleAddReview} style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--brand-border)', marginBottom: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Submit Your Testimonial</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Your Name</label>
                        <input type="text" value={reviewerName} onChange={e => setReviewerName(e.target.value)} required className="form-input" placeholder="e.g. Ananya Sharma" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Rating</label>
                        <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="form-select">
                          <option value={5}>5 Stars (Exceptional)</option>
                          <option value={4}>4 Stars (Very Good)</option>
                          <option value={3}>3 Stars (Average)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Review Comment</label>
                      <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} required rows={3} className="form-input" placeholder="Describe your experience with this creation..." />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">Submit Review</button>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {liveReviews.length === 0 && (!product.reviews || product.reviews.length === 0) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px dashed var(--brand-border)', color: 'var(--text-secondary)' }}>
                      No testimonials published yet for this piece. Be the first patron to share your experience.
                    </div>
                  ) : (
                    (liveReviews.length > 0 ? liveReviews : (product.reviews || [])).map((rev: any) => (
                      <div key={rev.id} style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{rev.authorName || rev.userName}</span>
                            {rev.authorLocation && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>({rev.authorLocation})</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', color: '#f59e0b' }}>
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} fill={i < (rev.rating || 5) ? '#f59e0b' : 'none'} color="#f59e0b" />
                            ))}
                          </div>
                        </div>
                        {rev.title && (
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>
                            "{rev.title}"
                          </div>
                        )}
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                          {rev.quote || rev.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div style={{ maxWidth: '800px', lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
                <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                  Pan-India Tracked Courier Delivery (₹89 Flat)
                </h4>
                <p style={{ marginBottom: '1rem' }}>
                  Orders are dispatched to serviceable PIN codes across India via trusted courier partners. Dispatch is initiated promptly after online payment confirmation or COD advance verification. A tracking link is provided upon courier pickup. Timelines are estimates and vary depending on courier network coverage and destination PIN code.
                </p>

                <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
                  <strong>Transparent Order Total Calculation:</strong><br />
                  <code style={{ wordBreak: 'break-word', whiteSpace: 'normal', display: 'block', marginTop: '6px' }}>
                    Order Total = Item Subtotal − Discount + Applicable Tax (5% GST) + ₹89 Flat Delivery Charge
                  </code>
                </div>

                <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                  Flexible Payment &amp; COD Advance Confirmation
                </h4>
                <p style={{ marginBottom: '1rem' }}>
                  Choose full online payment via Razorpay (UPI, Credit/Debit Cards, NetBanking) for zero-contact delivery, or select Cash on Delivery (COD) with an advance confirmation fee of <strong>₹89</strong> paid online. The ₹89 advance is credited directly toward your total order amount; the remaining balance is collected at delivery. Per policy, the advance is non-refundable for ordinary customer cancellations or refusal to accept delivery once dispatched.
                </p>

                <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                  3-Day Review Window &amp; Unboxing Video Requirement
                </h4>
                <p style={{ marginBottom: '1rem' }}>
                  In the rare event of damaged, defective, incorrect or materially misdescribed items, contact <strong>support@muety.in</strong> within <strong>3 days of delivery</strong> with continuous, unedited unboxing video evidence. No returns are accepted for change of mind or personal preference. Statutory consumer rights under Indian law remain fully preserved.
                </p>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                  For full details, please review our{' '}
                  <Link to="/shipping-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Shipping Policy</Link>{' '}
                  and{' '}
                  <Link to="/return-refund-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Return, Refund &amp; Cancellation Policy</Link>.
                </p>
              </div>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div style={{ marginTop: 'clamp(3rem, 6vw, 6rem)' }}>
            <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: 'var(--brand-primary)', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>
              Curated For You
            </h2>
            <div className="products-grid-4col">
              {relatedProducts.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {isLightboxOpen && product && createPortal(
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 15, 0.96)',
            backdropFilter: 'blur(12px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.25s ease'
          }}
          onClick={() => { setIsLightboxOpen(false); resetZoom(); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{product.name}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '12px' }}>
                Image {selectedImage + 1} of {product.images.length}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setZoomScale(prev => Math.min(prev + 0.5, 4)); }} 
                style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                title="Zoom In"
              >
                <ZoomIn size={22} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); resetZoom(); }} 
                style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                title="Reset Zoom"
              >
                <ZoomOut size={22} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); resetZoom(); }} 
                style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                title="Close Lightbox"
              >
                <X size={26} />
              </button>
            </div>
          </div>

          <div 
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              userSelect: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img 
              src={product.images[selectedImage] || product.images[0]} 
              alt={product.name}
              onDoubleClick={handleImageDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                maxWidth: '90vw',
                maxHeight: '82vh',
                objectFit: 'contain',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
              }}
            />

            {product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); resetZoom(); setSelectedImage(prev => (prev > 0 ? prev - 1 : product.images.length - 1)); }}
                  style={{ position: 'absolute', left: '24px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); resetZoom(); setSelectedImage(prev => (prev < product.images.length - 1 ? prev + 1 : 0)); }}
                  style={{ position: 'absolute', right: '24px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
