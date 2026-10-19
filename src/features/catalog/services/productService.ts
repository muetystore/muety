import { Product, Category } from '../types';
import { storageService, subscribeLocalCategories, subscribeLocalProducts } from '@/lib/storage/storageService';
import { db, app, auth } from '@/lib/firebase/firebase';
import { env } from '@/lib/config/env';
import { authService } from '@/features/auth/services/authService';
import { auditService } from '@/shared/services/auditService';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  onSnapshot, 
  getDocs,
  query,
  where,
  writeBatch,
  runTransaction,
  Unsubscribe 
} from 'firebase/firestore';
import { 
  generateCategoryCodeSuggestion,
  validateCategoryCode,
  isCategoryCodeUnique
} from './categoryCodeService';
import { 
  uploadToCloudinary, 
  uploadProductImagesToCloudinary,
  deleteCloudinaryMedia,
  extractCloudinaryPublicId,
  CloudinaryMediaMetadata
} from '@/lib/media/cloudinary';

const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
const inFlightSkus = new Set<string>();
const localCounters: Record<string, number> = {};

export function clearSkuCounters(): void {
  Object.keys(localCounters).forEach(k => delete localCounters[k]);
  inFlightSkus.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('muety_counter_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}

export function clearInFlightSkus(): void {
  clearSkuCounters();
}

export function resolveCategoryCode(primaryCategoryId: string): string {
  const categories = storageService.getCategories();
  const primaryCat = categories.find(c => 
    c.id === primaryCategoryId || 
    c.slug === primaryCategoryId || 
    (c.categoryCode && c.categoryCode.toUpperCase() === primaryCategoryId.toUpperCase()) ||
    c.name.toLowerCase() === primaryCategoryId.toLowerCase()
  );
  
  let categoryCode = (primaryCat?.categoryCode || '').trim().toUpperCase();
  if (!categoryCode || categoryCode.length !== 2) {
    if (primaryCategoryId && /^[A-Za-z]{2}$/.test(primaryCategoryId)) {
      categoryCode = primaryCategoryId.toUpperCase();
    } else {
      categoryCode = generateCategoryCodeSuggestion(primaryCat?.name || primaryCategoryId || 'Saree') || 'XX';
    }
  }
  return categoryCode;
}

export async function uploadProductImage(
  imageDataOrUrl: string, 
  productId: string, 
  index: number
): Promise<string> {
  if (!imageDataOrUrl) return '';

  if (imageDataOrUrl.startsWith('http://') || imageDataOrUrl.startsWith('https://')) {
    return imageDataOrUrl;
  }

  try {
    const res = await uploadToCloudinary(imageDataOrUrl, {
      productId,
      publicId: `image_${index}_${Date.now()}`
    });
    return res.url;
  } catch (err: any) {
    console.warn('Cloudinary image upload note:', err);
    return imageDataOrUrl;
  }
}

export async function uploadProductImages(images: string[], productId: string): Promise<string[]> {
  if (!images || images.length === 0) return [];
  const metaList = await uploadProductImagesToCloudinary(images, productId);
  return metaList.map(m => m.url);
}

export const productService = {
  async saveProduct(product: Product): Promise<Product> {
    const existing = storageService.getProductById(product.id);
    if (existing) {
      return this.updateProduct(product);
    } else {
      return this.createProduct(product);
    }
  },

  getAllProducts(): Product[] {
    const list = storageService.getProducts();
    return list.filter(p => 
      p.name && 
      !p.name.toLowerCase().includes('dfvdfvdf') && 
      p.categorySlug !== 'timepieces' && 
      p.categorySlug !== 'leather-goods' && 
      p.categorySlug !== 'eyewear' &&
      p.categorySlug !== 'audio'
    );
  },

  getProductById(id: string): Product | undefined {
    return storageService.getProductById(id);
  },

  getProductBySlug(slug: string): Product | undefined {
    if (!slug) return undefined;
    const clean = slug.toLowerCase().trim();
    const products = storageService.getProducts();

    // 1. Direct match on slug or id
    const exact = products.find(p => 
      (p.slug && p.slug.toLowerCase().trim() === clean) || 
      (p.id && p.id.toLowerCase().trim() === clean)
    );
    if (exact) return exact;

    // 2. Slugified title or name match
    const slugified = products.find(p => {
      const nameSlug = (p.name || p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      return nameSlug === clean;
    });
    if (slugified) return slugified;

    // 3. Fallback name/title match
    return products.find(p => 
      (p.name && p.name.toLowerCase().trim() === clean) ||
      (p.title && p.title.toLowerCase().trim() === clean)
    );
  },

  mapFirestoreDocToProduct(docId: string, raw: any, fallbackSlug?: string): Product {
    const title = raw.title || raw.name || 'Untitled Product';
    const cleanSlug = (raw.slug || fallbackSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || docId).toLowerCase().trim();
    const stock = raw.stock !== undefined ? Number(raw.stock) : (raw.inventory !== undefined ? Number(raw.inventory) : 10);
    const category = raw.category || 'Festive Silk Sarees';
    const categorySlug = raw.categorySlug || 'sarees';

    return {
      id: docId || raw.id,
      name: title,
      title,
      slug: cleanSlug,
      description: raw.description || '',
      shortDescription: raw.shortDescription || '',
      price: Number(raw.price) || 0,
      originalPrice: raw.originalPrice ? Number(raw.originalPrice) : undefined,
      discountPercentage: Number(raw.discountPercentage || 0),
      rating: Number(raw.rating) || 5.0,
      reviewCount: Number(raw.reviewCount) || (Array.isArray(raw.reviews) ? raw.reviews.length : 0),
      stock,
      inventory: stock,
      sku: raw.sku || `MUETY-${Math.floor(100 + Math.random() * 900)}`,
      category,
      categorySlug,
      categoryId: raw.categoryId,
      categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : [],
      primaryCategoryId: raw.primaryCategoryId,
      images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : ['/saree_model_individual.jpg'],
      media: Array.isArray(raw.media) ? raw.media : [],
      colors: Array.isArray(raw.colors) && raw.colors.length > 0 ? raw.colors : ['Golden Ochre', 'Crimson Red', 'Royal Emerald'],
      sizes: Array.isArray(raw.sizes) && raw.sizes.length > 0 ? raw.sizes : ['Standard Saree Length (6.3m with Blouse)'],
      reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
      featured: Boolean(raw.featured),
      isNewArrival: Boolean(raw.isNewArrival || raw.newArrival),
      newArrival: Boolean(raw.isNewArrival || raw.newArrival),
      isBestSeller: Boolean(raw.isBestSeller || raw.bestseller),
      bestseller: Boolean(raw.isBestSeller || raw.bestseller),
      isMostWanted: Boolean(raw.isMostWanted || raw.mostWanted),
      mostWanted: Boolean(raw.isMostWanted || raw.mostWanted),
      status: raw.status || 'active',
      availability: raw.availability || (stock > 0 ? 'available' : 'sold_out'),
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      specifications: raw.specifications || {},
      fabric: raw.fabric || raw.material || raw.specifications?.Fabric || raw.specifications?.fabric || '',
      material: raw.material || raw.fabric || '',
      silkType: raw.silkType || '',
      weave: raw.weave || raw.weaveTechnique || raw.specifications?.['Weave Technique'] || raw.specifications?.Weave || '',
      weaveTechnique: raw.weaveTechnique || raw.weave || '',
      zariType: raw.zariType || raw.specifications?.Zari || raw.specifications?.zari || '',
      borderType: raw.borderType || '',
      palluType: raw.palluType || '',
      craftsmanship: raw.craftsmanship || '',
      careInstructions: raw.careInstructions || '',
      authenticityInformation: raw.authenticityInformation || '',
      sareeLength: raw.sareeLength || '',
      brand: raw.brand || (typeof raw.name === 'string' && raw.name.startsWith('KOB') ? 'KOB' : (typeof raw.name === 'string' && raw.name.startsWith('MUETY') ? 'MUETY' : 'MUETY')),
      gender: raw.gender || 'Women',
      occasion: raw.occasion || '',
      occasions: Array.isArray(raw.occasions) ? raw.occasions : (raw.occasion ? [raw.occasion] : []),
      collectionId: raw.collectionId || '',
      collectionIds: Array.isArray(raw.collectionIds) ? raw.collectionIds : (raw.collectionId ? [raw.collectionId] : []),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString()
    };
  },

  async fetchProductBySlug(slug: string): Promise<Product | undefined> {
    if (!slug) return undefined;
    const cleanSlug = slug.toLowerCase().trim();

    // 1. Check local cache first
    const cached = this.getProductBySlug(cleanSlug);
    if (cached) {
      return cached;
    }

    if (db) {
      try {
        // Query by slug (clean lowercase)
        const qSlug = query(collection(db, 'products'), where('slug', '==', cleanSlug));
        const snapSlug = await getDocs(qSlug);
        if (!snapSlug.empty) {
          const docSnap = snapSlug.docs[0];
          const p = this.mapFirestoreDocToProduct(docSnap.id, docSnap.data(), cleanSlug);
          storageService.addProduct(p);
          return p;
        }

        // Query by id field
        const qId = query(collection(db, 'products'), where('id', '==', cleanSlug));
        const snapId = await getDocs(qId);
        if (!snapId.empty) {
          const docSnap = snapId.docs[0];
          const p = this.mapFirestoreDocToProduct(docSnap.id, docSnap.data(), cleanSlug);
          storageService.addProduct(p);
          return p;
        }

        // Direct document lookup by ID
        const docRef = doc(db, 'products', cleanSlug);
        const docSnap = await getDoc(docRef);
        if (docSnap && docSnap.exists()) {
          const p = this.mapFirestoreDocToProduct(docSnap.id, docSnap.data(), cleanSlug);
          storageService.addProduct(p);
          return p;
        }

        // Fallback: If not found by exact indexed query (e.g. title-cased slug or special characters in Firestore)
        const allSnap = await getDocs(collection(db, 'products'));
        for (const d of allSnap.docs) {
          const raw = d.data() as any;
          const rawSlug = (raw.slug || '').toLowerCase().trim();
          const rawId = (raw.id || d.id || '').toLowerCase().trim();
          const rawTitle = (raw.title || raw.name || '').toLowerCase().trim();
          const slugifiedTitle = rawTitle.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

          if (rawSlug === cleanSlug || rawId === cleanSlug || rawTitle === cleanSlug || slugifiedTitle === cleanSlug) {
            const p = this.mapFirestoreDocToProduct(d.id, raw, cleanSlug);
            storageService.addProduct(p);
            return p;
          }
        }
      } catch (err) {
        console.warn('Firestore fetchProductBySlug note:', err);
      }
    }

    return this.getProductBySlug(cleanSlug);
  },

  getFeaturedProducts(): Product[] {
    return storageService.getProducts().filter(p => p.featured);
  },

  getNewArrivals(): Product[] {
    return storageService.getProducts().filter(p => p.isNewArrival || p.newArrival);
  },

  getBestSellers(): Product[] {
    return storageService.getProducts().filter(p => p.isBestSeller || p.bestseller);
  },

  getMostWantedProducts(): Product[] {
    return storageService.getProducts().filter(p => p.isMostWanted || p.mostWanted);
  },

  async getSkuPreviewForCategory(primaryCategoryId: string): Promise<string> {
    const categoryCode = resolveCategoryCode(primaryCategoryId);

    let num = 1;
    let readFromFirestore = false;
    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));

    if (db && !isTestEnv) {
      try {
        const counterDocId = `productSku_${categoryCode}`;
        const counterRef = doc(db, 'counters', counterDocId);
        const counterSnap = await getDoc(counterRef);
        if (counterSnap.exists()) {
          num = Number(counterSnap.data()?.nextNumber) || 1;
          readFromFirestore = true;
        }
      } catch (err) {
        console.warn('[productService] Firestore SKU preview read note:', err);
      }
    }

    if (!readFromFirestore) {
      if (localCounters[categoryCode] !== undefined && localCounters[categoryCode] > 0) {
        num = localCounters[categoryCode];
      } else {
        const key = `muety_counter_${categoryCode}`;
        const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        const storedNum = stored ? parseInt(stored, 10) : 0;
        if (storedNum > 0) {
          num = storedNum;
        } else {
          const allProducts = storageService.getProducts();
          const prefix1 = `${categoryCode}-`;
          const prefix2 = `MUETY-${categoryCode}-`;
          let maxSeq = 0;
          allProducts.forEach(p => {
            if (p.sku) {
              const upperSku = p.sku.toUpperCase();
              let seqStr = '';
              if (upperSku.startsWith(prefix1)) {
                seqStr = upperSku.replace(prefix1, '');
              } else if (upperSku.startsWith(prefix2)) {
                seqStr = upperSku.replace(prefix2, '');
              }
              if (seqStr) {
                const seqNum = parseInt(seqStr, 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) {
                  maxSeq = seqNum;
                }
              }
            }
          });
          num = maxSeq + 1;
        }
      }
    }

    let formattedNum = num < 10 ? `0${num}` : `${num}`;
    let proposedSku = `${categoryCode}-${formattedNum}`;

    let attempts = 0;
    while ((await this.checkSkuExists(proposedSku)) && attempts < 50) {
      num++;
      attempts++;
      formattedNum = num < 10 ? `0${num}` : `${num}`;
      proposedSku = `${categoryCode}-${formattedNum}`;
    }

    return proposedSku;
  },

  async generateNextSkuForCategory(primaryCategoryId: string): Promise<string> {
    return this.getSkuPreviewForCategory(primaryCategoryId);
  },

  getProductsByCategory(categorySlugOrId: string): Product[] {
    const cleanCat = (categorySlugOrId || '').toLowerCase().trim();
    const categories = storageService.getCategories();
    const targetCat = categories.find(c => 
      c.id.toLowerCase() === cleanCat || 
      c.slug.toLowerCase() === cleanCat || 
      c.name.toLowerCase() === cleanCat
    );
    const targetId = targetCat ? targetCat.id : cleanCat;
    const targetSlug = targetCat ? targetCat.slug : cleanCat;

    return storageService.getProducts().filter(p => {
      if (p.categoryIds && Array.isArray(p.categoryIds) && p.categoryIds.length > 0) {
        const hasMatch = p.categoryIds.some(cid => {
          const lowerCid = cid.toLowerCase();
          return lowerCid === targetId.toLowerCase() || 
                 lowerCid === targetSlug.toLowerCase() ||
                 lowerCid === cleanCat;
        });
        if (hasMatch) return true;
      }

      if (p.primaryCategoryId) {
        const primLower = p.primaryCategoryId.toLowerCase();
        if (primLower === targetId.toLowerCase() || primLower === targetSlug.toLowerCase() || primLower === cleanCat) {
          return true;
        }
      }

      return (p.categorySlug || '').toLowerCase() === cleanCat ||
             (p.categorySlug || '').toLowerCase() === targetSlug.toLowerCase() ||
             (p.category || '').toLowerCase() === cleanCat;
    });
  },

  searchProducts(queryText: string, category?: string, minPrice?: number, maxPrice?: number, sortBy?: string): Product[] {
    let products = storageService.getProducts();

    if (queryText) {
      const q = queryText.toLowerCase().trim();
      products = products.filter(
        p => (p.name || '').toLowerCase().includes(q) ||
             (p.title || '').toLowerCase().includes(q) ||
             (p.description || '').toLowerCase().includes(q) ||
             (p.shortDescription || '').toLowerCase().includes(q) ||
             (p.category || '').toLowerCase().includes(q) ||
             (p.categorySlug || '').toLowerCase() === q ||
             ((p.tags || []).some(tag => (tag || '').toLowerCase().includes(q))) ||
             (p.sku || '').toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      const catLower = category.toLowerCase().trim();
      const categories = storageService.getCategories();
      const targetCat = categories.find(c => 
        c.id.toLowerCase() === catLower || 
        c.slug.toLowerCase() === catLower || 
        c.name.toLowerCase() === catLower
      );
      const targetId = targetCat ? targetCat.id : catLower;
      const targetSlug = targetCat ? targetCat.slug : catLower;

      products = products.filter(p => {
        if (p.categoryIds && Array.isArray(p.categoryIds) && p.categoryIds.length > 0) {
          const hasMatch = p.categoryIds.some(cid => {
            const lowerCid = cid.toLowerCase();
            return lowerCid === targetId.toLowerCase() || 
                   lowerCid === targetSlug.toLowerCase() || 
                   lowerCid === catLower;
          });
          if (hasMatch) return true;
        }

        if (p.primaryCategoryId) {
          const primLower = p.primaryCategoryId.toLowerCase();
          if (primLower === targetId.toLowerCase() || primLower === targetSlug.toLowerCase() || primLower === catLower) {
            return true;
          }
        }

        return (p.categorySlug || '').toLowerCase() === catLower ||
               (p.categorySlug || '').toLowerCase() === targetSlug.toLowerCase() ||
               (p.category || '').toLowerCase() === catLower;
      });
    }

    if (minPrice !== undefined) {
      products = products.filter(p => p.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      products = products.filter(p => p.price <= maxPrice);
    }

    if (sortBy) {
      switch (sortBy) {
        case 'price-low':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          products.sort((a, b) => (b.rating || 5) - (a.rating || 5));
          break;
        case 'newest':
          products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        default:
          break;
      }
    }

    return products;
  },

  getRelatedProducts(productId: string, limit = 4, currentProduct?: Product): Product[] {
    const current = currentProduct || storageService.getProductById(productId);
    const allProducts = storageService.getProducts();

    const excludeIds = new Set<string>();
    const excludeSlugs = new Set<string>();
    const excludeNames = new Set<string>();

    if (productId) {
      excludeIds.add(productId.toLowerCase());
      excludeSlugs.add(productId.toLowerCase());
    }

    if (current) {
      if (current.id) excludeIds.add(current.id.toLowerCase());
      if (current.slug) excludeSlugs.add(current.slug.toLowerCase());
      const name = (current.name || (current as any).title || '').trim().toLowerCase();
      if (name) excludeNames.add(name);
    }

    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    const seenNames = new Set<string>();
    const candidates: Product[] = [];

    for (const p of allProducts) {
      const pId = (p.id || '').trim().toLowerCase();
      const pSlug = (p.slug || '').trim().toLowerCase();
      const pName = (p.name || (p as any).title || '').trim().toLowerCase();

      // Skip current product being viewed
      if (excludeIds.has(pId) || excludeSlugs.has(pSlug) || (pName && excludeNames.has(pName))) {
        continue;
      }

      // Skip duplicate products (same ID, slug, or name)
      if (pId && seenIds.has(pId)) continue;
      if (pSlug && seenSlugs.has(pSlug)) continue;
      if (pName && seenNames.has(pName)) continue;

      if (pId) seenIds.add(pId);
      if (pSlug) seenSlugs.add(pSlug);
      if (pName) seenNames.add(pName);

      candidates.push(p);
    }

    if (!current) {
      return candidates.slice(0, limit);
    }

    const currentCatSlug = (current.categorySlug || '').toLowerCase();
    const currentCat = (current.category || '').toLowerCase();

    // Prioritize matching category, then fill with other catalog pieces
    const sameCategory = candidates.filter(
      p => (currentCatSlug && (p.categorySlug || '').toLowerCase() === currentCatSlug) ||
           (currentCat && (p.category || '').toLowerCase() === currentCat)
    );

    const otherCategory = candidates.filter(
      p => !((currentCatSlug && (p.categorySlug || '').toLowerCase() === currentCatSlug) ||
             (currentCat && (p.category || '').toLowerCase() === currentCat))
    );

    const results: Product[] = [...sameCategory];
    if (results.length < limit) {
      for (const other of otherCategory) {
        if (results.length >= limit) break;
        results.push(other);
      }
    }

    return results.slice(0, limit);
  },

  async createProduct(productData: Partial<Product> & { id?: string; slug?: string; sku?: string }): Promise<Product> {
    if (!productData.name?.trim() && !productData.title?.trim()) {
      throw new Error('Product creation failed: Product title is required.');
    }

    const productId = productData.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const title = (productData.title || productData.name || '').trim();
    const slug = productData.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || productId;

    // Multi-category & Primary category normalization
    const categories = storageService.getCategories();
    let categoryIds: string[] = Array.isArray(productData.categoryIds) && productData.categoryIds.length > 0 
      ? productData.categoryIds 
      : [];
    
    if (categoryIds.length === 0) {
      if (productData.categoryId) {
        categoryIds = [productData.categoryId];
      } else {
        const catObj = categories.find(c => 
          c.name.toLowerCase() === (productData.category || '').toLowerCase() ||
          c.slug.toLowerCase() === (productData.categorySlug || '').toLowerCase()
        ) || categories[0];
        if (catObj) categoryIds = [catObj.id];
      }
    }

    if (categoryIds.length === 0 && categories.length > 0) {
      categoryIds = [categories[0].id];
    }

    let primaryCategoryId = productData.primaryCategoryId;
    if (!primaryCategoryId || !categoryIds.includes(primaryCategoryId)) {
      primaryCategoryId = categoryIds[0] || '';
    }

    const categoryCode = resolveCategoryCode(primaryCategoryId);
    const primaryCat = categories.find(c => c.id === primaryCategoryId) || categories[0];
    const categoryName = primaryCat ? primaryCat.name : (productData.category || 'Festive Silk Sarees');
    const categorySlug = primaryCat ? primaryCat.slug : (productData.categorySlug || 'sarees');

    let mediaMetadata: CloudinaryMediaMetadata[] = [];
    if (productData.images && productData.images.length > 0) {
      try {
        mediaMetadata = await uploadProductImagesToCloudinary(productData.images, productId);
      } catch (uploadErr: any) {
        console.warn('Cloudinary product media upload note:', uploadErr);
        mediaMetadata = productData.images.map(img => ({
          url: img,
          publicId: extractCloudinaryPublicId(img) || `img_${Date.now()}`
        }));
      }
    }

    const nowIso = new Date().toISOString();
    const stock = Number(productData.stock !== undefined ? productData.stock : (productData.inventory !== undefined ? productData.inventory : 10));
    const status: Product['status'] = productData.status || 'active';
    const finalImages = mediaMetadata.length > 0 ? mediaMetadata.map(m => m.url) : (productData.images || ['/saree_model_individual.jpg']);

    const initialSku = (productData.sku || '').trim();
    // Check if input SKU is custom or standard preview format
    const isStandardPreviewSku = !initialSku || 
      initialSku.startsWith('MUETY-') ||
      initialSku.startsWith('SR-') || 
      initialSku.startsWith('S-') || 
      initialSku.startsWith('XX-') ||
      new RegExp(`^${categoryCode}-\\d+$`, 'i').test(initialSku) ||
      new RegExp(`^MUETY-${categoryCode}-\\d+$`, 'i').test(initialSku);

    let finalSku = initialSku;

    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));

    if (db && !isTestEnv) {
      try {
        const counterDocId = `productSku_${categoryCode}`;
        const counterRef = doc(db, 'counters', counterDocId);
        const productRef = doc(db, 'products', productId);

        await runTransaction(db, async (transaction) => {
          let seqNum = 1;
          const counterSnap = await transaction.get(counterRef);
          if (counterSnap.exists()) {
            seqNum = Number(counterSnap.data()?.nextNumber) || 1;
          } else {
            const allProducts = storageService.getProducts();
            const prefix1 = `${categoryCode}-`;
            const prefix2 = `MUETY-${categoryCode}-`;
            let maxSeq = 0;
            allProducts.forEach(p => {
              if (p.sku) {
                const upperSku = p.sku.toUpperCase();
                let seqStr = '';
                if (upperSku.startsWith(prefix1)) seqStr = upperSku.replace(prefix1, '');
                else if (upperSku.startsWith(prefix2)) seqStr = upperSku.replace(prefix2, '');
                if (seqStr) {
                  const sNum = parseInt(seqStr, 10);
                  if (!isNaN(sNum) && sNum > maxSeq) maxSeq = sNum;
                }
              }
            });
            seqNum = maxSeq + 1;
          }

          if (isStandardPreviewSku || !finalSku) {
            const formattedNum = seqNum < 10 ? `0${seqNum}` : `${seqNum}`;
            finalSku = `${categoryCode}-${formattedNum}`;
          }

          const payloadToSave: Record<string, any> = {
            id: String(productId),
            title: String(title),
            name: String(title),
            slug: String(slug),
            sku: String(finalSku),
            categoryIds,
            primaryCategoryId: String(primaryCategoryId),
            categoryId: String(primaryCategoryId),
            category: String(categoryName),
            categorySlug: String(categorySlug),
            price: Number(productData.price) || 0,
            originalPrice: Number(productData.originalPrice || 0),
            discountPercentage: Number(productData.discountPercentage || 0),
            inventory: Number(stock) || 0,
            stock: Number(stock) || 0,
            images: Array.isArray(finalImages) ? finalImages : [],
            media: mediaMetadata,
            description: String(productData.description || 'Exquisite handcrafted MUETY piece.'),
            shortDescription: String(productData.shortDescription || (productData.description ? productData.description.slice(0, 100) : 'Handcrafted atelier piece.')),
            published: productData.published !== undefined ? Boolean(productData.published) : true,
            status: String(status),
            availability: String(productData.availability || 'available'),
            featured: Boolean(productData.featured),
            isNewArrival: Boolean(productData.isNewArrival || productData.newArrival),
            isBestSeller: Boolean(productData.isBestSeller || productData.bestseller),
            isMostWanted: Boolean(productData.isMostWanted || productData.mostWanted),
            occasion: productData.occasion || '',
            occasions: Array.isArray(productData.occasions) ? productData.occasions : (productData.occasion ? [productData.occasion] : []),
            collectionId: productData.collectionId || '',
            collectionIds: Array.isArray(productData.collectionIds) ? productData.collectionIds : (productData.collectionId ? [productData.collectionId] : []),
            rating: Number(productData.rating || 5.0),
            reviewCount: Number(productData.reviewCount || 0),
            tags: Array.isArray(productData.tags) && productData.tags.length > 0 ? productData.tags : [String(categorySlug), 'luxury', 'atelier'],
            colors: Array.isArray(productData.colors) ? productData.colors : [],
            sizes: Array.isArray(productData.sizes) ? productData.sizes : [],
            specifications: (productData.specifications && typeof productData.specifications === 'object') ? productData.specifications : {},
            createdAt: nowIso,
            updatedAt: nowIso
          };

          Object.keys(payloadToSave).forEach(key => {
            if (payloadToSave[key] === undefined || payloadToSave[key] === null) delete payloadToSave[key];
          });

          transaction.set(productRef, payloadToSave, { merge: true });

          const nextSeqNum = seqNum + 1;
          transaction.set(counterRef, {
            categoryCode,
            nextNumber: nextSeqNum,
            updatedAt: nowIso
          }, { merge: true });
        });
      } catch (err: any) {
        console.warn('Firebase Firestore product creation transaction note:', err);
        throw new Error(`Product creation failed: ${err?.message || 'Firestore transaction failed'}`);
      }
    } else {
      // Local / Test environment atomic reservation
      let seqNum = localCounters[categoryCode];
      if (!seqNum || seqNum < 1) {
        const key = `muety_counter_${categoryCode}`;
        const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        const storedNum = stored ? parseInt(stored, 10) : 0;
        if (storedNum > 0) {
          seqNum = storedNum;
        } else {
          const allProducts = storageService.getProducts();
          const prefix1 = `${categoryCode}-`;
          const prefix2 = `MUETY-${categoryCode}-`;
          let maxSeq = 0;
          allProducts.forEach(p => {
            if (p.sku) {
              const upperSku = p.sku.toUpperCase();
              let seqStr = '';
              if (upperSku.startsWith(prefix1)) seqStr = upperSku.replace(prefix1, '');
              else if (upperSku.startsWith(prefix2)) seqStr = upperSku.replace(prefix2, '');
              if (seqStr) {
                const sNum = parseInt(seqStr, 10);
                if (!isNaN(sNum) && sNum > maxSeq) maxSeq = sNum;
              }
            }
          });
          seqNum = maxSeq + 1;
        }
      }

      if (isStandardPreviewSku || !finalSku) {
        const formattedNum = seqNum < 10 ? `0${seqNum}` : `${seqNum}`;
        finalSku = `${categoryCode}-${formattedNum}`;
      }

      const nextSeq = seqNum + 1;
      localCounters[categoryCode] = nextSeq;
      if (typeof window !== 'undefined') {
        localStorage.setItem(`muety_counter_${categoryCode}`, String(nextSeq));
      }
    }

    const newProduct: Product = {
      ...productData,
      id: productId,
      name: title,
      title,
      slug,
      sku: finalSku,
      categoryIds,
      primaryCategoryId,
      categoryId: primaryCategoryId,
      category: categoryName,
      categorySlug,
      price: Number(productData.price) || 0,
      stock,
      inventory: stock,
      status,
      availability: productData.availability || 'available',
      images: finalImages,
      media: mediaMetadata,
      description: productData.description || productData.shortDescription || title,
      shortDescription: productData.shortDescription || productData.description || title,
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      rating: productData.rating !== undefined ? Number(productData.rating) : 5,
      reviewCount: productData.reviewCount !== undefined ? Number(productData.reviewCount) : 0,
      specifications: productData.specifications || {},
      createdAt: nowIso,
      updatedAt: nowIso
    };

    storageService.addProduct(newProduct);
    return newProduct;
  },

  async updateProduct(product: Product): Promise<Product> {
    const productId = product.id;
    const existing = storageService.getProductById(productId);
    const title = product.name || product.title || 'Untitled Product';
    const slug = product.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || productId;

    // Multi-category & Primary category normalization
    const categories = storageService.getCategories();
    let categoryIds: string[] = Array.isArray(product.categoryIds) && product.categoryIds.length > 0 
      ? product.categoryIds 
      : (existing?.categoryIds || []);
    
    if (categoryIds.length === 0) {
      if (product.categoryId) {
        categoryIds = [product.categoryId];
      } else if (existing?.categoryId) {
        categoryIds = [existing.categoryId];
      } else {
        const catObj = categories.find(c => 
          c.name.toLowerCase() === (product.category || '').toLowerCase() ||
          c.slug.toLowerCase() === (product.categorySlug || '').toLowerCase()
        );
        if (catObj) categoryIds = [catObj.id];
      }
    }

    let primaryCategoryId = product.primaryCategoryId;
    if (!primaryCategoryId || !categoryIds.includes(primaryCategoryId)) {
      primaryCategoryId = categoryIds[0] || existing?.primaryCategoryId || '';
    }

    // PERMANENT SKU INVARIANT: Existing product SKU must NEVER be changed on edit!
    const finalSku = existing?.sku || product.sku;

    const primaryCat = categories.find(c => c.id === primaryCategoryId);
    const categoryName = primaryCat ? primaryCat.name : (product.category || 'Festive Silk Sarees');
    const categorySlug = primaryCat ? primaryCat.slug : (product.categorySlug || 'sarees');

    let mediaMetadata: CloudinaryMediaMetadata[] = [];
    const imagesChanged = !existing || !existing.images || JSON.stringify(existing.images) !== JSON.stringify(product.images);
    const hasUnsignedFiles = product.images && product.images.some(img => typeof img === 'string' && (img.startsWith('data:') || img.startsWith('blob:')));

    if (product.images && product.images.length > 0) {
      if (imagesChanged && hasUnsignedFiles) {
        try {
          mediaMetadata = await uploadProductImagesToCloudinary(product.images, productId);
        } catch (uploadErr: any) {
          console.warn('Cloudinary product media update note (retaining media payload):', uploadErr);
          mediaMetadata = product.images.map(img => ({
            url: typeof img === 'string' ? img : '',
            publicId: typeof img === 'string' ? (extractCloudinaryPublicId(img) || '') : ''
          }));
        }
      } else {
        mediaMetadata = existing?.media && existing.media.length > 0 && !imagesChanged
          ? existing.media
          : product.images.map(img => ({
              url: typeof img === 'string' ? img : '',
              publicId: typeof img === 'string' ? (extractCloudinaryPublicId(img) || '') : ''
            }));
      }
    }

    // Cleanup replaced/removed Cloudinary assets
    if (existing && existing.images) {
      const newUrls = mediaMetadata.map(m => m.url);
      const removedPublicIds: string[] = [];

      for (const oldUrl of existing.images) {
        if (!newUrls.includes(oldUrl)) {
          const pubId = extractCloudinaryPublicId(oldUrl);
          if (pubId && pubId.startsWith('muety/')) {
            removedPublicIds.push(pubId);
          }
        }
      }

      if (removedPublicIds.length > 0) {
        deleteCloudinaryMedia(removedPublicIds).catch(err => {
          console.warn('Failed to delete replaced Cloudinary assets:', err);
        });
      }
    }

    const nowIso = new Date().toISOString();
    const stock = Number(product.stock !== undefined ? product.stock : (product.inventory !== undefined ? product.inventory : 10));
    const status: Product['status'] = product.status || 'active';
    const finalImages = mediaMetadata.length > 0 ? mediaMetadata.map(m => m.url) : (product.images || ['/saree_model_individual.jpg']);

    const updated: Product = {
      ...product,
      name: title,
      title,
      slug,
      sku: finalSku,
      categoryIds,
      primaryCategoryId,
      categoryId: primaryCategoryId,
      category: categoryName,
      categorySlug,
      stock,
      inventory: stock,
      status,
      availability: product.availability || existing?.availability || 'available',
      images: finalImages,
      media: mediaMetadata,
      updatedAt: nowIso
    };

    if (db && !isTestEnv) {
      try {
        const payload: Record<string, any> = {
          id: String(updated.id),
          title: String(title),
          name: String(title),
          slug: String(slug),
          sku: String(finalSku),
          categoryIds,
          primaryCategoryId: String(primaryCategoryId),
          categoryId: String(primaryCategoryId),
          category: String(categoryName),
          categorySlug: String(categorySlug),
          price: Number(updated.price) || 0,
          originalPrice: updated.originalPrice ? Number(updated.originalPrice) : 0,
          discountPercentage: Number(updated.discountPercentage || 0),
          inventory: Number(stock) || 0,
          stock: Number(stock) || 0,
          images: Array.isArray(finalImages) ? finalImages : [],
          media: mediaMetadata,
          description: String(updated.description || ''),
          shortDescription: String(updated.shortDescription || ''),
          published: updated.published !== undefined ? Boolean(updated.published) : true,
          status: String(status),
          availability: String(updated.availability || 'available'),
          featured: Boolean(updated.featured),
          isNewArrival: Boolean(updated.isNewArrival || updated.newArrival),
          isBestSeller: Boolean(updated.isBestSeller || updated.bestseller),
          isMostWanted: Boolean(updated.isMostWanted || updated.mostWanted),
          occasion: updated.occasion || '',
          occasions: Array.isArray(updated.occasions) ? updated.occasions : (updated.occasion ? [updated.occasion] : []),
          collectionId: updated.collectionId || '',
          collectionIds: Array.isArray(updated.collectionIds) ? updated.collectionIds : (updated.collectionId ? [updated.collectionId] : []),
          rating: Number(updated.rating || 5.0),
          reviewCount: Number(updated.reviewCount || 0),
          tags: Array.isArray(updated.tags) ? updated.tags : [],
          colors: Array.isArray(updated.colors) ? updated.colors : [],
          sizes: Array.isArray(updated.sizes) ? updated.sizes : [],
          specifications: (updated.specifications && typeof updated.specifications === 'object') ? updated.specifications : {},
          updatedAt: nowIso
        };

        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined || payload[key] === null) delete payload[key];
        });

        const productRef = doc(db, 'products', updated.id);
        await setDoc(productRef, payload, { merge: true });
      } catch (err: any) {
        console.warn('Firebase Firestore product update note (saved locally):', err);
      }
    }

    storageService.updateProduct(updated);
    return updated;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const existing = storageService.getProductById(id);

    // Delete associated Cloudinary assets via secure server boundary
    if (existing) {
      const publicIdsToDelete: string[] = [];

      if (existing.media && Array.isArray(existing.media)) {
        existing.media.forEach((m: any) => {
          if (m?.publicId) publicIdsToDelete.push(m.publicId);
        });
      }

      if (publicIdsToDelete.length === 0 && existing.images) {
        existing.images.forEach((imgUrl: string) => {
          const pubId = extractCloudinaryPublicId(imgUrl);
          if (pubId && pubId.startsWith('muety/')) {
            publicIdsToDelete.push(pubId);
          }
        });
      }

      if (publicIdsToDelete.length > 0) {
        deleteCloudinaryMedia(publicIdsToDelete).catch(err => {
          console.warn('Failed to delete Cloudinary assets on product deletion:', err);
        });
      }
    }

    storageService.deleteProduct(id);

    if (db && !isTestEnv) {
      try {
        await deleteDoc(doc(db, 'products', id));
        try {
          const qSnap = await getDocs(query(collection(db, 'products'), where('id', '==', id)));
          qSnap.forEach(async (d) => {
            if (d.id !== id) {
              await deleteDoc(d.ref);
            }
          });
        } catch {}
      } catch (err: any) {
        console.warn('Firebase Firestore product deletion note:', err);
      }
    }

    return true;
  },

  subscribeToProducts(callback: (products: Product[]) => void, onError?: (err: Error) => void): Unsubscribe {
    const authUser = auth?.currentUser;
    const currentUserProfile = authService.getCurrentUser();

    if (import.meta.env.DEV) {
      console.log('[FIRESTORE CATALOG DIAGNOSTIC]', {
        projectId: env.firebase.projectId,
        appId: env.firebase.appId,
        authUid: authUser?.uid || 'anonymous',
        authEmail: authUser?.email || null,
        authRoles: currentUserProfile?.roles || [],
        collectionPath: 'products',
        exactQuery: 'collection(db, "products")',
        snapshotSize: null,
        fromCache: null,
        hasPendingWrites: null,
        errorCode: null,
        errorMessage: null,
        returnedProductIds: [],
        returnedProductSlugs: [],
        returnedPublicationFields: []
      });
    }

    if (db && !isTestEnv) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
          const docList = snapshot.docs;
          const returnedIds = docList.map(d => d.id);
          const returnedSlugs = docList.map(d => (d.data() as any).slug || d.id);
          const returnedPub = docList.map(d => {
            const data = d.data() as any;
            return {
              id: d.id,
              published: data.published !== undefined ? Boolean(data.published) : (data.status === 'active'),
              status: data.status || 'active'
            };
          });

          if (import.meta.env.DEV) {
            console.log('[FIRESTORE CATALOG DIAGNOSTIC]', {
              projectId: env.firebase.projectId,
              appId: env.firebase.appId,
              authUid: authUser?.uid || 'anonymous',
              authEmail: authUser?.email || null,
              authRoles: currentUserProfile?.roles || [],
              collectionPath: 'products',
              exactQuery: 'collection(db, "products")',
              snapshotSize: snapshot.size,
              fromCache: snapshot.metadata.fromCache,
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              errorCode: null,
              errorMessage: null,
              returnedProductIds: returnedIds,
              returnedProductSlugs: returnedSlugs,
              returnedPublicationFields: returnedPub
            });
          }

          if (!snapshot.empty) {
            const cloudProducts: Product[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as any;
              if (raw && (raw.id || docSnap.id)) {
                // Ignore incomplete stub/ghost documents that lack title and name (e.g. accidental rating stubs)
                const rawTitle = raw.title || raw.name;
                if (!rawTitle || typeof rawTitle !== 'string' || !rawTitle.trim() || rawTitle.trim().toLowerCase() === 'untitled product') {
                  return;
                }
                const title = rawTitle.trim();
                const stock = raw.stock !== undefined ? Number(raw.stock) : (raw.inventory !== undefined ? Number(raw.inventory) : 10);
                const isPub = raw.published !== undefined ? Boolean(raw.published) : (raw.status !== 'draft');
                
                const sanitized: Product = {
                  id: docSnap.id || raw.id,
                  productId: raw.productId || docSnap.id || raw.id,
                  name: title,
                  title: title,
                  slug: raw.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  description: raw.description || '',
                  shortDescription: raw.shortDescription || (raw.description ? raw.description.slice(0, 100) : ''),
                  price: Number(raw.price) || 0,
                  originalPrice: raw.originalPrice ? Number(raw.originalPrice) : undefined,
                  discountPercentage: raw.discountPercentage !== undefined 
                    ? Number(raw.discountPercentage) 
                    : (raw.originalPrice && raw.price && raw.originalPrice > raw.price ? Math.round(((raw.originalPrice - raw.price) / raw.originalPrice) * 100) : undefined),
                  rating: Number(raw.rating) || 5.0,
                  reviewCount: Number(raw.reviewCount) || 0,
                  stock: stock,
                  inventory: raw.inventory !== undefined ? Number(raw.inventory) : stock,
                  sku: raw.sku || `MUETY-${Math.floor(100 + Math.random() * 900)}`,
                  category: raw.category || 'Festive Silk Sarees',
                  categorySlug: raw.categorySlug || (raw.category ? raw.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'sarees'),
                  categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : (raw.categoryId ? [raw.categoryId] : (raw.primaryCategoryId ? [raw.primaryCategoryId] : [])),
                  primaryCategoryId: raw.primaryCategoryId || (Array.isArray(raw.categoryIds) ? raw.categoryIds[0] : raw.categoryId) || '',
                  categoryId: raw.primaryCategoryId || raw.categoryId || '',
                  images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : ['/saree_model_individual.jpg'],
                  media: Array.isArray(raw.media) ? raw.media : [],
                  featured: Boolean(raw.featured),
                  isNewArrival: Boolean(raw.isNewArrival || raw.newArrival),
                  newArrival: Boolean(raw.isNewArrival || raw.newArrival),
                  isBestSeller: Boolean(raw.isBestSeller || raw.bestseller),
                  bestseller: Boolean(raw.isBestSeller || raw.bestseller),
                  isMostWanted: Boolean(raw.isMostWanted || raw.mostWanted),
                  mostWanted: Boolean(raw.isMostWanted || raw.mostWanted),
                  published: isPub,
                  status: raw.status || (isPub ? 'active' : 'draft'),
                  availability: raw.availability || 'available',
                  tags: Array.isArray(raw.tags) ? raw.tags : [],
                  specifications: raw.specifications || {},
                  colors: Array.isArray(raw.colors) ? raw.colors : undefined,
                  sizes: Array.isArray(raw.sizes) ? raw.sizes : undefined,
                  materials: Array.isArray(raw.materials) ? raw.materials : undefined,
                  silkType: raw.silkType,
                  zariType: raw.zariType,
                  borderType: raw.borderType,
                  palluType: raw.palluType,
                  weaveTechnique: raw.weaveTechnique,
                  craftsmanship: raw.craftsmanship,
                  occasion: raw.occasion,
                  occasions: Array.isArray(raw.occasions) ? raw.occasions : (raw.occasion ? [raw.occasion] : []),
                  careInstructions: raw.careInstructions,
                  authenticityInformation: raw.authenticityInformation,
                  createdAt: typeof raw.createdAt?.toDate === 'function' 
                    ? raw.createdAt.toDate().toISOString() 
                    : (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()),
                  updatedAt: typeof raw.updatedAt?.toDate === 'function' 
                    ? raw.updatedAt.toDate().toISOString() 
                    : (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString())
                };
                cloudProducts.push(sanitized);
              }
            });

            cloudProducts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            storageService.saveProducts(cloudProducts);
            callback(cloudProducts);
          } else {
            storageService.saveProducts([]);
            callback([]);
          }
        }, (err) => {
          if (import.meta.env.DEV) {
            console.error('[FIRESTORE CATALOG DIAGNOSTIC]', {
              projectId: env.firebase.projectId,
              appId: env.firebase.appId,
              authUid: authUser?.uid || 'anonymous',
              authEmail: authUser?.email || null,
              authRoles: currentUserProfile?.roles || [],
              collectionPath: 'products',
              exactQuery: 'collection(db, "products")',
              snapshotSize: 0,
              fromCache: false,
              hasPendingWrites: false,
              errorCode: err?.code || 'UNKNOWN_ERROR',
              errorMessage: err?.message || 'Firestore snapshot error',
              returnedProductIds: [],
              returnedProductSlugs: [],
              returnedPublicationFields: []
            });
          }
          if (onError) {
            onError(err);
          } else {
            callback([]);
          }
        });
        return unsubscribe;
      } catch (err: any) {
        console.warn('Firestore onSnapshot init error:', err);
        if (onError) onError(err as Error);
      }
    }

    callback(storageService.getProducts());
    const unsubLocal = subscribeLocalProducts((updatedProds) => callback(updatedProds));
    const handler = () => callback(storageService.getProducts());
    if (typeof window !== 'undefined') {
      window.addEventListener('muety_products_updated', handler);
      return () => {
        unsubLocal();
        window.removeEventListener('muety_products_updated', handler);
      };
    }
    return unsubLocal;
  },

  async checkSkuExists(sku: string, excludeProductId?: string): Promise<boolean> {
    const cleanSku = sku.trim().toUpperCase();
    if (!cleanSku) return false;

    // Check local catalog
    const localMatches = storageService.getProducts().some(
      p => (p.sku || '').toUpperCase() === cleanSku && p.id !== excludeProductId
    );
    if (localMatches) return true;

    // Query Firestore (only in non-test env)
    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
    if (db && !isTestEnv) {
      try {
        const q = query(collection(db, 'products'), where('sku', '==', cleanSku));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const matching = snap.docs.find(d => d.id !== excludeProductId);
          return !!matching;
        }
      } catch (err) {
        console.warn('Firestore SKU uniqueness query note:', err);
      }
    }

    return false;
  },

  async checkSlugExists(slug: string, excludeProductId?: string): Promise<boolean> {
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug) return false;

    // Check local catalog
    const localMatches = storageService.getProducts().some(
      p => (p.slug || '').toLowerCase() === cleanSlug && p.id !== excludeProductId
    );
    if (localMatches) return true;

    // Query Firestore (only in non-test env)
    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
    if (db && !isTestEnv) {
      try {
        const q = query(collection(db, 'products'), where('slug', '==', cleanSlug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const matching = snap.docs.find(d => d.id !== excludeProductId);
          return !!matching;
        }
      } catch (err) {
        console.warn('Firestore Slug uniqueness query note:', err);
      }
    }

    return false;
  },

  getCategories(): Category[] {
    return storageService.getCategories();
  },

  async addCategory(name: string, description: string, image: string, categoryCodeInput?: string, categoryIdInput?: string): Promise<Category> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let categoryCode = (categoryCodeInput || '').trim().toUpperCase();
    if (!categoryCode) {
      categoryCode = generateCategoryCodeSuggestion(name);
    }

    const val = validateCategoryCode(categoryCode);
    if (!val.valid) {
      throw new Error(val.error || 'Invalid category code.');
    }

    const catId = categoryIdInput || `cat-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const unique = await isCategoryCodeUnique(categoryCode, catId);
    if (!unique) {
      throw new Error(`Category code "${categoryCode}" is already used by another category.`);
    }

    const imgUrl = image || '/saree_model_individual.jpg';

    if (!imgUrl || imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') || imgUrl.startsWith('file:')) {
      throw new Error('Category image upload did not return a permanent image URL. Base64 persistence is disallowed.');
    }

    const category: Category = {
      id: catId,
      name,
      slug,
      categoryCode,
      description,
      image: imgUrl,
      imageUrl: imgUrl,
      coverImage: imgUrl,
      coverImageUrl: imgUrl,
      itemCount: 0,
      featured: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
    if (db && !isTestEnv) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'categories', category.id), category, { merge: true });
        batch.set(doc(db, 'categoryCodes', categoryCode), { categoryId: category.id, code: categoryCode });
        await batch.commit();
        if (import.meta.env.DEV) {
          console.log('[FIRESTORE WRITE SUCCESS] Category created:', category.id, category.name);
        }
      } catch (err: any) {
        console.error('[FIRESTORE WRITE ERROR] Category creation failed:', err);
        throw new Error(`Firestore category write failed: ${err?.message || 'Permission denied or network failure.'}`);
      }
    }

    storageService.addCategory(category);
    return category;
  },

  async updateCategory(category: Category): Promise<Category> {
    const code = (category.categoryCode || '').trim().toUpperCase();
    const val = validateCategoryCode(code);
    if (!val.valid) {
      throw new Error(val.error || 'Invalid category code.');
    }

    const unique = await isCategoryCodeUnique(code, category.id);
    if (!unique) {
      throw new Error(`Category code "${code}" is already used by another category.`);
    }

    const imgUrl = category.image || category.imageUrl || (category as any).coverImage || (category as any).coverImageUrl || '/saree_model_individual.jpg';

    if (imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') || imgUrl.startsWith('file:')) {
      throw new Error('Category image upload did not return a permanent image URL. Base64 persistence is disallowed.');
    }

    const updated: Category = {
      ...category,
      categoryCode: code,
      image: imgUrl,
      imageUrl: imgUrl,
      coverImage: imgUrl,
      coverImageUrl: imgUrl,
      updatedAt: new Date().toISOString()
    };

    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
    if (db && !isTestEnv) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'categories', updated.id), updated, { merge: true });
        batch.set(doc(db, 'categoryCodes', code), { categoryId: updated.id, code }, { merge: true });
        await batch.commit();
        if (import.meta.env.DEV) {
          console.log('[FIRESTORE WRITE SUCCESS] Category updated:', updated.id, updated.name);
        }
      } catch (err: any) {
        console.error('[FIRESTORE WRITE ERROR] Category update failed:', err);
        throw new Error(`Firestore category update failed: ${err?.message || 'Permission denied or network failure.'}`);
      }
    }

    storageService.updateCategory(updated);
    return updated;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
    if (db && !isTestEnv) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        if (import.meta.env.DEV) {
          console.log('[FIRESTORE WRITE SUCCESS] Category deleted:', id);
        }
      } catch (err: any) {
        console.error('[FIRESTORE WRITE ERROR] Category deletion failed:', err);
        throw new Error(`Firestore category deletion failed: ${err?.message || 'Permission denied or network failure.'}`);
      }
    }

    storageService.deleteCategory(id);
    return true;
  },

  subscribeToCategories(callback: (categories: Category[]) => void, onError?: (err: Error) => void): Unsubscribe {
    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
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
                cloudCats.push({ 
                  ...raw, 
                  id: docSnap.id || raw.id,
                  image: imgUrl,
                  imageUrl: imgUrl,
                  categoryCode: raw.categoryCode || generateCategoryCodeSuggestion(raw.name) || 'XX'
                });
              }
            });
          }

          if (import.meta.env.DEV) {
            cloudCats.forEach(c => {
              console.log('[CATEGORY IMAGE] Firestore category received', {
                id: c.id,
                name: c.name,
                categoryCode: c.categoryCode,
                image: (c.image || '').slice(0, 80) + ((c.image || '').length > 80 ? '...' : ''),
                imageUrl: (c.imageUrl || '').slice(0, 80) + ((c.imageUrl || '').length > 80 ? '...' : ''),
                coverImage: ((c as any).coverImage || '').slice(0, 80),
                coverImageUrl: ((c as any).coverImageUrl || '').slice(0, 80)
              });
            });
            console.log('[Firestore Categories]', {
              snapshotSize: snapshot.size,
              categories: cloudCats.map(category => ({
                id: category.id,
                name: category.name,
                categoryCode: category.categoryCode,
                imageUrl: category.imageUrl || category.image
              }))
            });
          }

          storageService.saveCategories(cloudCats);
          callback(cloudCats);
        }, (err) => {
          console.error('[Firestore Categories] Live subscription read error:', err);
          if (onError) onError(err as Error);
          else callback(storageService.getCategories());
        });

        return unsubscribe;
      } catch (err: any) {
        console.error('[Firestore Categories] Live subscription init error:', err);
        if (onError) onError(err as Error);
      }
    }

    callback(storageService.getCategories());
    const unsubLocal = subscribeLocalCategories((updatedCats) => callback(updatedCats));
    const handler = () => callback(storageService.getCategories());
    if (typeof window !== 'undefined') {
      window.addEventListener('muety_categories_updated', handler);
      return () => {
        unsubLocal();
        window.removeEventListener('muety_categories_updated', handler);
      };
    }
    return unsubLocal;
  },

  async setProductAvailability(productId: string, availability: 'available' | 'sold_out'): Promise<Product> {
    const prod = storageService.getProductById(productId) || this.getProductById(productId);
    if (!prod) {
      throw new Error(`Product with ID "${productId}" not found.`);
    }

    const previousAvailability = prod.availability || 'available';

    const nowIso = new Date().toISOString();
    const updatedProd: Product = {
      ...prod,
      availability,
      updatedAt: nowIso
    };

    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));

    if (db && !isTestEnv) {
      try {
        const productRef = doc(db, 'products', productId);
        // Atomic update of availability field ONLY (and updatedAt if canonical model)
        await setDoc(productRef, { availability, updatedAt: nowIso }, { merge: true });
      } catch (err: any) {
        console.warn('Firebase Firestore product availability update error:', err);
        throw new Error(`Firestore availability update failed: ${err?.message || 'Update error'}`);
      }
    }

    storageService.updateProduct(updatedProd);

    // Create Audit Log
    try {
      const currentUser = authService.getCurrentUser();
      const authUser = auth?.currentUser;
      const action = availability === 'sold_out' ? 'PRODUCT_MARKED_SOLD_OUT' : 'PRODUCT_MARKED_AVAILABLE';

      await auditService.logAction({
        actorUid: authUser?.uid || currentUser?.uid || 'admin',
        actorEmail: authUser?.email || currentUser?.email || 'admin@muety.in',
        actorRole: (currentUser?.roles?.[0] as any) || 'catalog_manager',
        action,
        entityType: 'PRODUCT',
        entityId: productId,
        before: { availability: previousAvailability },
        after: { availability },
        reason: `Manually set product "${prod.name}" (SKU: ${prod.sku}) availability from ${previousAvailability} to ${availability}`
      });
    } catch (auditErr) {
      console.warn('Audit log creation note:', auditErr);
    }

    return updatedProd;
  },

  async markProductSoldOut(productId: string): Promise<Product> {
    return this.setProductAvailability(productId, 'sold_out');
  },

  async markProductAvailable(productId: string): Promise<Product> {
    return this.setProductAvailability(productId, 'available');
  },

  async updateProductFlags(
    productId: string,
    flags: {
      isNewArrival?: boolean;
      newArrival?: boolean;
      isBestSeller?: boolean;
      bestseller?: boolean;
      isMostWanted?: boolean;
      mostWanted?: boolean;
      featured?: boolean;
    }
  ): Promise<Product> {
    const prod = storageService.getProductById(productId) || this.getProductById(productId);
    if (!prod) {
      throw new Error(`Product with ID "${productId}" not found.`);
    }

    const nowIso = new Date().toISOString();
    const updatedFields: Record<string, any> = { updatedAt: nowIso };

    if (flags.isNewArrival !== undefined) {
      updatedFields.isNewArrival = Boolean(flags.isNewArrival);
      updatedFields.newArrival = Boolean(flags.isNewArrival);
    } else if (flags.newArrival !== undefined) {
      updatedFields.isNewArrival = Boolean(flags.newArrival);
      updatedFields.newArrival = Boolean(flags.newArrival);
    }

    if (flags.isBestSeller !== undefined) {
      updatedFields.isBestSeller = Boolean(flags.isBestSeller);
      updatedFields.bestseller = Boolean(flags.isBestSeller);
    } else if (flags.bestseller !== undefined) {
      updatedFields.isBestSeller = Boolean(flags.bestseller);
      updatedFields.bestseller = Boolean(flags.bestseller);
    }

    if (flags.isMostWanted !== undefined) {
      updatedFields.isMostWanted = Boolean(flags.isMostWanted);
      updatedFields.mostWanted = Boolean(flags.isMostWanted);
    } else if (flags.mostWanted !== undefined) {
      updatedFields.isMostWanted = Boolean(flags.mostWanted);
      updatedFields.mostWanted = Boolean(flags.mostWanted);
    }

    if (flags.featured !== undefined) {
      updatedFields.featured = Boolean(flags.featured);
    }

    const updatedProd: Product = {
      ...prod,
      ...updatedFields
    };

    const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));

    if (db && !isTestEnv) {
      try {
        const productRef = doc(db, 'products', productId);
        await setDoc(productRef, updatedFields, { merge: true });
      } catch (err: any) {
        console.warn('Firebase Firestore product flags update note:', err);
        throw new Error(`Firestore flag update failed: ${err?.message || 'Update error'}`);
      }
    }

    storageService.updateProduct(updatedProd);

    // Create Audit Log
    try {
      const currentUser = authService.getCurrentUser();
      const authUser = auth?.currentUser;
      const changedKeys = Object.keys(updatedFields).filter(k => k !== 'updatedAt');
      const summary = changedKeys.map(k => `${k}=${updatedFields[k]}`).join(', ');

      await auditService.logAction({
        actorUid: authUser?.uid || currentUser?.uid || 'admin',
        actorEmail: authUser?.email || currentUser?.email || 'admin@muety.in',
        actorRole: (currentUser?.roles?.[0] as any) || 'catalog_manager',
        action: 'PRODUCT_UPDATED',
        entityType: 'PRODUCT',
        entityId: productId,
        reason: `Updated product flags for "${prod.name}" (SKU: ${prod.sku}): ${summary}`
      });
    } catch (auditErr) {
      console.warn('Audit log creation note:', auditErr);
    }

    return updatedProd;
  }
};

export function validateSkuFormat(sku: string): { valid: boolean; error?: string } {
  const clean = (sku || '').trim();
  if (!clean) {
    return { valid: false, error: 'SKU is required.' };
  }
  if (!/^[A-Z]{2}-[0-9]+$/.test(clean)) {
    return { 
      valid: false, 
      error: `Invalid SKU format "${sku}". Expected canonical format XX-01 (e.g. KV-01, SS-02).` 
    };
  }
  return { valid: true };
}

export interface SkuMigrationResult {
  totalExamined: number;
  migratedCount: number;
  skippedCount: number;
  collisions: Array<{ productId: string; oldSku: string; targetSku: string }>;
  migratedItems: Array<{ productId: string; oldSku: string; newSku: string }>;
}

export async function migrateProductSkus(): Promise<SkuMigrationResult> {
  const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
  const result: SkuMigrationResult = {
    totalExamined: 0,
    migratedCount: 0,
    skippedCount: 0,
    collisions: [],
    migratedItems: []
  };

  const allProducts = storageService.getProducts();
  result.totalExamined = allProducts.length;

  const itemsToMigrate = allProducts.filter(p => p.sku && p.sku.toUpperCase().startsWith('MUETY-'));
  if (itemsToMigrate.length === 0 && (!db || isTestEnv)) {
    return result;
  }

  const existingSkuMap = new Map<string, string>();
  allProducts.forEach(p => {
    if (p.sku) existingSkuMap.set(p.sku.toUpperCase(), p.id);
  });

  const batchUpdates: Array<{ id: string; oldSku: string; newSku: string }> = [];

  for (const p of itemsToMigrate) {
    const oldSku = p.sku.trim();
    const targetSku = oldSku.substring(6).toUpperCase();

    if (!targetSku) {
      result.skippedCount++;
      continue;
    }

    const existingOwnerId = existingSkuMap.get(targetSku);
    if (existingOwnerId && existingOwnerId !== p.id) {
      result.collisions.push({ productId: p.id, oldSku, targetSku });
      result.skippedCount++;
      console.warn(`[SKU Migration Collision] Product ${p.id} target SKU "${targetSku}" already owned by product ${existingOwnerId}. Migration skipped.`);
      continue;
    }

    batchUpdates.push({ id: p.id, oldSku, newSku: targetSku });
    existingSkuMap.set(targetSku, p.id);
  }

  if (db && !isTestEnv && batchUpdates.length > 0) {
    const firestoreDb = db;
    try {
      const batch = writeBatch(firestoreDb);
      batchUpdates.forEach(u => {
        const pRef = doc(firestoreDb, 'products', u.id);
        batch.update(pRef, { sku: u.newSku, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    } catch (err: any) {
      console.error('[SKU Migration Error] Firestore batch update failed:', err);
      throw new Error(`Firestore SKU migration failed: ${err?.message || 'Batch update error'}`);
    }
  }

  batchUpdates.forEach(u => {
    const prod = storageService.getProductById(u.id);
    if (prod) {
      const updated = { ...prod, sku: u.newSku, updatedAt: new Date().toISOString() };
      storageService.updateProduct(updated);
      result.migratedItems.push({ productId: u.id, oldSku: u.oldSku, newSku: u.newSku });
      result.migratedCount++;
    }
  });

  return result;
}

export interface CategoryAuditResult {
  totalExamined: number;
  affectedCategories: Array<{ id: string; name: string; hasBase64Image: boolean; sizeBytes: number }>;
  repairedCount: number;
}

export async function auditAndRepairBadCategoryDocuments(): Promise<CategoryAuditResult> {
  const result: CategoryAuditResult = {
    totalExamined: 0,
    affectedCategories: [],
    repairedCount: 0
  };

  const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
  if (!db || isTestEnv) return result;

  try {
    const snap = await getDocs(collection(db, 'categories'));
    result.totalExamined = snap.size;

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as any;
      const imgUrl = String(data.imageUrl || data.image || '');
      const jsonStr = JSON.stringify(data);
      const sizeBytes = new Blob([jsonStr]).size;

      const hasBase64 = imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') || sizeBytes > 10000;

      if (hasBase64) {
        result.affectedCategories.push({
          id: docSnap.id,
          name: data.name || 'Unnamed Category',
          hasBase64Image: true,
          sizeBytes
        });

        const cleanRemoteUrl = 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80';
        await setDoc(doc(db, 'categories', docSnap.id), {
          image: cleanRemoteUrl,
          imageUrl: cleanRemoteUrl,
          coverImage: cleanRemoteUrl,
          coverImageUrl: cleanRemoteUrl,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        result.repairedCount++;
      }
    }
  } catch (err) {
    console.warn('[Category Audit] Firestore check note:', err);
  }

  return result;
}

