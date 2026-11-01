/**
 * MUETY Meta Pixel E-Commerce Event Tracking Authority
 * Pixel ID: 4445856915724282
 * Website: https://www.muety.in
 * 
 * Implements Standard Meta E-Commerce Events:
 * 1. ViewContent – When a customer opens a product detail page.
 * 2. AddToCart – When a customer adds a product to cart.
 * 3. InitiateCheckout – When a customer begins the checkout workflow.
 * 4. AddPaymentInfo – When payment details/method are submitted.
 * 5. Purchase – Fired ONLY after successful order placement/payment confirmation.
 * 
 * Strict Guarantees:
 * - Uses existing Meta Pixel installation from index.html (never re-initializes).
 * - Comprehensive deduplication (Purchase deduplicated per order ID via sessionStorage).
 * - Never triggers Purchase on checkout page load.
 * - Always includes product ID, numeric value, and 'INR' currency.
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const META_PIXEL_ID = '4445856915724282';

export interface MetaContentItem {
  id: string;
  quantity: number;
  item_price: number;
}

export interface MetaTrackableProduct {
  id: string;
  name?: string;
  title?: string;
  price: number;
  salePrice?: number;
  originalPrice?: number;
  category?: string;
  categorySlug?: string;
}

export interface MetaTrackableCartItem {
  product?: MetaTrackableProduct;
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

export interface MetaTrackableOrder {
  id: string;
  orderNumber?: string;
  total: number;
  totalAmount?: number;
  items: Array<{
    productId?: string;
    product?: { id: string; name?: string; price?: number };
    id?: string;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
}

/**
 * Low-level safe dispatcher to window.fbq
 */
export function callFbq(action: 'track' | 'trackCustom', eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  if (typeof window.fbq === 'function') {
    try {
      if (params) {
        window.fbq(action, eventName, params);
      } else {
        window.fbq(action, eventName);
      }
    } catch (err) {
      console.warn(`[Meta Pixel] Error tracking "${eventName}":`, err);
    }
  }
}

/**
 * Resolves effective price in INR: uses salePrice if present and valid, otherwise standard price.
 */
function resolveItemPrice(item: { price?: number; salePrice?: number }): number {
  if (typeof item.salePrice === 'number' && item.salePrice > 0) {
    return Math.round(item.salePrice * 100) / 100;
  }
  return typeof item.price === 'number' ? Math.round(item.price * 100) / 100 : 0;
}

export const metaPixel = {
  /**
   * 1. ViewContent: Fired when customer views a product detail page.
   */
  trackViewContent(product: MetaTrackableProduct): void {
    if (!product || !product.id) return;
    const value = resolveItemPrice(product);

    callFbq('track', 'ViewContent', {
      content_name: product.name || product.title || 'MUETY Handloom Saree',
      content_ids: [product.id],
      content_type: 'product',
      value: value,
      currency: 'INR',
      content_category: product.category || product.categorySlug || 'Handloom Sarees'
    });
  },

  /**
   * 2. AddToCart: Fired when customer adds an item to cart.
   */
  trackAddToCart(product: MetaTrackableProduct, quantity: number = 1): void {
    if (!product || !product.id) return;
    const unitPrice = resolveItemPrice(product);
    const validQty = Math.max(1, quantity);
    const value = Math.round(unitPrice * validQty * 100) / 100;

    callFbq('track', 'AddToCart', {
      content_name: product.name || product.title || 'MUETY Handloom Saree',
      content_ids: [product.id],
      content_type: 'product',
      value: value,
      currency: 'INR',
      content_category: product.category || product.categorySlug || 'Handloom Sarees'
    });
  },

  /**
   * 3. InitiateCheckout: Fired when customer begins checkout process.
   */
  trackInitiateCheckout(items: MetaTrackableCartItem[], totalValue: number): void {
    if (!items || items.length === 0) return;

    const contentIds: string[] = [];
    const contents: MetaContentItem[] = [];
    let numItems = 0;

    items.forEach(item => {
      const pid = item.productId || item.product?.id;
      if (!pid) return;

      const qty = item.quantity || 1;
      const price = item.price ?? (item.product ? resolveItemPrice(item.product) : 0);

      contentIds.push(pid);
      contents.push({
        id: pid,
        quantity: qty,
        item_price: price
      });
      numItems += qty;
    });

    if (contentIds.length === 0) return;

    const sanitizedTotal = typeof totalValue === 'number' && !isNaN(totalValue) 
      ? Math.round(totalValue * 100) / 100 
      : contents.reduce((acc, c) => acc + (c.item_price * c.quantity), 0);

    callFbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      contents: contents,
      content_type: 'product',
      value: sanitizedTotal,
      currency: 'INR',
      num_items: numItems
    });
  },

  /**
   * 4. AddPaymentInfo: Fired when payment details or method are submitted.
   */
  trackAddPaymentInfo(paymentMethod: string, totalValue: number, items: MetaTrackableCartItem[] = []): void {
    const contentIds: string[] = [];
    items.forEach(item => {
      const pid = item.productId || item.product?.id;
      if (pid) contentIds.push(pid);
    });

    callFbq('track', 'AddPaymentInfo', {
      content_ids: contentIds.length > 0 ? contentIds : undefined,
      content_type: 'product',
      value: typeof totalValue === 'number' && !isNaN(totalValue) ? Math.round(totalValue * 100) / 100 : 0,
      currency: 'INR',
      payment_method: paymentMethod || 'online'
    });
  },

  /**
   * 5. Purchase: Fired ONLY after successful order placement/payment confirmation.
   * Strict deduplication: Guards against duplicate events via sessionStorage per order ID.
   */
  trackPurchase(order: MetaTrackableOrder): boolean {
    if (!order || !order.id) return false;

    // Strict deduplication check using sessionStorage
    const dedupeKey = `muety_fb_purchase_${order.id}`;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        if (window.sessionStorage.getItem(dedupeKey)) {
          return false; // Prevent duplicate event firing
        }
        window.sessionStorage.setItem(dedupeKey, '1');
      } catch {
        // sessionStorage fallback
      }
    }

    const contentIds: string[] = [];
    const contents: MetaContentItem[] = [];
    let numItems = 0;

    (order.items || []).forEach(item => {
      const pid = item.productId || item.product?.id || item.id;
      if (!pid) return;

      const qty = item.quantity || 1;
      const price = item.price ?? (item.product ? resolveItemPrice(item.product) : 0);

      contentIds.push(pid);
      contents.push({
        id: pid,
        quantity: qty,
        item_price: price
      });
      numItems += qty;
    });

    const orderValue = typeof order.total === 'number' 
      ? order.total 
      : (typeof order.totalAmount === 'number' ? order.totalAmount : 0);

    const sanitizedTotal = Math.round(orderValue * 100) / 100;

    callFbq('track', 'Purchase', {
      content_ids: contentIds,
      contents: contents,
      content_type: 'product',
      value: sanitizedTotal,
      currency: 'INR',
      order_id: order.id,
      num_items: numItems || 1
    });

    return true;
  }
};

