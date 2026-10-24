import { renderEmailLayout, escapeHtml } from './emailLayout';
import { OrderEmailData } from './orderConfirmationTemplate';

export function renderAdminOrderNotificationEmail(order: OrderEmailData, adminUrl?: string): { subject: string; html: string } {
  const isCod = order.paymentMethod === 'cash_on_delivery';
  const customerName = order.customerName || order.shippingAddress?.fullName || 'Guest Patron';
  const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const dashboardUrl = `${adminUrl || process.env.MUETY_STORE_URL || 'https://store.muety.in'}/admin/orders`;

  const itemsListHtml = (order.items || []).map((item, idx) => {
    const itemName = escapeHtml(item.product?.name || item.name || 'Bespoke Atelier Creation');
    const itemQty = item.quantity || 1;
    const itemPrice = Number(item.product?.price || item.price || 0);
    const sku = escapeHtml(item.product?.sku || `SKU-${idx + 1}`);
    const itemTotal = (itemPrice * itemQty).toLocaleString('en-IN');

    return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1ece1; font-size: 13px; color: #1c1917;">
          <strong>${itemName}</strong> <span style="color: #78716c;">(${sku})</span>
        </td>
        <td align="center" style="padding: 10px 0; border-bottom: 1px solid #f1ece1; font-size: 13px; color: #1c1917;">
          ${itemQty}
        </td>
        <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1ece1; font-size: 13px; font-weight: 600; color: #1c1917;">
          &#8377;${itemTotal}
        </td>
      </tr>
    `;
  }).join('');

  const addr = order.shippingAddress || {};
  const addrLine1 = escapeHtml(addr.addressLine1 || addr.street || '');
  const addrLine2 = escapeHtml(addr.addressLine2 || '');
  const cityStateZip = escapeHtml(`${addr.city || ''}${addr.city && addr.state ? ', ' : ''}${addr.state || ''} ${addr.postalCode || addr.pincode || ''}`.trim());
  const phone = escapeHtml(addr.phone || order.customerPhone || 'N/A');

  const bodyHtml = `
    <!-- Operational Badge -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
      <tr>
        <td>
          <span style="display: inline-block; background-color: #0f172a; color: #f8fafc; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 4px;">
            OPERATIONAL ALERT &bull; NEW ORDER DISPATCH
          </span>
          <h2 style="margin: 12px 0 6px 0; font-size: 22px; font-family: 'Cinzel', Georgia, serif; color: #090d16; font-weight: 700;">
            Order Placed: ${escapeHtml(order.orderNumber)}
          </h2>
          <p style="margin: 0; font-size: 13px; color: #475569;">
            Recorded on ${escapeHtml(orderDate)} &bull; Customer: <strong>${escapeHtml(customerName)}</strong> (${escapeHtml(order.customerEmail)})
          </p>
        </td>
      </tr>
    </table>

    <!-- Quick Ops Summary -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="33%" valign="top">
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Payment Mode</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                  ${isCod ? 'Cash on Delivery' : 'Prepaid (Razorpay)'}
                </div>
              </td>
              <td width="33%" valign="top">
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Payment Status</div>
                <div style="font-size: 14px; font-weight: 700; color: ${order.paymentStatus === 'paid' ? '#15803d' : '#b45309'}; margin-top: 2px; text-transform: uppercase;">
                  ${escapeHtml(order.paymentStatus)}
                </div>
              </td>
              <td width="33%" valign="top" align="right">
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Order Value</div>
                <div style="font-size: 16px; font-weight: 700; color: #c99a16; margin-top: 2px; font-family: 'Cinzel', Georgia, serif;">
                  &#8377;${Number(order.total).toLocaleString('en-IN')}
                </div>
              </td>
            </tr>
            ${isCod ? `
            <tr>
              <td colspan="3" style="padding-top: 10px; border-top: 1px dashed #cbd5e1; margin-top: 10px;">
                <div style="font-size: 12px; color: #92400e;">
                  <strong>COD Policy Notice:</strong> Advance of &#8377;${Number(order.codAdvanceAmount || 89).toLocaleString('en-IN')} paid online. Doorstep collection required: <strong>&#8377;${Number(order.codBalanceDue || 0).toLocaleString('en-IN')}</strong>.
                </div>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <!-- Items Manifest -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <thead>
        <tr>
          <th align="left" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Item / SKU</th>
          <th align="center" width="60" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Qty</th>
          <th align="right" width="100" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsListHtml}
      </tbody>
    </table>

    <!-- Fulfillment Shipping Info -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background-color: #faf7f2; border: 1px solid #e7ded0; border-radius: 8px; padding: 16px;">
      <tr>
        <td>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8c827a; margin-bottom: 6px;">Fulfillment Consignee &amp; Address</div>
          <div style="font-size: 14px; font-weight: 700; color: #1c1917;">${escapeHtml(addr.fullName || customerName)}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 2px; line-height: 1.4;">
            ${addrLine1}${addrLine2 ? `, ${addrLine2}` : ''}<br/>
            ${cityStateZip}<br/>
            Contact Phone: <strong>${phone}</strong>
          </div>
          ${order.trackingNumber ? `
          <div style="margin-top: 10px; font-size: 12px; color: #090d16;">
            Assigned Waybill: <span style="font-family: monospace; font-weight: 700;">${escapeHtml(order.trackingNumber)}</span>
          </div>` : ''}
        </td>
      </tr>
    </table>

    <!-- Action Link -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
      <tr>
        <td align="center">
          <a href="${dashboardUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #f8fafc; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; letter-spacing: 0.05em;">
            Open Executive Control Center &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailLayout({
    preheader: `[New Order ${order.orderNumber}] ${customerName} - Total: Rs ${order.total} (${order.paymentMethod})`,
    title: `[NEW ORDER] ${order.orderNumber}`,
    bodyHtml,
    isMarketing: false,
    storeUrl: adminUrl,
    supportEmail: 'orders@muety.in'
  });

  return {
    subject: `[Internal Order] ${order.orderNumber} — ${customerName} (₹${order.total})`,
    html
  };
}
