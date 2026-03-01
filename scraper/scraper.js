const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const https = require('https');
const http = require('http');

const db = new Database('tarjeta_pro.db');

// HTTP client with timeout
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-PY,es;q=0.9,en;q=0.8',
        ...options.headers
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location, options).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Parse discount percentage from text
function parseDiscount(text) {
  if (!text) return null;
  
  // Match patterns like "20%", "20 %", "hasta 20%", "20% de descuento", "20% OFF"
  const patterns = [
    /(\d{1,2})\s*%?\s*(?:de\s*)?descuento/i,
    /hasta\s+(\d{1,2})\s*%/i,
    /(\d{1,2})\s*%\s*off/i,
    /(\d{1,2})\s*%/i,
    /descuento\s+del\s+(\d{1,2})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const discount = parseFloat(match[1]);
      if (discount > 0 && discount <= 100) {
        return discount;
      }
    }
  }
  
  return null;
}

// Parse date from text (Paraguay format: DD/MM/YYYY or similar)
function parseDate(text) {
  if (!text) return null;
  
  const patterns = [
    // DD/MM/YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
    // DD de Mes de YYYY
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i,
    // hasta el DD/MM
    /hasta\s+(?:el\s+)?(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{4}))?/i
  ];
  
  const months = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
  };
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let day, month, year;
      
      if (match[2] && isNaN(match[2])) {
        // Text month
        day = parseInt(match[1]);
        month = months[match[2].toLowerCase()];
        year = parseInt(match[3]);
      } else {
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        
        // If year is 2 digits, assume 20xx
        if (year < 100) year += 2000;
      }
      
      if (day && month && year) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
  }
  
  return null;
}

