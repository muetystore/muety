export type InquiryCategory = 'general' | 'order' | 'custom_order' | 'product_inquiry' | 'feedback';
export type InquiryStatus = 'unread' | 'read' | 'replied' | 'resolved';

export interface ContactInquiry {
  id: string;
  inquiryNumber: string;
  name: string;
  email: string;
  phone?: string;
  category: InquiryCategory;
  subject: string;
  message: string;
  status: InquiryStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}
