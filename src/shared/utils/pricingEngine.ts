 /**
 * MUETY STORE — Canonical Order Pricing & Financial Engine
 * 
 * Rules:
 * 1. Total shipping/delivery charge is flat ₹89 per order.
 * 2. Order Total = Item Subtotal − Discount + Applicable Tax (5% GST) + ₹89 Shipping/Delivery Charge.
 * 3. Online payment (Razorpay) collects 100% of the Order Total online.
 * 4. Cash on Delivery (COD) collects ₹89 online as an advance payment credited toward the Order Total.
 * 5. Remaining balance at delivery for COD = Order Total − ₹89 (Subtotal − Discount + Tax).
 * 6. The ₹89 advance is NEVER added on top of the shipping charge; it is credited directly toward the existing Order Total.
 */

export const CANONICAL_SHIPPING_FEE = 89;
export const COD_ADVANCE_AMOUNT = 89;
export const DEFAULT_TAX_RATE = 5;

export interface FinancialBreakdownInput {
  subtotal: number;
  discount?: number;
  taxRate?: number;
  paymentMethod?: 'razorpay' | 'cash_on_delivery' | 'credit_card' | 'upi' | 'net_banking' | string;
}

export interface OrderFinancialBreakdown {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  tax: number;
  shippingFee: number;
  total: number;
  paymentMethod: 'razorpay' | 'cash_on_delivery';
  amountDueOnline: number;
  remainingAmountDueAtDelivery: number;
  codAdvanceAmount: number;
}

export function calculateOrderFinancials(input: FinancialBreakdownInput): OrderFinancialBreakdown {
  const subtotal = Math.max(0, Number(input.subtotal) || 0);
  const discount = Math.min(subtotal, Math.max(0, Number(input.discount) || 0));
  const taxRate = typeof input.taxRate === 'number' && input.taxRate >= 0 ? input.taxRate : DEFAULT_TAX_RATE;
  
  const taxableAmount = Math.max(0, Number((subtotal - discount).toFixed(2)));
  const tax = subtotal === 0 ? 0 : Number(((taxableAmount * taxRate) / 100).toFixed(2));
  const shippingFee = subtotal === 0 ? 0 : CANONICAL_SHIPPING_FEE;
  
  const total = subtotal === 0 ? 0 : Number((taxableAmount + tax + shippingFee).toFixed(2));

  const isCod = input.paymentMethod === 'cash_on_delivery';
  const paymentMethod: 'razorpay' | 'cash_on_delivery' = isCod ? 'cash_on_delivery' : 'razorpay';

  let amountDueOnline = total;
  let remainingAmountDueAtDelivery = 0;
  let codAdvanceAmount = 0;

  if (isCod && total > 0) {
    codAdvanceAmount = Math.min(COD_ADVANCE_AMOUNT, total);
    amountDueOnline = codAdvanceAmount;
    remainingAmountDueAtDelivery = Number(Math.max(0, total - codAdvanceAmount).toFixed(2));
  }

  return {
    subtotal,
    discount,
    taxableAmount,
    taxRate,
    tax,
    shippingFee,
    total,
    paymentMethod,
    amountDueOnline,
    remainingAmountDueAtDelivery,
    codAdvanceAmount
  };
}
