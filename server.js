const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5585;

// Initialize database
const db = new Database('tarjeta_pro.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank TEXT NOT NULL,
    card_type TEXT NOT NULL,
    merchant TEXT NOT NULL,
    discount_percent REAL,
    description TEXT NOT NULL,
    valid_from DATE,
    valid_to DATE,
    url TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    categories TEXT,
    banks TEXT,
    min_discount REAL DEFAULT 0,
    notify_email BOOLEAN DEFAULT 0,
    notify_push BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_promotions_bank ON promotions(bank);
  CREATE INDEX IF NOT EXISTS idx_promotions_valid_to ON promotions(valid_to);
  CREATE INDEX IF NOT EXISTS idx_promotions_category ON promotions(category);
  CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
`);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all promotions
app.get('/api/promotions', (req, res) => {
  const stmt = db.prepare('SELECT * FROM promotions ORDER BY valid_to DESC');
  const promotions = stmt.all();
  res.json(promotions);
});

// Get promotions by bank
app.get('/api/promotions/bank/:bank', (req, res) => {
  const stmt = db.prepare('SELECT * FROM promotions WHERE bank = ? ORDER BY valid_to DESC');
  const promotions = stmt.all(req.params.bank);
  res.json(promotions);
});

// Get active promotions
app.get('/api/promotions/active', (req, res) => {
  const stmt = db.prepare('SELECT * FROM promotions WHERE valid_to >= date("now") ORDER BY discount_percent DESC');
  const promotions = stmt.all();
  res.json(promotions);
});

// Create promotion
app.post('/api/promotions', (req, res) => {
  const { bank, card_type, merchant, discount_percent, description, valid_from, valid_to, url, category } = req.body;
  const stmt = db.prepare(`
    INSERT INTO promotions (bank, card_type, merchant, discount_percent, description, valid_from, valid_to, url, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(bank, card_type, merchant, discount_percent, description, valid_from, valid_to, url, category);
  res.json({ id: result.lastInsertRowid });
});

// Get user preferences
app.get('/api/preferences/:userId', (req, res) => {
  const stmt = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?');
  const prefs = stmt.get(req.params.userId);
  if (!prefs) {
    return res.status(404).json({ error: 'User preferences not found' });
  }
  res.json({
    ...prefs,
    categories: prefs.categories ? JSON.parse(prefs.categories) : [],
    banks: prefs.banks ? JSON.parse(prefs.banks) : []
  });
});

// Create or update user preferences
app.post('/api/preferences', (req, res) => {
  const { user_id, categories, banks, min_discount, notify_email, notify_push } = req.body;
  const categoriesJson = categories ? JSON.stringify(categories) : null;
  const banksJson = banks ? JSON.stringify(banks) : null;
  
  const stmt = db.prepare(`
    INSERT INTO user_preferences (user_id, categories, banks, min_discount, notify_email, notify_push)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      categories = excluded.categories,
      banks = excluded.banks,
      min_discount = excluded.min_discount,
      notify_email = excluded.notify_email,
      notify_push = excluded.notify_push,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  const result = stmt.run(user_id, categoriesJson, banksJson, min_discount, notify_email, notify_push);
  res.json({ id: result.lastInsertRowid || result.changes });
});

// Delete promotion
app.delete('/api/promotions/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM promotions WHERE id = ?');
  const result = stmt.run(req.params.id);
  res.json({ deleted: result.changes });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tarjeta Pro server running on port ${PORT}`);
});
