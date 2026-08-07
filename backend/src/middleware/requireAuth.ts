/**
 * @file requireAuth.ts
 * @description Verifies the caller's Supabase session JWT and attaches their profile, without
 *              requiring a specific role (contrast with requireAdmin.ts). Used by routes any active,
 *              signed-in user (tenant or admin) may call -- e.g. creating an Adyen payment session
 *              for their own bill.
 */
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { AppError } from './errorHandler.js';

export interface AuthedProfileRequest extends Request {
  profile?: { id: string; role: 'admin' | 'tenant' | 'prospect'; accountStatus: string };
}

export async function requireAuth(req: AuthedProfileRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      const err: AppError = new Error('Missing bearer token.');
      err.statusCode = 401;
      throw err;
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      const err: AppError = new Error('Invalid or expired session.');
      err.statusCode = 401;
      throw err;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, account_status')
      .eq('auth_user_id', userData.user.id)
      .single();

    if (profileError || !profile || profile.account_status !== 'active') {
      const err: AppError = new Error('No active account for this login.');
      err.statusCode = 403;
      throw err;
    }

    req.profile = { id: profile.id, role: profile.role, accountStatus: profile.account_status };
    next();
  } catch (err) {
    next(err);
  }
}
