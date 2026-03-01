import { getDatabase } from '../db/database';
import { BaseScraper, ScraperResult, ScrapedPromotion } from './BaseScraper';
import { PromotionModel } from '../models/Promotion';
import { CardModel } from '../models/index';

export interface ScraperRunResult {
  runId: number;
  startedAt: string;
  completedAt: string;
  totalBanks: number;
  successfulBanks: number;
  totalScraped: number;
  totalAdded: number;
  totalDuplicates: number;
  details: ScraperResult[];
}

export class ScraperService {
  private scrapers: BaseScraper[] = [];

  registerScraper(scraper: BaseScraper): void {
    this.scrapers.push(scraper);
  }

  getRegisteredScrapers(): BaseScraper[] {
    return [...this.scrapers];
  }

  /**
   * Run all registered scrapers
   */
  async runAll(bankFilter?: string[]): Promise<ScraperRunResult> {
    const startedAt = new Date().toISOString();
    const db = await getDatabase();

    // Create a scraper run record
    const runResult = await db.run(
      `INSERT INTO scraper_runs (started_at, status) VALUES (?, ?)`,
      startedAt,
      'running'
    );
    const runId = resultLastId(runResult);

    const results: ScraperResult[] = [];
    let totalScraped = 0;
    let totalAdded = 0;
    let totalDuplicates = 0;
    let successfulBanks = 0;

    // Filter scrapers if bankFilter is provided
    const scrapersToRun = bankFilter 
      ? this.scrapers.filter(s => bankFilter.includes(s.name))
      : this.scrapers.filter(s => s.enabled);

    for (const scraper of scrapersToRun) {
      const result = await this.runScraper(scraper, runId);
      results.push(result);
      
      totalScraped += result.promotionsScraped;
      totalAdded += result.promotionsAdded;
      totalDuplicates += result.promotionsDuplicate;
      
      if (result.success) {
        successfulBanks++;
      }

      // Log individual scraper result
      await db.run(
        `INSERT INTO scraper_logs (run_id, bank_name, success, promotions_scraped, promotions_added, promotions_duplicate, error, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        runId,
        result.bankName,
        result.success ? 1 : 0,
        result.promotionsScraped,
        result.promotionsAdded,
        result.promotionsDuplicate,
        result.error || null,
        result.durationMs
      );
    }

    const completedAt = new Date().toISOString();

    // Update run record
    await db.run(
      `UPDATE scraper_runs SET completed_at = ?, status = ?, total_scraped = ?, total_added = ?, total_duplicates = ? WHERE id = ?`,
      completedAt,
      'completed',
      totalScraped,
      totalAdded,
      totalDuplicates,
      runId
    );

    return {
      runId,
      startedAt,
      completedAt,
      totalBanks: scrapersToRun.length,
      successfulBanks,
      totalScraped,
      totalAdded,
      totalDuplicates,
      details: results,
    };
  }

  /**
   * Run a single scraper and store promotions
   */
  private async runScraper(scraper: BaseScraper, runId: number): Promise<ScraperResult> {
    const startTime = Date.now();
    
    try {
      // Get cards for this bank
      const cards = await CardModel.findByBank(scraper.bankId);
      
      if (cards.length === 0) {
        return {
          bankName: scraper.name,
          success: false,
          promotionsScraped: 0,
          promotionsAdded: 0,
          promotionsDuplicate: 0,
          error: 'No cards found for this bank',
          durationMs: Date.now() - startTime,
        };
      }

      // Scrape promotions
      const scrapedPromotions = await scraper.scrape();
      
      // Process and store promotions
      let added = 0;
      let duplicates = 0;

      for (const promotion of scrapedPromotions) {
        // Find matching card
        const card = cards.find(c => 
          promotion.cardName?.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(promotion.cardName?.toLowerCase() || '')
        ) || cards[0]; // Default to first card if no match

        // Check for duplicates
        const isDuplicate = await this.isDuplicate(promotion, scraper);
        
        if (isDuplicate) {
          duplicates++;
          continue;
        }

        // Store promotion
        try {
          await PromotionModel.create({
            cardId: card.id,
            title: promotion.title,
            description: promotion.description,
            category: promotion.category,
            discountPercentage: promotion.discountPercentage,
            discountAmount: promotion.discountAmount,
            maxDiscountAmount: promotion.maxDiscountAmount,
            validFrom: promotion.validFrom,
            validUntil: promotion.validUntil,
            daysOfWeek: promotion.daysOfWeek,
            merchantName: promotion.merchantName,
            merchantAddress: promotion.merchantAddress,
            sourceUrl: promotion.sourceUrl,
          });
          added++;
        } catch (err) {
          console.error(`Failed to store promotion: ${promotion.title}`, err);
        }
      }

      return {
        bankName: scraper.name,
        success: true,
        promotionsScraped: scrapedPromotions.length,
        promotionsAdded: added,
        promotionsDuplicate: duplicates,
        durationMs: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        bankName: scraper.name,
        success: false,
        promotionsScraped: 0,
        promotionsAdded: 0,
        promotionsDuplicate: 0,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if a promotion already exists (duplicate detection)
   * Based on: title + merchant + valid_until
   */
  private async isDuplicate(promotion: ScrapedPromotion, scraper: BaseScraper): Promise<boolean> {
    const db = await getDatabase();
    
    // Generate duplicate key
    const duplicateKey = scraper.generateDuplicateKey(promotion);
    const [title, merchant, validUntil] = duplicateKey.split('|');

    const existing = await db.get(
      `SELECT id FROM promotions 
       WHERE LOWER(TRIM(title)) = ? 
       AND LOWER(TRIM(COALESCE(merchant_name, ''))) = ?
       AND valid_until = ?
       AND card_id IN (SELECT id FROM cards WHERE bank_id = ?)`,
      title,
      merchant,
      validUntil,
      scraper.bankId
    );

    return !!existing;
  }

  /**
   * Get scraper run history
   */
  async getRunHistory(limit: number = 10): Promise<any[]> {
    const db = await getDatabase();
    return db.all(
      `SELECT * FROM scraper_runs ORDER BY started_at DESC LIMIT ?`,
      limit
    );
  }

  /**
   * Get logs for a specific run
   */
  async getRunLogs(runId: number): Promise<any[]> {
    const db = await getDatabase();
    return db.all(
      `SELECT * FROM scraper_logs WHERE run_id = ? ORDER BY created_at ASC`,
      runId
    );
  }

  /**
   * Initialize database tables for scraper tracking
   */
  static async initializeTables(): Promise<void> {
    const db = await getDatabase();

    await db.exec(`
      CREATE TABLE IF NOT EXISTS scraper_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        status TEXT DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
        total_scraped INTEGER DEFAULT 0,
        total_added INTEGER DEFAULT 0,
        total_duplicates INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS scraper_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        bank_name TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        promotions_scraped INTEGER DEFAULT 0,
        promotions_added INTEGER DEFAULT 0,
        promotions_duplicate INTEGER DEFAULT 0,
        error TEXT,
        duration_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES scraper_runs(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_scraper_logs_run ON scraper_logs(run_id)`);
  }
}

// Helper function to get lastID from result
function resultLastId(result: { lastID?: number }): number {
  return result.lastID || 0;
}
