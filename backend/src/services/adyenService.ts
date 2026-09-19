/**
 * @file services/adyenService.ts
 * @description Adyen checkout session handling for Hivelet.
 *
 * @systemBibleRef Section 12 (Payment Types)
 * @businessRules  BR-016 (Online Payment), BR-017 (Payment Verification)
 * @requirements   FR-015 (Online Payments), FR-016 (Payment Verification)
 *
 * @architectureRationale
 * Session creation runs server-side so the Adyen API key never reaches a browser
 * (04_ARCHITECTURE.md). Session metadata lives in an in-memory Map rather than in
 * the database, so an abandoned checkout leaves no ledger trace.
 *
 * WHO IS ALLOWED TO WRITE A PAYMENT
 * ---------------------------------
 * Only the webhook. `adyenWebhookHandler.applyNotificationItem()` is the single
 * writer of an `Adyen Online` payment row, because it is the only path that
 * carries proof: an HMAC signature over Adyen's own payload, and the
 * `pspReference` that identifies the transaction at the gateway.
 *
 * This service deliberately does NOT write a payment when the shopper's browser
 * comes back from checkout, for two reasons found by reading the Adyen Web v6
 * bundle rather than assuming:
 *
 *   1. `onPaymentCompleted` hands the page only the keys Adyen whitelists -
 *      `action, resultCode, sessionData, order, sessionResult, donationToken,
 *      error`. **`pspReference` is not among them.** A row written from the
 *      browser therefore cannot carry the gateway's reference, so the webhook's
 *      idempotency check (which matches on `transaction_reference = pspReference`)
 *      could never recognise it, and the same payment would be banked twice -
 *      two rows, two notifications, two amounts in the verification queue.
 *   2. A request from the payer's own browser saying "I paid" is not evidence.
 *      The previous implementation accepted exactly that and inserted a payment
 *      with a locally invented reference.
 *
 * What the browser return IS used for is confirmation to the payer. The server
 * asks Adyen directly - `GET /v71/sessions/{id}?sessionResult=...` - and reports
 * what Adyen says. It reads; it does not bank.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../config/db.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { warnIfWriteFailed } from '../utils/checkedWrite.js';
import { recordAudit } from './auditService.js';
import { computeBillAmounts, computeBillPeriod, billAlreadyRaised } from './billingService.js';
import { safeReturnUrl, defaultReturnUrl } from '../utils/safeRedirect.js';

export interface SessionDetails {
  billId: string;
  tenantProfileId: string;
  amount: number;
  returnUrl?: string;
}

// In-memory mapping of active checkout session IDs to transaction metadata.
const checkoutSessions = new Map<string, SessionDetails>();

/**
 * Adyen's test host, and the only one this build talks to.
 *
 * It was written out as a string literal in two places, beside `environment:
 * 'test'` in two more. Meanwhile `config.adyen.environment` exists, reads
 * `ADYEN_ENVIRONMENT` and defaults to 'TEST' - and **nothing in the codebase
 * read it**. Checked by grep across backend and frontend: no reference.
 *
 * A setting that does nothing is worse than no setting. Going live means
 * putting `ADYEN_ENVIRONMENT=LIVE` in `.env`, restarting, seeing no error, and
 * believing the switch was thrown - while every checkout still goes to the test
 * host and reports success. Money that was never taken, recorded as taken.
 *
 * Switching hosts is not a one-line change either: a live account posts to its
 * own merchant-specific endpoint, `https://{prefix}-checkout-live.adyenpayments
 * .com`, and that prefix is issued per account and is not configured here. So
 * the honest thing is not to pretend the switch works, but to refuse to run
 * misconfigured and say exactly what is missing.
 *
 * Nothing changes today. The default is TEST, the value is TEST, and the
 * gateway goes on working against Adyen's test environment with GCash exactly
 * as it does now.
 */
const ADYEN_CHECKOUT_HOST = 'https://checkout-test.adyen.com/v71';

/** What `ADYEN_ENVIRONMENT` actually says, normalised. */
function configuredAdyenEnvironment(): string {
  return (config.adyen.environment || 'TEST').trim().toUpperCase();
}

