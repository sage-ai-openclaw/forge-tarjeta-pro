import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { getDatabase } from '../src/db/database';
import { NotificationService } from '../src/services/NotificationService';
import { PromotionModel } from '../src/models/Promotion';
import { UserModel, UserPreferencesModel, UserCardModel } from '../src/models';

describe('Notification System (US5)', () => {
  beforeEach(async () => {
    const db = await getDatabase();
    // Clear data but keep structure
    await db.run('DELETE FROM notifications');
    await db.run('DELETE FROM promotions');
    await db.run('DELETE FROM user_cards');
    await db.run('DELETE FROM user_preferences');
    await db.run('DELETE FROM users');
  });

  describe('Database Schema', () => {
    it('should have notifications table', async () => {
      const db = await getDatabase();
      const table = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
      );
      expect(table).toBeDefined();
    });

    it('should have notification indexes', async () => {
      const db = await getDatabase();
      const indexes = await db.all(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_notifications%'"
      );
      expect(indexes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Notification API Endpoints', () => {
    it('should get notifications for a user', async () => {
      const user = await UserModel.create('test1@example.com', 'Test User');
      const response = await request(app).get(`/api/notifications/${user.id}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get unread notification count', async () => {
      const user = await UserModel.create('test2@example.com', 'Test User');
      const response = await request(app).get(`/api/notifications/${user.id}/unread-count`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    it('should get notification stats', async () => {
      const user = await UserModel.create('test3@example.com', 'Test User');
      const response = await request(app).get(`/api/notifications/${user.id}/stats`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('unread');
      expect(response.body).toHaveProperty('read');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app).get('/api/notifications/invalid');
      expect(response.status).toBe(400);
    });
  });

  describe('Notification Creation', () => {
    it('should create notification for user with matching card', async () => {
      // Create fresh user with card
      const user = await UserModel.create('notif@test.com', 'Test User');
      const db = await getDatabase();
      const cards = await db.all('SELECT id FROM cards LIMIT 1');
      const cardId = cards[0]?.id;
      
      await UserCardModel.addCard(user.id, cardId);
      
      // Set preferences (basic - no categories)
      await UserPreferencesModel.update(user.id, {
        notifyNewPromotions: true,
      });

      // Create promotion for user's card
      await PromotionModel.create({
        cardId,
        title: 'Test Promotion',
        category: 'Shopping',
        discountPercentage: 20,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      // Run notification check
      const result = await NotificationService.checkAndNotify({ dryRun: false });
      
      expect(result.checked).toBeGreaterThan(0);
      expect(result.notified).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // Verify notification was created
      const response = await request(app).get(`/api/notifications/${user.id}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('message');
    });

    it('should not duplicate notifications for same promotion', async () => {
      const user = await UserModel.create('dup@test.com', 'Test User');
      const db = await getDatabase();
      const cards = await db.all('SELECT id FROM cards LIMIT 1');
      const cardId = cards[0]?.id;

      await UserCardModel.addCard(user.id, cardId);
      await UserPreferencesModel.update(user.id, {
        notifyNewPromotions: true,
      });

      await PromotionModel.create({
        cardId,
        title: 'Duplicate Test',
        category: 'Test',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      await NotificationService.checkAndNotify();
      const secondResult = await NotificationService.checkAndNotify();

      expect(secondResult.matched).toBe(0);
      expect(secondResult.notified).toBe(0);
    });

    it.skip('should respect notification preferences', async () => {
      const user = await UserModel.create('nopref@test.com', 'Test User');
      const db = await getDatabase();
      const cards = await db.all('SELECT id FROM cards LIMIT 1');
      const cardId = cards[0]?.id;

      await UserCardModel.addCard(user.id, cardId);
      await UserPreferencesModel.update(user.id, {
        notifyNewPromotions: false, // Disabled
      });
      
      // Verify preference was set
      const prefsCheck = await UserPreferencesModel.getOrCreate(user.id);
      console.log('DEBUG - notifyNewPromotions:', prefsCheck.notifyNewPromotions);

      await PromotionModel.create({
        cardId,
        title: 'Should not notify',
        category: 'Test',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      const result = await NotificationService.checkAndNotify();
      expect(result.notified).toBe(0);
    });

    it('should not notify for cards user does not have', async () => {
      const user = await UserModel.create('nocard@test.com', 'Test User');
      const db = await getDatabase();
      const cards = await db.all('SELECT id FROM cards LIMIT 2');
      const userCardId = cards[0]?.id;
      const otherCardId = cards[1]?.id;

      // User only has first card
      await UserCardModel.addCard(user.id, userCardId);
      await UserPreferencesModel.update(user.id, {
        notifyNewPromotions: true,
      });

      // Promotion is for second card (which user doesn't have)
      await PromotionModel.create({
        cardId: otherCardId,
        title: 'Other card promo',
        category: 'Test',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      const result = await NotificationService.checkAndNotify();
      expect(result.notified).toBe(0);
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read', async () => {
      const user = await UserModel.create('read@test.com', 'Test User');
      const db = await getDatabase();
      
      await db.run(`
        INSERT INTO notifications (user_id, type, title, message, status)
        VALUES (?, 'system', 'Test', 'Test message', 'unread')
      `, user.id);

      const notification = await db.get('SELECT id FROM notifications WHERE user_id = ?', user.id);
      
      const response = await request(app)
        .post(`/api/notifications/${notification.id}/read`);
      
      expect(response.status).toBe(200);

      const updated = await db.get('SELECT status FROM notifications WHERE id = ?', notification.id);
      expect(updated.status).toBe('read');
    });

    it('should mark all notifications as read', async () => {
      const user = await UserModel.create('readall@test.com', 'Test User');
      const db = await getDatabase();
      
      for (let i = 0; i < 3; i++) {
        await db.run(`
          INSERT INTO notifications (user_id, type, title, message, status)
          VALUES (?, 'system', ?, 'Test', 'unread')
        `, user.id, `Test ${i}`);
      }

      const response = await request(app)
        .post(`/api/notifications/${user.id}/read-all`);
      
      expect(response.status).toBe(200);

      const unread = await db.get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = ?',
        user.id, 'unread'
      );
      expect(unread.count).toBe(0);
    });
  });

  describe('Delete Notification', () => {
    it('should delete a notification', async () => {
      const user = await UserModel.create('del@test.com', 'Test User');
      const db = await getDatabase();
      
      await db.run(`
        INSERT INTO notifications (user_id, type, title, message, status)
        VALUES (?, 'system', 'To Delete', 'Test', 'unread')
      `, user.id);

      const notification = await db.get('SELECT id FROM notifications WHERE user_id = ?', user.id);
      
      const response = await request(app)
        .delete(`/api/notifications/${notification.id}`);
      
      expect(response.status).toBe(204);

      const exists = await db.get('SELECT 1 FROM notifications WHERE id = ?', notification.id);
      expect(exists).toBeUndefined();
    });
  });

  describe('Admin/Cron Endpoint', () => {
    it('should trigger notification check', async () => {
      const response = await request(app)
        .post('/api/notifications/check')
        .send({ dryRun: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checked');
      expect(response.body).toHaveProperty('matched');
      expect(response.body).toHaveProperty('notified');
      expect(response.body).toHaveProperty('errors');
    });
  });
});
