export interface Bank {
  id: number;
  name: string;
  logoUrl?: string;
  website?: string;
  createdAt: string;
}

export interface Card {
  id: number;
  bankId: number;
  bankName?: string;
  name: string;
  type: 'credit' | 'debit';
  createdAt: string;
}

export interface Promotion {
  id: number;
  cardId: number;
  cardName?: string;
  bankName?: string;
  title: string;
  description?: string;
  category: string;
  discountPercentage?: number;
  discountAmount?: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  daysOfWeek?: string;
  merchantName?: string;
  merchantAddress?: string;
  sourceUrl?: string;
  status: 'active' | 'expired' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface PromotionFilters {
  category?: string;
  status?: string;
  cardId?: number;
  bankId?: number;
  cardType?: string;
  sortBy?: 'discount' | 'expiration' | 'created';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface UserPreferences {
  id: number;
  userId: number;
  preferredCategories?: string[];
  preferredZones?: string[];
  minDiscountPercentage: number;
  maxDiscountAmount?: number;
  notifyNewPromotions: boolean;
  notifyExpiringSoon: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  active: number;
  expired: number;
  byBank: { bank: string; count: number }[];
  byCategory: { category: string; count: number }[];
}
