import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { useNotification } from '@/shared/context/NotificationContext';
import { Product, Category } from '@/types';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Star, 
  X, 
  Image as ImageIcon,
  Upload,
  ArrowUp,
  Link as LinkIcon,
  Database,
  RefreshCw
} from 'lucide-react';
import { isLiveFirebase } from '@/lib/firebase/firebase';
import { compressImageFile } from '@/shared/utils/imageCompressor';

export const AdminProducts: React.FC = () => {
  useDocumentTitle('MUETY Admin | Products');
  const { success, warning, error } = useNotification();

  const [products, setProducts] = useState<Product[]>(storageService.getProducts());
  const [categories, setCategories] = useState<Category[]>(storageService.getCategories());
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState<number>(250);
  const [origPrice, setOrigPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [sku, setSku] = useState('');
  const [categoryName, setCategoryName] = useState('Festive Silk Sarees');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [colorsText, setColorsText] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [featured, setFeatured] = useState(false);
  const [newArrival, setNewArrival] = useState(false);

  // Multi-Photo File Upload Handler with Auto-Compression (Up to 5 images)
  const handleMultipleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      warning('Maximum of 5 images allowed per product.');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    let loadedCount = 0;

    for (const file of filesToProcess) {
      if (file.size > 15 * 1024 * 1024) {
        warning(`File "${file.name}" exceeds 15MB limit.`);
        continue;
      }
      try {
        const compressedUrl = await compressImageFile(file, 1200, 1200, 0.8);
        setImages(prev => prev.length < 5 ? [...prev, compressedUrl] : prev);
        loadedCount++;
      } catch (err) {
        console.warn('Image processing error:', err);
      }
    }

    if (loadedCount > 0) {
      success(`Optimized and loaded ${loadedCount} photo(s) into product gallery.`, 'Gallery Updated');
    }

    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) {
      warning('Please enter a valid image URL.');
      return;
    }
    if (images.length >= 5) {
      warning('Maximum of 5 images allowed per product.');
      return;
    }
    setImages(prev => [...prev, trimmed]);
    setNewImageUrl('');
    success('Image URL added to gallery.', 'Photo Added');
  };

  const handleAddPreset = (url: string) => {
    if (images.length >= 5) {
      warning('Maximum of 5 images allowed per product.');
      return;
    }
    setImages(prev => [...prev, url]);
    success('Preset photo added to gallery.', 'Photo Added');
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      copy.unshift(selected);
      return copy;
    });
    success('Primary display photo updated.', 'Gallery Reordered');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Sync Products to Firebase Cloud Firestore
  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await productService.syncAllToFirebase();
      if (res.success) {
        success(res.message || `Successfully synchronized ${res.count} product(s) to Firestore Cloud!`, 'Firebase Synchronized');
      } else {
        error(res.message || 'Failed to sync to Firebase.');
      }
    } catch (err: any) {
      console.error('Firebase sync error:', err);
      error(err?.message || 'Failed to sync to Firebase Firestore.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Subscribe in Real-time to Firestore "products" collection as single source of truth
    const unsubscribe = productService.subscribeToProducts((updated) => {
      setProducts(updated);
      setCategories(storageService.getCategories());
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const filteredProducts = products.filter(p => {
    const titleToSearch = (p.title || p.name || '').toLowerCase();
    const matchSearch = titleToSearch.includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === 'all' || (p.categorySlug || '').toLowerCase() === selectedCat.toLowerCase();
    return matchSearch && matchCat;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setShortDesc('');
    setDesc('');
    setPrice(18500);
    setOrigPrice(24500);
    setStock(15);
    setSku(`MUETY-${Math.floor(100 + Math.random() * 900)}`);
    setCategoryName(categories[0]?.name || 'Festive Silk Sarees');
    setImages(['https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80']);
    setNewImageUrl('');
    setColorsText('Crimson Red, Royal Gold');
    setSizesText('');
    setFeatured(false);
    setNewArrival(true);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.title || p.name);
    setShortDesc(p.shortDescription || '');
    setDesc(p.description || '');
    setPrice(p.price);
    setOrigPrice(p.originalPrice || 0);
    setStock(p.stock !== undefined ? p.stock : (p.inventory !== undefined ? p.inventory : 10));
    setSku(p.sku);
    setCategoryName(p.category);
    setImages(p.images && p.images.length > 0 ? [...p.images] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80']);
    setNewImageUrl('');
    setColorsText(p.colors ? p.colors.join(', ') : '');
    setSizesText(p.sizes ? p.sizes.join(', ') : '');
    setFeatured(!!p.featured);
    setNewArrival(!!p.isNewArrival);
    setModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (window.confirm(`Are you sure you want to delete "${prodName}" from MUETY inventory and Firebase?`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      try {
        await productService.deleteProduct(id);
        success(`Product "${prodName}" removed from catalog and Firebase.`, 'Product Deleted');
      } catch (err: any) {
        error(err?.message || 'Failed to delete product from Firebase.');
      }
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !sku) {
      warning('Please provide a product title, SKU, and price.');
      return;
    }

    if (images.length === 0) {
      warning('Please add at least 1 photo for this product.');
      return;
    }

    setIsSaving(true);

    try {
      const matchedCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase()) || categories[0] || { name: categoryName, slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') };
      const colors = colorsText ? colorsText.split(',').map(s => s.trim()).filter(Boolean) : [];
      const sizes = sizesText ? sizesText.split(',').map(s => s.trim()).filter(Boolean) : [];

      const discountPercentage = origPrice && origPrice > price 
        ? Math.round(((origPrice - price) / origPrice) * 100) 
        : undefined;

      if (editingProduct) {
        const updated: Product = {
          ...editingProduct,
          name,
          title: name,
          shortDescription: shortDesc || 'Exquisite handcrafted MUETY piece.',
          description: desc || 'Individually verified and numbered creation from the MUETY atelier.',
          price: Number(price),
          originalPrice: origPrice > 0 ? Number(origPrice) : undefined,
          discountPercentage,
          stock: Number(stock),
          inventory: Number(stock),
          status: Number(stock) > 0 ? 'active' : 'out_of_stock',
          sku,
          category: matchedCat.name,
          categorySlug: matchedCat.slug,
          images: images.slice(0, 5),
          colors: colors.length > 0 ? colors : undefined,
          sizes: sizes.length > 0 ? sizes : undefined,
          featured,
          isNewArrival: newArrival
        };
        await productService.updateProduct(updated);
        success('Product updated successfully', 'Product Saved');
      } else {
        await productService.createProduct({
          name,
          title: name,
          shortDescription: shortDesc || 'Exquisite handcrafted MUETY piece.',
          description: desc || 'Individually verified and numbered creation from the MUETY atelier.',
          price: Number(price),
          originalPrice: origPrice > 0 ? Number(origPrice) : undefined,
          discountPercentage,
          rating: 5.0,
          reviewCount: 0,
          stock: Number(stock),
          inventory: Number(stock),
          status: Number(stock) > 0 ? 'active' : 'out_of_stock',
          sku,
          category: matchedCat.name,
          categorySlug: matchedCat.slug,
          images: images.slice(0, 5),
          featured,
          isNewArrival: newArrival,
          tags: [matchedCat.slug, 'luxury', 'atelier'],
          colors: colors.length > 0 ? colors : undefined,
          sizes: sizes.length > 0 ? sizes : undefined,
          specifications: {
            'Origin': 'Handcrafted in Atelier',
            'Material': 'Signature MUETY Material',
            'Warranty': '2 Years International Guarantee'
          }
        });
        success('Product added successfully', 'Product Created');
      }

      setModalOpen(false);
      setEditingProduct(null);
      setName('');
      setShortDesc('');
      setDesc('');
      setPrice(250);
      setOrigPrice(0);
      setStock(10);
      setSku('');
      setImages([]);
      setNewImageUrl('');
      setColorsText('');
      setSizesText('');
      setFeatured(false);
      setNewArrival(false);
    } catch (err: any) {
      console.error('Save product error:', err);
      error(err?.message || 'Failed to save product to Firebase. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-products animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Top Header & Quick Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0 }}>
              Products Inventory
            </h1>
            <span className={`badge badge-${isLiveFirebase ? 'success' : 'gold'}`} style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} /> {isLiveFirebase ? 'FIRESTORE CLOUD ACTIVE' : 'LOCAL CACHE / AUTO-SYNC'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Manage creations, stock levels, multi-photo galleries (up to 5 images), and variant attributes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleSyncToCloud}
            disabled={isSyncing}
            className="btn btn-outline btn-md"
            title="Synchronize and refresh all products with Firebase Cloud Firestore"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff' }}
          >
            <RefreshCw size={16} color="#2563eb" className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud Database'}
          </button>

          <button onClick={openCreateModal} className="btn btn-primary btn-md">
            <Plus size={18} /> Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by title, SKU, or atelier..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setSelectedCat('all')} 
            className={`btn btn-sm ${selectedCat === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            All Ateliers ({products.length})
          </button>
          {categories.map(cat => {
            const count = products.filter(p => 
              ((p.categorySlug || '').toLowerCase() === (cat.slug || '').toLowerCase()) ||
              ((p.category || '').toLowerCase() === (cat.name || '').toLowerCase())
            ).length;
            return (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCat(cat.slug)} 
                className={`btn btn-sm ${selectedCat === cat.slug ? 'btn-primary' : 'btn-outline'}`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Products Inventory Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--brand-border)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--brand-muted)' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Product & Photos</th>
                <th style={{ padding: '1rem 1rem' }}>Category</th>
                <th style={{ padding: '1rem 1rem' }}>SKU</th>
                <th style={{ padding: '1rem 1rem' }}>Price</th>
                <th style={{ padding: '1rem 1rem' }}>Inventory</th>
                <th style={{ padding: '1rem 1rem' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--brand-muted)' }}>
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  const prodImages = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images : ['/saree_model_individual.jpg'];
                  const prodPrice = Number(prod.price) || 0;
                  const prodOrigPrice = prod.originalPrice ? Number(prod.originalPrice) : null;
                  const currentStock = Number(prod.stock !== undefined ? prod.stock : (prod.inventory || 0));

                  return (
                    <tr key={prod.id} style={{ borderBottom: '1px solid var(--brand-border)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid var(--brand-border)', flexShrink: 0 }}>
                            <img 
                              src={prodImages[0]} 
                              alt={prod.name || prod.title || 'Product'} 
                              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} 
                            />
                            {prodImages.length > 1 && (
                              <span style={{ position: 'absolute', bottom: '2px', right: '2px', backgroundColor: 'rgba(15,23,42,0.85)', color: '#ffffff', fontSize: '9px', fontWeight: 800, padding: '1px 3px', borderRadius: '3px' }}>
                                +{prodImages.length - 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--brand-primary)', display: 'block' }}>{prod.name || prod.title || 'Untitled'}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>
                              {prodImages.length} photo{prodImages.length > 1 ? 's' : ''} in gallery
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1rem' }}>
                        <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>{prod.category || 'Atelier'}</span>
                      </td>
                      <td style={{ padding: '1rem 1rem', fontFamily: 'monospace', color: 'var(--brand-muted)', fontSize: '0.85rem' }}>
                        {prod.sku || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        ₹{prodPrice.toFixed(2)}
                        {prodOrigPrice !== null && prodOrigPrice > prodPrice && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--brand-muted)', textDecoration: 'line-through', marginLeft: '6px', fontWeight: 400 }}>
                            ₹{prodOrigPrice.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1rem' }}>
                        <span style={{ 
                          fontWeight: 600, 
                          color: currentStock <= 3 ? '#ef4444' : currentStock <= 10 ? '#f59e0b' : '#10b981' 
                        }}>
                          {currentStock} in stock
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {prod.featured && <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Featured</span>}
                          {prod.isNewArrival && <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>New</span>}
                          {!prod.featured && !prod.isNewArrival && <span style={{ color: 'var(--brand-muted)', fontSize: '0.8rem' }}>Standard</span>}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            onClick={() => openEditModal(prod)} 
                            className="btn btn-outline btn-sm"
                            title="Edit creation"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(prod.id, prod.name || prod.title || 'Product')} 
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                            title="Delete product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULLY RESPONSIVE CREATE / EDIT PRODUCT MODAL */}
      {modalOpen && (
        <div 
          className="admin-modal-overlay"
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            className="admin-modal-dialog"
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--brand-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0 }}>
                  {editingProduct ? 'Edit MUETY Creation' : 'Add New Atelier Piece'}
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                  Upload up to 5 high-resolution photography angles & configure variants.
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ 
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--brand-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <form id="product-form" onSubmit={handleSaveProduct} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Product Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Product Name *</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. MUETY Royal Chrono Platinum" 
                  className="form-input" 
                />
              </div>

              {/* Category & SKU */}
              <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category Atelier *</label>
                  <select 
                    value={categoryName} 
                    onChange={e => setCategoryName(e.target.value)} 
                    className="form-select"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">SKU Identifier *</label>
                  <input 
                    type="text" 
                    required 
                    value={sku} 
                    onChange={e => setSku(e.target.value)} 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sale Price (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    value={price} 
                    onChange={e => setPrice(Number(e.target.value))} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Original / List Price (₹)</label>
                  <input 
                    type="number" 
                    min={0} 
                    value={origPrice} 
                    onChange={e => setOrigPrice(Number(e.target.value))} 
                    placeholder="Optional" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Inventory Units *</label>
                  <input 
                    type="number" 
                    required 
                    min={0} 
                    value={stock} 
                    onChange={e => setStock(Number(e.target.value))} 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* PRODUCT PHOTOGRAPHY GALLERY: UP TO 5 IMAGES */}
              <div style={{
                backgroundColor: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--brand-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={17} color="var(--brand-accent-hover)" />
                      Product Photography Gallery ({images.length}/5)
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--brand-muted)' }}>
                      First image is used as the primary catalog thumbnail. Click an image to make it primary.
                    </span>
                  </div>
                  <span className={`badge badge-${images.length >= 5 ? 'gold' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                    {images.length}/5 Slots Used
                  </span>
                </div>

                {/* Visual 5-Slot Thumbnails Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '10px'
                }} className="image-slots-grid">
                  {[0, 1, 2, 3, 4].map(index => {
                    const img = images[index];
                    return (
                      <div
                        key={index}
                        style={{
                          aspectRatio: '1/1',
                          borderRadius: 'var(--radius-md)',
                          border: img ? '2px solid var(--brand-border)' : '2px dashed #cbd5e1',
                          backgroundColor: '#ffffff',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {img ? (
                          <>
                            <img 
                              src={img} 
                              alt={`Slot ${index + 1}`} 
                              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} 
                            />
                            {index === 0 && (
                              <span style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                backgroundColor: '#d4af37',
                                color: '#0f172a',
                                fontSize: '9px',
                                fontWeight: 800,
                                padding: '2px 4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                <Star size={9} fill="#0f172a" /> MAIN
                              </span>
                            )}

                            <span style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              backgroundColor: 'rgba(15,23,42,0.75)',
                              color: '#ffffff',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: '3px'
                            }}>
                              #{index + 1}
                            </span>

                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'rgba(15, 23, 42, 0.65)',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '4px'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                            >
                              {index !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryImage(index)}
                                  style={{
                                    backgroundColor: '#d4af37',
                                    color: '#0f172a',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                  title="Make Primary Photo"
                                >
                                  <ArrowUp size={11} /> Top
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                                title="Remove photo"
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            </div>
                          </>
                        ) : (
                          <label style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--brand-muted)',
                            padding: '4px',
                            textAlign: 'center'
                          }}>
                            <Plus size={18} color="#94a3b8" />
                            <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>Slot {index + 1}</span>
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              onChange={handleMultipleFileUpload} 
                              style={{ display: 'none' }} 
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Upload & Add URL Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid var(--brand-primary)',
                      borderRadius: 'var(--radius-md)',
                      cursor: images.length >= 5 ? 'not-allowed' : 'pointer',
                      opacity: images.length >= 5 ? 0.6 : 1,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--brand-primary)'
                    }}>
                      <Upload size={16} color="var(--brand-accent-hover)" />
                      <span>Upload Photos from Device (Multi-select)</span>
                      <input 
                        type="file" 
                        multiple 
                        disabled={images.length >= 5}
                        accept="image/*" 
                        onChange={handleMultipleFileUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>

                    <span style={{ fontSize: '0.8rem', color: 'var(--brand-muted)' }}>
                      Supports PNG, JPG, WEBP (Up to 5 photos)
                    </span>
                  </div>

                  {/* Or Paste Image URL */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <LinkIcon size={15} color="var(--brand-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="url" 
                        value={newImageUrl} 
                        onChange={e => setNewImageUrl(e.target.value)} 
                        placeholder="Or paste image URL (https://...) and click Add" 
                        className="form-input" 
                        disabled={images.length >= 5}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem 0.5rem 2rem' }} 
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddImageUrl();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={images.length >= 5 || !newImageUrl.trim()}
                      onClick={handleAddImageUrl}
                      className="btn btn-secondary btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      + Add URL
                    </button>
                  </div>
                </div>

                {/* Quick Luxury Preset Photos */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-muted)', display: 'block', marginBottom: '4px' }}>
                    CLICK TO INSERT LUXURY PRESET ANGLE:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: '⌚ Gold Watch', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80' },
                      { label: '⌚ Dial Close-up', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80' },
                      { label: '💼 Leather Bag', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80' },
                      { label: '🧥 Cashmere Coat', url: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1000&q=80' },
                      { label: '🕶️ Sunglasses', url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80' },
                      { label: '🧴 Perfume', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=80' }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={images.length >= 5}
                        onClick={() => handleAddPreset(preset.url)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--brand-border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: images.length >= 5 ? 'not-allowed' : 'pointer',
                          opacity: images.length >= 5 ? 0.5 : 1
                        }}
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color and Size Variants */}
              <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Color Variants (comma-separated)</label>
                  <input 
                    type="text" 
                    value={colorsText} 
                    onChange={e => setColorsText(e.target.value)} 
                    placeholder="Obsidian Black, Champagne Gold" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Size Variants (comma-separated)</label>
                  <input 
                    type="text" 
                    value={sizesText} 
                    onChange={e => setSizesText(e.target.value)} 
                    placeholder="S, M, L, XL" 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Short Tagline */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Short Tagline Description</label>
                <input 
                  type="text" 
                  value={shortDesc} 
                  onChange={e => setShortDesc(e.target.value)} 
                  placeholder="Concise one-liner for cards" 
                  className="form-input" 
                />
              </div>

              {/* Full Description */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Master Description</label>
                <textarea 
                  rows={3} 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)} 
                  placeholder="Detailed material story, movements, leather origin..." 
                  className="form-textarea" 
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '2rem', padding: '6px 0', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={featured} 
                    onChange={e => setFeatured(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: '#0f172a' }} 
                  />
                  Feature on Homepage
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={newArrival} 
                    onChange={e => setNewArrival(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: '#0f172a' }} 
                  />
                  Mark as New Arrival
                </label>
              </div>
            </form>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--brand-border)',
              backgroundColor: 'var(--bg-main)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0
            }}>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)} 
                disabled={isSaving}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="product-form"
                disabled={isSaving}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Saving to Firebase...
                  </>
                ) : (
                  editingProduct ? 'Save Changes' : 'Add Product'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .responsive-grid-2,
          .responsive-grid-3 {
            grid-template-columns: 1fr !important;
          }
          .image-slots-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .admin-modal-dialog {
            max-height: 96vh !important;
          }
        }
        @media (max-width: 480px) {
          .image-slots-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
};
