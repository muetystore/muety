import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { bannerService } from '@/features/banners/services/bannerService';
import { HeroBanner, CreateBannerInput } from '@/features/banners/types';
import { auditService } from '@/shared/services/auditService';
import { getUserRoles } from '@/shared/utils/permissions';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { uploadToCloudinary } from '@/lib/media/cloudinary';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Upload, 
  Link as LinkIcon, 
  ExternalLink,
  Sparkles,
  Layers,
  HelpCircle,
  Loader2,
  X,
  Smartphone,
  Monitor
} from 'lucide-react';

const PRESET_LINKS = [
  { label: 'All Products', url: '/products' },
  { label: 'Bridal Sarees', url: '/category/bridal-sarees' },
  { label: 'Pure Silk', url: '/category/pure-silk-sarees' },
  { label: 'Festive Capsule', url: '/products' },
  { label: 'Collections', url: '/collections' }
];

export const AdminBanners: React.FC = () => {
  useDocumentTitle('Hero Banner Management');
  const { user } = useAuth();
  const { success, error: notifyError, warning } = useNotification();

  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [previewModalBanner, setPreviewModalBanner] = useState<HeroBanner | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [targetLink, setTargetLink] = useState('/products');
  const [buttonText, setButtonText] = useState('Explore Collection');
  const [badgeText, setBadgeText] = useState('');
  const [objectPosition, setObjectPosition] = useState('center center');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Subscribe to real-time banner updates
  useEffect(() => {
    setIsLoading(true);
    const unsub = bannerService.subscribeBanners((items) => {
      setBanners(items);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setMobileImageUrl('');
    setAltText('');
    setTargetLink('/products');
    setButtonText('Explore Collection');
    setBadgeText('FESTIVE EDIT');
    setObjectPosition('center center');
    setIsActive(true);
    setDisplayOrder(banners.length + 1);
    setSelectedFile(null);
    setFilePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || '');
    setImageUrl(banner.image);
    setMobileImageUrl(banner.mobileImage || '');
    setAltText(banner.alt);
    setTargetLink(banner.link);
    setButtonText(banner.buttonText || 'Explore Collection');
    setBadgeText(banner.badgeText || '');
    setObjectPosition(banner.objectPosition || 'center center');
    setIsActive(banner.isActive);
    setDisplayOrder(banner.displayOrder);
    setSelectedFile(null);
    setFilePreview(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      warning('Banner image file must be under 15MB.', 'File Too Large');
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFilePreview(localUrl);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      warning('Please enter a banner title.', 'Missing Information');
      return;
    }

    const cleanAlt = altText.trim() || cleanTitle;
    const cleanLink = targetLink.trim() || '/products';

    let finalImageUrl = filePreview || imageUrl.trim();

    if (!finalImageUrl && !selectedFile) {
      warning('Please upload an image or provide a valid image URL.', 'Missing Banner Image');
      return;
    }

    setIsSaving(true);

    try {
      if (selectedFile) {
        setIsUploading(true);
        try {
          const res = await uploadToCloudinary(selectedFile, {
            folder: 'muety/banners',
            publicId: `banner_${Date.now()}`
          });
          if (res && res.url) {
            finalImageUrl = res.url;
          }
        } catch (uploadErr) {
          console.warn('Cloudinary upload fallback to local URL:', uploadErr);
          if (filePreview) {
            finalImageUrl = filePreview;
          }
        } finally {
          setIsUploading(false);
        }
      }

      if (!finalImageUrl) {
        throw new Error('Image URL could not be resolved.');
      }

      const bannerData: CreateBannerInput = {
        title: cleanTitle,
        subtitle: subtitle.trim() || undefined,
        image: finalImageUrl,
        mobileImage: mobileImageUrl.trim() || undefined,
        alt: cleanAlt,
        link: cleanLink,
        buttonText: buttonText.trim() || undefined,
        badgeText: badgeText.trim() || undefined,
        objectPosition,
        isActive,
        displayOrder: Number(displayOrder) || banners.length + 1
      };

      if (editingBanner) {
        const updated = await bannerService.updateBanner(editingBanner.id, bannerData);
        await auditService.logAction({
          actorUid: user?.uid || 'admin',
          actorEmail: user?.email || 'admin@muety.in',
          actorRole: getUserRoles(user)[0] || 'admin',
          action: 'BANNER_UPDATED',
          entityType: 'BANNER',
          entityId: editingBanner.id,
          before: editingBanner,
          after: updated,
          reason: `Updated hero banner "${cleanTitle}"`
        });
        success(`Hero banner "${cleanTitle}" updated successfully.`);
      } else {
        const created = await bannerService.createBanner(bannerData);
        await auditService.logAction({
          actorUid: user?.uid || 'admin',
          actorEmail: user?.email || 'admin@muety.in',
          actorRole: getUserRoles(user)[0] || 'admin',
          action: 'BANNER_CREATED',
          entityType: 'BANNER',
          entityId: created.id,
          after: created,
          reason: `Created hero banner "${cleanTitle}"`
        });
        success(`Hero banner "${cleanTitle}" created and activated.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save banner error:', err);
      notifyError(err?.message || 'Failed to save banner image.');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleDeleteBanner = async (banner: HeroBanner) => {
    if (!window.confirm(`Are you sure you want to delete banner "${banner.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await bannerService.deleteBanner(banner.id);
      await auditService.logAction({
        actorUid: user?.uid || 'admin',
        actorEmail: user?.email || 'admin@muety.in',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'BANNER_DELETED',
        entityType: 'BANNER',
        entityId: banner.id,
        before: banner,
        reason: `Deleted hero banner "${banner.title}"`
      });
      success(`Banner "${banner.title}" deleted.`);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to delete banner.');
    }
  };

  const handleToggleActive = async (banner: HeroBanner) => {
    try {
      const updated = await bannerService.toggleBannerActive(banner.id);
      await auditService.logAction({
        actorUid: user?.uid || 'admin',
        actorEmail: user?.email || 'admin@muety.in',
        actorRole: getUserRoles(user)[0] || 'admin',
        action: 'BANNER_STATUS_TOGGLED',
        entityType: 'BANNER',
        entityId: banner.id,
        before: { isActive: banner.isActive },
        after: { isActive: updated.isActive },
        reason: `${updated.isActive ? 'Activated' : 'Deactivated'} hero banner "${banner.title}"`
      });
      success(`Banner "${banner.title}" is now ${updated.isActive ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to toggle banner status.');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newOrder = [...banners];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map(b => b.id);
    try {
      await bannerService.reorderBanners(orderedIds);
      success('Banner display order updated.');
    } catch (err: any) {
      notifyError(err?.message || 'Failed to reorder banners.');
    }
  };

  const filteredBanners = useMemo(() => {
    return banners.filter(b => {
      const matchSearch = 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        b.alt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.link.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterStatus === 'active') return b.isActive;
      if (filterStatus === 'inactive') return !b.isActive;
      return true;
    });
  }, [banners, searchQuery, filterStatus]);

  const activeCount = banners.filter(b => b.isActive).length;

  return (
    <div className="admin-page-container animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-accent)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
            <Layers size={15} />
            <span>COMMERCE / STOREFRONT VISUALS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Hero Banner Setup
          </h1>
          <p style={{ color: 'var(--brand-muted)', margin: '6px 0 0', fontSize: '0.94rem' }}>
            Configure and schedule high-resolution campaign banner photography featured at the top of the storefront homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, padding: '0.65rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}
        >
          <Plus size={18} />
          <span>Add Banner Image</span>
        </button>
      </div>

      {/* KPI & Dimension Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(74, 14, 46, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
            <ImageIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Banners</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{banners.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active in Carousel</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a' }}>{activeCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Carousel Mode</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '2px' }}>
              {activeCount > 1 ? 'Auto-Scrolling (5s)' : activeCount === 1 ? 'Single Static Banner' : 'Heritage Default'}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fcfaf7', border: '1px dashed var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--brand-primary)', display: 'block', marginBottom: '2px' }}>Recommended Dimensions:</strong>
          1920 × 750px (Desktop / Wide, ~2.5:1 ratio). Ensure model saree drape and focal zari details are vertically centered.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterStatus(tab)}
              className={`btn btn-sm ${filterStatus === tab ? 'btn-primary' : 'btn-outline'}`}
              style={{ textTransform: 'capitalize', fontWeight: 600 }}
            >
              {tab === 'all' ? `All (${banners.length})` : tab === 'active' ? `Active (${activeCount})` : `Inactive (${banners.length - activeCount})`}
            </button>
          ))}
        </div>

        <div style={{ minWidth: '240px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search banners by title or link..."
            className="form-input"
            style={{ fontSize: '0.88rem', padding: '0.45rem 0.85rem' }}
          />
        </div>
      </div>

      {/* Banner Cards List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--brand-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <div>Synchronizing hero banners...</div>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px dashed var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <ImageIcon size={48} style={{ color: 'var(--brand-muted)', margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem' }}>No Banner Images Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem', fontSize: '0.92rem' }}>
            {searchQuery ? 'No banner matches your search criteria.' : 'Create your first hero banner image to showcase collections on the storefront.'}
          </p>
          <button type="button" onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} /> Add Banner Image
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredBanners.map((banner, index) => (
            <div
              key={banner.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--brand-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'minmax(200px, 340px) 1fr auto',
                gap: '1.5rem',
                alignItems: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {/* Banner Visual Thumbnail */}
              <div 
                style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '140px', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--brand-border)'
                }}
              >
                <img
                  src={banner.image}
                  alt={banner.alt}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: banner.objectPosition || 'center center'
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.opacity = '0.4';
                  }}
                />

                <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '6px' }}>
                  <span style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(4px)'
                  }}>
                    Slide #{banner.displayOrder}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewModalBanner(banner)}
                  title="Preview Full Screen"
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    color: 'var(--brand-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={13} /> Preview
                </button>
              </div>

              {/* Banner Details */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  {banner.badgeText && (
                    <span style={{
                      backgroundColor: 'rgba(74, 14, 46, 0.08)',
                      color: 'var(--brand-primary)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      letterSpacing: '0.04em'
                    }}>
                      {banner.badgeText}
                    </span>
                  )}
                  <span style={{
                    backgroundColor: banner.isActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                    color: banner.isActive ? '#15803d' : '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {banner.isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {banner.isActive ? 'Active on Homepage' : 'Draft / Inactive'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  {banner.title}
                </h3>

                {banner.subtitle && (
                  <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    {banner.subtitle}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', color: 'var(--brand-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <LinkIcon size={13} />
                    Target: <strong style={{ color: 'var(--brand-primary)' }}>{banner.link}</strong>
                  </span>

                  {banner.buttonText && (
                    <span>
                      CTA: <strong>"{banner.buttonText}"</strong>
                    </span>
                  )}

                  <span style={{ color: 'var(--text-muted)' }}>
                    Position: <code>{banner.objectPosition || 'center center'}</code>
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0}
                    className="btn btn-outline btn-sm"
                    title="Move slide up"
                    style={{ padding: '6px', opacity: index === 0 ? 0.4 : 1 }}
                  >
                    <ArrowUp size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === banners.length - 1}
                    className="btn btn-outline btn-sm"
                    title="Move slide down"
                    style={{ padding: '6px', opacity: index === banners.length - 1 ? 0.4 : 1 }}
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner)}
                    className={`btn btn-sm ${banner.isActive ? 'btn-outline' : 'btn-primary'}`}
                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                  >
                    {banner.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(banner)}
                    className="btn btn-outline btn-sm"
                    title="Edit Banner"
                    style={{ padding: '6px 10px' }}
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(banner)}
                    className="btn btn-outline btn-sm"
                    title="Delete Banner"
                    style={{ padding: '6px 10px', color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Banner Admin Modal */}
      {/* Add / Edit Banner Admin Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingBanner ? 'Edit Hero Banner' : 'Setup New Hero Banner'}
        subtitle="Upload luxury photography and configure target links for the homepage carousel."
        headerIcon={<Sparkles size={18} color="#c9a227" />}
        maxWidth="720px"
      >
        <form onSubmit={handleSaveBanner} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="admin-modal-body" style={{ maxHeight: 'calc(85vh - 130px)', overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Photography Upload & Preview Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Banner Image Photography *
              </label>

              <div style={{
                border: '1.5px dashed rgba(201, 162, 39, 0.45)',
                borderRadius: '12px',
                padding: '1.15rem',
                backgroundColor: '#fdfbf7',
                textAlign: 'center',
                position: 'relative',
                transition: 'border-color 0.2s ease'
              }}>
                {(filePreview || imageUrl) ? (
                  <div>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '170px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#070a12',
                      marginBottom: '0.75rem',
                      border: '1px solid rgba(201, 162, 39, 0.3)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <img
                        src={filePreview || imageUrl}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: objectPosition
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        backgroundColor: 'rgba(16, 23, 42, 0.85)',
                        color: '#f8fafc',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(201, 162, 39, 0.3)'
                      }}>
                        Live Focal: {objectPosition}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setFilePreview(null); setImageUrl(''); }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                        }}
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '9999px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #c9a227',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#10172a',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}>
                        <Upload size={13} color="#c9a227" />
                        <span>Change Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ padding: '0.85rem 0' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(201, 162, 39, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px',
                        color: '#c9a227'
                      }}>
                        <Upload size={22} />
                      </div>
                      <div style={{ fontWeight: 700, color: '#10172a', fontSize: '0.94rem' }}>
                        Choose High-Resolution Banner File
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                        PNG, JPG, WebP up to 15MB • Optimal 1920×750px (Desktop)
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 18px',
                        borderRadius: '9999px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #c9a227',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#10172a',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}>
                        <Upload size={14} color="#c9a227" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Direct Image URL input as alternative */}
                <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => { setImageUrl(e.target.value); if (filePreview) { setFilePreview(null); setSelectedFile(null); } }}
                    placeholder="Or paste direct image URL (e.g. /dasara_campaign_banner_with_text.jpg or https://...)"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      fontSize: '0.82rem',
                      color: '#10172a',
                      boxSizing: 'border-box'
                    }}
                  />
                  <LinkIcon size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                </div>
              </div>
            </div>

            {/* Focal / Object Position Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Image Focal Alignment (CSS object-position)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Center (Default)', val: 'center center' },
                  { label: 'Top Focus', val: 'center top' },
                  { label: 'Upper Third (35%)', val: 'center 35%' },
                  { label: 'Bottom Focus', val: 'center bottom' }
                ].map(pos => {
                  const isSelected = objectPosition === pos.val;
                  return (
                    <button
                      key={pos.val}
                      type="button"
                      onClick={() => setObjectPosition(pos.val)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        border: isSelected ? '1.5px solid #10172a' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#10172a' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(16, 23, 42, 0.15)' : 'none'
                      }}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text & Content Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  Banner Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. MUETY Dasara Festive Collection"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.88rem',
                    color: '#10172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  Badge / Tag (Optional)
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. FESTIVE EDIT, NEW ARRIVAL"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.88rem',
                    color: '#10172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Subtitle / Caption (Optional)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Pure Mulberry Silk Handcrafted with Certified Tested Gold Zari"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.88rem',
                  color: '#10172a',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Target Link & Preset Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Destination Target Link *
              </label>
              <input
                type="text"
                value={targetLink}
                onChange={(e) => setTargetLink(e.target.value)}
                placeholder="e.g. /products, /category/bridal-sarees, or external URL"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.88rem',
                  color: '#10172a',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Presets:</span>
                {PRESET_LINKS.map(p => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => setTargetLink(p.url)}
                    style={{
                      background: '#ffffff',
                      border: targetLink === p.url ? '1px solid #c9a227' : '1px solid #e2e8f0',
                      borderRadius: '9999px',
                      padding: '2px 9px',
                      fontSize: '0.75rem',
                      color: targetLink === p.url ? '#c9a227' : '#475569',
                      fontWeight: targetLink === p.url ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Button Text, SEO Alt Text, Display Order */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="e.g. Explore Collection"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.88rem',
                    color: '#10172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  SEO Alt Text *
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="e.g. MUETY Pure Silk Sarees"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.88rem',
                    color: '#10172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.88rem',
                    color: '#10172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Active Status Toggle Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10172a' }}>
                  Publish Immediately
                </span>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                  Make this banner live in the homepage hero carousel
                </p>
              </div>
              <input
                type="checkbox"
                id="banner-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#10172a', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Sticky Modal Footer Controls */}
          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="btn btn-outline btn-sm"
              style={{ borderRadius: '9999px', padding: '7px 18px' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="btn btn-primary btn-sm"
              style={{
                borderRadius: '9999px',
                padding: '7px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '140px',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 23, 42, 0.25)',
                border: '1px solid rgba(201, 162, 39, 0.35)'
              }}
            >
              {(isSaving || isUploading) ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isUploading ? 'Uploading...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} color="#c9a227" />
                  <span>{editingBanner ? 'Save Changes' : 'Create Banner'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Live Storefront Mockup Preview Modal */}
      {previewModalBanner && (
        <AdminModal
          isOpen={!!previewModalBanner}
          onClose={() => setPreviewModalBanner(null)}
          title={`Storefront Preview: "${previewModalBanner.title}"`}
          subtitle="Real-time simulation of how the banner appears to visitors."
          headerIcon={<Eye size={18} color="#c9a227" />}
          maxWidth="920px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="admin-modal-body" style={{ maxHeight: 'calc(85vh - 130px)', overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                  Target Destination: <strong style={{ color: '#10172a' }}>{previewModalBanner.link}</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '9999px', fontSize: '0.78rem' }}
                  >
                    <Monitor size={14} /> Desktop (16:9)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '9999px', fontSize: '0.78rem' }}
                  >
                    <Smartphone size={14} /> Mobile (360px)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#0a0d14', padding: '1.25rem', borderRadius: '12px' }}>
                <div style={{
                  width: previewDevice === 'desktop' ? '100%' : '360px',
                  height: previewDevice === 'desktop' ? '320px' : '400px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <img
                    src={previewModalBanner.image}
                    alt={previewModalBanner.alt}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: previewModalBanner.objectPosition || 'center center'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setPreviewModalBanner(null)}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: '9999px' }}
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
