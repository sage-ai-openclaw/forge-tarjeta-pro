import type { Bank, Card, Promotion, PromotionFilters, UserPreferences, UserCard, User, Notification, NotificationStats } from '../types';

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
  getUserPreferences: (userId: string | number) => 
    fetchApi<UserPreferences>(`/api/preferences/${userId}`),

  saveUserPreferences: (preferences: Partial<UserPreferences> & { userId: number }) =>
    fetchApi<UserPreferences>('/api/preferences', {
      method: 'POST',
      body: JSON.stringify(preferences),
    }),

  updateUserPreferences: (userId: number, data: Partial<UserPreferences>) =>
    fetchApi<UserPreferences>(`/api/preferences/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // User Cards
  getUserCards: (userId: number) => 
    fetchApi<UserCard[]>(`/api/users/${userId}/cards`),

  addUserCard: (userId: number, cardId: number) =>
    fetchApi<UserCard>(`/api/users/${userId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ cardId }),
    }),

  removeUserCard: (userId: number, cardId: number) =>
    fetchApi<void>(`/api/users/${userId}/cards/${cardId}`, {
      method: 'DELETE',
    }),

  // My Promotions (filtered by user preferences)
  getMyPromotions: (userId: number) =>
    fetchApi<Promotion[]>(`/api/users/${userId}/promotions`),

  // User Management
  createUser: (email: string, name?: string) =>
    fetchApi<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    }),

  getUser: (userId: number) =>
    fetchApi<User>(`/api/users/${userId}`),

  // Stats
  getStats: () => fetchApi('/api/stats'),

  // Notifications
  getNotifications: (userId: number, options?: { status?: 'read' | 'unread' | 'all'; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<Notification[]>(`/api/notifications/${userId}${query}`);
  },

  getUnreadNotificationCount: (userId: number) =>
    fetchApi<{ count: number }>(`/api/notifications/${userId}/unread-count`),

  markNotificationAsRead: (notificationId: number) =>
    fetchApi<void>(`/api/notifications/${notificationId}/read`, { method: 'POST' }),

  markAllNotificationsAsRead: (userId: number) =>
    fetchApi<void>(`/api/notifications/${userId}/read-all`, { method: 'POST' }),

  getNotificationStats: (userId: number) =>
    fetchApi<NotificationStats>(`/api/notifications/${userId}/stats`),

  deleteNotification: (notificationId: number) =>
    fetchApi<void>(`/api/notifications/${notificationId}`, { method: 'DELETE' }),
};
