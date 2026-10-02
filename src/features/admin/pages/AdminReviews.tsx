import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useNotification } from '@/shared/context/NotificationContext';
import { reviewService } from '@/features/reviews/services/reviewService';
import { productService } from '@/features/catalog/services/productService';
import { PatronReview, Product } from '@/types';
import { 
  Star, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  MapPin, 
  X,
  Search,
  Sparkles,
  MessageSquare
} from 'lucide-react';

export const AdminReviews: React.FC = () => {
  useDocumentTitle('Patron Reviews & Testimonials - Admin');
  const { success, warning } = useNotification();

  const [reviews, setReviews] = useState<PatronReview[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'featured' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // New review modal state
  const [authorName, setAuthorName] = useState('');
  const [authorLocation, setAuthorLocation] = useState('');
  const [productName, setProductName] = useState('');
  const [productId, setProductId] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [quote, setQuote] = useState('');
  const [verifiedPurchase, setVerifiedPurchase] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);

  const loadData = () => {
    setReviews(reviewService.getAllReviews());
    setProducts(productService.getAllProducts());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('muety_reviews_updated', handleUpdate);
    return () => window.removeEventListener('muety_reviews_updated', handleUpdate);
  }, []);

  const stats = reviewService.getStatistics();

  const handleToggleFeatured = async (id: string) => {
    const updated = await reviewService.toggleFeatured(id);
    if (updated) {
      if (updated.isFeatured) {
        success(`Review by "${updated.authorName}" is now featured on the Storefront Home Page.`, 'Featured on Homepage');
      } else {
        success(`Review removed from Home Page featured list.`, 'Unfeatured');
      }
      loadData();
    }
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    const updated = await reviewService.updateReviewStatus(id, status);
    if (updated) {
      success(`Review status changed to ${status.toUpperCase()}.`, 'Status Updated');
      loadData();
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the review by ${name}?`)) {
      reviewService.deleteReview(id);
      success(`Review deleted successfully.`, 'Deleted');
      loadData();
    }
  };

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !quote.trim() || !productName.trim()) {
      warning('Please fill in author name, product, and review impressions.');
      return;
    }

    reviewService.addReview({
      authorName: authorName.trim(),
      authorLocation: authorLocation.trim() || 'Global Patron',
      productName: productName.trim(),
      productId: productId || undefined,
      rating,
      title: title.trim() || 'Exceptional Quality',
      quote: quote.trim(),
      verifiedPurchase,
      status: 'approved',
      isFeatured
    });

    success('New patron review and testimonial published successfully.', 'Patron Review Added');
    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setAuthorName('');
    setAuthorLocation('');
    setProductName('');
    setProductId('');
    setRating(5);
    setTitle('');
    setQuote('');
    setVerifiedPurchase(true);
    setIsFeatured(true);
  };

  const filteredReviews = reviews.filter(rev => {
    // Tab filter
    if (filterTab === 'featured' && (!rev.isFeatured || rev.status !== 'approved')) return false;
    if (filterTab === 'pending' && rev.status !== 'pending') return false;
    if (filterTab === 'approved' && rev.status !== 'approved') return false;
    if (filterTab === 'rejected' && rev.status !== 'rejected') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (rev.authorName || '').toLowerCase().includes(q) ||
        (rev.productName || '').toLowerCase().includes(q) ||
        (rev.authorLocation || '').toLowerCase().includes(q) ||
        (rev.quote || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="admin-reviews animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>
              Patron Reviews & Testimonials
            </h1>
            <span style={{
              fontSize: '0.75rem',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              color: '#9a7b16',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}>
              Live Moderation
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Moderate verified customer experiences and curate testimonials featured on the homepage.
          </p>
        </div>

        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          <span>Add Patron Testimonial</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            TOTAL REVIEWS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '4px' }}>
            {stats.verifiedCount} Verified Purchases
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d4af37' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            FEATURED ON HOMEPAGE
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {stats.featuredCount}
            <Sparkles size={20} color="#d4af37" />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live on "Words from Discerning Patrons"
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            AVERAGE SATISFACTION
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {stats.averageRating}
            <div style={{ display: 'flex', color: '#f59e0b' }}>
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Based on {stats.approvedCount} approved reviews
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-muted)', marginBottom: '4px' }}>
            PENDING MODERATION
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.pendingCount > 0 ? '#ea580c' : 'var(--brand-primary)' }}>
            {stats.pendingCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: stats.pendingCount > 0 ? '#ea580c' : 'var(--brand-muted)', marginTop: '4px' }}>
            {stats.pendingCount > 0 ? 'Requires attention' : 'All reviews reviewed'}
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${reviews.length})` },
              { id: 'featured', label: `⭐ Featured on Home (${stats.featuredCount})` },
              { id: 'pending', label: `Pending (${stats.pendingCount})` },
              { id: 'approved', label: `Approved (${stats.approvedCount})` },
              { id: 'rejected', label: `Rejected` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: filterTab === tab.id ? 700 : 500,
                  backgroundColor: filterTab === tab.id ? 'var(--brand-primary)' : 'var(--bg-main)',
                  color: filterTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--brand-border)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <input 
              type="text"
              placeholder="Search patron, location, quote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                paddingLeft: '2.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--brand-border)',
                fontSize: '0.85rem'
              }}
            />
            <Search size={16} color="var(--brand-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredReviews.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <MessageSquare size={48} color="var(--brand-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Reviews Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No reviews match your selected filter or query.
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div 
              key={rev.id} 
              className="card"
              style={{
                padding: '1.75rem',
                borderLeft: rev.isFeatured && rev.status === 'approved' ? '4px solid #d4af37' : '1px solid var(--brand-border)',
                position: 'relative'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {/* Author Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--brand-primary)' }}>
                      {rev.authorName}
                    </h4>
                    
                    {rev.verifiedPurchase && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#059669',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid rgba(16, 185, 129, 0.25)'
                      }}>
                        <ShieldCheck size={12} /> Verified Patron
                      </span>
                    )}

                    <span className={`badge badge-${
                      rev.status === 'approved' ? 'success' : rev.status === 'pending' ? 'warning' : 'danger'
                    }`}>
                      {rev.status.toUpperCase()}
                    </span>

                    {rev.isFeatured && rev.status === 'approved' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: '#d4af37',
                        color: '#0f172a',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        ⭐ HOME PAGE FEATURED
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--brand-muted)', marginTop: '4px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> {rev.authorLocation}
                    </span>
                    <span>•</span>
                    <span>Product: <strong>{rev.productName}</strong></span>
                    <span>•</span>
                    <span>Date: {new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Star Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', color: '#f59e0b' }}>
                    {[...Array(5)].map((_, idx) => (
                      <Star 
                        key={idx} 
                        size={16} 
                        fill={idx < rev.rating ? "#f59e0b" : "none"} 
                        color={idx < rev.rating ? "#f59e0b" : "#cbd5e1"} 
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    {rev.rating}.0
                  </span>
                </div>
              </div>

              {/* Review Content */}
              <div style={{
                backgroundColor: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--brand-border)',
                marginBottom: '1.25rem'
              }}>
                {rev.title && (
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '6px' }}>
                    "{rev.title}"
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{rev.quote}"
                </p>
              </div>

              {/* Action Toolbar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                borderTop: '1px solid var(--brand-border)',
                paddingTop: '1rem'
              }}>
                {/* Feature on Home Page Toggle */}
                <button
                  onClick={() => handleToggleFeatured(rev.id)}
                  className={`btn btn-sm ${rev.isFeatured ? 'btn-primary' : 'btn-outline'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Star size={14} fill={rev.isFeatured ? '#d4af37' : 'none'} color={rev.isFeatured ? '#d4af37' : 'currentColor'} />
                  <span>{rev.isFeatured ? 'Featured on Home (Active)' : 'Feature on Home Page'}</span>
                </button>

                {/* Moderation Status Controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {rev.status !== 'approved' && (
                    <button
                      onClick={() => handleStatusChange(rev.id, 'approved')}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#059669', borderColor: '#a7f3d0' }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                  )}

                  {rev.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatusChange(rev.id, 'rejected')}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#ea580c' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(rev.id, rev.authorName)}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#ef4444' }}
                    title="Delete Review"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Add Testimonial Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--brand-primary)' }}>Add Patron Testimonial</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Publish verified client feedback directly to the storefront</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '6px', color: 'var(--brand-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Patron Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Vikram Singhania"
                    value={authorName} 
                    onChange={e => setAuthorName(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Patron Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. London, UK or Dubai, UAE"
                    value={authorLocation} 
                    onChange={e => setAuthorLocation(e.target.value)} 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Product Selection */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Associated Product *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="form-input"
                    value={productId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setProductId(pId);
                      const prod = products.find(p => p.id === pId);
                      if (prod) setProductName(prod.name);
                    }}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Select from Store Catalog or Custom --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {!productId && (
                  <input 
                    type="text" 
                    placeholder="Or type custom product title (e.g. Grand Veloce Weekender)"
                    value={productName} 
                    onChange={e => setProductName(e.target.value)} 
                    className="form-input" 
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>

              {/* Rating */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Rating</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      type="button"
                      key={starVal}
                      onClick={() => setRating(starVal)}
                      style={{
                        padding: '6px',
                        color: starVal <= rating ? '#f59e0b' : '#cbd5e1',
                        transition: 'transform 0.1s ease'
                      }}
                    >
                      <Star size={24} fill={starVal <= rating ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--brand-primary)', marginLeft: '6px' }}>
                    {rating} out of 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Headline & Quote */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Review Headline (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Breathtaking craftsmanship and swift delivery"
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Patron Quote / Impressions *</label>
                <textarea 
                  required 
                  rows={4}
                  placeholder="Enter the full review or impressions quote..."
                  value={quote} 
                  onChange={e => setQuote(e.target.value)} 
                  className="form-input" 
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input 
                    type="checkbox" 
                    checked={verifiedPurchase} 
                    onChange={e => setVerifiedPurchase(e.target.checked)} 
                  />
                  <span>Mark as <strong>Verified Patron</strong></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input 
                    type="checkbox" 
                    checked={isFeatured} 
                    onChange={e => setIsFeatured(e.target.checked)} 
                  />
                  <span>Feature on <strong>Homepage ("Words from Discerning Patrons")</strong></span>
                </label>
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Publish Testimonial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
