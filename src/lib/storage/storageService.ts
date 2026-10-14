import { Product, Category } from '@/features/catalog/types';
import { Coupon } from '@/features/coupons/types';
import { Order } from '@/features/orders/types';
import { PatronReview } from '@/features/reviews/types';
import { StoreSettings, UserProfile } from '@/shared/types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CATEGORIES, 
  INITIAL_COUPONS, 
  INITIAL_SETTINGS, 
  INITIAL_USERS, 
  INITIAL_ORDERS, 
  INITIAL_REVIEWS 
} from '../../../scripts/seed/seedData';

const KEYS = {
  INITIALIZED: 'muety_initialized_v2',
  PRODUCTS: 'muety_products_v1',
  CATEGORIES: 'muety_categories_v1',
  COUPONS: 'muety_coupons_v1',
  SETTINGS: 'muety_settings_v1',
  USERS: 'muety_users_v1',
  ORDERS: 'muety_orders_v1',
  REVIEWS: 'muety_reviews_v1',
  CURRENT_USER: 'muety_current_user_v1',
  WISHLIST: 'muety_wishlist_v1',
  CART: 'muety_cart_v1',
  RECENTLY_VIEWED: 'muety_recently_viewed_v1'
};

const memoryStore: Record<string, string> = {};
const categoryListeners = new Set<(cats: Category[]) => void>();
const productListeners = new Set<(products: Product[]) => void>();

export function subscribeLocalCategories(callback: (cats: Category[]) => void): () => void {
  categoryListeners.add(callback);
  return () => categoryListeners.delete(callback);
}

export function subscribeLocalProducts(callback: (products: Product[]) => void): () => void {
  productListeners.add(callback);
  return () => productListeners.delete(callback);
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}
  return memoryStore[key] !== undefined ? memoryStore[key] : null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
  memoryStore[key] = value;
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
  delete memoryStore[key];
}

