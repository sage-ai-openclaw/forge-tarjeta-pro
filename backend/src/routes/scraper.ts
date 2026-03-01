import { Router } from 'express';
import { z } from 'zod';
import { ScraperService } from '../scraper/ScraperService';
import { ItauScraper, BasaScraper, ContinentalScraper } from '../scraper';

const router = Router();

// Initialize scraper service and register scrapers
const scraperService = new ScraperService();
scraperService.registerScraper(new ItauScraper());
scraperService.registerScraper(new BasaScraper());
scraperService.registerScraper(new ContinentalScraper());

// POST /api/scraper/run - Trigger scraper manually
const runScraperSchema = z.object({
  banks: z.array(z.string()).optional(), // Optional filter by bank names
});

router.post('/scraper/run', async (req, res) => {
  try {
    const result = runScraperSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    }

    // Run scrapers (this may take a while)
    const runResult = await scraperService.runAll(result.data.banks);

    res.json({
      success: true,
      message: `Scraper completed. Processed ${runResult.totalBanks} banks, added ${runResult.totalAdded} new promotions.`,
      data: runResult,
    });
  } catch (error) {
    console.error('Scraper error:', error);
    res.status(500).json({ 
      error: 'Failed to run scraper',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/scraper/banks - List available scrapers
router.get('/scraper/banks', async (_req, res) => {
  try {
    const scrapers = scraperService.getRegisteredScrapers();
    res.json({
      banks: scrapers.map(s => ({
        name: s.name,
        bankId: s.bankId,
        enabled: s.enabled,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scraper banks' });
  }
});

// GET /api/scraper/history - Get scraper run history
router.get('/scraper/history', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const history = await scraperService.getRunHistory(limit);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scraper history' });
  }
});

// GET /api/scraper/history/:runId/logs - Get logs for a specific run
router.get('/scraper/history/:runId/logs', async (req, res) => {
  try {
    const runId = Number(req.params.runId);
    const logs = await scraperService.getRunLogs(runId);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scraper logs' });
  }
});

export default router;
export { scraperService };
