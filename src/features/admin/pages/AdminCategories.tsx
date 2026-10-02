import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { useNotification } from '@/shared/context/NotificationContext';
import { Category } from '@/types';
import { Plus, Trash2, Edit3, X, Cloud, Loader2 } from 'lucide-react';

export const AdminCategories: React.FC = () => {
  useDocumentTitle('MUETY Admin | Categories');
  const { success, warning, error } = useNotification();

  const [categories, setCategories] = useState<Category[]>(() => productService.getCategories());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    const unsubscribe = productService.subscribeToCategories((liveCats) => {
      setCategories(liveCats);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const openCreateModal = () => {
    setEditingCat(null);
    setName('');
    setDescription('');
    setImage('https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80');
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setDescription(cat.description);
    setImage(cat.image);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (window.confirm(`Delete category "${catName}"?`)) {
      await productService.deleteCategory(id);
      success(`Category "${catName}" deleted from Firestore.`, 'Category Removed');
    }
  };

  const handlePushAllToFirestore = async () => {
    setIsPushing(true);
    try {
      const result = await productService.pushAllCategoriesToFirestore();
      if (result.success) {
        success(result.message, 'Firestore Synchronized');
      } else {
        error(result.message, 'Sync Failed');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to push categories to Cloud Firestore.');
    } finally {
      setIsPushing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) {
      warning('Please provide a category title and description.');
      return;
    }

    if (editingCat) {
      const updated: Category = {
        ...editingCat,
        name,
        description,
        image
      };
      await productService.updateCategory(updated);
      success(`Category "${name}" updated in Firebase.`, 'Category Saved');
    } else {
      await productService.addCategory(name, description, image);
      success(`Category "${name}" created and synced to Firebase.`, 'Category Created');
    }

    setModalOpen(false);
  };

  return (
    <div className="admin-categories animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--brand-primary)', margin: 0 }}>Category Architecture</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              FIRESTORE "categories" SYNC ACTIVE
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Structure atelier categories, cover imagery, and showcase collections synced to Firebase Cloud.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handlePushAllToFirestore} 
            disabled={isPushing}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'var(--brand-accent)', color: 'var(--brand-primary)' }}
            title="Push all category records directly to Firebase Firestore collection 'categories'"
          >
            {isPushing ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} color="var(--brand-accent)" />}
            {isPushing ? 'Syncing to Cloud...' : `Push Categories to Cloud (${categories.length})`}
          </button>

          <button onClick={openCreateModal} className="btn btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ gap: '1.5rem' }}>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '160px', position: 'relative' }}>
              <img src={cat.image} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent)' }} />
              <div style={{ position: 'absolute', bottom: '12px', left: '16px', color: '#ffffff' }}>
                <h4 style={{ color: '#ffffff', fontSize: '1.2rem' }}>{cat.name}</h4>
                <span style={{ fontSize: '0.75rem', color: '#d4af37', textTransform: 'uppercase', fontWeight: 700 }}>
                  Slug: {cat.slug}
                </span>
              </div>
            </div>

            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem', flex: 1 }}>
                {cat.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--brand-border)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)', fontWeight: 600 }}>
                  {cat.itemCount} Pieces Active
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openEditModal(cat)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(cat.id, cat.name)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '560px',
              width: '100%',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-xl)',
              position: 'relative'
            }}
          >
            <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--brand-muted)' }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
              {editingCat ? 'Edit Category' : 'Create New Category'}
            </h2>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category Title *</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Fine Horology" 
                  className="form-input" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cover Photography URL</label>
                <input 
                  type="url" 
                  required 
                  value={image} 
                  onChange={e => setImage(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Editorial Description *</label>
                <textarea 
                  rows={3} 
                  required 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Short description of the artisanal pillar..." 
                  className="form-textarea" 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Category</button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
