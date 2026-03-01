const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 5585;

// Database setup
const db = new Database('tarjeta-pro.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('credit', 'debit')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
  );

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
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    UNIQUE(user_id, card_id)
  );

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
  );

  CREATE INDEX IF NOT EXISTS idx_promotions_card ON promotions(card_id);
  CREATE INDEX IF NOT EXISTS idx_promotions_category ON promotions(category);
  CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
  CREATE INDEX IF NOT EXISTS idx_promotions_valid_until ON promotions(valid_until);
  CREATE INDEX IF NOT EXISTS idx_cards_bank ON cards(bank_id);
`);

// Insert default banks
const defaultBanks = [
  'Banco Itaú',
  'Banco Continental',
  'Banco Sudameris',
  'Banco Atlas',
  'Banco Visión'
];

for (const bankName of defaultBanks) {
  db.prepare('INSERT OR IGNORE INTO banks (name) VALUES (?)').run(bankName);
}

// Insert default cards
const bankRows = db.prepare('SELECT id, name FROM banks').all();
const bankMap = new Map(bankRows.map(b => [b.name, b.id]));

const defaultCards = [
  { bankName: 'Banco Itaú', name: 'Itaú Visa', type: 'credit' },
  { bankName: 'Banco Itaú', name: 'Itaú Mastercard', type: 'credit' },
  { bankName: 'Banco Itaú', name: 'Itaú Débito', type: 'debit' },
  { bankName: 'Banco Continental', name: 'Continental Visa', type: 'credit' },
  { bankName: 'Banco Continental', name: 'Continental Mastercard', type: 'credit' },
  { bankName: 'Banco Continental', name: 'Continental Débito', type: 'debit' },
  { bankName: 'Banco Sudameris', name: 'Sudameris Visa', type: 'credit' },
  { bankName: 'Banco Sudameris', name: 'Sudameris Mastercard', type: 'credit' },
  { bankName: 'Banco Sudameris', name: 'Sudameris Débito', type: 'debit' },
  { bankName: 'Banco Atlas', name: 'Atlas Visa', type: 'credit' },
  { bankName: 'Banco Atlas', name: 'Atlas Mastercard', type: 'credit' },
  { bankName: 'Banco Atlas', name: 'Atlas Débito', type: 'debit' },
  { bankName: 'Banco Visión', name: 'Visión Visa', type: 'credit' },
  { bankName: 'Banco Visión', name: 'Visión Mastercard', type: 'credit' },
  { bankName: 'Banco Visión', name: 'Visión Débito', type: 'debit' }
];

for (const card of defaultCards) {
  const bankId = bankMap.get(card.bankName);
  if (bankId) {
    db.prepare('INSERT OR IGNORE INTO cards (bank_id, name, type) VALUES (?, ?, ?)')
      .run(bankId, card.name, card.type);
  }
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Banks
app.get('/api/banks', (req, res) => {
  const banks = db.prepare('SELECT * FROM banks ORDER BY name').all();
  res.json(banks);
});

// Cards
app.get('/api/cards', (req, res) => {
  const { bankId } = req.query;
  let query = 'SELECT c.*, b.name as bank_name FROM cards c JOIN banks b ON c.bank_id = b.id';
  const params = [];
  
  if (bankId) {
    query += ' WHERE c.bank_id = ?';
    params.push(bankId);
  }
  
  query += ' ORDER BY b.name, c.name';
  const cards = db.prepare(query).all(...params);
  res.json(cards);
});

app.post('/api/cards', (req, res) => {
  const { bankId, name, type } = req.body;
  const result = db.prepare('INSERT INTO cards (bank_id, name, type) VALUES (?, ?, ?)')
    .run(bankId, name, type);
  res.status(201).json({ id: result.lastInsertRowid });
});

// Promotions
app.get('/api/promotions', (req, res) => {
  const { category, status, bankId, cardType, sortBy, sortOrder, search, validFrom } = req.query;
  
  let query = `
    SELECT p.*, c.name as card_name, c.type as card_type, b.name as bank_name, b.id as bank_id
    FROM promotions p
    JOIN cards c ON p.card_id = c.id
    JOIN banks b ON c.bank_id = b.id
    WHERE 1=1
  `;
  const params = [];
  
  if (category) {
    query += ' AND p.category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  if (bankId) {
    query += ' AND b.id = ?';
    params.push(bankId);
  }
  if (cardType) {
    query += ' AND c.type = ?';
    params.push(cardType);
  }
  if (validFrom) {
    query += ' AND p.valid_until >= ?';
    params.push(validFrom);
  }
  if (search) {
    query += ` AND (
      p.title LIKE ? OR
      p.description LIKE ? OR
      p.merchant_name LIKE ? OR
      p.category LIKE ? OR
      b.name LIKE ?
    )`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  // Sorting
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
  switch (sortBy) {
    case 'discount':
      query += ` ORDER BY p.discount_percentage ${order}`;
      break;
    case 'expiration':
      query += ` ORDER BY p.valid_until ${order}`;
      break;
    case 'created':
      query += ` ORDER BY p.created_at ${order}`;
      break;
    default:
      query += ' ORDER BY p.valid_until ASC';
  }
  
  const promotions = db.prepare(query).all(...params);
  res.json(promotions);
});

app.get('/api/promotions/search', (req, res) => {
  const { q } = req.query;
  const searchTerm = `%${q}%`;
  
  const promotions = db.prepare(`
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
    ORDER BY p.discount_percentage DESC
  `).all(searchTerm, searchTerm, searchTerm, searchTerm);
  
  res.json(promotions);
});

app.get('/api/promotions/:id', (req, res) => {
  const promotion = db.prepare(`
    SELECT p.*, c.name as card_name, c.type as card_type, b.name as bank_name
    FROM promotions p
    JOIN cards c ON p.card_id = c.id
    JOIN banks b ON c.bank_id = b.id
    WHERE p.id = ?
  `).get(req.params.id);
  
  if (!promotion) {
    return res.status(404).json({ error: 'Promotion not found' });
  }
  res.json(promotion);
});

app.post('/api/promotions', (req, res) => {
  const {
    cardId, title, description, category,
    discountPercentage, discountAmount, maxDiscountAmount,
    validFrom, validUntil, daysOfWeek,
    merchantName, merchantAddress, sourceUrl
  } = req.body;
  
  const result = db.prepare(`
    INSERT INTO promotions (
      card_id, title, description, category,
      discount_percentage, discount_amount, max_discount_amount,
      valid_from, valid_until, days_of_week,
      merchant_name, merchant_address, source_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cardId, title, description, category,
    discountPercentage, discountAmount, maxDiscountAmount,
    validFrom, validUntil, daysOfWeek,
    merchantName, merchantAddress, sourceUrl
  );
  
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete('/api/promotions/:id', (req, res) => {
  const result = db.prepare('DELETE FROM promotions WHERE id = ?').run(req.params.id);
  res.json({ deleted: result.changes > 0 });
});

