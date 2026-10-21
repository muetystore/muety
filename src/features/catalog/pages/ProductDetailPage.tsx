import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Zap,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Eye,
  Sparkles
} from 'lucide-react';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { Product, Review, PatronReview } from '@/types';
import { uploadToCloudinary } from '@/lib/media/cloudinary';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { addToCart, toggleWishlist, isInWishlist, setIsDrawerOpen } = useCart();
  const { success, warning } = useNotification();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
  const [openAccordion, setOpenAccordion] = useState<Record<string, boolean>>({
    description: true,
    information: false,
    care: false,
    reviews: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordion(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const [reviewerName, setReviewerName] = useState(user?.displayName || '');
  const [reviewerLocation, setReviewerLocation] = useState('India');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotoFile, setReviewPhotoFile] = useState<File | null>(null);
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ url: string; author: string } | null>(null);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'all'>('all');
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const reviewsScrollRef = useRef<HTMLDivElement>(null);

  const scrollReviews = (direction: 'left' | 'right') => {
    if (reviewsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      reviewsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
        setIsLoading(false);
        storageService.addRecentlyViewed(cached.id);
        setSelectedImage(0);
        resetZoom();
        if (cached.colors && cached.colors.length > 0) setSelectedColor(cached.colors[0]);
        if (cached.sizes && cached.sizes.length > 0) setSelectedSize(cached.sizes[0]);
        setQuantity(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setIsLoading(true);
      }

      productService.fetchProductBySlug(id).then(found => {
        if (isMounted) {
          if (found) {
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
          setIsLoading(false);
        }
      }).catch(err => {
        console.warn('Error fetching product by slug:', err);
        if (isMounted) setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    if (!product && !id) return;
    const targets = [product?.id, product?.slug, product?.name, id].filter(Boolean) as string[];
    if (targets.length === 0) return;

    const unsub = reviewService.subscribeToProductReviews(targets, (revs) => {
      setLiveReviews(revs);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [product?.id, product?.slug, product?.name, id]);

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

  const isSaved = product ? isInWishlist(product.id) : false;
  const relatedProducts = product ? productService.getRelatedProducts(product.id, 4, product) : [];

  const effectiveReviewCount = liveReviews.length > 0 ? liveReviews.length : (product?.reviewCount || 0);
  const calculatedAvg = liveReviews.length > 0 
    ? (liveReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / liveReviews.length)
    : (product?.rating || 5.0);
  const effectiveRating = Number(calculatedAvg.toFixed(1));

  const allProductReviews = useMemo(() => {
    return liveReviews.length > 0 ? liveReviews : (product?.reviews || []);
  }, [liveReviews, product?.reviews]);

  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allProductReviews.forEach((rev: any) => {
      const r = Math.round(Number(rev.rating) || 5);
      if (counts[r] !== undefined) {
        counts[r] += 1;
      }
    });
    return counts;
  }, [allProductReviews]);

  const filteredReviews = useMemo(() => {
    if (selectedRatingFilter === 'all') return allProductReviews;
    return allProductReviews.filter((rev: any) => Math.round(Number(rev.rating) || 5) === selectedRatingFilter);
  }, [allProductReviews, selectedRatingFilter]);

  if (isLoading && !product) {
    return (
      <div className="container" style={{ padding: '8rem 1rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={38} style={{ color: 'var(--brand-gold, #d4af37)', marginBottom: '1.25rem' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
          MUETY ATELIER
        </h2>
        <p style={{ color: 'var(--brand-muted)', fontSize: '0.9rem', letterSpacing: '0.03em' }}>
          Curating creation details & heritage craftsmanship...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center', minHeight: '55vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--brand-primary)', marginBottom: '1rem' }}>
          Creation Not Located
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          The requested luxury piece could not be located in our active catalog or is temporarily unavailable.
        </p>
        <Link to="/products" className="btn btn-primary" style={{ padding: '0.75rem 2rem', textDecoration: 'none' }}>
          Return to Catalog
        </Link>
      </div>
    );
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      warning('Photo size must be under 10MB.', 'File Too Large');
      return;
    }
    setReviewPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      setReviewPhotoPreview(uploadEvt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAuthor = reviewerName.trim();
    const cleanComment = reviewComment.trim();
    const cleanTitle = reviewTitle.trim() || 'Patron Review';

    if (!cleanAuthor || !cleanComment) {
      warning('Please provide your name and review comment.', 'Missing Information');
      return;
    }

    setIsSubmittingReview(true);
    let uploadedPhotoUrl: string | undefined = undefined;

    if (reviewPhotoFile) {
      try {
        const uploadRes = await uploadToCloudinary(reviewPhotoFile, {
          folder: 'muety/reviews',
          publicId: `patron_rev_${Date.now()}`
        });
        if (uploadRes && uploadRes.url) {
          uploadedPhotoUrl = uploadRes.url;
        }
      } catch (err: any) {
        console.warn('PDP review photo upload note:', err);
        if (reviewPhotoPreview) {
          uploadedPhotoUrl = reviewPhotoPreview;
        }
      }
    }

    try {
      const createdReview = await reviewService.addReview({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        authorName: cleanAuthor,
        authorLocation: reviewerLocation.trim() || 'India',
        rating: reviewRating,
        title: cleanTitle,
        quote: cleanComment,
        comment: cleanComment,
        status: 'approved',
        isFeatured: false,
        verifiedPurchase: true,
        photoUrl: uploadedPhotoUrl
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

      success('Thank you! Your testimonial and photograph have been published.', 'Review Added');
      setReviewerName(user?.displayName || '');
      setReviewerLocation('India');
      setReviewTitle('');
      setReviewComment('');
      setReviewPhotoFile(null);
      setReviewPhotoPreview(null);
      setShowReviewForm(false);
    } catch (err: any) {
      warning(err?.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
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
              {product.category && (
                <span className="pdp-category-sku">
                  {product.category}
                </span>
              )}

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
                  setOpenAccordion(prev => ({ ...prev, reviews: true }));
                  const el = document.getElementById('pdp-accordion-reviews');
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
                    if (!isAuthenticated) {
                      openAuthModal({ redirectPath: '/checkout', reason: 'buy_now' });
                      return;
                    }
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
                href={`https://wa.me/919940668095?text=${encodeURIComponent(`Hello MUETY Atelier, I am enquiring about "${product.name}". Could you assist with drape consultation and availability?`)}`}
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

        {/* Product Details Section Accordion (Matching Atelier Reference Design) */}
        <div id="pdp-tabs-section" className="pdp-accordion-container">
          {/* Description */}
          <div className="pdp-accordion-item">
            <button
              type="button"
              className="pdp-accordion-header"
              onClick={() => toggleAccordion('description')}
              aria-expanded={openAccordion.description}
            >
              <span className="pdp-accordion-title">Description</span>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.description ? 'open' : ''}`}
              />
            </button>
            {openAccordion.description && (
              <div className="pdp-accordion-body">
                <p style={{ marginBottom: '1.25rem' }}>{product.description}</p>
                <p>
                  Every MUETY piece is handcrafted by master artisans in accordance with centuries-old heritage techniques. From the initial thread selection to the final hand-finishing, quality control is uncompromising.
                </p>
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="pdp-accordion-item">
            <button
              type="button"
              className="pdp-accordion-header"
              onClick={() => toggleAccordion('information')}
              aria-expanded={openAccordion.information}
            >
              <span className="pdp-accordion-title">Product Information</span>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.information ? 'open' : ''}`}
              />
            </button>
            {openAccordion.information && (
              <div className="pdp-accordion-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '640px' }}>
                  {product.category && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede8', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>Category</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{product.category}</span>
                    </div>
                  )}
                  {product.specifications && Object.entries(product.specifications).length > 0 ? (
                    Object.entries(product.specifications).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede8', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>{key}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{val}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede8', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>Fabric &amp; Purity</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Authentic Pure Handloom Silk (Silk Mark Certified)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede8', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>Origin &amp; Weave</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Salem Traditional Mastercraft Weave</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede8', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>Zari Craft</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tested Gold / Silver Zari Motifs</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede8', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>Length &amp; Inclusions</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>6.2 Metres (Includes unstitched running blouse piece)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Product Care */}
          <div className="pdp-accordion-item">
            <button
              type="button"
              className="pdp-accordion-header"
              onClick={() => toggleAccordion('care')}
              aria-expanded={openAccordion.care}
            >
              <span className="pdp-accordion-title">Product Care</span>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.care ? 'open' : ''}`}
              />
            </button>
            {openAccordion.care && (
              <div className="pdp-accordion-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.35rem', fontSize: '1rem', fontWeight: 600 }}>
                      Silk Care &amp; Preservation
                    </h4>
                    <p style={{ margin: 0 }}>
                      Dry clean only recommended to preserve pure silk luster and intricate zari threads. Store draped in a breathable cotton or muslin cover away from direct sunlight and humidity. Iron on reverse at low temperature with a protective cloth barrier.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.35rem', fontSize: '1rem', fontWeight: 600 }}>
                      Pan-India Tracked Courier Delivery (₹89 Flat)
                    </h4>
                    <p style={{ margin: 0 }}>
                      Dispatched to serviceable PIN codes across India via trusted courier partners. Dispatch is initiated promptly after online payment confirmation or COD advance verification. A tracking link is provided upon courier pickup.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.85rem 1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', fontSize: '0.9rem' }}>
                    <strong>Transparent Total:</strong> Item Subtotal − Discount + 5% GST + ₹89 Flat Delivery Charge
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.35rem', fontSize: '1rem', fontWeight: 600 }}>
                      3-Day Review Window &amp; Unboxing Requirement
                    </h4>
                    <p style={{ margin: 0 }}>
                      In the rare event of damaged or defective items, reach out to <strong>support@muety.in</strong> within <strong>3 days of delivery</strong> with continuous, unedited unboxing video evidence.
                    </p>
                  </div>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
                    Review our full{' '}
                    <Link to="/shipping-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Shipping Policy</Link>{' '}
                    and{' '}
                    <Link to="/return-refund-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Return &amp; Cancellation Policy</Link>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Patron Reviews */}
          <div id="pdp-accordion-reviews" className="pdp-accordion-item">
            <button
              type="button"
              className="pdp-accordion-header"
              onClick={() => toggleAccordion('reviews')}
              aria-expanded={openAccordion.reviews}
            >
              <span className="pdp-accordion-title">
                Patron Reviews ({effectiveReviewCount})
              </span>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.reviews ? 'open' : ''}`}
              />
            </button>
            {openAccordion.reviews && (
              <div className="pdp-accordion-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Patron Testimonials</h3>
                    <p style={{ color: 'var(--brand-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>Authentic reflections from verified patrons draped in MUETY creations.</p>
                  </div>
                  <button 
                    onClick={() => setShowReviewForm(!showReviewForm)} 
                    className="btn btn-outline btn-sm"
                    style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {showReviewForm ? (
                      <>
                        <X size={15} />
                        <span>Cancel Review</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} color="#c9a227" />
                        <span>Write a Review</span>
                      </>
                    )}
                  </button>
                </div>

                {showReviewForm && (
                  <div className="pdp-muety-form-wrapper">
                    <div className="pdp-muety-form-gold-bar" />
                    <div className="pdp-muety-form-body">
                      <div className="pdp-muety-form-badge">
                        <Sparkles size={13} />
                        <span>MUETY Patron Sanctuary</span>
                      </div>
                      <h4 className="pdp-muety-form-title">Submit Your Drape Experience</h4>
                      <p className="pdp-muety-form-subtitle">
                        Share your authentic reflections on fabric feel, drape elegance, and artisanal luster.
                      </p>

                      <form onSubmit={handleAddReview}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                          <div>
                            <label className="pdp-muety-form-label">Your Full Name *</label>
                            <input 
                              type="text" 
                              value={reviewerName} 
                              onChange={e => setReviewerName(e.target.value)} 
                              required 
                              className="pdp-muety-form-input" 
                              placeholder="e.g. Ananya Sharma" 
                            />
                          </div>
                          <div>
                            <label className="pdp-muety-form-label">City / Location (Optional)</label>
                            <input 
                              type="text" 
                              value={reviewerLocation} 
                              onChange={e => setReviewerLocation(e.target.value)} 
                              className="pdp-muety-form-input" 
                              placeholder="e.g. Chennai, Tamil Nadu" 
                            />
                          </div>
                        </div>

                        {/* Interactive 5-Star Rating Selector */}
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label className="pdp-muety-form-label">Patron Rating *</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <div 
                              style={{ display: 'inline-flex', gap: '6px', padding: '6px 10px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e7e2dc' }}
                              onMouseLeave={() => setHoverRating(null)}
                            >
                              {[1, 2, 3, 4, 5].map((val) => {
                                const activeStarRating = hoverRating !== null ? hoverRating : reviewRating;
                                const isFilled = val <= activeStarRating;
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setReviewRating(val)}
                                    onMouseEnter={() => setHoverRating(val)}
                                    className="pdp-muety-star-btn"
                                    title={`${val} Star${val > 1 ? 's' : ''}`}
                                    aria-label={`Select ${val} star rating`}
                                  >
                                    <Star 
                                      size={26} 
                                      fill={isFilled ? '#f59e0b' : 'none'} 
                                      color={isFilled ? '#f59e0b' : '#cbd5e1'} 
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2a0813' }}>
                              {(hoverRating ?? reviewRating) === 5 && '★★★★★ 5 Stars (Exceptional)'}
                              {(hoverRating ?? reviewRating) === 4 && '★★★★☆ 4 Stars (Very Good)'}
                              {(hoverRating ?? reviewRating) === 3 && '★★★☆☆ 3 Stars (Average)'}
                              {(hoverRating ?? reviewRating) === 2 && '★★☆☆☆ 2 Stars (Fair)'}
                              {(hoverRating ?? reviewRating) === 1 && '★☆☆☆☆ 1 Star (Needs Improvement)'}
                            </span>
                          </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                          <label className="pdp-muety-form-label">Review Title (Optional)</label>
                          <input 
                            type="text" 
                            value={reviewTitle} 
                            onChange={e => setReviewTitle(e.target.value)} 
                            className="pdp-muety-form-input" 
                            placeholder="e.g. Royal luster and exquisite zari craftsmanship" 
                          />
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                          <label className="pdp-muety-form-label">Review Comment *</label>
                          <textarea 
                            value={reviewComment} 
                            onChange={e => setReviewComment(e.target.value)} 
                            required 
                            rows={3} 
                            className="pdp-muety-form-input" 
                            placeholder="Describe your drape experience with this creation..." 
                            style={{ resize: 'vertical' }}
                          />
                        </div>

                        {/* Patron Photograph Upload */}
                        <div style={{ marginBottom: '1.75rem' }}>
                          <label className="pdp-muety-form-label">
                            Attach Drape / Saree Photo (Optional)
                          </label>
                          <div className="pdp-muety-photo-dropzone">
                            <label style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 18px',
                              borderRadius: '9999px',
                              border: '1px solid #c9a227',
                              backgroundColor: '#ffffff',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: '#2a0813',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                              transition: 'all 0.2s ease'
                            }}>
                              <Upload size={16} color="#c9a227" />
                              <span>{reviewPhotoFile ? 'Change Photo' : 'Upload Photo'}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handlePhotoSelect} 
                                style={{ display: 'none' }} 
                              />
                            </label>

                            {reviewPhotoPreview ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '46px',
                                  height: '46px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1.5px solid #c9a227',
                                  backgroundColor: '#0f172a'
                                }}>
                                  <img 
                                    src={reviewPhotoPreview} 
                                    alt="Preview" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                </div>
                                <span style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {reviewPhotoFile?.name}
                                </span>
                                <button 
                                  type="button" 
                                  onClick={() => { setReviewPhotoFile(null); setReviewPhotoPreview(null); }}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                  title="Remove photo"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.82rem', color: '#8b95a5' }}>
                                PNG, JPG or WebP up to 10MB
                              </span>
                            )}
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSubmittingReview}
                          className="pdp-muety-submit-btn"
                        >
                          {isSubmittingReview ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Publishing Reflection...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              <span>Submit Patron Review</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Star Filter Bar & Horizontal Carousel Controls */}
                {allProductReviews.length > 0 && (
                  <div className="pdp-reviews-filter-bar">
                    <div className="pdp-reviews-filter-pills">
                      <button
                        type="button"
                        onClick={() => setSelectedRatingFilter('all')}
                        className={`pdp-rating-filter-pill ${selectedRatingFilter === 'all' ? 'active' : ''}`}
                      >
                        <span>All Reviews</span>
                        <span className="pdp-filter-count">({allProductReviews.length})</span>
                      </button>

                      {[5, 4, 3, 2, 1].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedRatingFilter(prev => prev === star ? 'all' : star)}
                          className={`pdp-rating-filter-pill ${selectedRatingFilter === star ? 'active' : ''}`}
                        >
                          <span style={{ color: '#f59e0b' }}>★</span>
                          <span>{star} Star</span>
                          <span className="pdp-filter-count">({ratingCounts[star] || 0})</span>
                        </button>
                      ))}
                    </div>

                    <div className="pdp-reviews-scroll-controls">
                      <button
                        type="button"
                        onClick={() => scrollReviews('left')}
                        className="pdp-reviews-scroll-btn"
                        title="Scroll reviews left"
                        aria-label="Previous reviews"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollReviews('right')}
                        className="pdp-reviews-scroll-btn"
                        title="Scroll reviews right"
                        aria-label="Next reviews"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Horizontal Scrolling Reviews Track */}
                {filteredReviews.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px dashed #e7e2dc', color: 'var(--text-secondary)' }}>
                    {allProductReviews.length === 0 
                      ? 'No testimonials published yet for this piece. Be the first patron to share your experience.'
                      : `No ${selectedRatingFilter}-star reviews found. Try selecting "All Reviews".`}
                  </div>
                ) : (
                  <div className="pdp-reviews-horizontal-track" ref={reviewsScrollRef}>
                    {filteredReviews.map((rev: any) => (
                      <div 
                        key={rev.id} 
                        className="pdp-review-card-horizontal"
                      >
                        <div>
                          {/* Header row: Author & rating */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span>{rev.authorName || rev.userName}</span>
                                {rev.authorLocation && (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', fontWeight: 400 }}>
                                    ({rev.authorLocation})
                                  </span>
                                )}
                              </div>
                              {rev.verifiedPurchase && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  backgroundColor: '#dcfce7',
                                  padding: '2px 7px',
                                  borderRadius: '9999px',
                                  marginTop: '4px'
                                }}>
                                  <CheckCircle2 size={10} /> Verified Patron
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              <div style={{ display: 'flex', color: '#f59e0b' }}>
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={14} fill={i < (rev.rating || 5) ? '#f59e0b' : 'none'} color="#f59e0b" />
                                ))}
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                                {Number(rev.rating || 5).toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {/* Review Title */}
                          {rev.title && (
                            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--brand-primary)', margin: '8px 0 4px', fontStyle: 'italic' }}>
                              "{rev.title}"
                            </div>
                          )}

                          {/* Review Comment */}
                          <p style={{ 
                            fontSize: '0.88rem', 
                            color: 'var(--text-secondary)', 
                            lineHeight: 1.55, 
                            margin: '6px 0 10px',
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {rev.quote || rev.comment}
                          </p>
                        </div>

                        {/* Bottom row: Optional attached photo + Date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1ece7' }}>
                          {rev.photoUrl ? (
                            <div 
                              onClick={() => setPreviewPhotoModal({ url: rev.photoUrl, author: rev.authorName || rev.userName })}
                              style={{
                                position: 'relative',
                                width: '48px',
                                height: '56px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '1.5px solid rgba(201, 162, 39, 0.5)',
                                flexShrink: 0,
                                backgroundColor: '#0f172a',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
                              }}
                              title="Click to view patron drape photo"
                            >
                              <img 
                                src={rev.photoUrl} 
                                alt={rev.authorName || 'Patron'} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff'
                              }}>
                                <Eye size={14} />
                              </div>
                            </div>
                          ) : (
                            <div />
                          )}

                          {rev.createdAt && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--brand-muted)' }}>
                              {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Patron Photo Full Preview Lightbox */}
      {previewPhotoModal && createPortal(
        <div 
          onClick={() => setPreviewPhotoModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 15, 0.94)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '90vh',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--brand-border)',
              backgroundColor: '#fafaf9'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>
                Patron Photo by {previewPhotoModal.author}
              </span>
              <button 
                type="button" 
                onClick={() => setPreviewPhotoModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '8px', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'center' }}>
              <img 
                src={previewPhotoModal.url} 
                alt={previewPhotoModal.author} 
                style={{ maxWidth: '85vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: '4px' }} 
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
