import { getDatabase } from '../db/database';
import type { Promotion, CreatePromotionInput } from '../types';

export class PromotionModel {
  static async create(input: CreatePromotionInput): Promise<Promotion> {
    const db = await getDatabase();
    
    const result = await db.run(`
      INSERT INTO promotions (
        card_id, title, description, category, 
        discount_percentage, discount_amount, max_discount_amount,
        valid_from, valid_until, days_of_week,
        merchant_name, merchant_address, source_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      input.cardId,
      input.title,
      input.description || null,
      input.category,
      input.discountPercentage || null,
      input.discountAmount || null,
      input.maxDiscountAmount || null,
      input.validFrom,
      input.validUntil,
      input.daysOfWeek || null,
      input.merchantName || null,
      input.merchantAddress || null,
      input.sourceUrl || null,
    ]);

    return (await this.findById(result.lastID!))!;
  }

  static async findById(id: number): Promise<Promotion | null> {
    const db = await getDatabase();
    const row = await db.get(`
      SELECT p.*, c.name as card_name, b.name as bank_name
      FROM promotions p
      JOIN cards c ON p.card_id = c.id
      JOIN banks b ON c.bank_id = b.id
      WHERE p.id = ?
    `, id);
    
    if (!row) return null;
    return this.mapRow(row);
  }

  static async findAll(filters?: {
    category?: string;
    status?: string;
    cardId?: number;
    validFrom?: string;
    validUntil?: string;
  }): Promise<Promotion[]> {
    const db = await getDatabase();
    
    let query = `
      SELECT p.*, c.name as card_name, b.name as bank_name
      FROM promotions p
      JOIN cards c ON p.card_id = c.id
      JOIN banks b ON c.bank_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.category) {
      query += ' AND p.category = ?';
      params.push(filters.category);
    }
    if (filters?.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }
    if (filters?.cardId) {
      query += ' AND p.card_id = ?';
      params.push(filters.cardId);
    }
    if (filters?.validFrom) {
      query += ' AND p.valid_until >= ?';
      params.push(filters.validFrom);
    }

    query += ' ORDER BY p.valid_until ASC';

    const rows = await db.all(query, params);
    return rows.map(row => this.mapRow(row));
  }

  static async search(query: string): Promise<Promotion[]> {
    const db = await getDatabase();
    const searchTerm = `%${query}%`;
    
    const rows = await db.all(`
      SELECT p.*, c.name as card_name, b.name as bank_name
      FROM promotions p
      JOIN cards c ON p.card_id = c.id
      JOIN banks b ON c.bank_id = b.id
      WHERE p.status = 'active'
      AND (
        p.title LIKE ? OR
        p.description LIKE ? OR
        p.merchant_name LIKE ? OR
        p.category LIKE ?
      )
      ORDER BY p.discount_percentage DESC NULLS LAST
    `, [searchTerm, searchTerm, searchTerm, searchTerm]);

    return rows.map(row => this.mapRow(row));
  }

  static async updateStatus(id: number, status: Promotion['status']): Promise<void> {
    const db = await getDatabase();
    await db.run(`
      UPDATE promotions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, status, id);
  }

  static async delete(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM promotions WHERE id = ?', id);
    return result.changes! > 0;
  }

  private static mapRow(row: any): Promotion {
    return {
      id: row.id,
      cardId: row.card_id,
      cardName: row.card_name,
      bankName: row.bank_name,
      title: row.title,
      description: row.description,
      category: row.category,
      discountPercentage: row.discount_percentage,
      discountAmount: row.discount_amount,
      maxDiscountAmount: row.max_discount_amount,
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      daysOfWeek: row.days_of_week,
      merchantName: row.merchant_name,
      merchantAddress: row.merchant_address,
      sourceUrl: row.source_url,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
