import { getDatabase } from '../db/database';
import { PromotionModel } from '../models/Promotion';
import { NotificationModel } from '../models/Notification';
import { UserPreferencesModel, UserCardModel } from '../models';
import type { Promotion, UserPreferences, Notification } from '../types';

export interface NotificationMatch {
  userId: number;
  promotion: Promotion;
  reason: string;
}

export class NotificationService {
  /**
   * Check for new promotions and create notifications for matching users
   */
  static async checkAndNotify(options?: {
    since?: string; // ISO date string
    dryRun?: boolean;
  }): Promise<{
    checked: number;
    matched: number;
    notified: number;
    errors: string[];
  }> {
    const db = await getDatabase();
    const errors: string[] = [];
    
    // Get new promotions since the specified date (or last 24 hours)
    const since = options?.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const newPromotions = await PromotionModel.findAll({
      sortBy: 'created',
      sortOrder: 'desc',
    });
    
    // Filter to only promotions created since the check date
    const recentPromotions = newPromotions.filter(p => 
      new Date(p.createdAt) >= new Date(since)
    );

    let notifiedCount = 0;
    const matches: NotificationMatch[] = [];

    // Get all users
    const users = await db.all('SELECT id FROM users');

    for (const promotion of recentPromotions) {
      for (const user of users) {
        try {
          const userId = user.id;
          
          // Check if user already has a notification for this promotion
          const alreadyNotified = await NotificationModel.hasNotificationForPromotion(
            userId, 
            promotion.id
          );
          
          if (alreadyNotified) {
            continue;
          }

          // Check if promotion matches user preferences
          const match = await this.checkPromotionMatch(userId, promotion);
          
          if (match) {
            matches.push({ userId, promotion, reason: match });
            
            if (!options?.dryRun) {
              await this.createPromotionNotification(userId, promotion, match);
              notifiedCount++;
            }
          }
        } catch (error) {
          errors.push(`Error checking user ${user.id} for promotion ${promotion.id}: ${error}`);
        }
      }
    }

    return {
      checked: recentPromotions.length,
      matched: matches.length,
      notified: notifiedCount,
      errors,
    };
  }

  /**
   * Check if a promotion matches a user's preferences
   */
  static async checkPromotionMatch(
    userId: number, 
    promotion: Promotion
  ): Promise<string | null> {
    // Get user preferences
    const prefs = await UserPreferencesModel.getOrCreate(userId);
    
    // Check if user wants notifications - RESPECT USER PREFERENCE
    if (!prefs.notifyNewPromotions) {
      return null;
    }

    // Get user's cards
    const userCards = await UserCardModel.getUserCards(userId);
    const userCardIds = userCards.map(uc => uc.cardId);

    const matchReasons: string[] = [];

    // Check if promotion applies to user's cards
    // If user has cards configured, only notify about cards they have
    if (userCardIds.length > 0 && !userCardIds.includes(promotion.cardId)) {
      return null; // User doesn't have this card
    }

    // If user has no cards configured, they won't get any notifications
    // (they need to configure their cards first)
    if (userCardIds.length === 0) {
      return null;
    }

    // Check category match
    if (prefs.preferredCategories && prefs.preferredCategories.length > 0) {
      if (prefs.preferredCategories.includes(promotion.category)) {
        matchReasons.push(`Categoría preferida: ${promotion.category}`);
      }
    }

    // Check discount threshold
    if (prefs.minDiscountPercentage > 0) {
      const discount = promotion.discountPercentage || 0;
      if (discount >= prefs.minDiscountPercentage) {
        matchReasons.push(`Descuento del ${discount}% (mínimo: ${prefs.minDiscountPercentage}%)`);
      }
    }

    // If user has no specific preferences set (no categories, no discount threshold),
    // notify about all their card promos
    if ((!prefs.preferredCategories || prefs.preferredCategories.length === 0) && prefs.minDiscountPercentage === 0) {
      matchReasons.push('Nueva promoción disponible');
    }

    return matchReasons.length > 0 ? matchReasons.join(', ') : null;
  }

  /**
   * Create a notification for a promotion
   */
  static async createPromotionNotification(
    userId: number, 
    promotion: Promotion,
    reason: string
  ): Promise<Notification> {
    const title = promotion.discountPercentage 
      ? `¡${promotion.discountPercentage}% de descuento en ${promotion.merchantName || promotion.category}!`
      : `¡Nueva promoción en ${promotion.merchantName || promotion.category}!`;

    const message = `${promotion.title} con ${promotion.cardName}. ${reason}`;

    return await NotificationModel.create({
      userId,
      promotionId: promotion.id,
      type: 'new_promotion',
      title,
      message,
      status: 'unread',
      channel: 'in-app',
    });
  }

  /**
   * Get notification stats for a user
   */
  static async getUserNotificationStats(userId: number): Promise<{
    total: number;
    unread: number;
    read: number;
  }> {
    const db = await getDatabase();
    
    const total = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
      userId
    );
    
    const unread = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = ?',
      userId, 'unread'
    );
    
    const read = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = ?',
      userId, 'read'
    );

    return {
      total: total?.count || 0,
      unread: unread?.count || 0,
      read: read?.count || 0,
    };
  }
}
