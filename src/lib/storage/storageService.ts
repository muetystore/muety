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
  CART: 'muety_cart_v1'
};

class StorageService {
  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults() {
    if (typeof window === 'undefined') return;
    const existingRaw = localStorage.getItem(KEYS.PRODUCTS);
    if (existingRaw && (existingRaw.includes('dfvdfvdf') || existingRaw.includes('cat-timepieces'))) {
      localStorage.removeItem(KEYS.PRODUCTS);
      localStorage.removeItem(KEYS.CATEGORIES);
      localStorage.setItem(KEYS.INITIALIZED, 'v4_prod_clean');
    }

    const isInit = localStorage.getItem(KEYS.INITIALIZED);
    if (!isInit || isInit !== 'v5_firestore_authority') {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([]));
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify([]));
      localStorage.setItem(KEYS.COUPONS, JSON.stringify([]));
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      localStorage.setItem(KEYS.USERS, JSON.stringify([]));
      localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
      localStorage.setItem(KEYS.REVIEWS, JSON.stringify([]));
      localStorage.setItem(KEYS.INITIALIZED, 'v5_firestore_authority');
    }
  }

  // --- PRODUCTS ---
  getProducts(): Product[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.PRODUCTS);
      const items = data ? JSON.parse(data) : [];
      return (items || []).map((p: any) => {
        const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : ['/saree_model_individual.jpg'];
        
        return {
          ...p,
          images,
          price: Number(p.price) || 0,
          stock: p.stock !== undefined ? Number(p.stock) : 10,
          category: p.category || 'Festive Silk Sarees',
          categorySlug: p.categorySlug || 'sarees',
          sku: p.sku || `MUETY-${Math.floor(100 + Math.random() * 900)}`
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
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
      window.dispatchEvent(new Event('muety_products_updated'));
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
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveCategories(categories: Category[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
      window.dispatchEvent(new Event('muety_categories_updated'));
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
      const data = localStorage.getItem(KEYS.ORDERS);
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
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new Event('muety_orders_updated'));
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
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
        const parsed: StoreSettings = JSON.parse(data);
        if (parsed.currencySymbol === '$' || parsed.currency === 'USD') {
          parsed.currency = 'INR';
          parsed.currencySymbol = '₹';
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
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new Event('muety_settings_updated'));
  }

  // --- USERS ---
  getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(KEYS.USERS);
      const parsed: UserProfile[] = data ? JSON.parse(data) : [];
      const combined = [...parsed];
      INITIAL_USERS.forEach(initUser => {
        if (!combined.some(u => u.uid === initUser.uid || u.email.toLowerCase() === initUser.email.toLowerCase())) {
          combined.push(initUser);
        }
      });
      return combined.length > 0 ? combined : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
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
  resetToSeedData(): void {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(KEYS.COUPONS, JSON.stringify(INITIAL_COUPONS));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
    window.location.reload();
  }
}

export const storageService = new StorageService();
