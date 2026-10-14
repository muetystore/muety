import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { reviewService } from '@/features/reviews/services/reviewService';
import { storageService } from '@/lib/storage/storageService';
import { useCart } from '@/shared/context/CartContext';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/components/ProductCard';
import { QuickViewModal } from '@/features/catalog/components/QuickViewModal';
import { SectionHeader } from '@/features/catalog/components/SectionHeader';
import { CampaignHero } from '@/features/catalog/components/CampaignHero';
import { Product, Category } from '@/types';
import { PatronReview } from '@/features/reviews/types';
import { 
  Sparkles, 
  ShieldCheck,
  Award,
  Truck,
  MessageCircle, 
  Phone, 
  Mail, 
  Star, 
  ArrowRight,
  Clock,
  CheckCircle2,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const HomePage: React.FC = () => {
  useDocumentTitle('Home');

  const { wishlist } = useCart();
  const { user, isAuthenticated, loginWithGoogle } = useAuth();
  const { success, error } = useNotification();

  const trendingScrollRef = useRef<HTMLDivElement>(null);
  const newArrivalsScrollRef = useRef<HTMLDivElement>(null);
  const topPicksScrollRef = useRef<HTMLDivElement>(null);
  const mostWantedScrollRef = useRef<HTMLDivElement>(null);
  const occasionScrollRef = useRef<HTMLDivElement>(null);

  const scrollTrending = (direction: 'left' | 'right') => {
    if (trendingScrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      trendingScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollProductRow = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>(() => storageService.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => storageService.getCategories());
  const [approvedReviews, setApprovedReviews] = useState<PatronReview[]>([]);
  const [activeReviewIdx, setActiveReviewIdx] = useState<number>(0);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => storageService.getRecentlyViewed());
  const [selectedOccasion, setSelectedOccasion] = useState<string>('bridal');
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterConsent, setNewsletterConsent] = useState<boolean>(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(() => storageService.getProducts().length === 0);

  const displayReviews: PatronReview[] = useMemo(() => {
    // 1. Only approved reviews where admin enabled "Featured on Homepage" (isFeatured or showOnHome)
    const featured = approvedReviews
      .filter(r => r.status === 'approved' && (r.isFeatured || r.showOnHome))
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
    if (featured.length > 0) return featured;

    // 2. Fallback to approved reviews
    const approved = approvedReviews.filter(r => r.status === 'approved');
    if (approved.length > 0) return approved;

    // 3. Fallback to verified seed impressions
    return [
      {
        id: 'rev-1',
        authorName: 'Priyamvada Sundaram',
        authorLocation: 'Chennai, Tamil Nadu',
        rating: 5,
        quote: 'Getting ready felt like a royal moment draped in MUETY pure silk ✨🤍',
        comment: 'The Salem handloom pit-loom weave and pure zari temple border had such luminous drape. Everyone remarked on the authentic Silk Mark craftsmanship.',
        verifiedPurchase: true,
        status: 'approved' as const,
        isFeatured: true,
        showOnHome: true,
        displayOrder: 1,
        productName: 'Royal Crimson Korvai Saree',
        photoUrl: '/saree_model_individual.jpg',
        createdAt: new Date().toISOString()
      },
      {
        id: 'rev-2',
        authorName: 'Meenakshi Iyer',
        authorLocation: 'Bengaluru, Karnataka',
        rating: 5,
        quote: 'The gold zari luster and pure mulberry silk texture were unmatched.',
        comment: 'Arrived in pristine gold-foil packaging within 48 hours. The flat ₹89 nationwide delivery and authentic handloom weight made this my finest festive drape.',
        verifiedPurchase: true,
        status: 'approved' as const,
        isFeatured: true,
        showOnHome: true,
        displayOrder: 2,
        productName: 'Kanchipuram Mustard Zari Drape',
        photoUrl: '/saree_model_drape.jpg',
        createdAt: new Date().toISOString()
      },
      {
        id: 'rev-3',
        authorName: 'Dr. Radhika Menon',
        authorLocation: 'Kochi, Kerala',
        rating: 5,
        quote: 'Heirloom quality that my daughter will treasure for generations.',
        comment: 'The pit-loom artisans in Salem have preserved temple borders with breathtaking precision. Outstanding client support via WhatsApp as well.',
        verifiedPurchase: true,
        status: 'approved' as const,
        isFeatured: true,
        showOnHome: true,
        displayOrder: 3,
        productName: 'Emerald Temple Border Saree',
        photoUrl: '/saree_fabric_detail.jpg',
        createdAt: new Date().toISOString()
      },
      {
        id: 'rev-4',
        authorName: 'Ananya Deshmukh',
        authorLocation: 'Pune, Maharashtra',
        rating: 5,
        quote: 'The Korvai border precision is a masterclass in South Indian weaving.',
        comment: 'Wore it for Diwali pooja. Received compliments from everyone. Truly an heirloom drape.',
        verifiedPurchase: true,
        status: 'approved' as const,
        isFeatured: true,
        showOnHome: true,
        displayOrder: 4,
        productName: 'Salem Royal Gold Tissue Saree',
        photoUrl: '/saree_model_individual.jpg',
        createdAt: new Date().toISOString()
      }
    ];
  }, [approvedReviews]);

  // Subscribe to live products & categories
  useEffect(() => {
    const unsubProducts = productService.subscribeToProducts((products) => {
      setAllProducts(products || []);
      setIsLoading(false);
    });

    const unsubCategories = productService.subscribeToCategories((cats) => {
      setCategories(cats || []);
    });

    // Load approved reviews
    try {
      const reviews = reviewService.getApprovedReviews();
      setApprovedReviews(reviews || []);
    } catch {
      setApprovedReviews([]);
    }

    const unsubReviews = reviewService.subscribeToReviews((revs) => {
      const approved = (revs || []).filter(r => r.status === 'approved');
      setApprovedReviews(approved);
    });

    // Listen for recently viewed changes
    const handleRecentUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setRecentlyViewedIds(e.detail);
      } else {
        setRecentlyViewedIds(storageService.getRecentlyViewed());
      }
    };
    window.addEventListener('muety_recently_viewed_updated', handleRecentUpdate);

    return () => {
      if (typeof unsubProducts === 'function') unsubProducts();
      if (typeof unsubCategories === 'function') unsubCategories();
      if (typeof unsubReviews === 'function') unsubReviews();
      window.removeEventListener('muety_recently_viewed_updated', handleRecentUpdate);
    };
  }, []);

  // Section 3: Trending Collections (Admin-selected categories showcase)
  const trendingCategories = useMemo(() => {
    const selected = categories.filter(c => c.active !== false && c.isTrending === true);
    if (selected.length > 0) return selected;
    const featured = categories.filter(c => c.active !== false && c.featured === true);
    if (featured.length > 0) return featured;
    return categories.filter(c => c.active !== false);
  }, [categories]);

  // Section 5: New Arrivals (Admin-selected authority)
  const newArrivals = useMemo(() => {
    if (allProducts.length === 0) return [];
    const flagged = allProducts.filter(p => 
      p.published !== false && (p.isNewArrival === true || p.newArrival === true)
    );
    if (flagged.length > 0) return flagged;
    const byTag = allProducts.filter(p => 
      p.published !== false && (p.tags || []).some(t => t.toLowerCase() === 'new' || t.toLowerCase() === 'new arrival')
    );
    if (byTag.length > 0) return byTag;
    return allProducts.filter(p => p.published !== false);
  }, [allProducts]);

  // Section 6: Top Picks / Bestsellers (Admin-selected authority)
  const topPicks = useMemo(() => {
    if (allProducts.length === 0) return [];
    const flagged = allProducts.filter(p => 
      p.published !== false && (p.isBestSeller === true || p.bestseller === true)
    );
    if (flagged.length > 0) return flagged;
    const highRated = allProducts.filter(p => 
      p.published !== false && ((p.rating && p.rating >= 4.8) || (p.reviewCount && p.reviewCount > 0))
    );
    if (highRated.length > 0) return highRated;
    return allProducts.filter(p => p.published !== false);
  }, [allProducts]);

  // Section 7: Most Wanted (Admin-selected authority)
  const mostWanted = useMemo(() => {
    if (allProducts.length === 0) return [];
    const flagged = allProducts.filter(p => 
      p.published !== false && (p.isMostWanted === true || p.mostWanted === true || p.featured === true)
    );
    if (flagged.length > 0) return flagged;
    const signals = allProducts.filter(p => 
      p.published !== false && (wishlist.includes(p.id) || (p.stock > 0 && p.stock <= 5))
    );
    if (signals.length > 0) return signals;
    return allProducts.filter(p => p.published !== false);
  }, [allProducts, wishlist]);

  // Section 9: Festive Edits by Occasion (Admin-selected authority)
  const occasionProducts = useMemo(() => {
    if (allProducts.length === 0) return [];
    const target = selectedOccasion; // 'bridal' | 'temple' | 'reception' | 'festive'
    
    // Explicit admin assignment match
    const adminSelected = allProducts.filter(p => 
      p.published !== false && (
        (p.occasion || '').toLowerCase().includes(target) || 
        (p.occasions && p.occasions.some(o => o.toLowerCase().includes(target)))
      )
    );
    if (adminSelected.length > 0) return adminSelected;

    // Graceful fallback heuristics if admin has not explicitly set occasion string yet
    if (target === 'bridal') {
      const bridal = allProducts.filter(p => 
        p.published !== false && (
          (p.categorySlug || '').includes('bridal') || 
          (p.name || '').toLowerCase().includes('kanchipuram') ||
          (p.tags || []).some(t => t.toLowerCase().includes('bridal') || t.toLowerCase().includes('zari'))
        )
      );
      return bridal.length > 0 ? bridal : allProducts;
    } else if (target === 'temple') {
      const temple = allProducts.filter(p => 
        p.published !== false && (
          (p.name || '').toLowerCase().includes('temple') || 
          (p.tags || []).some(t => t.toLowerCase().includes('temple') || t.toLowerCase().includes('korvai') || t.toLowerCase().includes('traditional'))
        )
      );
      return temple.length > 0 ? temple : allProducts;
    } else if (target === 'reception') {
      const reception = allProducts.filter(p => 
        p.published !== false && (
          (p.categorySlug || '').includes('handloom') ||
          (p.fabric || '').toLowerCase().includes('organza') ||
          (p.fabric || '').toLowerCase().includes('soft') ||
          (p.tags || []).some(t => t.toLowerCase().includes('reception') || t.toLowerCase().includes('party'))
        )
      );
      return reception.length > 0 ? reception : allProducts;
    } else {
      // festive / family celebrations (Salem Handlooms)
      const festive = allProducts.filter(p => 
        p.published !== false && (
          (p.tags || []).some(t => t.toLowerCase().includes('festive') || t.toLowerCase().includes('diwali') || t.toLowerCase().includes('salem')) ||
          (p.categorySlug || '').includes('sarees')
        )
      );
      return festive.length > 0 ? festive : allProducts;
    }
  }, [allProducts, selectedOccasion]);

  // Section 10: Recently Viewed Products
  const recentlyViewedProducts = useMemo(() => {
    if (recentlyViewedIds.length === 0 || allProducts.length === 0) return [];
    return recentlyViewedIds
      .map(id => allProducts.find(p => p.id === id || p.slug === id))
      .filter((p): p is Product => p !== undefined)
      .slice(0, 4);
  }, [recentlyViewedIds, allProducts]);

  // Section 11: Personalized Recommendations
  const personalizedRecommendations = useMemo(() => {
    if (allProducts.length === 0) return [];
    const preferredCategories = new Set<string>();
    [...recentlyViewedProducts, ...allProducts.filter(p => wishlist.includes(p.id))].forEach(p => {
      if (p.categorySlug) preferredCategories.add(p.categorySlug.toLowerCase());
      if (p.category) preferredCategories.add(p.category.toLowerCase());
    });

    const viewedIdSet = new Set(recentlyViewedIds);

    if (preferredCategories.size > 0) {
      const matching = allProducts.filter(p => 
        !viewedIdSet.has(p.id) && (
          preferredCategories.has((p.categorySlug || '').toLowerCase()) ||
          preferredCategories.has((p.category || '').toLowerCase())
        )
      );
      if (matching.length >= 2) {
        return matching.slice(0, 4);
      }
    }

    const remaining = allProducts.filter(p => !viewedIdSet.has(p.id));
    return (remaining.length >= 2 ? remaining : allProducts).slice(0, 4);
  }, [allProducts, recentlyViewedProducts, recentlyViewedIds, wishlist]);

  const handleClearRecentlyViewed = () => {
    try {
      localStorage.removeItem('muety_recently_viewed_v1');
    } catch {}
    setRecentlyViewedIds([]);
    window.dispatchEvent(new CustomEvent('muety_recently_viewed_updated', { detail: [] }));
  };

  const saveNewsletterSubscription = (emailToSave: string) => {
    try {
      const clean = emailToSave.trim().toLowerCase();
      const existing = JSON.parse(localStorage.getItem('muety_newsletter_subs') || '[]');
      if (!existing.includes(clean)) {
        existing.push(clean);
        localStorage.setItem('muety_newsletter_subs', JSON.stringify(existing));
      }
    } catch {}
    setNewsletterSubscribed(true);
  };

  const handleGoogleJoin = async () => {
    if (!newsletterConsent) {
      error('Please accept the Terms & Conditions and Privacy Policy before joining the Patron Circle.');
      return;
    }
    setIsAuthSubmitting(true);
    try {
      const u = await loginWithGoogle();
      if (u?.email) {
        saveNewsletterSubscription(u.email);
      }
      success(`Welcome to the MUETY Patron Circle, ${u.displayName || 'Patron'}!`);
    } catch (err: any) {
      error(err?.message || 'Google Authentication encountered an error.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterConsent) {
      error('Please accept the Terms & Conditions and Privacy Policy before proceeding.');
      return;
    }
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      error('Please enter a valid email address.');
      return;
    }
    saveNewsletterSubscription(newsletterEmail);
    success('Welcome to the MUETY Patron Circle. You will receive private loom release invitations.');
  };

  return (
    <div className="home-page animate-fade-in" style={{ position: 'relative', overflowX: 'clip', width: '100%', maxWidth: '100%' }}>
      
      {/* =========================================================================
          SECTION 1: RESPONSIVE CAMPAIGN HERO BANNER CAROUSEL
          ========================================================================= */}
      <CampaignHero />

      {/* =========================================================================
          SECTION 3: TRENDING COLLECTIONS (Single-row rounded category showcase)
          ========================================================================= */}
      <section 
        className="section-padding trending-showcase-section"
        aria-label="Trending Collections"
        style={{ 
          background: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.05) 0%, rgba(255, 255, 255, 0) 70%), var(--bg-main)', 
          position: 'relative' 
        }}
      >
        <div className="container">
          <SectionHeader 
            eyebrow="Curated Capsules"
            title="Trending Collections"
            subtitle="Hand-selected weaves capturing the festive season's most sought-after colors, borders, and zari weights."
            actionLink={{ to: '/categories', label: 'Explore All' }}
          />

          {isLoading ? (
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', padding: '3rem 0' }}>
              {[1, 2, 3, 4].map(n => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 'clamp(140px, 17vw, 220px)', height: 'clamp(140px, 17vw, 220px)', borderRadius: '50%', backgroundColor: 'var(--brand-border)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '120px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--brand-border)' }} />
                  <div style={{ width: '80px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--brand-border)' }} />
                </div>
              ))}
            </div>
          ) : trendingCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--brand-muted)', fontSize: '0.95rem' }}>Curated collections are arriving from the looms.</p>
            </div>
          ) : (
            <div className="trending-gallery-stage">
              {/* Luxury Stage Header Pill */}
              <div className="trending-stage-header">
                <span className="trending-stage-badge">
                  <Sparkles size={13} style={{ color: '#d4af37' }} />
                  <span>Curated Festival Edit • Pure Silk & Zari</span>
                  <Sparkles size={13} style={{ color: '#d4af37' }} />
                </span>
              </div>

              {/* Desktop Scroll Left Button */}
              {trendingCategories.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollTrending('left')}
                  aria-label="Scroll left"
                  className="trending-nav-arrow trending-nav-left"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Single Row Horizontal Showcase Track */}
              <div 
                ref={trendingScrollRef}
                className="circular-categories-carousel"
                style={{
                  justifyContent: trendingCategories.length <= 4 ? 'center' : 'flex-start'
                }}
              >
                {trendingCategories.map((cat) => {
                  const circleImg = cat.imageUrl || cat.image || (
                    cat.slug === 'bridal' ? '/saree_model_drape.jpg' :
                    cat.slug === 'handloom' ? '/saree_fabric_detail.jpg' :
                    '/saree_model_individual.jpg'
                  );
                  return (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug || cat.id}`}
                      className="trending-circle-card"
                    >
                      {/* Sculpted Dual-Ring Gold Bezel Circular Category Frame */}
                      <div className="category-circle-frame">
                        <div className="circle-inner-bezel">
                          <img 
                            src={circleImg} 
                            alt={cat.name} 
                            className="circle-avatar-img"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              const target = e.currentTarget;
                              target.src = '/saree_model_individual.jpg';
                            }}
                          />
                        </div>
                      </div>

                      {/* Editorial Category Metadata */}
                      <div className="trending-cat-meta">
                        <h3 className="trending-cat-title" title={cat.name}>
                          {cat.name}
                        </h3>

                        {cat.description ? (
                          <p className="trending-cat-desc">{cat.description}</p>
                        ) : (
                          <p className="trending-cat-desc">
                            {cat.itemCount && cat.itemCount > 0 ? `${cat.itemCount} Exclusive Drapes` : 'Heirloom Weaves & Borders'}
                          </p>
                        )}

                        <span className="trending-cat-badge">
                          UPTO 40% OFF
                        </span>

                        <span className="trending-cat-cta">
                          <span>Explore Weaves</span>
                          <span className="trending-cta-arrow">→</span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop Scroll Right Button */}
              {trendingCategories.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollTrending('right')}
                  aria-label="Scroll right"
                  className="trending-nav-arrow trending-nav-right"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: NEW ARRIVALS (Single-row scrolling display)
          ========================================================================= */}
      <section 
        className="section-padding"
        aria-label="New Arrivals"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        <div className="container">
          <SectionHeader 
            eyebrow="Fresh from the Looms"
            title="New Arrivals"
            subtitle="Newly unveiled silk sarees fresh from Salem and Kanchipuram master pit-looms."
            actionLink={{ to: '/products?tag=new', label: 'View All New' }}
          />

          {isLoading ? (
            <div className="products-carousel-track">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="product-scroll-item">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : newArrivals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--brand-muted)' }}>New creations are being cataloged by our curators.</p>
            </div>
          ) : (
            <div className="product-row-showcase">
              {newArrivals.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollProductRow(newArrivalsScrollRef, 'left')}
                  aria-label="Scroll left"
                  className="product-nav-arrow product-nav-left"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              <div 
                ref={newArrivalsScrollRef}
                className="products-carousel-track"
              >
                {newArrivals.map(p => (
                  <div key={p.id} className="product-scroll-item">
                    <ProductCard 
                      product={p} 
                      onQuickView={(prod) => setQuickViewProduct(prod)} 
                    />
                  </div>
                ))}
              </div>

              {newArrivals.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollProductRow(newArrivalsScrollRef, 'right')}
                  aria-label="Scroll right"
                  className="product-nav-arrow product-nav-right"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: BESTSELLERS AND TOP PICKS (Single-row scrolling display)
          ========================================================================= */}
      <section 
        className="section-padding"
        aria-label="Bestsellers and Top Picks"
        style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--brand-border)', borderBottom: '1px solid var(--brand-border)' }}
      >
        <div className="container">
          <SectionHeader 
            eyebrow="Patron Favorites"
            title="Bestsellers &amp; Top Picks"
            subtitle="The most treasured creations celebrated for luminous drape, intricate korvai borders, and ceremonial elegance."
            actionLink={{ to: '/products', label: 'Shop Bestsellers' }}
          />

          {isLoading ? (
            <div className="products-carousel-track">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="product-scroll-item">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : topPicks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--brand-muted)' }}>Preparing bestseller lineup.</p>
            </div>
          ) : (
            <div className="product-row-showcase">
              {topPicks.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollProductRow(topPicksScrollRef, 'left')}
                  aria-label="Scroll left"
                  className="product-nav-arrow product-nav-left"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              <div 
                ref={topPicksScrollRef}
                className="products-carousel-track"
              >
                {topPicks.map(p => (
                  <div key={p.id} className="product-scroll-item">
                    <ProductCard 
                      product={p} 
                      onQuickView={(prod) => setQuickViewProduct(prod)} 
                    />
                  </div>
                ))}
              </div>

              {topPicks.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollProductRow(topPicksScrollRef, 'right')}
                  aria-label="Scroll right"
                  className="product-nav-arrow product-nav-right"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: MOST WANTED (Single-row scrolling display)
          ========================================================================= */}
      <section 
        className="section-padding"
        aria-label="Most Wanted Heirlooms"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        <div className="container">
          <SectionHeader 
            eyebrow="High Demand Silks"
            title="Most Wanted"
            subtitle="Coveted handloom heirlooms with limited weaving runs and active patron wishlist interest."
            actionLink={{ to: '/products', label: 'View Collection' }}
          />

          {isLoading ? (
            <div className="products-carousel-track">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="product-scroll-item">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : mostWanted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--brand-muted)' }}>Updating high-demand inventory.</p>
            </div>
          ) : (
            <div className="product-row-showcase">
              {mostWanted.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollProductRow(mostWantedScrollRef, 'left')}
                  aria-label="Scroll left"
                  className="product-nav-arrow product-nav-left"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              <div 
                ref={mostWantedScrollRef}
                className="products-carousel-track"
              >
                {mostWanted.map(p => (
                  <div key={p.id} className="product-scroll-item">
                    <ProductCard 
                      product={p} 
                      onQuickView={(prod) => setQuickViewProduct(prod)} 
                    />
                  </div>
                ))}
              </div>

              {mostWanted.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollProductRow(mostWantedScrollRef, 'right')}
                  aria-label="Scroll right"
                  className="product-nav-arrow product-nav-right"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: SALEM ATELIER / OUR CRAFTSMANSHIP EDITORIAL FEATURE
          ========================================================================= */}
      <section 
        className="editorial-craftsmanship-section section-padding"
        aria-label="Salem Atelier Craftsmanship"
        style={{
          backgroundColor: '#070a12',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <SectionHeader 
            eyebrow="Salem Handloom Heritage"
            title="The Art of Authenticity"
            subtitle="Generational handloom techniques, Silk Mark certified mulberry silk, and fair wages for Salem weaving families."
            theme="dark"
            centered={true}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginTop: '1rem'
          }}>
            <div style={{
              backgroundColor: 'rgba(16, 23, 42, 0.75)',
              border: '1px solid rgba(201, 162, 39, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(201, 162, 39, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} color="#facc15" />
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>100% Silk Mark India</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.55, margin: 0 }}>
                Every single saree thread is verified 100% natural Mulberry silk filaments under the statutory standards of the Silk Mark Organisation of India.
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(16, 23, 42, 0.75)',
              border: '1px solid rgba(201, 162, 39, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(201, 162, 39, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} color="#facc15" />
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>Tested Gold &amp; Silver Zari</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.55, margin: 0 }}>
                Our intricate korvai borders and rich pallus feature certified electroplated metallic threads woven with traditional adai handloom cards.
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(16, 23, 42, 0.75)',
              border: '1px solid rgba(201, 162, 39, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(201, 162, 39, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color="#facc15" />
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>Master Salem Artisans</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.55, margin: 0 }}>
                Each bridal masterpiece takes 3 to 4 weeks of uninterrupted hand-weaving, sustaining fair wages and generational handloom pride.
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(16, 23, 42, 0.75)',
              border: '1px solid rgba(201, 162, 39, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(201, 162, 39, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={22} color="#facc15" />
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>Direct From Atelier Pricing</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.55, margin: 0 }}>
                Straight from our Salem weaver clusters directly to your doorstep with flat ₹89 nationwide shipping and COD advance accounting.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link 
              to="/about"
              className="btn btn-outline-gold"
              style={{ padding: '0.75rem 1.75rem' }}
            >
              Read Our Salem Atelier Story &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: FESTIVE EDITS AND OCCASION-BASED SHOPPING
          ========================================================================= */}
      <section 
        className="section-padding"
        aria-label="Festive Edits and Occasion-Based Shopping"
        style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--brand-border)', borderBottom: '1px solid var(--brand-border)' }}
      >
        <div className="container">
          <SectionHeader 
            eyebrow="Ceremonial Dressing"
            title="Festive Edits by Occasion"
            subtitle="Curated handlooms tailored for sacred wedding muhurthams, temple festivities, and celebratory evenings."
            actionLink={{ to: '/products', label: 'View All Edits' }}
          />

          {/* Occasion Switcher Tabs */}
          <div 
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '8px',
              marginBottom: '1.5rem',
              scrollbarWidth: 'none'
            }}
          >
            {[
              { id: 'bridal', label: 'Bridal Muhurtham', badge: 'Pure Zari' },
              { id: 'temple', label: 'Temple Ceremonies', badge: 'Sacred Hues' },
              { id: 'reception', label: 'Grand Receptions', badge: 'Soft Silks' },
              { id: 'festive', label: 'Family Festivities', badge: 'Salem Handlooms' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedOccasion(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: '1px solid',
                  borderColor: selectedOccasion === tab.id ? 'var(--brand-primary)' : 'var(--brand-border)',
                  backgroundColor: selectedOccasion === tab.id ? 'var(--brand-primary)' : '#ffffff',
                  color: selectedOccasion === tab.id ? '#ffffff' : 'var(--brand-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: selectedOccasion === tab.id ? '#facc15' : 'var(--brand-accent)',
                  backgroundColor: selectedOccasion === tab.id ? 'rgba(255,255,255,0.15)' : 'var(--bg-subtle)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Festive Edits Single-Row Scrolling Display */}
          <div className="product-row-showcase">
            {occasionProducts.length > 4 && (
              <button
                type="button"
                onClick={() => scrollProductRow(occasionScrollRef, 'left')}
                aria-label="Scroll left"
                className="product-nav-arrow product-nav-left"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div 
              ref={occasionScrollRef}
              className="products-carousel-track"
            >
              {occasionProducts.map(p => (
                <div key={p.id} className="product-scroll-item">
                  <ProductCard 
                    product={p} 
                    onQuickView={(prod) => setQuickViewProduct(prod)} 
                  />
                </div>
              ))}
            </div>

            {occasionProducts.length > 4 && (
              <button
                type="button"
                onClick={() => scrollProductRow(occasionScrollRef, 'right')}
                aria-label="Scroll right"
                className="product-nav-arrow product-nav-right"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: RECENTLY VIEWED (Deduplicated, bounded list)
          ========================================================================= */}
      {recentlyViewedProducts.length > 0 && (
        <section 
          className="section-padding"
          aria-label="Recently Viewed Products"
          style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--brand-border)' }}
        >
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--brand-accent)', textTransform: 'uppercase' }}>
                  Your Preview History
                </span>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--brand-primary)', margin: '2px 0 0' }}>
                  Recently Viewed
                </h2>
              </div>
              <button
                onClick={handleClearRecentlyViewed}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--brand-muted)',
                  cursor: 'pointer'
                }}
                title="Clear Recently Viewed History"
              >
                <Trash2 size={13} />
                <span>Clear History</span>
              </button>
            </div>

            <div className="products-grid">
              {recentlyViewedProducts.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  onQuickView={(prod) => setQuickViewProduct(prod)} 
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 11: PERSONALIZED RECOMMENDATIONS
          ========================================================================= */}
      <section 
        className="section-padding"
        aria-label="Personalized Recommendations"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--brand-border)' }}
      >
        <div className="container">
          <SectionHeader 
            eyebrow="Curated For You"
            title="Personalized Recommendations"
            subtitle="Tailored selections harmonizing with your favored borders, fabrics, and festive preferences."
            actionLink={{ to: '/products', label: 'Explore More' }}
          />

          {isLoading ? (
            <div className="products-grid">
              {[1, 2, 3, 4].map(n => <ProductCardSkeleton key={n} />)}
            </div>
          ) : personalizedRecommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--brand-muted)' }}>Curating recommendations based on your preferences.</p>
            </div>
          ) : (
            <div className="products-grid">
              {personalizedRecommendations.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  onQuickView={(prod) => setQuickViewProduct(prod)} 
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 12: CUSTOMER REVIEWS (Libas-inspired storytelling carousel)
          ========================================================================= */}
      <section 
        id="customer-reviews-section"
        className="section-padding"
        aria-label="Customer Reviews"
        style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--brand-border)' }}
      >
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', textAlign: 'center' }}>
          <SectionHeader 
            eyebrow="Patron Impressions"
            title="Loved by Our Customers"
            subtitle="Verified reflections from patrons celebrating auspicious moments draped in MUETY silk."
            centered={true}
          />

          {/* Desktop Multi-Card Carousel (Libas 4-card grid layout with arrows) */}
          <div className="reviews-carousel-desktop" style={{
            position: 'relative',
            marginTop: '2rem',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem'
          }}>
            {/* Left Chevron Button */}
            <button
              type="button"
              onClick={() => setActiveReviewIdx((prev) => (prev === 0 ? displayReviews.length - 1 : prev - 1))}
              aria-label="Previous Reviews"
              className="review-nav-btn"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--brand-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <ChevronLeft size={22} />
            </button>

            {/* 4 Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.25rem',
              flex: 1
            }}>
              {[0, 1, 2, 3].map((offset) => {
                const item = displayReviews[(activeReviewIdx + offset) % displayReviews.length];
                if (!item) return null;
                return (
                  <div 
                    key={`${item.id || offset}-${offset}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    {/* Quote Headline */}
                    <div style={{
                      minHeight: '52px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px',
                      padding: '0 6px'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--brand-primary)',
                        lineHeight: 1.4,
                        fontFamily: 'var(--font-heading)'
                      }}>
                        &ldquo;{item.quote || item.title || item.comment}&rdquo;
                      </p>
                    </div>

                    {/* Polaroid Card */}
                    <div 
                      className="review-polaroid-frame"
                      style={{
                        backgroundColor: '#ffffff',
                        padding: '10px 10px 16px',
                        borderRadius: '6px',
                        boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.12)',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'transform 0.25s ease'
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '240px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        backgroundColor: '#0f172a'
                      }}>
                        <img 
                          src={item.photoUrl || (
                            offset === 0 ? '/saree_model_individual.jpg' :
                            offset === 1 ? '/saree_model_drape.jpg' :
                            offset === 2 ? '/saree_fabric_detail.jpg' :
                            '/saree_model_individual.jpg'
                          )}
                          alt={`Patron draped in ${item.productName || 'MUETY pure silk'}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center top'
                          }}
                          loading="lazy"
                        />
                      </div>

                      {/* Under Photo */}
                      <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '2px', marginBottom: '4px' }}>
                          {[...Array(5)].map((_, sIdx) => (
                            <Star 
                              key={sIdx} 
                              size={13} 
                              fill={sIdx < (item.rating || 5) ? '#f59e0b' : '#e2e8f0'} 
                              color={sIdx < (item.rating || 5) ? '#f59e0b' : '#e2e8f0'} 
                            />
                          ))}
                        </div>

                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--brand-primary)' }}>
                          _{item.authorName}
                        </strong>

                        <span style={{ fontSize: '0.72rem', color: 'var(--brand-muted)', display: 'block', marginTop: '2px' }}>
                          {item.authorLocation || 'India'}
                        </span>

                        {item.verifiedPurchase && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            color: '#15803d',
                            backgroundColor: '#dcfce7',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            marginTop: '4px'
                          }}>
                            <CheckCircle2 size={10} /> Verified Patron
                          </span>
                        )}

                        {item.productName && (
                          <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--brand-muted)' }}>
                            {item.productId ? (
                              <Link to={`/products/${item.productId}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                                {item.productName}
                              </Link>
                            ) : (
                              <span>{item.productName}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Chevron Button */}
            <button
              type="button"
              onClick={() => setActiveReviewIdx((prev) => (prev === displayReviews.length - 1 ? 0 : prev + 1))}
              aria-label="Next Reviews"
              className="review-nav-btn"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--brand-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Mobile Single Card Carousel (< 1024px) */}
          <div className="reviews-carousel-mobile" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '1.25rem'
          }}>
            {/* Active Review Testimonial Quote */}
            <div style={{
              margin: '0 auto 1rem',
              maxWidth: '640px',
              padding: '0 1rem'
            }}>
              <p style={{
                fontSize: 'clamp(1.05rem, 2.5vw, 1.35rem)',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                fontFamily: 'var(--font-heading)',
                lineHeight: 1.45,
                margin: '0 0 0.5rem',
                letterSpacing: '-0.01em'
              }}>
                &ldquo;{displayReviews[activeReviewIdx]?.quote || displayReviews[activeReviewIdx]?.comment}&rdquo;
              </p>
              <div style={{ display: 'inline-flex', gap: '3px', margin: '4px 0 10px' }}>
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={16} 
                    fill={i < (displayReviews[activeReviewIdx]?.rating || 5) ? '#f59e0b' : '#e2e8f0'} 
                    color={i < (displayReviews[activeReviewIdx]?.rating || 5) ? '#f59e0b' : '#e2e8f0'} 
                  />
                ))}
              </div>
            </div>

            {/* Mobile Controls + Single Polaroid Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(0.5rem, 3vw, 2rem)',
              margin: '0 auto 1.25rem',
              width: '100%'
            }}>
              <button
                type="button"
                onClick={() => setActiveReviewIdx((prev) => (prev === 0 ? displayReviews.length - 1 : prev - 1))}
                aria-label="Previous Customer Review"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid var(--brand-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0
                }}
              >
                <ChevronLeft size={22} />
              </button>

              <div 
                className="review-polaroid-frame"
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px 12px 18px',
                  borderRadius: '8px',
                  boxShadow: '0 14px 34px -6px rgba(0, 0, 0, 0.16)',
                  border: '1px solid rgba(230, 231, 235, 0.8)',
                  maxWidth: '280px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '280px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  backgroundColor: '#0f172a'
                }}>
                  <img 
                    src={displayReviews[activeReviewIdx]?.photoUrl || (
                      activeReviewIdx === 0 ? '/saree_model_individual.jpg' :
                      activeReviewIdx === 1 ? '/saree_model_drape.jpg' :
                      '/saree_fabric_detail.jpg'
                    )}
                    alt={`Patron draped in ${displayReviews[activeReviewIdx]?.productName || 'MUETY pure silk'}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center top'
                    }}
                  />
                </div>

                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--brand-primary)' }}>
                    _{displayReviews[activeReviewIdx]?.authorName}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--brand-muted)', display: 'block', marginTop: '2px' }}>
                    {displayReviews[activeReviewIdx]?.authorLocation || 'Tamil Nadu, India'}
                  </span>
                  {displayReviews[activeReviewIdx]?.verifiedPurchase && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#15803d',
                      backgroundColor: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      marginTop: '6px'
                    }}>
                      <CheckCircle2 size={11} /> Verified Patron
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveReviewIdx((prev) => (prev === displayReviews.length - 1 ? 0 : prev + 1))}
                aria-label="Next Customer Review"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid var(--brand-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0
                }}
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {/* Carousel Indicators / Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '0.5rem' }}>
              {displayReviews.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveReviewIdx(idx)}
                  aria-label={`Go to review ${idx + 1}`}
                  style={{
                    width: activeReviewIdx === idx ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: activeReviewIdx === idx ? 'var(--brand-accent)' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @media (min-width: 1024px) {
            .reviews-carousel-desktop {
              display: flex !important;
            }
            .reviews-carousel-mobile {
              display: none !important;
            }
          }
          @media (max-width: 1023px) {
            .reviews-carousel-desktop {
              display: none !important;
            }
            .reviews-carousel-mobile {
              display: flex !important;
            }
          }
          .review-polaroid-frame:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.18);
          }
        `}</style>
      </section>

      {/* =========================================================================
          SECTION 13: NEWSLETTER OR CUSTOMER ENGAGEMENT SECTION
          ========================================================================= */}
      <section 
        className="section-padding newsletter-section"
        aria-label="Patron Circle Newsletter"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--brand-border)'
        }}
      >
        <div className="container">
          <div 
            className="join-circle-card"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--brand-border)',
              padding: 'clamp(2rem, 5vw, 3.5rem) 1.5rem',
              textAlign: 'center',
              maxWidth: '820px',
              margin: '0 auto'
            }}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-accent)', textTransform: 'uppercase' }}>
              BESPOKE COMMUNICATIONS
            </span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)', color: 'var(--brand-primary)', margin: '6px 0 0.5rem', fontWeight: 800 }}>
              Join the MUETY Patron Circle
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.88rem, 1.8vw, 1rem)', maxWidth: '560px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              Receive privileged previews of limited pit-loom releases, private bridal drape consultations, and invitations to our Salem handloom exhibitions.
            </p>

            {isAuthenticated ? (
              <div 
                className="patron-member-card"
                style={{
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem 2rem',
                border: '1px solid var(--brand-border)',
                maxWidth: '520px',
                margin: '0 auto',
                boxShadow: 'var(--shadow-sm)',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#15803d',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  marginBottom: '10px'
                }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span>Verified Patron Circle Member</span>
                </div>
                <h3 style={{ color: 'var(--brand-primary)', fontSize: '1.15rem', margin: '4px 0 6px', fontWeight: 700 }}>
                  Welcome back, {user?.displayName || 'Patron'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  {user?.email} • Client Tier: <strong style={{ color: 'var(--brand-accent)' }}>MUETY Atelier Club</strong>
                </p>
                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Link to="/account" className="btn btn-primary btn-sm">
                    Access Patron Portal
                  </Link>
                  <Link to="/products" className="btn btn-outline btn-sm">
                    Explore Sarees
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                {/* 1. Google Sign-In Primary Action */}
                <button 
                  type="button"
                  onClick={handleGoogleJoin}
                  disabled={isAuthSubmitting}
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--brand-border)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '0.94rem',
                    color: 'var(--brand-primary)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1.25rem',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{isAuthSubmitting ? 'Connecting with Google...' : 'Join Circle with Google'}</span>
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: 'var(--brand-muted)' }}>
                  <div style={{ flex: 1, borderBottom: '1px solid var(--brand-border)' }} />
                  <span style={{ fontSize: '0.78rem', padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    or join via email invitation
                  </span>
                  <div style={{ flex: 1, borderBottom: '1px solid var(--brand-border)' }} />
                </div>

                {/* 2. Email Form */}
                <form 
                  onSubmit={handleNewsletterSubmit}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    width: '100%',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}
                >
                  <input 
                    type="email" 
                    value={newsletterEmail} 
                    onChange={(e) => setNewsletterEmail(e.target.value)} 
                    placeholder="Enter your email address..." 
                    required 
                    style={{
                      flex: '1 1 260px',
                      padding: '11px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--brand-border)',
                      fontSize: '0.92rem',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      minWidth: '220px'
                    }}
                    aria-label="Email address for Patron Circle"
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ flexShrink: 0, padding: '11px 22px', fontWeight: 700 }}
                  >
                    <Send size={15} />
                    <span>Join Circle</span>
                  </button>
                </form>

                {/* 3. Mandatory Initially Unchecked Terms & Conditions and Privacy Policy Consent */}
                <div style={{
                  marginTop: '1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}>
                  <input 
                    type="checkbox"
                    id="patron-circle-consent"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--brand-accent)' }}
                  />
                  <label htmlFor="patron-circle-consent" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, cursor: 'pointer' }}>
                    I have read and accept MUETY's{' '}
                    <Link to="/terms-conditions" target="_blank" style={{ color: 'var(--brand-accent)', textDecoration: 'underline', fontWeight: 600 }}>
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy-policy" target="_blank" style={{ color: 'var(--brand-accent)', textDecoration: 'underline', fontWeight: 600 }}>
                      Privacy Policy
                    </Link>.
                  </label>
                </div>

                {/* 4. Link to existing sign-in for returning patrons */}
                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--brand-muted)', margin: 0 }}>
                    Already have a MUETY account?{' '}
                    <Link to="/login" style={{ color: 'var(--brand-accent)', fontWeight: 700, textDecoration: 'none' }}>
                      Sign In Here
                    </Link>
                  </p>
                </div>
              </div>
            )}
            <p style={{ fontSize: '0.74rem', color: 'var(--brand-muted)', marginTop: '1rem', marginBottom: 0 }}>
              We value your discretion. Unsubscribe at any time with one click.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 14: CONCIERGE SUPPORT AND FOOTER LEAD-IN
          ========================================================================= */}
      <section 
        className="editorial-concierge-section section-padding"
        aria-label="Concierge Support and Patron Care"
        style={{
          backgroundColor: '#10172a',
          color: '#ffffff',
          position: 'relative'
        }}
      >
        <div className="container">
          <div className="concierge-card-wrapper">
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-accent)', textTransform: 'uppercase' }}>
                PATRON CARE &amp; CONSULTATION
              </span>
              <h2 style={{ color: '#ffffff', fontSize: 'clamp(1.35rem, 3.5vw, 2.1rem)', margin: '4px 0 0.75rem', fontWeight: 700, lineHeight: 1.25 }}>
                MUETY Atelier Concierge
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 'clamp(0.85rem, 2vw, 0.92rem)', lineHeight: 1.6, margin: 0 }}>
                Need personalized bridal styling advice, zari purity details, blouse matching guidance, or a live high-definition video inspection before dispatch? Our Salem handloom curators are at your service.
              </p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255, 255, 255, 0.05)', padding: '5px 11px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Clock size={14} color="var(--brand-accent)" /> Mon – Sat: 10 AM – 8 PM IST
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255, 255, 255, 0.05)', padding: '5px 11px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Truck size={14} color="var(--brand-accent)" /> ₹89 Flat Delivery
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <a
                href="https://wa.me/919385791540?text=Hello%20MUETY%20Concierge,%20I%20would%20like%20a%20live%20saree%20video%20preview%20and%20styling%20consultation."
                target="_blank"
                rel="noreferrer"
                className="btn btn-accent concierge-action-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.85rem 1.25rem',
                  fontSize: 'clamp(0.88rem, 2.5vw, 0.95rem)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <MessageCircle size={18} />
                <span>WhatsApp Live Drape Preview</span>
              </a>

              <div className="concierge-sub-actions">
                <a
                  href="tel:+919385791540"
                  className="btn btn-outline-gold concierge-action-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    padding: '0.7rem 0.85rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    width: '100%',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Phone size={14} />
                  <span>+91 93857 91540</span>
                </a>

                <a
                  href="mailto:support@muety.in"
                  className="btn btn-outline-gold concierge-action-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    padding: '0.7rem 0.85rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    width: '100%',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Mail size={14} />
                  <span>support@muety.in</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick View Modal for Instant Product Inspection */}
      <QuickViewModal 
        product={quickViewProduct} 
        onClose={() => setQuickViewProduct(null)} 
      />

      <style>{`
        .concierge-card-wrapper {
          background: linear-gradient(145deg, #070a12 0%, #0d1424 100%);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(201, 162, 39, 0.35);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          padding: clamp(1.25rem, 3.5vw, 2.75rem);
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 2rem;
          align-items: center;
        }

        .concierge-sub-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 860px) {
          .concierge-card-wrapper {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        @media (max-width: 540px) {
          .concierge-card-wrapper {
            padding: 1.25rem 1rem;
          }
          .concierge-sub-actions {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        /* =========================================================================
           Trending Circular Category Showcase: Editorial Luxury Pavilion System
           ========================================================================= */
        .trending-gallery-stage {
          position: relative;
          margin-top: 1.75rem;
          background: linear-gradient(180deg, #ffffff 0%, rgba(255, 252, 247, 0.98) 60%, rgba(250, 244, 232, 0.92) 100%);
          border: 1px solid rgba(212, 175, 55, 0.32);
          border-radius: 28px;
          padding: clamp(1.75rem, 3.5vw, 3rem) clamp(1rem, 2.5vw, 2.5rem);
          box-shadow: 0 16px 45px rgba(42, 8, 19, 0.04), 0 2px 14px rgba(212, 175, 55, 0.08);
        }

        .trending-stage-header {
          display: flex;
          justifyContent: center;
          margin-bottom: clamp(1.25rem, 2vw, 2.25rem);
        }

        .trending-stage-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 6px 18px;
          border-radius: 9999px;
          background: rgba(212, 175, 55, 0.08);
          border: 1px solid rgba(212, 175, 55, 0.3);
          font-size: clamp(0.72rem, 0.9vw, 0.8rem);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--brand-primary, #2a0813);
          font-weight: 700;
        }

        .circular-categories-carousel {
          display: flex;
          gap: clamp(2rem, 5vw, 4.5rem);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0.5rem 0.5rem 1.25rem;
          scrollbar-width: none;
          align-items: stretch;
          flex-wrap: nowrap;
          scroll-behavior: smooth;
        }

        .circular-categories-carousel::-webkit-scrollbar {
          display: none;
        }

        .trending-circle-card {
          width: clamp(170px, 20vw, 260px);
          max-width: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          text-decoration: none;
          flex-shrink: 0;
          padding: clamp(0.75rem, 1.2vw, 1.25rem) clamp(0.5rem, 0.8vw, 1rem);
          border-radius: 22px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          background: transparent;
          cursor: pointer;
        }

        .trending-circle-card:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 16px 36px rgba(42, 8, 19, 0.06), 0 0 0 1px rgba(212, 175, 55, 0.3);
        }

        /* Sculpted Dual-Ring Gold Bezel Medallion (Enlarged for Desktop) */
        .category-circle-frame {
          width: clamp(140px, 17vw, 220px);
          height: clamp(140px, 17vw, 220px);
          border-radius: 50%;
          padding: 5px;
          background: linear-gradient(135deg, #f3d078 0%, #d4af37 40%, #a17724 75%, #f6e29d 100%);
          box-shadow: 0 12px 30px rgba(212, 175, 55, 0.32), 0 4px 12px rgba(42, 8, 19, 0.08);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
          position: relative;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .circle-inner-bezel {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          background: #ffffff;
          border: 3.5px solid #ffffff;
          box-sizing: border-box;
        }

        .circle-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          display: block;
        }

        .trending-circle-card:hover .category-circle-frame {
          transform: scale(1.05);
          box-shadow: 0 20px 45px rgba(212, 175, 55, 0.48), 0 0 0 4px rgba(212, 175, 55, 0.28);
        }

        .trending-circle-card:hover .circle-avatar-img {
          transform: scale(1.1);
        }

        /* Editorial Category Metadata */
        .trending-cat-meta {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-top: 1.1rem;
          width: 100%;
          gap: 8px;
        }

        .trending-cat-title {
          font-family: var(--font-heading, 'Playfair Display', serif);
          font-size: clamp(1.08rem, 1.35vw, 1.35rem);
          font-weight: 700;
          color: var(--brand-primary, #2a0813);
          letter-spacing: 0.03em;
          text-transform: uppercase;
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.25s ease;
        }

        .trending-circle-card:hover .trending-cat-title {
          color: var(--brand-accent, #b45309);
        }

        .trending-cat-desc {
          font-size: clamp(0.78rem, 0.92vw, 0.86rem);
          color: var(--brand-muted, #64748b);
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          max-width: 90%;
        }

        .trending-cat-badge {
          display: inline-block;
          font-size: clamp(0.66rem, 0.78vw, 0.72rem);
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #991b1b;
          background-color: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 9999px;
          padding: 4px 14px;
          box-shadow: 0 2px 6px rgba(185, 28, 28, 0.08);
          white-space: nowrap;
          margin-top: 2px;
        }

        .trending-cat-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: clamp(0.76rem, 0.88vw, 0.82rem);
          font-weight: 600;
          color: var(--brand-accent, #d4af37);
          letter-spacing: 0.04em;
          margin-top: 4px;
          transition: all 0.25s ease;
        }

        .trending-cta-arrow {
          transition: transform 0.25s ease;
        }

        .trending-circle-card:hover .trending-cat-cta {
          color: #b45309;
        }

        .trending-circle-card:hover .trending-cta-arrow {
          transform: translateX(4px);
        }

        /* Desktop Nav Arrows */
        .trending-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #ffffff;
          border: 1.5px solid rgba(212, 175, 55, 0.4);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--brand-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .trending-nav-left {
          left: -16px;
        }

        .trending-nav-right {
          right: -16px;
        }

        .trending-nav-arrow:hover {
          background: var(--brand-accent, #d4af37);
          color: #ffffff;
          border-color: var(--brand-accent, #d4af37);
          transform: translateY(-50%) scale(1.08);
        }

        @media (max-width: 768px) {
          .trending-gallery-stage {
            padding: 1.5rem 0.75rem 1.75rem;
            border-radius: 20px;
            margin-top: 1.25rem;
          }
          .trending-stage-badge {
            font-size: 0.7rem;
            padding: 4px 12px;
          }
          .trending-circle-card {
            width: clamp(130px, 34vw, 175px);
            padding: 0.5rem 0.25rem;
          }
          .category-circle-frame {
            width: clamp(118px, 30vw, 150px);
            height: clamp(118px, 30vw, 150px);
            padding: 3.5px;
          }
          .trending-cat-desc {
            display: none;
          }
          .trending-cat-cta {
            font-size: 0.75rem;
          }
          .trending-nav-arrow {
            display: none !important;
          }
          .trending-cat-title {
            min-height: auto;
          }
        }

        /* =========================================================================
           Single-Row Product Scrolling Display Architecture (Admin Authority)
           ========================================================================= */
        .product-row-showcase {
          position: relative;
          width: 100%;
        }

        .products-carousel-track {
          display: flex;
          gap: 1.15rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
          padding: 0.5rem 0.25rem 1.25rem;
        }

        .products-carousel-track::-webkit-scrollbar {
          display: none;
        }

        .product-scroll-item {
          flex: 0 0 clamp(200px, 19vw, 240px);
          max-width: 240px;
          scroll-snap-align: start;
        }

        .product-nav-arrow {
          position: absolute;
          top: 45%;
          transform: translateY(-50%);
          z-index: 10;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ffffff;
          border: 1.5px solid var(--brand-border, #e2e8f0);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--brand-primary, #0f172a);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .product-nav-left {
          left: -16px;
        }

        .product-nav-right {
          right: -16px;
        }

        .product-nav-arrow:hover {
          background: var(--brand-primary, #2a0813);
          color: #ffffff;
          border-color: var(--brand-primary, #2a0813);
          transform: translateY(-50%) scale(1.08);
        }

        @media (max-width: 768px) {
          .product-nav-arrow {
            display: none !important;
          }
          .product-scroll-item {
            flex: 0 0 clamp(165px, 44vw, 205px);
            max-width: 205px;
          }
        }
      `}</style>
    </div>
  );
};
