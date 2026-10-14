import React, { useState, useEffect, useRef } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Category } from '@/types';
import { auth, db } from '@/lib/firebase/firebase';
import { collection, doc } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/media/cloudinary';
import { 
  generateCategoryCodeSuggestion, 
  validateCategoryCode, 
  isCategoryCodeUnique, 
  isCategoryCodeLocked 
} from '@/features/catalog/services/categoryCodeService';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { Plus, Trash2, Edit3, X, Upload, Image as ImageIcon, Loader2, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';

export const AdminCategories: React.FC = () => {
  useDocumentTitle('MUETY Admin | Categories');
  const { user } = useAuth();
  const { success, warning, error } = useNotification();

  const [categories, setCategories] = useState<Category[]>(() => productService.getCategories());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [codeStatus, setCodeStatus] = useState<{ valid: boolean; message?: string; isCollision?: boolean }>({ valid: true });

  const [description, setDescription] = useState('');
  const [isTrending, setIsTrending] = useState(false);
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = productService.subscribeToCategories(
      (liveCats) => {
        setCategories(liveCats);
      },
      (err) => {
        console.error('[AdminCategories] Firestore subscription error:', err);
        error(`Firestore category live subscription failed: ${err.message || 'Permission denied.'}`, 'Firestore Read Error');
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    const currentFbUser = auth?.currentUser;
    if (import.meta.env.DEV && currentFbUser) {
      currentFbUser.getIdTokenResult(true).then((tokenResult) => {
        const claims = tokenResult.claims;
        const rolesArr: string[] = Array.isArray(claims.roles)
          ? (claims.roles as string[])
          : (typeof claims.role === 'string' ? [claims.role] : (user?.roles || []));
        const resRole = rolesArr[0] || user?.role || 'customer';
        console.log('[MUETY AUTH DIAGNOSTIC]', {
          uid: currentFbUser.uid,
          email: currentFbUser.email,
          emailVerified: currentFbUser.emailVerified,
          customClaims: claims,
          resolvedRole: resRole,
          isSuperAdmin: rolesArr.includes('superadmin') || rolesArr.includes('super_admin'),
          isAdmin: rolesArr.includes('superadmin') || rolesArr.includes('super_admin') || rolesArr.includes('admin'),
          isCatalogManager: rolesArr.includes('superadmin') || rolesArr.includes('super_admin') || rolesArr.includes('admin') || rolesArr.includes('catalog_manager')
        });
      }).catch(err => {
        console.warn('[MUETY AUTH DIAGNOSTIC ERROR]', err);
      });
    }
  }, [user]);

  const [formError, setFormError] = useState<string | null>(null);

  const checkCodeLive = async (code: string, currentCatId?: string) => {
    const val = validateCategoryCode(code);
    if (!val.valid) {
      setCodeStatus({ valid: false, message: val.error });
      return;
    }
    const unique = await isCategoryCodeUnique(code, currentCatId);
    if (!unique) {
      setCodeStatus({ 
        valid: false, 
        message: '⚠ This category code is already used by another category.',
        isCollision: true 
      });
    } else {
      setCodeStatus({ valid: true, message: '✓ Available' });
    }
  };

  useEffect(() => {
    if (modalOpen && categoryCode && !isLocked) {
      checkCodeLive(categoryCode, editingCat?.id);
    }
  }, [categoryCode, modalOpen, editingCat, isLocked]);

  const DEFAULT_CATEGORY_IMAGE = '/saree_model_individual.jpg';

  const openCreateModal = () => {
    setEditingCat(null);
    setName('');
    setCategoryCode('');
    setCodeTouched(false);
    setIsLocked(false);
    setCodeStatus({ valid: true });
    setDescription('');
    setIsTrending(false);
    setImage('');
    setImagePreview('');
    setSelectedFile(null);
    setIsSaving(false);
    setUploading(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    const existingCode = cat.categoryCode || generateCategoryCodeSuggestion(cat.name);
    setCategoryCode(existingCode);
    setCodeTouched(true);
    const locked = isCategoryCodeLocked(cat.id);
    setIsLocked(locked);
    setCodeStatus({ valid: true, message: locked ? '🔒 Identifier Locked' : '✓ Available' });
    setDescription(cat.description);
    setIsTrending(Boolean(cat.isTrending));
    setImage(cat.imageUrl || cat.image || '');
    setImagePreview('');
    setSelectedFile(null);
    setIsSaving(false);
    setUploading(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setFormError(null);
    if (!editingCat && !codeTouched) {
      const suggested = generateCategoryCodeSuggestion(val);
      setCategoryCode(suggested);
    }
  };

  const handleCodeChange = (val: string) => {
    if (isLocked) return;
    const clean = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    setCategoryCode(clean);
    setCodeTouched(true);
    setFormError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[CATEGORY IMAGE] file selected for temporary preview', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      const errMsg = 'Invalid file format. Only JPG, PNG, and WEBP images are allowed.';
      setFormError(errMsg);
      warning(errMsg);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const errMsg = 'File size exceeds maximum limit of 10MB.';
      setFormError(errMsg);
      warning(errMsg);
      return;
    }

    setSelectedFile(file);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      console.log('[CATEGORY IMAGE] local preview generated', {
        previewUrl: dataUrl.slice(0, 60) + '...'
      });
    };
    reader.onerror = () => {
      setFormError('Failed to read image file.');
      error('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (window.confirm(`Delete category "${catName}"?`)) {
      try {
        await productService.deleteCategory(id);
        await auditService.logAction({
          actorUid: user?.uid || 'admin',
          actorEmail: user?.email || 'superadmin@muety.in',
          actorRole: (user?.roles?.[0] as any) || 'superadmin',
          action: 'CATEGORY_DELETED',
          entityType: 'CATEGORY',
          entityId: id,
          before: { id, name: catName }
        });
        success(`Category "${catName}" deleted.`, 'Category Removed');
      } catch (err: any) {
        error(err?.message || 'Failed to delete category.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || uploading) return;

    setFormError(null);
    const cleanName = name.trim();
    const cleanCode = categoryCode.trim().toUpperCase();
    const cleanDesc = description.trim();
    const invalidWords = ['get', 'test', 'abc', '123'];

    if (cleanName.length < 3 || invalidWords.includes(cleanName.toLowerCase())) {
      const errMsg = 'Please enter a descriptive category title (minimum 3 characters).';
      setFormError(errMsg);
      warning(errMsg);
      return;
    }

    const valCode = validateCategoryCode(cleanCode);
    if (!valCode.valid) {
      setFormError(valCode.error || 'Invalid category code.');
      warning(valCode.error || 'Invalid category code.');
      return;
    }

    const unique = await isCategoryCodeUnique(cleanCode, editingCat?.id);
    if (!unique) {
      const collisionMsg = '⚠ Category code is already used by another category. Please select a unique 2-letter code.';
      setFormError(collisionMsg);
      warning(collisionMsg);
      return;
    }

    if (cleanDesc.length < 10 || invalidWords.includes(cleanDesc.toLowerCase())) {
      const errMsg = 'Please enter a meaningful editorial description (minimum 10 characters).';
      setFormError(errMsg);
      warning(errMsg);
      return;
    }

    const rawImageUrl = image.trim();
    if (!selectedFile && !rawImageUrl) {
      const errMsg = 'Please select a cover photography file or enter a valid HTTPS image URL.';
      setFormError(errMsg);
      warning(errMsg);
      return;
    }

    if (rawImageUrl.startsWith('data:') || rawImageUrl.startsWith('blob:') || rawImageUrl.startsWith('file:')) {
      const errMsg = 'Base64 data URIs or Blob URLs cannot be saved as permanent image URLs. Please upload an image file to Cloudinary.';
      setFormError(errMsg);
      warning(errMsg);
      return;
    }

    setIsSaving(true);

    try {
      let finalImageUrl = rawImageUrl;
      const categoryId = editingCat?.id || (db ? doc(collection(db, 'categories')).id : `cat_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

      if (selectedFile) {
        setUploading(true);
        const pubId = `category_${categoryId}_${Date.now()}`;
        try {
          const res = await uploadToCloudinary(selectedFile, { folder: 'muety/categories', publicId: pubId });
          if (res && res.url && res.url.startsWith('https://')) {
            finalImageUrl = res.url;
            console.log('[CATEGORY IMAGE] Upload success', {
              publicId: res.publicId || pubId,
              secureUrl: res.url
            });
          } else {
            throw new Error('Cloudinary upload did not return a valid HTTPS secure URL.');
          }
        } catch (uploadErr: any) {
          console.error('[CATEGORY IMAGE] Cloudinary upload failed:', uploadErr);
          const rawMsg = uploadErr?.message || '';
          let uploadErrMsg = 'Category image upload failed. Please try again.';
          if (rawMsg.includes('unavailable') || rawMsg.includes('FAILED_PRECONDITION') || rawMsg.includes('configuration is unavailable')) {
            uploadErrMsg = 'Cloudinary upload configuration is unavailable.';
          } else if (rawMsg.includes('Invalid Signature') || rawMsg.includes('401') || rawMsg.includes('403') || rawMsg.includes('failed')) {
            uploadErrMsg = 'Category image upload failed. Please try again.';
          }
          setFormError(uploadErrMsg);
          error(uploadErrMsg, 'Cloudinary Upload Failure');
          return;
        } finally {
          setUploading(false);
        }
      }

      if (!finalImageUrl || 
          finalImageUrl.startsWith('data:') || 
          finalImageUrl.startsWith('blob:') || 
          finalImageUrl.startsWith('file:')) {
        const validationErrMsg = 'Category image upload did not return a permanent image URL.';
        setFormError(validationErrMsg);
        error(validationErrMsg);
        return;
      }

      console.log('[CATEGORY IMAGE] Firestore payload', {
        categoryId,
        name: cleanName,
        imageUrl: finalImageUrl
      });

      let categoryResult: Category;

      if (editingCat) {
        const updated: Category = {
          ...editingCat,
          id: categoryId,
          name: cleanName,
          categoryCode: cleanCode,
          slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          description: cleanDesc,
          image: finalImageUrl,
          imageUrl: finalImageUrl,
          isTrending: isTrending
        };
        categoryResult = await productService.updateCategory(updated);
        console.log('[MUETY CATEGORY DIAGNOSTIC] CATEGORY WRITE SUCCESS', categoryResult.id);

        try {
          await auditService.logAction({
            actorUid: user?.uid || 'admin',
            actorEmail: user?.email || 'superadmin@muety.in',
            actorRole: (user?.roles?.[0] as any) || 'superadmin',
            action: 'CATEGORY_UPDATED',
            entityType: 'CATEGORY',
            entityId: categoryResult.id,
            before: editingCat,
            after: categoryResult
          });
        } catch (auditErr: any) {
          console.error('[MUETY CATEGORY DIAGNOSTIC] CATEGORY AUDIT ERROR:', auditErr?.code || auditErr?.message, auditErr);
        }
        success(`Category "${cleanName}" saved to Firestore.`, 'Category Saved');
      } else {
        categoryResult = await productService.addCategory(cleanName, cleanDesc, finalImageUrl, cleanCode, categoryId);
        if (isTrending) {
          categoryResult = await productService.updateCategory({ ...categoryResult, isTrending: true });
        }
        console.log('[MUETY CATEGORY DIAGNOSTIC] CATEGORY WRITE SUCCESS', categoryResult.id);

        try {
          await auditService.logAction({
            actorUid: user?.uid || 'admin',
            actorEmail: user?.email || 'superadmin@muety.in',
            actorRole: (user?.roles?.[0] as any) || 'superadmin',
            action: 'CATEGORY_CREATED',
            entityType: 'CATEGORY',
            entityId: categoryResult.id,
            after: categoryResult
          });
        } catch (auditErr: any) {
          console.error('[MUETY CATEGORY DIAGNOSTIC] CATEGORY AUDIT ERROR:', auditErr?.code || auditErr?.message, auditErr);
        }
        success(`Category "${cleanName}" created and saved to Firestore.`, 'Category Created');
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('[MUETY CATEGORY DIAGNOSTIC] CATEGORY WRITE ERROR:', err?.code || err?.message, err);
      const errMsg = err?.code === 'permission-denied'
        ? 'Category save failed: Missing or insufficient permissions.'
        : (err?.message || 'Failed to save category to Firestore.');
      setFormError(errMsg);
      error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const displayPreview = imagePreview || image;

  return (
    <div className="admin-categories animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>Category Architecture</h1>
            <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              FIRESTORE LIVE DATA
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Manage category hierarchy, cover imagery, and unique 2-letter SKU category codes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ gap: '1.5rem' }}>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '160px', position: 'relative' }}>
              <img 
                src={cat.imageUrl || cat.image || DEFAULT_CATEGORY_IMAGE} 
                alt={cat.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.currentTarget;
                  if (target.src !== DEFAULT_CATEGORY_IMAGE && !target.src.endsWith(DEFAULT_CATEGORY_IMAGE)) {
                    target.src = DEFAULT_CATEGORY_IMAGE;
                  }
                }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent)' }} />
              <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                {cat.isTrending && (
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', letterSpacing: '0.04em', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                    🔥 Trending
                  </span>
                )}
              </div>
              <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', letterSpacing: '0.05em' }}>
                  Code: {cat.categoryCode || 'XX'}
                </span>
              </div>
              <div style={{ position: 'absolute', bottom: '12px', left: '16px', color: '#ffffff' }}>
                <h4 style={{ color: '#ffffff', fontSize: '1.2rem', margin: 0 }}>{cat.name}</h4>
                <span style={{ fontSize: '0.75rem', color: '#d4af37', textTransform: 'uppercase', fontWeight: 700 }}>
                  Slug: {cat.slug}
                </span>
              </div>
            </div>

            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem', flex: 1 }}>
                {cat.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--brand-border)', paddingTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', fontWeight: 600 }}>
                  {cat.itemCount || 0} Pieces Active
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={async () => {
                      const nextVal = !cat.isTrending;
                      try {
                        await productService.updateCategory({ ...cat, isTrending: nextVal });
                        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isTrending: nextVal } : c));
                        success(`Category "${cat.name}" ${nextVal ? 'marked as Trending' : 'removed from Trending'} on launch page.`, 'Trending Updated');
                      } catch (err: any) {
                        error(`Failed to update trending status: ${err?.message || err}`);
                      }
                    }}
                    className={`btn btn-sm ${cat.isTrending ? 'btn-accent' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700 }}
                    title={cat.isTrending ? 'Remove from launch page Trending Collections' : 'Feature in launch page Trending Collections'}
                  >
                    {cat.isTrending ? '🔥 Trending' : '☆ Add Trending'}
                  </button>
                  <button onClick={() => openEditModal(cat)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} title="Edit Category">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(cat.id, cat.name)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }} title="Delete Category">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? 'Edit Category' : 'Create New Category'}
        subtitle="Configure title, identifier code, and cover photo"
        maxWidth="580px"
        disableClose={isSaving || uploading}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {formError && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: 'var(--radius-md)',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    {formError}
                  </div>
                )}

                <div className="grid-2" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category Title *</label>
                    <input 
                      type="text" 
                      required 
                      disabled={isSaving || uploading}
                      value={name} 
                      onChange={e => handleNameChange(e.target.value)} 
                      placeholder="e.g. Kanchipuram Silk Sarees" 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Category Code *</span>
                      {isLocked ? (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Lock size={12} /> Locked
                        </span>
                      ) : (
                        codeStatus.message && (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: codeStatus.isCollision ? '#dc2626' : (codeStatus.valid ? '#16a34a' : '#dc2626')
                          }}>
                            {codeStatus.message}
                          </span>
                        )
                      )}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        required 
                        maxLength={2}
                        disabled={isLocked || isSaving || uploading}
                        value={categoryCode} 
                        onChange={e => handleCodeChange(e.target.value)} 
                        placeholder="KV" 
                        className="form-input" 
                        style={{
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          fontFamily: 'monospace',
                          borderColor: !isLocked && codeStatus.isCollision ? '#dc2626' : undefined,
                          backgroundColor: (isLocked || isSaving || uploading) ? '#f1f5f9' : undefined,
                          cursor: (isLocked || isSaving || uploading) ? 'not-allowed' : 'text'
                        }}
                      />
                      {isLocked && (
                        <Lock size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: isLocked ? '#64748b' : (codeStatus.isCollision ? '#dc2626' : 'var(--text-secondary)'), marginTop: '4px', margin: 0 }}>
                      {isLocked 
                        ? 'This identifier is locked because it is used by product SKUs.'
                        : 'Unique 2-letter identifier used for product SKU generation.'
                      }
                    </p>
                  </div>
                </div>

                {/* Cloudinary Cover Image Uploader */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Cover Photography *</span>
                    <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Upload size={12} /> Powered by Cloudinary CDN
                    </span>
                  </label>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/jpeg,image/jpg,image/png,image/webp" 
                    style={{ display: 'none' }} 
                    disabled={isSaving || uploading}
                    onChange={handleFileChange} 
                  />

                  <div 
                    onClick={() => !isSaving && !uploading && fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      backgroundColor: '#f8fafc',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      cursor: (isSaving || uploading) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {uploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
                        <Loader2 className="animate-spin" size={28} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Uploading cover asset to Cloudinary CDN...</span>
                      </div>
                    ) : selectedFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={28} color="#10b981" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{selectedFile.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB - Ready for Upload)</span>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Upload size={20} />
                        </div>

                        <div>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            style={{ fontWeight: 700, pointerEvents: 'none' }}
                          >
                            Upload File to Cloudinary
                          </button>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                            Supports JPG, PNG, WEBP (Max 10MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* URL Input Fallback */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Or Image URL:</span>
                    </div>
                    <input 
                      type="text" 
                      disabled={isSaving || uploading}
                      value={image} 
                      onChange={e => { setImage(e.target.value); setFormError(null); }} 
                      placeholder="https://res.cloudinary.com/... or https://images.unsplash.com/..." 
                      className="form-input" 
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Live Image Preview */}
                  {displayPreview.trim() && (
                    <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#0f172a', position: 'relative' }}>
                      <div style={{ height: '130px', width: '100%', position: 'relative' }}>
                        <img src={displayPreview} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                        <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {imagePreview ? (
                            <>
                              <ImageIcon size={12} color="#38bdf8" /> Temporary Local Preview
                            </>
                          ) : image.includes('cloudinary.com') ? (
                            <>
                              <CheckCircle2 size={12} color="#10b981" /> Cloudinary CDN Active
                            </>
                          ) : (
                            <>
                              <ImageIcon size={12} /> Image Preview
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Editorial Description *</label>
                  <textarea 
                    rows={4} 
                    required 
                    disabled={isSaving || uploading}
                    value={description} 
                    onChange={e => { setDescription(e.target.value); setFormError(null); }} 
                    placeholder="Authentic handloom silk sarees crafted by master weavers..." 
                    className="form-textarea" 
                  />
                </div>

                {/* Trending Showcase Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: isTrending ? 'rgba(212, 175, 55, 0.08)' : '#f8fafc',
                  border: '1px solid',
                  borderColor: isTrending ? 'var(--brand-accent)' : '#e2e8f0',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--brand-primary)', cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={isTrending} 
                        onChange={e => setIsTrending(e.target.checked)} 
                        style={{ width: '16px', height: '16px', accentColor: 'var(--brand-accent)', cursor: 'pointer' }}
                      />
                      <span>Showcase in Launch Page Trending Collections</span>
                    </label>
                    <p style={{ margin: '3px 0 0 24px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      Display in the single-row circular category showcase on the storefront homepage.
                    </p>
                  </div>
                  {isTrending && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                      🔥 Trending
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="admin-modal-footer">
                <button 
                  type="button" 
                  disabled={isSaving || uploading} 
                  onClick={() => setModalOpen(false)} 
                  className="btn btn-outline"
                  style={{ fontWeight: 600, color: '#475569' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || uploading || (codeStatus.isCollision ?? false)} 
                  className="btn btn-primary" 
                  style={{ fontWeight: 700, minWidth: '160px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving Category...
                    </>
                  ) : (
                    'Save Category'
                  )}
                </button>
              </div>
            </form>
          </AdminModal>
    </div>
  );
};

