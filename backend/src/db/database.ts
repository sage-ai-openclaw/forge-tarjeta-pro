import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

function getDbPath(): string {
  return process.env.DB_PATH || path.join(process.cwd(), 'data', 'tarjeta-pro.db');
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  const dbPath = getDbPath();
  if (dbPath !== ':memory:' && !dbPath.startsWith('/tmp')) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await createTables();
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

async function createTables(): Promise<void> {
  const database = await getDatabase();

  // Banks table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      website TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cards table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('credit', 'debit')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
    )
  `);

  // Promotions table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      discount_percentage INTEGER,
      discount_amount INTEGER,
      max_discount_amount INTEGER,
      valid_from DATE NOT NULL,
      valid_until DATE NOT NULL,
      days_of_week TEXT,
      merchant_name TEXT,
      merchant_address TEXT,
      source_url TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'pending')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  // Users table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User cards (which cards the user has)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS user_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      UNIQUE(user_id, card_id)
    )
  `);

  // User preferences
  await database.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      preferred_categories TEXT,
      preferred_zones TEXT,
      min_discount_percentage INTEGER DEFAULT 0,
      max_discount_amount INTEGER,
      notify_new_promotions BOOLEAN DEFAULT 1,
      notify_expiring_soon BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Indexes
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_promotions_card ON promotions(card_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_promotions_category ON promotions(category)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_promotions_valid_until ON promotions(valid_until)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_cards_bank ON cards(bank_id)`);

  // Insert default banks
  const defaultBanks = [
    'Banco Continental',
    'Banco GNB',
    'Banco Itaú',
    'Banco Regional',
    'Banco BASA',
    'Banco Atlas',
    'Banco Visión',
    'Banco Familiar',
  ];

  for (const bankName of defaultBanks) {
    await database.run(
      `INSERT OR IGNORE INTO banks (name) VALUES (?)`,
      bankName
    );
  }
}
