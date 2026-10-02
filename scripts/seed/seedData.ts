import { Product, Category } from '../../src/features/catalog/types';
import { Coupon } from '../../src/features/coupons/types';
import { Order } from '../../src/features/orders/types';
import { PatronReview } from '../../src/features/reviews/types';
import { StoreSettings, UserProfile } from '../../src/shared/types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-sarees',
    name: 'Festive Silk Sarees',
    slug: 'sarees',
    description: 'Handwoven pure Kanchipuram & Banarasi mulberry silk sarees with authentic 24K gold zari borders.',
    image: '/saree_model_individual.jpg',
    itemCount: 6,
    featured: true
  },
  {
    id: 'cat-timepieces',
    name: 'Timepieces',
    slug: 'timepieces',
    description: 'Precision mechanical & minimalist automatic luxury watches crafted with sapphire crystal and surgical stainless steel.',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80',
    itemCount: 4,
    featured: true
  },
  {
    id: 'cat-leather-goods',
    name: 'Leather Goods',
    slug: 'leather-goods',
    description: 'Full-grain Italian leather bags, handcrafted wallets, and travel accessories tailored for timeless elegance.',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80',
    itemCount: 5,
    featured: true
  },
  {
    id: 'cat-apparel',
    name: 'Luxury Apparel',
    slug: 'apparel',
    description: 'Organic cashmere knitwear, tailored jackets, and architectural minimalism designed for modern sophistication.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
    itemCount: 4,
    featured: true
  },
  {
    id: 'cat-eyewear',
    name: 'Designer Eyewear',
    slug: 'eyewear',
    description: 'Hand-polished Japanese acetate and ultralight titanium frames with polarized UV400 lenses.',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
    itemCount: 3,
    featured: true
  },
  {
    id: 'cat-fragrance',
    name: 'Artisan Fragrance',
    slug: 'fragrance',
    description: 'Bespoke unisex perfumes, botanical diffusers, and luxury hand-poured soy candles.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80',
    itemCount: 3,
    featured: false
  },
  {
    id: 'cat-audio',
    name: 'Acoustic Audio',
    slug: 'audio',
    description: 'Audiophile grade wireless headphones and bespoke aluminum sound systems.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    itemCount: 3,
    featured: false
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'muety-saree-01',
    name: 'MUETY Royal Kanchipuram Pure Silk Saree',
    slug: 'royal-kanchipuram-pure-silk-saree',
    shortDescription: 'Handwoven pure mulberry silk in cream with royal emerald green & 24K gold zari elephant border.',
    description: 'A masterpiece of royal Indian handloom heritage. Handwoven with 100% pure mulberry silk in regal ivory cream, paired with a rich emerald green Korvai border and pallu intricately woven with gold zari elephant and peacock motifs. Includes matching unstitched pure silk blouse piece.',
    price: 480,
    originalPrice: 650,
    discountPercentage: 26,
    rating: 5.0,
    reviewCount: 42,
    stock: 12,
    sku: 'MUETY-S-001',
    category: 'Festive Silk Sarees',
    categorySlug: 'sarees',
    images: [
      '/saree_model_individual.jpg',
      '/saree_fabric_detail.jpg',
      '/saree_model_drape.jpg'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: true,
    tags: ['Pure Silk', 'Kanchipuram', 'Gold Zari', 'Diwali Special', 'Festive Heritage', 'Handloom'],
    specifications: {
      'Fabric': '100% Pure Mulberry Silk (Silk Mark Certified)',
      'Zari': 'Gold Thread Zari Weave',
      'Border Detail': 'Emerald Green Korvai Elephant & Peacock Border',
      'Length': '6.2 Meters (Includes 0.8M Unstitched Blouse)',
      'Weave Technique': 'Handloom Interlocking Korvai',
      'Care': 'Dry Clean Only • Store in Pure Muslin Bag'
    },
    colors: ['Regal Cream & Emerald Green', 'Gold Accents'],
    reviews: [
      {
        id: 'rev-saree-1',
        productId: 'muety-saree-01',
        userId: 'user-02',
        userName: 'Meenakshi Sundaram',
        rating: 5,
        title: 'Authentic royal silk and breathtaking zari',
        comment: 'The quality of the silk is extraordinarily soft yet heavy with pure gold luster. The emerald green elephant border is magnificent for Diwali celebrations.',
        verifiedPurchase: true,
        createdAt: '2026-08-12'
      }
    ],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-20'
  },
  {
    id: 'muety-watch-01',
    name: 'MUETY Chrono Horizon Sapphire Watch',
    slug: 'chrono-horizon-sapphire-watch',
    shortDescription: 'Minimalist automatic chronograph with double-domed sapphire crystal and Italian calfskin strap.',
    description: 'The MUETY Chrono Horizon represents the pinnacle of contemporary horology. Featuring a custom Japanese automatic movement with 42-hour power reserve, 316L aerospace-grade stainless steel case, and anti-reflective sapphire crystal. Designed for the discerning individual who appreciates subtle mastery.',
    price: 495,
    originalPrice: 620,
    discountPercentage: 20,
    rating: 4.9,
    reviewCount: 48,
    stock: 15,
    sku: 'MUETY-W-001',
    category: 'Timepieces',
    categorySlug: 'timepieces',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: true,
    tags: ['Luxury', 'Automatic', 'Water Resistant 50M', 'Sapphire'],
    specifications: {
      'Case Diameter': '40mm',
      'Case Material': '316L Stainless Steel',
      'Movement': 'Automatic Caliber 8215',
      'Glass': 'Double-Domed Sapphire',
      'Water Resistance': '5 ATM / 50 Meters',
      'Strap Width': '20mm Genuine Italian Leather'
    },
    colors: ['Obsidian Black', 'Champagne Gold', 'Brushed Silver'],
    reviews: [
      {
        id: 'rev-1',
        productId: 'muety-watch-01',
        userId: 'user-01',
        userName: 'Alexander Vance',
        rating: 5,
        title: 'Unbelievable craftsmanship',
        comment: 'The weight, balance, and finishing on this watch surpass Swiss timepieces twice the price. The gold accents gleam beautifully.',
        verifiedPurchase: true,
        createdAt: '2026-07-14'
      }
    ],
    createdAt: '2026-06-01',
    updatedAt: '2026-08-01'
  },
  {
    id: 'muety-bag-01',
    name: 'MUETY Grand Veloce Leather Weekender',
    slug: 'grand-veloce-leather-weekender',
    shortDescription: 'Handcrafted full-grain vegetable tanned Tuscan leather duffle with solid brass hardware.',
    description: 'Constructed from vegetable-tanned Tuscan leather that patinas gracefully over time. Features a dedicated padded 16-inch laptop compartment, water-resistant interior lining, reinforced base with protective metal feet, and a detachable padded shoulder strap.',
    price: 680,
    originalPrice: 790,
    discountPercentage: 14,
    rating: 4.8,
    reviewCount: 36,
    stock: 8,
    sku: 'MUETY-L-002',
    category: 'Leather Goods',
    categorySlug: 'leather-goods',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: true,
    isNewArrival: false,
    isBestSeller: true,
    tags: ['Leather', 'Travel', 'Handmade', 'Tuscan'],
    specifications: {
      'Dimensions': '52cm x 28cm x 26cm',
      'Material': 'Full-Grain Italian Calfskin',
      'Hardware': 'Antiqued Solid Brass',
      'Lining': 'Organic Herringbone Cotton',
      'Capacity': '42 Liters'
    },
    colors: ['Cognac Brown', 'Midnight Black', 'Rich Walnut'],
    createdAt: '2026-05-15',
    updatedAt: '2026-08-10'
  },
  {
    id: 'muety-eyewear-01',
    name: 'MUETY Solstice Titanium Sunglasses',
    slug: 'solstice-titanium-sunglasses',
    shortDescription: 'Japanese beta-titanium aviator frames with polarized gradient amber lenses.',
    description: 'Weighing a mere 18 grams, the MUETY Solstice combines featherlight aerospace titanium with custom-tinted Carl Zeiss CR-39 polarized lenses. Engineered with signature micro-hinges for indestructible daily resilience.',
    price: 320,
    rating: 4.9,
    reviewCount: 29,
    stock: 22,
    sku: 'MUETY-E-003',
    category: 'Designer Eyewear',
    categorySlug: 'eyewear',
    images: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: true,
    isNewArrival: true,
    tags: ['Titanium', 'Zeiss Lenses', 'Polarized', 'Ultralight'],
    specifications: {
      'Frame': 'Japanese Beta-Titanium',
      'Lens': 'Zeiss Polarized UV400 Cat 3',
      'Weight': '18.4 grams',
      'Bridge Width': '16mm'
    },
    colors: ['Champagne Gold / Amber', 'Matte Black / Smoke', 'Platinum / Slate'],
    createdAt: '2026-06-20',
    updatedAt: '2026-08-12'
  },
  {
    id: 'muety-apparel-01',
    name: 'MUETY Pure Mongolian Cashmere Overcoat',
    slug: 'pure-mongolian-cashmere-overcoat',
    shortDescription: 'Double-faced 100% Grade-A Mongolian cashmere coat with tailored silhouette.',
    description: 'An enduring investment in timeless tailored warmth. Hand-stitched seams, horn button closures, and a fluid silhouette tailored to effortlessly layer over formal attire or casual cashmere knitwear.',
    price: 890,
    originalPrice: 1100,
    discountPercentage: 19,
    rating: 5.0,
    reviewCount: 19,
    stock: 6,
    sku: 'MUETY-A-004',
    category: 'Luxury Apparel',
    categorySlug: 'apparel',
    images: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: true,
    isNewArrival: true,
    tags: ['Cashmere', 'Handmade', 'Winter Collection', 'Tailored'],
    specifications: {
      'Fabric': '100% Grade-A Mongolian Cashmere (520 GSM)',
      'Buttons': 'Real Italian Buffalo Horn',
      'Care': 'Specialist Dry Clean Only',
      'Origin': 'Made in Florence, Italy'
    },
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Camel Beige', 'Charcoal Slate', 'Deep Black'],
    createdAt: '2026-07-01',
    updatedAt: '2026-08-18'
  },
  {
    id: 'muety-audio-01',
    name: 'MUETY Acoustic Master Wireless Headphones',
    slug: 'acoustic-master-wireless-headphones',
    shortDescription: 'Custom 45mm beryllium drivers with active hybrid noise cancellation and lambskin ear cushions.',
    description: 'Immerse in studio-grade acoustics. The MUETY Acoustic Master pairs custom beryllium drivers with advanced dual-chip hybrid active noise cancellation, lossless high-res Bluetooth 5.3 audio, and 40 hours of playtime.',
    price: 450,
    rating: 4.9,
    reviewCount: 54,
    stock: 18,
    sku: 'MUETY-AU-005',
    category: 'Acoustic Audio',
    categorySlug: 'audio',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: true,
    isBestSeller: true,
    tags: ['High-Res Audio', 'ANC', '40hr Battery', 'Beryllium'],
    specifications: {
      'Driver Size': '45mm Beryllium Diaphragm',
      'Battery Life': '40 Hours (ANC On)',
      'Bluetooth': 'v5.3 with LDAC & aptX HD',
      'Weight': '265g'
    },
    colors: ['Obsidian Black & Gold', 'Silver & Frost White'],
    createdAt: '2026-06-10',
    updatedAt: '2026-08-15'
  },
  {
    id: 'muety-fragrance-01',
    name: 'MUETY Noir Santal Extrait de Parfum (100ml)',
    slug: 'noir-santal-extrait-de-parfum',
    shortDescription: 'Concentrated 30% oil extrait blending Mysore sandalwood, smoky amber, and rare cardamom.',
    description: 'An evocative olfactory masterpiece. Opening with crisp bergamot and cracked cardamom, transitioning into rare Mysore sandalwood and iris root, grounded on a velvety foundation of smoked amber and aged bourbon vanilla.',
    price: 240,
    rating: 4.8,
    reviewCount: 31,
    stock: 25,
    sku: 'MUETY-F-006',
    category: 'Artisan Fragrance',
    categorySlug: 'fragrance',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: false,
    isNewArrival: false,
    tags: ['Extrait de Parfum', 'Unisex', 'Long Lasting', 'Artisan'],
    specifications: {
      'Volume': '100ml / 3.4 fl. oz.',
      'Concentration': '30% Extrait de Parfum',
      'Notes': 'Cardamom, Mysore Sandalwood, Smoky Amber, Cedar',
      'Longevity': '14+ Hours'
    },
    createdAt: '2026-05-20',
    updatedAt: '2026-08-01'
  },
  {
    id: 'muety-wallet-01',
    name: 'MUETY Minimalist Cardholder with RFID Protection',
    slug: 'minimalist-cardholder-rfid',
    shortDescription: 'Slim aerospace aluminum and French Epsom leather cardholder with quick-eject mechanism.',
    description: 'Holds up to 7 cards with instant fan-out access at the flick of a switch. Blocks wireless RFID skim attempts while maintaining a razor-thin 8mm profile.',
    price: 110,
    originalPrice: 135,
    discountPercentage: 18,
    rating: 4.7,
    reviewCount: 42,
    stock: 40,
    sku: 'MUETY-L-007',
    category: 'Leather Goods',
    categorySlug: 'leather-goods',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: false,
    isBestSeller: true,
    tags: ['RFID Shield', 'French Leather', 'Slim', 'EDC'],
    specifications: {
      'Capacity': '1-7 Cards + Cash Clip',
      'Thickness': '8.2mm',
      'Materials': 'French Epsom Leather & Aircraft Anodized Aluminum'
    },
    colors: ['Midnight Obsidian', 'Forest Emerald', 'Cognac Tan'],
    createdAt: '2026-06-15',
    updatedAt: '2026-08-10'
  },
  {
    id: 'muety-watch-02',
    name: 'MUETY Eclipse Monolith Diver 300M',
    slug: 'eclipse-monolith-diver-300m',
    shortDescription: 'Professional 300-meter automatic dive watch with ceramic bezel and Super-LumiNova BGW9.',
    description: 'Engineered for extreme depths and boardroom sophistication. Featuring a unidirectional 120-click ceramic bezel, helium escape valve, Swiss Super-LumiNova luminescence, and a solid link jubilee bracelet.',
    price: 580,
    rating: 4.9,
    reviewCount: 38,
    stock: 12,
    sku: 'MUETY-W-008',
    category: 'Timepieces',
    categorySlug: 'timepieces',
    images: [
      'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: true,
    tags: ['300M Diver', 'Ceramic Bezel', 'Super-LumiNova', 'Automatic'],
    specifications: {
      'Water Resistance': '300M / 1000ft',
      'Bezel': 'Ceramic Unidirectional 120 Clicks',
      'Crystal': 'Anti-Reflective Sapphire 3.5mm',
      'Lume': 'Swiss Super-LumiNova BGW9'
    },
    colors: ['Deep Ocean Blue', 'Stealth Matte Black'],
    createdAt: '2026-07-10',
    updatedAt: '2026-08-20'
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coup-diwali',
    code: 'DIWALI25',
    discountType: 'percentage',
    discountValue: 25,
    minSpend: 150,
    isActive: true,
    usageCount: 260,
    description: '✨ Shubh Deepavali 25% Off Storewide + Gold Gift Packaging',
    expiresAt: '2027-12-31'
  },
  {
    id: 'coup-shubh',
    code: 'SHUBH50',
    discountType: 'fixed',
    discountValue: 50,
    minSpend: 250,
    isActive: true,
    usageCount: 115,
    description: '🪔 ₹50 Festive Prosperity Gift voucher on orders above ₹250',
    expiresAt: '2027-12-31'
  },
  {
    id: 'coup-1',
    code: 'MUETY15',
    discountType: 'percentage',
    discountValue: 15,
    minSpend: 100,
    isActive: true,
    usageCount: 142,
    description: '15% Off storewide for orders above ₹100',
    expiresAt: '2027-12-31'
  },
  {
    id: 'coup-2',
    code: 'WELCOME50',
    discountType: 'fixed',
    discountValue: 50,
    minSpend: 300,
    isActive: true,
    usageCount: 88,
    description: '₹50 Off your first luxury purchase above ₹300',
    expiresAt: '2027-12-31'
  },
  {
    id: 'coup-3',
    code: 'VIPGOLD',
    discountType: 'percentage',
    discountValue: 25,
    minSpend: 500,
    isActive: true,
    usageCount: 39,
    description: '25% VIP Club discount on orders above ₹500',
    expiresAt: '2027-12-31'
  }
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'MUETY',
  tagline: 'Modern Luxury & Refined Living',
  contactEmail: 'concierge@muety.com',
  contactPhone: '+1 (800) 555-MUETY',
  address: '740 Madison Avenue, New York, NY 10065, USA',
  currency: 'INR',
  currencySymbol: '₹',
  taxRate: 8.5,
  freeShippingThreshold: 200,
  standardShippingFee: 15,
  expressShippingFee: 35,
  announcementBanner: {
    enabled: true,
    text: '🪔 SHUBH DEEPAVALI & DIWALI DHAMAKA CELEBRATIONS | USE CODE DIWALI25 FOR 25% OFF & FREE GOLD-FOIL GIFT PACKAGING',
    link: '/products'
  }
};

export const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'admin-kalvi-master',
    email: 'kalvimohan03@gmail.com',
    displayName: 'Kalvi Mohan (Executive Admin)',
    role: 'admin',
    createdAt: '2026-01-01',
    ordersCount: 8,
    totalSpent: 3500
  },
  {
    uid: 'admin-muety-master',
    email: 'muetystore@gmail.com',
    displayName: 'MUETY Executive Admin',
    role: 'admin',
    createdAt: '2026-01-01',
    ordersCount: 12,
    totalSpent: 4200
  },
  {
    uid: 'customer-demo-01',
    email: 'customer@muety.com',
    displayName: 'Elena Rostova',
    role: 'customer',
    phoneNumber: '+1 (555) 234-5678',
    createdAt: '2026-03-15',
    ordersCount: 3,
    totalSpent: 1495,
    defaultAddress: {
      fullName: 'Elena Rostova',
      phone: '+1 (555) 234-5678',
      streetAddress: '450 Park Avenue, Apt 18B',
      city: 'New York',
      state: 'NY',
      postalCode: '10022',
      country: 'United States',
      isDefault: true
    }
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-muety-8821',
    orderNumber: 'MT-882109',
    customerId: 'customer-demo-01',
    customerName: 'Elena Rostova',
    customerEmail: 'customer@muety.com',
    customerPhone: '+1 (555) 234-5678',
    shippingAddress: {
      fullName: 'Elena Rostova',
      phone: '+1 (555) 234-5678',
      streetAddress: '450 Park Avenue, Apt 18B',
      city: 'New York',
      state: 'NY',
      postalCode: '10022',
      country: 'United States'
    },
    items: [
      {
        product: INITIAL_PRODUCTS[0],
        quantity: 1,
        selectedColor: 'Champagne Gold'
      },
      {
        product: INITIAL_PRODUCTS[5],
        quantity: 1
      }
    ],
    subtotal: 735,
    discount: 110.25,
    appliedCoupon: 'MUETY15',
    tax: 53.10,
    shippingFee: 0,
    total: 677.85,
    paymentMethod: 'credit_card',
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    trackingNumber: 'MUET-FEDEX-99882143',
    trackingCarrier: 'FedEx Express International',
    timeline: [
      {
        status: 'pending',
        label: 'Order Placed',
        timestamp: '2026-08-20 10:30 AM',
        description: 'Order confirmed and payment verified via MUETY Secure Vault.'
      },
      {
        status: 'processing',
        label: 'Processing & Quality Inspection',
        timestamp: '2026-08-20 02:15 PM',
        description: 'Items inspected by master artisan in Milan facility and luxury gift packaged.'
      },
      {
        status: 'shipped',
        label: 'Dispatched via FedEx Express',
        timestamp: '2026-08-21 09:00 AM',
        description: 'Airway bill generated. Customs clearance in progress.'
      }
    ],
    createdAt: '2026-08-20T10:30:00Z',
    updatedAt: '2026-08-21T09:00:00Z'
  },
  {
    id: 'ord-muety-8822',
    orderNumber: 'MT-882245',
    customerId: 'customer-demo-01',
    customerName: 'Elena Rostova',
    customerEmail: 'customer@muety.com',
    shippingAddress: {
      fullName: 'Elena Rostova',
      phone: '+1 (555) 234-5678',
      streetAddress: '450 Park Avenue, Apt 18B',
      city: 'New York',
      state: 'NY',
      postalCode: '10022',
      country: 'United States'
    },
    items: [
      {
        product: INITIAL_PRODUCTS[1],
        quantity: 1,
        selectedColor: 'Cognac Brown'
      }
    ],
    subtotal: 680,
    discount: 50,
    appliedCoupon: 'WELCOME50',
    tax: 53.55,
    shippingFee: 0,
    total: 683.55,
    paymentMethod: 'apple_pay',
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    trackingNumber: 'MUET-DHL-44721900',
    trackingCarrier: 'DHL Premium Express',
    timeline: [
      {
        status: 'pending',
        label: 'Order Placed',
        timestamp: '2026-08-01 11:00 AM',
        description: 'Order confirmed.'
      },
      {
        status: 'shipped',
        label: 'Dispatched',
        timestamp: '2026-08-02 08:30 AM',
        description: 'Package in transit.'
      },
      {
        status: 'delivered',
        label: 'Delivered to Doorstep',
        timestamp: '2026-08-04 03:45 PM',
        description: 'Delivered and signed by recipient.'
      }
    ],
    createdAt: '2026-08-01T11:00:00Z',
    updatedAt: '2026-08-04T15:45:00Z'
  }
];

export const INITIAL_REVIEWS: PatronReview[] = [];
