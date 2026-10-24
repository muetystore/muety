import { renderEmailLayout, escapeHtml } from './emailLayout';

export interface OrderEmailItem {
  name?: string;
  quantity: number;
  price: number;
  product?: {
    name?: string;
    images?: string[];
    price?: number;
    sku?: string;
  };
}

export interface OrderEmailData {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: {
    fullName?: string;
    addressLine1?: string;
    street?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    pincode?: string;
    phone?: string;
  };
  items: OrderEmailItem[];
  subtotal: number;
  discount?: number;
  appliedCoupon?: string | null;
  tax: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  codAdvanceAmount?: number;
  codBalanceDue?: number;
  orderStatus: string;
  trackingNumber?: string;
  createdAt: string;
}

export function renderOrderConfirmationEmail(order: OrderEmailData, storeUrl?: string): { subject: string; html: string } {
  const isCod = order.paymentMethod === 'cash_on_delivery';
  const customerName = order.customerName || order.shippingAddress?.fullName || 'Distinguished Patron';
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const trackingUrl = `${storeUrl || process.env.MUETY_STORE_URL || 'https://store.muety.in'}/orders`;

  const itemsHtml = (order.items || []).map(item => {
    const itemName = escapeHtml(item.product?.name || item.name || 'Bespoke Atelier Creation');
    const itemQty = item.quantity || 1;
    const itemPrice = Number(item.product?.price || item.price || 0);
    const itemTotal = (itemPrice * itemQty).toLocaleString('en-IN');
    const imageUrl = item.product?.images?.[0] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c';

    return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #f1ece1;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="70" valign="top" style="width: 70px;">
                <img src="${escapeHtml(imageUrl)}" alt="${itemName}" width="60" height="75" style="width: 60px; height: 75px; object-fit: cover; border-radius: 6px; border: 1px solid #e2d9cd;" />
              </td>
              <td valign="top" style="padding-left: 14px;">
                <div style="font-size: 15px; font-weight: 600; color: #1a1714; font-family: 'Cinzel', Georgia, serif; line-height: 1.3;">
                  ${itemName}
                </div>
                <div style="font-size: 13px; color: #78716c; margin-top: 4px;">
                  Qty: <span style="font-weight: 600; color: #292524;">${itemQty}</span> &times; &#8377;${itemPrice.toLocaleString('en-IN')}
                </div>
              </td>
              <td valign="top" align="right" style="font-size: 15px; font-weight: 600; color: #1c1917; white-space: nowrap;">
                &#8377;${itemTotal}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const addr = order.shippingAddress || {};
  const addrLine1 = escapeHtml(addr.addressLine1 || addr.street || '');
  const addrLine2 = escapeHtml(addr.addressLine2 || '');
  const cityStateZip = escapeHtml(`${addr.city || ''}${addr.city && addr.state ? ', ' : ''}${addr.state || ''} ${addr.postalCode || addr.pincode || ''}`.trim());
  const phone = escapeHtml(addr.phone || order.customerPhone || '');

  const bodyHtml = `
    <!-- Order Hero -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td>
          <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 20px;">
            Order Confirmed
          </span>
          <h1 style="margin: 12px 0 6px 0; font-size: 26px; font-family: 'Cinzel', Georgia, serif; color: #1a1714; font-weight: 700; letter-spacing: 0.02em;">
            Thank you for your order, ${escapeHtml(customerName)}.
          </h1>
          <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
            We have received your order and our atelier master weavers are preparing your handcrafted selections with utmost care.
          </p>
        </td>
      </tr>
    </table>

    <!-- Order Meta Card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf7f2; border: 1px solid #e7ded0; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" valign="top">
                <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8c827a;">Order Reference</div>
                <div style="font-size: 15px; font-weight: 700; color: #1a1714; margin-top: 2px; font-family: 'Cinzel', Georgia, serif;">${escapeHtml(order.orderNumber)}</div>
              </td>
              <td width="50%" valign="top" align="right">
                <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8c827a;">Date Placed</div>
                <div style="font-size: 14px; font-weight: 600; color: #1a1714; margin-top: 2px;">${escapeHtml(orderDate)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Line Items Section -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
      <tr>
        <td style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8c827a; padding-bottom: 8px; border-bottom: 2px solid #e7ded0;">
          Your Atelier Selections
        </td>
      </tr>
      ${itemsHtml}
    </table>

    <!-- Financial Breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background-color: #faf7f2; border: 1px solid #e7ded0; border-radius: 8px;">
      <tr>
        <td style="padding: 18px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size: 14px; color: #57534e; padding-bottom: 8px;">Subtotal</td>
              <td align="right" style="font-size: 14px; font-weight: 600; color: #1c1917; padding-bottom: 8px;">&#8377;${Number(order.subtotal).toLocaleString('en-IN')}</td>
            </tr>
            ${order.discount && order.discount > 0 ? `
            <tr>
              <td style="font-size: 14px; color: #15803d; padding-bottom: 8px;">
                Privilege Discount ${order.appliedCoupon ? `(${escapeHtml(order.appliedCoupon)})` : ''}
              </td>
              <td align="right" style="font-size: 14px; font-weight: 600; color: #15803d; padding-bottom: 8px;">
                -&#8377;${Number(order.discount).toLocaleString('en-IN')}
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="font-size: 14px; color: #57534e; padding-bottom: 8px;">Taxes (5% GST Inclusive)</td>
              <td align="right" style="font-size: 14px; font-weight: 600; color: #1c1917; padding-bottom: 8px;">&#8377;${Number(order.tax).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="font-size: 14px; color: #57534e; padding-bottom: 12px; border-bottom: 1px dashed #d6ccc2;">Shipping &amp; Handling</td>
              <td align="right" style="font-size: 14px; font-weight: 600; color: #1c1917; padding-bottom: 12px; border-bottom: 1px dashed #d6ccc2;">
                ${order.shippingFee === 0 ? '<span style="color: #15803d; font-weight: 700;">Complimentary (FREE)</span>' : `&#8377;${order.shippingFee}`}
              </td>
            </tr>
            <tr>
              <td style="font-size: 16px; font-weight: 700; color: #1a1714; padding-top: 12px; font-family: 'Cinzel', Georgia, serif;">Total Amount</td>
              <td align="right" style="font-size: 18px; font-weight: 700; color: #c99a16; padding-top: 12px; font-family: 'Cinzel', Georgia, serif;">&#8377;${Number(order.total).toLocaleString('en-IN')}</td>
            </tr>

            ${isCod ? `
            <tr>
              <td colspan="2" style="padding-top: 14px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 14px;">
                  <tr>
                    <td style="font-size: 13px; color: #92400e; font-weight: 600;">COD Advance Paid Online:</td>
                    <td align="right" style="font-size: 13px; color: #15803d; font-weight: 700;">&#8377;${Number(order.codAdvanceAmount || 89).toLocaleString('en-IN')} (Paid)</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #92400e; font-weight: 700; padding-top: 4px;">Balance Payable at Doorstep:</td>
                    <td align="right" style="font-size: 14px; color: #b45309; font-weight: 800; padding-top: 4px;">&#8377;${Number(order.codBalanceDue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ` : `
            <tr>
              <td colspan="2" style="padding-top: 10px;">
                <div style="font-size: 12px; color: #15803d; font-weight: 600; text-align: right;">
                  &#10003; 100% Fully Settled via Secure Online Payment
                </div>
              </td>
            </tr>
            `}
          </table>
        </td>
      </tr>
    </table>

    <!-- Shipping & Contact Details -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
      <tr>
        <td width="50%" valign="top" style="padding-right: 12px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8c827a; margin-bottom: 6px;">Delivery Destination</div>
          <div style="font-size: 14px; font-weight: 600; color: #1c1917;">${escapeHtml(addr.fullName || customerName)}</div>
          <div style="font-size: 13px; color: #57534e; line-height: 1.5; margin-top: 2px;">
            ${addrLine1}${addrLine2 ? `<br/>${addrLine2}` : ''}<br/>
            ${cityStateZip}
            ${phone ? `<br/>Phone: ${phone}` : ''}
          </div>
        </td>
        <td width="50%" valign="top" style="padding-left: 12px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8c827a; margin-bottom: 6px;">Payment Method</div>
          <div style="font-size: 14px; font-weight: 600; color: #1c1917;">
            ${isCod ? 'Cash on Delivery (Advance Verified)' : 'Prepaid Online (Razorpay Gateway)'}
          </div>
          <div style="font-size: 13px; color: #57534e; line-height: 1.5; margin-top: 4px;">
            Status: <span style="font-weight: 600; color: ${order.paymentStatus === 'paid' ? '#15803d' : '#b45309'}; text-transform: uppercase;">${escapeHtml(order.paymentStatus)}</span>
            ${order.trackingNumber ? `<br/>Tracking ID: <span style="font-family: monospace; font-size: 12px; color: #090d16; font-weight: 600;">${escapeHtml(order.trackingNumber)}</span>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- Call to Action Track Order -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
      <tr>
        <td align="center" style="padding: 10px 0 20px 0;">
          <a href="${trackingUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #090d16 0%, #1f293d 100%); color: #f4c430; font-family: 'Cinzel', Georgia, serif; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 14px 32px; border-radius: 4px; border: 1px solid #c99a16; text-decoration: none;">
            Track Your Consignment &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailLayout({
    preheader: `Your MUETY order ${order.orderNumber} has been confirmed. View order summary and tracking details.`,
    title: `Order Confirmed — ${order.orderNumber}`,
    bodyHtml,
    isMarketing: false,
    storeUrl,
    supportEmail: 'support@muety.in'
  });

  return {
    subject: `Order Confirmed: ${order.orderNumber} — MUETY Atelier`,
    html
  };
}
