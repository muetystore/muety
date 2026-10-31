import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, ChevronLeft, ChevronRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { PatronReview } from '@/features/reviews/types';
import { reviewService } from '@/features/reviews/services/reviewService';

export const CustomerReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<PatronReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    // Load initial featured reviews
    const loadReviews = () => {
      const feat = reviewService.getFeaturedReviews();
      setReviews(feat);
    };

    loadReviews();

    // Listen for storage/admin changes
    const handleUpdate = () => {
      loadReviews();
    };

    window.addEventListener('muety_reviews_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Subscribe if supported
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = reviewService.subscribeToApprovedReviews((all: PatronReview[]) => {
        const feat = all
          .filter((r: PatronReview) => Boolean(r.isFeatured))
          .sort((a: PatronReview, b: PatronReview) => (a.displayOrder || 999) - (b.displayOrder || 999));
        setReviews(feat);
      });
    } catch {}

    return () => {
      window.removeEventListener('muety_reviews_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const totalReviews = reviews.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalReviews - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === totalReviews - 1 ? 0 : prev + 1));
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Libas-inspired tilt angles for polaroid effect
  const tiltAngles = ['-1.5deg', '1.2deg', '-1.8deg', '1.5deg'];

  return (
    <section 
      className="reviews-section-redesign" 
      aria-label="Customer Reviews"
      style={{
        padding: 'clamp(2.5rem, 5vw, 4.5rem) 1rem',
        backgroundColor: '#faf7f5',
        borderTop: '1px solid rgba(201, 162, 39, 0.15)',
        borderBottom: '1px solid rgba(201, 162, 39, 0.15)',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div 
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          position: 'relative',
          padding: '0 8px'
        }}
      >
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
          <span 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--brand-accent)',
              marginBottom: '6px'
            }}
          >
            <ShieldCheck size={14} /> AUTHENTIC PATRON STORIES
          </span>
          <h2 
            style={{
              fontSize: 'clamp(1.5rem, 3.2vw, 2.3rem)',
              fontFamily: 'var(--font-heading, "Playfair Display", serif)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#2a0813',
              margin: '0 0 8px',
              textTransform: 'uppercase'
            }}
          >
            Loved by Our Customers
          </h2>
          <p 
            style={{
              color: '#64748b',
              fontSize: '0.88rem',
              maxWidth: '560px',
              margin: '0 auto'
            }}
          >
            Real patrons wearing handcrafted MUETY Salem silks for auspicious weddings, temple festivals, and family celebrations.
          </p>
        </div>

        {/* Carousel Container */}
        <div 
          style={{ position: 'relative', width: '100%' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Previous Arrow Button */}
          {totalReviews > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous review"
              style={{
                position: 'absolute',
                left: '-12px',
                top: '46%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(201, 162, 39, 0.4)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#2a0813',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--brand-accent)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#2a0813';
              }}
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Reviews Grid / Carousel Track */}
          <div className="reviews-cards-viewport">
            {/* Desktop: 4 cards visible (sliced or cycled from currentIndex) */}
            <div className="reviews-cards-grid">
              {Array.from({ length: Math.min(4, totalReviews) }).map((_, offset) => {
                const itemIndex = (currentIndex + offset) % totalReviews;
                const review = reviews[itemIndex];
                if (!review) return null;
                const tilt = tiltAngles[offset % tiltAngles.length];

                return (
                  <div
                    key={`${review.id}-${itemIndex}`}
                    className="review-card-item"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '0 8px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Top Quote Text */}
                    <div 
                      style={{
                        minHeight: '68px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        padding: '0 4px'
                      }}
                    >
                      <p 
                        style={{
                          fontSize: '0.84rem',
                          lineHeight: 1.45,
                          fontWeight: 500,
                          color: '#1e293b',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        "{review.quote}"
                      </p>
                    </div>

                    {/* Polaroid-style Customer Photo Frame */}
                    <div 
                      className="review-photo-polaroid"
                      style={{
                        width: '100%',
                        maxWidth: '220px',
                        aspectRatio: '3/4',
                        backgroundColor: '#ffffff',
                        padding: '8px 8px 18px',
                        borderRadius: '3px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0,0,0,0.04)',
                        transform: `rotate(${tilt})`,
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                        marginBottom: '1.25rem',
                        border: '1px solid rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        overflow: 'hidden'
                      }}
                    >
                      <div 
                        style={{
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '2px',
                          position: 'relative'
                        }}
                      >
                        <img 
                          src={review.photoUrl || '/saree_model_individual.jpg'} 
                          alt={`Patron ${review.authorName}`}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            transition: 'transform 0.4s ease'
                          }}
                          onError={(e) => {
                            // Graceful fallback to verified model portrait
                            (e.target as HTMLImageElement).src = '/saree_model_individual.jpg';
                          }}
                        />
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        color: '#d97706',
                        marginBottom: '6px'
                      }}
                    >
                      {Array.from({ length: 5 }).map((_, starI) => (
                        <Star 
                          key={starI} 
                          size={13} 
                          fill={starI < (review.rating || 5) ? '#d97706' : 'none'} 
                          stroke="#d97706" 
                        />
                      ))}
                    </div>

                    {/* Customer Attribution */}
                    <div style={{ marginBottom: '4px' }}>
                      <span 
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#2a0813',
                          letterSpacing: '0.02em'
                        }}
                      >
                        {review.authorName}
                      </span>
                    </div>

                    {/* Location & Verified Badge */}
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        marginBottom: '8px'
                      }}
                    >
                      <span>{review.authorLocation || 'Muety Atelier Patron'}</span>
                      {review.verifiedPurchase && (
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            color: '#16a34a',
                            fontWeight: 600,
                            fontSize: '0.68rem'
                          }}
                          title="Verified Purchase via Order Record"
                        >
                          • <CheckCircle size={10} /> Verified
                        </span>
                      )}
                    </div>

                    {/* Associated Product Link */}
                    {review.productName && (
                      <Link
                        to={review.productSlug ? `/product/${review.productSlug}` : review.productId ? `/product/${review.productId}` : '/products'}
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--brand-accent)',
                          fontWeight: 600,
                          textDecoration: 'none',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {review.productName} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Arrow Button */}
          {totalReviews > 1 && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next review"
              style={{
                position: 'absolute',
                right: '-12px',
                top: '46%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(201, 162, 39, 0.4)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#2a0813',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--brand-accent)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#2a0813';
              }}
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>

        {/* Carousel Pagination Dots */}
        {totalReviews > 1 && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '1.75rem'
            }}
          >
            {Array.from({ length: totalReviews }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Go to review ${dotIdx + 1}`}
                style={{
                  width: dotIdx === currentIndex ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: dotIdx === currentIndex ? 'var(--brand-accent)' : '#cbd5e1',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .reviews-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          width: 100%;
        }

        @media (max-width: 1023px) and (min-width: 641px) {
          .reviews-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
          }
          /* Hide 3rd and 4th card on tablet */
          .reviews-cards-grid > .review-card-item:nth-child(n+3) {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .reviews-cards-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          /* Hide all except the 1st card on mobile */
          .reviews-cards-grid > .review-card-item:nth-child(n+2) {
            display: none !important;
          }
        }

        .review-photo-polaroid:hover {
          transform: rotate(0deg) scale(1.03) !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14) !important;
        }

        .review-photo-polaroid:hover img {
          transform: scale(1.04);
        }
      `}</style>
    </section>
  );
};
