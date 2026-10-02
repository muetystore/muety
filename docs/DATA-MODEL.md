# MUETY STORE — DOMAIN DATA MODEL & SCHEMAS

## Domain Entities

### Product (`Product`)
- `id`: string
- `name`: string
- `slug`: string
- `description`: string
- `price`: number
- `originalPrice`?: number
- `discountPercentage`?: number
- `category`: string
- `images`: string[]
- `stock`: number
- `rating`: number
- `reviewCount`: number
- `featured`?: boolean
- `isNewArrival`?: boolean
- `fabric`?: string
- `colors`?: string[]
- `sizes`?: string[]
- `sku`?: string

### Order (`Order`)
- `id`: string
- `orderNumber`: string
- `customer`: UserProfile | GuestCustomer
- `items`: CartItem[]
- `subtotal`: number
- `discountAmount`: number
- `taxAmount`: number
- `shippingFee`: number
- `total`: number
- `appliedCoupon`?: Coupon
- `paymentMethod`: 'razorpay' | 'cod' | 'upi'
- `paymentStatus`: 'pending' | 'paid' | 'failed' | 'refunded'
- `orderStatus`: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
- `shippingAddress`: Address
- `createdAt`: string
- `updatedAt`: string

### Coupon (`Coupon`)
- `id`: string
- `code`: string
- `discountType`: 'percentage' | 'fixed'
- `discountValue`: number
- `minSpend`: number
- `maxDiscount`?: number
- `expiresAt`: string
- `isActive`: boolean
- `usageCount`: number

### PatronReview (`PatronReview`)
- `id`: string
- `productId`?: string
- `productName`?: string
- `userName`: string
- `userLocation`?: string
- `rating`: number
- `comment`: string
- `status`: 'approved' | 'pending' | 'rejected'
- `isFeatured`: boolean
- `verifiedPurchase`: boolean
- `createdAt`: string

### ContactInquiry (`ContactInquiry`)
- `id`: string
- `inquiryNumber`: string
- `name`: string
- `email`: string
- `phone`?: string
- `category`: InquiryCategory
- `subject`: string
- `message`: string
- `status`: 'unread' | 'read' | 'replied' | 'archived'
- `adminNotes`?: string
- `createdAt`: string
- `updatedAt`: string
