import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { collectionService } from '@/features/catalog/services/collectionService';
import { productService } from '@/features/catalog/services/productService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { SareeCollection, Product } from '@/types';
import { uploadToCloudinary } from '@/lib/media/cloudinary';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Package, 
  Search,
  Check,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';

const DEFAULT_BANNER_IMAGE = '/saree_model_individual.jpg';

export const AdminCollections: React.FC = () => {
  useDocumentTitle('MUETY Admin | Collections & Edits');
  const { user } = useAuth();
  const { success, warning, error } = useNotification();

  const [collections, setCollections] = useState<SareeCollection[]>(() => collectionService.getCollections());
  const [allProducts, setAllProducts] = useState<Product[]>(() => productService.getAllProducts());
  const [filterType, setFilterType] = useState<string>('all');
  
  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<SareeCollection | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<'occasion' | 'fabric' | 'style' | 'collection' | 'curated'>('occasion');
  const [description, setDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [showInShopBy, setShowInShopBy] = useState<boolean>(true);
  const [showInFestiveEdits, setShowInFestiveEdits] = useState<boolean>(true);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Manage Products Modal State
  const [managingCol, setManagingCol] = useState<SareeCollection | null>(null);
  const [assignedProductIds, setAssignedProductIds] = useState<string[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isSavingProducts, setIsSavingProducts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubCols = collectionService.subscribeToCollections(
      (liveCols) => {
        setCollections(liveCols);
      },
      (err) => {
        console.error('[AdminCollections] Subscription error:', err);
        error(`Collection subscription failed: ${err.message || 'Permission denied.'}`, 'Firestore Read Error');
      }
    );

    const unsubProds = productService.subscribeToProducts((liveProds) => {
      setAllProducts(liveProds || []);
    });

    return () => {
      if (typeof unsubCols === 'function') unsubCols();
      if (typeof unsubProds === 'function') unsubProds();
    };
  }, []);

  // Compute products assigned to a given collection
  const getAssignedProductsForCollection = (col: SareeCollection): Product[] => {
    return allProducts.filter(p => {
      if (p.collectionIds && p.collectionIds.includes(col.id)) return true;
      if (p.collectionId === col.id) return true;
      if ((p.tags || []).some(t => t.toLowerCase() === (col.slug || '').toLowerCase())) return true;
      if (col.type === 'occasion') {
        const target = (col.slug || col.id).toLowerCase();
        if ((p.occasion || '').toLowerCase().includes(target)) return true;
        if (p.occasions && p.occasions.some(o => o.toLowerCase().includes(target))) return true;
      }
      return false;
    });
  };

  const openCreateModal = () => {
    setEditingCol(null);
    setName('');
    setSlug('');
    setType('occasion');
    setDescription('');
    setBannerImage(DEFAULT_BANNER_IMAGE);
    setImagePreview('');
    setSelectedFile(null);
    setDisplayOrder(collections.length + 1);
    setShowInShopBy(true);
    setShowInFestiveEdits(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (col: SareeCollection) => {
    setEditingCol(col);
    setName(col.name || '');
    setSlug(col.slug || '');
    setType(col.type || 'occasion');
    setDescription(col.description || '');
    setBannerImage(col.bannerImage || DEFAULT_BANNER_IMAGE);
    setImagePreview(col.bannerImage || '');
    setSelectedFile(null);
    setDisplayOrder(col.displayOrder !== undefined ? col.displayOrder : 1);
    setShowInShopBy(col.showInShopBy !== false);
    setShowInFestiveEdits(col.showInFestiveEdits !== false);
    setFormError(null);
    setModalOpen(true);
  };

  const openManageProductsModal = (col: SareeCollection) => {
    const assigned = getAssignedProductsForCollection(col).map(p => p.id);
    setAssignedProductIds(assigned);
    setManagingCol(col);
    setProductSearchTerm('');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCol) {
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setSlug(autoSlug);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setImagePreview(objUrl);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      const msg = 'Please enter a valid collection name.';
      setFormError(msg);
      warning(msg);
      return;
    }

    const cleanSlug = slug.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    setIsSaving(true);

    try {
      let finalBannerImage = bannerImage.trim() || DEFAULT_BANNER_IMAGE;

      if (selectedFile) {
        setUploading(true);
        const pubId = `collection_${cleanSlug}_${Date.now()}`;
        try {
          const res = await uploadToCloudinary(selectedFile, { folder: 'muety/collections', publicId: pubId });
          if (res && res.url && res.url.startsWith('https://')) {
            finalBannerImage = res.url;
          }
        } catch (uploadErr) {
          console.warn('[AdminCollections] Cloudinary upload fallback to existing banner:', uploadErr);
        } finally {
          setUploading(false);
        }
      }

      const payload: Partial<SareeCollection> & { name: string } = {
        id: editingCol?.id || `col-${Date.now()}`,
        name: cleanName,
        slug: cleanSlug,
        type,
        description: description.trim(),
        bannerImage: finalBannerImage,
        displayOrder: Number(displayOrder || 1),
        showInShopBy,
        showInFestiveEdits,
        featured: true,
        productCount: editingCol ? getAssignedProductsForCollection(editingCol).length : 0
      };

      const saved = await collectionService.saveCollection(payload);

      await auditService.logAction({
        action: editingCol ? 'COLLECTION_UPDATED' : 'COLLECTION_CREATED',
        entityType: 'COLLECTION',
        entityId: saved.id,
        after: saved,
        before: editingCol || null
      });

      success(`Collection "${saved.name}" successfully saved.`, 'Collection Saved');
      setModalOpen(false);
    } catch (err: any) {
      console.error('[AdminCollections] Save error:', err);
      const msg = err?.message || 'Failed to save collection.';
      setFormError(msg);
      error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (col: SareeCollection) => {
    const confirmed = window.confirm(`Are you sure you want to delete the collection "${col.name}"?`);
    if (!confirmed) return;

    try {
      await collectionService.deleteCollection(col.id);

      await auditService.logAction({
        action: 'COLLECTION_DELETED',
        entityType: 'COLLECTION',
        entityId: col.id,
        before: col
      });

      success(`Collection "${col.name}" has been deleted.`, 'Collection Removed');
    } catch (err: any) {
      console.error('[AdminCollections] Delete error:', err);
      error(`Failed to delete collection: ${err?.message || err}`);
    }
  };

  const handleToggleShopBy = async (col: SareeCollection) => {
    try {
      const nextVal = col.showInShopBy === false ? true : false;
      await collectionService.saveCollection({ ...col, showInShopBy: nextVal });
      success(`"${col.name}" ${nextVal ? 'visible' : 'hidden'} in Shop By menu.`, 'Visibility Updated');
    } catch (err: any) {
      error(`Failed to update Shop By visibility: ${err?.message || err}`);
    }
  };

  const handleToggleFestiveEdits = async (col: SareeCollection) => {
    try {
      const nextVal = col.showInFestiveEdits === false ? true : false;
      await collectionService.saveCollection({ ...col, showInFestiveEdits: nextVal });
      success(`"${col.name}" ${nextVal ? 'visible' : 'hidden'} in Festive Edits on Homepage.`, 'Visibility Updated');
    } catch (err: any) {
      error(`Failed to update Festive Edits visibility: ${err?.message || err}`);
    }
  };

  // Save product assignments from the modal
  const handleSaveAssignedProducts = async () => {
    if (!managingCol) return;

    setIsSavingProducts(true);

    try {
      let updatedCount = 0;

      for (const product of allProducts) {
        const isNowAssigned = assignedProductIds.includes(product.id);
        const wasAssigned = (product.collectionIds && product.collectionIds.includes(managingCol.id)) || 
                            product.collectionId === managingCol.id;

        if (isNowAssigned !== wasAssigned) {
          let newColIds = Array.isArray(product.collectionIds) ? [...product.collectionIds] : (product.collectionId ? [product.collectionId] : []);
          let newTags = Array.isArray(product.tags) ? [...product.tags] : [];

          if (isNowAssigned) {
            if (!newColIds.includes(managingCol.id)) newColIds.push(managingCol.id);
            if (!newTags.includes(managingCol.slug)) newTags.push(managingCol.slug);
          } else {
            newColIds = newColIds.filter(id => id !== managingCol.id);
          }

          const primaryColId = product.primaryCategoryId || newColIds[0] || '';

          await productService.updateProduct({
            ...product,
            collectionIds: newColIds,
            collectionId: newColIds[0] || '',
            tags: newTags
          });
          updatedCount++;
        }
      }

      // Update collection product count
      await collectionService.saveCollection({
        ...managingCol,
        productCount: assignedProductIds.length
      });

      await auditService.logAction({
        action: 'COLLECTION_PRODUCTS_UPDATED',
        entityType: 'COLLECTION',
        entityId: managingCol.id,
        after: { assignedProductIds, productCount: assignedProductIds.length }
      });

      success(`Updated product assignments for "${managingCol.name}" (${assignedProductIds.length} sarees).`, 'Assignments Saved');
      setManagingCol(null);
    } catch (err: any) {
      console.error('[AdminCollections] Product assignment error:', err);
      error(`Failed to update assigned products: ${err?.message || err}`);
    } finally {
      setIsSavingProducts(false);
    }
  };

  const filteredCollections = collections.filter(c => {
    if (filterType === 'all') return true;
    if (filterType === 'occasion') return c.type === 'occasion' || !c.type;
    return c.type === filterType;
  });

  const searchedProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return allProducts;
    const q = productSearchTerm.toLowerCase().trim();
    return allProducts.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [allProducts, productSearchTerm]);

  const displayPreview = imagePreview || bannerImage || DEFAULT_BANNER_IMAGE;

  return (
    <div className="admin-collections animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>Collections & Curated Edits</h1>
            <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              FIRESTORE LIVE DATA
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Manage "Shop By" dropdown collections, homepage "Festive Edits by Occasion", and assign sarees to each collection.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Plus size={18} /> Add New Collection
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--brand-border)', paddingBottom: '12px' }}>
        {[
          { id: 'all', label: 'All Collections', count: collections.length },
          { id: 'occasion', label: 'Occasions (Festive Edits)', count: collections.filter(c => c.type === 'occasion' || !c.type).length },
          { id: 'fabric', label: 'Fabrics', count: collections.filter(c => c.type === 'fabric').length },
          { id: 'style', label: 'Styles', count: collections.filter(c => c.type === 'style').length },
          { id: 'curated', label: 'Curated & General', count: collections.filter(c => c.type === 'curated' || c.type === 'collection').length }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.84rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: filterType === tab.id ? 'var(--brand-primary)' : 'var(--brand-border)',
              backgroundColor: filterType === tab.id ? 'var(--brand-primary)' : '#ffffff',
              color: filterType === tab.id ? '#ffffff' : 'var(--brand-primary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: filterType === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
              color: filterType === tab.id ? '#ffffff' : 'var(--text-secondary)'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Collections Grid */}
      <div className="grid-3" style={{ gap: '1.5rem' }}>
        {filteredCollections.map(col => {
          const assignedCount = getAssignedProductsForCollection(col).length;
          return (
            <div key={col.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '150px', position: 'relative' }}>
                <img 
                  src={col.bannerImage || DEFAULT_BANNER_IMAGE} 
                  alt={col.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.currentTarget;
                    if (target.src !== DEFAULT_BANNER_IMAGE && !target.src.endsWith(DEFAULT_BANNER_IMAGE)) {
                      target.src = DEFAULT_BANNER_IMAGE;
                    }
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent)' }} />
                
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {col.type || 'occasion'}
                  </span>
                  <span className="badge" style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}>
                    Order #{col.displayOrder || 1}
                  </span>
                </div>

                <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px', color: '#ffffff' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>{col.name}</h4>
                  <span style={{ fontSize: '0.72rem', color: '#d4af37', textTransform: 'uppercase', fontWeight: 600 }}>
                    slug: {col.slug}
                  </span>
                </div>
              </div>

              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                  {col.description || 'Curated handloom edit.'}
                </p>

                {/* Assigned Products Counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', backgroundColor: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: '6px' }}>
                  <Package size={16} color="#d4af37" />
                  <span>{assignedCount} Sarees Assigned</span>
                </div>

                {/* Visibility Badges / Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--brand-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', fontWeight: 600 }}>
                      Shop By Menu:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleShopBy(col)}
                      className="btn btn-sm"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '4px',
                        backgroundColor: col.showInShopBy !== false ? '#ecfdf5' : '#f1f5f9',
                        color: col.showInShopBy !== false ? '#065f46' : '#64748b',
                        border: '1px solid',
                        borderColor: col.showInShopBy !== false ? '#a7f3d0' : '#cbd5e1'
                      }}
                    >
                      {col.showInShopBy !== false ? '✓ Visible in Shop By' : '✕ Hidden from Shop By'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)', fontWeight: 600 }}>
                      Festive Edits (Home):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleFestiveEdits(col)}
                      className="btn btn-sm"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '4px',
                        backgroundColor: col.showInFestiveEdits !== false ? '#eff6ff' : '#f1f5f9',
                        color: col.showInFestiveEdits !== false ? '#1e40af' : '#64748b',
                        border: '1px solid',
                        borderColor: col.showInFestiveEdits !== false ? '#bfdbfe' : '#cbd5e1'
                      }}
                    >
                      {col.showInFestiveEdits !== false ? '✓ On Home Tabs' : '✕ Not on Home Tabs'}
                    </button>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--brand-border)', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => openManageProductsModal(col)}
                    className="btn btn-sm btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    <Package size={14} /> Assign Sarees
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(col)}
                      className="btn btn-sm btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(col)}
                      className="btn btn-sm btn-danger"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Create / Edit Collection */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCol ? `Edit Collection: ${editingCol.name}` : 'Create New Collection'}
        maxWidth="680px"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="admin-modal-body" style={{ maxHeight: 'calc(85vh - 130px)', overflowY: 'auto' }}>
            {formError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--brand-primary)' }}>
                  Collection Name *
                </label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Bridal Muhurtham, Kanchipuram Silk..."
                  required
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--brand-primary)' }}>
                  URL Slug *
                </label>
                <input 
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. bridal, temple, pure-silk..."
                  required
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--brand-primary)' }}>
                  Collection Type *
                </label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as any)}
                  className="input"
                  style={{ width: '100%', height: '42px' }}
                >
                  <option value="occasion">Occasion (Festive Edits & Shop By)</option>
                  <option value="fabric">Fabric (Shop by Fabric)</option>
                  <option value="style">Style (Shop by Style)</option>
                  <option value="collection">General Collection</option>
                  <option value="curated">Curated & Special Edit</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--brand-primary)' }}>
                  Display Order *
                </label>
                <input 
                  type="number"
                  min={1}
                  max={999}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Visibility Checkboxes */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={showInShopBy}
                  onChange={(e) => setShowInShopBy(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Display in "Shop By" Megamenu dropdown and mobile navigation</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={showInFestiveEdits}
                  onChange={(e) => setShowInFestiveEdits(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Display in "Festive Edits by Occasion" tabs on Homepage (tab without subtitle)</span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--brand-primary)' }}>
                Editorial Description
              </label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of this collection or festive occasion drape..."
                rows={3}
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Banner Image Photography */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--brand-primary)' }}>
                Banner Photography
              </label>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ width: '90px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--brand-border)', flexShrink: 0 }}>
                  <img 
                    src={displayPreview} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      e.currentTarget.src = DEFAULT_BANNER_IMAGE;
                    }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={14} /> Upload Photography
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <input 
                    type="text"
                    value={bannerImage}
                    onChange={(e) => {
                      setBannerImage(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="Or enter image URL (e.g. /saree_model_individual.jpg or https://...)"
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Docked Modal Actions Footer */}
          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {editingCol ? 'Update Collection' : 'Create Collection'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Modal 2: Manage Sarees / Products in Collection */}
      {managingCol && (
        <AdminModal
          isOpen={!!managingCol}
          onClose={() => setManagingCol(null)}
          title={`Assign Sarees to "${managingCol.name}"`}
          maxWidth="720px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="admin-modal-body" style={{ maxHeight: 'calc(85vh - 130px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Check the sarees that belong to this collection. Selected items will appear in the "Shop By" megamenu and homepage edits.
                  </p>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '4px', display: 'block' }}>
                    {assignedProductIds.length} of {allProducts.length} Sarees Selected
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAssignedProductIds(allProducts.map(p => p.id))}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignedProductIds([])}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Product Search Box */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="Search products by title, SKU, or category..."
                  className="input"
                  style={{ width: '100%', paddingLeft: '36px' }}
                />
              </div>

              {/* Scrollable Product List */}
              <div style={{
                maxHeight: '320px',
                overflowY: 'auto',
                border: '1px solid var(--brand-border)',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {searchedProducts.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                    No products matched your search.
                  </div>
                ) : (
                  searchedProducts.map(product => {
                    const isChecked = assignedProductIds.includes(product.id);
                    const thumb = Array.isArray(product.images) && product.images.length > 0 
                      ? product.images[0] 
                      : '/saree_model_individual.jpg';

                    return (
                      <label
                        key={product.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--brand-border)',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setAssignedProductIds(prev => 
                                prev.includes(product.id)
                                  ? prev.filter(id => id !== product.id)
                                  : [...prev, product.id]
                              );
                            }}
                            style={{ accentColor: '#d4af37', width: '18px', height: '18px', cursor: 'pointer' }}
                          />

                          <div style={{ width: '44px', height: '44px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--brand-border)', flexShrink: 0 }}>
                            <img 
                              src={thumb} 
                              alt={product.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                e.currentTarget.src = DEFAULT_BANNER_IMAGE;
                              }}
                            />
                          </div>

                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 700, color: '#d4af37' }}>SKU: {product.sku || 'N/A'}</span>
                              <span>•</span>
                              <span>{product.category || 'Silk Saree'}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '10px' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                            ₹{(product.price || 0).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: (product.stock || 0) > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {(product.stock || 0) > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Docked Modal Actions Footer */}
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setManagingCol(null)}
                className="btn btn-secondary"
                disabled={isSavingProducts}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignedProducts}
                className="btn btn-primary"
                disabled={isSavingProducts}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                {isSavingProducts && <Loader2 size={16} className="animate-spin" />}
                Save Assigned Sarees ({assignedProductIds.length})
              </button>
            </div>
          </div>
        </AdminModal>
      )}

    </div>
  );
};
