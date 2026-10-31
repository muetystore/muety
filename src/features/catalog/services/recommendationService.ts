import { Product } from '@/types';

export interface UserInterestProfile {
  viewedProductIds: string[];
  categories: Record<string, number>;
  sareeTypes: Record<string, number>;
  fabrics: Record<string, number>;
  occasions: Record<string, number>;
  colors: Record<string, number>;
  updatedAt: number;
}

const STORAGE_KEY = 'muety_user_interest_profile';
const SESSION_SEED_KEY = 'muety_catalog_session_seed';
const SESSION_TIME_KEY = 'muety_catalog_session_time';
const SESSION_ORDER_MAP_KEY = 'muety_catalog_session_order_map';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30-minute stable session window

const DEFAULT_PROFILE: UserInterestProfile = {
  viewedProductIds: [],
  categories: {},
  sareeTypes: {},
  fabrics: {},
  occasions: {},
  colors: {},
  updatedAt: Date.now()
};

function normalizeKey(str?: string): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
}

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch {}
  return null;
}

function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

class RecommendationService {
  private cachedProfile: UserInterestProfile | null = null;
  private sessionSeed: number = Date.now();

  getProfile(): UserInterestProfile {
    if (this.cachedProfile) return this.cachedProfile;
    const storage = getSafeLocalStorage();
    if (!storage) {
      return { ...DEFAULT_PROFILE };
    }
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        this.cachedProfile = JSON.parse(raw);
        return this.cachedProfile!;
      }
    } catch (e) {
      console.warn('Unable to read user interest profile:', e);
    }
    this.cachedProfile = { ...DEFAULT_PROFILE };
    return this.cachedProfile;
  }

  private saveProfile(profile: UserInterestProfile): void {
    this.cachedProfile = profile;
    const storage = getSafeLocalStorage();
    if (!storage) return;
    try {
      profile.updatedAt = Date.now();
      storage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Unable to persist user interest profile:', e);
    }
  }

  private incrementScore(dict: Record<string, number>, key: string, points: number): void {
    const k = normalizeKey(key);
    if (!k) return;
    dict[k] = (dict[k] || 0) + points;
    // Cap individual keys at 100 to prevent runaway counters
    if (dict[k] > 100) dict[k] = 100;
  }

  recordProductView(product: Product): void {
    if (!product || !product.id) return;
    const profile = { ...this.getProfile() };

    // Track recently viewed ID (keep last 30)
    const list = profile.viewedProductIds.filter(id => id !== product.id);
    list.unshift(product.id);
    profile.viewedProductIds = list.slice(0, 30);

    // Track Category
    if (product.categorySlug) this.incrementScore(profile.categories, product.categorySlug, 4);
    if (product.category) this.incrementScore(profile.categories, product.category, 4);
    if (product.primaryCategoryId) this.incrementScore(profile.categories, product.primaryCategoryId, 4);
    if (Array.isArray(product.categoryIds)) {
      product.categoryIds.forEach(cid => this.incrementScore(profile.categories, cid, 3));
    }

    // Track Saree Type / Weave
    if (product.weaveTechnique) this.incrementScore(profile.sareeTypes, product.weaveTechnique, 4);
    if (product.weave) this.incrementScore(profile.sareeTypes, product.weave, 3);
    if (product.specifications?.['Weave Technique']) this.incrementScore(profile.sareeTypes, product.specifications['Weave Technique'], 3);

    // Track Fabric
    if (product.silkType) this.incrementScore(profile.fabrics, product.silkType, 3);
    if (product.fabric) this.incrementScore(profile.fabrics, product.fabric, 3);
    if (product.material) this.incrementScore(profile.fabrics, product.material, 3);

    // Track Occasion
    if (product.occasion) this.incrementScore(profile.occasions, product.occasion, 3);
    if (Array.isArray(product.occasions)) {
      product.occasions.forEach(occ => this.incrementScore(profile.occasions, occ, 3));
    }

    // Track Colors
    if (Array.isArray(product.colors)) {
      product.colors.forEach(col => this.incrementScore(profile.colors, col, 2));
    }

    this.saveProfile(profile);
  }

  recordAddToCart(product: Product): void {
    if (!product) return;
    const profile = { ...this.getProfile() };
    if (product.categorySlug) this.incrementScore(profile.categories, product.categorySlug, 8);
    if (product.primaryCategoryId) this.incrementScore(profile.categories, product.primaryCategoryId, 8);
    if (product.weaveTechnique) this.incrementScore(profile.sareeTypes, product.weaveTechnique, 6);
    if (product.silkType) this.incrementScore(profile.fabrics, product.silkType, 5);
    if (product.occasion) this.incrementScore(profile.occasions, product.occasion, 5);
    this.saveProfile(profile);
  }

  recordWishlist(product: Product, added: boolean): void {
    if (!product || !added) return;
    const profile = { ...this.getProfile() };
    if (product.categorySlug) this.incrementScore(profile.categories, product.categorySlug, 6);
    if (product.weaveTechnique) this.incrementScore(profile.sareeTypes, product.weaveTechnique, 5);
    this.saveProfile(profile);
  }

  recordCategoryBrowse(categorySlugOrId: string): void {
    if (!categorySlugOrId || categorySlugOrId === 'all') return;
    const profile = { ...this.getProfile() };
    this.incrementScore(profile.categories, categorySlugOrId, 3);
    this.saveProfile(profile);
  }

  /**
   * Computes an affinity recommendation score for a given product based on user behavioral history.
   */
  calculateScore(product: Product, profile: UserInterestProfile): number {
    let score = 0;

    // Check Categories
    const catKeys = [
      product.categorySlug,
      product.category,
      product.primaryCategoryId,
      ...(Array.isArray(product.categoryIds) ? product.categoryIds : [])
    ].filter(Boolean);

    for (const c of catKeys) {
      const norm = normalizeKey(c);
      if (profile.categories[norm]) {
        score += Math.min(profile.categories[norm] * 3, 30);
      }
    }

    // Check Saree Type / Weave
    const weaveKeys = [
      product.weaveTechnique,
      product.weave,
      product.specifications?.['Weave Technique']
    ].filter(Boolean);

    for (const w of weaveKeys) {
      const norm = normalizeKey(w);
      if (profile.sareeTypes[norm]) {
        score += Math.min(profile.sareeTypes[norm] * 2.5, 20);
      }
    }

    // Check Fabric
    const fabKeys = [product.silkType, product.fabric, product.material].filter(Boolean);
    for (const f of fabKeys) {
      const norm = normalizeKey(f);
      if (profile.fabrics[norm]) {
        score += Math.min(profile.fabrics[norm] * 2, 15);
      }
    }

    // Check Occasion
    const occKeys = [product.occasion, ...(Array.isArray(product.occasions) ? product.occasions : [])].filter(Boolean);
    for (const o of occKeys) {
      const norm = normalizeKey(o);
      if (profile.occasions[norm]) {
        score += Math.min(profile.occasions[norm] * 2, 15);
      }
    }

    // Check Colors
    if (Array.isArray(product.colors)) {
      for (const col of product.colors) {
        const norm = normalizeKey(col);
        if (profile.colors[norm]) {
          score += Math.min(profile.colors[norm] * 1.5, 10);
        }
      }
    }

    // Stock availability: prioritize purchasable items
    const isSoldOut = product.availability === 'sold_out' || product.stock === 0;
    if (isSoldOut) {
      score -= 50;
    } else {
      score += 10;
    }

    // Editorial flags boost
    if (product.featured) score += 15;
    if (product.isNewArrival || product.newArrival) score += 8;
    if (product.isBestSeller || product.bestseller) score += 10;

    return score;
  }

  /**
   * Retrieves or initializes a stable session seed.
   * Remains completely unchanged throughout the patron's active shopping session (30 mins),
   * preventing products from jumping or reordering unexpectedly on refresh or PDP back-navigation.
   */
  getSessionSeed(): number {
    const storage = getSafeSessionStorage();
    if (!storage) {
      return this.sessionSeed;
    }
    try {
      const storedSeed = storage.getItem(SESSION_SEED_KEY);
      const storedTime = storage.getItem(SESSION_TIME_KEY);
      const now = Date.now();

      if (storedSeed && storedTime && now - parseInt(storedTime, 10) < SESSION_DURATION_MS) {
        return parseInt(storedSeed, 10);
      }

      const newSeed = Math.floor(Math.random() * 1000000) + 1;
      storage.setItem(SESSION_SEED_KEY, String(newSeed));
      storage.setItem(SESSION_TIME_KEY, String(now));
      return newSeed;
    } catch {
      return this.sessionSeed;
    }
  }

  getSessionOrderMap(): Record<string, number> | null {
    const storage = getSafeSessionStorage();
    if (!storage) return null;
    try {
      const storedTime = storage.getItem(SESSION_TIME_KEY);
      const now = Date.now();
      if (!storedTime || now - parseInt(storedTime, 10) >= SESSION_DURATION_MS) {
        return null;
      }
      const raw = storage.getItem(SESSION_ORDER_MAP_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  saveSessionOrderMap(orderMap: Record<string, number>): void {
    const storage = getSafeSessionStorage();
    if (!storage) return;
    try {
      storage.setItem(SESSION_ORDER_MAP_KEY, JSON.stringify(orderMap));
      if (!storage.getItem(SESSION_TIME_KEY)) {
        storage.setItem(SESSION_TIME_KEY, String(Date.now()));
      }
    } catch {}
  }

  /**
   * Clears the current session to force a recalculation and fresh shuffle
   * (e.g. when session expires or user explicitly requests fresh picks)
   */
  startNewSession(): void {
    const storage = getSafeSessionStorage();
    if (storage) {
      try {
        storage.removeItem(SESSION_SEED_KEY);
        storage.removeItem(SESSION_TIME_KEY);
        storage.removeItem(SESSION_ORDER_MAP_KEY);
      } catch {}
    }
    this.sessionSeed = Math.floor(Math.random() * 1000000) + 1;
  }

  /**
   * Deterministically scores and ranks an array of products based on profile and seed.
   */
  private computeRankedList(products: Product[], seed: number, profile: UserInterestProfile): Product[] {
    const hasHistory = Object.keys(profile.categories).length > 0 ||
                       Object.keys(profile.sareeTypes).length > 0 ||
                       profile.viewedProductIds.length > 0;

    const scored = products.map((prod, originalIndex) => {
      const score = this.calculateScore(prod, profile);
      return {
        product: prod,
        score,
        originalIndex,
        isFeatured: Boolean(prod.featured),
        isSoldOut: prod.availability === 'sold_out' || prod.stock === 0
      };
    });

    const pseudoRandom = (id: string, salt: number) => {
      let hash = 0;
      const str = id + String(salt);
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return ((hash & 0x7fffffff) % 1000) / 1000;
    };

    if (hasHistory) {
      return scored.sort((a, b) => {
        // Featured items strictly get prominence
        if (a.isFeatured !== b.isFeatured) {
          return a.isFeatured ? -1 : 1;
        }

        // Within same featured tier, in-stock precedes sold-out
        if (a.isSoldOut !== b.isSoldOut) {
          return a.isSoldOut ? 1 : -1;
        }

        // Add small jitter (±15% of score) for dynamic shuffling so repeated visits are diverse
        const jitterA = pseudoRandom(a.product.id || a.product.slug || '', seed) * 8;
        const jitterB = pseudoRandom(b.product.id || b.product.slug || '', seed) * 8;
        const totalA = a.score + jitterA;
        const totalB = b.score + jitterB;

        if (Math.abs(totalB - totalA) > 2) {
          return totalB - totalA;
        }

        return (a.product.id || a.product.slug || '').localeCompare(b.product.id || b.product.slug || '');
      }).map(item => item.product);
    }

    return scored.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }
      if (a.isSoldOut !== b.isSoldOut) {
        return a.isSoldOut ? 1 : -1;
      }

      // Dynamic shuffle across Salem creations
      const randA = pseudoRandom(a.product.id || a.product.slug || '', seed);
      const randB = pseudoRandom(b.product.id || b.product.slug || '', seed);
      return randB - randA;
    }).map(item => item.product);
  }

  /**
   * Intelligently sorts and blends products using:
   * 1. Behavioral recommendation score (user interest)
   * 2. Controlled shuffle within recommendation tiers to ensure variety and discovery
   * 3. Session-locked stability so browsing, refreshing, and PDP back-navigation do not cause jarring instant reordering
   */
  rankAndShuffleProducts(products: Product[]): Product[] {
    if (!Array.isArray(products) || products.length <= 1) {
      return [...(products || [])];
    }

    // 1. Check for locked session order map
    let sessionOrderMap = this.getSessionOrderMap();

    // 2. If no session order map exists (new session or expired 30-min window), generate one
    if (!sessionOrderMap) {
      const currentSeed = this.getSessionSeed();
      const profile = this.getProfile();
      const sorted = this.computeRankedList(products, currentSeed, profile);

      sessionOrderMap = {};
      sorted.forEach((p, idx) => {
        if (p.id) sessionOrderMap![p.id] = idx;
        if (p.slug) sessionOrderMap![p.slug] = idx;
      });
      this.saveSessionOrderMap(sessionOrderMap);
      return sorted;
    }

    // 3. Session map exists: ensure any newly discovered products get appended with a stable rank
    let maxRank = 0;
    Object.values(sessionOrderMap).forEach(v => {
      if (typeof v === 'number' && v > maxRank) maxRank = v;
    });

    let mapModified = false;
    products.forEach(p => {
      const idKey = p.id || '';
      const slugKey = p.slug || '';
      const hasId = idKey && sessionOrderMap![idKey] !== undefined;
      const hasSlug = slugKey && sessionOrderMap![slugKey] !== undefined;

      if (!hasId && !hasSlug) {
        maxRank++;
        if (idKey) sessionOrderMap![idKey] = maxRank;
        if (slugKey) sessionOrderMap![slugKey] = maxRank;
        mapModified = true;
      }
    });

    if (mapModified) {
      this.saveSessionOrderMap(sessionOrderMap);
    }

    // 4. Return products sorted strictly by their session-locked ranks
    return [...products].sort((a, b) => {
      const idA = a.id || '';
      const idB = b.id || '';
      const slugA = a.slug || '';
      const slugB = b.slug || '';

      const rankA = sessionOrderMap![idA] !== undefined 
        ? sessionOrderMap![idA] 
        : (sessionOrderMap![slugA] !== undefined ? sessionOrderMap![slugA] : 999999);

      const rankB = sessionOrderMap![idB] !== undefined 
        ? sessionOrderMap![idB] 
        : (sessionOrderMap![slugB] !== undefined ? sessionOrderMap![slugB] : 999999);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return (a.name || idA).localeCompare(b.name || idB);
    });
  }

  /**
   * Resets session seed to force a fresh shuffle when user explicitly clicks or refreshes
   */
  refreshShuffle(): void {
    this.startNewSession();
  }
}

export const recommendationService = new RecommendationService();
