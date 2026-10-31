/**
 * MUETY Atelier - Client-Side Personalization & Recommendation Engine
 * Privacy-safe, deterministic, and session-stable recommendation scoring.
 */

import { Product } from '../types';

const STORAGE_KEY = 'muety_personalization_signals_v1';
const SESSION_SEED_KEY = 'muety_session_seed_v1';

export interface UserBrowsingProfile {
  viewedProductIds: Array<{ productId: string; timestamp: number; categorySlug?: string }>;
  categoryAffinities: Record<string, { count: number; lastViewed: number }>;
  tagAffinities: Record<string, number>;
  wishlistProductIds: string[];
  cartProductIds: string[];
  searchTerms: Array<{ term: string; timestamp: number }>;
  sessionSeed: number;
}

function getOrCreateSessionSeed(): number {
  if (typeof window === 'undefined') return 12345;
  try {
    const existing = sessionStorage.getItem(SESSION_SEED_KEY);
    if (existing) {
      const parsed = parseInt(existing, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const newSeed = Math.floor(Math.random() * 1000000) + 1;
    sessionStorage.setItem(SESSION_SEED_KEY, String(newSeed));
    return newSeed;
  } catch {
    return 12345;
  }
}

class PersonalizationService {
  private cache: UserBrowsingProfile | null = null;
  private sessionSeed: number = getOrCreateSessionSeed();

  public getProfile(): UserBrowsingProfile {
    if (this.cache) return this.cache;

    if (typeof window === 'undefined') {
      return this.createDefaultProfile();
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.cache = {
          viewedProductIds: Array.isArray(parsed.viewedProductIds) ? parsed.viewedProductIds.slice(-50) : [],
          categoryAffinities: parsed.categoryAffinities || {},
          tagAffinities: parsed.tagAffinities || {},
          wishlistProductIds: Array.isArray(parsed.wishlistProductIds) ? parsed.wishlistProductIds : [],
          cartProductIds: Array.isArray(parsed.cartProductIds) ? parsed.cartProductIds : [],
          searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms.slice(-20) : [],
          sessionSeed: this.sessionSeed
        };
        return this.cache;
      }
    } catch (e) {
      console.warn('[PersonalizationService] Failed to load browsing profile:', e);
    }

    const defaultProfile = this.createDefaultProfile();
    this.cache = defaultProfile;
    return defaultProfile;
  }

  private createDefaultProfile(): UserBrowsingProfile {
    return {
      viewedProductIds: [],
      categoryAffinities: {},
      tagAffinities: {},
      wishlistProductIds: [],
      cartProductIds: [],
      searchTerms: [],
      sessionSeed: this.sessionSeed
    };
  }

  private saveProfile(profile: UserBrowsingProfile): void {
    this.cache = profile;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        viewedProductIds: profile.viewedProductIds.slice(-50),
        categoryAffinities: profile.categoryAffinities,
        tagAffinities: profile.tagAffinities,
        wishlistProductIds: profile.wishlistProductIds.slice(-100),
        cartProductIds: profile.cartProductIds.slice(-100),
        searchTerms: profile.searchTerms.slice(-20)
      }));
    } catch (e) {
      console.warn('[PersonalizationService] Failed to persist profile:', e);
    }
  }

  public recordProductView(product: Product): void {
    if (!product || !product.id) return;
    const profile = this.getProfile();
    const now = Date.now();

    // 1. Add to viewed items
    profile.viewedProductIds = [
      ...profile.viewedProductIds.filter(v => v.productId !== product.id),
      { productId: product.id, timestamp: now, categorySlug: product.categorySlug }
    ].slice(-50);

    // 2. Increment category affinities
    const catKeys = [
      product.categorySlug,
      product.category,
      product.categoryId,
      product.primaryCategoryId,
      ...(product.categoryIds || [])
    ].filter(Boolean) as string[];

    catKeys.forEach(k => {
      const lower = k.toLowerCase().trim();
      if (!profile.categoryAffinities[lower]) {
        profile.categoryAffinities[lower] = { count: 0, lastViewed: now };
      }
      profile.categoryAffinities[lower].count += 1;
      profile.categoryAffinities[lower].lastViewed = now;
    });

    // 3. Increment tag & textile affinities
    const tags = [
      ...(product.tags || []),
      product.silkType,
      product.weaveTechnique,
      product.occasion
    ].filter(Boolean) as string[];

    tags.forEach(t => {
      const lower = t.toLowerCase().trim();
      profile.tagAffinities[lower] = (profile.tagAffinities[lower] || 0) + 1;
    });

    this.saveProfile(profile);
  }

  public recordCategoryView(categorySlugOrId: string): void {
    if (!categorySlugOrId || categorySlugOrId === 'all') return;
    const profile = this.getProfile();
    const key = categorySlugOrId.toLowerCase().trim();
    const now = Date.now();

    if (!profile.categoryAffinities[key]) {
      profile.categoryAffinities[key] = { count: 0, lastViewed: now };
    }
    profile.categoryAffinities[key].count += 2; // direct category view gets stronger boost
    profile.categoryAffinities[key].lastViewed = now;

    this.saveProfile(profile);
  }

  public recordWishlistAdd(productId: string): void {
    if (!productId) return;
    const profile = this.getProfile();
    if (!profile.wishlistProductIds.includes(productId)) {
      profile.wishlistProductIds.push(productId);
      this.saveProfile(profile);
    }
  }

  public recordWishlistRemove(productId: string): void {
    if (!productId) return;
    const profile = this.getProfile();
    profile.wishlistProductIds = profile.wishlistProductIds.filter(id => id !== productId);
    this.saveProfile(profile);
  }

  public recordCartAdd(productId: string): void {
    if (!productId) return;
    const profile = this.getProfile();
    if (!profile.cartProductIds.includes(productId)) {
      profile.cartProductIds.push(productId);
      this.saveProfile(profile);
    }
  }

  public recordSearch(term: string): void {
    const clean = (term || '').trim().toLowerCase();
    if (!clean) return;
    const profile = this.getProfile();
    profile.searchTerms = [
      ...profile.searchTerms.filter(s => s.term !== clean),
      { term: clean, timestamp: Date.now() }
    ].slice(-20);
    this.saveProfile(profile);
  }

  /**
   * Calculates a personalization affinity score for a product.
   * Higher score = higher priority in the personalized storefront feed.
   */
  public calculateProductScore(product: Product, profile?: UserBrowsingProfile): number {
    const prof = profile || this.getProfile();
    let score = 0;
    const now = Date.now();

    // 1. Base Product Quality & Authority Signals (0 - 25 points)
    const rating = Number(product.rating) || 5.0;
    score += rating * 2; // e.g. 10 points for 5.0 rating

    if (product.isBestSeller || product.bestseller) score += 6;
    if (product.isNewArrival || product.newArrival) score += 5;
    if (product.isMostWanted || product.mostWanted) score += 5;
    if (product.featured) score += 4;
    if ((product.stock || 0) > 0) score += 2; // prioritize in-stock pieces

    // 2. Category Affinity Match (0 - 35 points)
    const productCategories = [
      product.categorySlug,
      product.category,
      product.categoryId,
      product.primaryCategoryId,
      ...(product.categoryIds || [])
    ].filter(Boolean).map(c => c!.toLowerCase().trim());

    for (const cat of productCategories) {
      const aff = prof.categoryAffinities[cat];
      if (aff) {
        // Recency decay: within 24h = full weight, older = decayed
        const hoursAgo = (now - aff.lastViewed) / (1000 * 60 * 60);
        const recencyMultiplier = hoursAgo <= 24 ? 1.0 : hoursAgo <= 72 ? 0.7 : 0.4;
        const affinityBoost = Math.min(aff.count * 3, 25) * recencyMultiplier;
        score += affinityBoost;
        break; // Count primary match once
      }
    }

    // 3. Textile & Tag Affinity Match (0 - 15 points)
    const productTags = [
      ...(product.tags || []),
      product.silkType,
      product.weaveTechnique,
      product.occasion
    ].filter(Boolean).map(t => t!.toLowerCase().trim());

    let tagMatchPoints = 0;
    for (const tag of productTags) {
      if (prof.tagAffinities[tag]) {
        tagMatchPoints += Math.min(prof.tagAffinities[tag] * 1.5, 6);
      }
    }
    score += Math.min(tagMatchPoints, 15);

    // 4. Intent Signals (Wishlist / Cart)
    if (prof.wishlistProductIds.includes(product.id)) {
      score += 15; // User explicitly saved this item
    }

    // 5. Cold-Start Deterministic Jitter
    // For tie-breaking and giving every session a cohesive yet distinct feel
    // Uses pseudo-random hash of sessionSeed + product id so it's 100% deterministic per session
    const idHash = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const sessionJitter = (Math.sin(prof.sessionSeed + idHash) + 1) * 1.5;
    score += sessionJitter;

    return Math.round(score * 100) / 100;
  }

  /**
   * Sorts products applying personalization while strictly maintaining session stability.
   */
  public sortPersonalized(products: Product[]): Product[] {
    if (!products || products.length <= 1) return products;
    const profile = this.getProfile();

    // Precalculate scores once for this array
    const scored = products.map((prod, originalIndex) => ({
      product: prod,
      score: this.calculateProductScore(prod, profile),
      originalIndex
    }));

    // Sort descending by score; on tie maintain original index
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.originalIndex - b.originalIndex;
    });

    return scored.map(item => item.product);
  }
}

export const personalizationService = new PersonalizationService();