// Categories
app.get('/api/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT category FROM promotions 
    WHERE status = 'active' AND category IS NOT NULL
    ORDER BY category
  `).all();
  res.json(rows.map(r => r.category));
});

// User Preferences
app.get('/api/preferences/:userId', (req, res) => {
  const prefs = db.prepare(`
    SELECT * FROM user_preferences WHERE user_id = ?
  `).get(req.params.userId);
  
  if (!prefs) {
    return res.status(404).json({ error: 'Preferences not found' });
  }
  
  // Parse JSON fields
  res.json({
    ...prefs,
    preferred_categories: prefs.preferred_categories ? JSON.parse(prefs.preferred_categories) : [],
    preferred_zones: prefs.preferred_zones ? JSON.parse(prefs.preferred_zones) : []
  });
});

app.post('/api/preferences', (req, res) => {
  const {
    userId,
    preferredCategories,
    preferredZones,
    minDiscountPercentage,
    maxDiscountAmount,
    notifyNewPromotions,
    notifyExpiringSoon
  } = req.body;
  
  // Ensure user exists
  let user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    // Create user with email based on id for demo
    const result = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)')
      .run(`user${userId}@example.com`, `User ${userId}`);
    userId = result.lastInsertRowid;
  }
  
  const categoriesJson = preferredCategories ? JSON.stringify(preferredCategories) : null;
  const zonesJson = preferredZones ? JSON.stringify(preferredZones) : null;
  
  db.prepare(`
    INSERT INTO user_preferences (
      user_id, preferred_categories, preferred_zones,
      min_discount_percentage, max_discount_amount,
      notify_new_promotions, notify_expiring_soon
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      preferred_categories = excluded.preferred_categories,
      preferred_zones = excluded.preferred_zones,
      min_discount_percentage = excluded.min_discount_percentage,
      max_discount_amount = excluded.max_discount_amount,
      notify_new_promotions = excluded.notify_new_promotions,
      notify_expiring_soon = excluded.notify_expiring_soon,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId, categoriesJson, zonesJson,
    minDiscountPercentage || 0,
    maxDiscountAmount || null,
    notifyNewPromotions !== false ? 1 : 0,
    notifyExpiringSoon !== false ? 1 : 0
  );
  
  res.json({ success: true, userId });
});

