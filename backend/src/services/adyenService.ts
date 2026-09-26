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
import { computeBillAmounts, computeBillPeriod, billPeriodFor, billAlreadyRaised } from './billingService.js';
import { readStanding } from './standingService.js';
import { isWebhookConfigured } from './adyenWebhook.js';
import { safeReturnUrl, defaultReturnUrl } from '../utils/safeRedirect.js';

export interface SessionDetails {
  billId: string;
  tenantProfileId: string;
  amount: number;
  returnUrl?: string;
  /** When this checkout began. Epoch ms. See SESSION_TTL_MS and `recorded`. */
  createdAt: number;
}

/**
 * How long a checkout session stays redeemable.
 *
 * These live in a process-local Map that was only ever deleted from on
 * completion, so every ABANDONED checkout left an entry for the lifetime of the
 * process - an unbounded leak, and a `sessionId` that stayed redeemable forever
 * if it ever leaked.
 *
 * An hour is generous for "open GCash, authorise, come back" and short enough
 * that a stale capability does not outlive its usefulness. Expiry is checked on
 * read and swept on write, so there is no timer to leak in tests.
 */
const SESSION_TTL_MS = 60 * 60 * 1000;

/**
 * How long a new checkout on a bill is refused after one opens (migration 051,
 * `claimCheckout` in routes/tenant.ts). Defined here because the Adyen session
 * below has to expire inside it: Adyen keeps a session payable for an hour
 * unless told otherwise, and the Drop-in stays mounted until the dialog is
 * closed, so a tab left open past the hold could take a second full payment
 * after a second session was opened and paid (FINAL_REVIEW F1).
 */
export const CHECKOUT_HOLD_MS = 15 * 60 * 1000;

/**
 * When Adyen stops accepting payment on a new session: a minute inside the hold,
 * so a difference between our clock and Adyen's cannot leave both open at once.
 * `toISOString()`, byte for byte the form Adyen's own SDK sends for this field
 * (@adyen/api-library 32, ObjectSerializer, `Date` -> `toISOString()`); its
 * model documents a one-hour default and a 24-hour maximum, and no minimum.
 */
function sessionExpiresAt(nowMs: number): string {
  return new Date(nowMs + CHECKOUT_HOLD_MS - 60 * 1000).toISOString();
}

/** Drops sessions older than the TTL. Cheap: this map holds tens of entries. */
function sweepExpiredSessions(nowMs: number): void {
  for (const [id, s] of checkoutSessions) {
    if (nowMs - s.createdAt > SESSION_TTL_MS) checkoutSessions.delete(id);
  }
}

// In-memory mapping of active checkout session IDs to transaction metadata.
/**
 * The one thing said when a checkout session cannot be produced, whatever the
 * reason - and it is deliberately ONE string.
 *
 * It read "Payment session has expired or is invalid." Two problems with that.
 *
 * The sessions live in a process-local Map, so a backend restart mid-payment
 * loses them. A resident who has ALREADY PAID in GCash came back, hit this 404,
 * and saw it under a heading reading "The payment page could not be opened",
 * with a Try again button beneath it. The one thing they must not do is pay
 * again, and the screen was inviting exactly that.
 *
 * And it must stay IDENTICAL across both branches below - the missing session
 * and the session that belongs to somebody else. Two different strings would
 * let one tenant discover whether another's session id exists. So the wording
 * has to be honest to a real payer and empty to a prober, which is what this is:
 * it never says whether the session existed.
 */
