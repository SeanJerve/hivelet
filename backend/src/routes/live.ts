/**
 * @file routes/live.ts
 * @description GET /api/live/version - the fingerprint that keeps open pages current.
 *
 * Sean, 2026-09-30: changes did not show until people refreshed. Vercel
 * functions cannot hold a live connection open, so each open page asks this
 * every few seconds while it is visible and reloads its data only when the
 * answer changes (frontend/src/lib/live.ts). The fingerprint is computed in the
 * database (migration 068, live_version): the administrator's covers the whole
 * property, a tenant's only their own tenancy, payments, bills, repairs and
 * notifications - so a tenant learns nothing about anyone else from it, not
 * even that something changed.
 *
 * Before 068 is applied the function does not exist; the endpoint then answers
 * with a null version, and pages simply keep their own timers.
 */
import { Router } from 'express';
import { db } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

router.get(
  '/live/version',
  requireAuth,
  requirePermission(PERMISSIONS.PROFILE_READ_OWN),
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === 'admin';
    const { data, error } = await db.rpc('live_version', {
      p_profile: req.user!.profileId,
      p_is_admin: isAdmin,
    });
    res.set('Cache-Control', 'no-store');
    if (error) {
      // 42883 / PGRST202: migration 068 not applied yet. Not an error for the page.
      if (error.code === '42883' || error.code === 'PGRST202') {
        res.status(200).json({ success: true, data: { version: null } });
        return;
      }
      throw ApiError.internal(error.message);
    }
    res.status(200).json({ success: true, data: { version: typeof data === 'string' ? data : null } });
  })
);

export default router;
