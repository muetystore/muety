import { renderEmailLayout, escapeHtml } from './emailLayout';

export interface CampaignTemplateOptions {
  campaignTitle: string;
  headline: string;
  subheadline?: string;
  previewText?: string;
  heroImageUrl?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  featuredProducts?: Array<{
    name: string;
    description?: string;
    price: number;
    imageUrl: string;
    linkUrl: string;
  }>;
  unsubscribeUrl: string;
  storeUrl?: string;
}

export function renderPromotionalCampaign(options: CampaignTemplateOptions): string {
  const storeUrl = options.storeUrl || process.env.MUETY_STORE_URL || 'https://store.muety.in';
  const ctaLink = options.ctaUrl || storeUrl;
  const ctaLabel = options.ctaText || 'Explore Atelier Showcase';
  const heroImage = options.heroImageUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c';

  const productsHtml = (options.featuredProducts || []).map(p => {
    return `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #f1ece1;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="90" valign="top">
                <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" width="80" height="100" style="width: 80px; height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #e2d9cd;" />
              </td>
              <td valign="top" style="padding-left: 14px;">
                <div style="font-size: 15px; font-weight: 700; color: #1a1714; font-family: 'Cinzel', Georgia, serif; line-height: 1.3;">
                  ${escapeHtml(p.name)}
                </div>
                ${p.description ? `<div style="font-size: 13px; color: #64748b; margin-top: 4px;">${escapeHtml(p.description)}</div>` : ''}
                <div style="font-size: 14px; font-weight: 700; color: #c99a16; margin-top: 6px; font-family: 'Cinzel', Georgia, serif;">
                  &#8377;${Number(p.price).toLocaleString('en-IN')}
                </div>
              </td>
              <td width="80" valign="middle" align="right">
                <a href="${escapeHtml(p.linkUrl || storeUrl)}" target="_blank" style="display: inline-block; font-size: 12px; font-weight: 700; color: #0f172a; border: 1px solid #0f172a; padding: 6px 12px; border-radius: 4px; text-decoration: none;">
                  View &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const bodyHtml = `
    <!-- Hero Banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <img src="${escapeHtml(heroImage)}" alt="${escapeHtml(options.headline)}" width="560" style="width: 100%; max-width: 560px; height: auto; border-radius: 8px; border: 1px solid #e7ded0;" />
        </td>
      </tr>
    </table>

    <!-- Header Section -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <span style="display: inline-block; background-color: #faf7f2; border: 1px solid #dcd3c5; color: #8c827a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 4px 12px; border-radius: 20px;">
            Atelier Special Edition
          </span>
          <h1 style="margin: 14px 0 8px 0; font-size: 26px; font-family: 'Cinzel', Georgia, serif; color: #090d16; font-weight: 700; letter-spacing: 0.03em; line-height: 1.3;">
            ${escapeHtml(options.headline)}
          </h1>
          ${options.subheadline ? `
          <p style="margin: 0; font-size: 15px; color: #78716c; font-style: italic; font-family: Georgia, serif;">
            ${escapeHtml(options.subheadline)}
          </p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Main Editorial / Body Copy -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td style="font-size: 15px; line-height: 1.7; color: #334155; padding: 0 4px;">
          ${options.bodyContent}
        </td>
      </tr>
    </table>

    <!-- Featured Products if present -->
    ${options.featuredProducts && options.featuredProducts.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8c827a; padding-bottom: 8px; border-bottom: 2px solid #e7ded0;">
          Curated For You
        </td>
      </tr>
      ${productsHtml}
    </table>
    ` : ''}

    <!-- Call to Action -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(ctaLink)}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #090d16 0%, #1f293d 100%); color: #f4c430; font-family: 'Cinzel', Georgia, serif; font-size: 13px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 15px 36px; border-radius: 4px; border: 1px solid #c99a16; text-decoration: none;">
            ${escapeHtml(ctaLabel)} &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return renderEmailLayout({
    preheader: options.previewText || options.headline,
    title: options.campaignTitle,
    bodyHtml,
    isMarketing: true,
    unsubscribeUrl: options.unsubscribeUrl,
    storeUrl,
    supportEmail: 'support@muety.in'
  });
}
