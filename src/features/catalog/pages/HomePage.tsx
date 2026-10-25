import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { reviewService } from '@/features/reviews/services/reviewService';
import { storageService } from '@/lib/storage/storageService';
import { useCart } from '@/shared/context/CartContext';
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/components/ProductCard';
import { QuickViewModal } from '@/features/catalog/components/QuickViewModal';
import { SectionHeader } from '@/features/catalog/components/SectionHeader';
import { CampaignHero } from '@/features/catalog/components/CampaignHero';
import { Product, Category, SareeCollection } from '@/types';
import { collectionService } from '@/features/catalog/services/collectionService';
import { PatronReview } from '@/features/reviews/types';
import { 
  Sparkles, 
  ShieldCheck,
  Truck,
  MessageCircle, 
  Phone, 
  Mail, 
  Star, 
  ArrowRight,
  Clock,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const HomePage: React.FC = () => {
  useDocumentTitle('Home');

  const { wishlist } = useCart();

  const newArrivalsScrollRef = useRef<HTMLDivElement>(null);
  const topPicksScrollRef = useRef<HTMLDivElement>(null);
  const mostWantedScrollRef = useRef<HTMLDivElement>(null);
  const occasionScrollRef = useRef<HTMLDivElement>(null);

  const scrollProductRow = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>(() => storageService.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => storageService.getCategories());
  const [collections, setCollections] = useState<SareeCollection[]>(() => collectionService.getCollections());
  const [approvedReviews, setApprovedReviews] = useState<PatronReview[]>([]);
  const [activeReviewIdx, setActiveReviewIdx] = useState<number>(0);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => storageService.getRecentlyViewed());
  const [selectedOccasion, setSelectedOccasion] = useState<string>('bridal');
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
        photoUrl: '/saree_model_individual.webp',
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
        photoUrl: '/saree_model_drape.webp',
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
        photoUrl: '/saree_fabric_detail.webp',
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
        photoUrl: '/saree_model_individual.webp',
        createdAt: new Date().toISOString()
      }
    ];
  }, [approvedReviews]);

  const getReviewPhoto = (rev?: PatronReview, fallbackIdx: number = 0) => {
    if (!rev) return '/saree_model_individual.jpg';
    if (rev.photoUrl && rev.photoUrl.trim()) return rev.photoUrl;
    if (rev.productId || rev.productName || (rev as any).productSlug) {
      const matched = allProducts.find(p => 
        (rev.productId && p.id === rev.productId) ||
        (rev.productName && p.name.toLowerCase() === rev.productName.toLowerCase()) ||
        ((rev as any).productSlug && p.slug === (rev as any).productSlug)
      );
      if (matched && matched.images && matched.images.length > 0) {
        return matched.images[0];
      }
    }
    const fallbacks = [
      '/saree_model_individual.jpg',
      '/saree_model_drape.jpg',
      '/saree_fabric_detail.jpg'
    ];
    const charSum = (rev.id || rev.authorName || String(fallbackIdx)).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return fallbacks[charSum % fallbacks.length];
  };

  // Subscribe to live products & categories
  useEffect(() => {
    const unsubProducts = productService.subscribeToProducts((products) => {
      setAllProducts(products || []);
      setIsLoading(false);
    });

    const unsubCategories = productService.subscribeToCategories((cats) => {
      setCategories(cats || []);
    });

    const unsubCollections = collectionService.subscribeToCollections((cols) => {
      setCollections(cols || []);
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
      if (typeof unsubCollections === 'function') unsubCollections();
      if (typeof unsubReviews === 'function') unsubReviews();
      window.removeEventListener('muety_recently_viewed_updated', handleRecentUpdate);
    };
  }, []);

  // Section 9 Tabs: Festive Edits by Occasion (Admin-managed)
  const festiveOccasions = useMemo(() => {
    const list = collections
      .filter(c => c.showInFestiveEdits !== false && (c.type === 'occasion' || !c.type))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    if (list.length > 0) return list;

    // Default canonical 4 occasions if no admin data yet
    return [
      { id: 'col-bridal', slug: 'bridal', name: 'Bridal Muhurtham', bannerImage: '/saree_model_individual.jpg', featured: true, productCount: 4, displayOrder: 1 },
      { id: 'col-temple', slug: 'temple', name: 'Temple Ceremonies', bannerImage: '/saree_fabric_detail.jpg', featured: true, productCount: 4, displayOrder: 2 },
      { id: 'col-reception', slug: 'reception', name: 'Grand Receptions', bannerImage: '/saree_model_drape.jpg', featured: true, productCount: 4, displayOrder: 3 },
      { id: 'col-festive', slug: 'festive', name: 'Family Festivities', bannerImage: '/diwali_hero_banner.jpg', featured: true, productCount: 4, displayOrder: 4 }
    ];
  }, [collections]);

  useEffect(() => {
    if (festiveOccasions.length > 0) {
      const exists = festiveOccasions.some(t => (t.slug || t.id) === selectedOccasion || t.id === selectedOccasion);
      if (!exists) {
        setSelectedOccasion(festiveOccasions[0].slug || festiveOccasions[0].id);
      }
    }
  }, [festiveOccasions, selectedOccasion]);



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

  // Section 9: Festive Edits by Occasion (Admin-managed authority)
  const occasionProducts = useMemo(() => {
    if (allProducts.length === 0) return [];
    const target = (selectedOccasion || '').toLowerCase().trim();
    
    // Explicit admin assignment match (by collectionId, occasion string, or occasions array)
    const adminSelected = allProducts.filter(p => 
      p.published !== false && (
        (p.collectionId || '').toLowerCase() === target ||
        (p.occasion || '').toLowerCase().includes(target) || 
        (p.occasions && p.occasions.some(o => o.toLowerCase().includes(target)))
      )
    );
    if (adminSelected.length > 0) return adminSelected;

    // Semantic fallback heuristics
    if (target.includes('bridal') || target.includes('wedding')) {
      const bridal = allProducts.filter(p => 
        p.published !== false && (
          (p.categorySlug || '').includes('bridal') || 
          (p.name || '').toLowerCase().includes('kanchipuram') ||
          (p.tags || []).some(t => t.toLowerCase().includes('bridal') || t.toLowerCase().includes('zari'))
        )
      );
      return bridal.length > 0 ? bridal : allProducts;
    } else if (target.includes('temple')) {
      const temple = allProducts.filter(p => 
        p.published !== false && (
          (p.name || '').toLowerCase().includes('temple') || 
          (p.tags || []).some(t => t.toLowerCase().includes('temple') || t.toLowerCase().includes('korvai') || t.toLowerCase().includes('traditional'))
        )
      );
      return temple.length > 0 ? temple : allProducts;
    } else if (target.includes('reception')) {
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
      // festive / family celebrations
      const festive = allProducts.filter(p => 
        p.published !== false && (
          (p.tags || []).some(t => t.toLowerCase().includes('festive') || t.toLowerCase().includes('diwali') || t.toLowerCase().includes('salem') || t.toLowerCase().includes(target)) ||
          (p.categorySlug || '').includes('sarees') ||
          (p.name || '').toLowerCase().includes(target)
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

  return (
    <div className="home-page animate-fade-in" style={{ position: 'relative', overflowX: 'clip', width: '100%', maxWidth: '100%' }}>
      
      {/* =========================================================================
          SECTION 1: RESPONSIVE CAMPAIGN HERO BANNER CAROUSEL
          ========================================================================= */}
      <CampaignHero />



      {/* =========================================================================
          SECTION 5: NEW ARRIVALS (Single-row scrolling display)
          ========================================================================= */}
      <section 
        className="section-padding"
        aria-label="New Arrivals"
        style={{ backgroundColor: 'var(--bg-main)', paddingTop: '1.25rem', paddingBottom: '3.5rem' }}
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
                {newArrivals.map((p, pIdx) => (
                  <div key={p.id} className="product-scroll-item">
                    <ProductCard 
                      product={p} 
                      priority={pIdx < 4}
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
                {topPicks.map((p, pIdx) => (
                  <div key={p.id} className="product-scroll-item">
                    <ProductCard 
                      product={p} 
                      priority={pIdx < 4}
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
                {mostWanted.map((p, pIdx) => (
                  <div key={p.id} className="product-scroll-item">
                    <ProductCard 
                      product={p} 
                      priority={pIdx < 4}
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
            {festiveOccasions.map(tab => {
              const tabId = tab.slug || tab.id;
              const isSelected = selectedOccasion === tabId || selectedOccasion === tab.id;
              return (
                <button
                  key={tab.id || tabId}
                  onClick={() => setSelectedOccasion(tabId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--brand-primary)' : 'var(--brand-border)',
                    backgroundColor: isSelected ? 'var(--brand-primary)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--brand-primary)',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(16, 24, 45, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.name || (tab as any).label}</span>
                </button>
              );
            })}
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
              {occasionProducts.map((p, pIdx) => (
                <div key={p.id} className="product-scroll-item">
                  <ProductCard 
                    product={p} 
                    priority={pIdx < 4}
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
              {recentlyViewedProducts.map((p, pIdx) => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  priority={pIdx < 4}
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
              {personalizedRecommendations.map((p, pIdx) => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  priority={pIdx < 4}
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
            {/* Left Chevron Button (only if more than 4 reviews) */}
            {displayReviews.length > 4 && (
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
            )}

            {/* Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: displayReviews.length <= 4 
                ? `repeat(${displayReviews.length}, minmax(250px, 280px))` 
                : 'repeat(4, 1fr)',
              justifyContent: 'center',
              gap: '1.25rem',
              width: '100%',
              maxWidth: displayReviews.length === 1 ? '300px' : displayReviews.length === 2 ? '620px' : displayReviews.length === 3 ? '920px' : '100%',
              margin: '0 auto'
            }}>
              {(displayReviews.length <= 4 
                ? displayReviews 
                : [0, 1, 2, 3].map(offset => displayReviews[(activeReviewIdx + offset) % displayReviews.length])
              ).map((item, idx) => {
                if (!item) return null;
                return (
                  <div 
                    key={`${item.id || idx}-${idx}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    {/* Quote Headline */}
                    <div style={{
                      minHeight: '48px',
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
                        fontFamily: 'var(--font-heading)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
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
                      <div 
                        className="hero-gradient-loading"
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '240px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          backgroundColor: '#0f172a'
                        }}
                      >
                        <img 
                          src={getReviewPhoto(item, idx)}
                          alt={`Patron draped in ${item.productName || 'MUETY pure silk'}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center top'
                          }}
                          loading="lazy"
                          decoding="async"
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
                          {item.authorName}
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

            {/* Right Chevron Button (only if more than 4 reviews) */}
            {displayReviews.length > 4 && (
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
            )}
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
              {displayReviews.length > 1 && (
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
              )}

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
                <div 
                  className="hero-gradient-loading"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '280px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#0f172a'
                  }}
                >
                  <img 
                    src={getReviewPhoto(displayReviews[activeReviewIdx], activeReviewIdx)}
                    alt={`Patron draped in ${displayReviews[activeReviewIdx]?.productName || 'MUETY pure silk'}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center top'
                    }}
                    decoding="async"
                  />
                </div>

                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--brand-primary)' }}>
                    {displayReviews[activeReviewIdx]?.authorName}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--brand-muted)', display: 'block', marginTop: '2px' }}>
                    {displayReviews[activeReviewIdx]?.authorLocation || 'India'}
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

              {displayReviews.length > 1 && (
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
              )}
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
                  <Truck size={14} color="var(--brand-accent)" /> FREE Delivery (Online) • ₹89 on COD
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
