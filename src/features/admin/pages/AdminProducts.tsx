import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { inventoryService } from '@/shared/services/inventoryService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Product, Category } from '@/types';
import { getUserRoles } from '@/shared/utils/permissions';
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
  RefreshCw,
  Info,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Search as SearchIcon,
  Globe,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { isLiveFirebase } from '@/lib/firebase/firebase';
import { compressImageFile } from '@/shared/utils/imageCompressor';

type ModalTab = 'basic' | 'pricing' | 'photography' | 'variants' | 'inventory' | 'textile' | 'seo' | 'publishing';

export const AdminProducts: React.FC = () => {
  useDocumentTitle('Products Atelier');
  const { user } = useAuth();
  const { success, warning, error } = useNotification();

  const [products, setProducts] = useState<Product[]>(storageService.getProducts());
  const [categories, setCategories] = useState<Category[]>(storageService.getCategories());
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState<number>(2500);
  const [origPrice, setOrigPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(5);
  const [stock, setStock] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [sku, setSku] = useState('');
  const [categoryName, setCategoryName] = useState('Kanchipuram Pure Silk Sarees');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [colorsText, setColorsText] = useState('');
  const [sizesText, setSizesText] = useState('');

  // Saree & Textile Specs
  const [silkType, setSilkType] = useState('Pure Mulberry Silk (Silk Mark Certified)');
  const [zariType, setZariType] = useState('Tested Gold Zari');
  const [borderType, setBorderType] = useState('Korvai Temple Border');
  const [palluType, setPalluType] = useState('Rich Heavy Contrast Pallu');
  const [weaveTechnique, setWeaveTechnique] = useState('Handloom Interlock Weave');
  const [craftsmanship, setCraftsmanship] = useState('Artisan Master Weaver');
  const [occasion, setOccasion] = useState('Bridal / Festive Celebration');
  const [careInstructions, setCareInstructions] = useState('Dry Clean Only. Store in pure cotton drape cover.');
  const [authenticityInformation, setAuthenticityInformation] = useState('Handloom Silk Mark Authenticity Certified');

  // SEO & Visibility
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [bestseller, setBestseller] = useState(false);

  const loadCatalogData = () => {
    setProducts(productService.getAllProducts());
    setCategories(storageService.getCategories());
  };

  useEffect(() => {
    loadCatalogData();
    const unsub = productService.subscribeToProducts((liveProducts) => {
      setProducts(liveProducts);
      setCategories(storageService.getCategories());
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await productService.syncAllToFirebase();
      success(`Uploaded ${res.count} products to Firebase Cloud Firestore!`, 'Firestore Sync');
      loadCatalogData();
    } catch (err: any) {
      error(err?.message || 'Failed to sync to Firebase');
    } finally {
      setIsSyncing(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setActiveTab('basic');
    setName('');
    setShortDesc('');
    setDesc('');
    setPrice(3500);
    setOrigPrice(4500);
    setTaxRate(5);
    setStock(10);
    setLowStockThreshold(3);
    setSku(`MUETY-SR-${Math.floor(100 + Math.random() * 900)}`);
    setCategoryName(categories[0]?.name || 'Festive Silk Sarees');
    setImages([]);
    setNewImageUrl('');
    setColorsText('Royal Crimson, Gold Zari');
    setSizesText('Free Size (5.5m + Blouse)');
    setSilkType('Pure Mulberry Silk (Silk Mark Certified)');
    setZariType('Tested Gold Zari');
    setBorderType('Korvai Temple Border');
    setPalluType('Rich Heavy Contrast Pallu');
    setWeaveTechnique('Handloom Interlock Weave');
    setCraftsmanship('Artisan Master Weaver');
    setOccasion('Bridal / Festive');
    setCareInstructions('Dry Clean Only.');
    setAuthenticityInformation('Handloom Silk Mark Certified');
    setSeoTitle('');
    setSeoDescription('');
    setPublished(true);
    setFeatured(false);
    setNewArrival(true);
    setBestseller(false);
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setActiveTab('basic');
    setName(prod.name || prod.title || '');
    setShortDesc(prod.shortDescription || '');
    setDesc(prod.description || '');
    setPrice(prod.price || prod.salePrice || 0);
    setOrigPrice(prod.originalPrice || prod.mrp || 0);
    setTaxRate(prod.taxRate || 5);
    setStock(prod.stock !== undefined ? prod.stock : 10);
    setLowStockThreshold(prod.lowStockThreshold || 3);
    setSku(prod.sku || `MUETY-${Math.floor(100 + Math.random() * 900)}`);
    setCategoryName(prod.category || 'Festive Silk Sarees');
    setImages(Array.isArray(prod.images) ? [...prod.images] : []);
    setNewImageUrl('');
    setColorsText(Array.isArray(prod.colors) ? prod.colors.join(', ') : '');
    setSizesText(Array.isArray(prod.sizes) ? prod.sizes.join(', ') : '');
    setSilkType(prod.silkType || 'Pure Silk');
    setZariType(prod.zariType || 'Gold Zari');
    setBorderType(prod.borderType || 'Temple Border');
    setPalluType(prod.palluType || 'Contrast Pallu');
    setWeaveTechnique(prod.weaveTechnique || 'Handloom');
    setCraftsmanship(prod.craftsmanship || 'Master Weaver');
    setOccasion(prod.occasion || 'Festive');
    setCareInstructions(prod.careInstructions || 'Dry Clean Only');
    setAuthenticityInformation(prod.authenticityInformation || 'Silk Mark Certified');
    setSeoTitle(prod.seoTitle || '');
    setSeoDescription(prod.seoDescription || '');
    setPublished(prod.published !== undefined ? prod.published : true);
    setFeatured(!!prod.featured);
    setNewArrival(!!(prod.isNewArrival || prod.newArrival));
    setBestseller(!!(prod.isBestSeller || prod.bestseller));
    setModalOpen(true);
  };

  // Image Upload Handlers
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
        console.warn('Image compressed error:', err);
      }
    }

    if (loadedCount > 0) {
      success(`Loaded ${loadedCount} photo(s) into product gallery.`);
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
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0 || index >= images.length) return;
    const updated = [...images];
    const target = updated.splice(index, 1)[0];
    updated.unshift(target);
    setImages(updated);
    success('Primary thumbnail updated to selected photo.');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      warning('Please enter a product title.');
      setActiveTab('basic');
      return;
    }

    if (price <= 0) {
      warning('Please specify a valid sale price.');
      setActiveTab('pricing');
      return;
    }

    setIsSaving(true);

    try {
      const catObj = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase()) || categories[0];
      const finalCategoryName = catObj ? catObj.name : categoryName;
      const finalCategorySlug = catObj ? catObj.slug : categoryName.toLowerCase().replace(/\s+/g, '-');

      const colors = colorsText.split(',').map(s => s.trim()).filter(Boolean);
      const sizes = sizesText.split(',').map(s => s.trim()).filter(Boolean);

      const productId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
      const finalImages = images.length > 0 ? images : ['/saree_model_individual.jpg'];

      const prevStock = editingProduct ? (editingProduct.stock || 0) : 0;
      const stockStatus = stock <= 0 ? 'out_of_stock' : stock <= lowStockThreshold ? 'low_stock' : 'in_stock';

      const payload: Product = {
        id: productId,
        productId,
        sku: sku.trim() || `MUETY-${Math.floor(100 + Math.random() * 900)}`,
        slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        name: name.trim(),
        title: name.trim(),
        shortDescription: shortDesc.trim() || name.trim(),
        description: desc.trim() || shortDesc.trim() || name.trim(),
        category: finalCategoryName,
        categorySlug: finalCategorySlug,
        categoryId: catObj?.id,
        price,
        salePrice: price,
        originalPrice: origPrice > price ? origPrice : price,
        mrp: origPrice > price ? origPrice : price,
        taxRate,
        stock,
        inventory: stock,
        lowStockThreshold,
        stockStatus,
        images: finalImages,
        primaryImage: finalImages[0],
        colors,
        sizes,
        silkType,
        zariType,
        borderType,
        palluType,
        weaveTechnique,
        craftsmanship,
        occasion,
        careInstructions,
        authenticityInformation,
        seoTitle: seoTitle || name,
        seoDescription: seoDescription || shortDesc || desc,
        published,
        featured,
        isNewArrival: newArrival,
        newArrival,
        isBestSeller: bestseller,
        bestseller,
        status: published ? 'active' : 'draft',
        rating: editingProduct?.rating || 5,
        reviewCount: editingProduct?.reviewCount || 0,
        specifications: editingProduct?.specifications || { Fabric: silkType, Weave: weaveTechnique },
        tags: [finalCategorySlug, 'silk-saree', 'muety-ethnic'],
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: editingProduct?.createdBy || user?.email || 'admin',
        updatedBy: user?.email || 'admin'
      };

      await productService.saveProduct(payload);

      // Record stock transaction if stock changed
      if (stock !== prevStock) {
        await inventoryService.recordTransaction({
          productId,
          productName: name,
          sku: payload.sku,
          type: editingProduct ? 'MANUAL_ADJUSTMENT' : 'STOCK_IN',
          quantity: Math.abs(stock - prevStock),
          previousStock: prevStock,
          newStock: stock,
          performedBy: user?.email || 'admin',
          reason: editingProduct ? `Manual stock adjustment to ${stock}` : 'Initial product stock creation'
        });
      }

      // Record audit log
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'catalog_manager',
        action: editingProduct ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: productId,
        before: editingProduct,
        after: payload,
        reason: editingProduct ? `Updated product ${name} details` : `Created product ${name}`
      });

      success(editingProduct ? `Updated "${name}" in catalog` : `Created new product "${name}"!`);
      setModalOpen(false);
      loadCatalogData();
    } catch (err: any) {
      error(err?.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!window.confirm(`Permanently archive/delete product "${prodName}" from catalog?`)) return;

    try {
      await productService.deleteProduct(id);
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'catalog_manager',
        action: 'PRODUCT_ARCHIVED',
        entityType: 'PRODUCT',
        entityId: id,
        reason: `Deleted product ${prodName}`
      });

      success(`Product "${prodName}" deleted.`);
      loadCatalogData();
    } catch (err: any) {
      error('Failed to delete product.');
    }
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase().trim();
    const matchSearch = (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
    const matchCat = selectedCat === 'all' || (p.categorySlug || '').toLowerCase() === selectedCat.toLowerCase();
    return matchSearch && matchCat;
  });

  return (
    <div className="admin-products animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
              Merchandise ERP & Catalog Editor
            </h1>
            <span className={`badge badge-${isLiveFirebase ? 'success' : 'gold'}`} style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} /> {isLiveFirebase ? 'FIRESTORE CLOUD ACTIVE' : 'LOCAL CACHE'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Structured 8-tab editor for saree specifications, inventory thresholds, multi-photo galleries, and SEO metadata.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleSyncToCloud}
            disabled={isSyncing}
            className="btn btn-outline btn-md"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff' }}
          >
            <RefreshCw size={16} color="#2563eb" className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud Database'}
          </button>

          <button onClick={openCreateModal} className="btn btn-primary btn-md" style={{ fontWeight: 700 }}>
            <Plus size={18} /> Add New Saree
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by title, SKU, or weave..." 
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

      {/* Products Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Saree Product</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Category</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>SKU</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Price</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Inventory Stock</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Visibility</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No products found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                    <td style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid var(--brand-border)', flexShrink: 0 }}>
                        <img src={(prod.images && prod.images[0]) || '/saree_model_individual.jpg'} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <strong style={{ color: 'var(--brand-primary)', fontSize: '0.95rem', display: 'block' }}>{prod.name}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{prod.silkType || 'Pure Silk Saree'}</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span className="badge badge-outline" style={{ fontSize: '0.78rem' }}>{prod.category}</span>
                    </td>

                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--brand-muted)', fontSize: '0.85rem' }}>
                      {prod.sku}
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      ₹{(prod.price || 0).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontWeight: 700,
                        color: (prod.stock || 0) <= (prod.lowStockThreshold || 3) ? '#ef4444' : '#10b981',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {(prod.stock || 0) <= (prod.lowStockThreshold || 3) && <AlertTriangle size={14} />}
                        {prod.stock || 0} in stock
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {prod.published ? <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>Published</span> : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Draft</span>}
                        {prod.featured && <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>Featured</span>}
                        {prod.isNewArrival && <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>New</span>}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditModal(prod)} className="btn btn-outline btn-sm">
                          <Edit3 size={14} /> Edit
                        </button>

                        <button onClick={() => handleDeleteProduct(prod.id, prod.name)} className="btn btn-danger btn-sm">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STRUCTURED 8-TAB PRODUCT EDITOR MODAL */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: '#090d16',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: 'var(--font-heading)' }}>
                  {editingProduct ? `Edit Saree: ${editingProduct.name}` : 'Create New Luxury Saree Masterwork'}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#d4af37' }}>
                  Structured ERP Catalog Editor & Inventory Controller
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Tab Navigation Bar */}
            <div style={{
              display: 'flex',
              backgroundColor: '#0f172a',
              padding: '0 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              overflowX: 'auto',
              flexShrink: 0
            }}>
              {[
                { id: 'basic', label: '1. Basic Info', icon: Info },
                { id: 'pricing', label: '2. Pricing & Tax', icon: DollarSign },
                { id: 'photography', label: `3. Photography (${images.length}/5)`, icon: ImageIcon },
                { id: 'variants', label: '4. Variants', icon: Sliders },
                { id: 'inventory', label: '5. Inventory ERP', icon: Package },
                { id: 'textile', label: '6. Textile Specs', icon: Sparkles },
                { id: 'seo', label: '7. SEO', icon: Globe },
                { id: 'publishing', label: '8. Publishing', icon: CheckCircle2 }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as ModalTab)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 14px',
                      color: isActive ? '#d4af37' : '#94a3b8',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '3px solid #d4af37' : '3px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <TabIcon size={15} color="currentColor" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Tab Content Area */}
            <form id="product-erp-form" onSubmit={handleSaveProduct} style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
              
              {/* TAB 1: BASIC INFORMATION */}
              {activeTab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Product Name / Saree Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. Kanchipuram Crimson Royal Bridal Silk Saree" 
                      className="form-input" 
                    />
                  </div>

                  <div className="grid-2" style={{ gap: '1rem' }}>
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

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Short Tagline Description</label>
                    <input 
                      type="text" 
                      value={shortDesc} 
                      onChange={e => setShortDesc(e.target.value)} 
                      placeholder="e.g. Pure Mulberry Kanchipuram Silk with Hand-woven Gold Zari Korvai Border" 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Master Craftsmanship Description</label>
                    <textarea 
                      rows={5} 
                      value={desc} 
                      onChange={e => setDesc(e.target.value)} 
                      placeholder="Narrate the heritage weaving story, pure zari composition, and loom origin details..." 
                      className="form-textarea" 
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING & TAX */}
              {activeTab === 'pricing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="grid-3" style={{ gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Offer / Selling Price (₹) *</label>
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
                      <label className="form-label">Original / MRP Price (₹)</label>
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
                      <label className="form-label">GST Tax Rate (%)</label>
                      <input 
                        type="number" 
                        min={0} 
                        max={28}
                        value={taxRate} 
                        onChange={e => setTaxRate(Number(e.target.value))} 
                        className="form-input" 
                      />
                    </div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <strong>Pricing Summary:</strong><br />
                    Selling Price: <strong>₹{price.toLocaleString('en-IN')}</strong> {origPrice > price && <span style={{ color: '#10b981' }}>(Save ₹{(origPrice - price).toLocaleString('en-IN')} / {Math.round(((origPrice - price)/origPrice)*100)}% off)</span>}<br />
                    Applicable GST ({taxRate}%): <strong>₹{((price * taxRate) / 100).toFixed(2)}</strong> (included in final price)
                  </div>
                </div>
              )}

              {/* TAB 3: PHOTOGRAPHY GALLERY */}
              {activeTab === 'photography' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--brand-primary)', fontSize: '1rem' }}>Multi-Photo Gallery (Up to 5 images)</h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Slot #1 is used as primary thumbnail across storefront and collection pages.</span>
                    </div>
                    <span className={`badge badge-${images.length >= 5 ? 'gold' : 'success'}`}>
                      {images.length}/5 Slots Used
                    </span>
                  </div>

                  {/* 5-Slots Visual Container */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {[0, 1, 2, 3, 4].map(idx => {
                      const img = images[idx];
                      return (
                        <div
                          key={idx}
                          style={{
                            aspectRatio: '1/1',
                            borderRadius: 'var(--radius-md)',
                            border: img ? '2px solid var(--brand-border)' : '2px dashed #cbd5e1',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {img ? (
                            <>
                              <img src={img} alt={`Angle ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {idx === 0 && (
                                <span style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: '#d4af37', color: '#0f172a', fontSize: '9px', fontWeight: 800, padding: '2px 4px', borderRadius: '3px' }}>
                                  MAIN
                                </span>
                              )}
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(15,23,42,0.7)',
                                opacity: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                              >
                                {idx !== 0 && (
                                  <button type="button" onClick={() => setPrimaryImage(idx)} style={{ backgroundColor: '#d4af37', color: '#0f172a', border: 'none', padding: '3px 6px', fontSize: '10px', borderRadius: '3px', fontWeight: 700, cursor: 'pointer' }}>
                                    Set Main
                                  </button>
                                )}
                                <button type="button" onClick={() => removeImage(idx)} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '3px 6px', fontSize: '10px', borderRadius: '3px', fontWeight: 700, cursor: 'pointer' }}>
                                  Delete
                                </button>
                              </div>
                            </>
                          ) : (
                            <label style={{ cursor: 'pointer', textAlign: 'center', padding: '4px' }}>
                              <Plus size={18} color="#94a3b8" />
                              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Slot {idx + 1}</span>
                              <input type="file" multiple accept="image/*" disabled={images.length >= 5} onChange={handleMultipleFileUpload} style={{ display: 'none' }} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Upload Controls */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label className="btn btn-outline btn-sm" style={{ cursor: images.length >= 5 ? 'not-allowed' : 'pointer' }}>
                      <Upload size={16} /> Upload Photos
                      <input type="file" multiple accept="image/*" disabled={images.length >= 5} onChange={handleMultipleFileUpload} style={{ display: 'none' }} />
                    </label>

                    <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                      <input 
                        type="url" 
                        value={newImageUrl} 
                        onChange={e => setNewImageUrl(e.target.value)} 
                        placeholder="Paste image URL..." 
                        className="form-input" 
                        style={{ fontSize: '0.85rem' }} 
                      />
                      <button type="button" onClick={handleAddImageUrl} disabled={images.length >= 5} className="btn btn-secondary btn-sm">
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VARIANTS */}
              {activeTab === 'variants' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Color Variants (comma-separated)</label>
                    <input 
                      type="text" 
                      value={colorsText} 
                      onChange={e => setColorsText(e.target.value)} 
                      placeholder="Royal Crimson, Temple Gold, Emerald Green" 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Saree Dimensions & Blouse Options</label>
                    <input 
                      type="text" 
                      value={sizesText} 
                      onChange={e => setSizesText(e.target.value)} 
                      placeholder="Standard 5.5m + 0.8m Unstitched Blouse" 
                      className="form-input" 
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: INVENTORY ERP */}
              {activeTab === 'inventory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Current Stock Count *</label>
                      <input 
                        type="number" 
                        required 
                        min={0} 
                        value={stock} 
                        onChange={e => setStock(Number(e.target.value))} 
                        className="form-input" 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Low Stock Alert Threshold *</label>
                      <input 
                        type="number" 
                        required 
                        min={1} 
                        value={lowStockThreshold} 
                        onChange={e => setLowStockThreshold(Number(e.target.value))} 
                        className="form-input" 
                      />
                    </div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: stock <= lowStockThreshold ? '#fffbeb' : '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: stock <= lowStockThreshold ? '#fef08a' : '#a7f3d0' }}>
                    <div style={{ fontWeight: 700, color: stock <= lowStockThreshold ? '#92400e' : '#065f46' }}>
                      Inventory Status: {stock <= 0 ? 'Out of Stock' : stock <= lowStockThreshold ? 'Low Stock Warning' : 'Optimal Inventory'}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: stock <= lowStockThreshold ? '#b45309' : '#047857' }}>
                      Every stock adjustment will automatically record an immutable transaction log.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 6: TEXTILE SPECS */}
              {activeTab === 'textile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Silk Type / Fiber Purity</label>
                      <input type="text" value={silkType} onChange={e => setSilkType(e.target.value)} className="form-input" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Zari Type & Grade</label>
                      <input type="text" value={zariType} onChange={e => setZariType(e.target.value)} className="form-input" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Border Craftsmanship</label>
                      <input type="text" value={borderType} onChange={e => setBorderType(e.target.value)} className="form-input" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Pallu Weave Detail</label>
                      <input type="text" value={palluType} onChange={e => setPalluType(e.target.value)} className="form-input" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Weave Technique</label>
                      <input type="text" value={weaveTechnique} onChange={e => setWeaveTechnique(e.target.value)} className="form-input" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Artisan / Origin Details</label>
                      <input type="text" value={craftsmanship} onChange={e => setCraftsmanship(e.target.value)} className="form-input" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Occasion</label>
                      <input type="text" value={occasion} onChange={e => setOccasion(e.target.value)} className="form-input" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Authenticity Certification</label>
                      <input type="text" value={authenticityInformation} onChange={e => setAuthenticityInformation(e.target.value)} className="form-input" />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Care Instructions</label>
                    <input type="text" value={careInstructions} onChange={e => setCareInstructions(e.target.value)} className="form-input" />
                  </div>
                </div>
              )}

              {/* TAB 7: SEO */}
              {activeTab === 'seo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">SEO Title Tag</label>
                    <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Auto-generated from name if left empty" className="form-input" />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">SEO Meta Description</label>
                    <textarea rows={3} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="Auto-generated from short description if left empty" className="form-textarea" />
                  </div>
                </div>
              )}

              {/* TAB 8: PUBLISHING */}
              {activeTab === 'publishing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#0f172a' }} />
                    Publish Live on Storefront
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#0f172a' }} />
                    Feature on Home Page Hero & Collections
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={newArrival} onChange={e => setNewArrival(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#0f172a' }} />
                    Mark as New Arrival
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={bestseller} onChange={e => setBestseller(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#0f172a' }} />
                    Mark as Bestseller
                  </label>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline" disabled={isSaving}>
                Cancel
              </button>

              <button type="submit" form="product-erp-form" className="btn btn-primary" disabled={isSaving} style={{ fontWeight: 700 }}>
                {isSaving ? 'Saving Masterwork...' : editingProduct ? 'Save Saree Changes' : 'Publish Product to Atelier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