// User Cards
app.get('/api/users/:userId/cards', (req, res) => {
  const cards = db.prepare(`
    SELECT c.*, b.name as bank_name
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    JOIN banks b ON c.bank_id = b.id
    WHERE uc.user_id = ?
  `).all(req.params.userId);
  res.json(cards);
});

app.post('/api/users/:userId/cards', (req, res) => {
  const { cardId } = req.body;
  try {
    const result = db.prepare('INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)')
      .run(req.params.userId, cardId);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'Card already added' });
  }
});

app.delete('/api/users/:userId/cards/:cardId', (req, res) => {
  const result = db.prepare('DELETE FROM user_cards WHERE user_id = ? AND card_id = ?')
    .run(req.params.userId, req.params.cardId);
  res.json({ deleted: result.changes > 0 });
});

// Filtered promotions based on user preferences
app.get('/api/users/:userId/promotions', (req, res) => {
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.params.userId);
  const userCards = db.prepare('SELECT card_id FROM user_cards WHERE user_id = ?').all(req.params.userId);
  const cardIds = userCards.map(uc => uc.card_id);
  
  let query = `
    SELECT p.*, c.name as card_name, c.type as card_type, b.name as bank_name
    FROM promotions p
    JOIN cards c ON p.card_id = c.id
    JOIN banks b ON c.bank_id = b.id
    WHERE p.status = 'active'
  `;
  const params = [];
  
  // Filter by user's cards if they have any
  if (cardIds.length > 0) {
    query += ` AND p.card_id IN (${cardIds.map(() => '?').join(',')})`;
    params.push(...cardIds);
  }
  
  // Apply preference filters
  if (prefs) {
    if (prefs.preferred_categories) {
      const categories = JSON.parse(prefs.preferred_categories);
      if (categories.length > 0) {
        query += ` AND p.category IN (${categories.map(() => '?').join(',')})`;
        params.push(...categories);
      }
    }
    
    if (prefs.min_discount_percentage > 0) {
      query += ' AND (p.discount_percentage >= ? OR p.discount_percentage IS NULL)';
      params.push(prefs.min_discount_percentage);
    }
  }
  
  query += ' ORDER BY p.discount_percentage DESC NULLS LAST, p.valid_until ASC';
  
  const promotions = db.prepare(query).all(...params);
  res.json(promotions);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Tarjeta Pro API running on port ${PORT}`);
});
