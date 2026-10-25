import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, Coupon } from '@/types';
import { couponService } from '@/features/coupons/services/couponService';
import { storageService, subscribeLocalProducts } from '@/lib/storage/storageService';
import { useNotification } from './NotificationContext';
import { calculateOrderFinancials } from '@/shared/utils/pricingEngine';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, color?: string, size?: string) => void;
  removeFromCart: (productId: string, color?: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, color?: string, size?: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  appliedCoupon: Coupon | null;
  discountAmount: number;
  applyCoupon: (code: string, contextSubtotal?: number) => { success: boolean; message: string };
  removeCoupon: () => void;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  wishlist: string[];
  setWishlist: React.Dispatch<React.SetStateAction<string[]>>;
  clearWishlist: () => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'muety_cart_items_v1';
const WISHLIST_STORAGE_KEY = 'muety_wishlist_items_v1';
const COUPON_STORAGE_KEY = 'muety_applied_coupon_v1';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { success, info, warning } = useNotification();
  
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      const parsed: string[] = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed) || parsed.length === 0) return [];
      const currentProducts = storageService.getProducts();
      if (currentProducts && currentProducts.length > 0) {
        const validIds = new Set(currentProducts.map(p => p.id));
        const filtered = parsed.filter(id => typeof id === 'string' && validIds.has(id));
        if (filtered.length !== parsed.length) {
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(filtered));
        }
        return filtered;
      }
      return parsed;
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const saved = localStorage.getItem(COUPON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  // Reconcile and prune orphaned or deleted products from wishlist
  useEffect(() => {
    const reconcileWishlist = () => {
      try {
        const currentProducts = storageService.getProducts();
        if (!currentProducts || currentProducts.length === 0) return;
        const validIds = new Set(currentProducts.map(p => p.id));
        setWishlist(prev => {
          const filtered = prev.filter(id => typeof id === 'string' && validIds.has(id));
          if (filtered.length !== prev.length) {
            localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(filtered));
            return filtered;
          }
          return prev;
        });
      } catch {}
    };

    reconcileWishlist();
    const unsubLocal = subscribeLocalProducts(() => reconcileWishlist());
    const handleProductsUpdated = () => reconcileWishlist();
    if (typeof window !== 'undefined') {
      window.addEventListener('muety_products_updated', handleProductsUpdated);
    }

    return () => {
      unsubLocal();
      if (typeof window !== 'undefined') {
        window.removeEventListener('muety_products_updated', handleProductsUpdated);
      }
    };
  }, []);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }, [appliedCoupon]);

  const addToCart = (product: Product, quantity = 1, color?: string, size?: string) => {
    const currentProd = storageService.getProductById(product.id) || product;
    if (currentProd.availability === 'sold_out' || product.availability === 'sold_out') {
      warning('This product is currently sold out.', 'Sold Out');
      return;
    }

    const selectedColor = color || (product.colors && product.colors.length > 0 ? product.colors[0] : undefined);
    const selectedSize = size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);

    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && 
                item.selectedColor === selectedColor && 
                item.selectedSize === selectedSize
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        if (newQty > product.stock) {
          warning(`Only ${product.stock} units available in stock.`, 'Stock Limit');
          updated[existingIndex].quantity = product.stock;
        } else {
          updated[existingIndex].quantity = newQty;
        }
        return updated;
      } else {
        return [...prev, { product, quantity: Math.min(quantity, product.stock), selectedColor, selectedSize }];
      }
    });

    success(`${product.name} added to your bag`, 'Added to Bag');
    setIsDrawerOpen(true);
  };

  const removeFromCart = (productId: string, color?: string, size?: string) => {
    setItems(prev => prev.filter(item => 
      !(item.product.id === productId && item.selectedColor === color && item.selectedSize === size)
    ));
    info('Item removed from shopping bag');
  };

  const updateQuantity = (productId: string, quantity: number, color?: string, size?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, color, size);
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.product.id === productId && item.selectedColor === color && item.selectedSize === size) {
        if (quantity > item.product.stock) {
          warning(`Maximum available stock is ${item.product.stock}`, 'Stock Limit');
          return { ...item, quantity: item.product.stock };
        }
        return { ...item, quantity };
      }
      return item;
    }));
  };

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {}
  }, [appliedCoupon]);

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {}
  };

  const cartCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  let discountAmount = 0;
  if (appliedCoupon && subtotal > 0) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.discountValue) / 100;
      if (appliedCoupon.maxDiscount && discountAmount > appliedCoupon.maxDiscount) {
        discountAmount = appliedCoupon.maxDiscount;
      }
    } else {
      discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
    }
  }

  const settings = storageService.getSettings();
  const financials = calculateOrderFinancials({
    subtotal,
    discount: discountAmount,
    taxRate: settings.taxRate || 5
  });
  const shippingFee = financials.shippingFee;
  const taxAmount = financials.tax;
  const grandTotal = financials.total;

  const applyCoupon = (code: string, contextSubtotal?: number) => {
    const effectiveSubtotal = (contextSubtotal !== undefined && contextSubtotal > 0) ? contextSubtotal : subtotal;
    const result = couponService.validateCoupon(code, effectiveSubtotal);
    if (result.valid && result.coupon) {
      setAppliedCoupon(result.coupon);
      success(result.message, 'Coupon Applied');
      return { success: true, message: result.message };
    } else {
      warning(result.message, 'Coupon Invalid');
      return { success: false, message: result.message };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {}
    info('Coupon code removed');
  };

  const clearWishlist = () => {
    setWishlist([]);
    try {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    } catch {}
    info('Wishlist cleared');
  };

  const toggleWishlist = (productId: string) => {
    if (!productId) return;
    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        info('Removed from your MUETY wishlist');
        return prev.filter(id => id !== productId);
      } else {
        const prod = storageService.getProductById(productId);
        if (!prod) {
          warning('This item is no longer available in the catalog.', 'Item Unavailable');
          return prev;
        }
        success('Saved to your MUETY wishlist', 'Wishlist');
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    if (!productId) return false;
    return wishlist.includes(productId) && !!storageService.getProductById(productId);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      subtotal,
      appliedCoupon,
      discountAmount,
      applyCoupon,
      removeCoupon,
      shippingFee,
      taxAmount,
      grandTotal,
      wishlist,
      setWishlist,
      clearWishlist,
      toggleWishlist,
      isInWishlist,
      isDrawerOpen,
      setIsDrawerOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
