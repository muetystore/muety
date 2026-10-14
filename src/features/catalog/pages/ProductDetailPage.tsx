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
  const relatedProducts = productService.getRelatedProducts(product.id, 4);

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
    <div className="product-detail-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--brand-border)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--brand-muted)' }}>
          <Link to="/" style={{ color: 'var(--brand-muted)' }}>Home</Link>
          <ChevronRight size={14} />
          <Link to="/products" style={{ color: 'var(--brand-muted)' }}>Catalog</Link>
          <ChevronRight size={14} />
          <Link to={`/category/${product.categorySlug}`} style={{ color: 'var(--brand-muted)' }}>{product.category}</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3.5rem' }} className="pdp-grid">
          <div>
            <div 
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                border: '1px solid var(--brand-border)',
                height: '520px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '1.25rem',
                cursor: 'zoom-in'
              }}
              onClick={() => setIsLightboxOpen(true)}
            >
              <img 
                src={product.images[selectedImage] || product.images[0]} 
                alt={product.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  transition: 'transform 0.3s ease'
                }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  backgroundColor: 'rgba(15, 23, 42, 0.82)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(4px)',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={14} /> Expand Gallery
              </button>
            </div>

            {product.images.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: selectedImage === idx ? '2px solid var(--brand-accent)' : '1px solid var(--brand-border)',
                      padding: '4px',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-accent-hover)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {product.category} • SKU: {product.sku}
              </span>

              {isManualSoldOut && (
                <span style={{
                  backgroundColor: '#991b1b',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  textTransform: 'uppercase'
                }}>
                  🔴 SOLD OUT
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2.2rem', color: 'var(--brand-primary)', marginTop: '6px', marginBottom: '12px', lineHeight: 1.2 }}>
              {product.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', color: '#f59e0b' }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.floor(effectiveRating) ? '#f59e0b' : 'none'} color="#f59e0b" />
                ))}
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                {effectiveRating.toFixed(1)}
              </span>
              <span style={{ color: 'var(--brand-muted)', fontSize: '0.85rem' }}>
                ({effectiveReviewCount} {effectiveReviewCount === 1 ? 'verified review' : 'verified reviews'})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--brand-border)' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span style={{ fontSize: '1.3rem', color: 'var(--brand-muted)', textDecoration: 'line-through' }}>
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              {product.shortDescription}
            </p>

            {product.colors && product.colors.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'block', marginBottom: '8px' }}>
                  Finish / Shade: <span style={{ fontWeight: 400 }}>{selectedColor}</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: selectedColor === color ? '2px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                        backgroundColor: selectedColor === color ? 'var(--brand-primary)' : '#ffffff',
                        color: selectedColor === color ? '#ffffff' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '6px' }}>
                  Quantity
                </label>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--brand-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#ffffff',
                  height: '48px',
                  padding: '0 8px',
                  gap: '12px'
                }}>
                  <button 
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    style={{ color: 'var(--brand-primary)', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Minus size={16} />
                  </button>
                  <span style={{ fontSize: '1rem', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button 
                    onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                    style={{ color: 'var(--brand-primary)', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'transparent', marginBottom: '6px' }}>
                  Actions
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSoldOut) return;
                      addToCart(product, quantity, selectedColor, selectedSize);
                    }}
                    disabled={isSoldOut}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      height: '48px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: isSoldOut ? 0.6 : 1,
                      cursor: isSoldOut ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ShoppingBag size={18} />
                    {isSoldOut ? 'SOLD OUT' : 'Add to Bag'}
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
                    className="btn btn-accent"
                    style={{
                      height: '48px',
                      padding: '0 18px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isSoldOut ? 0.6 : 1,
                      cursor: isSoldOut ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Zap size={18} fill="currentColor" /> Buy Now
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id)}
                    className="btn btn-outline"
                    style={{
                      height: '48px',
                      width: '48px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSaved ? '#ef4444' : 'var(--brand-primary)',
                      borderColor: isSaved ? '#ef4444' : 'var(--brand-border)'
                    }}
                    aria-label="Wishlist"
                  >
                    <Heart size={20} fill={isSaved ? '#ef4444' : 'none'} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid var(--brand-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              marginTop: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck size={20} color="#d4af37" />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Pan-India Courier (₹89 Flat)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>Salem atelier dispatch • Insured transit</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} color="#d4af37" />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Silk Mark Certified</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>100% Pure Mulberry Silk Guarantee</div>
                </div>
              </div>
            </div>

            {/* Atelier Concierge Enquiry Trigger */}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <a
                href={`https://wa.me/919940668095?text=${encodeURIComponent(`Hello MUETY Atelier, I am enquiring about "${product.name}" (SKU: ${product.sku || product.id}). Could you assist with drape consultation and availability?`)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--brand-primary)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                  cursor: 'pointer'
                }}
              >
                💬 Enquire with Salem Atelier Concierge about this saree
              </a>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '5rem' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--brand-border)', marginBottom: '2rem', gap: '2rem' }}>
            {(['details', 'specs', 'reviews', 'shipping'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 0',
                  fontSize: '1rem',
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? 'var(--brand-primary)' : 'var(--brand-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
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
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--brand-border)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>{key}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}>Patron Testimonials</h3>
                    <p style={{ color: 'var(--brand-muted)', fontSize: '0.88rem' }}>Authentic feedback from verified collectors.</p>
                  </div>
                  <button onClick={() => setShowReviewForm(!showReviewForm)} className="btn btn-outline btn-sm">
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </div>

                {showReviewForm && (
                  <form onSubmit={handleAddReview} style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--brand-border)', marginBottom: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Submit Your Testimonial</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                  Orders are dispatched within 24 to 48 hours from our Salem weaving atelier. Delivery across India typically takes 2 to 4 business days via insured express couriers with live AWB tracking via SMS.
                </p>

                <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
                  <strong>Transparent Order Total Calculation:</strong><br />
                  <code>Order Total = Item Subtotal − Discount + Applicable Tax (5% GST) + ₹89 Shipping/Delivery Charge</code>
                </div>

                <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                  Flexible Payment & COD Advance Policy
                </h4>
                <p style={{ marginBottom: '1rem' }}>
                  Choose full online payment via Razorpay (UPI, Credit/Debit Cards, NetBanking) for seamless zero-contact delivery, or select Cash on Delivery (COD) with a ₹89 online courier advance credited directly toward your order total. The remaining balance is payable upon delivery.
                </p>

                <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                  Artisan Handloom Policy & Cancellation Window
                </h4>
                <p>
                  Store your saree in the provided breathable muslin cover away from direct sunlight. Because each piece is handcrafted from pure silk, creations are generally non-returnable once delivered. You may submit an order cancellation request directly from your Patron Account while your order remains in "pending" status before atelier packaging.
                </p>
              </div>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '6rem' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', marginBottom: '1.5rem' }}>
              Complementary Creations
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
