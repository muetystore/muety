import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Cookie as CookieIcon, 
  SlidersHorizontal, 
  Check, 
  X, 
  ExternalLink,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { consentManager } from '../services/consentManager';
import { ConsentCategories, ConsentCategoryInfo } from '../types';
import { authService } from '@/features/auth/services/authService';

const CATEGORY_DETAILS: ConsentCategoryInfo[] = [
  {
    id: 'necessary',
    name: 'Strictly Necessary',
    required: true,
    summary: 'Essential store operations, authentication, basket, checkout & security.',
    details: 'These technologies are required to enable core functionality such as user authentication, shopping bag persistence, checkout order fulfillment, payment fraud prevention, and storing your consent preferences. The website cannot function properly without them.',
    examples: ['Firebase Authentication session', 'Shopping Bag (muety_cart_v1)', 'Razorpay transaction verification', 'Cookie consent record (muety_consent_v1)']
  },
  {
    id: 'preferences',
    name: 'Preferences',
    required: false,
    summary: 'Remembers nonessential settings and local browsing convenience.',
    details: 'These settings allow the website to remember nonessential choices you make, such as your recently viewed sarees list and local presentation preferences, providing a more personalized boutique experience.',
    examples: ['Recently viewed sarees (muety_recently_viewed_v1)', 'Presentation view modes']
  },
  {
    id: 'analytics',
    name: 'Analytics',
    required: false,
    summary: 'Measures website traffic, navigation paths & performance.',
    details: 'With your consent, analytics tools measure how visitors interact with our boutique, helping us diagnose performance issues, understand popular saree collections, and improve usability.',
    examples: ['Microsoft Clarity UX telemetry (anonymized)', 'Google Analytics / GTM measurement (anonymized metrics)']
  },
  {
    id: 'marketing',
    name: 'Marketing (Patron Circle)',
    required: false,
    summary: 'Advertising attribution, email campaigns & exclusive Patron Circle membership.',
    details: 'These cookies allow us to tailor boutique communications, deliver personalized atelier previews, and enroll opted-in patrons into the exclusive MUETY Patron Circle for bespoke email campaigns, private collection releases, and curated offers. Optional and disabled by default.',
    examples: ['MUETY Patron Circle email campaigns', 'Promotional campaign attribution', 'Ad conversion measurement']
  }
];

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Customization selection state (default optional categories to false)
  const [selectedChoices, setSelectedChoices] = useState<Omit<ConsentCategories, 'necessary'>>({
    preferences: false,
    analytics: false,
    marketing: false
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Check consent status on mount
  useEffect(() => {
    const required = consentManager.isConsentRequired();
    if (required) {
      setIsVisible(true);
    }

    // Listen for external requests to open cookie settings (e.g. from footer link)
    const handleOpenSettings = () => {
      const current = consentManager.getConsent();
      setSelectedChoices({
        preferences: Boolean(current?.categories.preferences),
        analytics: Boolean(current?.categories.analytics),
        marketing: Boolean(current?.categories.marketing)
      });
      setIsCustomizeOpen(true);
      setIsVisible(true);
    };

    window.addEventListener('muety_open_cookie_settings', handleOpenSettings);
    return () => {
      window.removeEventListener('muety_open_cookie_settings', handleOpenSettings);
    };
  }, []);

  // Keyboard navigation & accessibility focus trap when customization modal is open
  useEffect(() => {
    if (!isCustomizeOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // If user already had a valid choice, close without forcing
        if (!consentManager.isConsentRequired()) {
          setIsCustomizeOpen(false);
          setIsVisible(false);
        } else {
          setIsCustomizeOpen(false);
        }
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCustomizeOpen]);

  const handleAcceptAll = async () => {
    consentManager.acceptAll();
    setIsVisible(false);
    setIsCustomizeOpen(false);

    try {
      const user = authService.getCurrentUser();
      if (user?.uid) {
        await authService.recordPatronCircleConsent(user.uid, true, user.email, user.phoneNumber);
      }
    } catch (err) {
      console.warn('[CookieConsent] Patron Circle sync note:', err);
    }
  };

  const handleRejectOptional = () => {
    consentManager.rejectOptional();
    setIsVisible(false);
    setIsCustomizeOpen(false);
  };

  const handleOpenCustomize = () => {
    triggerRef.current = document.activeElement as HTMLElement;
    const current = consentManager.getConsent();
    setSelectedChoices({
      preferences: Boolean(current?.categories.preferences),
      analytics: Boolean(current?.categories.analytics),
      marketing: Boolean(current?.categories.marketing)
    });
    setIsCustomizeOpen(true);
  };

  const handleSavePreferences = async () => {
    consentManager.saveCustomPreferences(selectedChoices);
    setIsVisible(false);
    setIsCustomizeOpen(false);
    triggerRef.current?.focus();

    if (selectedChoices.marketing) {
      try {
        const user = authService.getCurrentUser();
        if (user?.uid) {
          await authService.recordPatronCircleConsent(user.uid, true, user.email, user.phoneNumber);
        }
      } catch (err) {
        console.warn('[CookieConsent] Patron Circle sync note:', err);
      }
    }
  };

  const toggleCategoryChoice = (category: keyof typeof selectedChoices) => {
    setSelectedChoices(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleCategoryDetails = (id: string) => {
    setExpandedCategory(prev => (prev === id ? null : id));
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 1. PRIMARY BOTTOM BANNER */}
      {!isCustomizeOpen && (
        <section 
          className="cookie-consent-banner" 
          role="region" 
          aria-label="Cookie Consent & Privacy Preferences"
          aria-describedby="cookie-consent-desc"
        >
          <div className="cookie-consent-inner container">
            <div className="cookie-consent-content">
              <div className="cookie-consent-header">
                <span className="cookie-consent-badge">
                  <ShieldCheck size={14} className="cookie-badge-icon" />
                  <span>Privacy Choices</span>
                </span>
                <h2 id="cookie-consent-heading" className="cookie-consent-title">
                  Your privacy matters at MUETY
                </h2>
              </div>
              <p id="cookie-consent-desc" className="cookie-consent-text">
                We use essential cookies to keep the store working. With your permission, we may also use analytics and marketing cookies to improve your shopping experience.
              </p>
              <div className="cookie-consent-links">
                <Link to="/cookie-policy" className="cookie-legal-link">
                  Cookie Policy
                </Link>
                <span className="cookie-link-sep" aria-hidden="true">•</span>
                <Link to="/privacy-policy" className="cookie-legal-link">
                  Privacy Policy
                </Link>
              </div>
            </div>

            <div className="cookie-consent-actions" role="group" aria-label="Consent Actions">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="btn-cookie-action btn-cookie-reject"
                aria-label="Reject optional cookies (keep essential only)"
              >
                Reject optional
              </button>

              <button
                type="button"
                onClick={handleOpenCustomize}
                className="btn-cookie-action btn-cookie-customize"
                aria-label="Customize cookie categories"
              >
                <SlidersHorizontal size={14} />
                <span>Customize</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="btn-cookie-action btn-cookie-accept"
                aria-label="Accept all cookies including analytics and marketing"
              >
                Accept all
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. CUSTOMIZATION MODAL */}
      {isCustomizeOpen && (
        <div 
          className="cookie-modal-overlay" 
          role="presentation"
          onClick={() => {
            if (!consentManager.isConsentRequired()) {
              setIsCustomizeOpen(false);
              setIsVisible(false);
            }
          }}
        >
          <div 
            ref={modalRef}
            className="cookie-modal-card" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="cookie-modal-title"
            aria-describedby="cookie-modal-desc"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="cookie-modal-header">
              <div className="cookie-modal-title-group">
                <div className="cookie-modal-badge">
                  <CookieIcon size={16} />
                  <span>Privacy Preference Center</span>
                </div>
                <h2 id="cookie-modal-title" className="cookie-modal-title">
                  Manage Your Cookie Preferences
                </h2>
                <p id="cookie-modal-desc" className="cookie-modal-desc">
                  Customize the categories of cookies and storage technologies used during your visit. Strictly necessary cookies remain active to provide core boutique services and secure transactions.
                </p>
              </div>

              {!consentManager.isConsentRequired() && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomizeOpen(false);
                    setIsVisible(false);
                  }}
                  className="cookie-modal-close-btn"
                  aria-label="Close preferences"
                  title="Close"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal Body: Categories List */}
            <div className="cookie-modal-body">
              <div className="cookie-categories-list">
                {CATEGORY_DETAILS.map((cat) => {
                  const isExpanded = expandedCategory === cat.id;
                  const isChecked = cat.required ? true : selectedChoices[cat.id as keyof typeof selectedChoices];

                  return (
                    <div key={cat.id} className={`cookie-category-item ${cat.required ? 'is-required' : ''}`}>
                      <div className="cookie-category-header">
                        <div className="cookie-category-info">
                          <div className="cookie-category-name-row">
                            <span className="cookie-category-name">{cat.name}</span>
                            {cat.required && (
                              <span className="cookie-pill-always-active">
                                <Lock size={11} /> Always Active
                              </span>
                            )}
                          </div>
                          <p className="cookie-category-summary">{cat.summary}</p>
                        </div>

                        {/* Toggle Control */}
                        <div className="cookie-category-toggle-wrap">
                          {cat.required ? (
                            <span 
                              className="cookie-switch is-locked"
                              aria-disabled="true"
                              aria-label={`${cat.name} cookies are strictly necessary and cannot be turned off`}
                            >
                              <span className="cookie-switch-handle is-active">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isChecked}
                              aria-label={`Enable ${cat.name} cookies`}
                              onClick={() => toggleCategoryChoice(cat.id as keyof typeof selectedChoices)}
                              className={`cookie-switch ${isChecked ? 'is-on' : 'is-off'}`}
                            >
                              <span className={`cookie-switch-handle ${isChecked ? 'is-active' : ''}`}>
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Technical Details */}
                      <button
                        type="button"
                        onClick={() => toggleCategoryDetails(cat.id)}
                        className="cookie-category-accordion-btn"
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? 'Hide details & technologies' : 'View details & technologies'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <div className="cookie-category-expanded-content animate-fade-in">
                          <p className="cookie-category-detail-text">{cat.details}</p>
                          <div className="cookie-category-examples">
                            <span className="cookie-examples-label">Technologies used:</span>
                            <ul className="cookie-examples-list">
                              {cat.examples.map((ex, i) => (
                                <li key={i}>{ex}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Policy Links & Retention Notice */}
              <div className="cookie-modal-legal-note">
                <p>
                  Preferences are stored in a secure first-party cookie for 180 days. You may change or withdraw your consent anytime via the <strong>Cookie Preferences</strong> link in the footer.
                </p>
                <div className="cookie-modal-links-row">
                  <Link to="/cookie-policy" className="cookie-modal-link" target="_blank" rel="noopener noreferrer">
                    <span>Read Full Cookie Policy</span>
                    <ExternalLink size={13} />
                  </Link>
                  <Link to="/privacy-policy" className="cookie-modal-link" target="_blank" rel="noopener noreferrer">
                    <span>Privacy Policy</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="cookie-modal-footer">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="btn-cookie-modal btn-cookie-modal-reject"
              >
                Reject optional
              </button>

              <button
                type="button"
                onClick={handleSavePreferences}
                className="btn-cookie-modal btn-cookie-modal-save"
              >
                Save preferences
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="btn-cookie-modal btn-cookie-modal-accept"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
