export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export type AudienceFilter = 
  | 'all_consented' 
  | 'patron_circle'
  | 'new_patrons' 
  | 'vip_patrons' 
  | 'completed_orders' 
  | 'custom_segment';

export interface EmailSenderIdentity {
  email: string;
  name: string;
  displayName?: string;
  replyTo?: string;
}

export interface FeaturedProduct {
  name: string;
  description?: string;
  price: number;
  imageUrl: string;
  linkUrl: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  title?: string;
  subject: string;
  headline: string;
  subheadline?: string;
  previewText?: string;
  bodyContent: string;
  contentHtml?: string;
  heroImageUrl?: string;
  ctaText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  status: CampaignStatus;
  audienceFilter: AudienceFilter;
  audienceFilters?: AudienceFilter[];
  senderIdentity: EmailSenderIdentity;
  featuredProducts?: FeaturedProduct[];
  recipientCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  sentAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  errorMessage?: string;
}

export interface AudienceEstimateResult {
  filter: AudienceFilter | AudienceFilter[] | string;
  eligibleCount: number;
  excludedNoConsentCount: number;
  suppressedCount: number;
  totalChecked: number;
}

export interface CampaignDispatchResult {
  campaignId: string;
  status: CampaignStatus;
  totalTargeted: number;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

export interface EmailSettings {
  provider: 'resend' | 'smtp' | 'none';
  sendingDomain: string;
  domainVerified?: boolean;
  status: 'active' | 'not_configured' | 'attention_required';
  marketingSender: EmailSenderIdentity;
  transactionalSender: EmailSenderIdentity;
  replyTo: string;
  centralOrdersRecipient: string;
  managementRecipients: string[];
  fulfillmentRecipients: string[];
  updatedAt: string;
  updatedBy?: string;
}

export interface SuppressionRecord {
  email: string;
  reason: string;
  source?: string;
  createdAt: string;
  unsubscribedAt?: string;
}

export interface TransactionalNotificationJob {
  jobId: string;
  id?: string;
  orderId: string;
  orderNumber: string;
  recipient: string;
  type: string;
  status: 'sent' | 'failed' | 'queued';
  error?: string;
  createdAt: string;
  processedAt?: string;
}

export interface SendEmailPayload {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  code?: string;
  error?: string;
  statusCode?: number;
}
