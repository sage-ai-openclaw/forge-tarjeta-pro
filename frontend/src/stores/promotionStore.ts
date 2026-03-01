import { create } from 'zustand';
import type { Promotion, Bank, Card, PromotionFilters } from '../types';
import { api } from '../api/client';

interface PromotionState {
  promotions: Promotion[];
  filteredPromotions: Promotion[];
  banks: Bank[];
  cards: Card[];
  categories: string[];
  filters: PromotionFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPromotions: () => Promise<void>;
  fetchBanks: () => Promise<void>;
  fetchCards: (bankId?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  setFilters: (filters: Partial<PromotionFilters>) => void;
  resetFilters: () => void;
  searchPromotions: (query: string) => Promise<void>;
}

const defaultFilters: PromotionFilters = {
  status: 'active',
  sortBy: 'expiration',
  sortOrder: 'asc',
};

export const usePromotionStore = create<PromotionState>((set, get) => ({
  promotions: [],
  filteredPromotions: [],
  banks: [],
  cards: [],
  categories: [],
  filters: defaultFilters,
  isLoading: false,
  error: null,

  fetchPromotions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const promotions = await api.getPromotions(filters);
      set({ promotions, filteredPromotions: promotions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch promotions', 
        isLoading: false 
      });
    }
  },

  fetchBanks: async () => {
    try {
      const banks = await api.getBanks();
      set({ banks });
    } catch (error) {
      console.error('Failed to fetch banks:', error);
    }
  },

  fetchCards: async (bankId?: number) => {
    try {
      const cards = await api.getCards(bankId);
      set({ cards });
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await api.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // Auto-fetch when filters change
    get().fetchPromotions();
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().fetchPromotions();
  },

  searchPromotions: async (query) => {
    if (!query.trim()) {
      get().fetchPromotions();
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const promotions = await api.searchPromotions(query);
      set({ promotions, filteredPromotions: promotions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search promotions', 
        isLoading: false 
      });
    }
  },
}));
