import { BaseScraper, ScrapedPromotion } from './BaseScraper';

/**
 * Mock scraper for Banco Continental Paraguay
 * Simulates scraping promotions from Continental's website
 */
export class ContinentalScraper extends BaseScraper {
  constructor() {
    super({
      name: 'Banco Continental',
      bankId: 1, // Matches the default bank insertion order
      baseUrl: 'https://www.bancocontinental.com.py/promociones',
      enabled: true,
    });
  }

  async scrape(): Promise<ScrapedPromotion[]> {
    // Simulate network delay
    await this.delay(400);

    // Mock data simulating real promotions from Continental
    const mockPromotions: ScrapedPromotion[] = [
      {
        title: '20% de descuento en gastronomía',
        description: 'Todos los días con tarjeta Continental. Tope Gs. 80.000.',
        category: 'gastronomia',
        discountPercentage: 20,
        maxDiscountAmount: 80000,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(45),
        daysOfWeek: 'todos',
        merchantName: 'Gastronomía Continental',
        sourceUrl: 'https://www.bancocontinental.com.py/promociones/gastronomia',
        cardName: 'Continental Visa',
      },
      {
        title: '50% de descuento en cines',
        description: 'Miércoles de cine Continental. 2 entradas al precio de 1.',
        category: 'entretenimiento',
        discountPercentage: 50,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(90),
        daysOfWeek: 'miércoles',
        merchantName: 'Cines Continental',
        sourceUrl: 'https://www.bancocontinental.com.py/promociones/cine',
        cardName: 'Continental Mastercard Gold',
      },
      {
        title: '15% de descuento en Nafta',
        description: 'Todos los martes en estaciones Petrobras.',
        category: 'combustible',
        discountPercentage: 15,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(60),
        daysOfWeek: 'martes',
        merchantName: 'Petrobras',
        sourceUrl: 'https://www.bancocontinental.com.py/promociones/combustible',
        cardName: 'Continental Débito',
      },
      {
        title: '25% de descuento en spa y bienestar',
        description: 'Válido de lunes a jueves. Reserva previa requerida.',
        category: 'belleza',
        discountPercentage: 25,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(30),
        daysOfWeek: 'lunes,martes,miércoles,jueves',
        merchantName: 'Spa Wellness',
        sourceUrl: 'https://www.bancocontinental.com.py/promociones/belleza',
        cardName: 'Continental Visa Gold',
      },
    ];

    return mockPromotions.map(p => this.normalizePromotion(p));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}
