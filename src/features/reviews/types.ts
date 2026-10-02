export interface PatronReview {
  id: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  productName: string;
  authorName: string;
  authorLocation: string;
  rating: number;
  quote: string;
  title?: string;
  verifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  isFeatured: boolean;
  createdAt: string;
}
