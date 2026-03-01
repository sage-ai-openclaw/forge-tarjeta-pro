import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './db/database';
import apiRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 5585;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  
  // Serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
} else {
  // In development, just return 404 for unknown routes
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Not found' });
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('📦 Database initialized');
      app.listen(PORT, () => {
        console.log(`🚀 Tarjeta Pro API running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
