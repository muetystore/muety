import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_ORIGINS = [
  'https://admin.muety.in',
  'https://www.admin.muety.in',
  'https://store.muety.in',
  'https://www.store.muety.in',
  'https://muety.in',
  'https://www.muety.in',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173'
];

function getCorsHeaders(origin) {
  const allowedOrigin = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.muety.in') || origin.endsWith('.firebaseapp.com') || origin.endsWith('.web.app'))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, *',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

let firebaseAdminApp = null;

function getAdminApp() {
  if (firebaseAdminApp) return firebaseAdminApp;

  const activeApps = getApps();
  if (activeApps.length > 0) {
    firebaseAdminApp = activeApps[0];
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'muetystore-fdad2';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    return firebaseAdminApp;
  } catch (err) {
    console.error('[OrdersAPI Netlify] Firebase Admin initialization error:', err?.message || err);
    return null;
  }
}

function getAdminDb() {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch {
    return null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPatronOrderConfirmationEmail(order, storeUrl) {
  const customerName = escapeHtml(order.customerName || order.shippingAddress?.fullName || 'Distinguished Patron');
  const orderNumber = escapeHtml(order.orderNumber || order.id);
  const total = Number(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const paymentMethod = (order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment (Prepaid)').toUpperCase();
  const trackingNumber = escapeHtml(order.trackingNumber || 'PENDING');
  const trackingCarrier = escapeHtml(order.trackingCarrier || 'MUETY Global Express');
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const itemsHtml = (order.items || []).map((item, idx) => {
    const p = item.product || {};
    const name = escapeHtml(p.name || p.title || item.name || `Item #${idx + 1}`);
    const sku = escapeHtml(p.sku || item.sku || `MUETY-${idx + 1}`);
    const qty = Number(item.quantity || 1);
    const price = Number(p.price || item.price || 0).toLocaleString('en-IN');
    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b;">
          <strong>${name}</strong><br />
          <span style="font-size: 12px; color: #64748b;">SKU: ${sku}</span>
        </td>
        <td align="center" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b;">
          ${qty}
        </td>
        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600; color: #0f172a;">
          &#8377;${price}
        </td>
      </tr>
    `;
  }).join('');

  const addr = order.shippingAddress || {};
  const addrText = escapeHtml([
    addr.fullName,
    addr.streetAddress || addr.addressLine1 || addr.street,
    addr.city,
    addr.state,
    addr.postalCode || addr.pincode,
    addr.country || 'India'
  ].filter(Boolean).join(', '));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmed: ${orderNumber} — MUETY Atelier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Atelier Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #10182d 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #d4af37;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 4px; font-weight: 800;">MUETY</h1>
              <p style="color: #d4af37; margin: 6px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Authentic Kanchipuram Sarees & Ethnic Luxury</p>
            </td>
          </tr>

          <!-- Confirmation Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #f0fdf4; color: #16a34a; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; border: 1px solid #bbf7d0; letter-spacing: 0.5px;">
                  ✓ ORDER CONFIRMED &amp; IN PREPARATION
                </span>
                <h2 style="color: #0f172a; margin: 16px 0 8px; font-size: 22px; font-weight: 700;">Thank You for Your Patronage</h2>
                <p style="color: #64748b; margin: 0; font-size: 14px;">Order <strong>#${orderNumber}</strong> placed on ${orderDate}</p>
              </div>

              <p style="font-size: 15px; color: #334155; line-height: 1.6;">
                Dear <strong>${customerName}</strong>,<br /><br />
                We are delighted to confirm your order. Your bespoke piece is now being curated with utmost care by our atelier master artisans.
              </p>

              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0;">
                    <th align="left" style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                    <th align="center" style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                    <th align="right" style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Totals Breakdown -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 14px; color: #475569;">Subtotal:</td>
                  <td align="right" style="padding: 6px 12px; font-size: 14px; color: #0f172a;">&#8377;${Number(order.subtotal || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 14px; color: #475569;">GST (5%):</td>
                  <td align="right" style="padding: 6px 12px; font-size: 14px; color: #0f172a;">&#8377;${Number(order.tax || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 14px; color: #475569;">Courier Delivery:</td>
                  <td align="right" style="padding: 6px 12px; font-size: 14px; color: #16a34a; font-weight: 600;">${order.shippingFee === 0 ? 'FREE' : `&#8377;${order.shippingFee}`}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 10px 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Total:</td>
                  <td align="right" style="padding: 10px 12px; font-size: 18px; font-weight: 800; color: #d4af37;">&#8377;${total}</td>
                </tr>
              </table>

              <!-- Shipping & Delivery Details -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">Delivery Destination</h4>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;">${addrText}</p>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                  Carrier: <strong>${trackingCarrier}</strong> &bull; Tracking: <strong>${trackingNumber}</strong>
                </p>
              </div>

              <!-- Action Link -->
              <div style="text-align: center; margin: 32px 0 16px;">
                <a href="${storeUrl}/account" style="background-color: #090d16; color: #d4af37; padding: 14px 28px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; border-radius: 6px; display: inline-block;">
                  Track Order in Account &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Atelier Footer -->
          <tr>
            <td style="background-color: #090d16; padding: 24px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px 0;">
                MUETY Atelier Concierge &bull; support@muety.in &bull; orders@muety.in
              </p>
              <p style="color: #64748b; font-size: 11px; margin: 0;">
                © 2026 MUETY • Authentic Kanchipuram Silk Sarees • GSTIN: 33HFCPR2838F2ZD
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `Order Confirmed: #${orderNumber} — MUETY Atelier`,
    html
  };
}

function renderAdminOrderNotificationEmail(order) {
  const customerName = escapeHtml(order.customerName || order.shippingAddress?.fullName || 'Patron');
  const customerEmail = escapeHtml(order.customerEmail || '');
  const customerPhone = escapeHtml(order.customerPhone || order.shippingAddress?.phone || 'N/A');
  const orderNumber = escapeHtml(order.orderNumber || order.id);
  const total = Number(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const paymentMethod = (order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery (COD)' : 'Prepaid (Razorpay)').toUpperCase();
  const paymentStatus = (order.paymentStatus || 'paid').toUpperCase();
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const addr = order.shippingAddress || {};
  const addrText = escapeHtml([
    addr.fullName,
    addr.streetAddress || addr.addressLine1 || addr.street,
    addr.city,
    addr.state,
    addr.postalCode || addr.pincode,
    addr.country || 'India'
  ].filter(Boolean).join(', '));

  const itemsHtml = (order.items || []).map((item, idx) => {
    const p = item.product || {};
    const name = escapeHtml(p.name || p.title || item.name || `Item #${idx + 1}`);
    const sku = escapeHtml(p.sku || item.sku || `SKU-${idx + 1}`);
    const qty = Number(item.quantity || 1);
    const price = Number(p.price || item.price || 0).toLocaleString('en-IN');
    return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b;">
          <strong>${name}</strong> <span style="color: #64748b;">(${sku})</span>
        </td>
        <td align="center" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${qty}</td>
        <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600;">&#8377;${price}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>[NEW ORDER] #${orderNumber} — ₹${total}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; padding: 28px;">
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
      <span style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; letter-spacing: 1px;">
        OPERATIONAL ALERT
      </span>
      <h2 style="margin: 12px 0 4px; color: #0f172a; font-size: 20px;">New Order Placed: #${orderNumber}</h2>
      <p style="margin: 0; font-size: 13px; color: #64748b;">Received on ${orderDate}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #64748b; width: 140px;">Customer:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${customerName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Email:</td>
        <td style="padding: 6px 0;"><a href="mailto:${customerEmail}" style="color: #2563eb;">${customerEmail}</a></td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Phone:</td>
        <td style="padding: 6px 0;">${customerPhone}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Payment:</td>
        <td style="padding: 6px 0;"><strong>${paymentMethod}</strong> (${paymentStatus})</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Total Value:</td>
        <td style="padding: 6px 0; font-size: 16px; font-weight: 800; color: #0f172a;">&#8377;${total}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Shipping Address:</td>
        <td style="padding: 6px 0; color: #334155;">${addrText}</td>
      </tr>
    </table>

    <h4 style="margin: 20px 0 8px; font-size: 13px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">Ordered Items</h4>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <thead>
        <tr style="border-bottom: 1px solid #cbd5e1; font-size: 12px; color: #64748b;">
          <th align="left" style="padding: 6px 0;">Product</th>
          <th align="center" style="padding: 6px 0;">Qty</th>
          <th align="right" style="padding: 6px 0;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
      <a href="https://admin.muety.in/orders" style="background: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
        Open Order in Admin ERP &rarr;
      </a>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: `[NEW ORDER] #${orderNumber} — ₹${total} from ${customerName}`,
    html
  };
}

async function sendEmailViaResend(apiKey, from, to, subject, html, idempotencyKey) {
  const toList = Array.isArray(to) ? to : [to];
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from,
      to: toList,
      subject,
      html
    })
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.id) {
    return { success: true, messageId: data.id };
  }
  return {
    success: false,
    error: data?.message || data?.error || `HTTP ${res.status}`,
    statusCode: res.status
  };
}

async function dispatchOrderConfirmationEmails(order) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[OrdersAPI Netlify] RESEND_API_KEY is not defined in environment.');
    return { success: false, error: 'RESEND_API_KEY missing' };
  }

  const fromSender = process.env.RESEND_ORDERS_FROM_EMAIL || 'MUETY Orders <orders@muety.in>';
  const storeUrl = process.env.STORE_URL || process.env.MUETY_STORE_URL || 'https://store.muety.in';
  const adminRecipient = process.env.CENTRAL_ORDERS_RECIPIENT || 'orders@muety.in';
  const db = getAdminDb();

  const results = {
    patronNotified: false,
    adminNotified: false,
    errors: []
  };

  // 1. Patron Confirmation (with idempotency guard in Firestore)
  const patronJobId = `order_${order.id}_patron`;
  let patronAlreadySent = false;
  if (db) {
    try {
      const jobDoc = await db.collection('emailTransactionalJobs').doc(patronJobId).get();
      if (jobDoc.exists && jobDoc.data()?.status === 'sent') {
        patronAlreadySent = true;
      }
    } catch {}
  }

  if (patronAlreadySent) {
    console.log(`[OrdersAPI Netlify] Patron email already sent for order ${order.orderNumber}, skipping.`);
    results.patronNotified = true;
  } else if (order.customerEmail) {
    try {
      const { subject, html } = renderPatronOrderConfirmationEmail(order, storeUrl);
      const sendRes = await sendEmailViaResend(apiKey, fromSender, order.customerEmail, subject, html, patronJobId);
      if (sendRes.success) {
        results.patronNotified = true;
        if (db) {
          await db.collection('emailTransactionalJobs').doc(patronJobId).set({
            jobId: patronJobId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            recipient: order.customerEmail,
            type: 'patron_confirmation',
            status: 'sent',
            messageId: sendRes.messageId,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
      } else {
        results.errors.push(`Patron email error: ${sendRes.error}`);
      }
    } catch (err) {
      results.errors.push(`Patron email exception: ${err.message}`);
    }
  }

  // 2. Admin Operational Notification (with idempotency guard)
  const adminJobId = `order_${order.id}_admin`;
  let adminAlreadySent = false;
  if (db) {
    try {
      const jobDoc = await db.collection('emailTransactionalJobs').doc(adminJobId).get();
      if (jobDoc.exists && jobDoc.data()?.status === 'sent') {
        adminAlreadySent = true;
      }
    } catch {}
  }

  if (adminAlreadySent) {
    console.log(`[OrdersAPI Netlify] Admin notification already sent for order ${order.orderNumber}, skipping.`);
    results.adminNotified = true;
  } else {
    try {
      const { subject, html } = renderAdminOrderNotificationEmail(order);
      const adminRecipients = Array.from(new Set([adminRecipient, 'management@muety.in'].filter(Boolean)));
      const sendRes = await sendEmailViaResend(apiKey, fromSender, adminRecipients, subject, html, adminJobId);
      if (sendRes.success) {
        results.adminNotified = true;
        if (db) {
          await db.collection('emailTransactionalJobs').doc(adminJobId).set({
            jobId: adminJobId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            recipients: adminRecipients,
            type: 'admin_notification',
            status: 'sent',
            messageId: sendRes.messageId,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
      } else {
        results.errors.push(`Admin email error: ${sendRes.error}`);
      }
    } catch (err) {
      results.errors.push(`Admin email exception: ${err.message}`);
    }
  }

  return {
    success: results.patronNotified || results.adminNotified,
    ...results
  };
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  let body = {};
  if (event.body) {
    try {
      const rawText = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      body = JSON.parse(rawText || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Malformed JSON payload.' })
      };
    }
  }

  const rawPath = (
    event.headers?.['x-original-url'] ||
    event.headers?.['x-forwarded-uri'] ||
    event.path ||
    event.rawUrl ||
    ''
  ).toLowerCase();

  const action = (body.action || '').toLowerCase();

  // --------------------------------------------------------------------------
  // ACTION 1: DISPATCH / RETRY ORDER CONFIRMATION EMAILS
  // --------------------------------------------------------------------------
  if (
    action === 'send_confirmation' ||
    action === 'send-confirmation' ||
    rawPath.endsWith('/send-confirmation') ||
    rawPath.includes('/orders/send-confirmation')
  ) {
    const orderId = body.orderId || body.order?.id;
    let orderData = body.order;

    if (!orderData && orderId) {
      const db = getAdminDb();
      if (db) {
        try {
          const docSnap = await db.collection('orders').doc(orderId).get();
          if (docSnap.exists) {
            orderData = docSnap.data();
          }
        } catch (dbErr) {
          console.warn('[OrdersAPI Netlify] Firestore lookup error:', dbErr?.message);
        }
      }
    }

    if (!orderData) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Order not found for confirmation dispatch.' })
      };
    }

    const emailResult = await dispatchOrderConfirmationEmails(orderData);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        ...emailResult
      })
    };
  }

  // --------------------------------------------------------------------------
  // ACTION 2: CREATE ORDER SERVER-SIDE & DISPATCH EMAILS
  // --------------------------------------------------------------------------
  if (
    action === 'create' ||
    action === 'create_order' ||
    rawPath.endsWith('/create') ||
    rawPath.includes('/orders/create')
  ) {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      couponCode,
      paymentMethod,
      razorpayPaymentId,
      notes
    } = body;

    if (!customerEmail || !customerName || !shippingAddress) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: { message: 'Missing required customer or shipping details.' }
        })
      };
    }

    if (!Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: { message: 'Order must contain at least one item.' }
        })
      };
    }

    const db = getAdminDb();
    const isCod = paymentMethod === 'cash_on_delivery';
    const shippingFee = isCod ? 89 : 0;
    const now = new Date().toISOString();
    const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const orderNumber = `MT-${Math.floor(100000 + Math.random() * 900000)}`;

    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const rawItem of items) {
      const qty = Math.max(1, Math.floor(Number(rawItem.quantity) || 1));
      let price = Number(rawItem.product?.price || rawItem.price) || 0;
      let sku = rawItem.product?.sku || rawItem.sku || '';

      // If db is accessible, verify price from canonical product doc
      if (db && rawItem.productId) {
        try {
          const prodSnap = await db.collection('products').doc(rawItem.productId).get();
          if (prodSnap.exists) {
            const pData = prodSnap.data();
            price = Number(pData.price) || price;
            sku = pData.sku || sku;
          }
        } catch {}
      }

      calculatedSubtotal += price * qty;
      validatedItems.push({
        ...rawItem,
        quantity: qty,
        price,
        product: {
          ...(rawItem.product || {}),
          price,
          sku: sku || `MUETY-SR-${String(rawItem.productId || '01').slice(-4).toUpperCase()}`
        }
      });
    }

    const calculatedTax = Math.round(calculatedSubtotal * 0.05 * 100) / 100;
    const calculatedGrandTotal = Number((calculatedSubtotal + calculatedTax + shippingFee).toFixed(2));
    const codAdvanceAmount = isCod ? Math.min(89, calculatedGrandTotal) : 0;
    const codBalanceDue = isCod ? Number(Math.max(0, calculatedGrandTotal - codAdvanceAmount).toFixed(2)) : 0;

    const orderPayload = {
      id: orderId,
      orderNumber,
      customerId: customerId || `guest-${Date.now()}`,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      shippingAddress,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount: 0,
      appliedCoupon: couponCode || null,
      tax: calculatedTax,
      shippingFee,
      total: calculatedGrandTotal,
      paymentMethod: isCod ? 'cash_on_delivery' : 'razorpay',
      paymentStatus: isCod ? 'pending' : 'paid',
      codAdvanceAmount,
      codBalanceDue,
      orderStatus: 'pending',
      trackingNumber: `MUET-EXP-${Math.floor(10000000 + Math.random() * 90000000)}`,
      trackingCarrier: 'MUETY Global Express',
      timeline: [
        {
          status: 'pending',
          label: isCod ? 'COD Order Confirmed (Advance Paid)' : 'Order Confirmed',
          timestamp: new Date().toLocaleString(),
          description: isCod
            ? `Order accepted with ₹89 advance paid online. Balance ₹${codBalanceDue} due upon delivery.`
            : `Payment authorized and order accepted.`
        }
      ],
      razorpayPaymentId: razorpayPaymentId || null,
      notes: notes || '',
      createdAt: now,
      updatedAt: now
    };

    if (db) {
      try {
        await db.collection('orders').doc(orderId).set(orderPayload);
      } catch (saveErr) {
        console.error('[OrdersAPI Netlify] Firestore write error:', saveErr?.message);
      }
    }

    // Trigger automated order email notifications in the background
    dispatchOrderConfirmationEmails(orderPayload).catch(emailErr => {
      console.error('[OrdersAPI Netlify] Background email error:', emailErr);
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        order: orderPayload,
        message: `Order ${orderNumber} created successfully.`
      })
    };
  }

  // Fallback for unknown action
  return {
    statusCode: 400,
    headers: corsHeaders,
    body: JSON.stringify({
      success: false,
      error: 'Invalid order action. Supported: /api/orders/create, /api/orders/send-confirmation'
    })
  };
}
