/**
 * @file routes/health.ts
 * @description Liveness and security-posture check.
 * @rationale Surfaces whether the RLS lockdown is actually in force, so a
 *            regression is visible without re-running a manual probe.
 */
import { Router } from 'express';
import { checkDbHealth } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const health = await checkDbHealth();

    res.status(health.connected ? 200 : 503).json({
      success: health.connected,
      system: 'Hivelet Backend API Server',
      status: health.connected ? 'online' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        status: health.connected ? 'connected' : 'disconnected',
        provider: 'Supabase PostgreSQL',
        message: health.message,
      },
      security: {
        // False here means the public key can still read tenant data.
        rlsLockdownActive: health.anonLockedDown,
        authorizationModel: 'backend-enforced JWT + RBAC',
      },
    });
  })
);

export default router;
