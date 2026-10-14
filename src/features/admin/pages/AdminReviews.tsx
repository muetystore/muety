import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useNotification } from '@/shared/context/NotificationContext';
import { reviewService } from '@/features/reviews/services/reviewService';
import { productService } from '@/features/catalog/services/productService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { PatronReview, Product } from '@/types';
import { getUserRoles } from '@/shared/utils/permissions';
import { AdminModal } from '@/features/admin/components/AdminModal';
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
  MessageSquare,
  ExternalLink,
  Eye,
  Image as ImageIcon
} from 'lucide-react';

export const AdminReviews: React.FC = () => {
  useDocumentTitle('Patron Reviews & Testimonials - Admin');
  const { user } = useAuth();
  const { success, warning } = useNotification();

  const [reviews, setReviews] = useState<PatronReview[]>(() => reviewService.getAllReviews());
  const [filterTab, setFilterTab] = useState<'all' | 'featured' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ url: string; author: string } | null>(null);

  // New review modal state
  const [authorName, setAuthorName] = useState('');
  const [authorLocation, setAuthorLocation] = useState('');
  const [productName, setProductName] = useState('');
  const [productId, setProductId] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [quote, setQuote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [verifiedPurchase, setVerifiedPurchase] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);

  const loadData = () => {
    setReviews(reviewService.getAllReviews());
    setProducts(productService.getAllProducts());
  };

  useEffect(() => {
    setProducts(productService.getAllProducts());

    const unsubReviews = reviewService.subscribeToReviews((liveRevs) => {
      setReviews(liveRevs);
    });

    const unsubProds = productService.subscribeToProducts((liveProds) => {
      setProducts(liveProds);
    });

    return () => {
      if (typeof unsubReviews === 'function') unsubReviews();
      if (typeof unsubProds === 'function') unsubProds();
    };
  }, []);

  const stats = reviewService.getStatistics();

  const handleToggleFeatured = async (id: string) => {
    const updated = await reviewService.toggleFeatured(id);
    if (updated) {
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'REVIEW_FEATURED',
        entityType: 'PRODUCT',
        entityId: id,
        reason: `Toggled review featured state for ${updated.authorName}`
      });

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
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: status === 'approved' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
        entityType: 'PRODUCT',
        entityId: id,
        reason: `Changed review status to ${status}`
      });

      success(`Review status changed to ${status.toUpperCase()}.`, 'Status Updated');
      loadData();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the review by ${name}?`)) {
      await reviewService.deleteReview(id);
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'REVIEW_DELETED',
        entityType: 'PRODUCT',
        entityId: id,
        reason: `Deleted review by ${name}`
      });

      success(`Review deleted successfully.`, 'Deleted');
      loadData();
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !quote.trim() || !productName.trim()) {
      warning('Please fill in author name, product, and review impressions.');
      return;
    }

    const created = await reviewService.addReview({
      authorName: authorName.trim(),
      authorLocation: authorLocation.trim() || 'Global Patron',
      productName: productName.trim(),
      productId: productId || undefined,
      rating,
      title: title.trim() || 'Exceptional Quality',
      quote: quote.trim(),
      verifiedPurchase,
      status: 'approved',
      isFeatured,
      showOnHome: isFeatured,
      displayOrder: isFeatured ? displayOrder : undefined,
      photoUrl: photoUrl.trim() || undefined
    });

    await auditService.logAction({
      actorUid: user?.uid || 'system',
      actorEmail: user?.email || 'admin',
      actorRole: getUserRoles(user)[0] || 'admin',
      action: 'REVIEW_APPROVED',
      entityType: 'PRODUCT',
      entityId: created.id,
      after: created,
      reason: `Created patron review by ${authorName}`
    });

    success('New patron review and testimonial published successfully.', 'Patron Review Added');
    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const handleUpdateDisplayOrder = async (id: string, newOrder: number) => {
    if (isNaN(newOrder) || newOrder < 1) return;
    await reviewService.updateReviewDisplayOrder(id, newOrder);
    success('Homepage display order saved.', 'Order Updated');
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
    setPhotoUrl('');
    setDisplayOrder(reviews.filter(r => r.isFeatured).length + 1);
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Product: <strong>{rev.productName}</strong>
                      {rev.productId && (
                        <Link 
                          to={`/admin/products/${rev.productId}/edit`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: 'var(--brand-primary)',
                            textDecoration: 'underline',
                            fontWeight: 600
                          }}
                          title="Open product editor"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      )}
                    </span>
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

              {/* Review Content & Customer Photo Preview */}
              <div style={{
                display: 'flex',
                gap: '1.25rem',
                backgroundColor: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--brand-border)',
                marginBottom: '1.25rem',
                alignItems: 'flex-start'
              }}>
                {rev.photoUrl ? (
                  <div 
                    onClick={() => setPreviewPhotoModal({ url: rev.photoUrl!, author: rev.authorName })}
                    style={{
                      position: 'relative',
                      width: '84px',
                      height: '108px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid rgba(201, 162, 39, 0.4)',
                      flexShrink: 0,
                      backgroundColor: '#0f172a',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    title="Click to view full patron photograph"
                  >
                    <img 
                      src={rev.photoUrl} 
                      alt={rev.authorName} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}>
                      <Eye size={18} />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    width: '84px',
                    height: '108px',
                    borderRadius: '6px',
                    border: '1.5px dashed var(--brand-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    color: 'var(--brand-muted)',
                    fontSize: '0.72rem',
                    textAlign: 'center',
                    padding: '6px',
                    flexShrink: 0
                  }}>
                    <ImageIcon size={20} style={{ marginBottom: '4px', opacity: 0.5 }} />
                    <span>No Photo</span>
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  {rev.title && (
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-primary)', marginBottom: '6px' }}>
                      "{rev.title}"
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                    "{rev.quote}"
                  </p>
                </div>
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
                {/* Feature on Home Page Toggle & Priority Order */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleToggleFeatured(rev.id)}
                    className={`btn btn-sm ${rev.isFeatured ? 'btn-primary' : 'btn-outline'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Star size={14} fill={rev.isFeatured ? '#d4af37' : 'none'} color={rev.isFeatured ? '#d4af37' : 'currentColor'} />
                    <span>{rev.isFeatured ? 'Featured on Home (Active)' : 'Feature on Home Page'}</span>
                  </button>

                  {rev.isFeatured && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', fontWeight: 600 }}>Home Priority:</span>
                      <input 
                        type="number" 
                        min={1} 
                        defaultValue={rev.displayOrder || 1} 
                        onBlur={(e) => handleUpdateDisplayOrder(rev.id, parseInt(e.target.value) || 1)}
                        style={{
                          width: '56px',
                          padding: '4px 6px',
                          fontSize: '0.82rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--brand-border)',
                          textAlign: 'center',
                          fontWeight: 700
                        }}
                        title="Set display order on storefront homepage"
                      />
                    </div>
                  )}
                </div>

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
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Patron Testimonial"
        subtitle="Publish verified client feedback directly to the storefront"
        headerIcon={<MessageSquare size={20} />}
        maxWidth="640px"
      >
        <form onSubmit={handleCreateReview} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Patron Full Name *</label>
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
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Patron Location</label>
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
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Associated Product *</label>
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
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Rating</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <button
                    type="button"
                    key={starVal}
                    onClick={() => setRating(starVal)}
                    style={{
                      padding: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: starVal <= rating ? '#f59e0b' : '#cbd5e1',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <Star size={24} fill={starVal <= rating ? '#f59e0b' : 'none'} />
                  </button>
                ))}
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#090d16', marginLeft: '6px' }}>
                  {rating} out of 5 Stars
                </span>
              </div>
            </div>

            {/* Review Headline & Quote */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Review Headline (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Breathtaking craftsmanship and swift delivery"
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Patron Quote / Impressions *</label>
              <textarea 
                required 
                rows={4}
                placeholder="Enter the full review or impressions quote..."
                value={quote} 
                onChange={e => setQuote(e.target.value)} 
                className="form-input" 
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Customer Photo URL */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>Customer Photograph URL (Optional)</label>
              <input 
                type="url" 
                placeholder="https://... Cloudinary or hosted photo URL"
                value={photoUrl} 
                onChange={e => setPhotoUrl(e.target.value)} 
                className="form-input" 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)' }}>
                Original patron portrait photo to display in the polaroid review frame.
              </span>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b' }}>
                <input 
                  type="checkbox" 
                  checked={verifiedPurchase} 
                  onChange={e => setVerifiedPurchase(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: '#090d16' }}
                />
                <span>Mark as <strong>Verified Patron</strong></span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b' }}>
                <input 
                  type="checkbox" 
                  checked={isFeatured} 
                  onChange={e => setIsFeatured(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: '#090d16' }}
                />
                <span>Feature on <strong>Homepage ("Loved by Our Customers")</strong></span>
              </label>

              {isFeatured && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Homepage Display Priority:</span>
                  <input 
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={e => setDisplayOrder(parseInt(e.target.value) || 1)}
                    className="form-input"
                    style={{ width: '80px', padding: '4px 8px' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="admin-modal-footer">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="btn btn-outline"
              style={{ fontWeight: 600, color: '#475569' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ fontWeight: 700 }}
            >
              Publish Testimonial
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Customer Photo Lightbox Zoom Modal */}
      {previewPhotoModal && (
        <AdminModal
          isOpen={true}
          onClose={() => setPreviewPhotoModal(null)}
          title={`Customer Photograph — ${previewPhotoModal.author}`}
        >
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <img 
              src={previewPhotoModal.url} 
              alt={previewPhotoModal.author} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '65vh', 
                borderRadius: '8px', 
                objectFit: 'contain',
                boxShadow: 'var(--shadow-md)',
                backgroundColor: '#000000'
              }} 
            />
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setPreviewPhotoModal(null)}
                className="btn btn-primary"
              >
                Close Preview
              </button>
            </div>
          </div>
        </AdminModal>
      )}

    </div>
  );
};
