import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { productService } from '@/features/catalog/services/productService';
import { storageService } from '@/lib/storage/storageService';
import { auditService } from '@/shared/services/auditService';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { Product, Category } from '@/types';
import { 
  categoryService, 
  resolveProductCategoriesForDisplay, 
  computeCategoryProductCount 
} from '@/features/catalog/services/categoryService';
import { getUserRoles } from '@/shared/utils/permissions';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Database, 
  Package, 
  Layers, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  X,
  Filter
} from 'lucide-react';

export const AdminProducts: React.FC = () => {
  useDocumentTitle('Products Catalog ERP');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useNotification();

  // Restore previous filters & scroll position when returning from product edit page
  const savedState = useRef((() => {
    try {
      const raw = sessionStorage.getItem('muety_admin_products_view_state');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  })()).current;

  const [products, setProducts] = useState<Product[]>(storageService.getProducts());
  const [categories, setCategories] = useState<Category[]>(storageService.getCategories());
  const [search, setSearch] = useState(savedState?.search || '');
  const [selectedCat, setSelectedCat] = useState(savedState?.selectedCat || 'all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'sold_out'>(savedState?.availabilityFilter || 'all');
  const [togglingAvailabilityId, setTogglingAvailabilityId] = useState<string | null>(null);
  const [togglingFlagKey, setTogglingFlagKey] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const isRestoringAdminScroll = useRef<boolean>(Boolean(savedState?.scrollY && savedState.scrollY > 0));

  // Continuously track filters and scroll position to sessionStorage
  useEffect(() => {
    const persistState = () => {
      // Do not overwrite with 0 while restoring previous position
      if (isRestoringAdminScroll.current) return;
      try {
        sessionStorage.setItem('muety_admin_products_view_state', JSON.stringify({
          search,
          selectedCat,
          availabilityFilter,
          scrollY: window.scrollY
        }));
      } catch {}
    };

    window.addEventListener('scroll', persistState, { passive: true });
    return () => window.removeEventListener('scroll', persistState);
  }, [search, selectedCat, availabilityFilter]);

  // Restore scroll position after initial render smoothly without jumping
  useLayoutEffect(() => {
    if (!savedState?.scrollY || savedState.scrollY <= 0) {
      isRestoringAdminScroll.current = false;
      return;
    }

    const targetY = savedState.scrollY;
    let frameId: number;
    let attempts = 0;
    const maxAttempts = 20;

    const attemptScroll = () => {
      attempts++;
      const currentHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;

      if (currentHeight >= targetY + (viewportHeight * 0.1) || attempts >= maxAttempts) {
        window.scrollTo({
          top: targetY,
          behavior: 'instant'
        });
        setTimeout(() => {
          isRestoringAdminScroll.current = false;
        }, 120);
      } else {
        frameId = requestAnimationFrame(attemptScroll);
      }
    };

    frameId = requestAnimationFrame(attemptScroll);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleEditProduct = (prodId: string) => {
    try {
      sessionStorage.setItem('muety_admin_products_view_state', JSON.stringify({
        search,
        selectedCat,
        availabilityFilter,
        scrollY: window.scrollY
      }));
    } catch {}
    navigate(`/admin/products/${prodId}/edit`);
  };

  const loadCatalogData = () => {
    setProducts(productService.getAllProducts());
    setCategories(categoryService.getCategories());
  };

  useEffect(() => {
    loadCatalogData();
    const unsubCats = categoryService.subscribeToCategories((liveCats) => {
      if (liveCats && liveCats.length > 0) {
        setCategories(liveCats);
      }
    });
    const unsubProds = productService.subscribeToProducts((liveProducts) => {
      setProducts(liveProducts);
    });
    return () => {
      if (typeof unsubCats === 'function') unsubCats();
      if (typeof unsubProds === 'function') unsubProds();
    };
  }, []);

  const handleToggleAvailability = async (prod: Product, targetAvailability: 'available' | 'sold_out') => {
    const confirmMsg = targetAvailability === 'sold_out'
      ? 'Mark this product as sold out? It will remain visible in the store but customers will not be able to purchase it.'
      : 'Mark this product as available again?';

    if (!window.confirm(confirmMsg)) return;

    setTogglingAvailabilityId(prod.id);
    try {
      await productService.setProductAvailability(prod.id, targetAvailability);
      success(`"${prod.name}" marked as ${targetAvailability === 'sold_out' ? 'Sold Out' : 'Available'}.`);
      loadCatalogData();
    } catch (err: any) {
      error(err?.message || 'Failed to update product availability.');
    } finally {
      setTogglingAvailabilityId(null);
    }
  };

  const handleToggleFlag = async (prod: Product, flag: 'isNewArrival' | 'isBestSeller' | 'isMostWanted') => {
    const currentVal = !!(prod[flag] || (flag === 'isNewArrival' && prod.newArrival) || (flag === 'isBestSeller' && prod.bestseller) || (flag === 'isMostWanted' && prod.mostWanted));
    const nextVal = !currentVal;
    const actionKey = `${prod.id}_${flag}`;
    setTogglingFlagKey(actionKey);
    try {
      await productService.updateProductFlags(prod.id, {
        [flag]: nextVal,
        ...(flag === 'isNewArrival' ? { newArrival: nextVal } : {}),
        ...(flag === 'isBestSeller' ? { bestseller: nextVal } : {}),
        ...(flag === 'isMostWanted' ? { mostWanted: nextVal } : {})
      });
      const label = flag === 'isNewArrival' ? 'New Arrival' : flag === 'isBestSeller' ? 'Bestseller' : 'Most Wanted';
      success(`"${prod.name}" ${nextVal ? 'added to' : 'removed from'} ${label}.`);
      loadCatalogData();
    } catch (err: any) {
      error(err?.message || 'Failed to update flag.');
    } finally {
      setTogglingFlagKey(null);
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
    
    let matchCat = selectedCat === 'all';
    if (!matchCat) {
      const targetCatObj = categories.find(c => 
        (c.slug && c.slug.toLowerCase() === selectedCat.toLowerCase()) || 
        c.id === selectedCat
      );
      const targetId = targetCatObj ? targetCatObj.id : selectedCat;
      const targetSlug = targetCatObj ? targetCatObj.slug.toLowerCase() : selectedCat.toLowerCase();
      matchCat = (Array.isArray(p.categoryIds) && p.categoryIds.includes(targetId)) ||
                 p.primaryCategoryId === targetId ||
                 p.categoryId === targetId ||
                 (p.categorySlug || '').toLowerCase() === targetSlug;
    }

    const prodAvailability = p.availability || 'available';
    const matchAvailability = availabilityFilter === 'all' ? true : prodAvailability === availabilityFilter;
    
    return matchSearch && matchCat && matchAvailability;
  });

  return (
    <div className="admin-products animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem', minWidth: 0 }}>
      
      {/* Header & Main Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
              Products & Catalog ERP
            </h1>
            <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} /> FIRESTORE LIVE DATA
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Manage product SKUs, inventory counts, pricing, attributes, and visibility status.
          </p>
        </div>

        <button 
          onClick={() => navigate('/admin/products/new')} 
          className="btn btn-primary btn-md" 
          style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={18} color="var(--brand-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by title, SKU, or weave..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="form-input" 
            style={{ paddingLeft: '2.5rem', margin: 0 }} 
          />
        </div>

        {/* Desktop Filters */}
        <div className="admin-show-desktop" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`btn btn-xs ${availabilityFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', fontWeight: 700 }}
            >
              All Availability
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`btn btn-xs ${availabilityFilter === 'available' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', fontWeight: 700 }}
            >
              🟢 Available
            </button>
            <button
              onClick={() => setAvailabilityFilter('sold_out')}
              className={`btn btn-xs ${availabilityFilter === 'sold_out' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', fontWeight: 700 }}
            >
              🔴 Sold Out
            </button>
          </div>

          <button 
            onClick={() => setSelectedCat('all')} 
            className={`btn btn-sm ${selectedCat === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            All Categories ({products.length})
          </button>

          {categories.map(cat => {
            const count = computeCategoryProductCount(cat.id, products);
            const isSelected = selectedCat === cat.slug || selectedCat === cat.id;
            return (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCat(cat.slug || cat.id)} 
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Mobile Filter Button Trigger */}
        <div className="admin-show-mobile">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Mobile Filter Sheet Drawer */}
      {mobileFilterOpen && (
        <div className="admin-modal-overlay" onClick={() => setMobileFilterOpen(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="admin-modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#fff' }}>Filter Products Catalog</h3>
              <button onClick={() => setMobileFilterOpen(false)} style={{ color: '#fff' }}>
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Availability Filter</label>
                <select
                  value={availabilityFilter}
                  onChange={e => setAvailabilityFilter(e.target.value as any)}
                  className="form-select"
                >
                  <option value="all">All Availability States</option>
                  <option value="available">🟢 Available Only</option>
                  <option value="sold_out">🔴 Sold Out Only</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category Filter</label>
                <select
                  value={selectedCat}
                  onChange={e => setSelectedCat(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Categories ({products.length})</option>
                  {categories.map(cat => {
                    const count = computeCategoryProductCount(cat.id, products);
                    return (
                      <option key={cat.id} value={cat.slug || cat.id}>
                        {cat.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                onClick={() => { setSelectedCat('all'); setAvailabilityFilter('all'); setMobileFilterOpen(false); }}
                className="btn btn-outline btn-sm"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="btn btn-primary btn-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP DATA TABLE (Shown on screens >= 768px) */}
      <div className="admin-show-desktop card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Saree Product</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Categories</th>
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
                  <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                    <Package size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#334155' }}>
                      No products found.
                    </p>
                    <p style={{ margin: '4px 0 1rem 0', fontSize: '0.85rem' }}>
                      No items match your filter criteria or search query.
                    </p>
                    <button onClick={() => navigate('/admin/products/new')} className="btn btn-primary btn-sm">
                      <Plus size={16} /> Create Product
                    </button>
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {resolveProductCategoriesForDisplay(prod, categories).map(badge => (
                          <span 
                            key={badge.key} 
                            className={`badge ${badge.isPrimary ? 'badge-primary' : 'badge-outline'}`} 
                            style={{ 
                              fontSize: '0.74rem',
                              opacity: badge.status === 'archived' || badge.status === 'legacy' ? 0.85 : 1
                            }}
                            title={badge.tooltip}
                          >
                            {badge.label} {badge.isPrimary ? '★' : ''}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--brand-muted)', fontSize: '0.85rem' }}>
                      {prod.sku}
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      ₹{(prod.price || 0).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {prod.availability === 'sold_out' ? (
                            <span style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                              🔴 Sold Out
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                              🟢 Available
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(prod, prod.availability === 'sold_out' ? 'available' : 'sold_out')}
                            disabled={togglingAvailabilityId === prod.id}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                          >
                            {togglingAvailabilityId === prod.id ? 'Saving...' : prod.availability === 'sold_out' ? 'Mark Available' : 'Mark Sold Out'}
                          </button>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {prod.published ? <span style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 700 }}>● Live</span> : <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>● Draft</span>}
                          {prod.occasion && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '4px', fontWeight: 600, textTransform: 'capitalize' }}>
                              {prod.occasion}
                            </span>
                          )}
                        </div>

                        {/* Homepage Row Authority Toggles */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(prod, 'isNewArrival')}
                            disabled={togglingFlagKey === `${prod.id}_isNewArrival`}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid',
                              borderColor: (prod.isNewArrival || prod.newArrival) ? '#0284c7' : '#cbd5e1',
                              backgroundColor: (prod.isNewArrival || prod.newArrival) ? '#e0f2fe' : '#ffffff',
                              color: (prod.isNewArrival || prod.newArrival) ? '#0369a1' : '#64748b',
                              cursor: togglingFlagKey === `${prod.id}_isNewArrival` ? 'wait' : 'pointer',
                              opacity: togglingFlagKey === `${prod.id}_isNewArrival` ? 0.6 : 1
                            }}
                            title="Toggle in Home Page 'New Arrivals' row"
                          >
                            {(prod.isNewArrival || prod.newArrival) ? '✓ New' : '+ New'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFlag(prod, 'isBestSeller')}
                            disabled={togglingFlagKey === `${prod.id}_isBestSeller`}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid',
                              borderColor: (prod.isBestSeller || prod.bestseller) ? '#ca8a04' : '#cbd5e1',
                              backgroundColor: (prod.isBestSeller || prod.bestseller) ? '#fef9c3' : '#ffffff',
                              color: (prod.isBestSeller || prod.bestseller) ? '#854d0e' : '#64748b',
                              cursor: togglingFlagKey === `${prod.id}_isBestSeller` ? 'wait' : 'pointer',
                              opacity: togglingFlagKey === `${prod.id}_isBestSeller` ? 0.6 : 1
                            }}
                            title="Toggle in Home Page 'Bestsellers & Top Picks' row"
                          >
                            {(prod.isBestSeller || prod.bestseller) ? '✓ Best' : '+ Best'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFlag(prod, 'isMostWanted')}
                            disabled={togglingFlagKey === `${prod.id}_isMostWanted`}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid',
                              borderColor: (prod.isMostWanted || prod.mostWanted) ? '#dc2626' : '#cbd5e1',
                              backgroundColor: (prod.isMostWanted || prod.mostWanted) ? '#fee2e2' : '#ffffff',
                              color: (prod.isMostWanted || prod.mostWanted) ? '#991b1b' : '#64748b',
                              cursor: togglingFlagKey === `${prod.id}_isMostWanted` ? 'wait' : 'pointer',
                              opacity: togglingFlagKey === `${prod.id}_isMostWanted` ? 0.6 : 1
                            }}
                            title="Toggle in Home Page 'Most Wanted' row"
                          >
                            {(prod.isMostWanted || prod.mostWanted) ? '✓ Wanted' : '+ Wanted'}
                          </button>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleEditProduct(prod.id)} 
                          className="btn btn-outline btn-sm"
                        >
                          <Edit3 size={14} /> Edit
                        </button>

                        <button 
                          onClick={() => handleDeleteProduct(prod.id, prod.name)} 
                          className="btn btn-danger btn-sm"
                        >
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

      {/* MOBILE PRODUCT CARDS (Shown on screens < 768px) */}
      <div className="admin-show-mobile admin-mobile-card-grid">
        {filteredProducts.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No products found matching filters.</p>
          </div>
        ) : (
          filteredProducts.map(prod => (
            <div key={prod.id} className="admin-mobile-card">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid var(--brand-border)', flexShrink: 0 }}>
                  <img src={(prod.images && prod.images[0]) || '/saree_model_individual.jpg'} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--brand-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {prod.name}
                  </h4>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                      SKU: {prod.sku}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      ₹{(prod.price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700, color: (prod.stock || 0) <= 3 ? '#ef4444' : '#10b981' }}>
                  ● {prod.stock || 0} in stock
                </span>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {prod.published ? (
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>Published</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Draft</span>
                  )}
                  {prod.availability === 'sold_out' && (
                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>• Sold Out</span>
                  )}
                </div>
              </div>

              {/* Homepage Row Authority Toggles on Mobile */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(prod, 'isNewArrival')}
                  disabled={togglingFlagKey === `${prod.id}_isNewArrival`}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: (prod.isNewArrival || prod.newArrival) ? '#0284c7' : '#cbd5e1',
                    backgroundColor: (prod.isNewArrival || prod.newArrival) ? '#e0f2fe' : '#ffffff',
                    color: (prod.isNewArrival || prod.newArrival) ? '#0369a1' : '#64748b',
                    cursor: togglingFlagKey === `${prod.id}_isNewArrival` ? 'wait' : 'pointer',
                    opacity: togglingFlagKey === `${prod.id}_isNewArrival` ? 0.6 : 1
                  }}
                >
                  {(prod.isNewArrival || prod.newArrival) ? '✓ New' : '+ New'}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(prod, 'isBestSeller')}
                  disabled={togglingFlagKey === `${prod.id}_isBestSeller`}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: (prod.isBestSeller || prod.bestseller) ? '#ca8a04' : '#cbd5e1',
                    backgroundColor: (prod.isBestSeller || prod.bestseller) ? '#fef9c3' : '#ffffff',
                    color: (prod.isBestSeller || prod.bestseller) ? '#854d0e' : '#64748b',
                    cursor: togglingFlagKey === `${prod.id}_isBestSeller` ? 'wait' : 'pointer',
                    opacity: togglingFlagKey === `${prod.id}_isBestSeller` ? 0.6 : 1
                  }}
                >
                  {(prod.isBestSeller || prod.bestseller) ? '✓ Best' : '+ Best'}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(prod, 'isMostWanted')}
                  disabled={togglingFlagKey === `${prod.id}_isMostWanted`}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: (prod.isMostWanted || prod.mostWanted) ? '#dc2626' : '#cbd5e1',
                    backgroundColor: (prod.isMostWanted || prod.mostWanted) ? '#fee2e2' : '#ffffff',
                    color: (prod.isMostWanted || prod.mostWanted) ? '#991b1b' : '#64748b',
                    cursor: togglingFlagKey === `${prod.id}_isMostWanted` ? 'wait' : 'pointer',
                    opacity: togglingFlagKey === `${prod.id}_isMostWanted` ? 0.6 : 1
                  }}
                >
                  {(prod.isMostWanted || prod.mostWanted) ? '✓ Wanted' : '+ Wanted'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(prod, prod.availability === 'sold_out' ? 'available' : 'sold_out')}
                  disabled={togglingAvailabilityId === prod.id}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  {prod.availability === 'sold_out' ? 'Mark Available' : 'Mark Sold Out'}
                </button>

                <button
                  onClick={() => handleEditProduct(prod.id)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                >
                  <Edit3 size={14} /> Edit Product
                </button>

                <button
                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '4px 8px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
