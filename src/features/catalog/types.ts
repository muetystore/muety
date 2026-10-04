export interface ProductVariant {
  id: string;
  name: string;
  type: 'color' | 'size' | 'material';
  value: string;
  priceModifier?: number;
  stock?: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  productId?: string;
  sku: string;
  slug: string;
  name: string;
  title?: string;
  shortDescription: string;
  description: string;
  categoryId?: string;
  category: string;
  categorySlug: string;
  collectionId?: string;
  tags: string[];

  // Pricing & Tax
  price: number;
  salePrice?: number;
  originalPrice?: number;
  mrp?: number;
  discountPercentage?: number;
  taxRate?: number;

  // Inventory ERP
  stock: number;
  inventory?: number;
  reservedStock?: number;
  availableStock?: number;
  lowStockThreshold?: number;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';

  // Media (up to 5 images)
  images: string[];
  primaryImage?: string;
  media?: Array<{
    url: string;
    publicId: string;
    resourceType?: string;
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
  }>;

  // Saree & Textile Specs
  material?: string;
  fabric?: string;
  weave?: string;
  origin?: string;
  artisanDetails?: string;
  sareeLength?: string;
  blousePieceIncluded?: boolean;
  silkType?: string;
  zariType?: string;
  borderType?: string;
  palluType?: string;
  weaveTechnique?: string;
  craftsmanship?: string;
  occasion?: string;
  careInstructions?: string;
  authenticityInformation?: string;

  // Variants & Options
  colors?: string[];
  sizes?: string[];
  materials?: string[];
  colorVariants?: ProductVariant[];
  sizeVariants?: ProductVariant[];

  // Flags & Visibility
  published?: boolean;
  featured?: boolean;
  isNewArrival?: boolean;
  newArrival?: boolean;
  isBestSeller?: boolean;
  bestseller?: boolean;
  status?: 'active' | 'archived' | 'draft';

  // Analytics & Reviews
  rating: number;
  reviewCount: number;
  reviews?: Review[];
  specifications: Record<string, string>;

  // SEO & Audit
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  coverImage?: string;
  itemCount: number;
  displayOrder?: number;
  active?: boolean;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SareeCollection {
  id: string;
  collectionId?: string;
  name: string;
  slug: string;
  description: string;
  bannerImage: string;
  featured: boolean;
  productCount: number;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

