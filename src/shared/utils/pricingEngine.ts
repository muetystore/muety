 /**
 * MUETY STORE — Canonical Order Pricing & Financial Engine
 * 
 * Rules:
 * 1. Online payment (Razorpay / UPI / Cards / NetBanking) receives 100% FREE shipping (₹0 delivery fee).
 * 2. Cash on Delivery (COD) orders incur a flat ₹89 delivery & handling fee.
 * 3. COD collects the ₹89 delivery fee online as an advance payment authorization to confirm the order.
 * 4. Remaining balance at delivery for COD = Order Total − ₹89 (which equals Item Subtotal − Discount + Applicable Tax).
 */

export const COD_SHIPPING_FEE = 89;
export const ONLINE_SHIPPING_FEE = 0;
export const CANONICAL_SHIPPING_FEE = 89; // Flat fee for COD
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
  
  const discountedSubtotal = Math.max(0, Number((subtotal - discount).toFixed(2)));
  // Product prices are tax-inclusive: statutory embedded tax component is P * r / (1 + r)
  const tax = (discountedSubtotal === 0 || taxRate === 0)
    ? 0
    : Number(((discountedSubtotal * (taxRate / 100)) / (1 + taxRate / 100)).toFixed(2));
  // Net taxable base for accounting and tax invoice records
  const taxableAmount = Number((discountedSubtotal - tax).toFixed(2));
  
  const isCod = input.paymentMethod === 'cash_on_delivery';
  const paymentMethod: 'razorpay' | 'cash_on_delivery' = isCod ? 'cash_on_delivery' : 'razorpay';

  // Online payments enjoy 100% FREE delivery (₹0). Flat ₹89 is only charged for COD.
  const shippingFee = (subtotal === 0 || !isCod) ? 0 : COD_SHIPPING_FEE;
  
  // Tax-inclusive pricing: Total is discountedSubtotal + shippingFee (GST is NOT added on top)
  const total = subtotal === 0 ? 0 : Number((discountedSubtotal + shippingFee).toFixed(2));

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
