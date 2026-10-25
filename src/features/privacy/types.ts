export type ConsentCategory = 'necessary' | 'preferences' | 'analytics' | 'marketing';

export interface ConsentCategories {
  necessary: true; // Strictly necessary is always active
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export type ConsentAction = 'accept_all' | 'reject_optional' | 'customized' | 'withdrawn';

export interface CookieConsentRecord {
  schemaVersion: number;
  policyVersion: string;
  timestamp: string; // ISO 8601
  categories: ConsentCategories;
  action: ConsentAction;
}

export interface ConsentCategoryInfo {
  id: ConsentCategory;
  name: string;
  required: boolean;
  summary: string;
  details: string;
  examples: string[];
}
