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
  name: string;
  title?: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  inventory?: number;
  sku: string;
  category: string;
  categorySlug: string;
  images: string[];
  media?: Array<{
    url: string;
    publicId: string;
    resourceType?: string;
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
  }>;
  featured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  status?: string;
  tags: string[];
  specifications: Record<string, string>;
  fabric?: string;
  colors?: string[];
  sizes?: string[];
  materials?: string[];
  reviews?: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  itemCount: number;
  featured?: boolean;
}
