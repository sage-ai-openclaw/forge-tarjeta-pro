const cron = require('node-cron');
const { scrapeAll } = require('./scraper');

// Run scraper every 6 hours
// Pattern: minute hour day month day-of-week
const SCRAPE_SCHEDULE = process.env.SCRAPE_SCHEDULE || '0 */6 * * *';

console.log('Starting Tarjeta Pro scraper cron...');
console.log('Schedule:', SCRAPE_SCHEDULE);

// Run immediately on start
console.log('Running initial scrape...');
scrapeAll().catch(err => console.error('Initial scrape failed:', err));

// Schedule regular scrapes
cron.schedule(SCRAPE_SCHEDULE, async () => {
  console.log('Running scheduled scrape at', new Date().toISOString());
  try {
    const results = await scrapeAll();
    console.log('Scheduled scrape completed:', results);
  } catch (err) {
    console.error('Scheduled scrape failed:', err);
  }
});

// Keep process alive
console.log('Scraper cron is running. Press Ctrl+C to stop.');
