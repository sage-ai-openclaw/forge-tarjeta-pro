import { Router } from 'express';
import { z } from 'zod';
import { UserPreferencesModel, UserCardModel, UserModel } from '../models';
import { PromotionModel } from '../models/Promotion';

const router = Router();

// GET /api/preferences/:userId - Get user preferences
router.get('/preferences/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const preferences = await UserPreferencesModel.getOrCreate(userId);
    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

// POST /api/preferences - Create or update user preferences
const createPreferencesSchema = z.object({
  userId: z.number(),
  preferredCategories: z.array(z.string()).optional(),
  preferredZones: z.array(z.string()).optional(),
  minDiscountPercentage: z.number().min(0).max(100).optional(),
  maxDiscountAmount: z.number().optional(),
  notifyNewPromotions: z.boolean().optional(),
  notifyExpiringSoon: z.boolean().optional(),
});

router.post('/preferences', async (req, res) => {
  try {
    const result = createPreferencesSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }

    const { userId, ...preferencesData } = result.data;
    
    // Ensure user exists
    let user = await UserModel.findById(userId);
    if (!user) {
      // Create a default user if not exists (for demo purposes)
      user = await UserModel.create(`user${userId}@example.com`, `User ${userId}`);
    }

    // Get or create preferences
    await UserPreferencesModel.getOrCreate(userId);
    
    // Update preferences
    const preferences = await UserPreferencesModel.update(userId, preferencesData);
    res.json(preferences);
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({ error: 'Failed to save user preferences' });
  }
});

// PATCH /api/preferences/:userId - Partial update user preferences
const patchPreferencesSchema = z.object({
  preferredCategories: z.array(z.string()).optional(),
  preferredZones: z.array(z.string()).optional(),
  minDiscountPercentage: z.number().min(0).max(100).optional(),
  maxDiscountAmount: z.number().optional(),
  notifyNewPromotions: z.boolean().optional(),
  notifyExpiringSoon: z.boolean().optional(),
});

router.patch('/preferences/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = patchPreferencesSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }

    const preferences = await UserPreferencesModel.update(userId, result.data);
    res.json(preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// GET /api/users/:userId/cards - Get user's cards
router.get('/users/:userId/cards', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const userCards = await UserCardModel.getUserCards(userId);
    res.json(userCards);
  } catch (error) {
    console.error('Get user cards error:', error);
    res.status(500).json({ error: 'Failed to fetch user cards' });
  }
});

// POST /api/users/:userId/cards - Add card to user
const addCardSchema = z.object({
  cardId: z.number(),
});

router.post('/users/:userId/cards', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = addCardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }

    const userCard = await UserCardModel.addCard(userId, result.data.cardId);
    res.status(201).json(userCard);
  } catch (error) {
    console.error('Add user card error:', error);
    res.status(500).json({ error: 'Failed to add card to user' });
  }
});

// DELETE /api/users/:userId/cards/:cardId - Remove card from user
router.delete('/users/:userId/cards/:cardId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const cardId = Number(req.params.cardId);
    
    if (isNaN(userId) || isNaN(cardId)) {
      return res.status(400).json({ error: 'Invalid user ID or card ID' });
    }

    await UserCardModel.removeCard(userId, cardId);
    res.status(204).send();
  } catch (error) {
    console.error('Remove user card error:', error);
    res.status(500).json({ error: 'Failed to remove card from user' });
  }
});

// GET /api/users/:userId/promotions - Get promotions filtered by user preferences
router.get('/users/:userId/promotions', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get user preferences
    const preferences = await UserPreferencesModel.getOrCreate(userId);
    
    // Get user's cards
    const userCards = await UserCardModel.getUserCards(userId);
    const userCardIds = userCards.map(uc => uc.cardId);

    // Get all active promotions
    let promotions = await PromotionModel.findAll({ 
      status: 'active',
      validFrom: new Date().toISOString().split('T')[0]
    });

    // Filter by user's cards (if user has cards configured)
    if (userCardIds.length > 0) {
      promotions = promotions.filter(p => userCardIds.includes(p.cardId));
    }

    // Filter by preferred categories
    if (preferences.preferredCategories && preferences.preferredCategories.length > 0) {
      promotions = promotions.filter(p => 
        preferences.preferredCategories!.includes(p.category)
      );
    }

    // Filter by minimum discount percentage
    if (preferences.minDiscountPercentage > 0) {
      promotions = promotions.filter(p => 
        (p.discountPercentage || 0) >= preferences.minDiscountPercentage
      );
    }

    res.json(promotions);
  } catch (error) {
    console.error('Get user promotions error:', error);
    res.status(500).json({ error: 'Failed to fetch user promotions' });
  }
});

// POST /api/users - Create a new user
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

router.post('/users', async (req, res) => {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }

    const existingUser = await UserModel.findByEmail(result.data.email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const user = await UserModel.create(result.data.email, result.data.name);
    
    // Initialize preferences for the new user
    await UserPreferencesModel.getOrCreate(user.id);
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users/:userId - Get user by ID
router.get('/users/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
