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

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'http://localhost:*', 'https://*'],
      },
    },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/tooling requests (curl, form POSTs, health probes) send no Origin or 'null'.
      if (!origin || origin === 'null' || config.cors.origins.includes(origin) || origin.startsWith('http://localhost:')) {
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
