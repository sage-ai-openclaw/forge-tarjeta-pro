import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Tarjeta Pro API - User Preferences (US4)', () => {
  
  // Helper to create unique user for each test
  const createTestUser = async () => {
    const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
    const res = await request(app)
      .post('/api/users')
      .send({ email: uniqueEmail, name: 'Test User' });
    return { ...res.body, email: uniqueEmail };
  };

  describe('GET /api/preferences/:userId', () => {
    it('should return user preferences (creates default if not exists)', async () => {
      const user = await createTestUser();
      const response = await request(app).get(`/api/preferences/${user.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('userId', user.id);
      expect(response.body).toHaveProperty('preferredCategories');
      expect(response.body).toHaveProperty('minDiscountPercentage');
      expect(response.body).toHaveProperty('notifyNewPromotions');
      expect(response.body).toHaveProperty('notifyExpiringSoon');
    });

    it('should reject invalid user ID', async () => {
      const response = await request(app).get('/api/preferences/invalid');
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/preferences/:userId', () => {
    it('should update user preferences', async () => {
      const user = await createTestUser();
      
      const updateData = {
        preferredCategories: ['Restaurantes', 'Shopping'],
        preferredZones: ['Asunción', 'San Lorenzo'],
        minDiscountPercentage: 15,
        notifyNewPromotions: true,
        notifyExpiringSoon: false,
      };

      const response = await request(app)
        .patch(`/api/preferences/${user.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.minDiscountPercentage).toBe(updateData.minDiscountPercentage);
      expect(response.body.notifyNewPromotions).toBe(updateData.notifyNewPromotions);
      expect(response.body.notifyExpiringSoon).toBe(updateData.notifyExpiringSoon);
    });

    it('should validate minDiscountPercentage range', async () => {
      const user = await createTestUser();
      const response = await request(app)
        .patch(`/api/preferences/${user.id}`)
        .send({ minDiscountPercentage: 150 });

      expect(response.status).toBe(400);
    });
  });

  describe('User Cards Management', () => {
    it('should return empty user cards initially', async () => {
      const user = await createTestUser();
      const response = await request(app).get(`/api/users/${user.id}/cards`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('should add a card to user', async () => {
      const user = await createTestUser();
      
      // First get available cards
      const cardsRes = await request(app).get('/api/cards');
      expect(cardsRes.body.length).toBeGreaterThan(0);
      
      const cardId = cardsRes.body[0].id;

      const response = await request(app)
        .post(`/api/users/${user.id}/cards`)
        .send({ cardId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId', user.id);
      expect(response.body).toHaveProperty('cardId', cardId);
    });

    it('should return user cards after adding', async () => {
      const user = await createTestUser();
      
      // Get a card to add
      const cardsRes = await request(app).get('/api/cards');
      const cardId = cardsRes.body[0].id;
      
      // Add the card
      await request(app)
        .post(`/api/users/${user.id}/cards`)
        .send({ cardId });

      // Get user's cards
      const response = await request(app).get(`/api/users/${user.id}/cards`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('card');
      expect(response.body[0].card).toHaveProperty('bankName');
    });

    it('should remove a card from user', async () => {
      const user = await createTestUser();
      
      // Get a card
      const cardsRes = await request(app).get('/api/cards');
      const cardId = cardsRes.body[0].id;
      
      // Add the card
      await request(app)
        .post(`/api/users/${user.id}/cards`)
        .send({ cardId });

      // Remove the card
      const response = await request(app)
        .delete(`/api/users/${user.id}/cards/${cardId}`);

      expect(response.status).toBe(204);

      // Verify card is removed
      const verifyRes = await request(app).get(`/api/users/${user.id}/cards`);
      expect(verifyRes.body.find((c: any) => c.cardId === cardId)).toBeUndefined();
    });

    it('should reject invalid card ID', async () => {
      const user = await createTestUser();
      const response = await request(app)
        .post(`/api/users/${user.id}/cards`)
        .send({ cardId: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/:userId/promotions', () => {
    it('should return promotions filtered by user preferences', async () => {
      const user = await createTestUser();
      const response = await request(app).get(`/api/users/${user.id}/promotions`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      // Each promotion should be active
      response.body.forEach((promo: any) => {
        expect(promo.status).toBe('active');
      });
    });

    it('should filter by min discount percentage', async () => {
      const user = await createTestUser();
      
      // Set min discount to 20%
      await request(app)
        .patch(`/api/preferences/${user.id}`)
        .send({ minDiscountPercentage: 20 });

      const response = await request(app).get(`/api/users/${user.id}/promotions`);
      
      expect(response.status).toBe(200);
      // All returned promotions should have discount >= 20
      response.body.forEach((promo: any) => {
        expect(promo.discountPercentage || 0).toBeGreaterThanOrEqual(20);
      });
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user with preferences', async () => {
      const newUser = {
        email: `newuser_${Date.now()}@example.com`,
        name: 'New Test User',
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', newUser.email);
      expect(response.body).toHaveProperty('name', newUser.name);

      // Verify preferences were created
      const prefsRes = await request(app).get(`/api/preferences/${response.body.id}`);
      expect(prefsRes.status).toBe(200);
      expect(prefsRes.body).toHaveProperty('userId', response.body.id);
    });

    it('should reject duplicate email', async () => {
      const uniqueEmail = `duplicate_${Date.now()}@example.com`;
      
      // Create first user
      await request(app)
        .post('/api/users')
        .send({ email: uniqueEmail, name: 'First User' });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .send({ email: uniqueEmail, name: 'Duplicate User' });

      expect(response.status).toBe(409);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should return user by ID', async () => {
      const user = await createTestUser();
      const response = await request(app).get(`/api/users/${user.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', user.id);
      expect(response.body).toHaveProperty('email', user.email);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/999999');
      expect(response.status).toBe(404);
    });
  });
});
