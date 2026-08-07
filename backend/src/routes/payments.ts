/**
 * @file payments.ts
 * @description Optional GCash-via-Adyen payment routes (FR-015). Session creation is tenant-authed
 *              and reads the authoritative amount from the `bills` row server-side (docs/04_ARCHITECTURE.md:
 *              "the frontend may display calculations but must not be trusted to define financial
 *              truth"). The webhook is HMAC-verified and always inserts payments as
 *              'Pending Verification' -- a successful gateway result never bypasses the administrator's
 *              manual verification step (System Bible Section 12).
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAuth, AuthedProfileRequest } from '../middleware/requireAuth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createGcashSession, isAdyenConfigured, verifyWebhookHmac } from '../services/adyenService.js';

const router = Router();

const sessionSchema = z.object({
  billId: z.string().uuid(),
});

router.post('/adyen/session', requireAuth, async (req: AuthedProfileRequest, res: Response, next) => {
  try {
    if (!isAdyenConfigured()) {
      const err: AppError = new Error(
        'Online payment is temporarily unavailable. Please pay via cash or bank transfer, or contact the administrator.'
      );
      err.statusCode = 503;
      throw err;
    }

    const { billId } = sessionSchema.parse(req.body);

    const { data: bill, error: billError } = await supabaseAdmin
      .from('bills')
      .select('id, tenant_profile_id, total_amount, status')
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      const err: AppError = new Error('Bill not found.');
      err.statusCode = 404;
      throw err;
    }

    if (bill.tenant_profile_id !== req.profile!.id) {
      const err: AppError = new Error('You may only pay your own bill.');
      err.statusCode = 403;
      throw err;
    }

    if (bill.status === 'Paid') {
      const err: AppError = new Error('This bill is already paid.');
      err.statusCode = 409;
      throw err;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', req.profile!.id)
      .single();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const session = await createGcashSession({
      amountPhp: Number(bill.total_amount),
      reference: `HIVELET-BILL-${bill.id}`,
      returnUrl: `${clientUrl}/tenant?payment=return`,
      shopperReference: bill.tenant_profile_id,
      shopperEmail: profile?.email,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionData: session.sessionData,
        clientKey: process.env.ADYEN_CLIENT_KEY || '',
        environment: (process.env.ADYEN_ENVIRONMENT || 'TEST').toLowerCase(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Adyen calls this directly (no bearer token) -- authenticity comes from the HMAC signature,
// not a session. Always acknowledge with "[accepted]" so Adyen doesn't endlessly retry, even when
// an individual item is skipped (bad signature, unrelated event, duplicate delivery).
router.post('/adyen/webhook', async (req: Request, res: Response) => {
  const items = req.body?.notificationItems || [];

  for (const wrapper of items) {
    const item = wrapper?.NotificationRequestItem;
    if (!item) continue;

    if (!verifyWebhookHmac(item)) {
      console.warn('Adyen webhook: HMAC verification failed, skipping item.', item.pspReference);
      continue;
    }

    if (item.eventCode !== 'AUTHORISATION' || item.success !== 'true') {
      continue;
    }

    const billIdMatch = /^HIVELET-BILL-([0-9a-f-]{36})/i.exec(item.merchantReference || '');
    if (!billIdMatch) continue;
    const billId = billIdMatch[1];

    // Idempotency: Adyen may redeliver the same notification.
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('transaction_reference', item.pspReference)
      .maybeSingle();
    if (existing) continue;

    const { data: bill } = await supabaseAdmin
      .from('bills')
      .select('id, room_id, tenant_profile_id, total_amount')
      .eq('id', billId)
      .maybeSingle();
    if (!bill) continue;

    const amount = item.amount?.value ? item.amount.value / 100 : Number(bill.total_amount);

    // System Bible Section 12: a successful gateway result never bypasses admin verification.
    await supabaseAdmin.from('payments').insert({
      bill_id: bill.id,
      room_id: bill.room_id,
      tenant_profile_id: bill.tenant_profile_id,
      amount,
      payment_method: 'Adyen Online',
      payment_source: 'Adyen Gateway',
      verification_status: 'Pending Verification',
      transaction_reference: item.pspReference,
      paid_at: new Date().toISOString(),
    });
  }

  res.status(200).send('[accepted]');
});

export default router;
