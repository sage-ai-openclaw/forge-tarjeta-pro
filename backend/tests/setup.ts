import { beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDatabase, getDatabase } from '../src/db/database';
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

process.env.DB_PATH = ':memory:';

async function insertDefaultCards(database: Database): Promise<void> {
  // Get bank IDs
  const banks = await database.all('SELECT id, name FROM banks');
  const bankMap = new Map(banks.map((b: any) => [b.name, b.id]));

  const defaultCards: { bankName: string; name: string; type: 'credit' | 'debit' }[] = [
    // Itaú
    { bankName: 'Banco Itaú', name: 'Itaú Visa', type: 'credit' },
    { bankName: 'Banco Itaú', name: 'Itaú Mastercard', type: 'credit' },
    { bankName: 'Banco Itaú', name: 'Itaú Débito', type: 'debit' },
    // BASA
    { bankName: 'Banco BASA', name: 'BASA Visa', type: 'credit' },
    { bankName: 'Banco BASA', name: 'BASA Visa Platinum', type: 'credit' },
    { bankName: 'Banco BASA', name: 'BASA Mastercard', type: 'credit' },
    { bankName: 'Banco BASA', name: 'BASA Débito', type: 'debit' },
    // Continental
    { bankName: 'Banco Continental', name: 'Continental Visa', type: 'credit' },
    { bankName: 'Banco Continental', name: 'Continental Visa Gold', type: 'credit' },
    { bankName: 'Banco Continental', name: 'Continental Mastercard Gold', type: 'credit' },
    { bankName: 'Banco Continental', name: 'Continental Débito', type: 'debit' },
  ];

  for (const card of defaultCards) {
    const bankId = bankMap.get(card.bankName);
    if (bankId) {
      await database.run(
        `INSERT OR IGNORE INTO cards (bank_id, name, type) VALUES (?, ?, ?)`,
        bankId,
        card.name,
        card.type
      );
    }
  }
}

beforeAll(async () => {
  await initializeDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  const db = await getDatabase();
  await db.run('DELETE FROM promotions');
  await db.run('DELETE FROM user_cards');
  await db.run('DELETE FROM user_preferences');
  await db.run('DELETE FROM users');
  await db.run('DELETE FROM cards');
  // Keep banks (they're default data)
  
  // Re-insert default cards for scraper tests
  await insertDefaultCards(db);
});
