import { Router, Request, Response } from 'express';
import { testDbConnection } from '../config/db.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await testDbConnection();

  res.status(200).json({
    success: true,
    system: 'Hivelet Backend API Server',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: dbConnected ? 'connected' : 'disconnected',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'hivelet_db',
    },
  });
});

export default router;
