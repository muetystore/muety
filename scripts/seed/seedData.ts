import { Product, Category, SareeCollection } from '../../src/features/catalog/types';
import { Coupon } from '../../src/features/coupons/types';
import { Order } from '../../src/features/orders/types';
import { PatronReview } from '../../src/features/reviews/types';
import { StoreSettings, UserProfile } from '../../src/shared/types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-sarees',
    name: 'Festive Silk Sarees',
    slug: 'sarees',
    categoryCode: 'FS',
    description: 'Handwoven pure Kanchipuram & Banarasi mulberry silk sarees with authentic 24K gold zari borders.',
    image: '/saree_model_individual.jpg',
    itemCount: 6,
    featured: true
  },
  {
    id: 'cat-bridal',
    name: 'Bridal Couture',
    slug: 'bridal',
    categoryCode: 'BC',
    description: 'Exquisite bridal Kanchipuram silk sarees and hand-embroidered wedding creations for auspicious occasions.',
    image: '/saree_model_drape.jpg',
    itemCount: 4,
    featured: true
  },
  {
    id: 'cat-handloom',
    name: 'Heritage Handloom',
    slug: 'handloom',
    categoryCode: 'HH',
    description: 'Pure Chanderi, Tussar, Organza, and Linen silk handwoven creations from master weaver ateliers.',
    image: '/saree_fabric_detail.jpg',
    itemCount: 5,
    featured: true
  },
  {
    id: 'cat-jewelry',
    name: 'Royal Temple Jewelry',
    slug: 'jewelry',
    categoryCode: 'RT',
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
    sku: 'FS-01',
    categoryIds: ['cat-sarees'],
    primaryCategoryId: 'cat-sarees',
    categoryId: 'cat-sarees',
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
    isMostWanted: true,
    occasion: 'bridal',
    tags: ['Pure Silk', 'Kanchipuram', 'Gold Zari', 'Diwali Special', 'Festive Heritage', 'Handloom', 'bridal'],
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
    sku: 'BC-02',
    category: 'Bridal Couture',
    categorySlug: 'bridal',
    images: [
      '/saree_model_drape.jpg',
      '/saree_fabric_detail.jpg'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: true,
    isMostWanted: true,
    occasion: 'bridal',
    tags: ['Banarasi', 'Bridal Red', 'Kadwa Jaal', 'Silver Zari', 'Silk Mark', 'bridal'],
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
    sku: 'HH-03',
    category: 'Heritage Handloom',
    categorySlug: 'handloom',
    images: [
      '/saree_fabric_detail.jpg',
      '/saree_model_individual.jpg'
    ],
    featured: true,
    isNewArrival: false,
    isBestSeller: true,
    isMostWanted: true,
    occasion: 'reception',
    tags: ['Organza Silk', 'Hand-Painted', 'Sapphire Blue', 'Lightweight Luxury', 'reception'],
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
    sku: 'HH-04',
    category: 'Heritage Handloom',
    categorySlug: 'handloom',
    images: [
      '/diwali_hero_banner.jpg',
      '/saree_fabric_detail.jpg'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: false,
    isMostWanted: true,
    occasion: 'temple',
    tags: ['Chanderi Silk', 'Pistachio Green', 'Tissue Zari', 'Lightweight', 'temple'],
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
    sku: 'TJ-01',
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
  storeName: 'MUETY',
  legalBusinessName: 'muety',
  gstin: '33HFCPR2838F2ZD',
  tagline: 'Sarees for Your Story',
  contactEmail: 'support@muety.in',
  ordersEmail: 'orders@muety.in',
  contactPhone: '9385791540',
  whatsappPhone: '9940668095',
  instagramHandle: '@Themuety',
  address: '2/32B Ramireddypatti, Palikadu, Salem – 636501, Tamil Nadu, India',
  registeredAddress: {
    buildingNo: '2/32B',
    street: 'Ramireddypatti, Palikadu',
    city: 'Salem',
    state: 'Tamil Nadu',
    postalCode: '636501',
    country: 'India'
  },
  currency: 'INR',
  currencySymbol: '₹',
  taxRate: 5,
  freeShippingThreshold: 0,
  standardShippingFee: 89,
  expressShippingFee: 89,
  shippingCountry: 'India',
  policy: {
    returnsAccepted: false,
    refundsOffered: false,
    cancellationsOffered: false,
    disclaimerText: 'Orders are non-returnable, non-refundable, and non-cancellable once confirmed.'
  },
  announcementBanner: {
    enabled: true,
    text: '✨ Pan-India Insured Courier (₹89 Flat) | Silk Mark Certified Salem Handlooms ✨',
    link: '/products'
  }
};

export const INITIAL_USERS: UserProfile[] = [
  {
    uid: '64HTWU7iCWNtvRKHhTCuJeXFLxq2',
    email: 'superadmin@muety.in',
    displayName: 'MUETY Executive Super Admin',
    roles: ['superadmin', 'admin'],
    role: 'superadmin',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    uid: 'rXYeoVurZqMmMSTEvgxUt7OQqhB2',
    email: 'vignesh.admin@muety.in',
    muetyEmail: 'vignesh.admin@muety.in',
    personalEmail: 'vigneshlakshmanan415@gmail.com',
    displayName: 'vignesh',
    roles: ['admin'],
    role: 'admin',
    departmentId: 'management',
    departmentName: 'Management',
    status: 'active',
    invitationStatus: 'accepted',
    customerStatus: 'active',
    createdAt: '2026-10-16T10:24:45.056Z'
  },
  {
    uid: 'jXKpOH42XfOMyYNZAl0JwDD8sS83',
    email: 'catalog@muety.in',
    displayName: 'MUETY Catalog Manager',
    roles: ['catalog_manager'],
    role: 'catalog_manager',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    uid: 'customer-demo-01',
    email: 'patron@muety.in',
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
    customerEmail: 'patron@muety.in',
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
    productSlug: 'muety-royal-kanchipuram-pure-silk-saree',
    productName: 'MUETY Royal Kanchipuram Pure Silk Saree',
    authorName: 'Priyamvada N.',
    authorLocation: 'Chennai, Tamil Nadu',
    rating: 5,
    quote: 'The softness of the pure mulberry silk and authentic 24K Korvai gold zari border is beyond breathtaking. True heirloom craftsmanship!',
    photoUrl: '/saree_model_individual.jpg',
    verifiedPurchase: true,
    status: 'approved',
    isFeatured: true,
    showOnHome: true,
    displayOrder: 1,
    createdAt: '2026-02-22T10:00:00Z'
  },
  {
    id: 'rev-02',
    productId: 'muety-saree-02',
    productSlug: 'muety-crimson-banarasi-silk-saree',
    productName: 'MUETY Crimson Banarasi Silk Saree',
    authorName: 'Dr. Radhika Sen',
    authorLocation: 'Kolkata, West Bengal',
    rating: 5,
    quote: 'Purchased for my daughter’s wedding ceremony. The Kadwa floral brocade jaal reflects rich tradition. Unmatched luxury atelier experience.',
    photoUrl: '/saree_model_drape.jpg',
    verifiedPurchase: true,
    status: 'approved',
    isFeatured: true,
    showOnHome: true,
    displayOrder: 2,
    createdAt: '2026-02-25T15:30:00Z'
  },
  {
    id: 'rev-03',
    productId: 'muety-saree-03',
    productSlug: 'muety-mysore-crepe-silk-saree',
    productName: 'MUETY Heritage Mysore Crepe Silk Saree',
    authorName: 'Meenakshi Sundaram',
    authorLocation: 'Madurai, Tamil Nadu',
    rating: 5,
    quote: 'The drape of this Salem bridal silk is exceptionally lightweight yet royal. The gold zari luster holds true under festive lighting.',
    photoUrl: '/saree_fabric_detail.jpg',
    verifiedPurchase: true,
    status: 'approved',
    isFeatured: true,
    showOnHome: true,
    displayOrder: 3,
    createdAt: '2026-02-28T11:20:00Z'
  },
  {
    id: 'rev-04',
    productId: 'muety-saree-04',
    productSlug: 'muety-tussar-georgette-silk-saree',
    productName: 'MUETY Pure Tussar Georgette Silk Saree',
    authorName: 'Ananya Deshmukh',
    authorLocation: 'Pune, Maharashtra',
    rating: 5,
    quote: 'Pure mulberry silk with authentic Silk Mark certification. Arrived in exquisite heritage atelier packaging within 3 days.',
    photoUrl: '/saree_model_individual.jpg',
    verifiedPurchase: true,
    status: 'approved',
    isFeatured: true,
    showOnHome: true,
    displayOrder: 4,
    createdAt: '2026-03-02T14:45:00Z'
  }
];

export const INITIAL_COLLECTIONS: SareeCollection[] = [
  // Occasions (Festive Edits on Homepage & Shop By Megamenu)
  {
    id: 'col-bridal',
    collectionId: 'col-bridal',
    name: 'Bridal Muhurtham',
    slug: 'bridal',
    description: 'Sacred pure zari Kanchipuram sarees curated for wedding muhurthams.',
    bannerImage: '/saree_model_individual.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 1,
    type: 'occasion',
    showInShopBy: true,
    showInFestiveEdits: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-temple',
    collectionId: 'col-temple',
    name: 'Temple Ceremonies',
    slug: 'temple',
    description: 'Sacred hues and traditional Korvai borders for temple festivals & poojas.',
    bannerImage: '/saree_fabric_detail.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 2,
    type: 'occasion',
    showInShopBy: true,
    showInFestiveEdits: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-reception',
    collectionId: 'col-reception',
    name: 'Grand Receptions',
    slug: 'reception',
    description: 'Contemporary soft silks and opulent tissue drapes for evening receptions.',
    bannerImage: '/saree_model_drape.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 3,
    type: 'occasion',
    showInShopBy: true,
    showInFestiveEdits: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-festive',
    collectionId: 'col-festive',
    name: 'Family Festivities',
    slug: 'festive',
    description: 'Celebratory Salem handlooms and vibrant silks for family get-togethers.',
    bannerImage: '/diwali_hero_banner.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 4,
    type: 'occasion',
    showInShopBy: true,
    showInFestiveEdits: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },

  // Fabric Collections (Shop By Megamenu)
  {
    id: 'col-fab-mulberry',
    collectionId: 'col-fab-mulberry',
    name: 'Pure Mulberry Silk',
    slug: 'pure-silk',
    description: '100% Silk Mark certified natural mulberry handloom drapes.',
    bannerImage: '/saree_fabric_detail.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 1,
    type: 'fabric',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-fab-kanchi',
    collectionId: 'col-fab-kanchi',
    name: 'Kanchipuram Silk',
    slug: 'kanchipuram',
    description: 'Authentic 3-ply heavy zari South Indian royal heritage sarees.',
    bannerImage: '/saree_model_individual.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 2,
    type: 'fabric',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-fab-cotton',
    collectionId: 'col-fab-cotton',
    name: 'Traditional Cotton Handloom',
    slug: 'cotton',
    description: 'Breathable pit-loom Salem cottons with delicate zari borders.',
    bannerImage: '/saree_fabric_detail.jpg',
    featured: false,
    productCount: 2,
    displayOrder: 3,
    type: 'fabric',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-fab-georgette',
    collectionId: 'col-fab-georgette',
    name: 'Georgette & Soft Crepe',
    slug: 'georgette',
    description: 'Feather-light flowing drapes crafted for modern ease.',
    bannerImage: '/saree_model_drape.jpg',
    featured: false,
    productCount: 2,
    displayOrder: 4,
    type: 'fabric',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },

  // Style Collections (Shop By Megamenu)
  {
    id: 'col-style-classic',
    collectionId: 'col-style-classic',
    name: 'Traditional Classic',
    slug: 'traditional',
    description: 'Timeless temple motifs, rudraksha and annapakshi borders.',
    bannerImage: '/saree_model_individual.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 1,
    type: 'style',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-style-designer',
    collectionId: 'col-style-designer',
    name: 'Contemporary Designer',
    slug: 'contemporary',
    description: 'Subtle pastels, minimalist brocades, and modern atelier silhouettes.',
    bannerImage: '/saree_model_drape.jpg',
    featured: true,
    productCount: 3,
    displayOrder: 2,
    type: 'style',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-style-temple',
    collectionId: 'col-style-temple',
    name: 'Royal Temple Borders',
    slug: 'temple-borders',
    description: 'Heritage Korvai interlocking temple spires along the selvedge.',
    bannerImage: '/saree_fabric_detail.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 3,
    type: 'style',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'col-style-gold-zari',
    collectionId: 'col-style-gold-zari',
    name: 'Pure Gold Zari Handlooms',
    slug: 'gold-zari',
    description: 'Heirloom drapes enriched with authentic gold and silver metallic threads.',
    bannerImage: '/saree_model_individual.jpg',
    featured: true,
    productCount: 4,
    displayOrder: 4,
    type: 'style',
    showInShopBy: true,
    showInFestiveEdits: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];


