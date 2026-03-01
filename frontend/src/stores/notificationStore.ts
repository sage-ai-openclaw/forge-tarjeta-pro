import { create } from 'zustand';
import { api } from '../api/client';
import type { Notification, NotificationStats } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: (userId: number, options?: { status?: 'read' | 'unread' | 'all'; limit?: number }) => Promise<void>;
  fetchUnreadCount: (userId: number) => Promise<void>;
  fetchStats: (userId: number) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: (userId: number) => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  stats: null,
  isLoading: false,
  error: null,

  fetchNotifications: async (userId: number, options) => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await api.getNotifications(userId, {
        status: options?.status || 'all',
        limit: options?.limit || 50,
      });
      set({ notifications, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchUnreadCount: async (userId: number) => {
    try {
      const { count } = await api.getUnreadNotificationCount(userId);
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  fetchStats: async (userId: number) => {
    try {
      const stats = await api.getNotificationStats(userId);
      set({ stats });
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
    }
  },

  markAsRead: async (notificationId: number) => {
    try {
      await api.markNotificationAsRead(notificationId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, status: 'read', readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  markAllAsRead: async (userId: number) => {
    try {
      await api.markAllNotificationsAsRead(userId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.status === 'unread' ? { ...n, status: 'read', readAt: new Date().toISOString() } : n
        ),
        unreadCount: 0,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteNotification: async (notificationId: number) => {
    try {
      await api.deleteNotification(notificationId);
      const deleted = get().notifications.find((n) => n.id === notificationId);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: deleted?.status === 'unread' 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
