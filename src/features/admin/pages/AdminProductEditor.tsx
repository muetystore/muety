import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { inventoryService } from '@/shared/services/inventoryService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Product, Category, SareeCollection } from '@/types';
import { collectionService } from '@/features/catalog/services/collectionService';
import { categoryService, normalizeCategorySlug } from '@/features/catalog/services/categoryService';
import { getUserRoles } from '@/shared/utils/permissions';
import { compressImageFile } from '@/shared/utils/imageCompressor';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Image as ImageIcon, 
  Upload, 
  Plus, 
  Trash2, 
  Lock, 
  Info, 
  Package, 
  Tag, 
  DollarSign, 
  Layers, 
  Globe, 
  RefreshCw,
  Sparkles 
} from 'lucide-react';

interface SectionConfig {
  id: string;
  title: string;
  shortLabel: string;
  icon: any;
}

const SECTIONS: SectionConfig[] = [
  { id: 'basic', title: 'Basic Information', shortLabel: 'Basic Info', icon: Info },
  { id: 'pricing', title: 'Pricing & Tax', shortLabel: 'Pricing', icon: DollarSign },
  { id: 'photography', title: 'Photography', shortLabel: 'Photos', icon: ImageIcon },
  { id: 'variants', title: 'Variants & Attributes', shortLabel: 'Variants', icon: Tag },
  { id: 'inventory', title: 'Inventory ERP & SKU', shortLabel: 'Inventory', icon: Package },
  { id: 'textile', title: 'Textile Specifications', shortLabel: 'Textile Specs', icon: Layers },
  { id: 'seo', title: 'SEO & Visibility', shortLabel: 'SEO', icon: Globe },
  { id: 'publishing', title: 'Publishing & Status', shortLabel: 'Publishing', icon: CheckCircle2 }
];

