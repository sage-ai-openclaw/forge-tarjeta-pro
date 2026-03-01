import { getDatabase } from '../db/database';
import type { Bank, Card, User, UserCard, UserPreferences } from '../types';

export class BankModel {
  static async findAll(): Promise<Bank[]> {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM banks ORDER BY name');
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      website: row.website,
      createdAt: row.created_at,
    }));
  }

  static async findById(id: number): Promise<Bank | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM banks WHERE id = ?', id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      website: row.website,
      createdAt: row.created_at,
    };
  }
}

export class CardModel {
  static async findAll(): Promise<Card[]> {
    const db = await getDatabase();
    const rows = await db.all(`
      SELECT c.*, b.name as bank_name
      FROM cards c
      JOIN banks b ON c.bank_id = b.id
      ORDER BY b.name, c.name
    `);
    return rows.map(row => ({
      id: row.id,
      bankId: row.bank_id,
      bankName: row.bank_name,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
    }));
  }

  static async findByBank(bankId: number): Promise<Card[]> {
    const db = await getDatabase();
    const rows = await db.all(`
      SELECT c.*, b.name as bank_name
      FROM cards c
      JOIN banks b ON c.bank_id = b.id
      WHERE c.bank_id = ?
      ORDER BY c.name
    `, bankId);
    return rows.map(row => ({
      id: row.id,
      bankId: row.bank_id,
      bankName: row.bank_name,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
    }));
  }

  static async create(bankId: number, name: string, type: 'credit' | 'debit'): Promise<Card> {
    const db = await getDatabase();
    const result = await db.run(
      'INSERT INTO cards (bank_id, name, type) VALUES (?, ?, ?)',
      bankId, name, type
    );
    return (await this.findById(result.lastID!))!;
  }

  static async findById(id: number): Promise<Card | null> {
    const db = await getDatabase();
    const row = await db.get(`
      SELECT c.*, b.name as bank_name
      FROM cards c
      JOIN banks b ON c.bank_id = b.id
      WHERE c.id = ?
    `, id);
    if (!row) return null;
    return {
      id: row.id,
      bankId: row.bank_id,
      bankName: row.bank_name,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
    };
  }
}

export class UserModel {
  static async create(email: string, name?: string): Promise<User> {
    const db = await getDatabase();
    const result = await db.run(
      'INSERT INTO users (email, name) VALUES (?, ?)',
      email, name || null
    );
    return (await this.findById(result.lastID!))!;
  }

  static async findById(id: number): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM users WHERE id = ?', id);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  }
}

export class UserCardModel {
  static async addCard(userId: number, cardId: number): Promise<UserCard> {
    const db = await getDatabase();
    const result = await db.run(
      'INSERT OR IGNORE INTO user_cards (user_id, card_id) VALUES (?, ?)',
      userId, cardId
    );
    return {
      id: result.lastID as number,
      userId,
      cardId,
      createdAt: new Date().toISOString(),
    };
  }

  static async getUserCards(userId: number): Promise<UserCard[]> {
    const db = await getDatabase();
    const rows = await db.all(`
      SELECT uc.*, c.name as card_name, c.type as card_type,
             b.name as bank_name, b.id as bank_id
      FROM user_cards uc
      JOIN cards c ON uc.card_id = c.id
      JOIN banks b ON c.bank_id = b.id
      WHERE uc.user_id = ?
    `, userId);
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      cardId: row.card_id,
      card: {
        id: row.card_id,
        name: row.card_name,
        type: row.card_type,
        bankId: row.bank_id,
        bankName: row.bank_name,
        createdAt: row.created_at,
      },
      createdAt: row.created_at,
    }));
  }

  static async removeCard(userId: number, cardId: number): Promise<void> {
    const db = await getDatabase();
    await db.run(
      'DELETE FROM user_cards WHERE user_id = ? AND card_id = ?',
      userId, cardId
    );
  }
}

export class UserPreferencesModel {
  static async getOrCreate(userId: number): Promise<UserPreferences> {
    const db = await getDatabase();
    let prefs = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', userId);
    
    if (!prefs) {
      await db.run(`
        INSERT INTO user_preferences (user_id) VALUES (?)
      `, userId);
      prefs = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', userId);
    }

    return this.mapRow(prefs);
  }

  static async update(userId: number, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const db = await getDatabase();
    
    const updates: string[] = [];
    const values: any[] = [];

    if (data.preferredCategories !== undefined) {
      updates.push('preferred_categories = ?');
      values.push(JSON.stringify(data.preferredCategories));
    }
    if (data.preferredZones !== undefined) {
      updates.push('preferred_zones = ?');
      values.push(JSON.stringify(data.preferredZones));
    }
    if (data.minDiscountPercentage !== undefined) {
      updates.push('min_discount_percentage = ?');
      values.push(data.minDiscountPercentage);
    }
    if (data.maxDiscountAmount !== undefined) {
      updates.push('max_discount_amount = ?');
      values.push(data.maxDiscountAmount);
    }
    if (data.notifyNewPromotions !== undefined) {
      updates.push('notify_new_promotions = ?');
      values.push(data.notifyNewPromotions ? 1 : 0);
    }
    if (data.notifyExpiringSoon !== undefined) {
      updates.push('notify_expiring_soon = ?');
      values.push(data.notifyExpiringSoon ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);
      
      await db.run(`
        UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?
      `, values);
    }

    return this.getOrCreate(userId);
  }

  private static mapRow(row: any): UserPreferences {
    return {
      id: row.id,
      userId: row.user_id,
      preferredCategories: row.preferred_categories ? JSON.parse(row.preferred_categories) : [],
      preferredZones: row.preferred_zones ? JSON.parse(row.preferred_zones) : [],
      minDiscountPercentage: row.min_discount_percentage || 0,
      maxDiscountAmount: row.max_discount_amount,
      notifyNewPromotions: Boolean(row.notify_new_promotions),
      notifyExpiringSoon: Boolean(row.notify_expiring_soon),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
