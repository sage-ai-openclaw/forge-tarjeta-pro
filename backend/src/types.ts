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

export interface User {
  id: number;
  email: string;
  name?: string;
  createdAt: string;
}

export interface UserCard {
  id: number;
  userId: number;
  cardId: number;
  card?: Card;
  createdAt: string;
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

export interface CreatePromotionInput {
  cardId: number;
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
}

export interface CreateUserPreferencesInput {
  userId: number;
  preferredCategories?: string[];
  preferredZones?: string[];
  minDiscountPercentage?: number;
  maxDiscountAmount?: number;
  notifyNewPromotions?: boolean;
  notifyExpiringSoon?: boolean;
}
