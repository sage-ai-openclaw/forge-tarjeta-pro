import { Router } from 'express';
import { z } from 'zod';
import { PromotionModel } from '../models/Promotion';
import { BankModel, CardModel } from '../models';
import scraperRoutes from './scraper';

const router = Router();

// Mount scraper routes
router.use(scraperRoutes);

// GET /api/banks - List all banks
router.get('/banks', async (_req, res) => {
  try {
    const banks = await BankModel.findAll();
    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

// GET /api/cards - List all cards
router.get('/cards', async (req, res) => {
  try {
    const { bankId } = req.query;
    let cards;
    if (bankId) {
      cards = await CardModel.findByBank(Number(bankId));
    } else {
      cards = await CardModel.findAll();
    }
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// POST /api/cards - Create a new card
const createCardSchema = z.object({
  bankId: z.number(),
  name: z.string().min(1),
  type: z.enum(['credit', 'debit']),
});

router.post('/cards', async (req, res) => {
  try {
    const result = createCardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }
    
    const card = await CardModel.create(result.data.bankId, result.data.name, result.data.type);
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// GET /api/promotions - List promotions
router.get('/promotions', async (req, res) => {
  try {
    const { category, status, cardId } = req.query;
    const promotions = await PromotionModel.findAll({
      category: category as string,
      status: status as string,
      cardId: cardId ? Number(cardId) : undefined,
    });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// GET /api/promotions/search - Search promotions
router.get('/promotions/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const promotions = await PromotionModel.search(q);
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search promotions' });
  }
});

// GET /api/promotions/:id - Get single promotion
router.get('/promotions/:id', async (req, res) => {
  try {
    const promotion = await PromotionModel.findById(Number(req.params.id));
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch promotion' });
  }
});

// POST /api/promotions - Create promotion
const createPromotionSchema = z.object({
  cardId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  discountPercentage: z.number().optional(),
  discountAmount: z.number().optional(),
  maxDiscountAmount: z.number().optional(),
  validFrom: z.string(),
  validUntil: z.string(),
  daysOfWeek: z.string().optional(),
  merchantName: z.string().optional(),
  merchantAddress: z.string().optional(),
  sourceUrl: z.string().optional(),
});

router.post('/promotions', async (req, res) => {
  try {
    const result = createPromotionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }
    
    const promotion = await PromotionModel.create(result.data);
    res.status(201).json(promotion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// DELETE /api/promotions/:id
router.delete('/promotions/:id', async (req, res) => {
  try {
    await PromotionModel.delete(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

export default router;
