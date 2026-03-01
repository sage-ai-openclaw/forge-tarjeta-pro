import { BaseScraper, ScrapedPromotion } from './BaseScraper';

/**
 * Mock scraper for Banco BASA Paraguay
 * Simulates scraping promotions from BASA's website
 */
export class BasaScraper extends BaseScraper {
  constructor() {
    super({
      name: 'Banco BASA',
      bankId: 5, // Matches the default bank insertion order
      baseUrl: 'https://www.basa.com.py/beneficios',
      enabled: true,
    });
  }

  async scrape(): Promise<ScrapedPromotion[]> {
    // Simulate network delay
    await this.delay(600);

    // Mock data simulating real promotions from BASA
    const mockPromotions: ScrapedPromotion[] = [
      {
        title: '35% de descuento en restaurantes',
        description: 'De lunes a miércoles con tarjeta BASA. Tope Gs. 150.000.',
        category: 'gastronomia',
        discountPercentage: 35,
        maxDiscountAmount: 150000,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(30),
        daysOfWeek: 'lunes,miércoles',
        merchantName: 'Restaurantes BASA',
        sourceUrl: 'https://www.basa.com.py/beneficios/restaurantes',
        cardName: 'BASA Visa Platinum',
      },
      {
        title: '2x1 en entradas de cine',
        description: 'Válido de lunes a jueves en cines participantes.',
        category: 'entretenimiento',
        discountPercentage: 50,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(45),
        daysOfWeek: 'lunes,martes,miércoles,jueves',
        merchantName: 'Movie Center',
        sourceUrl: 'https://www.basa.com.py/beneficios/cine',
        cardName: 'BASA Mastercard',
      },
      {
        title: '10% de descuento en tiendas de retail',
        description: 'Todos los fines de semana en locales adheridos.',
        category: 'retail',
        discountPercentage: 10,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(60),
        daysOfWeek: 'sábado,domingo',
        merchantName: 'Tiendas Retail',
        sourceUrl: 'https://www.basa.com.py/beneficios/retail',
        cardName: 'BASA Visa',
      },
      {
        title: 'Envío gratis en delivery',
        description: 'Pedidos superiores a Gs. 100.000. Válido todos los días.',
        category: 'delivery',
        discountAmount: 15000,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(30),
        daysOfWeek: 'todos',
        merchantName: 'PedidosYa',
        sourceUrl: 'https://www.basa.com.py/beneficios/delivery',
        cardName: 'BASA Débito',
      },
      {
        title: '20% de descuento en hoteles',
        description: 'Reservas realizadas con tarjeta BASA. Válido todo el año.',
        category: 'turismo',
        discountPercentage: 20,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(365),
        daysOfWeek: 'todos',
        merchantName: 'Hoteles BASA',
        sourceUrl: 'https://www.basa.com.py/beneficios/hoteles',
        cardName: 'BASA Visa Platinum',
      },
      {
        title: '40% de descuento en moda',
        description: 'Último jueves de cada mes en tiendas de ropa seleccionadas.',
        category: 'moda',
        discountPercentage: 40,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: this.getFutureDate(90),
        daysOfWeek: 'jueves',
        merchantName: 'Moda Shop',
        sourceUrl: 'https://www.basa.com.py/beneficios/moda',
        cardName: 'BASA Mastercard',
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