// Detect category from merchant name and description
function detectCategory(merchant, description) {
  const text = `${merchant} ${description}`.toLowerCase();
  
  const categories = {
    'restaurantes': ['restaurante', 'comida', 'gastronomía', 'gastronomia', 'cena', 'almuerzo', 'desayuno', 'menu', 'menú', 'buffet', 'parrilla', 'pizza', 'sushi', 'hamburguesa', 'lomito', 'empanada'],
    'combustible': ['combustible', 'nafta', 'gasolina', 'diesel', 'petrobras', 'copetrol', 'shell', 'ypf', 'axion', 'puma'],
    'supermercados': ['supermercado', 'super', 'mercado', 'disco', 'biggie', 'stock', 'casa rica', 'arete', 'el comercio'],
    'moda': ['ropa', 'zapatos', 'calzado', 'indumentaria', 'moda', 'vestido', 'camisa', 'pantalón', 'pantalon', 'remera'],
    'tecnología': ['tecnología', 'tecnologia', 'celular', 'computadora', 'laptop', 'tablet', 'electrónica', 'electronica', 'gadget'],
    'viajes': ['viaje', 'hotel', 'aéreo', 'aereo', 'pasaje', 'vuelo', 'turismo', 'hospedaje'],
    'salud': ['farmacia', 'medicina', 'salud', 'hospital', 'clínica', 'clinica', 'dentista', 'óptica', 'optica'],
    'entretenimiento': ['cine', 'teatro', 'show', 'concierto', 'evento', 'espectáculo', 'espectaculo', 'diversión', 'diversion']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'otros';
}

// Store promotion in database
function storePromotion(promo) {
  const stmt = db.prepare(`
    INSERT INTO promotions (bank, card_type, merchant, discount_percent, description, valid_from, valid_to, url, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `);
  
  try {
    const result = stmt.run(
      promo.bank,
      promo.card_type || 'todas',
      promo.merchant,
      promo.discount_percent,
      promo.description,
      promo.valid_from,
      promo.valid_to,
      promo.url,
      promo.category
    );
    return result.changes > 0;
  } catch (err) {
    console.error(`Error storing promotion: ${err.message}`);
    return false;
  }
}

// Clear old promotions for a bank before scraping
function clearBankPromotions(bank) {
  const stmt = db.prepare('DELETE FROM promotions WHERE bank = ?');
  stmt.run(bank);
}

// Scrapers for each bank
const scrapers = {
  // Itaú Paraguay
  async itau() {
    const promotions = [];
    try {
      const html = await fetch('https://www.itau.com.py/promociones');
      const $ = cheerio.load(html);
      
      // Try multiple selectors as bank websites change frequently
      const selectors = [
        '.promo-item', '.promocion', '.offer-card', '.beneficio',
        '[class*="promo"]', '[class*="oferta"]', '[class*="beneficio"]'
      ];
      
      for (const selector of selectors) {
        $(selector).each((_, el) => {
          const $el = $(el);
          const text = $el.text();
          
          const merchant = $el.find('h3, h4, .title, .merchant, [class*="comercio"]').first().text().trim();
          const description = $el.find('.description, .desc, p').first().text().trim();
          const discountText = $el.find('.discount, .descuento, .percentage').first().text().trim();
          const dateText = $el.find('.validity, .vigencia, .date, .fecha').first().text().trim();
          
          if (merchant && (description || discountText)) {
            const fullText = `${description} ${discountText}`;
            const discount = parseDiscount(fullText) || parseDiscount(text);
            const validTo = parseDate(dateText) || parseDate(text);
            
            promotions.push({
              bank: 'Itaú',
              card_type: detectCardType(text),
              merchant: cleanText(merchant),
              discount_percent: discount,
              description: cleanText(description || discountText || 'Promoción Itaú'),
              valid_from: new Date().toISOString().split('T')[0],
              valid_to: validTo,
              url: 'https://www.itau.com.py/promociones',
              category: detectCategory(merchant, description || '')
            });
          }
        });
        
        if (promotions.length > 0) break;
      }
      
      // Fallback: parse entire page content
      if (promotions.length === 0) {
        const pageText = $('body').text();
        const promoBlocks = pageText.split(/\n\s*\n/).filter(b => b.length > 50 && b.length < 500);
        
        for (const block of promoBlocks.slice(0, 20)) {
          const discount = parseDiscount(block);
          if (discount) {
            const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
            const merchant = lines[0] || 'Comercio Itaú';
            const description = lines.slice(1, 3).join(' ');
            
            promotions.push({
              bank: 'Itaú',
              card_type: 'todas',
              merchant: cleanText(merchant.substring(0, 100)),
              discount_percent: discount,
              description: cleanText(description.substring(0, 200)) || `Descuento del ${discount}%`,
              valid_from: new Date().toISOString().split('T')[0],
              valid_to: parseDate(block),
              url: 'https://www.itau.com.py/promociones',
              category: detectCategory(merchant, description)
            });
          }
        }
      }
    } catch (err) {
      console.error('Itaú scraper error:', err.message);
    }
    
    return promotions;
  },
  
  // Banco Continental
  async continental() {
    const promotions = [];
    try {
      const html = await fetch('https://www.bancocontinental.com.py/promociones');
      const $ = cheerio.load(html);
      
      const selectors = ['.promo', '.beneficio', '.oferta', '.card-promo', '[class*="promo"]'];
      
      for (const selector of selectors) {
        $(selector).each((_, el) => {
          const $el = $(el);
          const text = $el.text();
          
          const merchant = $el.find('h3, h4, .title, strong, b').first().text().trim();
          const description = $el.find('p, .description, .detalle').first().text().trim();
          
          if (merchant) {
            const discount = parseDiscount(text);
            
            promotions.push({
              bank: 'Continental',
              card_type: detectCardType(text),
              merchant: cleanText(merchant),
              discount_percent: discount,
              description: cleanText(description || 'Promoción Continental'),
              valid_from: new Date().toISOString().split('T')[0],
              valid_to: parseDate(text),
              url: 'https://www.bancocontinental.com.py/promociones',
              category: detectCategory(merchant, description || '')
            });
          }
        });
        
        if (promotions.length > 0) break;
      }
    } catch (err) {
      console.error('Continental scraper error:', err.message);
    }
    
    return promotions;
  },
  
  // Banco Sudameris
  async sudameris() {
    const promotions = [];
    try {
      const html = await fetch('https://www.sudameris.com.py/promociones');
      const $ = cheerio.load(html);
      
      $('.promocion, .beneficio, .oferta, [class*="promo"]').each((_, el) => {
        const $el = $(el);
        const text = $el.text();
        
        const merchant = $el.find('h3, h4, .comercio, .establecimiento').first().text().trim();
        const description = $el.find('.descripcion, .detalle, p').first().text().trim();
        
        if (merchant) {
          promotions.push({
            bank: 'Sudameris',
            card_type: detectCardType(text),
            merchant: cleanText(merchant),
            discount_percent: parseDiscount(text),
            description: cleanText(description || 'Promoción Sudameris'),
            valid_from: new Date().toISOString().split('T')[0],
            valid_to: parseDate(text),
            url: 'https://www.sudameris.com.py/promociones',
            category: detectCategory(merchant, description || '')
          });
        }
      });
    } catch (err) {
      console.error('Sudameris scraper error:', err.message);
    }
    
    return promotions;
  },
  
  // Banco Atlas
  async atlas() {
    const promotions = [];
    try {
      const html = await fetch('https://www.atlas.com.py/promociones');
      const $ = cheerio.load(html);
      
      $('.promo-item, .beneficio-card, [class*="promo"]').each((_, el) => {
        const $el = $(el);
        const text = $el.text();
        
        const merchant = $el.find('h3, .comercio-nombre, strong').first().text().trim();
        const description = $el.find('.promo-descripcion, p').first().text().trim();
        
        if (merchant) {
          promotions.push({
            bank: 'Atlas',
            card_type: detectCardType(text),
            merchant: cleanText(merchant),
            discount_percent: parseDiscount(text),
            description: cleanText(description || 'Promoción Atlas'),
            valid_from: new Date().toISOString().split('T')[0],
            valid_to: parseDate(text),
            url: 'https://www.atlas.com.py/promociones',
            category: detectCategory(merchant, description || '')
          });
        }
      });
    } catch (err) {
      console.error('Atlas scraper error:', err.message);
    }
    
    return promotions;
  },
  
  // Banco Visión
  async vision() {
    const promotions = [];
    try {
      const html = await fetch('https://www.visionbanco.com/promociones');
      const $ = cheerio.load(html);
      
      $('.promocion, .beneficio, .oferta-vision, [class*="promo"]').each((_, el) => {
        const $el = $(el);
        const text = $el.text();
        
        const merchant = $el.find('h3, h4, .nombre-comercio, .titulo').first().text().trim();
        const description = $el.find('.descripcion, .detalle, p').first().text().trim();
        
        if (merchant) {
          promotions.push({
            bank: 'Visión',
            card_type: detectCardType(text),
            merchant: cleanText(merchant),
            discount_percent: parseDiscount(text),
            description: cleanText(description || 'Promoción Visión'),
            valid_from: new Date().toISOString().split('T')[0],
            valid_to: parseDate(text),
            url: 'https://www.visionbanco.com/promociones',
            category: detectCategory(merchant, description || '')
          });
        }
      });
    } catch (err) {
      console.error('Visión scraper error:', err.message);
    }
    
    return promotions;
  }
};

// Detect card type from text
function detectCardType(text) {
  const t = text.toLowerCase();
  if (t.includes('visa')) return 'Visa';
  if (t.includes('mastercard') || t.includes('master')) return 'Mastercard';
  if (t.includes('amex') || t.includes('american express')) return 'American Express';
  return 'todas';
}

// Clean text
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
    .substring(0, 500);
}

