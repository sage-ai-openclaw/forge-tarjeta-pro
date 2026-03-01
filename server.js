const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5585;
const db = new Database('tarjeta_pro.db');

app.use(express.json());
app.use(express.static('public'));

// Initialize database
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
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
      FOREIGN KEY (bank_id) REFERENCES banks(id)
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      discount_percentage REAL,
      discount_amount REAL,
      max_discount_amount REAL,
      valid_from DATE,
      valid_until DATE,
      days_of_week TEXT,
      merchant_name TEXT,
      merchant_address TEXT,
      source_url TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('active', 'expired', 'pending')),
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id)
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preferred_categories TEXT,
      preferred_zones TEXT,
      min_discount_percentage REAL,
      max_discount_amount REAL,
      notify_new_promotions INTEGER DEFAULT 1,
      notify_expiring_soon INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraper_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT,
      status TEXT,
      promotions_found INTEGER DEFAULT 0,
      promotions_added INTEGER DEFAULT 0,
      error_message TEXT,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO banks (name, logo_url, website) VALUES 
      ('Itau', 'https://www.itau.com.py', 'https://www.itau.com.py'),
      ('Continental', 'https://www.bancocontinental.com.py', 'https://www.bancocontinental.com.py'),
      ('Sudameris', 'https://www.sudameris.com.py', 'https://www.sudameris.com.py'),
      ('Atlas', 'https://www.atlasbank.com.py', 'https://www.atlasbank.com.py'),
      ('Vision', 'https://www.visionbanco.com', 'https://www.visionbanco.com');
  `);
}

// API Routes
app.get('/api/banks', (req, res) => {
  const banks = db.prepare('SELECT * FROM banks ORDER BY name').all();
  res.json(banks);
});

app.get('/api/cards', (req, res) => {
  const cards = db.prepare(`
    SELECT c.*, b.name as bank_name 
    FROM cards c 
    JOIN banks b ON c.bank_id = b.id 
    ORDER BY b.name, c.name
  `).all();
  res.json(cards);
});

app.post('/api/cards', (req, res) => {
  const { bank_id, name, type } = req.body;
  try {
    const result = db.prepare('INSERT INTO cards (bank_id, name, type) VALUES (?, ?, ?)').run(bank_id, name, type);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/promotions', (req, res) => {
  const { status, bank_id, category } = req.query;
  let sql = `
    SELECT p.*, c.name as card_name, c.type as card_type, b.name as bank_name
    FROM promotions p
    JOIN cards c ON p.card_id = c.id
    JOIN banks b ON c.bank_id = b.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  if (bank_id) {
    sql += ' AND b.id = ?';
    params.push(bank_id);
  }
  if (category) {
    sql += ' AND p.category LIKE ?';
    params.push(`%${category}%`);
  }
  
  sql += ' ORDER BY p.valid_until DESC, p.discount_percentage DESC';
  
  const promotions = db.prepare(sql).all(...params);
  res.json(promotions);
});

app.post('/api/promotions', (req, res) => {
  const {
    card_id, title, description, category,
    discount_percentage, discount_amount, max_discount_amount,
    valid_from, valid_until, days_of_week,
    merchant_name, merchant_address, source_url, status
  } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO promotions (
        card_id, title, description, category,
        discount_percentage, discount_amount, max_discount_amount,
        valid_from, valid_until, days_of_week,
        merchant_name, merchant_address, source_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      card_id, title, description, category,
      discount_percentage, discount_amount, max_discount_amount,
      valid_from, valid_until, days_of_week,
      merchant_name, merchant_address, source_url, status || 'pending'
    );
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/promotions/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter required' });
  }
  
  const promotions = db.prepare(`
    SELECT p.*, c.name as card_name, c.type as card_type, b.name as bank_name
    FROM promotions p
    JOIN cards c ON p.card_id = c.id
    JOIN banks b ON c.bank_id = b.id
    WHERE p.title LIKE ? OR p.description LIKE ? OR p.merchant_name LIKE ? OR p.category LIKE ?
    ORDER BY p.valid_until DESC
  `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  
  res.json(promotions);
});

// Scraper endpoints
app.post('/api/scraper/run', async (req, res) => {
  const { bank } = req.body;
  const results = [];
  
  if (!bank || bank === 'all') {
    const banks = db.prepare('SELECT name FROM banks').all();
    for (const b of banks) {
      results.push(await runScraper(b.name));
    }
  } else {
    results.push(await runScraper(bank));
  }
  
  res.json({ results });
});

app.get('/api/scraper/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM scraper_logs ORDER BY scraped_at DESC LIMIT 50').all();
  res.json(logs);
});

