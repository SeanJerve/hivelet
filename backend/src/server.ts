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

/**
 * CORS, tightened 2026-09-17.
 *
 * It used to allow, with `credentials: true`:
 *
 *   - any `http://localhost:*`, on any port
 *   - the literal string `'null'`
 *
 * Neither is exploitable in this system TODAY, and that was checked rather than
 * assumed: **there is no cookie authentication anywhere**. The token is a Bearer
 * value in the `Authorization` header, read from storage that a different origin
 * cannot touch, so a cross-origin page has nothing to send. `credentials: true`
 * permits cookies that do not exist.
 *
 * It was still too wide, in a way that goes off the moment anyone does something
 * reasonable:
 *
 *   `'null'` is what a **sandboxed iframe** sends, and what a `file://` page
 *   sends. Any site could frame itself sandboxed and be inside the policy.
 *
 *   `http://localhost:*` on any port is a development convenience that had
 *   shipped into every environment.
 *
 * The day someone moves the token into a cookie - a normal thing to want, and
 * safer in other respects - both become a live cross-site request forgery hole,
 * and nothing about that change would draw attention back here.
 *
 * So the width is now spent only where it is earned: in development.
 *
 * `!origin` stays allowed in every environment, and must. A request with no
 * Origin header at all is not a browser doing something cross-site - it is curl,
 * a health probe, or a server-to-server call. **Adyen's webhook is exactly
 * that**, and rejecting it would break payment notification.
 */
const isProduction = config.nodeEnv === 'production';

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: not a browser. curl, health probes, Adyen's webhook.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.cors.origins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Development only: any localhost port, and the 'null' origin a sandboxed
      // or file:// page sends. Both are refused in production.
      if (!isProduction && (origin === 'null' || origin.startsWith('http://localhost:'))) {
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
