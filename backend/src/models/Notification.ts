import { getDatabase } from '../db/database';
import type { Notification, CreateNotificationInput } from '../types';

export class NotificationModel {
  static async create(input: CreateNotificationInput): Promise<Notification> {
    const db = await getDatabase();
    
    const result = await db.run(`
      INSERT INTO notifications (
        user_id, promotion_id, type, title, message, status, channel, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      input.userId,
      input.promotionId,
      input.type,
      input.title,
      input.message,
      input.status || 'unread',
      input.channel || 'in-app',
      input.sentAt || new Date().toISOString(),
    ]);

    return (await this.findById(result.lastID!))!;
  }

  static async findById(id: number): Promise<Notification | null> {
    const db = await getDatabase();
    const row = await db.get(`
      SELECT n.*, p.title as promotion_title, p.discount_percentage as promotion_discount
      FROM notifications n
      LEFT JOIN promotions p ON n.promotion_id = p.id
      WHERE n.id = ?
    `, id);
    
    if (!row) return null;
    return this.mapRow(row);
  }

  static async findByUser(userId: number, options?: {
    status?: 'read' | 'unread' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<Notification[]> {
    const db = await getDatabase();
    
    let query = `
      SELECT n.*, p.title as promotion_title, p.discount_percentage as promotion_discount
      FROM notifications n
      LEFT JOIN promotions p ON n.promotion_id = p.id
      WHERE n.user_id = ?
    `;
    const params: any[] = [userId];

    if (options?.status && options.status !== 'all') {
      query += ' AND n.status = ?';
      params.push(options.status);
    }

    query += ' ORDER BY n.created_at DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = await db.all(query, params);
    return rows.map(row => this.mapRow(row));
  }

  static async getUnreadCount(userId: number): Promise<number> {
    const db = await getDatabase();
    const result = await db.get(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND status = 'unread'
    `, userId);
    return result?.count || 0;
  }

  static async markAsRead(notificationId: number): Promise<void> {
    const db = await getDatabase();
    await db.run(`
      UPDATE notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, notificationId);
  }

  static async markAllAsRead(userId: number): Promise<void> {
    const db = await getDatabase();
    await db.run(`
      UPDATE notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND status = 'unread'
    `, userId);
  }

  static async hasNotificationForPromotion(userId: number, promotionId: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.get(`
      SELECT 1 FROM notifications 
      WHERE user_id = ? AND promotion_id = ?
    `, userId, promotionId);
    return !!result;
  }

  static async delete(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM notifications WHERE id = ?', id);
    return result.changes! > 0;
  }

  private static mapRow(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      promotionId: row.promotion_id,
      type: row.type,
      title: row.title,
      message: row.message,
      status: row.status,
      channel: row.channel,
      sentAt: row.sent_at,
      readAt: row.read_at,
      createdAt: row.created_at,
      promotionTitle: row.promotion_title,
      promotionDiscount: row.promotion_discount,
    };
  }
}
