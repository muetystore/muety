export type DiscountType = 'percentage' | 'fixed';

export interface CouponRedemption {
  userId?: string;
  email?: string;
  phone?: string;
  orderId?: string;
  usedAt: string;
}

export interface CouponUserContext {
  userId?: string;
  email?: string;
  phone?: string;
}

export interface Coupon {
  id: string;
  code: string;
  title?: string;
  badge?: string;
  discountType: DiscountType;
  discountValue: number;
  minSpend: number;
  maxDiscount?: number;
  startDate?: string;
  expiresAt: string;
  isActive: boolean;
  usageCount: number;
  usageLimit?: number; // Total redemptions across all patrons
  perCustomerLimit?: number; // Max redemptions allowed per individual customer (e.g. 1 for one-time offer)
  redemptions?: CouponRedemption[];
  usedByUsers?: string[]; // Lowercase identifiers (uid, email, phone) for quick checks
  isStackable?: boolean;
  applicableCategories?: string[];
  applicableProductIds?: string[];
  description?: string;
}
