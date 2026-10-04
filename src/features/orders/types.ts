import { Address } from '@/shared/types';
import { CartItem } from '../cart/types';

export type OrderStatus = 
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'pending';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'razorpay' | 'cash_on_delivery' | 'credit_card' | 'upi' | 'net_banking';

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  timestamp: string;
  description: string;
}

export interface CustomerSnapshot {
  customerId: string;
  displayName: string;
  email: string;
  phone?: string;
}

export interface OrderItemSnapshot {
  productId: string;
  sku: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  total: number;
  variantOptions?: Record<string, string>;
}

export interface Order {
  id: string;
  orderId?: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerSnapshot?: CustomerSnapshot;
  shippingAddress: Address;
  billingAddress?: Address;
  items: CartItem[];
  itemSnapshots?: OrderItemSnapshot[];
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
  courier?: string;
  timeline: OrderTimelineEvent[];
  razorpayPaymentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  fulfilledAt?: string;
}

