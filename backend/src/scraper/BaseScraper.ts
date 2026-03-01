export interface ScrapedPromotion {
  title: string;
  description?: string;
  category: string;
  discountPercentage?: number;
  discountAmount?: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  daysOfWeek?: string;
  merchantName?: string;
  merchantAddress?: string;
  sourceUrl?: string;
  cardName?: string; // Used to match with existing cards
}

export interface ScraperResult {
  bankName: string;
  success: boolean;
  promotionsScraped: number;
  promotionsAdded: number;
  promotionsDuplicate: number;
  error?: string;
  durationMs: number;
}

export interface ScraperConfig {
  name: string;
  bankId: number;
  baseUrl?: string;
  enabled: boolean;
  schedule?: string; // Cron expression for future scheduler
}

export abstract class BaseScraper {
  protected config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  get bankId(): number {
    return this.config.bankId;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Main method to scrape promotions from a bank
   * Must be implemented by each bank-specific scraper
   */
  abstract scrape(): Promise<ScrapedPromotion[]>;

  /**
   * Normalize a scraped promotion for consistent storage
   */
  protected normalizePromotion(promotion: ScrapedPromotion): ScrapedPromotion {
    return {
      ...promotion,
      title: promotion.title.trim(),
      merchantName: promotion.merchantName?.trim(),
      category: promotion.category.toLowerCase().trim(),
    };
  }

  /**
   * Generate a unique key for duplicate detection
   * Based on: title + merchant + valid_until
   */
  generateDuplicateKey(promotion: ScrapedPromotion): string {
    const title = promotion.title.toLowerCase().trim();
    const merchant = (promotion.merchantName || '').toLowerCase().trim();
    const validUntil = promotion.validUntil;
    return `${title}|${merchant}|${validUntil}`;
  }
}
