import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { initializeDatabase, closeDatabase, getDatabase } from '../src/db/database';
import { ItauScraper, BasaScraper, ContinentalScraper } from '../src/scraper';
import { ScraperService } from '../src/scraper/ScraperService';
import { PromotionModel } from '../src/models/Promotion';

describe('Scraper API', () => {
  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    await initializeDatabase();
  });

  beforeEach(async () => {
    // Clear promotions before each test
    const db = await getDatabase();
    await db.run('DELETE FROM promotions');
    await db.run('DELETE FROM scraper_logs');
    await db.run('DELETE FROM scraper_runs');
  });

  describe('GET /api/scraper/banks', () => {
    it('should return list of registered scrapers', async () => {
      const response = await request(app)
        .get('/api/scraper/banks')
        .expect(200);

      expect(response.body.banks).toBeDefined();
      expect(response.body.banks.length).toBeGreaterThanOrEqual(3);
      expect(response.body.banks.some((b: any) => b.name === 'Banco Itaú')).toBe(true);
      expect(response.body.banks.some((b: any) => b.name === 'Banco BASA')).toBe(true);
      expect(response.body.banks.some((b: any) => b.name === 'Banco Continental')).toBe(true);
    });
  });

  describe('POST /api/scraper/run', () => {
    it('should run all scrapers and return results', async () => {
      const response = await request(app)
        .post('/api/scraper/run')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalBanks).toBeGreaterThanOrEqual(3);
      expect(response.body.data.totalAdded).toBeGreaterThanOrEqual(0);
      expect(response.body.data.details).toBeDefined();
      expect(response.body.data.details.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter scrapers by bank name', async () => {
      const response = await request(app)
        .post('/api/scraper/run')
        .send({ banks: ['Banco Itaú'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalBanks).toBe(1);
      expect(response.body.data.details[0].bankName).toBe('Banco Itaú');
    });

    it('should handle duplicate promotions correctly', async () => {
      // First run
      const firstResponse = await request(app)
        .post('/api/scraper/run')
        .send({ banks: ['Banco Itaú'] })
        .expect(200);

      const firstAdded = firstResponse.body.data.totalAdded;
      expect(firstAdded).toBeGreaterThan(0);

      // Second run - should detect duplicates
      const secondResponse = await request(app)
        .post('/api/scraper/run')
        .send({ banks: ['Banco Itaú'] })
        .expect(200);

      expect(secondResponse.body.data.totalAdded).toBe(0);
      expect(secondResponse.body.data.totalDuplicates).toBe(firstAdded);
    });
  });

  describe('GET /api/scraper/history', () => {
    it('should return scraper run history', async () => {
      // Run scraper first
      await request(app)
        .post('/api/scraper/run')
        .send({ banks: ['Banco Itaú'] })
        .expect(200);

      const response = await request(app)
        .get('/api/scraper/history')
        .expect(200);

      expect(response.body.history).toBeDefined();
      expect(response.body.history.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/scraper/history?limit=5')
        .expect(200);

      expect(response.body.history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/scraper/history/:runId/logs', () => {
    it('should return logs for a specific run', async () => {
      // Run scraper first
      const runResponse = await request(app)
        .post('/api/scraper/run')
        .send({ banks: ['Banco Itaú'] })
        .expect(200);

      const runId = runResponse.body.data.runId;

      const response = await request(app)
        .get(`/api/scraper/history/${runId}/logs`)
        .expect(200);

      expect(response.body.logs).toBeDefined();
      expect(response.body.logs.length).toBeGreaterThan(0);
      expect(response.body.logs[0].bank_name).toBeDefined();
    });
  });
});

describe('BaseScraper', () => {
  describe('ItauScraper', () => {
    it('should scrape promotions successfully', async () => {
      const scraper = new ItauScraper();
      const promotions = await scraper.scrape();

      expect(promotions.length).toBeGreaterThan(0);
      expect(promotions[0]).toHaveProperty('title');
      expect(promotions[0]).toHaveProperty('category');
      expect(promotions[0]).toHaveProperty('validFrom');
      expect(promotions[0]).toHaveProperty('validUntil');
    });

    it('should generate consistent duplicate keys', () => {
      const scraper = new ItauScraper();
      const promotion = {
        title: 'Test Promotion',
        category: 'test',
        validFrom: '2024-01-01',
        validUntil: '2024-12-31',
        merchantName: 'Test Merchant',
      };

      const key1 = scraper.generateDuplicateKey(promotion);
      const key2 = scraper.generateDuplicateKey(promotion);
      expect(key1).toBe(key2);
    });
  });

  describe('BasaScraper', () => {
    it('should scrape promotions successfully', async () => {
      const scraper = new BasaScraper();
      const promotions = await scraper.scrape();

      expect(promotions.length).toBeGreaterThan(0);
      expect(promotions[0]).toHaveProperty('title');
      expect(promotions[0]).toHaveProperty('category');
    });
  });

  describe('ContinentalScraper', () => {
    it('should scrape promotions successfully', async () => {
      const scraper = new ContinentalScraper();
      const promotions = await scraper.scrape();

      expect(promotions.length).toBeGreaterThan(0);
      expect(promotions[0]).toHaveProperty('title');
      expect(promotions[0]).toHaveProperty('category');
    });
  });
});

describe('ScraperService', () => {
  let service: ScraperService;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    await initializeDatabase();
  });

  beforeEach(async () => {
    service = new ScraperService();
    service.registerScraper(new ItauScraper());
    service.registerScraper(new BasaScraper());

    // Clear promotions
    const db = await getDatabase();
    await db.run('DELETE FROM promotions');
    await db.run('DELETE FROM scraper_logs');
    await db.run('DELETE FROM scraper_runs');
  });

  it('should register scrapers', () => {
    const scrapers = service.getRegisteredScrapers();
    expect(scrapers.length).toBe(2);
  });

  it('should run all scrapers', async () => {
    const result = await service.runAll();

    expect(result.totalBanks).toBe(2);
    expect(result.successfulBanks).toBe(2);
    expect(result.totalScraped).toBeGreaterThan(0);
    expect(result.details.length).toBe(2);
  });

  it('should filter scrapers by bank name', async () => {
    const result = await service.runAll(['Banco Itaú']);

    expect(result.totalBanks).toBe(1);
    expect(result.details[0].bankName).toBe('Banco Itaú');
  });

  it('should track run history', async () => {
    await service.runAll(['Banco Itaú']);
    const history = await service.getRunHistory();

    expect(history.length).toBeGreaterThan(0);
  });
});
