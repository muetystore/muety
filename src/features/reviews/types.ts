export interface PatronReview {
  id: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  productSlug?: string;
  productName: string;
  authorName: string;
  authorLocation: string;
  rating: number;
  quote: string;
  comment?: string;
  title?: string;
  verifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  isFeatured: boolean;
  showOnHome?: boolean;
  displayOrder?: number;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}
