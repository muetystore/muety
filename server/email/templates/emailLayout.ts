export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailLayoutOptions {
  preheader?: string;
  title?: string;
  bodyHtml: string;
  isMarketing?: boolean;
  unsubscribeUrl?: string;
  storeUrl?: string;
  supportEmail?: string;
}

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const storeUrl = options.storeUrl || process.env.MUETY_STORE_URL || 'https://store.muety.in';
  const supportEmail = options.supportEmail || 'support@muety.in';
  const preheaderText = options.preheader ? escapeHtml(options.preheader) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title || 'MUETY Atelier')}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { color: #c99a16; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .stack-column { display: block !important; width: 100% !important; direction: ltr !important; }
      .mobile-padding { padding: 18px !important; }
      .mobile-text-center { text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1ea;">
  ${preheaderText ? `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">${preheaderText}</div>` : ''}
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f1ea; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e7e2dc;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #10182d 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #c99a16;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${storeUrl}" target="_blank" style="text-decoration: none;">
                      <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #ffffff; display: block;">MUETY</span>
                      <span style="font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #c99a16; text-transform: uppercase; margin-top: 4px; display: block;">SAREES &bull; PURE HANDLOOM ATELIER</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dynamic Body Content -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 32px;">
              ${options.bodyHtml}
            </td>
          </tr>

          <!-- Brand & Legal Footer -->
          <tr>
            <td style="background-color: #faf8f5; border-top: 1px solid #ece6dc; padding: 28px 24px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #10182d;">
                MUETY &bull; Authentic Salem & Kanchipuram Handlooms
              </p>
              <p style="margin: 0 0 12px 0; color: #64748b; font-size: 12px;">
                2/32B, Ramireddypatti, Palikadu, Salem, Tamil Nadu, 636501, India<br>
                GSTIN: 33HFCPR2838F2ZD &bull; Patron Care: <a href="mailto:${supportEmail}" style="color: #c99a16; font-weight: 600;">${supportEmail}</a>
              </p>
              
              ${options.isMarketing && options.unsubscribeUrl ? `
                <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
                  You received this reflection because you opted into the MUETY Patron Circle.<br>
                  To withdraw marketing consent immediately: 
                  <a href="${options.unsubscribeUrl}" target="_blank" style="color: #64748b; text-decoration: underline; font-weight: 600;">Unsubscribe from Promotional Emails</a>.
                </div>
              ` : `
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
                  This is an authoritative transactional order record sent to your registered address.
                </div>
              `}

              <p style="margin: 12px 0 0 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} MUETY. All rights reserved. Handcrafted in India.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
