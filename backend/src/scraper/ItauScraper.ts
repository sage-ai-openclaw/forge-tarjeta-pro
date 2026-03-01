import { BaseScraper, ScrapedPromotion } from './BaseScraper';

/**
 * Mock scraper for Banco Itaú Paraguay
 * Simulates scraping promotions from Itaú's website
 */
export class ItauScraper extends BaseScraper {
  constructor() {
    super({
      name: 'Banco Itaú',
      bankId: 3, // Matches the default bank insertion order
      baseUrl: 'https://www.itau.com.py/promociones',
      enabled: true,
    });
  }

  async scrape(): Promise<ScrapedPromotion[]> {
    // Simulate network delay
    await this.delay(500);

    // Mock data simulating real promotions from Itaú
    const mockPromotions: ScrapedPromotion[] = [
      {
        title: '25% de descuento en restaurantes seleccionados',
        description: 'Válido de lunes a jueves en restaurantes participantes. Tope de descuento Gs. 100.000.',
        category: 'gastronomia',
        discountPercentage: 25,
        maxDiscountAmount: 100000,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(30),
        daysOfWeek: 'lunes,martes,miércoles,jueves',
        merchantName: 'Restaurantes Itaú',
        sourceUrl: 'https://www.itau.com.py/promociones/restaurantes',
        cardName: 'Itaú Visa',
      },
      {
        title: '3x2 en cines',
        description: 'Pagando con tarjeta de crédito Itaú. Válido todos los días.',
        category: 'entretenimiento',
        discountPercentage: 33,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(60),
        daysOfWeek: 'todos',
        merchantName: 'Cines Itaú',
        sourceUrl: 'https://www.itau.com.py/promociones/cines',
        cardName: 'Itaú Mastercard',
      },
      {
        title: '15% de descuento en supermercados',
        description: 'Todos los sábados del mes. Tope de descuento Gs. 50.000 por compra.',
        category: 'supermercados',
        discountPercentage: 15,
        maxDiscountAmount: 50000,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(30),
        daysOfWeek: 'sábado',
        merchantName: 'Supermercados Itaú',
        sourceUrl: 'https://www.itau.com.py/promociones/supermercados',
        cardName: 'Itaú Visa',
      },
      {
        title: '20% off en combustible',
        description: 'Válido en estaciones de servicio Shell todos los días.',
        category: 'combustible',
        discountPercentage: 20,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(45),
        daysOfWeek: 'todos',
        merchantName: 'Shell',
        sourceUrl: 'https://www.itau.com.py/promociones/combustible',
        cardName: 'Itaú Débito',
      },
      {
        title: '30% de descuento en farmacias',
        description: 'Exclusivo martes y jueves. Válido en farmacias participantes.',
        category: 'salud',
        discountPercentage: 30,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(90),
        daysOfWeek: 'martes,jueves',
        merchantName: 'Farmacias Unidos',
        sourceUrl: 'https://www.itau.com.py/promociones/farmacias',
        cardName: 'Itaú Visa',
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
