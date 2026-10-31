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
  ChevronUp,
  ArrowDown,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Zap,
  CheckCircle2,
  Loader2,
  Eye,
  Sparkles,
  Upload,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Facebook,
  Twitter,
  ExternalLink,
  RotateCcw,
  Banknote,
  BadgePercent,
  MapPin,
  Tag,
  Award,
  FileText,
  Layers
} from 'lucide-react';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { Product, PatronReview, Coupon } from '@/types';
import { couponService } from '@/features/coupons/services/couponService';
import { uploadToCloudinary } from '@/lib/media/cloudinary';
import { personalizationService } from '@/features/catalog/services/personalizationService';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { 
    addToCart, 
    toggleWishlist, 
    isInWishlist, 
    setIsDrawerOpen,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    subtotal: cartSubtotal,
    items,
    updateQuantity
  } = useCart();
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
  const pinchStartDistRef = React.useRef<number | null>(null);
  const pinchStartScaleRef = React.useRef<number>(1);
  const isPinchingRef = React.useRef<boolean>(false);
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  // Touch swipe gallery navigation
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const [isSwipingGallery, setIsSwipingGallery] = useState<boolean>(false);

  const galleryImages = useMemo(() => {
    return Array.isArray(product?.images) && product.images.length > 0
      ? product.images
      : ['/saree_model_individual.jpg'];
  }, [product?.images]);

  // Desktop 2-column gallery images (Flipkart Pattern - Screenshot 3 & 4)
  const desktopDisplayImages = useMemo(() => {
    const list = Array.isArray(product?.images) && product.images.length > 0
      ? [...product.images]
      : ['/saree_model_individual.jpg'];
    
    const fallbacks = [
      '/saree_fabric_detail.jpg',
      '/saree_model_drape.jpg',
      '/saree_model_individual.jpg'
    ];
    for (const fb of fallbacks) {
      if (list.length >= 4) break;
      if (!list.includes(fb)) {
        list.push(fb);
      }
    }
    return list;
  }, [product?.images]);

  // Desktop 2x2 Gallery pagination state (flipkart 2x2 with show more for 5+ images)
  const [showAllGalleryImages, setShowAllGalleryImages] = useState<boolean>(false);
  const visibleDesktopImages = useMemo(() => {
    return showAllGalleryImages ? desktopDisplayImages : desktopDisplayImages.slice(0, 4);
  }, [showAllGalleryImages, desktopDisplayImages]);

  // Flipkart-style interactive section toggles (Offers collapsed by default)
  const [isOffersExpanded, setIsOffersExpanded] = useState<boolean>(false);
  const [isHighlightsOpen, setIsHighlightsOpen] = useState<boolean>(true);
  const [activeDetailTab, setActiveDetailTab] = useState<'specifications' | 'description' | 'care' | 'reviews'>('specifications');

  // Product care instructions from admin ERP (with authentic handloom silk care guidance fallback)
  const adminCareText = useMemo(() => {
    const raw = product?.careInstructions || 
      (product as any)?.care || 
      product?.specifications?.['Care Instructions'] || 
      product?.specifications?.['Product Care'] || 
      product?.specifications?.['Care'] || 
      product?.specifications?.['careInstructions'];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
    return 'Dry Clean Only.\n• Store wrapped in pure breathable muslin or cotton fabric.\n• Protect authentic pure gold and silver zari from direct perfume and moisture.\n• Iron gently on reverse at low heat.';
  }, [product?.careInstructions, (product as any)?.care, product?.specifications]);

  // Product Link Sharing state and handlers
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !product) return '';
    return `${window.location.origin}/products/${product.slug || product.id}`;
  }, [product]);

  const shareTitle = product?.name || 'MUETY Handcrafted Saree';
  const shareMessage = `Discover ${product?.name || 'this handcrafted saree'} (₹${product?.price?.toLocaleString('en-IN')}) at MUETY Atelier:`;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsLinkCopied(true);
      success('Product link copied to clipboard!');
      setTimeout(() => setIsLinkCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareChannel = (channel: 'whatsapp' | 'facebook' | 'twitter' | 'pinterest' | 'email') => {
    if (!shareUrl) return;
    let url = '';
    const fullText = `${shareMessage} ${shareUrl}`;

    switch (channel) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'pinterest':
        url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(galleryImages[0] || '')}&description=${encodeURIComponent(shareMessage)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`Exquisite Handcrafted Saree: ${shareTitle}`)}&body=${encodeURIComponent(`${shareMessage}\n\nView details: ${shareUrl}`)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (!hasNativeShare || !shareUrl) return;
    try {
      await navigator.share({
        title: shareTitle,
        text: shareMessage,
        url: shareUrl
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Native share note:', err);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isShareModalOpen) {
        setIsShareModalOpen(false);
      }
    };
    if (isShareModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShareModalOpen]);

  // Lock background scroll and provide full keyboard navigation while Lightbox is open
  useEffect(() => {
    if (!isLightboxOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        resetZoom();
      } else if (e.key === 'ArrowLeft') {
        if (selectedImage > 0) {
          resetZoom();
          setSelectedImage(prev => prev - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedImage < galleryImages.length - 1) {
          resetZoom();
          setSelectedImage(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, selectedImage, galleryImages.length]);

  // Admin-managed active coupons & offer application state
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  useEffect(() => {
    const loadCoupons = () => {
      try {
        const coupons = couponService.getActiveCoupons();
        setActiveCoupons(coupons);
      } catch (err) {
        console.error('Failed to load active coupons:', err);
      }
    };
    loadCoupons();
    const unsub = couponService.subscribeToCoupons(() => {
      loadCoupons();
    });
    return () => unsub();
  }, []);

  // Debounced Add to Bag and Buy Now actions
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  const handleAddToBag = () => {
    if (isSoldOut || isActionPending || !product) return;
    setIsActionPending(true);
    try {
      addToCart(product, quantity, selectedColor, selectedSize);
    } finally {
      setTimeout(() => setIsActionPending(false), 500);
    }
  };

  const handleBuyNow = () => {
    if (isSoldOut || isActionPending || !product) return;
    setIsActionPending(true);
    try {
      const activeColor = selectedColor || (product.colors && product.colors.length > 0 ? product.colors[0] : undefined);
      const activeSize = selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
      const existing = items.find(
        item => item.product.id === product.id && 
                item.selectedColor === activeColor && 
                item.selectedSize === activeSize
      );
      if (!existing) {
        addToCart(product, quantity, selectedColor, selectedSize);
      } else if (existing.quantity !== quantity) {
        updateQuantity(product.id, quantity, selectedColor, selectedSize);
      }
      setIsDrawerOpen(false);
      if (!isAuthenticated) {
        openAuthModal({ redirectPath: '/checkout', reason: 'buy_now' });
        return;
      }
      navigate('/checkout');
    } finally {
      setTimeout(() => setIsActionPending(false), 500);
    }
  };

  // Mobile & Desktop Sticky Action Bars
  const actionsContainerRef = useRef<HTMLDivElement>(null);
  const galleryColRef = useRef<HTMLDivElement>(null);
  const [isStickyBarVisible, setIsStickyBarVisible] = useState<boolean>(true);
  const [galleryStickyTop, setGalleryStickyTop] = useState<number>(88);

  // Synchronize sticky top for image gallery to prevent blank spaces during details scrolling
  useEffect(() => {
    const updateGallerySticky = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 993) {
        setGalleryStickyTop(0);
        return;
      }
      if (!galleryColRef.current) return;
      const galleryHeight = galleryColRef.current.offsetHeight;
      const vh = window.innerHeight;
      const topOffset = 88; // Height of fixed header + aesthetic margin
      const bottomPadding = 24;

      if (galleryHeight + topOffset <= vh) {
        // Gallery fits comfortably in viewport: stick right below header
        setGalleryStickyTop(topOffset);
      } else {
        // Gallery is taller than viewport: stick so bottom row of images remains visible
        const targetTop = vh - galleryHeight - bottomPadding;
        setGalleryStickyTop(targetTop);
      }
    };

    updateGallerySticky();
    window.addEventListener('resize', updateGallerySticky, { passive: true });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && galleryColRef.current) {
      observer = new ResizeObserver(updateGallerySticky);
      observer.observe(galleryColRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateGallerySticky);
      if (observer) observer.disconnect();
    };
  }, [galleryImages]);

  // Hide mobile buy bar before reaching footer section (starts at Insured Express Delivery)
  useEffect(() => {
    if (isLightboxOpen || isShareModalOpen) {
      setIsStickyBarVisible(false);
      return;
    }

    const checkFooterIntersection = () => {
      const footer = document.querySelector('footer');
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        // If the top of the footer (Insured Express Delivery) reaches or enters the viewport:
        if (footerRect.top <= window.innerHeight + 2) {
          setIsStickyBarVisible(false);
          return;
        }
      }
      setIsStickyBarVisible(true);
    };

    checkFooterIntersection();
    window.addEventListener('scroll', checkFooterIntersection, { passive: true });
    window.addEventListener('resize', checkFooterIntersection, { passive: true });

    let observer: IntersectionObserver | null = null;
    const footer = document.querySelector('footer');
    if (typeof IntersectionObserver !== 'undefined' && footer) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsStickyBarVisible(false);
        } else {
          checkFooterIntersection();
        }
      }, {
        root: null,
        threshold: 0,
        rootMargin: '0px'
      });
      observer.observe(footer);
    }

    return () => {
      window.removeEventListener('scroll', checkFooterIntersection);
      window.removeEventListener('resize', checkFooterIntersection);
      if (observer) observer.disconnect();
    };
  }, [isLightboxOpen, isShareModalOpen]);

  const handleGoBack = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/products');
    }
  };

  const handleGalleryNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetZoom();
    if (selectedImage < galleryImages.length - 1) {
      setSelectedImage(prev => prev + 1);
    }
  };

  const handleGalleryPrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetZoom();
    if (selectedImage > 0) {
      setSelectedImage(prev => prev - 1);
    }
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomScale(prev => Math.min(3.5, Number((prev + 0.5).toFixed(1))));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomScale(prev => {
      const next = Number((prev - 0.5).toFixed(1));
      if (next <= 1) {
        resetZoom();
        return 1;
      }
      return next;
    });
  };

  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    // 2-finger pinch gesture start
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      setIsSwipingGallery(false);
      setTouchDeltaX(0);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = zoomScale;

      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const originX = Math.max(0, Math.min(100, ((midX - rect.left) / rect.width) * 100));
        const originY = Math.max(0, Math.min(100, ((midY - rect.top) / rect.height) * 100));
        setZoomOrigin({ x: originX, y: originY });
      }
      return;
    }

    // Single touch
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();

      // Double-tap zoom toggle detection
      if (now - lastTapRef.current < 320) {
        if (zoomScale > 1) {
          resetZoom();
        } else {
          if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            const originX = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
            const originY = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
            setZoomOrigin({ x: originX, y: originY });
          }
          setZoomScale(2.2);
          setPanOffset({ x: 0, y: 0 });
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (zoomScale > 1) {
        // Panning active
        setIsDragging(true);
        dragStartRef.current = {
          x: touch.clientX - panOffset.x,
          y: touch.clientY - panOffset.y
        };
      } else if (galleryImages.length > 1) {
        // Slider swipe active
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        setTouchDeltaX(0);
        setIsSwipingGallery(false);
      }
    }
  };

  const handleGalleryTouchMove = (e: React.TouchEvent) => {
    // 2-finger pinch gesture
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchStartDistRef.current;
      const newScale = Math.max(1, Math.min(4, Number((pinchStartScaleRef.current * ratio).toFixed(2))));
      setZoomScale(newScale);
      return;
    }

    // 1-finger pan or swipe
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (zoomScale > 1 && isDragging) {
        if (e.cancelable) e.preventDefault();
        const maxPanX = (cardRef.current?.clientWidth || 300) * (zoomScale - 1) * 0.5;
        const maxPanY = (cardRef.current?.clientHeight || 400) * (zoomScale - 1) * 0.5;
        const rawDx = touch.clientX - dragStartRef.current.x;
        const rawDy = touch.clientY - dragStartRef.current.y;
        setPanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, rawDx)),
          y: Math.max(-maxPanY, Math.min(maxPanY, rawDy))
        });
        return;
      }

      if (zoomScale === 1 && touchStartPos.current && galleryImages.length > 1) {
        const dx = touch.clientX - touchStartPos.current.x;
        const dy = touch.clientY - touchStartPos.current.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (Math.abs(dx) > 8) {
            setIsSwipingGallery(true);
            const isAtStart = selectedImage === 0 && dx > 0;
            const isAtEnd = selectedImage === galleryImages.length - 1 && dx < 0;
            if (isAtStart || isAtEnd) {
              setTouchDeltaX(dx * 0.28);
            } else {
              setTouchDeltaX(dx);
            }
          }
        }
      }
    }
  };

  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (isPinchingRef.current) {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        pinchStartDistRef.current = null;
        if (zoomScale <= 1.08) {
          resetZoom();
        }
      }
      return;
    }

    if (zoomScale > 1) {
      setIsDragging(false);
      return;
    }

    if (!touchStartPos.current || galleryImages.length <= 1) {
      touchStartPos.current = null;
      setTouchDeltaX(0);
      setIsSwipingGallery(false);
      return;
    }

    const swipeThreshold = 45;
    if (isSwipingGallery && Math.abs(touchDeltaX) >= swipeThreshold) {
      if (touchDeltaX < 0) {
        if (selectedImage < galleryImages.length - 1) {
          setSelectedImage(prev => prev + 1);
        }
      } else {
        if (selectedImage > 0) {
          setSelectedImage(prev => prev - 1);
        }
      }
    }

    touchStartPos.current = null;
    setTouchDeltaX(0);
    setIsSwipingGallery(false);
  };

  const handleGalleryKeyDown = (e: React.KeyboardEvent) => {
    if (galleryImages.length <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleGalleryPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleGalleryNext();
    }
  };

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Flipkart-style preview savings when coupon is applied
  const effectiveDiscount = useMemo(() => {
    if (!appliedCoupon || !product) return 0;
    const prospectiveTotal = product.price * quantity;
    if (appliedCoupon.minSpend && prospectiveTotal < appliedCoupon.minSpend) {
      return 0;
    }
    if (appliedCoupon.discountType === 'percentage') {
      let disc = (prospectiveTotal * appliedCoupon.discountValue) / 100;
      if (appliedCoupon.maxDiscount && disc > appliedCoupon.maxDiscount) {
        disc = appliedCoupon.maxDiscount;
      }
      return Math.round(disc);
    } else {
      return Math.min(appliedCoupon.discountValue, prospectiveTotal);
    }
  }, [appliedCoupon, product, quantity]);

  const discountedPrice = useMemo(() => {
    if (!product) return 0;
    const base = product.price * quantity;
    return Math.max(0, base - effectiveDiscount);
  }, [product, quantity, effectiveDiscount]);

  // Structured product highlights from admin ERP with fallback
  const displayHighlights = useMemo(() => {
    if (Array.isArray(product?.highlights) && product.highlights.length > 0) {
      const active = product.highlights.filter(h => h.active !== false && h.label && h.value);
      if (active.length > 0) return active;
    }
    const fallback: Array<{ label: string; value: string }> = [];
    if (product?.fabric || product?.material) {
      fallback.push({ label: 'Fabric', value: product.fabric || product.material || 'Pure Handloom Silk' });
    }
    if (product?.silkType) {
      fallback.push({ label: 'Silk Purity', value: product.silkType });
    }
    if (product?.zariType) {
      fallback.push({ label: 'Zari Craft', value: product.zariType });
    }
    if (product?.blousePieceIncluded !== undefined) {
      fallback.push({
        label: 'Blouse Piece',
        value: product.blousePieceIncluded ? '0.8m Included (Unstitched)' : 'Not Included'
      });
    }
    if (product?.sareeLength) {
      fallback.push({ label: 'Saree Length', value: product.sareeLength });
    }
    if (product?.occasion || (product?.occasions && product.occasions.length > 0)) {
      fallback.push({
        label: 'Occasion',
        value: product.occasion || (product.occasions ? product.occasions.join(', ') : 'Bridal, Wedding & Festive')
      });
    }
    if (product?.specifications) {
      for (const [k, v] of Object.entries(product.specifications)) {
        if (!fallback.some(item => item.label.toLowerCase() === k.toLowerCase()) && typeof v === 'string' && v.trim()) {
          fallback.push({ label: k, value: v });
        }
      }
    }
    if (adminCareText) {
      const hasCare = fallback.some(item => item.label.toLowerCase().includes('care'));
      if (!hasCare) {
        const firstLine = adminCareText.split('\n')[0].replace(/^[•\-\*]\s*/, '').trim();
        fallback.push({ 
          label: 'Care Instructions', 
          value: firstLine.length > 36 ? firstLine.slice(0, 33) + '...' : firstLine 
        });
      }
    }
    return fallback;
  }, [product, adminCareText]);

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
    isPinchingRef.current = false;
    pinchStartDistRef.current = null;
  };

  useEffect(() => {
    let isMounted = true;
    if (id) {
      const cached = productService.getProductBySlug(id);
      if (cached) {
        setProduct(cached);
        setIsLoading(false);
        storageService.addRecentlyViewed(cached.id);
        personalizationService.recordProductView(cached);
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
            personalizationService.recordProductView(found);
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
    if (zoomScale === 1) {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const originX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const originY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setZoomOrigin({ x: originX, y: originY });
      }
      setZoomScale(2.2);
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
      const maxPanX = (cardRef.current?.clientWidth || 300) * (zoomScale - 1) * 0.5;
      const maxPanY = (cardRef.current?.clientHeight || 400) * (zoomScale - 1) * 0.5;
      const rawDx = e.clientX - dragStartRef.current.x;
      const rawDy = e.clientY - dragStartRef.current.y;
      setPanOffset({
        x: Math.max(-maxPanX, Math.min(maxPanX, rawDx)),
        y: Math.max(-maxPanY, Math.min(maxPanY, rawDy))
      });
    }
  };

  const handleMouseUp = () => {
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
        photoUrl: uploadedPhotoUrl || ''
      });

      setLiveReviews(prev => [createdReview, ...prev.filter(r => r.id !== createdReview.id)]);

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
    <div className="product-detail-page pdp-page">
      <div className="pdp-breadcrumb-bar">
        <div className="container">
          <div className="pdp-breadcrumb-inner">
            <button 
              type="button" 
              onClick={handleGoBack} 
              className="pdp-breadcrumb-back-btn"
              aria-label="Go back to previous page"
              title="Back"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <span className="pdp-breadcrumb-divider">|</span>
            <Link to="/" className="pdp-breadcrumb-link">Home</Link>
            <ChevronRight size={13} style={{ flexShrink: 0 }} />
            <Link to="/products" className="pdp-breadcrumb-link">Catalog</Link>
            <ChevronRight size={13} style={{ flexShrink: 0 }} />
            <Link to={`/category/${product.categorySlug}`} className="pdp-breadcrumb-link">{product.category}</Link>
            <ChevronRight size={13} style={{ flexShrink: 0 }} />
            <span className="pdp-breadcrumb-current">{product.name}</span>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="pdp-breadcrumb-share-btn"
              title="Share Product"
              aria-label="Share this saree"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container pdp-content-container" style={{ marginTop: '6px' }}>
        <div className="pdp-grid">
          <div 
            ref={galleryColRef} 
            className="pdp-gallery-col"
            style={{ top: `${galleryStickyTop}px` }}
          >
            {/* MOBILE-ONLY GALLERY (Strictly preserved - user requirement 2: "in mobile view product image display is perfect, don't change") */}
            <div className="pdp-mobile-gallery-wrapper">
              <div 
                ref={cardRef}
                className={`pdp-main-image-card ${zoomScale > 1 ? 'is-zoomed' : ''}`}
                onTouchStart={handleGalleryTouchStart}
                onTouchMove={handleGalleryTouchMove}
                onTouchEnd={handleGalleryTouchEnd}
                onTouchCancel={handleGalleryTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onKeyDown={handleGalleryKeyDown}
                tabIndex={0}
                role="region"
                aria-label={`Product image gallery for ${product.name}, showing image ${selectedImage + 1} of ${galleryImages.length}`}
                style={{
                  position: 'relative',
                  touchAction: 'pan-y',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                {/* Ultra-Smooth Continuous Gallery Slider Viewport & Track */}
                <div className="pdp-gallery-slider-viewport">
                  <div 
                    className="pdp-gallery-slider-track"
                    style={{
                      display: 'flex',
                      width: '100%',
                      height: '100%',
                      transform: `translateX(calc(-${selectedImage * 100}% + ${touchDeltaX}px))`,
                      transition: isSwipingGallery ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                  >
                    {galleryImages.map((img, idx) => {
                      const isCurrent = selectedImage === idx;
                      return (
                        <div 
                          key={idx}
                          className="pdp-gallery-slide"
                          aria-hidden={selectedImage !== idx}
                        >
                          <img 
                            src={img} 
                            alt={`${product.name} - drape view ${idx + 1}`}
                            className={`pdp-main-img ${zoomScale > 1 && isCurrent ? 'zoomed' : ''}`}
                            loading={idx === 0 ? "eager" : "lazy"}
                            draggable={false}
                            onDoubleClick={handleImageDoubleClick}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/saree_model_individual.jpg';
                            }}
                            style={isCurrent && zoomScale > 1 ? {
                              transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                              transition: isDragging || isPinchingRef.current ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                              cursor: isDragging ? 'grabbing' : 'grab'
                            } : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inspect Creation in High-Resolution Lightbox Button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                  className="pdp-gallery-inspect-trigger"
                  aria-label="Inspect creation in high-resolution lightbox"
                  title="Click to view full-resolution lightbox"
                >
                  <Maximize2 size={16} />
                </button>

                {/* Accessible Prev/Next navigation controls (hidden when zoomed for unhindered exploration) */}
                {galleryImages.length > 1 && zoomScale === 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handleGalleryPrev}
                      disabled={selectedImage === 0}
                      className="pdp-gallery-nav-btn pdp-gallery-nav-prev"
                      aria-label="Previous product image"
                      title="Previous product image"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={handleGalleryNext}
                      disabled={selectedImage === galleryImages.length - 1}
                      className="pdp-gallery-nav-btn pdp-gallery-nav-next"
                      aria-label="Next product image"
                      title="Next product image"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* Floating Mobile & Desktop Zoom In / Out Controls (Hidden visually, functions preserved) */}
                <div className="pdp-gallery-zoom-controls" style={{ display: 'none' }} role="group" aria-label="Image zoom controls">
                  {zoomScale > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                      className="pdp-zoom-btn pdp-zoom-reset"
                      aria-label="Reset zoom to 100%"
                      title="Reset zoom"
                    >
                      <span>{Math.round(zoomScale * 100)}%</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoomScale >= 4}
                    className="pdp-zoom-btn"
                    aria-label="Zoom in on creation drape"
                    title="Zoom in"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoomScale <= 1}
                    className="pdp-zoom-btn"
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <ZoomOut size={18} />
                  </button>
                </div>

                {/* Accessible Image Counter & Pagination Indicator */}
                {galleryImages.length > 1 && (
                  <>
                    <div className="pdp-gallery-counter-badge" aria-live="polite">
                      <span>{selectedImage + 1} / {galleryImages.length}</span>
                    </div>

                    <div className="pdp-gallery-dots" aria-hidden="true">
                      {galleryImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); resetZoom(); setSelectedImage(idx); }}
                          className={`pdp-gallery-dot ${selectedImage === idx ? 'active' : ''}`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="pdp-thumbnails-strip">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { resetZoom(); setSelectedImage(idx); }}
                      className={`pdp-thumbnail-btn ${selectedImage === idx ? 'active' : ''}`}
                      aria-label={`View creation drape ${idx + 1}`}
                    >
                      <img 
                        src={img} 
                        alt="" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/saree_model_individual.jpg';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop 2-column multi-image grid gallery (Flipkart reference pattern) */}
            <div className="pdp-desktop-secondary-gallery" aria-label="Product photography gallery">
              {galleryImages.map((img, idx) => (
                <div
                  key={idx}
                  className="pdp-desktop-extra-image-card"
                  onClick={() => {
                    setSelectedImage(idx);
                    setIsLightboxOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedImage(idx);
                      setIsLightboxOpen(true);
                    }
                  }}
                  aria-label={`View product image ${idx + 1} of ${galleryImages.length} in full resolution`}
                >
                  <img
                    src={img}
                    alt={`${product.name} - drape view ${idx + 1}`}
                    className="pdp-desktop-extra-img"
                    loading={idx < 2 ? "eager" : "lazy"}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/saree_model_individual.jpg';
                    }}
                  />
                  <div className="pdp-desktop-grid-card-overlay" aria-hidden="true">
                    <Maximize2 size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pdp-info-col">
            {isManualSoldOut && (
              <div className="pdp-header-meta">
                <span className="pdp-soldout-pill">
                  🔴 SOLD OUT
                </span>
              </div>
            )}

            <h1 className="pdp-title">
              {product.name}
            </h1>

            {effectiveReviewCount > 0 ? (
              <div className="pdp-rating-row pdp-flipkart-rating-row">
                <div className="pdp-flipkart-badge">
                  <span>{effectiveRating.toFixed(1)}</span>
                  <Star size={11} fill="#ffffff" color="#ffffff" strokeWidth={0} />
                  <span className="pdp-flipkart-badge-sep">|</span>
                  <span>{effectiveReviewCount}</span>
                </div>
                <div className="pdp-stars" style={{ display: 'none' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill={i < Math.floor(effectiveRating) ? '#f59e0b' : 'none'} color="#f59e0b" />
                  ))}
                </div>
                <span className="pdp-rating-score" style={{ display: 'none' }}>
                  {effectiveRating.toFixed(1)}
                </span>
                <button 
                  type="button"
                  onClick={() => {
                    setOpenAccordion(prev => ({ ...prev, reviews: true }));
                    const el = document.getElementById('pdp-accordion-reviews') || document.getElementById('pdp-tabs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="pdp-review-count pdp-flipkart-review-link"
                >
                  ({effectiveReviewCount} {effectiveReviewCount === 1 ? 'verified review' : 'verified reviews'})
                </button>
              </div>
            ) : (
              <div className="pdp-rating-row pdp-flipkart-rating-row">
                <span className="pdp-unrated-tag">
                  <Sparkles size={13} style={{ color: 'var(--brand-accent)' }} />
                  <span>Handcrafted Pure Silk &bull; Salem Atelier</span>
                </span>
                <button 
                  type="button"
                  onClick={() => {
                    setOpenAccordion(prev => ({ ...prev, reviews: true }));
                    setShowReviewForm(true);
                    const el = document.getElementById('pdp-accordion-reviews') || document.getElementById('pdp-tabs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="pdp-review-count pdp-flipkart-review-link"
                >
                  Be the first to review
                </button>
              </div>
            )}

            <div className="pdp-price-row pdp-flipkart-price-container">
              <div className="pdp-price-main-group pdp-flipkart-price-group">
                <span className="pdp-price-current pdp-flipkart-selling-price">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="pdp-price-original pdp-flipkart-mrp">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="pdp-flipkart-discount-tag">
                      <span className="pdp-discount-arrow">↓</span>
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                    <span className="pdp-flipkart-savings-tag">
                      Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="pdp-discount-badge" style={{ display: 'none' }}>
                    -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>

              {/* Meesho-inspired Direct Weaver Price Tag */}
              <div className="pdp-best-price-tag">
                <Sparkles size={13} />
                <span>Direct Weaver Price • Zero Middleman Markup</span>
              </div>

              <div className="pdp-price-tax-note">
                Inclusive of all applicable taxes • Handcrafted in Salem, India
              </div>
            </div>

            {/* Admin-Managed Active Offers Banner (Flipkart Pattern - Screenshot 2 & 3) */}
            <div className="pdp-offers-card">
              <div 
                className="pdp-offers-header pdp-flipkart-offers-header"
                onClick={() => setIsOffersExpanded(prev => !prev)}
                style={{ cursor: 'pointer' }}
                title="Click to toggle available offers"
              >
                <div className="pdp-offers-title">
                  <span className="pdp-flipkart-wow-badge">ATELIER PRIVILEGE</span>
                  <span>Apply offers for maximum savings</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pdp-offers-badge">Special Offers</span>
                  {isOffersExpanded ? <ChevronUp size={16} color="#ffffff" /> : <ChevronDown size={16} color="#ffffff" />}
                </div>
              </div>

              {/* Dynamic Effective Price Callout (Buy at ₹...) */}
              <div className="pdp-offer-effective-banner pdp-flipkart-buy-at-banner">
                <Sparkles size={14} />
                <span>
                  Buy at <strong>₹{discountedPrice.toLocaleString('en-IN')}</strong>
                  {appliedCoupon && (
                    <> with code <code className="pdp-coupon-code">{appliedCoupon.code}</code> applied</>
                  )}
                </span>
              </div>

              {isOffersExpanded && (
                <div className="pdp-offers-list">
                  {activeCoupons.length > 0 ? (
                    activeCoupons.map((cp) => {
                      const isApplied = appliedCoupon?.code === cp.code;
                      const prospectiveTotal = (cartSubtotal > 0 ? cartSubtotal : product.price * quantity);
                      const minSpendDiff = cp.minSpend && prospectiveTotal < cp.minSpend ? cp.minSpend - prospectiveTotal : 0;

                      return (
                        <div key={cp.id || cp.code} className={`pdp-offer-item ${isApplied ? 'applied' : ''}`}>
                          <div className="pdp-offer-info">
                            <div className="pdp-offer-badge-row">
                              {cp.badge && <span className="pdp-offer-chip">{cp.badge}</span>}
                              <code className="pdp-coupon-code">{cp.code}</code>
                            </div>
                            <span className="pdp-offer-text">
                              <strong>{cp.title || (cp.discountType === 'percentage' ? `${cp.discountValue}% Instant Off` : `Flat ₹${cp.discountValue} OFF`)}</strong>
                              {cp.description && ` — ${cp.description}`}
                            </span>
                            {cp.minSpend ? (
                              <span className="pdp-offer-terms">
                                {minSpendDiff > 0 
                                  ? `Min. order ₹${cp.minSpend.toLocaleString('en-IN')} (Add ₹${minSpendDiff.toLocaleString('en-IN')} more to unlock)` 
                                  : `Min. order ₹${cp.minSpend.toLocaleString('en-IN')} (Eligible)`}
                              </span>
                            ) : null}
                          </div>

                          <div className="pdp-offer-actions">
                            {isApplied ? (
                              <div className="pdp-offer-applied-group">
                                <span className="pdp-offer-applied-label">
                                  <Check size={13} /> Applied
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeCoupon()}
                                  className="pdp-offer-remove-btn"
                                  title="Remove coupon"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = applyCoupon(cp.code, prospectiveTotal);
                                  if (res.success) {
                                    setCopiedCoupon(cp.code);
                                    setTimeout(() => setCopiedCoupon(null), 2500);
                                  }
                                }}
                                disabled={minSpendDiff > 0}
                                className={`pdp-offer-copy-btn ${minSpendDiff > 0 ? 'disabled' : ''}`}
                                title={minSpendDiff > 0 ? `Requires min order ₹${cp.minSpend}` : `Apply coupon ${cp.code}`}
                              >
                                <span>Apply</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="pdp-offer-item">
                      <div className="pdp-offer-info">
                        <span className="pdp-offer-text">
                          <strong>Seasonal Savings</strong> — Exclusive promotional coupons will be announced for upcoming atelier collections.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
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
            <div ref={actionsContainerRef} className="pdp-actions-container">
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

                <div className="pdp-secondary-actions">
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id)}
                    className={`pdp-wishlist-btn ${isSaved ? 'saved' : ''}`}
                    aria-label="Wishlist"
                  >
                    <Heart size={18} fill={isSaved ? '#ef4444' : 'none'} color={isSaved ? '#ef4444' : 'currentColor'} />
                    <span>{isSaved ? 'Saved' : 'Wishlist'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="pdp-share-btn"
                    aria-label="Share product"
                    title="Share this saree"
                  >
                    <Share2 size={17} />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              <div className="pdp-buttons-grid">
                <button
                  type="button"
                  onClick={handleAddToBag}
                  disabled={isSoldOut || isActionPending}
                  className="btn btn-primary pdp-add-to-bag-btn"
                >
                  <ShoppingBag size={18} />
                  <span>{isSoldOut ? 'SOLD OUT' : isActionPending ? 'Adding...' : 'Add to Bag'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isSoldOut || isActionPending}
                  className="btn btn-accent pdp-buy-now-btn"
                >
                  <Zap size={18} fill="currentColor" />
                  <span>
                    {isActionPending 
                      ? 'Processing...' 
                      : `Buy at ₹${(discountedPrice > 0 ? discountedPrice : product.price).toLocaleString('en-IN')}`}
                  </span>
                </button>
              </div>
            </div>

            {/* Policy-Aligned Verified Trust & Information Strip */}
            <div className="pdp-trust-3box-strip pdp-trust-grid" role="region" aria-label="Customer trust and purchase guarantees">
              {/* Box 1: Return & Refund Policy */}
              <Link to="/return-refund-policy" className="pdp-trust-box-card pdp-trust-link" title="View Return, Refund &amp; Cancellation Policy">
                <div className="pdp-trust-box-icon pdp-icon-return">
                  <RotateCcw size={21} strokeWidth={2.2} />
                </div>
                <div className="pdp-trust-box-text">
                  <div className="pdp-trust-box-title">Return &amp; Refund Policy</div>
                  <div className="pdp-trust-box-desc">3-Day Window for Defects &bull; Unboxing Video</div>
                </div>
              </Link>

              {/* Box 2: Payment Options */}
              <Link to="/shipping-policy" className="pdp-trust-box-card pdp-trust-link" title="Review Payment Options &amp; Courier Charges">
                <div className="pdp-trust-box-icon pdp-icon-cod">
                  <Banknote size={21} strokeWidth={2.2} />
                </div>
                <div className="pdp-trust-box-text">
                  <div className="pdp-trust-box-title">Payment Options</div>
                  <div className="pdp-trust-box-desc">Prepaid Free Delivery &bull; COD (₹89 Advance)</div>
                </div>
              </Link>

              {/* Box 3: Product Information */}
              <a href="#pdp-tabs-section" className="pdp-trust-box-card pdp-trust-link" title="View Atelier Specifications">
                <div className="pdp-trust-box-icon pdp-icon-assured">
                  <ShieldCheck size={21} strokeWidth={2.2} />
                </div>
                <div className="pdp-trust-box-text">
                  <div className="pdp-trust-box-title">Product Information</div>
                  <div className="pdp-trust-box-desc">Handcrafted Pure Silk &bull; Salem Atelier Weave</div>
                </div>
              </a>
            </div>

            {/* Subtle Shipping Policy Link */}
            <div className="pdp-shipping-policy-notice">
              <Truck size={15} className="pdp-shipping-notice-icon" />
              <span>Dispatched pan-India via trusted courier partners. Review our </span>
              <Link to="/shipping-policy" className="pdp-shipping-policy-anchor">Shipping &amp; Delivery Policy</Link>
            </div>

            {/* Admin-Managed Product Highlights Grid (Flipkart Pattern - Screenshot 1 & 3) */}
            <div className="pdp-highlights-card">
              <div 
                className="pdp-highlights-header"
                onClick={() => setIsHighlightsOpen(prev => !prev)}
                style={{ cursor: 'pointer' }}
                title="Click to toggle product highlights"
              >
                <span className="pdp-highlights-title">Product Highlights</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pdp-highlights-badge">Handcrafted Specs</span>
                  <div className="pdp-accordion-chevron-circle">
                    {isHighlightsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>
              {isHighlightsOpen && (
                <div className="pdp-highlights-grid pdp-flipkart-specs-grid">
                  {displayHighlights.map((hl, idx) => (
                    <div key={`${hl.label}-${idx}`} className="pdp-highlight-item pdp-flipkart-highlight-item">
                      <span className="pdp-highlight-label">{hl.label}</span>
                      <span className="pdp-highlight-value">{hl.value}</span>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Product Details Section Accordion (Matching Atelier & Flipkart Reference Design) */}
        {/* Product Details Section Accordion (Upgraded Flipkart Usability + MUETY Atelier Luxury) */}
        <div id="pdp-tabs-section" className="pdp-accordion-container pdp-flipkart-details-container">
          <div className="pdp-flipkart-details-top">
            <div className="pdp-flipkart-details-titles">
              <h2 className="pdp-flipkart-details-h2">
                <FileText size={19} color="#c9a227" />
                <span>All details</span>
              </h2>
              <span className="pdp-flipkart-details-sub">Features, description and more</span>
            </div>
            <div className="pdp-flipkart-tab-pills" role="tablist" aria-label="Product information tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeDetailTab === 'specifications'}
                onClick={() => {
                  setActiveDetailTab('specifications');
                  setOpenAccordion(prev => ({ ...prev, information: true, description: false, care: false, reviews: false }));
                  const el = document.getElementById('pdp-accordion-specifications');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                className={`pdp-flipkart-tab-pill ${activeDetailTab === 'specifications' ? 'active' : ''}`}
              >
                <Layers size={13} />
                <span>Specifications</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDetailTab === 'description'}
                onClick={() => {
                  setActiveDetailTab('description');
                  setOpenAccordion(prev => ({ ...prev, description: true, information: false, care: false, reviews: false }));
                  const el = document.getElementById('pdp-accordion-description');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                className={`pdp-flipkart-tab-pill ${activeDetailTab === 'description' ? 'active' : ''}`}
              >
                <FileText size={13} />
                <span>Description</span>
              </button>
              {adminCareText && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDetailTab === 'care'}
                  onClick={() => {
                    setActiveDetailTab('care');
                    setOpenAccordion(prev => ({ ...prev, care: true, description: false, information: false, reviews: false }));
                    const el = document.getElementById('pdp-accordion-care');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={`pdp-flipkart-tab-pill ${activeDetailTab === 'care' ? 'active' : ''}`}
                >
                  <ShieldCheck size={13} />
                  <span>Product Care</span>
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={activeDetailTab === 'reviews'}
                onClick={() => {
                  setActiveDetailTab('reviews');
                  setOpenAccordion(prev => ({ ...prev, reviews: true, description: false, information: false, care: false }));
                  const el = document.getElementById('pdp-accordion-reviews');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                className={`pdp-flipkart-tab-pill ${activeDetailTab === 'reviews' ? 'active' : ''}`}
              >
                <Star size={13} />
                <span>Patron Reviews ({effectiveReviewCount})</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div id="pdp-accordion-description" className="pdp-accordion-item">
            <button
              type="button"
              className="pdp-accordion-header"
              onClick={() => toggleAccordion('description')}
              aria-expanded={openAccordion.description}
            >
              <div className="pdp-accordion-header-left">
                <div className="pdp-accordion-icon-wrap">
                  <FileText size={16} />
                </div>
                <span className="pdp-accordion-title">Description</span>
                <span className="pdp-accordion-tag">Heritage Weave</span>
              </div>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.description ? 'open' : ''}`}
              />
            </button>
            {openAccordion.description && (
              <div className="pdp-accordion-body">
                <p className="pdp-desc-text">{product.description}</p>
                <div className="pdp-desc-heritage-box">
                  <Sparkles size={18} color="var(--brand-accent, #c9a227)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#10172a', display: 'block', marginBottom: '2px' }}>Artisanal Mastercraft Guarantee</strong>
                    <span>Every MUETY piece is handcrafted by master artisans in accordance with centuries-old heritage techniques. From initial thread selection to final hand-finishing, quality control is uncompromising.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Information */}
          <div id="pdp-accordion-specifications" className="pdp-accordion-item">
            <button
              type="button"
              className="pdp-accordion-header"
              onClick={() => toggleAccordion('information')}
              aria-expanded={openAccordion.information}
            >
              <div className="pdp-accordion-header-left">
                <div className="pdp-accordion-icon-wrap">
                  <Layers size={16} />
                </div>
                <span className="pdp-accordion-title">Product Information</span>
                <span className="pdp-accordion-tag">Silk Mark Certified</span>
              </div>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.information ? 'open' : ''}`}
              />
            </button>
            {openAccordion.information && (
              <div className="pdp-accordion-body">
                <div className="pdp-specs-table-container">
                  {product.category && (
                    <div className="pdp-specs-table-row">
                      <span className="pdp-specs-table-label">Category</span>
                      <span className="pdp-specs-table-val" style={{ textTransform: 'capitalize' }}>{product.category}</span>
                    </div>
                  )}
                  {product.specifications && Object.entries(product.specifications).length > 0 ? (
                    Object.entries(product.specifications).map(([key, val]) => (
                      <div key={key} className="pdp-specs-table-row">
                        <span className="pdp-specs-table-label">{key}</span>
                        <span className="pdp-specs-table-val">{val}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="pdp-specs-table-row">
                        <span className="pdp-specs-table-label">Fabric &amp; Purity</span>
                        <span className="pdp-specs-table-val">Authentic Pure Handloom Silk (Silk Mark Certified)</span>
                      </div>
                      <div className="pdp-specs-table-row">
                        <span className="pdp-specs-table-label">Origin &amp; Weave</span>
                        <span className="pdp-specs-table-val">Salem Traditional Mastercraft Weave</span>
                      </div>
                      <div className="pdp-specs-table-row">
                        <span className="pdp-specs-table-label">Zari Craft</span>
                        <span className="pdp-specs-table-val">Tested Gold / Silver Zari Motifs</span>
                      </div>
                      <div className="pdp-specs-table-row">
                        <span className="pdp-specs-table-label">Length &amp; Inclusions</span>
                        <span className="pdp-specs-table-val">6.2 Metres (Includes unstitched running blouse piece)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Product Care Details — Loaded directly from admin product entry */}
          <div id="pdp-accordion-care" className="pdp-accordion-item">
            <button
              type="button"
              className="pdp-accordion-header"
              onClick={() => toggleAccordion('care')}
              aria-expanded={openAccordion.care}
            >
              <div className="pdp-accordion-header-left">
                <div className="pdp-accordion-icon-wrap">
                  <ShieldCheck size={16} />
                </div>
                <span className="pdp-accordion-title">Product Care Details</span>
                <span className="pdp-accordion-tag">Atelier Preservation</span>
              </div>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.care ? 'open' : ''}`}
              />
            </button>
            {openAccordion.care && (
              <div className="pdp-accordion-body">
                <div className="pdp-care-details-card">
                  <div className="pdp-care-header">
                    <ShieldCheck size={18} color="var(--brand-accent, #c9a227)" />
                    <span className="pdp-care-badge-label">Atelier Preservation Guidelines</span>
                  </div>
                  <div className="pdp-care-list">
                    {adminCareText.split('\n').filter(line => line.trim().length > 0).map((line, idx) => {
                      const cleanLine = line.replace(/^[•\-\*]\s*/, '');
                      return (
                        <div key={idx} className="pdp-care-item">
                          <span className="pdp-care-bullet">✦</span>
                          <span className="pdp-care-text">{cleanLine}</span>
                        </div>
                      );
                    })}
                  </div>
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
              <div className="pdp-accordion-header-left">
                <div className="pdp-accordion-icon-wrap">
                  <Star size={16} />
                </div>
                <span className="pdp-accordion-title">
                  Ratings and reviews ({effectiveReviewCount})
                </span>
                <span className="pdp-accordion-tag">Verified Drape Reflections</span>
              </div>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`pdp-accordion-chevron ${openAccordion.reviews ? 'open' : ''}`}
              />
            </button>
            {openAccordion.reviews && (
              <div className="pdp-accordion-body">
                {/* Flipkart Compact Score Line (Screenshot 1) */}
                <div className="pdp-flipkart-reviews-score-row">
                  <span className="pdp-rating-badge-pill">
                    {(product.rating || 3.9).toFixed(1)} ★
                  </span>
                  <span className="pdp-rating-sentiment-pill">
                    {(product.rating || 3.9) >= 4 ? 'Exceptional' : 'Good'}
                  </span>
                  <span className="pdp-rating-count-text">
                    based on {effectiveReviewCount || 7} ratings by Verified Buyers
                  </span>
                </div>

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
                  <div className="pdp-muety-form-wrapper animate-fade-in">
                    <div className="pdp-muety-form-body">
                      <div className="pdp-muety-form-header-row">
                        <div>
                          <div className="pdp-muety-form-badge">
                            <Sparkles size={13} color="var(--brand-accent)" />
                            <span>MUETY Patron Sanctuary</span>
                          </div>
                          <h4 className="pdp-muety-form-title">Submit Your Drape Experience</h4>
                          <p className="pdp-muety-form-subtitle">
                            Share your authentic reflections on fabric feel, drape elegance, and artisanal luster.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(false)}
                          className="pdp-muety-form-close-btn"
                          aria-label="Close review form"
                          title="Close"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleAddReview} className="pdp-muety-form">
                        <div className="pdp-muety-form-row">
                          <div className="form-group pdp-muety-form-group">
                            <label className="form-label pdp-muety-form-label">
                              <span>Your Full Name</span>
                              <span className="pdp-req-star">*</span>
                            </label>
                            <input 
                              type="text" 
                              value={reviewerName} 
                              onChange={e => setReviewerName(e.target.value)} 
                              required 
                              className="form-input pdp-muety-form-input" 
                              placeholder="e.g. Ananya Sharma" 
                            />
                          </div>

                          <div className="form-group pdp-muety-form-group">
                            <label className="form-label pdp-muety-form-label">
                              <span>City / Location</span>
                              <span className="pdp-opt-tag">(Optional)</span>
                            </label>
                            <input 
                              type="text" 
                              value={reviewerLocation} 
                              onChange={e => setReviewerLocation(e.target.value)} 
                              className="form-input pdp-muety-form-input" 
                              placeholder="e.g. Chennai, Tamil Nadu" 
                            />
                          </div>
                        </div>

                        {/* Interactive 5-Star Rating Selector */}
                        <div className="form-group pdp-muety-form-group">
                          <label className="form-label pdp-muety-form-label">
                            <span>Patron Rating</span>
                            <span className="pdp-req-star">*</span>
                          </label>
                          <div className="pdp-muety-rating-container">
                            <div 
                              className="pdp-muety-stars-box"
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
                                      size={24} 
                                      fill={isFilled ? '#f59e0b' : 'none'} 
                                      color={isFilled ? '#f59e0b' : '#cbd5e1'} 
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <div className="pdp-muety-rating-badge">
                              <Star size={13} fill="#c9a227" color="#c9a227" />
                              <span className="pdp-muety-rating-score">{(hoverRating ?? reviewRating)}.0</span>
                              <span className="pdp-muety-rating-desc">
                                {(hoverRating ?? reviewRating) === 5 && 'Exceptional Drape'}
                                {(hoverRating ?? reviewRating) === 4 && 'Very Good Quality'}
                                {(hoverRating ?? reviewRating) === 3 && 'Pleasing Experience'}
                                {(hoverRating ?? reviewRating) === 2 && 'Fair Drape'}
                                {(hoverRating ?? reviewRating) === 1 && 'Needs Improvement'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="form-group pdp-muety-form-group">
                          <label className="form-label pdp-muety-form-label">
                            <span>Review Title</span>
                            <span className="pdp-opt-tag">(Optional)</span>
                          </label>
                          <input 
                            type="text" 
                            value={reviewTitle} 
                            onChange={e => setReviewTitle(e.target.value)} 
                            className="form-input pdp-muety-form-input" 
                            placeholder="e.g. Royal luster and exquisite zari craftsmanship" 
                          />
                        </div>

                        <div className="form-group pdp-muety-form-group">
                          <label className="form-label pdp-muety-form-label">
                            <span>Review Comment</span>
                            <span className="pdp-req-star">*</span>
                          </label>
                          <textarea 
                            value={reviewComment} 
                            onChange={e => setReviewComment(e.target.value)} 
                            required 
                            rows={3} 
                            className="form-input form-textarea pdp-muety-form-input" 
                            placeholder="Describe your drape experience with this creation..." 
                            style={{ resize: 'vertical' }}
                          />
                        </div>

                        {/* Patron Photograph Upload */}
                        <div className="form-group pdp-muety-form-group">
                          <label className="form-label pdp-muety-form-label">
                            <span>Attach Drape / Saree Photo</span>
                            <span className="pdp-opt-tag">(Optional)</span>
                          </label>
                          <div className="pdp-muety-photo-dropzone">
                            <label className="pdp-muety-photo-upload-btn">
                              <Upload size={16} color="var(--brand-accent)" />
                              <span>{reviewPhotoFile ? 'Change Drape Photo' : 'Upload Drape Photo'}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handlePhotoSelect} 
                                style={{ display: 'none' }} 
                              />
                            </label>

                            {reviewPhotoPreview ? (
                              <div className="pdp-muety-photo-preview-item">
                                <img 
                                  src={reviewPhotoPreview} 
                                  alt="Preview" 
                                  className="pdp-muety-photo-thumb"
                                />
                                <div className="pdp-muety-photo-details">
                                  <span className="pdp-muety-photo-name">
                                    {reviewPhotoFile?.name}
                                  </span>
                                  <span className="pdp-muety-photo-status">Ready to publish</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => { setReviewPhotoFile(null); setReviewPhotoPreview(null); }}
                                  className="pdp-muety-photo-del-btn"
                                  title="Remove photo"
                                  aria-label="Remove photo"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <span className="pdp-muety-photo-guideline">
                                PNG, JPG or WebP up to 10MB • Showcases authentic luster
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions Row */}
                        <div className="pdp-muety-form-actions-row">
                          <button 
                            type="submit" 
                            disabled={isSubmittingReview}
                            className="btn btn-primary pdp-muety-submit-btn"
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

                          <button
                            type="button"
                            onClick={() => setShowReviewForm(false)}
                            className="btn btn-outline pdp-muety-cancel-btn"
                          >
                            Cancel
                          </button>

                          <div className="pdp-muety-trust-badge">
                            <ShieldCheck size={15} color="var(--brand-accent)" />
                            <span>Verified Patron Submission</span>
                          </div>
                        </div>
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

        {/* Flipkart-Inspired Desktop Sticky Purchase Dock (Confined to Details Column) */}
        <div 
          className="pdp-flipkart-sticky-dock is-visible"
          role="region"
          aria-label="Quick purchase actions"
        >
          <div className="pdp-flipkart-dock-grid">
            <button
              type="button"
              onClick={handleAddToBag}
              disabled={isSoldOut || isActionPending}
              className="pdp-flipkart-dock-cart-btn"
              aria-label="Add to Bag"
            >
              <ShoppingBag size={18} />
              <span>{isSoldOut ? 'SOLD OUT' : isActionPending ? 'Adding...' : 'Add to Bag'}</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isSoldOut || isActionPending}
              className="pdp-flipkart-dock-buy-btn"
              aria-label="Buy Now"
            >
              <Zap size={18} fill="currentColor" />
              <span>
                {isActionPending 
                  ? 'Processing...' 
                  : `Buy at ₹${(discountedPrice > 0 ? discountedPrice : product.price).toLocaleString('en-IN')}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

        {relatedProducts.length > 0 && (
          <div id="curated-for-you" style={{ marginTop: 'clamp(3rem, 6vw, 6rem)' }}>
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

      {/* High-Resolution Product Image Lightbox Portal */}
      {isLightboxOpen && product && createPortal(
        <div 
          className="pdp-lightbox-overlay" 
          onClick={() => { setIsLightboxOpen(false); resetZoom(); }}
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution image gallery lightbox"
        >
          <div className="pdp-lightbox-container" onClick={(e) => e.stopPropagation()}>
            <div className="pdp-lightbox-header">
              <div className="pdp-lightbox-title-group">
                <span className="pdp-lightbox-brand">MUETY ATELIER</span>
                <span className="pdp-lightbox-title">{product.name}</span>
                <span className="pdp-lightbox-counter">{selectedImage + 1} of {galleryImages.length}</span>
              </div>
              <div className="pdp-lightbox-controls">
                <button 
                  type="button" 
                  onClick={handleZoomOut} 
                  disabled={zoomScale <= 1}
                  className="pdp-lightbox-btn" 
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="pdp-lightbox-zoom-val">{Math.round(zoomScale * 100)}%</span>
                <button 
                  type="button" 
                  onClick={handleZoomIn} 
                  disabled={zoomScale >= 4}
                  className="pdp-lightbox-btn" 
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
                {zoomScale > 1 && (
                  <button 
                    type="button" 
                    onClick={resetZoom} 
                    className="pdp-lightbox-btn-reset"
                    title="Reset zoom"
                  >
                    Reset
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => { setIsLightboxOpen(false); resetZoom(); }} 
                  className="pdp-lightbox-btn pdp-lightbox-close" 
                  aria-label="Close lightbox"
                  title="Close (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="pdp-lightbox-stage">
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={handleGalleryPrev}
                  disabled={selectedImage === 0}
                  className="pdp-lightbox-nav-btn pdp-lightbox-nav-prev"
                  aria-label="Previous image"
                  title="Previous image"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              <div className="pdp-lightbox-img-wrap">
                <img
                  src={galleryImages[selectedImage] || '/saree_model_individual.jpg'}
                  alt={`${product.name} - view ${selectedImage + 1}`}
                  className="pdp-lightbox-img"
                  onDoubleClick={handleImageDoubleClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchStart={handleGalleryTouchStart}
                  onTouchMove={handleGalleryTouchMove}
                  onTouchEnd={handleGalleryTouchEnd}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/saree_model_individual.jpg';
                  }}
                  style={zoomScale > 1 ? {
                    transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    cursor: isDragging ? 'grabbing' : 'grab'
                  } : { cursor: 'zoom-in' }}
                />
              </div>

              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={handleGalleryNext}
                  disabled={selectedImage === galleryImages.length - 1}
                  className="pdp-lightbox-nav-btn pdp-lightbox-nav-next"
                  aria-label="Next image"
                  title="Next image"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="pdp-lightbox-thumbs">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { resetZoom(); setSelectedImage(idx); }}
                    className={`pdp-lightbox-thumb ${selectedImage === idx ? 'active' : ''}`}
                    aria-label={`View creation drape ${idx + 1}`}
                  >
                    <img 
                      src={img} 
                      alt="" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/saree_model_individual.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
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

      {/* Product Link Sharing Modal */}
      {isShareModalOpen && product && createPortal(
        <div 
          className="pdp-share-modal-overlay" 
          onClick={() => setIsShareModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdp-share-modal-title"
        >
          <div 
            className="pdp-share-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdp-share-modal-header">
              <h3 id="pdp-share-modal-title" className="pdp-share-modal-title">
                <Share2 size={18} color="var(--brand-accent, #C99A16)" />
                <span>Share Atelier Creation</span>
              </h3>
              <button 
                type="button" 
                className="pdp-share-modal-close"
                onClick={() => setIsShareModalOpen(false)}
                aria-label="Close share dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="pdp-share-modal-body">
              {/* Product preview card */}
              <div className="pdp-share-product-preview">
                <img 
                  src={galleryImages[0] || '/saree_model_individual.jpg'} 
                  alt={product.name} 
                  className="pdp-share-product-thumb"
                />
                <div className="pdp-share-product-info">
                  <div className="pdp-share-product-name">{product.name}</div>
                  <div className="pdp-share-product-meta">
                    <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>₹{product.price.toLocaleString('en-IN')}</span>
                    {product.category && <span>• {product.category}</span>}
                    <span>• Pure Handloom</span>
                  </div>
                </div>
              </div>

              {/* Copy Direct Link */}
              <div className="pdp-share-link-box">
                <label htmlFor="pdp-share-link-input" className="pdp-share-label">Product Link</label>
                <div className="pdp-share-input-group">
                  <input 
                    id="pdp-share-link-input"
                    type="text" 
                    readOnly 
                    value={shareUrl} 
                    className="pdp-share-input"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button 
                    type="button" 
                    onClick={handleCopyLink}
                    className={`pdp-share-copy-btn ${isLinkCopied ? 'copied' : ''}`}
                    aria-label="Copy product link"
                  >
                    {isLinkCopied ? (
                      <>
                        <Check size={16} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Share Channels */}
              <div>
                <span className="pdp-share-label">Share with Connoisseurs</span>
                <div className="pdp-share-channels-grid">
                  <button 
                    type="button"
                    onClick={() => handleShareChannel('whatsapp')}
                    className="pdp-share-channel-btn pdp-share-btn-whatsapp"
                    aria-label="Share via WhatsApp"
                  >
                    <MessageCircle size={16} />
                    <span>WhatsApp</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleShareChannel('facebook')}
                    className="pdp-share-channel-btn pdp-share-btn-facebook"
                    aria-label="Share on Facebook"
                  >
                    <Facebook size={16} />
                    <span>Facebook</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleShareChannel('twitter')}
                    className="pdp-share-channel-btn pdp-share-btn-twitter"
                    aria-label="Share on X"
                  >
                    <Twitter size={16} />
                    <span>X</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleShareChannel('pinterest')}
                    className="pdp-share-channel-btn pdp-share-btn-pinterest"
                    aria-label="Save to Pinterest"
                  >
                    <ExternalLink size={16} />
                    <span>Pinterest</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleShareChannel('email')}
                    className="pdp-share-channel-btn pdp-share-btn-email"
                    aria-label="Share via Email"
                  >
                    <Mail size={16} />
                    <span>Email</span>
                  </button>
                  {hasNativeShare && (
                    <button 
                      type="button"
                      onClick={handleNativeShare}
                      className="pdp-share-channel-btn pdp-share-btn-native"
                      aria-label="More sharing options"
                    >
                      <Share2 size={16} />
                      <span>More Options</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Sticky Bottom Action Bar (Flipkart Match) */}
      {typeof document !== 'undefined' && createPortal(
        <div 
          className={`pdp-mobile-sticky-bar ${isStickyBarVisible ? 'is-visible' : ''}`}
          role="region"
          aria-label="Quick purchase actions"
          aria-hidden={!isStickyBarVisible}
        >
          <div className="pdp-sticky-bar-info" style={{ display: 'none' }}>
            <img 
              src={galleryImages[0]} 
              alt={product.name} 
              className="pdp-sticky-bar-thumb" 
            />
            <div className="pdp-sticky-bar-meta">
              <span className="pdp-sticky-bar-title">{product.name}</span>
              <div className="pdp-sticky-bar-pricing">
                <span className="pdp-sticky-bar-price">
                  ₹{(discountedPrice > 0 ? discountedPrice : product.price).toLocaleString('en-IN')}
                </span>
                {product.originalPrice && product.originalPrice > (discountedPrice > 0 ? discountedPrice : product.price) && (
                  <span className="pdp-sticky-bar-mrp">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                )}
              </div>
            </div>
          </div>

          <div className="pdp-sticky-bar-actions pdp-mobile-dock-grid">
            <button
              type="button"
              onClick={handleAddToBag}
              disabled={isSoldOut || isActionPending}
              className="pdp-sticky-btn pdp-sticky-cart-btn pdp-mobile-dock-cart-btn"
              aria-label="Add to Bag"
            >
              <ShoppingBag size={18} />
              <span>{isSoldOut ? 'SOLD OUT' : isActionPending ? 'Adding...' : 'Add to Bag'}</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isSoldOut || isActionPending}
              className="pdp-sticky-btn pdp-sticky-buy-btn pdp-mobile-dock-buy-btn"
              aria-label="Buy Now"
            >
              <Zap size={18} fill="currentColor" />
              <span>
                {isActionPending 
                  ? 'Processing...' 
                  : `Buy at ₹${(discountedPrice > 0 ? discountedPrice : product.price).toLocaleString('en-IN')}`}
              </span>
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
