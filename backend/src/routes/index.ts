import { Router } from 'express';
import healthRouter from './health.js';
import tenantsRouter from './tenants.js';
import paymentsRouter from './payments.js';

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/admin', tenantsRouter);
apiRouter.use('/payments', paymentsRouter);

export default apiRouter;
