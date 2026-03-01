import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { initializeDatabase, getDatabase } from '../src/db/database';

describe('Dashboard API', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  describe('GET /api/promotions', () => {
    it('should return promotions with default filters', async () => {
      const response = await request(app)
        .get('/api/promotions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter promotions by category', async () => {
      const response = await request(app)
        .get('/api/promotions?category=Restaurantes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter promotions by bankId', async () => {
      const response = await request(app)
        .get('/api/promotions?bankId=1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter promotions by cardType', async () => {
      const response = await request(app)
        .get('/api/promotions?cardType=credit')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should sort promotions by discount', async () => {
      const response = await request(app)
        .get('/api/promotions?sortBy=discount&sortOrder=desc')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should sort promotions by expiration', async () => {
      const response = await request(app)
        .get('/api/promotions?sortBy=expiration&sortOrder=asc')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should search promotions', async () => {
      const response = await request(app)
        .get('/api/promotions?search=restaurante')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/categories', () => {
    it('should return all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/banks', () => {
    it('should return all banks', async () => {
      const response = await request(app)
        .get('/api/banks')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/cards', () => {
    it('should return all cards', async () => {
      const response = await request(app)
        .get('/api/cards')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter cards by bankId', async () => {
      const response = await request(app)
        .get('/api/cards?bankId=1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/promotions/search', () => {
    it('should search promotions with query', async () => {
      const response = await request(app)
        .get('/api/promotions/search?q=descuento')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 if query is missing', async () => {
      await request(app)
        .get('/api/promotions/search')
        .expect(400);
    });
  });
});
