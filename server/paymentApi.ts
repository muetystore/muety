import crypto from 'crypto';

export interface VerifyPaymentPayload {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  orderId?: string;
  paymentId?: string;
  signature?: string;
}

export async function handleVerifyPayment(_authHeader: string | undefined, body: VerifyPaymentPayload) {
  const orderId = body?.razorpay_order_id || body?.razorpayOrderId || body?.orderId;
  const paymentId = body?.razorpay_payment_id || body?.razorpayPaymentId || body?.paymentId;
  const signature = body?.razorpay_signature || body?.razorpaySignature || body?.signature;

  if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
    throw new Error('INVALID_ARGUMENT: Missing required payment identifier (razorpay_payment_id).');
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('FAILED_PRECONDITION: Server Configuration Error: RAZORPAY_KEY_SECRET is not configured on the backend.');
  }

  // Cryptographic signature and order identifier are strictly mandatory
  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    throw new Error('INVALID_ARGUMENT: Missing required Razorpay order identifier (razorpay_order_id).');
  }

  if (!signature || typeof signature !== 'string' || !signature.trim()) {
    throw new Error('INVALID_ARGUMENT: Missing required Razorpay cryptographic signature (razorpay_signature).');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret.trim())
    .update(`${orderId.trim()}|${paymentId.trim()}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature.trim(), 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error('PERMISSION_DENIED: Security Alert: Invalid Razorpay signature mismatch! Potential transaction forgery detected.');
  }

  return {
    success: true,
    verified: true,
    orderId: orderId.trim(),
    paymentId: paymentId.trim(),
    message: 'Signature verified successfully. Payment is authentic.'
  };
}
