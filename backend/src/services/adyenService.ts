/**
 * @file services/adyenService.ts
 * @description Mock Adyen payment gateway service for Hivelet.
 * 
 * @systemBibleRef Section 12 (Payment Types)
 * @businessRules  BR-016 (Online Payment), BR-017 (Payment Verification)
 * @requirements   FR-015 (Online Payments), FR-016 (Payment Verification)
 * 
 * @architectureRationale 
 * Exposing checkout session handlers entirely on the backend to enforce the
 * database security boundary (04_ARCHITECTURE.md). It stores temporary, 
 * unverified payment session states in an in-memory server Map rather than 
 * writing premature entries directly to the database.
 * 
 * @keyInnovations
 * Provides a mock checkout pipeline mimicking Adyen's asynchronous webhook 
 * workflow. This enables students/evaluators to verify and demonstrate online 
 * GCash transactions on local development systems without creating external 
 * developer accounts or incurring subscription fees.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../config/db.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from './auditService.js';
import { computeBillAmounts, computeBillPeriod } from './billingService.js';
import { safeReturnUrl, defaultReturnUrl } from '../utils/safeRedirect.js';

export interface SessionDetails {
  billId: string;
  tenantProfileId: string;
  amount: number;
  returnUrl?: string;
}

// In-memory mapping of active checkout session IDs to transaction metadata.
const checkoutSessions = new Map<string, SessionDetails>();

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
      try {
        const response = await fetch('https://checkout-test.adyen.com/v71/sessions', {
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
            environment: 'test',
            isLive: true,
            redirectUrl: `/api/public/payments/mock-gateway?sessionId=${data.id}`
          };
        }
        console.warn('[Adyen Service] Live session call returned non-200, using local gateway:', data);
      } catch (err) {
        console.error('[Adyen Service] Failed connecting to Adyen v71 API, using local gateway:', err);
      }
    }

    return this.createMockCheckoutSession(billId, tenantProfileId, amount, fallbackReturnUrl);
  },

  /**
   * Initializes a GCash checkout session (Hybrid: live or mock sandbox).
   * Creates a transaction session mapping bill & tenant identification to a temporary session token.
   */
  createMockCheckoutSession(billId: string, tenantProfileId: string, amount: number, returnUrl?: string) {
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
    const redirectUrl = `/api/public/payments/mock-gateway?sessionId=${sessionId}`;
    return {
      sessionId,
      sessionData: null,
      clientKey: config.adyen.clientKey,
      environment: 'test',
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
   * Finalizes payment on checkout completion.
   * Inserts the payment in Pending Verification status to respect BR-017,
   * creates an immutable audit record, and triggers an administrator alert notification.
   */
  async completeMockPayment(sessionId: string, ipAddress: string | null) {
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

      if (billError) {
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
    const transactionReference = `ADYEN-GCASH-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    // Insert payment record. Status MUST be 'Pending Verification' (BR-017 / System Bible Section 12)
    const { data: payment, error: payError } = await db
      .from('payments')
      .insert({
        bill_id: resolvedBillId,
        tenant_profile_id: session.tenantProfileId,
        room_id: resolvedRoomId,
        amount: session.amount,
        payment_method: 'Adyen Online',
        payment_source: 'GCash Sandbox',
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
      await db.from('notifications').insert({
        recipient_profile_id: admins[0].id,
        title: 'New Online GCash Payment',
        message: `Tenant has submitted payment of ₱${session.amount.toLocaleString()} for verification (Ref: ${transactionReference}).`,
        type: 'Payment',
        priority: 'Medium',
        is_read: false
      });
    }

    checkoutSessions.delete(sessionId);
    return { success: true, paymentReference: transactionReference };
  }
};
