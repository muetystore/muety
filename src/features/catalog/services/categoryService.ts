import { Category, Product } from '../types';
import { storageService, subscribeLocalCategories } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import { 
  validateCategoryCode, 
  isCategoryCodeUnique, 
  generateCategoryCodeSuggestion,
  isCategoryCodeLocked 
} from './categoryCodeService';
import { ensureLiveAdminAuth } from './catalogAuthHelper';

const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));

/**
 * Normalizes a category title into a clean, URL-safe slug.
 * Deterministic: lowercases, converts non-alphanumeric to hyphens, strips edge hyphens.
 */
export function normalizeCategorySlug(nameOrSlug: string): string {
  if (!nameOrSlug || typeof nameOrSlug !== 'string') return '';
  return nameOrSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Detects whether a string is a raw auto-generated ID (like Firestore 20-char ID or cat-timestamp)
 * rather than a human-readable title.
 */
export function isLikelyDocumentId(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  // Firestore 20-char base62 IDs (e.g. V45HYntNgV6yaicEI5Zl, m2ozFKH6v8aZpedaUYzF)
  if (/^[A-Za-z0-9]{20}$/.test(clean)) return true;
  // Timestamp-based generated IDs (e.g. cat-1791267027302, prod-1791968989283)
  if (/^(cat|prod)-[0-9]+(-[0-9]+)?$/i.test(clean)) return true;
  return false;
}

export interface ResolvedCategoryBadge {
  key: string;
  id: string;
  label: string;
  name: string;
  isPrimary: boolean;
  status: 'active' | 'archived' | 'legacy' | 'unassigned';
  isOrphaned: boolean;
  tooltip?: string;
}

/**
 * Safely resolves category badges for product listing table and details.
 * Invariant: NEVER displays raw Firestore document IDs (e.g. V45HYntNgV6yaicEI5Zl).
 * Resolves to human-readable category name or a clear 'Category unavailable' indicator.
 */
export function resolveProductCategoriesForDisplay(
  product: Product, 
  categories: Category[]
): ResolvedCategoryBadge[] {
  if (!product) return [];

  const rawIds: string[] = Array.isArray(product.categoryIds) && product.categoryIds.length > 0
    ? product.categoryIds
    : [product.primaryCategoryId || product.categoryId || product.category].filter(Boolean) as string[];

  const badges: ResolvedCategoryBadge[] = [];
  const seenLabels = new Set<string>();

  rawIds.forEach((cid, idx) => {
    if (!cid) return;

    // 1. Check if cid matches a live category (by ID, slug, or name)
    const matchedCat = categories.find(c => 
      c.id === cid || 
      (c.slug && c.slug.toLowerCase() === cid.toLowerCase()) ||
      (c.name && c.name.toLowerCase() === cid.toLowerCase())
    );

    const isPrimary = cid === product.primaryCategoryId || 
                      cid === product.categoryId || 
                      (matchedCat && matchedCat.id === product.primaryCategoryId) ||
                      idx === 0;

    if (matchedCat) {
      const label = matchedCat.name;
      // Remove any legacy unlisted placeholder that might have been tentatively added for the same category name
      const existingLegacyIdx = badges.findIndex(b => b.isOrphaned && b.name.toLowerCase().startsWith(label.toLowerCase()));
      if (existingLegacyIdx !== -1) {
        badges.splice(existingLegacyIdx, 1);
      }
      if (!badges.some(b => b.id === matchedCat.id)) {
        badges.push({
          key: `${matchedCat.id}_${idx}`,
          id: matchedCat.id,
          label,
          name: label,
          isPrimary,
          status: 'active',
          isOrphaned: false,
          tooltip: `Category Code: ${matchedCat.categoryCode || 'N/A'}`
        });
      }
      return;
    }

    // 2. Not found directly by cid in active categories.
    // Check if the product has a human-readable category name stored on it
    const candidateName = product.category && !isLikelyDocumentId(product.category)
      ? product.category
      : null;

    if (candidateName) {
      // Check if candidateName matches an active category
      const liveCatByName = categories.find(c => 
        c.name.toLowerCase() === candidateName.toLowerCase() || 
        c.slug.toLowerCase() === candidateName.toLowerCase()
      );
      if (liveCatByName) {
        if (!badges.some(b => b.id === liveCatByName.id)) {
          badges.push({
            key: `${liveCatByName.id}_${idx}`,
            id: liveCatByName.id,
            label: liveCatByName.name,
            name: liveCatByName.name,
            isPrimary,
            status: 'active',
            isOrphaned: false,
            tooltip: `Category Code: ${liveCatByName.categoryCode || 'N/A'}`
          });
        }
        return;
      }

      const label = `${candidateName} (Unlisted)`;
      if (!seenLabels.has(label.toLowerCase())) {
        seenLabels.add(label.toLowerCase());
        badges.push({
          key: `legacy_${cid}_${idx}`,
          id: cid,
          label,
          name: label,
          isPrimary,
          status: 'legacy',
          isOrphaned: true,
          tooltip: `Referenced category "${cid}" is not in active catalog categories.`
        });
      }
    } else {
      // 3. Unresolved / Unknown category ID
      const unassignedLabel = 'Category unavailable';
      if (!seenLabels.has(unassignedLabel.toLowerCase())) {
        seenLabels.add(unassignedLabel.toLowerCase());
        badges.push({
          key: `unassigned_${cid}_${idx}`,
          id: cid,
          label: unassignedLabel,
          name: unassignedLabel,
          isPrimary,
          status: 'unassigned',
          isOrphaned: true,
          tooltip: `Unresolved category reference: ${cid}`
        });
      }
    }
  });

  if (badges.length === 0) {
    badges.push({
      key: 'none',
      id: '',
      label: 'Unassigned',
      name: 'Unassigned',
      isPrimary: true,
      status: 'unassigned',
      isOrphaned: true
    });
  }

  return badges;
}

/**
 * Calculates real-time active product count for a category.
 * Matches by canonical category ID, primaryCategoryId, categoryId, or categorySlug.
 */
export function computeCategoryProductCount(
  categoryIdOrSlug: string, 
  products: Product[],
  publishedOnly = false
): number {
  if (!categoryIdOrSlug || !Array.isArray(products)) return 0;
  const target = categoryIdOrSlug.trim().toLowerCase();

  return products.filter(p => {
    if (!p) return false;
    if (publishedOnly && (p.published === false || p.status === 'draft')) {
      return false;
    }
    const hasInArray = Array.isArray(p.categoryIds) && p.categoryIds.some(id => (id || '').trim().toLowerCase() === target);
    const primMatch = (p.primaryCategoryId || '').trim().toLowerCase() === target;
    const catIdMatch = (p.categoryId || '').trim().toLowerCase() === target;
    const slugMatch = (p.categorySlug || '').trim().toLowerCase() === target;
    return hasInArray || primMatch || catIdMatch || slugMatch;
  }).length;
}

/**
 * Checks whether a category can safely be deleted.
 * Prevents deletion if active or draft products are currently assigned to it.
 */
export function canDeleteCategory(
  categoryId: string, 
  products: Product[]
): { canDelete: boolean; assignedCount: number; sampleProductNames: string[] } {
  if (!categoryId || !Array.isArray(products)) {
    return { canDelete: true, assignedCount: 0, sampleProductNames: [] };
  }

  const assigned = products.filter(p => {
    if (!p) return false;
    return (p.categoryIds && p.categoryIds.includes(categoryId)) ||
           p.primaryCategoryId === categoryId ||
           p.categoryId === categoryId;
  });

  return {
    canDelete: assigned.length === 0,
    assignedCount: assigned.length,
    sampleProductNames: assigned.slice(0, 3).map(p => p.name || p.title || 'Untitled')
  };
}

class CategoryService {
  getCategories(): Category[] {
    return storageService.getCategories();
  }

  getCategoryById(idOrSlug: string): Category | undefined {
    if (!idOrSlug) return undefined;
    const clean = idOrSlug.trim().toLowerCase();
    const list = this.getCategories();
    return list.find(c => 
      c.id === idOrSlug || 
      (c.slug && c.slug.toLowerCase() === clean) ||
      (c.name && c.name.toLowerCase() === clean)
    );
  }

  subscribeToCategories(
    callback: (categories: Category[]) => void, 
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (db && !isTestEnv) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
          const cloudCats: Category[] = [];
          if (!snapshot.empty) {
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as any;
              if (raw && (raw.id || docSnap.id)) {
                let imgUrl = raw.imageUrl || raw.image || raw.coverImage || raw.coverImageUrl || '/saree_model_individual.jpg';
                if (imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') || imgUrl.startsWith('file:')) {
                  imgUrl = 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80';
                }
                const name = (raw.name || '').trim();
                const slug = normalizeCategorySlug(raw.slug || name);
                const code = (raw.categoryCode || generateCategoryCodeSuggestion(name) || 'XX').trim().toUpperCase();

                cloudCats.push({
                  ...raw,
                  id: docSnap.id || raw.id,
                  name,
                  slug,
                  categoryCode: code,
                  code,
                  image: imgUrl,
                  imageUrl: imgUrl,
                  coverImage: imgUrl,
                  coverImageUrl: imgUrl,
                  active: raw.active !== false,
                  isActive: raw.active !== false
                });
              }
            });
          }

          storageService.saveCategories(cloudCats);
          callback(cloudCats);
        }, (err) => {
          console.error('[CategoryService] Firestore live category subscription error:', err);
          if (onError) onError(err as Error);
          else callback(storageService.getCategories());
        });

        return unsubscribe;
      } catch (err: any) {
        console.error('[CategoryService] Live subscription init error:', err);
        if (onError) onError(err as Error);
      }
    }

    callback(storageService.getCategories());
    return subscribeLocalCategories((updatedCats) => callback(updatedCats));
  }

  async saveCategory(categoryData: Partial<Category> & { name: string }): Promise<Category> {
    const cleanName = (categoryData.name || '').trim();
    if (!cleanName || cleanName.length < 3) {
      throw new Error('Category name is required and must be at least 3 characters.');
    }

    const currentId = categoryData.id;
    const catId = currentId || `cat-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const slug = normalizeCategorySlug(categoryData.slug || cleanName);

    // Validate Slug Uniqueness
    const allCats = this.getCategories();
    const slugConflict = allCats.find(c => c.slug === slug && c.id !== catId);
    if (slugConflict) {
      throw new Error(`Category slug "${slug}" is already in use by "${slugConflict.name}".`);
    }

    // Category Code
    const categoryCode = (categoryData.categoryCode || (categoryData as any).code || '').trim().toUpperCase();
    if (!categoryCode) {
      throw new Error('Category code is required (must be 2 uppercase letters, e.g. SA, FG).');
    }

    const valCode = validateCategoryCode(categoryCode);
    if (!valCode.valid) {
      throw new Error(valCode.error || 'Invalid category code.');
    }

    const codeUnique = await isCategoryCodeUnique(categoryCode, catId);
    if (!codeUnique) {
      throw new Error(`Category code "${categoryCode}" is already used by another category.`);
    }

    const imgUrl = categoryData.image || categoryData.imageUrl || categoryData.coverImage || '/saree_model_individual.jpg';
    if (imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') || imgUrl.startsWith('file:')) {
      throw new Error('Category image must be a permanent HTTPS URL.');
    }

    const nowIso = new Date().toISOString();
    const category: Category = {
      id: catId,
      name: cleanName,
      slug,
      categoryCode,
      description: (categoryData.description || '').trim(),
      image: imgUrl,
      imageUrl: imgUrl,
      coverImage: imgUrl,
      coverImageUrl: imgUrl,
      itemCount: Number(categoryData.itemCount || 0),
      active: categoryData.active !== false,
      featured: Boolean(categoryData.featured),
      isTrending: Boolean(categoryData.isTrending),
      createdAt: categoryData.createdAt || nowIso,
      updatedAt: nowIso
    };

    if (db && !isTestEnv) {
      try {
        await ensureLiveAdminAuth();
        const batch = writeBatch(db);
        batch.set(doc(db, 'categories', catId), category, { merge: true });
        batch.set(doc(db, 'categoryCodes', categoryCode), { categoryId: catId, code: categoryCode }, { merge: true });
        await batch.commit();
      } catch (err: any) {
        console.error('[CategoryService] Firestore write failed:', err);
        throw new Error(`Firestore category write failed: ${err.message || err}`);
      }
    }

    const existingCat = this.getCategoryById(catId);
    if (existingCat) {
      storageService.updateCategory(category);
    } else {
      storageService.addCategory(category);
    }

    return category;
  }

  async deleteCategory(id: string, force = false): Promise<boolean> {
    if (!id) return false;

    if (!force) {
      const allProducts = storageService.getProducts();
      const check = canDeleteCategory(id, allProducts);
      if (!check.canDelete) {
        throw new Error(`Cannot delete category: ${check.assignedCount} product(s) are currently assigned to it.`);
      }
    }

    const targetCat = this.getCategoryById(id);

    if (db && !isTestEnv) {
      try {
        await ensureLiveAdminAuth();
        const batch = writeBatch(db);
        batch.delete(doc(db, 'categories', id));
        if (targetCat?.categoryCode) {
          batch.delete(doc(db, 'categoryCodes', targetCat.categoryCode));
        }
        await batch.commit();
      } catch (err: any) {
        console.error('[CategoryService] Firestore delete failed:', err);
        throw new Error(`Firestore category deletion failed: ${err.message || err}`);
      }
    }

    storageService.deleteCategory(id);
    return true;
  }
}

export const categoryService = new CategoryService();