class StorageService {
  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults() {
    const existingRaw = safeGetItem(KEYS.PRODUCTS);
    if (existingRaw && (existingRaw.includes('dfvdfvdf') || existingRaw.includes('cat-timepieces'))) {
      safeRemoveItem(KEYS.PRODUCTS);
      safeRemoveItem(KEYS.CATEGORIES);
      safeSetItem(KEYS.INITIALIZED, 'v7_canonical_identities_sanitized');
    }

    const isInit = safeGetItem(KEYS.INITIALIZED);
    if (!isInit || isInit !== 'v7_canonical_identities_sanitized') {
      safeSetItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      safeSetItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      safeSetItem(KEYS.COUPONS, JSON.stringify(INITIAL_COUPONS));
      safeSetItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      safeSetItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      safeSetItem(KEYS.ORDERS, JSON.stringify([]));
      safeSetItem(KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
      safeSetItem(KEYS.INITIALIZED, 'v7_canonical_identities_sanitized');
    }
  }

  // --- PRODUCTS ---
  getProducts(): Product[] {
    try {
      const data = safeGetItem(KEYS.PRODUCTS);
      const items = data !== null ? JSON.parse(data) : INITIAL_PRODUCTS;
      const categories = this.getCategories();

      return (items || []).map((p: any) => {
        const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : ['/saree_model_individual.jpg'];
        
        // Migration logic for multi-category:
        let categoryIds: string[] = Array.isArray(p.categoryIds) && p.categoryIds.length > 0 ? p.categoryIds : [];
        if (categoryIds.length === 0) {
          if (p.categoryId) {
            categoryIds = [p.categoryId];
          } else {
            const matchCat = (categories || []).find(c => 
              (c.slug || '').toLowerCase() === (p.categorySlug || '').toLowerCase() ||
              (c.name || '').toLowerCase() === (p.category || '').toLowerCase()
            );
            categoryIds = [matchCat ? matchCat.id : (p.categorySlug || 'cat-sarees')];
          }
        }

        const primaryCategoryId = p.primaryCategoryId && categoryIds.includes(p.primaryCategoryId) 
          ? p.primaryCategoryId 
          : categoryIds[0];

        return {
          ...p,
          images,
          categoryIds,
          primaryCategoryId,
          categoryId: p.categoryId || primaryCategoryId,
          price: Number(p.price) || 0,
          stock: p.stock !== undefined ? Number(p.stock) : 10,
          category: p.category || 'Festive Silk Sarees',
          categorySlug: p.categorySlug || 'sarees',
          sku: p.sku || `SR-${Math.floor(10 + Math.random() * 90)}`,
          availability: p.availability || 'available'
        };
      });
    } catch {
      return [];
    }
  }

  getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id || p.slug === id);
  }

  saveProducts(products: Product[]): void {
    try {
      safeSetItem(KEYS.PRODUCTS, JSON.stringify(products));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('muety_products_updated'));
      }
      productListeners.forEach(cb => {
        try { cb(products); } catch {}
      });
    } catch {}
  }

  addProduct(product: Product): Product {
    const products = this.getProducts();
    products.unshift(product);
    this.saveProducts(products);
    return product;
  }

  updateProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = { ...product, updatedAt: new Date().toISOString() };
      this.saveProducts(products);
    }
    return product;
  }

  deleteProduct(id: string): boolean {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    this.saveProducts(filtered);
    return true;
  }

  // --- CATEGORIES ---
  getCategories(): Category[] {
    try {
      const data = safeGetItem(KEYS.CATEGORIES);
      const list: Category[] = data !== null ? JSON.parse(data) : INITIAL_CATEGORIES;
      return list.map(c => {
        const fallbackLetters = (c.name || 'Saree').replace(/[^a-zA-Z]/g, '').toUpperCase();
        const code = (!c.categoryCode || c.categoryCode.trim().length !== 2)
          ? (fallbackLetters.length >= 2 ? fallbackLetters.slice(0, 2) : 'XX')
          : c.categoryCode.trim().toUpperCase();

        let imgUrl = (c as any).imageUrl || c.image || (c as any).coverImage || (c as any).coverImageUrl || '/saree_model_individual.jpg';
        if (imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') || imgUrl.startsWith('file:')) {
          imgUrl = 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80';
        }

        return { 
          ...c, 
          image: imgUrl,
          imageUrl: imgUrl,
          categoryCode: code 
        };
      });
    } catch {
      return [];
    }
  }

  saveCategories(categories: Category[]): void {
    try {
      safeSetItem(KEYS.CATEGORIES, JSON.stringify(categories));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('muety_categories_updated'));
      }
      categoryListeners.forEach(cb => {
        try { cb(categories); } catch {}
      });
    } catch {}
  }

  addCategory(category: Category): Category {
    const list = this.getCategories();
    list.push(category);
    this.saveCategories(list);
    return category;
  }

  updateCategory(category: Category): Category {
    const list = this.getCategories();
    const index = list.findIndex(c => c.id === category.id);
    if (index !== -1) {
      list[index] = category;
      this.saveCategories(list);
    }
    return category;
  }

  deleteCategory(id: string): boolean {
    const list = this.getCategories();
    const filtered = list.filter(c => c.id !== id);
    this.saveCategories(filtered);
    return true;
  }

  // --- COUPONS ---
  getCoupons(): Coupon[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.COUPONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveCoupons(coupons: Coupon[]): void {
    localStorage.setItem(KEYS.COUPONS, JSON.stringify(coupons));
  }

  addCoupon(coupon: Coupon): Coupon {
    const list = this.getCoupons();
    list.unshift(coupon);
    this.saveCoupons(list);
    return coupon;
  }

  updateCoupon(coupon: Coupon): Coupon {
    const list = this.getCoupons();
    const index = list.findIndex(c => c.id === coupon.id);
    if (index !== -1) {
      list[index] = coupon;
      this.saveCoupons(list);
    }
    return coupon;
  }

  deleteCoupon(id: string): boolean {
    const list = this.getCoupons();
    this.saveCoupons(list.filter(c => c.id !== id));
    return true;
  }

  // --- ORDERS ---
  getOrders(): Order[] {
    try {
      const data = safeGetItem(KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id || o.orderNumber === id);
  }

  getCustomerOrders(customerId: string): Order[] {
    return this.getOrders().filter(o => o.customerId === customerId);
  }

  saveOrders(orders: Order[]): void {
    safeSetItem(KEYS.ORDERS, JSON.stringify(orders));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('muety_orders_updated'));
    }
  }

  createOrder(order: Order): Order {
    const orders = this.getOrders();
    orders.unshift(order);
    this.saveOrders(orders);
    
    // Decrement stock for purchased products
    const products = this.getProducts();
    order.items.forEach(item => {
      const pIndex = products.findIndex(p => p.id === item.product.id);
      if (pIndex !== -1) {
        products[pIndex].stock = Math.max(0, products[pIndex].stock - item.quantity);
      }
    });
    this.saveProducts(products);

    return order;
  }

  updateOrderStatus(orderId: string, status: Order['orderStatus'], description?: string): Order | undefined {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      const order = orders[index];
      order.orderStatus = status;
      order.updatedAt = new Date().toISOString();
      
      const newEvent = {
        status,
        label: `Status: ${status.toUpperCase()}`,
        timestamp: new Date().toLocaleString(),
        description: description || `Order updated to ${status} by MUETY Concierge.`
      };
      
      order.timeline.push(newEvent);
      orders[index] = order;
      this.saveOrders(orders);
      return order;
    }
    return undefined;
  }

  deleteOrder(id: string): boolean {
    const orders = this.getOrders().filter(o => o.id !== id && o.orderNumber !== id);
    this.saveOrders(orders);
    return true;
  }

  clearOrders(): void {
    this.saveOrders([]);
  }

  // --- STORE SETTINGS ---
  getSettings(): StoreSettings {
    try {
      const data = safeGetItem(KEYS.SETTINGS);
      if (data) {
        const parsed: StoreSettings = JSON.parse(data);
        let changed = false;
        if (parsed.currencySymbol === '$' || parsed.currency === 'USD') {
          parsed.currency = 'INR';
          parsed.currencySymbol = '₹';
          changed = true;
        }
        // Safe repeatable migration: migrate legacy unmigrated default (100 or missing) to ₹89 flat courier fee once
        const hasMigrated = (parsed as any)._shippingMigratedV2 === true;
        if (!hasMigrated) {
          if (parsed.standardShippingFee === 100 || typeof parsed.standardShippingFee !== 'number') {
            parsed.standardShippingFee = 89;
            parsed.expressShippingFee = 89;
          }
          (parsed as any)._shippingMigratedV2 = true;
          changed = true;
        }
        if (changed) {
          this.saveSettings(parsed);
        }
        return parsed;
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  saveSettings(settings: StoreSettings): void {
    const toSave = {
      ...settings,
      _shippingMigratedV2: (settings as any)._shippingMigratedV2 !== undefined 
        ? (settings as any)._shippingMigratedV2 
        : true
    };
    safeSetItem(KEYS.SETTINGS, JSON.stringify(toSave));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('muety_settings_updated'));
    }
  }

  // --- USERS ---
  getUsers(): UserProfile[] {
    const isLegacyEmail = (email?: string) => {
      if (!email) return false;
      const lower = email.toLowerCase();
      return lower.includes('muetystore.com') || lower === 'kalvimohan03@gmail.com';
    };

    try {
      const data = localStorage.getItem(KEYS.USERS);
      const parsed: UserProfile[] = data ? JSON.parse(data) : [];
      const sanitizedParsed = parsed.filter(u => !isLegacyEmail(u.email));
      const combined = [...sanitizedParsed];

      INITIAL_USERS.forEach(initUser => {
        if (!isLegacyEmail(initUser.email) && !combined.some(u => u.uid === initUser.uid || u.email.toLowerCase() === initUser.email.toLowerCase())) {
          combined.push(initUser);
        }
      });

      return combined.length > 0 ? combined : INITIAL_USERS.filter(u => !isLegacyEmail(u.email));
    } catch {
      return INITIAL_USERS.filter(u => !isLegacyEmail(u.email));
    }
  }

  saveUsers(users: UserProfile[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  getUserById(uid: string): UserProfile | undefined {
    return this.getUsers().find(u => u.uid === uid);
  }

  saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.uid === user.uid);
    if (index !== -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    this.saveUsers(users);
  }

  // --- WISHLIST ---
  getWishlist(): string[] {
    try {
      const data = localStorage.getItem(KEYS.WISHLIST);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveWishlist(ids: string[]): void {
    localStorage.setItem(KEYS.WISHLIST, JSON.stringify(ids));
  }

  // --- RECENTLY VIEWED ---
  getRecentlyViewed(): string[] {
    try {
      const data = safeGetItem(KEYS.RECENTLY_VIEWED);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addRecentlyViewed(productId: string): void {
    if (!productId) return;
    try {
      const current = this.getRecentlyViewed();
      const updated = [productId, ...current.filter(id => id !== productId)].slice(0, 12);
      safeSetItem(KEYS.RECENTLY_VIEWED, JSON.stringify(updated));
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('muety_recently_viewed_updated', { detail: updated }));
      }
    } catch {}
  }

  // --- REVIEWS & TESTIMONIALS ---
  getReviews(): PatronReview[] {
    try {
      const data = localStorage.getItem(KEYS.REVIEWS);
      return data ? JSON.parse(data) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  }

  saveReviews(reviews: PatronReview[]): void {
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(reviews));
    window.dispatchEvent(new Event('muety_reviews_updated'));
  }

  addReview(review: PatronReview): PatronReview {
    const list = this.getReviews();
    list.unshift(review);
    this.saveReviews(list);
    return review;
  }

  updateReview(review: PatronReview): PatronReview {
    const list = this.getReviews();
    const index = list.findIndex(r => r.id === review.id);
    if (index !== -1) {
      list[index] = review;
      this.saveReviews(list);
    }
    return review;
  }

  deleteReview(id: string): boolean {
    const list = this.getReviews();
    const filtered = list.filter(r => r.id !== id);
    this.saveReviews(filtered);
    return true;
  }

  // --- RESET TO FACTORY DEMO DATA ---
  clearAll(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {}
    Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
    this.initializeDefaults();
  }

  resetToSeedData(): void {
    safeSetItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    safeSetItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    safeSetItem(KEYS.COUPONS, JSON.stringify(INITIAL_COUPONS));
    safeSetItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    safeSetItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    safeSetItem(KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    safeSetItem(KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}

export const storageService = new StorageService();
