/**
 * MUETY STORE — SERVER-SIDE RAZORPAY PAYMENT VERIFICATION TOOL
 * 
 * SECURITY DIRECTIVE:
 * In client SPA applications, the browser opens the Razorpay Modal with a PUBLIC Key ID.
 * Upon successful payment, Razorpay returns:
 *   - razorpay_order_id
 *   - razorpay_payment_id
 *   - razorpay_signature
 * 
 * To prevent client-side tampering (e.g. fraudulent clients forging paymentStatus = "paid"),
 * the server MUST verify the HMAC SHA-256 signature using the PRIVATE Razorpay Key Secret.
 * 
 * HMAC Formula:
 *   generated_signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
 *                               .update(order_id + '|' + payment_id)
 *                               .digest('hex');
 * 
 * Usage in production backend / serverless function (e.g. Firebase Cloud Function / Express API):
 */

import crypto from 'crypto';

export function verifyRazorpaySignature(payload) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, key_secret } = payload;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return {
      success: false,
      message: 'Missing required Razorpay payment response tokens.'
    };
  }

  const secret = key_secret || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return {
      success: false,
      message: 'Server Configuration Error: RAZORPAY_KEY_SECRET is not configured on the backend.'
    };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = expectedSignature === razorpay_signature;

  if (isValid) {
    return {
      success: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      message: 'Signature verified successfully. Payment is authentic.'
    };
  } else {
    return {
      success: false,
      message: 'Security Alert: Invalid Razorpay signature mismatch! Potential transaction forgery detected.'
    };
  }
}

// CLI Testing Runner
if (process.argv[1] && process.argv[1].endsWith('verifyRazorpaySignature.mjs')) {
  console.log('=== MUETY Store - Razorpay Server Signature Verification Module ===');
  console.log('✔ Razorpay Server Verification Module loaded successfully.');
}
