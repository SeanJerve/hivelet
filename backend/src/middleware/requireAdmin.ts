/**
 * @file requireAdmin.ts
 * @description Verifies the caller's Supabase session JWT and confirms their profiles.role is
 *              'admin' before allowing access to privileged backend routes (docs/04_ARCHITECTURE.md:
 *              "Every protected operation must be validated and authorized by the backend").
 */
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { AppError } from './errorHandler.js';

export interface AuthedRequest extends Request {
  adminProfileId?: string;
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
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

    if (profileError || !profile || profile.role !== 'admin' || profile.account_status !== 'active') {
      const err: AppError = new Error('Administrator access required.');
      err.statusCode = 403;
      throw err;
    }

    req.adminProfileId = profile.id;
    next();
  } catch (err) {
    next(err);
  }
}
