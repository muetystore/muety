export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link: string;
  alt: string;
  buttonText?: string;
  badgeText?: string;
  objectPosition?: string;
  isActive: boolean;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateBannerInput = Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBannerInput = Partial<CreateBannerInput>;
