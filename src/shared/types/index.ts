export type AppRole = 
  | 'super_admin' 
  | 'admin' 
  | 'catalog_manager' 
  | 'order_manager' 
  | 'support_agent' 
  | 'customer';

export type UserRole = AppRole;

export interface Address {
  fullName: string;
  phone: string;
  streetAddress: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: AppRole;
  roles?: AppRole[];
  phoneNumber?: string;
  addresses?: Address[];
  defaultAddress?: Address;
  createdAt: string;
  isBlocked?: boolean;
  ordersCount?: number;
  totalSpent?: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  freeShippingThreshold: number;
  standardShippingFee: number;
  expressShippingFee: number;
  announcementBanner: {
    enabled: boolean;
    text: string;
    link?: string;
  };
}
