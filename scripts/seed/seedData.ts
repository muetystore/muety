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
    id: 'cat-bridal',
    name: 'Bridal Couture',
    slug: 'bridal',
    description: 'Exquisite bridal Kanchipuram silk sarees and hand-embroidered wedding creations for auspicious occasions.',
    image: '/saree_model_drape.jpg',
    itemCount: 4,
    featured: true
  },
  {
    id: 'cat-handloom',
    name: 'Heritage Handloom',
    slug: 'handloom',
    description: 'Pure Chanderi, Tussar, Organza, and Linen silk handwoven creations from master weaver ateliers.',
    image: '/saree_fabric_detail.jpg',
    itemCount: 5,
    featured: true
  },
  {
    id: 'cat-jewelry',
    name: 'Royal Temple Jewelry',
    slug: 'jewelry',
    description: 'Handcrafted Kundan, Temple gold-plated, and Polki artisan jewelry tailored for saree elegance.',
    image: '/diwali_hero_banner.jpg',
    itemCount: 4,
    featured: true
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'muety-saree-01',
    name: 'MUETY Royal Kanchipuram Pure Silk Saree',
    slug: 'royal-kanchipuram-pure-silk-saree',
    shortDescription: 'Handwoven pure mulberry silk in cream with royal emerald green & 24K gold zari elephant border.',
    description: 'A masterpiece of royal Indian handloom heritage. Handwoven with 100% pure mulberry silk in regal ivory cream, paired with a rich emerald green Korvai border and pallu intricately woven with gold zari elephant and peacock motifs. Includes matching unstitched pure silk blouse piece.',
    price: 34500,
    originalPrice: 42000,
    discountPercentage: 18,
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
      'Weave Technique': 'Authentic Korvai Hand Weave',
      'Length': '6.3 Meters (With Blouse Piece)',
      'Care': 'Professional Dry Clean Only',
      'Origin': 'Kanchipuram, Tamil Nadu, India'
    },
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'muety-saree-02',
    name: 'MUETY Crimson Crimson Banarasi Silk Saree',
    slug: 'crimson-banarasi-silk-saree',
    shortDescription: 'Passionate crimson red mulberry silk with pure silver & gold zari Kadwa floral jaal.',
    description: 'Woven in the ancient holy city of Varanasi, this bridal crimson red Banarasi silk saree features intricate silver and gold zari Kadwa floral motifs spread across soft mulberry silk. Designed for heirloom bridal trousseaus.',
    price: 48900,
    originalPrice: 58000,
    discountPercentage: 15,
    rating: 4.9,
    reviewCount: 28,
    stock: 6,
    sku: 'MUETY-S-002',
    category: 'Bridal Couture',
    categorySlug: 'bridal',
    images: [
      '/saree_model_drape.jpg',
      '/saree_fabric_detail.jpg'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: false,
    tags: ['Banarasi', 'Bridal Red', 'Kadwa Jaal', 'Silver Zari', 'Silk Mark'],
    specifications: {
      'Fabric': 'Pure Banarasi Katan Silk',
      'Zari': 'Gold & Silver Brocade',
      'Weave Technique': 'Kadwa Handloom Weave',
      'Length': '6.3 Meters (With Blouse Piece)',
      'Care': 'Professional Dry Clean Only',
      'Origin': 'Varanasi, Uttar Pradesh, India'
    },
    createdAt: '2026-01-15T12:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z'
  },
  {
    id: 'muety-saree-03',
    name: 'MUETY Midnight Sapphire Organza Silk Saree',
    slug: 'midnight-sapphire-organza-silk-saree',
    shortDescription: 'Lightweight sheer sapphire blue organza silk with hand-painted lotus borders & zari scalloping.',
    description: 'Elegance meets featherlight luxury. Sheer midnight sapphire blue organza silk embellished with hand-drawn floral lotus borders and delicate scalloped zari edging. Perfect for festive evening receptions.',
    price: 22800,
    originalPrice: 28500,
    discountPercentage: 20,
    rating: 4.8,
    reviewCount: 19,
    stock: 8,
    sku: 'MUETY-S-003',
    category: 'Heritage Handloom',
    categorySlug: 'handloom',
    images: [
      '/saree_fabric_detail.jpg',
      '/saree_model_individual.jpg'
    ],
    featured: true,
    isNewArrival: false,
    isBestSeller: true,
    tags: ['Organza Silk', 'Hand-Painted', 'Sapphire Blue', 'Lightweight Luxury'],
    specifications: {
      'Fabric': '100% Pure Organza Silk',
      'Work': 'Hand-Painted Lotus & Scalloped Zari',
      'Length': '6.3 Meters (With Blouse Piece)',
      'Care': 'Dry Clean Only',
      'Origin': 'Bengal Handloom Atelier'
    },
    createdAt: '2026-02-01T08:30:00Z',
    updatedAt: '2026-02-01T08:30:00Z'
  },
  {
    id: 'muety-saree-04',
    name: 'MUETY Golden Temple Heritage Chanderi Saree',
    slug: 'golden-temple-heritage-chanderi-saree',
    shortDescription: 'Pastel pistachio green Chanderi silk cotton with gold tissue zari border & meenakari pallu.',
    description: 'Lightweight, translucent, and imbued with regal grace. Woven in Madhya Pradesh using fine silk and cotton threads, adorned with gold tissue borders and intricate meenakari peacock bootis on the pallu.',
    price: 18500,
    originalPrice: 22000,
    discountPercentage: 16,
    rating: 4.9,
    reviewCount: 31,
    stock: 15,
    sku: 'MUETY-S-004',
    category: 'Heritage Handloom',
    categorySlug: 'handloom',
    images: [
      '/diwali_hero_banner.jpg',
      '/saree_fabric_detail.jpg'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: false,
    tags: ['Chanderi Silk', 'Pistachio Green', 'Tissue Zari', 'Lightweight'],
    specifications: {
      'Fabric': 'Chanderi Silk Cotton',
      'Zari': 'Gold Tissue Border',
      'Length': '6.3 Meters (With Blouse Piece)',
      'Care': 'Dry Clean Only',
      'Origin': 'Chanderi, Madhya Pradesh, India'
    },
    createdAt: '2026-02-10T14:15:00Z',
    updatedAt: '2026-02-10T14:15:00Z'
  },
  {
    id: 'muety-jewelry-01',
    name: 'MUETY Royal Temple Lakshmi Gold Necklace Set',
    slug: 'royal-temple-lakshmi-gold-necklace-set',
    shortDescription: '22K gold-plated antique temple jewelry set handcrafted with ruby red stones and freshwater pearls.',
    description: 'Handcrafted temple jewelry set featuring Goddess Lakshmi motifs encircled by CZ rubies and natural seed pearls. Comes with matching antique jhumka earrings.',
    price: 14500,
    originalPrice: 18000,
    discountPercentage: 19,
    rating: 5.0,
    reviewCount: 16,
    stock: 5,
    sku: 'MUETY-J-001',
    category: 'Royal Temple Jewelry',
    categorySlug: 'jewelry',
    images: [
      '/diwali_hero_banner.jpg'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: true,
    tags: ['Temple Jewelry', 'Gold Plated', 'Antique Design', 'Bridal Jewelry'],
    specifications: {
      'Base Material': 'Brass with 22K Micro Gold Plating',
      'Stones': 'Synthetic Rubies & Pearl Clusters',
      'Includes': 'Necklace + Pair of Matching Jhumkas',
      'Care': 'Keep Away from Moisture & Perfume'
    },
    createdAt: '2026-02-14T11:00:00Z',
    updatedAt: '2026-02-14T11:00:00Z'
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'cpn-diwali',
    code: 'FESTIVE10',
    discountType: 'percentage',
    discountValue: 10,
    minSpend: 15000,
    maxDiscount: 5000,
    expiresAt: '2026-12-31T23:59:59Z',
    isActive: true,
    usageCount: 84
  },
  {
    id: 'cpn-welcome',
    code: 'MUETYFIRST',
    discountType: 'fixed',
    discountValue: 2000,
    minSpend: 20000,
    expiresAt: '2026-12-31T23:59:59Z',
    isActive: true,
    usageCount: 142
  }
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'MUETY Atelier',
  tagline: 'Handwoven Pure Silk Sarees & Luxury Ethnic Heirloom Couture',
  contactEmail: 'concierge@muety.in',
  contactPhone: '+91 93857 91540',
  address: 'MUETY Atelier, Silk Handloom Hub, Kanchipuram, Tamil Nadu, India',
  currency: 'INR',
  currencySymbol: '₹',
  taxRate: 5,
  freeShippingThreshold: 10000,
  standardShippingFee: 250,
  expressShippingFee: 500,
  announcementBanner: {
    enabled: true,
    text: '✨ Compliment: Free Shipping Across India on Orders Above ₹10,000 | Silk Mark Certified Handlooms ✨',
    link: '/products'
  }
};

export const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'admin-kalvi-master',
    email: 'kalvimohan03@gmail.com',
    displayName: 'MUETY Executive Concierge',
    roles: ['super_admin', 'admin'],
    role: 'super_admin',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    uid: 'customer-demo-01',
    email: 'patron@muetystore.com',
    displayName: 'Ananya Sharma',
    roles: ['customer'],
    role: 'customer',
    createdAt: '2026-02-15T00:00:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-2026-9812',
    orderNumber: 'MT-ORD-9812',
    customerId: 'customer-demo-01',
    customerName: 'Ananya Sharma',
    customerEmail: 'patron@muetystore.com',
    customerPhone: '+91 98765 43210',
    shippingAddress: {
      fullName: 'Ananya Sharma',
      phone: '+91 98765 43210',
      streetAddress: '14 Jubilee Hills, Road No. 36',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500033',
      country: 'India'
    },
    items: [
      {
        product: INITIAL_PRODUCTS[0],
        quantity: 1
      }
    ],
    subtotal: 34500,
    discount: 0,
    shippingFee: 0,
    tax: 1725,
    total: 36225,
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    createdAt: '2026-02-18T14:30:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
    timeline: [
      { status: 'pending', label: 'Order Placed', timestamp: '2026-02-18T14:30:00Z', description: 'Order confirmed and payment verified.' },
      { status: 'processing', label: 'Quality Inspection', timestamp: '2026-02-19T09:00:00Z', description: 'Handloom Silk Mark verification complete.' },
      { status: 'shipped', label: 'Dispatched via Bluedart Express', timestamp: '2026-02-19T16:00:00Z', description: 'AWB #7712398412' },
      { status: 'delivered', label: 'Delivered to Patron', timestamp: '2026-02-20T10:00:00Z', description: 'Signed by recipient.' }
    ]
  }
];

export const INITIAL_REVIEWS: PatronReview[] = [
  {
    id: 'rev-01',
    productId: 'muety-saree-01',
    productName: 'MUETY Royal Kanchipuram Pure Silk Saree',
    authorName: 'Priyamvada N.',
    authorLocation: 'Chennai, Tamil Nadu',
    rating: 5,
    quote: 'The softness of the pure mulberry silk and authentic 24K Korvai gold zari border is beyond breathtaking. True heirloom craftsmanship!',
    verifiedPurchase: true,
    status: 'approved',
    isFeatured: true,
    createdAt: '2026-02-22T10:00:00Z'
  },
  {
    id: 'rev-02',
    productId: 'muety-saree-02',
    productName: 'MUETY Crimson Banarasi Silk Saree',
    authorName: 'Dr. Radhika Sen',
    authorLocation: 'Kolkata, West Bengal',
    rating: 5,
    quote: 'Purchased for my daughter’s wedding ceremony. The Kadwa floral brocade jaal reflects rich tradition. Unmatched luxury atelier experience.',
    verifiedPurchase: true,
    status: 'approved',
    isFeatured: true,
    createdAt: '2026-02-25T15:30:00Z'
  }
];
