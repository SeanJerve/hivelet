import { Router } from 'express';
import healthRouter from './health.js';
import tenantsRouter from './tenants.js';

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/admin', tenantsRouter);

export default apiRouter;
