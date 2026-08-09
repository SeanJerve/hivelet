/**
 * @file server.ts
 * @description Hivelet API entry point.
 * @architectureRef 04_ARCHITECTURE.md — Express is the security boundary for
 *                  every protected operation.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import './types/auth.js'; // registers the Express.Request augmentation
import { config } from './config/env.js';
import { reportDbStatus } from './config/db.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/tooling requests (curl, health probes) send no Origin.
      if (!origin || config.cors.origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not permitted by CORS policy.`));
    },
    credentials: true,
  })
);

app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Needed for a correct client IP in the audit trail behind the university
// server's reverse proxy.
app.set('trust proxy', 1);

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, async () => {
  console.log(`🚀 Hivelet API on http://localhost:${config.port}`);
  console.log(`📡 Health:  http://localhost:${config.port}/api/health`);
  console.log(`🔐 Auth:    POST /api/auth/login`);
  console.log(`🌐 CORS:    ${config.cors.origins.join(', ')}`);
  await reportDbStatus();
});

export default app;
