import { Router } from 'express';
import { z } from 'zod';
import { NotificationModel } from '../models/Notification';
import { NotificationService } from '../services/NotificationService';

const router = Router();

// GET /api/notifications/:userId - Get user notifications
router.get('/notifications/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { status, limit, offset } = req.query;
    
    const notifications = await NotificationModel.findByUser(userId, {
      status: status as 'read' | 'unread' | 'all' | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/:userId/unread-count - Get unread notification count
router.get('/notifications/:userId/unread-count', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const count = await NotificationModel.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await NotificationModel.markAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/notifications/:userId/read-all - Mark all notifications as read
router.post('/notifications/:userId/read-all', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await NotificationModel.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// GET /api/notifications/:userId/stats - Get notification stats
router.get('/notifications/:userId/stats', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const stats = await NotificationService.getUserNotificationStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
});

// POST /api/notifications/check - Trigger notification check (admin/cron endpoint)
const checkNotificationsSchema = z.object({
  since: z.string().optional(),
  dryRun: z.boolean().optional(),
});

router.post('/notifications/check', async (req, res) => {
  try {
    const result = checkNotificationsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }

    const checkResult = await NotificationService.checkAndNotify(result.data);
    res.json(checkResult);
  } catch (error) {
    console.error('Check notifications error:', error);
    res.status(500).json({ error: 'Failed to check notifications' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/notifications/:id', async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const deleted = await NotificationModel.delete(notificationId);
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