const SESSION_UNAVAILABLE =
  'This payment session is no longer available. If you completed a payment in GCash it is ' +
  'safe - Adyen has it, and it reaches the landlady separately from this page. Do not pay ' +
  'again; check your payments page shortly, and tell her if it has not appeared.';

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
  /**
   * DO NOT TAKE MONEY YOU CANNOT AFTERWARDS RECORD.
   *
   * This gated on `apiKey` and `merchantAccount` alone. Both being real is
   * enough to open a session and charge a resident - and says nothing about
   * whether the payment can ever come back.
   *
   * A deployment with those two set and `ADYEN_HMAC_KEY` missing would have
   * behaved like this: sessions created, GCash charged, and then every single
   * notification refused by the webhook with a 503 ("ADYEN_HMAC_KEY is not
   * configured; refusing the notification"). That refusal is the RIGHT call -
   * accepting an unverifiable notification would be far worse - but it leaves
   * the resident's money taken and nothing in the ledger against it. Adyen
   * retries, so it would eventually reconcile once the key was set, and until
   * then the portal shows an unpaid bill for rent that has been paid.
   *
   * The gate now covers the whole round trip. `isWebhookConfigured` is the same
   * predicate the webhook route itself uses, so the two cannot drift: if the
   * webhook would refuse the notification, this refuses to create the session
   * that produces it.
   *
   * `clientKey` is included because the Drop-in cannot mount without it, so a
   * session created without one is a session nobody can pay.
   */
  isLiveConfigured(): boolean {
    const { apiKey, merchantAccount, clientKey, hmacKey } = config.adyen;
    const real = (v: string | undefined) => Boolean(v && !v.startsWith('mock_'));
    return real(apiKey) && real(merchantAccount) && real(clientKey) && isWebhookConfigured(hmacKey);
  },

  /**
   * Initializes a real Adyen Checkout Session via official Adyen v71 REST API.
   * Automatically falls back to local simulation if Adyen API is unreachable.
   */
  async createCheckoutSession(
    billId: string,
    tenantProfileId: string,
    amount: number,
    returnUrl?: string,
    shopperEmail?: string | null
  ) {
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
            expiresAt: sessionExpiresAt(Date.now()),
            shopperLocale: 'en-US',
            channel: 'Web',
            /**
             * Every session this project ever created omitted shopper identity
             * entirely - no reference, no email. Adyen's risk engine runs in
             * TEST the same as it does live, and a payment with zero shopper
             * context is exactly what a default risk rule is written to catch:
             * this is the leading suspect for a GCash attempt that returns 200
             * from the client-side call and "Refused" immediately, with no
             * redirect and no record ever appearing in the Payments list at
             * all - refused ahead of becoming a transaction, not declined as
             * one. `shopperReference` stable per tenant (their own profile id,
             * already in hand - no extra query), `shopperEmail` only when the
             * account actually has one (OD-09 - a phone-only tenant may not).
             */
            shopperReference: tenantProfileId,
            ...(shopperEmail ? { shopperEmail } : {}),
          }),
        });

        const data = (await response.json()) as any;
        if (response.ok && data.id) {
          sweepExpiredSessions(Date.now());
          checkoutSessions.set(data.id, {
            billId, tenantProfileId, amount, returnUrl: fallbackReturnUrl, createdAt: Date.now(),
          });
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
    sweepExpiredSessions(Date.now());
    checkoutSessions.set(sessionId, {
      billId, tenantProfileId, amount, returnUrl, createdAt: Date.now(),
    });
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
      // The oldest period her records do not cover, as the checkout route uses
      // (computeStanding). A payment already taken still needs a bill, so with
      // nothing owed it falls back to the current cycle rather than refusing.
      const standing = await readStanding(session.tenantProfileId);
      const period = standing?.owedPeriods[0]
        ? await billPeriodFor(standing.owedPeriods[0])
        : await computeBillPeriod(resolvedAnniversary ?? new Date());

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
    sweepExpiredSessions(Date.now());
    const session = checkoutSessions.get(sessionId);
    if (!session) {
      throw ApiError.notFound(SESSION_UNAVAILABLE);
    }

    // The session is a bearer capability. Confirm it belongs to the caller, so one
    // tenant cannot read the outcome of another tenant's checkout by holding its id.
    // Same string as above, deliberately - see SESSION_UNAVAILABLE.
    if (session.tenantProfileId !== tenantProfileId) {
      throw ApiError.notFound(SESSION_UNAVAILABLE);
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

    /**
     * Has the webhook's row arrived FOR THIS CHECKOUT?
     *
     * Matched by bill rather than by pspReference, because the browser never
     * learns it and Adyen's session-result endpoint does not return it either -
     * that response is `{ status, message }` and nothing more. So the best
     * available identity is the bill plus the window this checkout has been open.
     *
     * It used to match ANY `Adyen Online` row on the bill at ANY status. A
     * resident whose earlier attempt left a row - including one the landlady had
     * since REJECTED - was told their new payment was recorded and waiting for
     * her, before its notification had arrived and possibly before it ever would.
     * The screen said the safe thing about the wrong payment.
     *
     * Now: created since this checkout began, and not refused. If nothing has
     * arrived yet `recorded` is false, which is exactly right - it means "not
     * yet", and the interface says Adyen has confirmed it and the record is on
     * its way.
     */
    let recorded = false;
    if (session.billId) {
      const { data: existing } = await db
        .from('payments')
        .select('id')
        .eq('bill_id', session.billId)
        .eq('payment_method', 'Adyen Online')
        .neq('verification_status', 'Rejected')
        .gte('created_at', new Date(session.createdAt).toISOString())
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
          // Read by the Activity screen, which labels this row as the tenant's
          // return rather than as a second "Payment recorded" beside the webhook's.
          status: 'Confirmed On Return',
          sessionId,
          adyenSessionStatus: status,
          webhookRowPresent: recorded
        },
        ipAddress: null
      }).catch(() => {});

      checkoutSessions.delete(sessionId);
    }

    return { status, confirmed, recorded };
  },

  /**
   * The GCash return leg: asks Adyen what became of the payment a resident has
   * just come back from. WRITES NOTHING - the webhook is the writer.
   *
   * GCash is a redirect method, so the browser comes back with `redirectResult`,
   * not `sessionResult`. The return page used to pass it to `confirmCheckout`
   * above as if it were one, and it failed twice over: the session-result
   * endpoint does not accept a redirectResult, and the session itself lives in
   * this process's memory, which on Vercel is often not the instance the
   * resident comes back to. The first GCash payment that ever succeeded
   * (NDQW3Z5ZQL8MNB75, 2026-09-26) was answered "Could not confirm your payment
   * here".
   *
   * `/payments/details` is Adyen's own way to finish a redirect, it is called
   * server to server with our API key, and its answer carries the pspReference
   * and our merchantReference. So nothing here depends on memory: the bill comes
   * from the reference, ownership from the bill, and "recorded" is an exact
   * match on the pspReference the webhook stores.
   */
  async confirmRedirect(redirectResult: string, tenantProfileId: string) {
    if (!this.isLiveConfigured()) {
      throw ApiError.internal('Adyen is not configured in this environment.');
    }
    assertAdyenEnvironmentWired();

    let body: { resultCode?: string; pspReference?: string; merchantReference?: string; message?: string };
    let ok: boolean;
    let httpStatus: number;
    try {
      const response = await fetch(`${ADYEN_CHECKOUT_HOST}/payments/details`, {
        method: 'POST',
        headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: { redirectResult } }),
      });
      ok = response.ok;
      httpStatus = response.status;
      body = (await response.json()) as typeof body;
    } catch (err) {
      throw ApiError.internal(
        `Could not reach Adyen to confirm this payment: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!ok || typeof body.resultCode !== 'string') {
      throw ApiError.validation(
        `Adyen did not accept this checkout result: ${body.message ?? `HTTP ${httpStatus}`}`
      );
    }

    // Same shape the webhook matches: `BILL-<uuid>-<timestamp>`.
    const billId = String(body.merchantReference ?? '').match(
      /^BILL-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    )?.[1];
    if (!billId) throw ApiError.notFound(SESSION_UNAVAILABLE);

    const { data: bill, error: billError } = await db
      .from('bills')
      .select('id, tenant_profile_id')
      .eq('id', billId)
      .maybeSingle();
    if (billError) throw ApiError.internal(billError.message);
    // One string for "no such bill" and "not your bill" - see SESSION_UNAVAILABLE.
    if (!bill || bill.tenant_profile_id !== tenantProfileId) {
      throw ApiError.notFound(SESSION_UNAVAILABLE);
    }

    // Translated into the words the return page already has for a session.
    // Only Authorised is success; anything unrecognised is "not completed".
    const status =
      ({ Authorised: 'completed', Pending: 'paymentPending', Received: 'paymentPending',
         Refused: 'refused', Cancelled: 'canceled' } as Record<string, string>)[body.resultCode] ??
      body.resultCode.toLowerCase();
    const confirmed = status === 'completed';

    let recorded = false;
    if (body.pspReference) {
      const { data: rows, error: rowsError } = await db
        .from('payments')
        .select('id')
        .eq('transaction_reference', body.pspReference)
        .neq('verification_status', 'Rejected')
        .limit(1);
      // A failed read leaves `recorded` false, which the page words as "being
      // recorded, do not pay again" - the safe reading. Logged, not swallowed.
      if (rowsError) console.error(`[adyen] could not look up ${body.pspReference}: ${rowsError.message}`);
      recorded = Boolean(rows && rows.length > 0);
    }

    if (confirmed) {
      await recordAudit({
        actorProfileId: tenantProfileId,
        action: 'PAYMENT_RECORD',
        entityType: 'PAYMENT',
        entityId: billId,
        newValues: {
          note: 'Adyen confirmed a completed GCash payment to the returning browser. ' +
                'No payment was written here - the webhook is the writer.',
          status: 'Confirmed On Return',
          pspReference: body.pspReference ?? null,
          adyenResultCode: body.resultCode,
          webhookRowPresent: recorded
        },
        ipAddress: null
      }).catch(() => {});
    }

    return { status, confirmed, recorded };
  }
};

