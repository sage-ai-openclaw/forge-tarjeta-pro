import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { CardModel } from '../src/models';

describe('Tarjeta Pro API (US1)', () => {
  describe('GET /api/banks', () => {
    it('should return list of banks', async () => {
      const response = await request(app).get('/api/banks');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/cards', () => {
    it('should return empty array initially', async () => {
      const response = await request(app).get('/api/cards');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should create and return cards', async () => {
      // Get first bank
      const banksRes = await request(app).get('/api/banks');
      const bankId = banksRes.body[0].id;

      // Create a card
      const createRes = await request(app)
        .post('/api/cards')
        .send({ bankId, name: 'Visa Gold', type: 'credit' });
      
      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Visa Gold');

      // List cards
      const listRes = await request(app).get('/api/cards');
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].bankName).toBeDefined();
    });
  });

  describe('POST /api/promotions', () => {
    it('should create a promotion', async () => {
      // Setup: create a card first
      const banksRes = await request(app).get('/api/banks');
      const cardRes = await request(app)
        .post('/api/cards')
        .send({ bankId: banksRes.body[0].id, name: 'Test Card', type: 'credit' });
      
      const cardId = cardRes.body.id;

      const promotionData = {
        cardId,
        title: '20% de descuento en restaurantes',
        description: 'Válido todos los días',
        category: 'Restaurantes',
        discountPercentage: 20,
        validFrom: '2026-03-01',
        validUntil: '2026-03-31',
        merchantName: 'Restaurante Ejemplo',
      };

      const response = await request(app)
        .post('/api/promotions')
        .send(promotionData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(promotionData.title);
      expect(response.body.discountPercentage).toBe(20);
      expect(response.body.status).toBe('active');
    });

    it('should reject invalid promotion data', async () => {
      const response = await request(app)
        .post('/api/promotions')
        .send({ title: 'Test' }); // Missing required fields

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/promotions', () => {
    it('should return promotions list', async () => {
      const response = await request(app).get('/api/promotions');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/promotions/search', () => {
    it('should search promotions', async () => {
      const response = await request(app).get('/api/promotions/search?q=restaurante');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should require search query', async () => {
      const response = await request(app).get('/api/promotions/search');
      expect(response.status).toBe(400);
    });
  });
});