export const AdminProductEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  useDocumentTitle(isEditMode ? 'Edit Product ERP' : 'Create Product ERP');

  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, warning, error } = useNotification();

  const [categories, setCategories] = useState<Category[]>(() => categoryService.getCategories());
  const [collections, setCollections] = useState<SareeCollection[]>(() => collectionService.getCollections());
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [primaryCollectionId, setPrimaryCollectionId] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState<boolean>(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Active section tracking for sidebar & mobile pills
  const [activeSectionId, setActiveSectionId] = useState<string>('basic');
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the mobile pill navigation bar to keep active section centered
  useEffect(() => {
    if (!activeSectionId) return;
    const pillElement = document.getElementById(`mobile-pill-${activeSectionId}`);
    if (pillElement && mobileNavRef.current) {
      pillElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
    const desktopNavItem = document.getElementById(`desktop-nav-${activeSectionId}`);
    if (desktopNavItem) {
      desktopNavItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [activeSectionId]);

  // Scroll Spy via scroll listener
  useEffect(() => {
    if (isLoadingProduct) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 130;
      let currentSecId = SECTIONS[0].id;

      for (const s of SECTIONS) {
        const el = document.getElementById(`section-${s.id}`);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            currentSecId = s.id;
          }
        }
      }
      setActiveSectionId(currentSecId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingProduct]);

  // --- FORM FIELDS STATE ---
  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [desc, setDesc] = useState('');
  
  const [price, setPrice] = useState<number | ''>('');
  const [origPrice, setOrigPrice] = useState<number | ''>('');
  const [taxRate, setTaxRate] = useState<number>(5);

  const [stock, setStock] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [sku, setSku] = useState('');
  const [availability, setAvailability] = useState<'available' | 'sold_out'>('available');

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>('');

  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const [colorsText, setColorsText] = useState('');
  const [sizesText, setSizesText] = useState('');

  // Textile specs
  const [silkType, setSilkType] = useState('');
  const [zariType, setZariType] = useState('');
  const [borderType, setBorderType] = useState('');
  const [palluType, setPalluType] = useState('');
  const [weaveTechnique, setWeaveTechnique] = useState('');
  const [craftsmanship, setCraftsmanship] = useState('');
  const [occasion, setOccasion] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [authenticityInformation, setAuthenticityInformation] = useState('');

  // SEO & Visibility
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [mostWanted, setMostWanted] = useState(false);

  // Subscribe to live categories and collections
  useEffect(() => {
    const unsubCats = categoryService.subscribeToCategories((liveCats) => {
      if (liveCats && liveCats.length > 0) {
        setCategories(liveCats);
      }
    });

    const unsubCols = collectionService.subscribeToCollections((cols) => {
      setCollections(cols || []);
    });

    return () => {
      if (typeof unsubCats === 'function') unsubCats();
      if (typeof unsubCols === 'function') unsubCols();
    };
  }, []);

  // Load product if editing
  useEffect(() => {
    const cats = categoryService.getCategories();
    if (cats.length > 0) {
      setCategories(cats);
    }

    if (isEditMode && id) {
      setIsLoadingProduct(true);
      const prod = productService.getProductById(id);
      if (prod) {
        setEditingProduct(prod);
        setName(prod.name || prod.title || '');
        setShortDesc(prod.shortDescription || '');
        setDesc(prod.description || '');
        setPrice(prod.price || prod.salePrice || 0);
        setOrigPrice(prod.originalPrice || prod.mrp || 0);
        setTaxRate(prod.taxRate || 5);
        setStock(prod.stock !== undefined ? prod.stock : 10);
        setLowStockThreshold(prod.lowStockThreshold || 3);
        setSku(prod.sku || '');
        setAvailability(prod.availability || 'available');

        let catIds = Array.isArray(prod.categoryIds) && prod.categoryIds.length > 0 
          ? prod.categoryIds 
          : (prod.categoryId ? [prod.categoryId] : []);

        // Normalize any slugs/names in catIds to real category IDs
        catIds = catIds.map(cid => {
          const matched = cats.find(c => 
            c.id === cid || 
            (c.slug && c.slug.toLowerCase() === cid.toLowerCase()) || 
            (c.name && c.name.toLowerCase() === cid.toLowerCase())
          );
          return matched ? matched.id : cid;
        });

        if (catIds.length === 0) {
          const match = cats.find(c => 
            (c.slug || '').toLowerCase() === (prod.categorySlug || '').toLowerCase() ||
            (c.name || '').toLowerCase() === (prod.category || '').toLowerCase()
          );
          if (match) catIds = [match.id];
          else if (cats[0]) catIds = [cats[0].id];
        }

        catIds = Array.from(new Set(catIds));

        let primId = prod.primaryCategoryId && catIds.includes(prod.primaryCategoryId)
          ? prod.primaryCategoryId
          : (prod.categoryId && catIds.includes(prod.categoryId) ? prod.categoryId : catIds[0] || '');

        if (primId && !cats.some(c => c.id === primId)) {
          const match = cats.find(c => 
            (c.slug || '').toLowerCase() === (prod.categorySlug || '').toLowerCase() ||
            (c.name || '').toLowerCase() === (prod.category || '').toLowerCase()
          );
          if (match) {
            primId = match.id;
            if (!catIds.includes(match.id)) catIds.push(match.id);
          }
        }

        setSelectedCategoryIds(catIds);
        setPrimaryCategoryId(primId);

        const colIds = Array.isArray(prod.collectionIds) && prod.collectionIds.length > 0
          ? prod.collectionIds
          : (prod.collectionId ? [prod.collectionId] : []);
        setSelectedCollectionIds(colIds);
        setPrimaryCollectionId(prod.collectionId || colIds[0] || '');

        setImages(Array.isArray(prod.images) ? [...prod.images] : []);
        setColorsText(Array.isArray(prod.colors) ? prod.colors.join(', ') : '');
        setSizesText(Array.isArray(prod.sizes) ? prod.sizes.join(', ') : '');

        setSilkType(prod.silkType || '');
        setZariType(prod.zariType || '');
        setBorderType(prod.borderType || '');
        setPalluType(prod.palluType || '');
        setWeaveTechnique(prod.weaveTechnique || '');
        setCraftsmanship(prod.craftsmanship || '');
        setOccasion(prod.occasion || '');
        setCareInstructions(prod.careInstructions || '');
        setAuthenticityInformation(prod.authenticityInformation || '');

        setSeoTitle(prod.seoTitle || '');
        setSeoDescription(prod.seoDescription || '');
        setPublished(prod.published !== undefined ? prod.published : true);
        setFeatured(!!prod.featured);
        setNewArrival(!!(prod.isNewArrival || prod.newArrival));
        setBestseller(!!(prod.isBestSeller || prod.bestseller));
        setMostWanted(!!(prod.isMostWanted || prod.mostWanted));
      } else {
        error(`Product with ID "${id}" was not found.`);
        navigate('/admin/products');
      }
      setIsLoadingProduct(false);
    } else {
      // Creation Mode Initialization
      if (cats.length > 0) {
        const firstCat = cats[0];
        setSelectedCategoryIds([firstCat.id]);
        setPrimaryCategoryId(firstCat.id);
        productService.getSkuPreviewForCategory(firstCat.id).then(genSku => {
          setSku(genSku);
        });
      }
    }
  }, [id, isEditMode]);

  // Handle Category toggles and auto SKU preview for creation mode
  const handleToggleCategory = async (catId: string) => {
    setIsDirty(true);
    let nextSelected: string[];
    if (selectedCategoryIds.includes(catId)) {
      nextSelected = selectedCategoryIds.filter(i => i !== catId);
    } else {
      nextSelected = [...selectedCategoryIds, catId];
    }
    setSelectedCategoryIds(nextSelected);

    let nextPrimary = primaryCategoryId;
    if (nextSelected.length === 0) {
      nextPrimary = '';
    } else if (!nextSelected.includes(primaryCategoryId)) {
      nextPrimary = nextSelected[0];
    }
    setPrimaryCategoryId(nextPrimary);

    if (!isEditMode && nextPrimary) {
      const generated = await productService.getSkuPreviewForCategory(nextPrimary);
      setSku(generated);
    }
  };

  const handlePrimaryCategoryChange = async (catId: string) => {
    setIsDirty(true);
    setPrimaryCategoryId(catId);
    if (!isEditMode && catId) {
      const generated = await productService.getSkuPreviewForCategory(catId);
      setSku(generated);
    }
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
    setIsCompressing(true);
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
        console.warn('Image compression error:', err);
      }
    }

    setIsCompressing(false);
    if (loadedCount > 0) {
      setIsDirty(true);
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
      warning('Maximum of 5 gallery images allowed.');
      return;
    }
    setImages(prev => [...prev, trimmed]);
    setNewImageUrl('');
    setIsDirty(true);
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0 || index >= images.length) return;
    const updated = [...images];
    const target = updated.splice(index, 1)[0];
    updated.unshift(target);
    setImages(updated);
    setIsDirty(true);
    success('Primary thumbnail updated.');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Section completion calculations
  const sectionStatus = useMemo(() => {
    const numPrice = Number(price);

    const basicComplete = !!name.trim() && selectedCategoryIds.length > 0 && !!primaryCategoryId;
    const pricingComplete = !isNaN(numPrice) && numPrice > 0;
    const photosComplete = images.length > 0;
    const variantsComplete = !!colorsText.trim() || !!sizesText.trim();
    const inventoryComplete = !!sku.trim() && stock >= 0;
    const textileComplete = !!silkType.trim() || !!weaveTechnique.trim() || !!zariType.trim();
    const seoComplete = !!seoTitle.trim() || !!seoDescription.trim();
    const publishingComplete = true;

    const items = [
      { id: 'basic', complete: basicComplete },
      { id: 'pricing', complete: pricingComplete },
      { id: 'photography', complete: photosComplete, detail: `${images.length}/5` },
      { id: 'variants', complete: variantsComplete },
      { id: 'inventory', complete: inventoryComplete },
      { id: 'textile', complete: textileComplete },
      { id: 'seo', complete: seoComplete },
      { id: 'publishing', complete: publishingComplete }
    ];

    const completedCount = items.filter(i => i.complete).length;
    return { items, completedCount, totalCount: items.length };
  }, [name, selectedCategoryIds, primaryCategoryId, price, images, colorsText, sizesText, sku, stock, silkType, weaveTechnique, zariType, seoTitle, seoDescription]);

  // Section navigation smooth scroll
  const scrollToSection = (secId: string) => {
    setActiveSectionId(secId);
    const el = document.getElementById(`section-${secId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Save product logic
  const handleSave = async (overrideStatus?: 'active' | 'draft') => {
    if (!name.trim()) {
      warning('Product Title is required.');
      scrollToSection('basic');
      return;
    }

    if (selectedCategoryIds.length === 0) {
      warning('Please select at least one category.');
      scrollToSection('basic');
      return;
    }

    if (!primaryCategoryId || !selectedCategoryIds.includes(primaryCategoryId)) {
      warning('Please choose a primary category from the selected categories.');
      scrollToSection('basic');
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      warning('Please enter a valid sale price (> 0).');
      scrollToSection('pricing');
      return;
    }

    setIsSaving(true);

    try {
      const productId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;

      // Check SKU Uniqueness if SKU provided
      if (sku.trim()) {
        const isSkuTaken = await productService.checkSkuExists(sku.trim(), editingProduct?.id);
        if (isSkuTaken) {
          warning(`SKU Conflict: SKU "${sku.trim()}" is already assigned to another product.`);
          scrollToSection('inventory');
          setIsSaving(false);
          return;
        }
      }

      const primaryCat = categories.find(c => c.id === primaryCategoryId);
      if (!primaryCat) {
        warning('Please select a valid active primary category from the list.');
        scrollToSection('basic');
        setIsSaving(false);
        return;
      }

      const finalCategoryName = primaryCat.name;
      const finalCategorySlug = primaryCat.slug;

      const colors = colorsText.split(',').map(s => s.trim()).filter(Boolean);
      const sizes = sizesText.split(',').map(s => s.trim()).filter(Boolean);
      const finalImages = images.length > 0 ? images : ['/saree_model_individual.jpg'];

      const prevStock = editingProduct ? (editingProduct.stock || 0) : 0;
      const finalStock = Number(stock) || 0;
      const stockStatus = finalStock <= 0 ? 'out_of_stock' : finalStock <= lowStockThreshold ? 'low_stock' : 'in_stock';
      
      const isPublished = overrideStatus === 'draft' ? false : (overrideStatus === 'active' ? true : published);

      // Preserve existing valid SKU on edit
      const existingSku = editingProduct?.sku?.trim();
      const finalSku = existingSku || sku.trim();

      const payload: Product = {
        id: productId,
        productId,
        sku: finalSku,
        slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        name: name.trim(),
        title: name.trim(),
        shortDescription: shortDesc.trim() || name.trim(),
        description: desc.trim() || shortDesc.trim() || name.trim(),
        categoryIds: selectedCategoryIds,
        primaryCategoryId,
        category: finalCategoryName,
        categorySlug: finalCategorySlug,
        categoryId: primaryCategoryId,
        price: numPrice,
        salePrice: numPrice,
        originalPrice: Number(origPrice) > numPrice ? Number(origPrice) : numPrice,
        mrp: Number(origPrice) > numPrice ? Number(origPrice) : numPrice,
        taxRate: Number(taxRate) || 5,
        stock: finalStock,
        inventory: finalStock,
        lowStockThreshold: Number(lowStockThreshold) || 3,
        stockStatus,
        images: finalImages,
        primaryImage: finalImages[0],
        colors,
        sizes,
        silkType: silkType.trim() || 'Pure Silk',
        zariType: zariType.trim() || 'Tested Gold Zari',
        borderType: borderType.trim() || 'Temple Border',
        palluType: palluType.trim() || 'Contrast Pallu',
        weaveTechnique: weaveTechnique.trim() || 'Handloom',
        craftsmanship: craftsmanship.trim() || 'Master Weaver',
        occasion: occasion.trim() || 'Festive / Bridal',
        careInstructions: careInstructions.trim() || 'Dry Clean Only.',
        authenticityInformation: authenticityInformation.trim() || 'Silk Mark Certified',
        seoTitle: seoTitle.trim() || name.trim(),
        seoDescription: seoDescription.trim() || shortDesc.trim() || name.trim(),
        published: isPublished,
        featured,
        isNewArrival: newArrival,
        newArrival,
        isBestSeller: bestseller,
        bestseller,
        isMostWanted: mostWanted,
        mostWanted,
        status: isPublished ? 'active' : 'draft',
        availability,
        collectionId: primaryCollectionId || selectedCollectionIds[0] || '',
        collectionIds: selectedCollectionIds,
        rating: editingProduct?.rating || 5,
        reviewCount: editingProduct?.reviewCount || 0,
        specifications: editingProduct?.specifications || { Fabric: silkType || 'Pure Silk', Weave: weaveTechnique || 'Handloom' },
        tags: Array.from(new Set([
          finalCategorySlug, 
          'silk-saree', 
          'muety-ethnic',
          ...selectedCollectionIds.map(cid => {
            const matchCol = collections.find(c => c.id === cid);
            return matchCol ? matchCol.slug : '';
          }).filter(Boolean)
        ])),
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: editingProduct?.createdBy || user?.email || 'admin',
        updatedBy: user?.email || 'admin'
      };

      const savedProduct = await productService.saveProduct(payload);

      // Record inventory transaction if stock changed
      if (finalStock !== prevStock) {
        await inventoryService.recordTransaction({
          productId,
          productName: name,
          sku: savedProduct.sku,
          type: editingProduct ? 'MANUAL_ADJUSTMENT' : 'STOCK_IN',
          quantity: Math.abs(finalStock - prevStock),
          previousStock: prevStock,
          newStock: finalStock,
          performedBy: user?.email || 'admin',
          reason: editingProduct ? `Manual stock adjustment to ${finalStock}` : 'Initial product creation'
        });
      }

      // Log audit action
      await auditService.logAction({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || 'admin',
        actorRole: getUserRoles(user)[0] || 'catalog_manager',
        action: editingProduct ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: productId,
        before: editingProduct,
        after: savedProduct,
        reason: editingProduct ? `Updated product ${name}` : `Created product ${name}`
      });

      setIsDirty(false);
      success(editingProduct ? `Saved changes for "${name}".` : `Product created successfully with SKU ${savedProduct.sku}.`);
      navigate('/admin/products');
    } catch (err: any) {
      error(err?.message || 'Failed to save product details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (isDirty && !window.confirm('Discard unsaved changes and return to Products catalog?')) {
      return;
    }
    navigate('/admin/products');
  };

  if (isLoadingProduct) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#d4af37' }} />
        <p style={{ fontWeight: 600 }}>Loading product workspace...</p>
      </div>
    );
  }

  return (
    <div className="admin-product-editor animate-fade-in" style={{ paddingBottom: 0, minWidth: 0 }}>
      
      {/* TOP BAR HEADER */}
      <div className="admin-editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', minWidth: 0 }}>
          <button 
            type="button" 
            onClick={handleDiscard}
            className="btn btn-outline btn-sm"
            style={{ padding: '6px 12px', flexShrink: 0 }}
          >
            <ArrowLeft size={16} /> Back to Products
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ 
                fontSize: '1.3rem', 
                fontWeight: 800, 
                color: 'var(--brand-primary)', 
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {isEditMode ? `Edit Product: ${editingProduct?.name || ''}` : 'Create New Product'}
              </h1>

              {published ? (
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Published</span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>Draft</span>
              )}
            </div>

            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              Product Setup • <strong style={{ color: '#0f172a' }}>{sectionStatus.completedCount} of {sectionStatus.totalCount}</strong> sections complete
            </span>
          </div>
        </div>

        <div className="admin-show-desktop" style={{ gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <button 
            type="button" 
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 600 }}
          >
            Save Draft
          </button>

          <button 
            type="button" 
            onClick={() => handleSave()}
            disabled={isSaving}
            className="btn btn-accent btn-sm"
            style={{ fontWeight: 700, padding: '8px 18px' }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* MOBILE STICKY HORIZONTAL SECTION NAVIGATION BAR (<1024px) */}
      <div ref={mobileNavRef} className="admin-show-mobile admin-mobile-section-nav-bar">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const status = sectionStatus.items.find(i => i.id === sec.id);
          const isActive = activeSectionId === sec.id;

          return (
            <button
              key={sec.id}
              id={`mobile-pill-${sec.id}`}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className={`admin-mobile-section-pill ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{sec.shortLabel}</span>
              {status?.complete ? (
                <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
              ) : (
                <span style={{ opacity: 0.6 }}>○</span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN WORKSPACE LAYOUT */}
      <div className="admin-product-editor-layout">
        
        {/* LEFT STICKY SECTION NAV (DESKTOP >=1024px) */}
        <aside className="admin-section-nav admin-show-desktop">
          <div style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            PRODUCT SECTIONS
          </div>

          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const status = sectionStatus.items.find(i => i.id === sec.id);
            const isActive = activeSectionId === sec.id;

            return (
              <button
                key={sec.id}
                id={`desktop-nav-${sec.id}`}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`admin-section-nav-item ${isActive ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} className="section-status-icon" color={isActive ? '#d4af37' : '#64748b'} />
                  <span>{sec.title}</span>
                </div>

                {status?.complete ? (
                  <span style={{ color: '#10b981', fontSize: '0.85rem' }} title="Section Complete">✓</span>
                ) : status?.detail ? (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {status.detail}
                  </span>
                ) : (
                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>○</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* SINGLE UNIFIED PRODUCT FORM COLUMN (Desktop & Mobile) */}
        <div className="admin-product-form-container">
          
          {/* 1. BASIC INFORMATION */}
          <div id="section-basic" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
              <Info size={20} color="#d4af37" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>Basic Information</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Product Title / Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => { setName(e.target.value); setIsDirty(true); }}
                  placeholder="Example: Kanchipuram Pure Silk Saree with Gold Zari"
                  className="form-input"
                />
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Enter a descriptive, clear title. Do not include price or internal SKU in title.
                </span>
              </div>

              <div className="admin-form-grid-2col">
                {/* Category Selection Checkboxes */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Assigned Categories <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid var(--brand-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {categories.map(cat => (
                      <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(cat.id)}
                          onChange={() => handleToggleCategory(cat.id)}
                          style={{ accentColor: '#d4af37', flexShrink: 0 }}
                        />
                        <span style={{ wordBreak: 'break-word' }}>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Primary Category Selector */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Primary Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={primaryCategoryId}
                    onChange={e => handlePrimaryCategoryChange(e.target.value)}
                    className="form-select"
                    disabled={selectedCategoryIds.length === 0}
                  >
                    <option value="">-- Select Primary Category --</option>
                    {categories.filter(c => selectedCategoryIds.includes(c.id)).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Primary category dictates main storefront routing and SKU prefixing.
                  </span>
                </div>
              </div>

              {/* Shop By Collections & Curated Edits Assignment */}
              <div className="admin-form-grid-2col" style={{ borderTop: '1px dashed var(--brand-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#d4af37" />
                    Assigned Shop By Collections & Festive Edits
                  </label>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid var(--brand-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {collections.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No collections found.</span>
                    ) : (
                      collections.map(col => (
                        <label key={col.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.86rem', cursor: 'pointer' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={selectedCollectionIds.includes(col.id)}
                              onChange={() => {
                                setIsDirty(true);
                                setSelectedCollectionIds(prev => 
                                  prev.includes(col.id) ? prev.filter(i => i !== col.id) : [...prev, col.id]
                                );
                              }}
                              style={{ accentColor: '#d4af37', flexShrink: 0 }}
                            />
                            <span>{col.name}</span>
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: col.type === 'occasion' ? '#fef3c7' : '#f1f5f9',
                            color: col.type === 'occasion' ? '#92400e' : '#475569',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {col.type || 'occasion'}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Select which "Shop By" dropdown and homepage "Festive Edits" collections this saree belongs to.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Primary Collection
                  </label>
                  <select
                    value={primaryCollectionId}
                    onChange={e => {
                      setPrimaryCollectionId(e.target.value);
                      setIsDirty(true);
                    }}
                    className="form-select"
                    disabled={selectedCollectionIds.length === 0}
                  >
                    <option value="">-- Optional: Primary Collection --</option>
                    {collections.filter(c => selectedCollectionIds.includes(c.id)).map(col => (
                      <option key={col.id} value={col.id}>{col.name} ({col.type || 'occasion'})</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Primary featured collection for this product.
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Short Description</label>
                <input
                  type="text"
                  value={shortDesc}
                  onChange={e => { setShortDesc(e.target.value); setIsDirty(true); }}
                  placeholder="Example: Pure mulberry handloom silk saree with authentic zari borders."
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Product Description</label>
                <textarea
                  rows={4}
                  value={desc}
                  onChange={e => { setDesc(e.target.value); setIsDirty(true); }}
                  placeholder="Enter complete artisan story, weave details, and occasion highlights..."
                  className="form-textarea"
                />
              </div>
            </div>
          </div>

          {/* 2. PRICING & TAX */}
          <div id="section-pricing" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
              <DollarSign size={20} color="#d4af37" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>Pricing & Tax</h3>
            </div>

            <div className="admin-form-grid-2col">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Selling Price (INR ₹) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={e => { setPrice(e.target.value ? Number(e.target.value) : ''); setIsDirty(true); }}
                    placeholder="e.g. 3500"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem' }}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>₹</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Original Price / MRP (INR ₹)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    value={origPrice}
                    onChange={e => { setOrigPrice(e.target.value ? Number(e.target.value) : ''); setIsDirty(true); }}
                    placeholder="e.g. 4500"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem' }}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>₹</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>Leave empty if no discount slash price.</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">GST Tax Rate (%)</label>
                <select
                  value={taxRate}
                  onChange={e => { setTaxRate(Number(e.target.value)); setIsDirty(true); }}
                  className="form-select"
                >
                  <option value={5}>5% GST (Apparel & Textile standard)</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={0}>0% Exempted</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. PHOTOGRAPHY */}
          <div id="section-photography" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ImageIcon size={20} color="#d4af37" />
                <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>Product Photography ({images.length}/5)</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Max 5 high-resolution photos</span>
            </div>

            {/* Upload Drop Zone & URL input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                transition: 'all 0.2s ease'
              }}>
                <Upload size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>
                  Upload High-Resolution Product Images
                </p>
                <p style={{ margin: '4px 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>
                  JPEG, PNG, WEBP up to 15MB. Automatically compressed for web delivery.
                </p>

                <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                  <Upload size={16} /> Choose Image Files
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleMultipleFileUpload}
                    style={{ display: 'none' }}
                    disabled={isCompressing || images.length >= 5}
                  />
                </label>
                {isCompressing && <span style={{ fontSize: '0.8rem', color: '#d4af37', display: 'block', marginTop: '8px' }}>Compressing photo payload...</span>}
              </div>

              {/* Add Image by URL */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="Or enter direct image URL (https://...)"
                  className="form-input"
                  style={{ flex: 1, minWidth: '200px', margin: 0 }}
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={images.length >= 5 || !newImageUrl.trim()}
                  className="btn btn-outline btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  <Plus size={16} /> Add URL
                </button>
              </div>
            </div>

            {/* Gallery Preview Grid */}
            {images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '1rem' }}>
                {images.map((imgUrl, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: idx === 0 ? '2.5px solid #d4af37' : '1px solid var(--brand-border)',
                      backgroundColor: '#f1f5f9',
                      aspectRatio: '3/4'
                    }}
                  >
                    <img src={imgUrl} alt={`Product photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    
                    {idx === 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        backgroundColor: '#d4af37',
                        color: '#0f172a',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        PRIMARY
                      </span>
                    )}

                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(9, 13, 22, 0.85)',
                      padding: '4px 6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(idx)}
                          style={{ color: '#d4af37', fontSize: '0.7rem', fontWeight: 700 }}
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{ color: '#ef4444', marginLeft: 'auto' }}
                        title="Remove photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. VARIANTS & ATTRIBUTES */}
          <div id="section-variants" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
              <Tag size={20} color="#d4af37" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>Variants & Attributes</h3>
            </div>

            <div className="admin-form-grid-2col">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Available Colors (Comma Separated)</label>
                <input
                  type="text"
                  value={colorsText}
                  onChange={e => { setColorsText(e.target.value); setIsDirty(true); }}
                  placeholder="Example: Royal Crimson, Antique Gold, Deep Navy"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Available Sizes / Drapes (Comma Separated)</label>
                <input
                  type="text"
                  value={sizesText}
                  onChange={e => { setSizesText(e.target.value); setIsDirty(true); }}
                  placeholder="Example: Free Size (5.5m + Blouse), 6.3m Full Drape"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* 5. INVENTORY ERP & SKU */}
          <div id="section-inventory" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
              <Package size={20} color="#d4af37" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>Inventory ERP & SKU</h3>
            </div>

            <div className="admin-form-grid-2col">
              {/* SKU */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Product SKU (Stock Keeping Unit)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => { setSku(e.target.value.toUpperCase()); setIsDirty(true); }}
                    placeholder="e.g. KS-01"
                    className="form-input field-generated"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                <div className="field-generated-badge">
                  <Lock size={11} /> 🔒 System generated & category synced
                </div>
              </div>

              {/* Stock Count */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current Physical Stock Count</label>
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={e => { setStock(Number(e.target.value)); setIsDirty(true); }}
                  className="form-input"
                />
              </div>

              {/* Low Stock Threshold */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  min={1}
                  value={lowStockThreshold}
                  onChange={e => { setLowStockThreshold(Number(e.target.value)); setIsDirty(true); }}
                  className="form-input"
                />
              </div>

              {/* Availability State Selector */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ERP Availability State</label>
                <select
                  value={availability}
                  onChange={e => { setAvailability(e.target.value as any); setIsDirty(true); }}
                  className="form-select"
                >
                  <option value="available">🟢 Available for Sale</option>
                  <option value="sold_out">🔴 Sold Out (Visible but Unpurchasable)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 6. TEXTILE SPECIFICATIONS */}
          <div id="section-textile" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
              <Layers size={20} color="#d4af37" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>Textile & Craftsmanship Specifications</h3>
            </div>

            <div className="admin-form-grid-2col">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Silk Fabric Grade</label>
                <input
                  type="text"
                  value={silkType}
                  onChange={e => { setSilkType(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Pure Mulberry Silk (Silk Mark Certified)"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Zari Type & Purity</label>
                <input
                  type="text"
                  value={zariType}
                  onChange={e => { setZariType(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Tested Gold Zari / Pure Half Fine Zari"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Border Design</label>
                <input
                  type="text"
                  value={borderType}
                  onChange={e => { setBorderType(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Korvai Temple Border"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Pallu Work</label>
                <input
                  type="text"
                  value={palluType}
                  onChange={e => { setPalluType(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Heavy Contrast Zari Pallu"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Weaving Technique</label>
                <input
                  type="text"
                  value={weaveTechnique}
                  onChange={e => { setWeaveTechnique(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Handloom Interlock Weave"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Craftsmanship Level</label>
                <input
                  type="text"
                  value={craftsmanship}
                  onChange={e => { setCraftsmanship(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Master Artisan Loom Creation"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Recommended Occasion (Homepage Festive Category)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { id: 'bridal', label: 'Bridal Muhurtham (Pure Zari)' },
                    { id: 'temple', label: 'Temple Ceremonies (Sacred Hues)' },
                    { id: 'reception', label: 'Grand Receptions (Soft Silks)' },
                    { id: 'festive', label: 'Family Festivities (Salem Handlooms)' }
                  ].map(occ => (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => { setOccasion(occ.id); setIsDirty(true); }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: occasion === occ.id ? 'var(--brand-primary, #2a0813)' : '#cbd5e1',
                        backgroundColor: occasion === occ.id ? 'var(--brand-primary, #2a0813)' : '#f8fafc',
                        color: occasion === occ.id ? '#ffffff' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {occ.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={occasion}
                  onChange={e => { setOccasion(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. bridal, temple, reception, festive or custom occasion"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Care Instructions</label>
                <input
                  type="text"
                  value={careInstructions}
                  onChange={e => { setCareInstructions(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Dry Clean Only. Store in pure cotton cover."
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* 7. SEO & VISIBILITY */}
          <div id="section-seo" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
              <Globe size={20} color="#d4af37" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>SEO & Meta Data</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SEO Meta Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={e => { setSeoTitle(e.target.value); setIsDirty(true); }}
                  placeholder={name || "Example: Kanchipuram Silk Saree | MUETY Luxe"}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SEO Meta Description</label>
                <textarea
                  rows={2}
                  value={seoDescription}
                  onChange={e => { setSeoDescription(e.target.value); setIsDirty(true); }}
                  placeholder="Brief description for search engine result previews..."
                  className="form-textarea"
                />
              </div>
            </div>
          </div>

          {/* 8. PUBLISHING & STATUS */}
          <div id="section-publishing" className="admin-product-section-card card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--brand-border)', paddingBottom: '0.75rem' }}>
              <CheckCircle2 size={20} color="#d4af37" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0 }}>Publishing Flags & Visibility (Homepage Sections)</h3>
            </div>

            <div className="admin-publishing-flags-grid">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={e => { setPublished(e.target.checked); setIsDirty(true); }}
                  style={{ accentColor: '#d4af37', width: '18px', height: '18px', flexShrink: 0 }}
                />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>Publish Live</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Make item visible in public storefront</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={e => { setFeatured(e.target.checked); setIsDirty(true); }}
                  style={{ accentColor: '#d4af37', width: '18px', height: '18px', flexShrink: 0 }}
                />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>Featured Saree</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Highlight on homepage carousel</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                <input
                  type="checkbox"
                  checked={newArrival}
                  onChange={e => { setNewArrival(e.target.checked); setIsDirty(true); }}
                  style={{ accentColor: '#d4af37', width: '18px', height: '18px', flexShrink: 0 }}
                />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>New Arrival</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Display in Home Page "New Arrivals" single-row track</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                <input
                  type="checkbox"
                  checked={bestseller}
                  onChange={e => { setBestseller(e.target.checked); setIsDirty(true); }}
                  style={{ accentColor: '#d4af37', width: '18px', height: '18px', flexShrink: 0 }}
                />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>Bestseller &amp; Top Pick</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Display in Home Page "Bestsellers &amp; Top Picks" single-row track</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
                <input
                  type="checkbox"
                  checked={mostWanted}
                  onChange={e => { setMostWanted(e.target.checked); setIsDirty(true); }}
                  style={{ accentColor: '#d4af37', width: '18px', height: '18px', flexShrink: 0 }}
                />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>Most Wanted</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Display in Home Page "Most Wanted" single-row track</span>
                </div>
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* STICKY SAVE BAR */}
      <div className="admin-sticky-save-bar">
        <div className="admin-sticky-save-bar-status">
          {isDirty ? (
            <span className="status-text dirty">
              <AlertTriangle size={15} /> Unsaved draft changes
            </span>
          ) : (
            <span className="status-text saved">
              <CheckCircle2 size={15} color="#10b981" /> Catalog state saved
            </span>
          )}
        </div>

        <div className="admin-sticky-save-bar-actions">
          <button
            type="button"
            onClick={handleDiscard}
            className="btn btn-discard"
          >
            Discard
          </button>

          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="btn btn-draft"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="btn btn-save-changes"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
