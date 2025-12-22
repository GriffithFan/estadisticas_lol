import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { riotRouter } from './routes/riot.js';
import { ddragonRouter } from './routes/ddragon.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please try again later' }
});

app.use(limiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', riotRouter);
app.use('/api', ddragonRouter);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(config.port, () => {
  console.log(`LoL Stats API running on http://localhost:${config.port}`);
  console.log(`API Key: ${config.riotApiKey.substring(0, 10)}...`);
});

export default app;
