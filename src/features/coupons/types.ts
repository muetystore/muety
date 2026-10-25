export type DiscountType = 'percentage' | 'fixed';

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
  usageLimit?: number;
  perCustomerLimit?: number;
  isStackable?: boolean;
  applicableCategories?: string[];
  applicableProductIds?: string[];
  description?: string;
}
