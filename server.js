const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cron = require('node-cron');
const { scrapeAll } = require('./scraper/scraper');

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trigger manual scrape
app.post('/api/scrape', async (req, res) => {
  try {
    const results = await scrapeAll();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
  const stmt = db.prepare('SELECT * FROM promotions WHERE valid_to >= date("now") OR valid_to IS NULL ORDER BY discount_percent DESC');
  const promotions = stmt.all();
  res.json(promotions);
});

// Get promotions by category
app.get('/api/promotions/category/:category', (req, res) => {
  const stmt = db.prepare('SELECT * FROM promotions WHERE category = ? ORDER BY discount_percent DESC');
  const promotions = stmt.all(req.params.category);
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

// Get personalized promotions for user
app.get('/api/promotions/personalized/:userId', (req, res) => {
  const prefsStmt = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?');
  const prefs = prefsStmt.get(req.params.userId);
  
  let query = 'SELECT * FROM promotions WHERE (valid_to >= date("now") OR valid_to IS NULL)';
  const params = [];
  
  if (prefs) {
    const minDiscount = prefs.min_discount || 0;
    query += ' AND (discount_percent >= ? OR discount_percent IS NULL)';
    params.push(minDiscount);
    
    if (prefs.banks) {
      const banks = JSON.parse(prefs.banks);
      if (banks.length > 0) {
        query += ` AND bank IN (${banks.map(() => '?').join(',')})`;
        params.push(...banks);
      }
    }
  }
  
  query += ' ORDER BY discount_percent DESC';
  
  const stmt = db.prepare(query);
  const promotions = stmt.all(...params);
  res.json(promotions);
});

// Delete promotion
app.delete('/api/promotions/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM promotions WHERE id = ?');
  const result = stmt.run(req.params.id);
  res.json({ deleted: result.changes });
});

// Get scrape statistics
app.get('/api/stats', (req, res) => {
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM promotions');
  const byBankStmt = db.prepare('SELECT bank, COUNT(*) as count FROM promotions GROUP BY bank');
  const byCategoryStmt = db.prepare('SELECT category, COUNT(*) as count FROM promotions GROUP BY category');
  const recentStmt = db.prepare('SELECT COUNT(*) as count FROM promotions WHERE created_at >= datetime("now", "-7 days")');
  
  res.json({
    total: totalStmt.get().count,
    byBank: byBankStmt.all(),
    byCategory: byCategoryStmt.all(),
    last7Days: recentStmt.get().count
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tarjeta Pro server running on port ${PORT}`);
  
  // Start cron job for scraping every 6 hours
  const scrapeSchedule = process.env.SCRAPE_SCHEDULE || '0 */6 * * *';
  console.log('Scheduling scraper with cron:', scrapeSchedule);
  
  cron.schedule(scrapeSchedule, async () => {
    console.log('Running scheduled scrape at', new Date().toISOString());
    try {
      const results = await scrapeAll();
      console.log('Scheduled scrape completed:', results);
    } catch (err) {
      console.error('Scheduled scrape failed:', err);
    }
  });
  
  // Run initial scrape after 10 seconds to let server start
  setTimeout(() => {
    console.log('Running initial scrape...');
    scrapeAll().catch(err => console.error('Initial scrape failed:', err));
  }, 10000);
});