// Scraper implementations
async function runScraper(bankName) {
  const startTime = Date.now();
  let promotionsFound = 0;
  let promotionsAdded = 0;
  let errorMessage = null;
  
  try {
    const scraper = getScraper(bankName);
    const promotions = await scraper();
    promotionsFound = promotions.length;
    
    for (const promo of promotions) {
      const existing = db.prepare('SELECT id FROM promotions WHERE title = ? AND merchant_name = ? AND valid_until = ?').get(
        promo.title, promo.merchant_name, promo.valid_until
      );
      
      if (!existing) {
        const cardId = getOrCreateCard(bankName, promo.cardName);
        db.prepare(`
          INSERT INTO promotions (
            card_id, title, description, category,
            discount_percentage, discount_amount, max_discount_amount,
            valid_from, valid_until, days_of_week,
            merchant_name, merchant_address, source_url, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          cardId,
          promo.title,
          promo.description,
          promo.category,
          promo.discount_percentage,
          promo.discount_amount,
          promo.max_discount_amount,
          promo.valid_from,
          promo.valid_until,
          promo.days_of_week,
          promo.merchant_name,
          promo.merchant_address,
          promo.source_url,
          'active'
        );
        promotionsAdded++;
      }
    }
    
    db.prepare('INSERT INTO scraper_logs (bank_name, status, promotions_found, promotions_added) VALUES (?, ?, ?, ?)')
      .run(bankName, 'success', promotionsFound, promotionsAdded);
    
    return {
      bank: bankName,
      status: 'success',
      promotionsFound,
      promotionsAdded,
      duration: Date.now() - startTime
    };
  } catch (err) {
    errorMessage = err.message;
    db.prepare('INSERT INTO scraper_logs (bank_name, status, promotions_found, error_message) VALUES (?, ?, ?, ?)')
      .run(bankName, 'error', promotionsFound, errorMessage);
    
    return {
      bank: bankName,
      status: 'error',
      promotionsFound,
      error: errorMessage,
      duration: Date.now() - startTime
    };
  }
}

function getOrCreateCard(bankName, cardName) {
  const bank = db.prepare('SELECT id FROM banks WHERE name = ?').get(bankName);
  if (!bank) throw new Error(`Bank not found: ${bankName}`);
  
  let card = db.prepare('SELECT id FROM cards WHERE bank_id = ? AND name = ?').get(bank.id, cardName);
  if (!card) {
    const result = db.prepare('INSERT INTO cards (bank_id, name, type) VALUES (?, ?, ?)').run(bank.id, cardName, 'credit');
    card = { id: result.lastInsertRowid };
  }
  
  return card.id;
}

function getScraper(bankName) {
  const scrapers = {
    'Itau': scrapeItau,
    'Continental': scrapeContinental,
    'Sudameris': scrapeSudameris,
    'Atlas': scrapeAtlas,
    'Vision': scrapeVision
  };
  
  const scraper = scrapers[bankName];
  if (!scraper) throw new Error(`No scraper found for ${bankName}`);
  return scraper;
}

// Mock scrapers (replace with actual implementations)
async function scrapeItau() {
  // Simulated scraping - replace with actual Cheerio implementation
  return [
    {
      cardName: 'Itau Visa',
      title: '20% de descuento en restaurantes',
      description: 'Todos los jueves en restaurantes seleccionados',
      category: 'Gastronomia',
      discount_percentage: 20,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '2024-12-31',
      days_of_week: 'jueves',
      merchant_name: 'Restaurantes participantes',
      merchant_address: 'Asuncion y Gran Asuncion',
      source_url: 'https://www.itau.com.py/promociones'
    }
  ];
}

async function scrapeContinental() {
  return [
    {
      cardName: 'Continental Mastercard',
      title: '15% off en supermercados',
      description: 'Viernes de descuento en supermercados',
      category: 'Supermercados',
      discount_percentage: 15,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '2024-12-31',
      days_of_week: 'viernes',
      merchant_name: 'Supermercados participantes',
      merchant_address: 'Todo el pais',
      source_url: 'https://www.bancocontinental.com.py/promociones'
    }
  ];
}

async function scrapeSudameris() {
  return [];
}

async function scrapeAtlas() {
  return [];
}

async function scrapeVision() {
  return [];
}

// Actual Cheerio-based scraper example (template for real implementation)
async function scrapeWithCheerio(url, selector, parseFn) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    return parseFn($);
  } catch (err) {
    throw new Error(`Scraping failed: ${err.message}`);
  }
}

initDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tarjeta Pro server running on port ${PORT}`);
});
