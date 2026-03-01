import { create } from 'zustand';
import type { Card, UserPreferences, UserCard } from '../types';
import { api } from '../api/client';

interface UserPreferencesState {
  // User data
  userId: number | null;
  userCards: UserCard[];
  preferences: UserPreferences | null;
  
  // Available options
  availableCards: Card[];
  availableCategories: string[];
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Actions
  setUserId: (userId: number) => void;
  fetchUserPreferences: () => Promise<void>;
  fetchUserCards: () => Promise<void>;
  fetchAvailableCards: () => Promise<void>;
  fetchAvailableCategories: () => Promise<void>;
  
  // Preference updates
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  setPreferredCategories: (categories: string[]) => Promise<void>;
  setPreferredZones: (zones: string[]) => Promise<void>;
  setMinDiscountPercentage: (percentage: number) => Promise<void>;
  setNotificationSettings: (settings: { notifyNewPromotions?: boolean; notifyExpiringSoon?: boolean }) => Promise<void>;
  
  // Card management
  addUserCard: (cardId: number) => Promise<void>;
  removeUserCard: (cardId: number) => Promise<void>;
  toggleUserCard: (cardId: number, isSelected: boolean) => Promise<void>;
  
  // My promotions
  myPromotions: any[];
  fetchMyPromotions: () => Promise<void>;
  
  // Helper
  hasCard: (cardId: number) => boolean;
  isCategoryPreferred: (category: string) => boolean;
}

export const useUserPreferencesStore = create<UserPreferencesState>((set, get) => ({
  userId: null,
  userCards: [],
  preferences: null,
  availableCards: [],
  availableCategories: [],
  isLoading: false,
  isSaving: false,
  error: null,
  myPromotions: [],

  setUserId: (userId: number) => {
    set({ userId });
    // Load user data when userId is set
    get().fetchUserPreferences();
    get().fetchUserCards();
  },

  fetchUserPreferences: async () => {
    const { userId } = get();
    if (!userId) return;

    set({ isLoading: true, error: null });
    try {
      const preferences = await api.getUserPreferences(String(userId));
      set({ preferences, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch preferences',
        isLoading: false 
      });
    }
  },

  fetchUserCards: async () => {
    const { userId } = get();
    if (!userId) return;

    set({ isLoading: true, error: null });
    try {
      const userCards = await api.getUserCards(userId);
      set({ userCards, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user cards',
        isLoading: false 
      });
    }
  },

  fetchAvailableCards: async () => {
    try {
      const cards = await api.getCards();
      set({ availableCards: cards });
    } catch (error) {
      console.error('Failed to fetch available cards:', error);
    }
  },

  fetchAvailableCategories: async () => {
    try {
      const categories = await api.getCategories();
      set({ availableCategories: categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  updatePreferences: async (data: Partial<UserPreferences>) => {
    const { userId, preferences } = get();
    if (!userId || !preferences) return;

    set({ isSaving: true, error: null });
    try {
      const updated = await api.updateUserPreferences(userId, data);
      set({ preferences: updated, isSaving: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update preferences',
        isSaving: false 
      });
    }
  },

  setPreferredCategories: async (categories: string[]) => {
    await get().updatePreferences({ preferredCategories: categories });
  },

  setPreferredZones: async (zones: string[]) => {
    await get().updatePreferences({ preferredZones: zones });
  },

  setMinDiscountPercentage: async (percentage: number) => {
    await get().updatePreferences({ minDiscountPercentage: percentage });
  },

  setNotificationSettings: async (settings) => {
    await get().updatePreferences(settings);
  },

  addUserCard: async (cardId: number) => {
    const { userId } = get();
    if (!userId) return;

    set({ isSaving: true, error: null });
    try {
      await api.addUserCard(userId, cardId);
      await get().fetchUserCards();
      set({ isSaving: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add card',
        isSaving: false 
      });
    }
  },

  removeUserCard: async (cardId: number) => {
    const { userId } = get();
    if (!userId) return;

    set({ isSaving: true, error: null });
    try {
      await api.removeUserCard(userId, cardId);
      await get().fetchUserCards();
      set({ isSaving: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove card',
        isSaving: false 
      });
    }
  },

  toggleUserCard: async (cardId: number, isSelected: boolean) => {
    if (isSelected) {
      await get().addUserCard(cardId);
    } else {
      await get().removeUserCard(cardId);
    }
  },

  fetchMyPromotions: async () => {
    const { userId } = get();
    if (!userId) return;

    set({ isLoading: true, error: null });
    try {
      const promotions = await api.getMyPromotions(userId);
      set({ myPromotions: promotions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch my promotions',
        isLoading: false 
      });
    }
  },

  hasCard: (cardId: number) => {
    return get().userCards.some(uc => uc.cardId === cardId);
  },

  isCategoryPreferred: (category: string) => {
    const { preferences } = get();
    if (!preferences || !preferences.preferredCategories) return false;
    return preferences.preferredCategories.includes(category);
  },
}));
