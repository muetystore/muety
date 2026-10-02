import { Address } from '@/shared/types';
import { CartItem } from '../cart/types';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'razorpay' | 'cash_on_delivery' | 'credit_card' | 'apple_pay' | 'google_pay' | 'paypal';

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  timestamp: string;
  description: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: Address;
  items: CartItem[];
  subtotal: number;
  discount: number;
  appliedCoupon?: string;
  tax: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  trackingCarrier?: string;
  timeline: OrderTimelineEvent[];
  razorpayPaymentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
