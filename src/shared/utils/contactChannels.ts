import { ContactChannel, ContactChannelType, StoreSettings } from '@/shared/types';

export function computeChannelLink(type: ContactChannelType, value: string): string {
  const cleanVal = (value || '').trim();
  if (!cleanVal) return '';

  if (
    cleanVal.startsWith('http://') || 
    cleanVal.startsWith('https://') || 
    cleanVal.startsWith('mailto:') || 
    cleanVal.startsWith('tel:')
  ) {
    return cleanVal;
  }

  switch (type) {
    case 'phone': {
      const numOnly = cleanVal.replace(/[^0-9+]/g, '');
      const formatted = numOnly.startsWith('+') 
        ? numOnly 
        : (numOnly.length === 10 ? `+91${numOnly}` : `+${numOnly}`);
      return `tel:${formatted}`;
    }
    case 'whatsapp': {
      let numOnly = cleanVal.replace(/[^0-9]/g, '');
      if (numOnly.length === 10) numOnly = `91${numOnly}`;
      return `https://wa.me/${numOnly}`;
    }
    case 'email':
      return `mailto:${cleanVal}`;
    case 'instagram': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://instagram.com/${handle}`;
    }
    case 'facebook': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://facebook.com/${handle}`;
    }
    case 'youtube': {
      const handle = cleanVal.startsWith('@') ? cleanVal : `@${cleanVal}`;
      return `https://youtube.com/${handle}`;
    }
    case 'twitter': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://twitter.com/${handle}`;
    }
    case 'pinterest': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://pinterest.com/${handle}`;
    }
    case 'linkedin':
      return `https://linkedin.com/company/${cleanVal}`;
    case 'telegram': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://t.me/${handle}`;
    }
    case 'location':
      return `https://maps.google.com/?q=${encodeURIComponent(cleanVal)}`;
    case 'custom':
    default:
      return cleanVal.startsWith('www.') ? `https://${cleanVal}` : `https://${cleanVal}`;
  }
}

export function getDefaultContactChannels(settings?: Partial<StoreSettings>): ContactChannel[] {
  const contactPhone = settings?.contactPhone || '9385791540';
  const whatsappPhone = settings?.whatsappPhone || '9940668095';
  const contactEmail = settings?.contactEmail || 'support@muety.in';
  const ordersEmail = settings?.ordersEmail || 'orders@muety.in';
  const instagramHandle = settings?.instagramHandle || '@Themuety';
  const regAddress = settings?.registeredAddress;
  const addressText = regAddress
    ? `${regAddress.buildingNo} ${regAddress.street}, ${regAddress.city} – ${regAddress.postalCode}`
    : '2/32B Ramireddypatti, Palikadu, Salem – 636501';

  return [
    {
      id: 'channel-phone',
      name: 'Direct Phone Line',
      type: 'phone',
      value: contactPhone,
      link: computeChannelLink('phone', contactPhone),
      showInFooter: true,
      enabled: true,
      isPrimary: true,
      order: 1
    },
    {
      id: 'channel-whatsapp',
      name: 'WhatsApp Concierge Phone',
      type: 'whatsapp',
      value: whatsappPhone,
      link: computeChannelLink('whatsapp', whatsappPhone),
      showInFooter: true,
      enabled: true,
      isPrimary: true,
      order: 2
    },
    {
      id: 'channel-email-support',
      name: 'Customer Support Email',
      type: 'email',
      value: contactEmail,
      link: computeChannelLink('email', contactEmail),
      showInFooter: true,
      enabled: true,
      isPrimary: true,
      order: 3
    },
    {
      id: 'channel-email-orders',
      name: 'Orders Dispatch Email',
      type: 'email',
      value: ordersEmail,
      link: computeChannelLink('email', ordersEmail),
      showInFooter: false,
      enabled: true,
      isPrimary: true,
      order: 4
    },
    {
      id: 'channel-instagram',
      name: 'Instagram Handle',
      type: 'instagram',
      value: instagramHandle,
      link: computeChannelLink('instagram', instagramHandle),
      showInFooter: true,
      enabled: true,
      isPrimary: true,
      order: 5
    },
    {
      id: 'channel-location',
      name: 'Registered Atelier Studio',
      type: 'location',
      value: addressText,
      link: computeChannelLink('location', addressText),
      showInFooter: true,
      enabled: true,
      isPrimary: true,
      order: 6
    }
  ];
}

export function ensureContactChannels(settings: StoreSettings): StoreSettings {
  if (!settings.contactChannels || !Array.isArray(settings.contactChannels) || settings.contactChannels.length === 0) {
    return {
      ...settings,
      contactChannels: getDefaultContactChannels(settings)
    };
  }
  return settings;
}
