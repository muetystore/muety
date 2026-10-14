export interface StoreAnnouncement {
  id: string;
  title: string;
  message: string;
  couponCode?: string;
  ctaText?: string;
  ctaLink?: string;
  campaignLabel?: string;
  isActive: boolean;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  hasCountdown?: boolean;
  countdownEndTime?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateAnnouncementInput = Omit<StoreAnnouncement, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;