/**
 * Refuses to reach Adyen at all when the configured environment is not the one
 * that is wired. Called at both places that talk to the API.
 */
function assertAdyenEnvironmentWired(): void {
  const env = configuredAdyenEnvironment();
  if (env !== 'TEST') {
    throw ApiError.internal(
      `ADYEN_ENVIRONMENT is "${config.adyen.environment}", but only the test host is ` +
      'wired in this build. A live account posts to its own merchant-specific endpoint ' +
      '(https://{prefix}-checkout-live.adyenpayments.com), and that prefix is not ' +
      'configured here. Nothing was charged. Set ADYEN_ENVIRONMENT=TEST, or wire the ' +
      'live host before switching.'
    );
  }
}

export const adyenService = {
  /**
   * Checks whether live/sandbox Adyen credentials are configured.
   * If mock strings or empty, automatically uses the academic simulation pipeline.
   */
  isLiveConfigured(): boolean {
    const { apiKey, merchantAccount } = config.adyen;
    return Boolean(
      apiKey && 
      !apiKey.startsWith('mock_') && 
      merchantAccount && 
      !merchantAccount.startsWith('mock_')
    );
  },

  /**
   * Initializes a real Adyen Checkout Session via official Adyen v71 REST API.
   * Automatically falls back to local simulation if Adyen API is unreachable.
   */
  async createCheckoutSession(billId: string, tenantProfileId: string, amount: number, returnUrl?: string) {
    // SECURITY: `returnUrl` arrives from the client. Validated against the CORS
    // allow-list here, at the single point where it enters the system, so the
    // stored session can never carry an off-origin destination - not into Adyen's
    // returnUrl, and not into the res.redirect() on the way back.
    const fallbackReturnUrl = safeReturnUrl(returnUrl, defaultReturnUrl());

    if (this.isLiveConfigured()) {
      assertAdyenEnvironmentWired();
      try {
        const response = await fetch(`${ADYEN_CHECKOUT_HOST}/sessions`, {
          method: 'POST',
          headers: {
            'x-api-key': config.adyen.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchantAccount: config.adyen.merchantAccount,
            amount: {
              currency: 'PHP',
              value: Math.round(amount * 100), // minor units (centavos)
            },
            countryCode: 'PH',
            // The FULL bill uuid, not a prefix. This is the only thread tying the
            // webhook's notification back to a bill, and an 8-character prefix
            // both risks collisions and cannot be matched with an equality test.
            // 55 characters, within Adyen's 80-character merchantReference limit.
            reference: `BILL-${billId}-${Date.now()}`,
            returnUrl: fallbackReturnUrl,
            shopperLocale: 'en-US',
            channel: 'Web',
          }),
        });

        const data = (await response.json()) as any;
        if (response.ok && data.id) {
          checkoutSessions.set(data.id, { billId, tenantProfileId, amount, returnUrl: fallbackReturnUrl });
          return {
            sessionId: data.id,
            sessionData: data.sessionData,
            clientKey: config.adyen.clientKey,
            environment: configuredAdyenEnvironment().toLowerCase() as 'test' | 'live',
            isLive: true
          };
        }

        // Configured, but Adyen refused the session. This must surface.
        //
        // It previously fell through to the local checkout page, which writes a
        // `Pending Verification` payment without any money moving - so a genuine
        // gateway outage silently became a payment the landlady would then see in
        // her queue and could reasonably approve. A gateway that is down has to
        // look down.
        console.error('[adyenService] Adyen refused the session:', JSON.stringify(data).slice(0, 400));
        throw ApiError.internal(
          'The payment gateway did not accept this checkout. No payment was started. Please try again shortly.'
        );
      } catch (err) {
        if (err instanceof ApiError) throw err;
        console.error('[adyenService] could not reach Adyen:', err);
        throw ApiError.internal(
          'The payment gateway could not be reached. No payment was started. Please try again shortly.'
        );
      }
    }

    // Reached only when no Adyen credentials are configured - a developer checkout
    // on a machine with no gateway account. Never in a configured deployment.
    return this.createLocalCheckoutSession(billId, tenantProfileId, amount, fallbackReturnUrl);
  },

  /**
   * Local checkout page for an environment with no Adyen credentials.
   *
   * This exists so the system can be run end to end on a machine that has no
   * gateway account. It is unreachable in any environment where
   * `isLiveConfigured()` is true - the routes serving it refuse to render, and
   * the branch above never calls it.
   */
  createLocalCheckoutSession(billId: string, tenantProfileId: string, amount: number, returnUrl?: string) {
    // SECURITY: this token is the ONLY thing guarding the two unauthenticated gateway
    // endpoints - they cannot require a JWT because the gateway returns the browser by
    // top-level redirect, which carries no Authorization header. That makes the session id a
    // capability: whoever holds it can complete the payment.
    //
    // It was previously built from `Math.random()`, which is not cryptographically secure -
    // V8 implements it as xorshift128+, whose future output is derivable from past output -
    // plus a `Date.now()` suffix that is outright predictable. 128 bits from the CSPRNG
    // instead, which is what a bearer capability needs to be.
    const sessionId = `adyen_sess_${randomBytes(16).toString('hex')}`;
    checkoutSessions.set(sessionId, { billId, tenantProfileId, amount, returnUrl });
    const redirectUrl = `/api/public/payments/local-cashier?sessionId=${sessionId}`;
    return {
      sessionId,
      sessionData: null,
      clientKey: config.adyen.clientKey,
      environment: configuredAdyenEnvironment().toLowerCase() as 'test' | 'live',
      redirectUrl,
      isLive: false
    };
  },

  /**
   * Retrieves current session metadata.
   */
  getCheckoutSession(sessionId: string): SessionDetails | undefined {
    return checkoutSessions.get(sessionId);
  },

  /**
   * Records a payment made through the LOCAL checkout page.
   *
   * Reachable only where `isLiveConfigured()` is false - a development machine
   * with no gateway account. The route that calls it refuses to serve in any
   * configured environment, so this never runs alongside the webhook and the two
   * cannot both bank the same payment.
   *
   * Writes `Pending Verification` (BR-017) like every other path: no checkout,
   * local or otherwise, settles a debt.
   */
  async recordLocalCheckoutPayment(sessionId: string, ipAddress: string | null) {
    const session = checkoutSessions.get(sessionId);
    if (!session) {
      throw ApiError.notFound('Payment session has expired or is invalid.');
    }

    // Resiliently resolve or auto-generate bill & room foreign keys
    let resolvedBillId: string | null = null;
    let resolvedRoomId: string | null = null;

    // 1. Try finding existing bill
    if (session.billId && /^[0-9a-fA-F-]{36}$/.test(session.billId)) {
      const { data: bill } = await db
        .from('bills')
        .select('id, room_id')
        .eq('id', session.billId)
        .maybeSingle();

      if (bill) {
        resolvedBillId = bill.id;
        resolvedRoomId = bill.room_id;
      }
    }

    // 2. If the bill is not resolved, fall back to the tenant's OWN active unit.
    //
    // This previously fell through to `SELECT id FROM rooms LIMIT 1` - attaching a real
    // payment to an arbitrary unit the payer may never have occupied. A payment that cannot
    // be attributed to a unit is a support question; a payment attributed to the WRONG unit
    // is a corrupted ledger, and the second is far worse than the first.
    let resolvedRoomNumber: string | null = null;
    let resolvedOccupants = 1;
    let resolvedPrice = 0;
    let resolvedAnniversary: string | null = null;

    if (!resolvedRoomId) {
      const { data: assignment } = await db
        .from('room_assignments')
        .select('room_id, occupant_count, anniversary_date, rooms:room_id (room_number, current_price)')
        .eq('tenant_profile_id', session.tenantProfileId)
        .eq('is_active', true)
        .maybeSingle();

      if (assignment?.room_id) {
        const room = assignment.rooms as { room_number?: string; current_price?: number } | null;
        resolvedRoomId = assignment.room_id;
        resolvedRoomNumber = room?.room_number ?? null;
        resolvedPrice = Number(room?.current_price) || 0;
        resolvedOccupants = Number(assignment.occupant_count) || 1;
        resolvedAnniversary = assignment.anniversary_date ?? null;
      }
    }

    // 3. If we have the tenant's own room but no bill, raise one for the current cycle.
    //
    // The previous version of this insert could never have succeeded. It used
    // `bill_type: 'Monthly Rent'`, which is not a value of `bill_type_enum` (22P02), and it
    // omitted `grace_period_end_date`, which is NOT NULL (23502). Both failures were then
    // discarded, because the error was never destructured - so `resolvedBillId` silently
    // stayed null and the payment was written with no bill attached. It also split the amount
    // by assuming water was exactly 200.
    if (!resolvedBillId && resolvedRoomId && resolvedRoomNumber) {
      // BR-014 / BR-040 for the water figure, BR-033 for the period, BR-012 / OD-16 for grace.
      const amounts = await computeBillAmounts({
        roomNumber: resolvedRoomNumber,
        currentPrice: resolvedPrice,
        occupants: resolvedOccupants
      });
      const period = await computeBillPeriod(resolvedAnniversary ?? new Date());

      const { data: newBill, error: billError } = await db
        .from('bills')
        .insert({
          tenant_profile_id: session.tenantProfileId,
          room_id: resolvedRoomId,
          bill_type: 'Combined',
          billing_period_start: period.billingPeriodStart,
          billing_period_end: period.billingPeriodEnd,
          due_date: period.dueDate,
          grace_period_end_date: period.gracePeriodEndDate,
          rent_amount: amounts.rentAmount,
          water_amount: amounts.waterAmount,
          total_amount: amounts.totalAmount,
          status: 'Due'
        })
        .select('id')
        .single();

      if (billAlreadyRaised(billError)) {
        // The checkout request, or a second notification, raised this period's bill while we
        // were building ours. Migration 038's index refused the duplicate; attach the payment
        // to the bill that won rather than leaving it floating.
        const { data: raced } = await db
          .from('bills')
          .select('id')
          .eq('tenant_profile_id', session.tenantProfileId)
          .eq('billing_period_start', period.billingPeriodStart)
          .eq('bill_type', 'Combined')
          .maybeSingle();

        if (raced) {
          resolvedBillId = raced.id;
        } else {
          console.error('[adyenService] a bill for this period exists but could not be read back');
        }
      } else if (billError) {
        // Not fatal: the payment itself is the financial fact and must still be recorded for
        // the administrator to verify. But it must not fail silently the way it used to.
        console.error('[adyenService] could not raise a bill for this payment:', billError.message);
      } else {
        resolvedBillId = newBill.id;
      }
    }

    // A payment reference is used to reconcile against the gateway and appears on receipts,
    // so it must not collide and must not be guessable. `Math.floor(Math.random() * 9e7)` gave
    // 8 digits from a non-cryptographic PRNG - roughly a 1-in-10,000 collision chance by the
    // time a few thousand payments exist (birthday bound), and predictable besides.
    const transactionReference = `LOCAL-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    // Insert payment record. Status MUST be 'Pending Verification' (BR-017 / System Bible Section 12)
    const { data: payment, error: payError } = await db
      .from('payments')
      .insert({
        bill_id: resolvedBillId,
        tenant_profile_id: session.tenantProfileId,
        room_id: resolvedRoomId,
        amount: session.amount,
        payment_method: 'Adyen Online',
        payment_source: 'Local checkout (no gateway configured)',
        verification_status: 'Pending Verification',
        transaction_reference: transactionReference,
        paid_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (payError) {
      throw ApiError.internal(`Failed to insert payment record: ${payError.message}`);
    }

    // Write audit trail log to keep actions traceable (BR-018 / Section 14)
    await recordAudit({
      actorProfileId: session.tenantProfileId,
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: payment.id,
      newValues: {
        bill_id: session.billId,
        amount: session.amount,
        transaction_reference: transactionReference,
        verification_status: 'Pending Verification'
      },
      ipAddress
    });

    // Notify the administrator so they see the transaction in the queue
    const { data: admins } = await db
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (admins && admins.length > 0) {
      // Secondary to a payment that has already been recorded. A lost
      // notification must not turn a successful payment into an error.
      warnIfWriteFailed(
        await db.from('notifications').insert({
        recipient_profile_id: admins[0].id,
        title: 'New Online GCash Payment',
        message: `Tenant has submitted payment of ₱${session.amount.toLocaleString()} for verification (Ref: ${transactionReference}).`,
          type: 'Payment',
          priority: 'Medium',
          is_read: false
        }),
        'New-payment notification to the administrator'
      );
    }

    checkoutSessions.delete(sessionId);
    return { success: true, paymentReference: transactionReference };
  },

  /**
   * Asks Adyen what became of a checkout session, and reports it to the payer.
   *
   * WRITES NOTHING. See the note at the top of this file: the webhook is the only
   * writer of an Adyen payment, because it is the only path holding the HMAC
   * signature and the `pspReference`.
   *
   * `sessionResult` is an opaque token Adyen hands the browser when checkout
   * finishes. It is passed straight back to Adyen over a server-to-server call
   * authenticated with our API key, so the answer comes from the gateway rather
   * than from the payer's browser. A forged or replayed token is rejected by
   * Adyen, not by us.
   *
   * Returns the session status verbatim alongside whether the webhook's payment
   * row has landed yet, so the UI can distinguish "Adyen confirmed it, the record
   * is on its way" from "Adyen has not confirmed anything".
   */
  async confirmCheckout(sessionId: string, sessionResult: string, tenantProfileId: string) {
    const session = checkoutSessions.get(sessionId);
    if (!session) {
      throw ApiError.notFound('Payment session has expired or is invalid.');
    }

    // The session is a bearer capability. Confirm it belongs to the caller, so one
    // tenant cannot read the outcome of another tenant's checkout by holding its id.
    if (session.tenantProfileId !== tenantProfileId) {
      throw ApiError.notFound('Payment session has expired or is invalid.');
    }

    if (!this.isLiveConfigured()) {
      throw ApiError.internal('Adyen is not configured in this environment.');
    }

    assertAdyenEnvironmentWired();

    const url =
      `${ADYEN_CHECKOUT_HOST}/sessions/${encodeURIComponent(sessionId)}` +
      `?sessionResult=${encodeURIComponent(sessionResult)}`;

    let status = 'unknown';
    let adyenSaidNo: string | null = null;

    try {
      const response = await fetch(url, { headers: { 'x-api-key': config.adyen.apiKey } });
      const body = (await response.json()) as { status?: string; message?: string };

      if (response.ok && typeof body.status === 'string') {
        status = body.status;
      } else {
        // A 422 here means the token did not validate - which is the expected
        // answer to a forged sessionResult, not a server fault.
        adyenSaidNo = body.message ?? `Adyen returned HTTP ${response.status}`;
      }
    } catch (err) {
      throw ApiError.internal(
        `Could not reach Adyen to confirm this payment: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (adyenSaidNo) {
      throw ApiError.validation(`Adyen did not accept this checkout result: ${adyenSaidNo}`);
    }

    // Only `completed` is treated as confirmed. Every other value - including one
    // Adyen may add later - falls through as "not confirmed" rather than being
    // optimistically read as success.
    const confirmed = status === 'completed';

    // Has the webhook's row arrived? Matched by bill rather than by pspReference,
    // because the browser never learns the pspReference.
    let recorded = false;
    if (session.billId) {
      const { data: existing } = await db
        .from('payments')
        .select('id')
        .eq('bill_id', session.billId)
        .eq('payment_method', 'Adyen Online')
        .limit(1);
      recorded = Boolean(existing && existing.length > 0);
    }

    if (confirmed) {
      // Audited as an observation, not as money. `PAYMENT_RECORD` would overstate
      // what happened here - nothing was recorded.
      await recordAudit({
        actorProfileId: tenantProfileId,
        action: 'PAYMENT_RECORD',
        entityType: 'PAYMENT',
        entityId: session.billId,
        newValues: {
          note: 'Adyen confirmed a completed checkout session to the returning browser. ' +
                'No payment was written here - the webhook is the writer.',
          sessionId,
          adyenSessionStatus: status,
          webhookRowPresent: recorded
        },
        ipAddress: null
      }).catch(() => {});

      checkoutSessions.delete(sessionId);
    }

    return { status, confirmed, recorded };
  }
};

