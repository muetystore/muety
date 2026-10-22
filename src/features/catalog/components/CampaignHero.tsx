import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bannerService } from '@/features/banners/services/bannerService';

export interface BannerSlide {
  id: string;
  image: string;
  alt: string;
  link: string;
  objectPosition?: string;
}

export interface CampaignHeroProps {
  slides?: BannerSlide[];
  autoPlayInterval?: number;
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: 'diwali-hero',
    image: '/diwali_hero_banner.jpg',
    alt: 'MUETY Pure Mulberry Silk & Certified Gold Zari Sarees',
    link: '/products',
    objectPosition: 'center 35%'
  },
  {
    id: 'dasara-campaign',
    image: '/dasara_campaign_banner_with_text.jpg',
    alt: 'MUETY Dasara Festive Collection - Tradition Meets Elegance',
    link: '/products',
    objectPosition: 'center center'
  }
];

export const CampaignHero: React.FC<CampaignHeroProps> = ({
  slides: explicitSlides,
  autoPlayInterval = 5000
}) => {
  const [activeSlides, setActiveSlides] = useState<BannerSlide[]>(() => {
    if (explicitSlides && explicitSlides.length > 0) return explicitSlides;
    const dynamic = bannerService.getActiveBanners();
    return dynamic.length > 0 ? dynamic : DEFAULT_SLIDES;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  useEffect(() => {
    if (explicitSlides && explicitSlides.length > 0) {
      setActiveSlides(explicitSlides);
      return;
    }

    const unsub = bannerService.subscribeBanners((items) => {
      const active = items.filter(b => b.isActive);
      setActiveSlides(active.length > 0 ? active : DEFAULT_SLIDES);
    });

    return () => unsub();
  }, [explicitSlides]);

  const slides = activeSlides;
  const totalSlides = slides.length;

  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-scrolling interval with pause on hover/interaction
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [goToNext, isPaused, totalSlides, autoPlayInterval]);

  // Touch swipe handling for mobile and tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (diff > 45) {
      goToNext();
    } else if (diff < -45) {
      goToPrev();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  return (
    <section 
      className="editorial-campaign-hero"
      aria-label="Editorial Campaign Hero Banners"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        backgroundColor: '#070a12',
        color: '#ffffff',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none'
      }}
    >
      {/* Consistent, Unified Responsive Height Container for Both Slides */}
      <div className="campaign-hero-banner-container">
        {/* Horizontal Carousel Scrolling Track */}
        <div 
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'transform'
          }}
        >
          {slides.map((slide, idx) => (
            <div 
              key={slide.id || idx}
              className="hero-gradient-loading"
              style={{
                flex: '0 0 100%',
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#070a12',
                overflow: 'hidden'
              }}
            >
              <Link 
                to={slide.link} 
                aria-label={slide.alt}
                tabIndex={idx === currentIndex ? 0 : -1}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                <picture 
                  className="campaign-hero-picture"
                  style={{ display: 'block', width: '100%', height: '100%' }}
                >
                  <source media="(max-width: 640px)" srcSet={slide.image} />
                  <img 
                    src={slide.image} 
                    alt={slide.alt}
                    {...({ fetchpriority: idx === currentIndex || idx === 0 ? 'high' : 'auto' } as any)}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="campaign-hero-bg-img"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: slide.objectPosition || 'center center',
                      display: 'block'
                    }}
                  />
                </picture>
              </Link>
            </div>
          ))}
        </div>

        {/* Carousel Navigation Arrows */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                goToPrev();
              }}
              className="campaign-hero-nav-btn campaign-hero-nav-btn-prev"
              aria-label="Previous campaign banner"
            >
              <ChevronLeft className="campaign-hero-nav-icon" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                goToNext();
              }}
              className="campaign-hero-nav-btn campaign-hero-nav-btn-next"
              aria-label="Next campaign banner"
            >
              <ChevronRight className="campaign-hero-nav-icon" />
            </button>
          </>
        )}

        {/* Carousel Pagination Dots */}
        {totalSlides > 1 && (
          <div 
            className="campaign-hero-dots-container"
            role="tablist"
            aria-label="Campaign banner slides"
          >
            {slides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => goToSlide(idx)}
                  className={`campaign-hero-dot ${isActive ? 'active' : ''}`}
                />
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        /* Unified Perfect Heights Across Multiplatform Devices */
        .campaign-hero-banner-container {
          position: relative;
          width: 100%;
          height: 480px;
          overflow: hidden;
          background-color: #070a12;
        }

        @media (max-width: 1200px) {
          .campaign-hero-banner-container {
            height: 420px;
          }
        }

        @media (max-width: 960px) {
          .campaign-hero-banner-container {
            height: 350px;
          }
        }

        @media (max-width: 640px) {
          .campaign-hero-banner-container {
            height: 220px;
          }
        }

        @media (max-width: 380px) {
          .campaign-hero-banner-container {
            height: 195px;
          }
        }

        @media (max-width: 330px) {
          .campaign-hero-banner-container {
            height: 185px;
          }
        }

        /* Navigation Arrows */
        .campaign-hero-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background-color: rgba(9, 13, 22, 0.6);
          border: 1px solid rgba(212, 175, 55, 0.4);
          color: #d4af37;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          padding: 0;
        }

        .campaign-hero-nav-btn:hover {
          background-color: rgba(9, 13, 22, 0.9);
          border-color: #d4af37;
          transform: translateY(-50%) scale(1.08);
        }

        .campaign-hero-nav-btn-prev {
          left: 18px;
        }

        .campaign-hero-nav-btn-next {
          right: 18px;
        }

        .campaign-hero-nav-icon {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 640px) {
          .campaign-hero-nav-btn {
            width: 28px !important;
            height: 28px !important;
            background-color: rgba(9, 13, 22, 0.45) !important;
          }
          .campaign-hero-nav-btn-prev {
            left: 6px !important;
          }
          .campaign-hero-nav-btn-next {
            right: 6px !important;
          }
          .campaign-hero-nav-icon {
            width: 14px !important;
            height: 14px !important;
          }
        }

        /* Pagination Dots */
        .campaign-hero-dots-container {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 12px;
          background-color: rgba(9, 13, 22, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .campaign-hero-dot {
          width: 7px;
          height: 7px;
          border-radius: 4px;
          background-color: rgba(255, 255, 255, 0.4);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .campaign-hero-dot.active {
          width: 20px;
          background-color: #d4af37;
          box-shadow: 0 0 8px rgba(212, 175, 55, 0.7);
        }

        @media (max-width: 640px) {
          .campaign-hero-dots-container {
            bottom: 6px !important;
            padding: 3px 6px !important;
            gap: 4px !important;
          }
          .campaign-hero-dot {
            width: 5px !important;
            height: 5px !important;
          }
          .campaign-hero-dot.active {
            width: 15px !important;
          }
        }
      `}</style>
    </section>
  );
};