// Main scrape function
async function scrapeAll() {
  console.log('Starting scrape at', new Date().toISOString());
  
  const results = {
    itau: 0,
    continental: 0,
    sudameris: 0,
    atlas: 0,
    vision: 0,
    errors: []
  };
  
  for (const [bankName, scraperFn] of Object.entries(scrapers)) {
    console.log(`Scraping ${bankName}...`);
    try {
      const promotions = await scraperFn();
      console.log(`Found ${promotions.length} promotions for ${bankName}`);
      
      // Clear old promotions for this bank
      clearBankPromotions(bankName.charAt(0).toUpperCase() + bankName.slice(1));
      
      // Store new promotions
      let stored = 0;
      for (const promo of promotions) {
        if (storePromotion(promo)) {
          stored++;
        }
      }
      
      results[bankName] = stored;
      console.log(`Stored ${stored} promotions for ${bankName}`);
    } catch (err) {
      console.error(`Failed to scrape ${bankName}:`, err.message);
      results.errors.push(`${bankName}: ${err.message}`);
    }
  }
  
  console.log('Scrape completed at', new Date().toISOString());
  console.log('Results:', results);
  
  return results;
}

// Run if called directly
if (require.main === module) {
  scrapeAll().then(results => {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error('Scraper failed:', err);
    process.exit(1);
  });
}

module.exports = { scrapeAll, scrapers };
