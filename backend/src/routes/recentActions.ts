/**
 * @file routes/recentActions.ts
 * @description GET /api/auth/me/recent-actions - "Your recent actions" on the Overview.
 *
 * The signed-in person's own last three recognisable actions, as sentences
 * (services/recentActions.ts). Their own only: the profile is the token's, never
 * a parameter, so no one can ask for anyone else's. Not the audit trail on a
 * screen (judgement log 3.9): no codes, addresses or raw values leave here.
 */
import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { recentActionsFor } from '../services/recentActions.js';

const router = Router();

router.get(
  '/auth/me/recent-actions',
  requireAuth,
  requirePermission(PERMISSIONS.PROFILE_READ_OWN),
  asyncHandler(async (req, res) => {
    const role = req.user!.role === 'admin' ? 'admin' : 'tenant';
    try {
      const data = await recentActionsFor(req.user!.profileId, role, 3);
      res.set('Cache-Control', 'no-store');
      res.status(200).json({ success: true, data });
    } catch (err) {
      throw ApiError.internal(err instanceof Error ? err.message : 'Recent actions could not be read.');
    }
  })
);

export default router;
