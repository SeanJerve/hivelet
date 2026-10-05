/**
 * @file routes/index.ts
 * @description API router composition.
 * @systemBibleRef Section 4 (Users) — the three access tiers map to three routers.
 *
 *   health   open
 *   auth     open to log in; authenticated for everything else
 *   public   guest-readable property data + inquiry submission
 *   tenant   requireAuth, scoped to the caller's own rows
 *   admin    requireAuth + requireAdmin
 *
 * `attachGuestRole` runs first so that an unauthenticated request carries the
 * explicit role 'guest' rather than an undefined value.
 */
import { Router } from 'express';
import { attachGuestRole } from '../middleware/auth.js';
import healthRouter from './health.js';
import authRouter from './auth.js';
import publicRouter from './public.js';
import tenantRouter from './tenant.js';
import adminRouter from './admin.js';
import liveRouter from './live.js';
import recentActionsRouter from './recentActions.js';

const apiRouter = Router();

apiRouter.use(attachGuestRole);

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(publicRouter);
apiRouter.use(tenantRouter);
apiRouter.use(adminRouter);
// Keeps open pages current without a refresh (routes/live.ts, migration 068).
apiRouter.use(liveRouter);
// "Your recent actions" on each Overview (routes/recentActions.ts).
apiRouter.use(recentActionsRouter);

export default apiRouter;
