import type { Bank, Card, Promotion, PromotionFilters, UserPreferences } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Banks
  getBanks: () => fetchApi<Bank[]>('/api/banks'),

  // Cards
  getCards: (bankId?: number) => {
    const query = bankId ? `?bankId=${bankId}` : '';
    return fetchApi<Card[]>(`/api/cards${query}`);
  },

  // Promotions
  getPromotions: (filters?: PromotionFilters) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.cardId) params.append('cardId', String(filters.cardId));
    if (filters?.bankId) params.append('bankId', String(filters.bankId));
    if (filters?.cardType) params.append('cardType', filters.cardType);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<Promotion[]>(`/api/promotions${query}`);
  },

  getPromotion: (id: number) => fetchApi<Promotion>(`/api/promotions/${id}`),

  searchPromotions: (query: string) => 
    fetchApi<Promotion[]>(`/api/promotions/search?q=${encodeURIComponent(query)}`),

  // Categories
  getCategories: () => fetchApi<string[]>('/api/categories'),

  // User Preferences
  getUserPreferences: (userId: string) => 
    fetchApi<UserPreferences>(`/api/preferences/${userId}`),

  saveUserPreferences: (preferences: Partial<UserPreferences>) =>
    fetchApi<UserPreferences>('/api/preferences', {
      method: 'POST',
      body: JSON.stringify(preferences),
    }),

  // Stats
  getStats: () => fetchApi('/api/stats'),
};
