import { AppRole } from '../utils/permissions';
export type { AppRole };

export type UserRole = AppRole;

export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'guest' | 'VIP';

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  houseFlat?: string;
  streetAddress: string;
  apartment?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type?: 'home' | 'work' | 'other';
  isDefault?: boolean;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'disabled';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  slug: string;
  departmentId: string;
  departmentName: string;
  description: string;
  status: 'active' | 'disabled';
  permissions: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AdminStatus = 'invited' | 'active' | 'disabled';
export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  fullName?: string;
  photoURL?: string;
  profilePhotoUrl?: string;
  personalEmail?: string;
  muetyEmail?: string;
  departmentId?: string;
  departmentName?: string;
  roleId?: string;
  roleName?: string;
  roleSlug?: string;
  role?: AppRole;
  roles?: AppRole[];
  status?: AdminStatus;
  invitationStatus?: InvitationStatus;
  invitationSentAt?: string;
  invitationAcceptedAt?: string;
  createdBy?: string;
  phone?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  jobTitle?: string;
  bio?: string;
  whatsappPhone?: string;
  addresses?: Address[];
  defaultAddress?: Address;
  defaultShippingAddressId?: string;
  defaultBillingAddressId?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  isBlocked?: boolean;
  ordersCount?: number;
  totalSpent?: number;
  customerStatus?: CustomerStatus;
}

export type AdminUser = UserProfile;

export interface CustomerProfile {
  customerId: string;
  uid?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email: string;
  phone?: string;
  whatsappPhone?: string;
  photoURL?: string;
  dateOfBirth?: string;
  gender?: string;
  addresses: Address[];
  defaultShippingAddressId?: string;
  defaultBillingAddressId?: string;
  wishlistCount?: number;
  orderCount: number;
  totalSpend: number;
  lastOrderAt?: string;
  firstOrderAt?: string;
  customerStatus: CustomerStatus;
  marketingConsent: boolean;
  whatsappConsent: boolean;
  emailConsent: boolean;
  preferredLanguage?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface StoreSettings {
  storeName: string;
  legalBusinessName: string;
  gstin: string;
  tagline: string;
  contactEmail: string;
  ordersEmail: string;
  contactPhone: string;
  whatsappPhone: string;
  instagramHandle: string;
  address?: string;
  registeredAddress: {
    buildingNo: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  currency: string;
  currencySymbol: string;
  taxRate: number;
  freeShippingThreshold: number;
  standardShippingFee: number;
  expressShippingFee: number;
  shippingCountry: string;
  policy: {
    returnsAccepted: boolean;
    refundsOffered: boolean;
    cancellationsOffered: boolean;
    disclaimerText: string;
  };
  announcementBanner: {
    enabled: boolean;
    text: string;
    link?: string;
  };
}

export interface AdminAuditLog {
  logId: string;
  actorUid: string;
  actorEmail: string;
  actorRole: AppRole;
  action: string;
  entityType: 'PRODUCT' | 'CATEGORY' | 'COLLECTION' | 'ORDER' | 'CUSTOMER' | 'ADMIN' | 'SETTINGS' | 'POLICY' | 'COUPON' | 'INVENTORY' | 'BANNER';
  entityId: string;
  before?: any;
  after?: any;
  reason?: string;
  timestamp: string;
  ipAddress?: string;
}

export type InventoryTransactionType = 
  | 'STOCK_IN' 
  | 'STOCK_OUT' 
  | 'ORDER_RESERVED' 
  | 'ORDER_RELEASED' 
  | 'ORDER_CANCELLED' 
  | 'MANUAL_ADJUSTMENT' 
  | 'RETURN_ADJUSTMENT';

export interface InventoryTransaction {
  transactionId: string;
  productId: string;
  productName: string;
  sku: string;
  type: InventoryTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  performedBy: string;
  reason?: string;
  timestamp: string;
}

export interface PolicyDocument {
  documentId: string;
  policyId: 'shipping' | 'return' | 'refund' | 'cancellation' | 'privacy' | 'terms' | 'contact';
  title: string;
  slug: string;
  content: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
}

