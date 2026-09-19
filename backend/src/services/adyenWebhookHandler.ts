/**
 * @file services/adyenWebhookHandler.ts
 * @description Processes verified Adyen notifications into payment records.
 * @businessRules BR-016, BR-017 (administrator verification gate), BR-028 (audit)
 *
 * This runs only AFTER `adyenWebhook.verifyNotificationItem()` has accepted the
 * signature. Nothing here re-checks it - separating "is this really from Adyen"
 * from "what does it mean" keeps both readable, and means the verification cannot
 * be accidentally skipped by a branch added later in the processing logic.
 *
 * THE RULE THIS FILE EXISTS TO HONOUR
 * -----------------------------------
 * A verified, successful AUTHORISATION still does **not** settle a bill. It writes
 * a payment in `Pending Verification` for a human holding `payment:verify` to act
 * on (BR-017). Adyen telling us the money moved is good evidence; it is not the
 * landlady's decision, and the ledger records her decision.
 */
import { db } from '../config/db.js';
import { recordAudit } from './auditService.js';
import { notificationService } from './notificationService.js';
import type { AdyenNotificationItem } from './adyenWebhook.js';
import { resolveEventTime } from './adyenWebhook.js';
import { propertyParts } from '../utils/propertyClock.js';

export interface WebhookResult {
  pspReference: string;
  eventCode: string;
  outcome: 'recorded' | 'duplicate' | 'ignored' | 'unmatched' | 'failed';
  detail?: string;
}

/**
 * Applies one verified notification item.
 *
 * Idempotent by `pspReference`: Adyen retries a notification until it receives
 * `[accepted]`, so the same event WILL arrive more than once in normal operation.
 * Storing the pspReference as `transaction_reference` and checking for it first is
 * what stops a retry becoming a second payment row.
 */
/**
 * NOTE ON `entityId` IN THE AUDIT ROWS BELOW.
 *
 * `audit_logs.entity_id` is a `uuid NOT NULL`, and a pspReference is not a uuid -
 * `auditService` therefore substitutes the nil uuid. Where no local payment row
 * exists yet there is no uuid to record, so **every** audit row here carries the
 * `pspReference` inside `new_values` instead. Without that these rows say
 * "reconcile manually" without saying what to reconcile, which is how an audit
 * trail becomes decoration.
 */
export async function applyNotificationItem(
  item: AdyenNotificationItem,
  ipAddress: string | null
): Promise<WebhookResult> {
  const pspReference = String(item.pspReference ?? '');
  const eventCode = String(item.eventCode ?? '');
  const success = String(item.success ?? '') === 'true';

  /**
   * A NOTIFICATION THAT CAN NEVER SUCCEED MUST BE ACKNOWLEDGED, NOT RETRIED.
   *
   * Both this and the amount check below returned `failed`, and the route turns
   * `failed` into HTTP 500 - which is exactly the signal that tells Adyen to
   * send it again. Neither condition can change on a retry, so Adyen would
   * resend on its full schedule and eventually DISABLE THE WEBHOOK for excessive
   * failures, taking the real notification path down with it.
   *
   * This file already argues that case correctly for the unique-violation
   * branch further down: "Reporting that as `failed` would be worse than the
   * duplicate it prevents ... a notification that can never be acknowledged and
   * never stops coming." These two sat above it and fell into the same trap.
   *
   * `ignored` answers 200 so Adyen stops. The audit row is what keeps it from
   * being silent - a malformed notification is not routine, and a console line
   * is not a record.
   */
  if (!pspReference) {
    await recordAudit({
      actorProfileId: null,          // nobody signed in; this is Adyen calling
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: '00000000-0000-0000-0000-000000000000',
      newValues: {
        eventCode,
        note: 'Adyen notification arrived with NO pspReference and was acknowledged without ' +
              'being recorded. It cannot be matched to anything; nothing was written. ' +
              'Acknowledged deliberately so Adyen stops retrying a notification that can ' +
              'never succeed.',
      },
      ipAddress,
    });
    return { pspReference: '', eventCode, outcome: 'ignored', detail: 'no pspReference' };
  }

  // Only authorisations create money in this system. Everything else - captures,
  // refunds, chargebacks, reports - is acknowledged so Adyen stops retrying, and
  // recorded in the audit log, but changes no ledger row.
  if (eventCode !== 'AUTHORISATION') {
    await recordAudit({
      actorProfileId: null,
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: pspReference,
      newValues: { pspReference, merchantReference: item.merchantReference ?? null, eventCode, success,
                   note: 'Adyen notification acknowledged, no ledger effect' },
      ipAddress
    });
    return { pspReference, eventCode, outcome: 'ignored', detail: 'not an AUTHORISATION' };
  }

  // A failed authorisation is real information - the tenant tried and it did not
  // go through - but it is not money, so it is audited rather than banked.
  if (!success) {
    await recordAudit({
      actorProfileId: null,
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: pspReference,
      newValues: { pspReference, merchantReference: item.merchantReference ?? null, eventCode, success: false,
                   reason: item.additionalData?.refusalReason ?? null },
      ipAddress
    });
    return { pspReference, eventCode, outcome: 'ignored', detail: 'authorisation refused' };
  }

  /**
   * IDEMPOTENCY, SCOPED TO MATCH THE INDEX THAT BACKS IT.
   *
   * This matched `transaction_reference` across EVERY payment, whatever its
   * method. Migration 040 deliberately narrowed the unique index to
   * `payment_method = 'Adyen Online'`, because the on-site path writes ONE
   * reference across SEVERAL rows on purpose - BR-013 splits a receipt into a
   * row per bill plus an advance - so a repeat is legitimate there.
   *
   * A lookup wider than its index has two failure modes, and both are bad:
   *
   *   - ONE non-gateway row whose reference happens to equal an incoming
   *     pspReference makes `existing` truthy. Outcome `duplicate`, HTTP 200,
   *     Adyen stops retrying, and a REAL PAYMENT IS NEVER RECORDED - silently,
   *     with no warning anywhere.
   *   - TWO OR MORE of them make `maybeSingle()` error. Outcome `failed`, HTTP
   *     500, and Adyen retries that notification forever against a read that
   *     cannot succeed.
   *
   * The reference the administrator types is `transactionReference ||
   * invoiceNumber`, so the natural way to hit this is her reconciling an online
   * payment by writing its reference on the receipt.
   *
   * Scoped to the same predicate as the index, so the two cannot disagree.
   */
  const { data: existing, error: lookupError } = await db
    .from('payments')
    .select('id')
    .eq('transaction_reference', pspReference)
    .eq('payment_method', 'Adyen Online')
    .maybeSingle();

  if (lookupError) {
    return { pspReference, eventCode, outcome: 'failed', detail: lookupError.message };
  }
  if (existing) {
    return { pspReference, eventCode, outcome: 'duplicate' };
  }

  // --- who and what is this for? ------------------------------------------
  // `merchantReference` is what we sent Adyen at session creation:
  // `BILL-<first 8 of bill uuid>-<timestamp>`. That prefix is how the money finds
  // its way home. If it cannot be matched we still record the payment rather than
  // discard it - an unattributed payment is a support question, a lost one is a
  // tenant who paid and cannot prove it.
  const merchantReference = String(item.merchantReference ?? '');

  // `BILL-<uuid>-<timestamp>`. Extract the uuid and match it exactly.
  //
  // This used to take an 8-character prefix and query `.like('id', 'xxxxxxxx%')`.
  // That silently matched NOTHING, every time: `id` is a `uuid` column and
  // PostgreSQL will not apply LIKE to a uuid without an explicit ::text cast, so
  // every webhook fell through to the unmatched branch. Caught by testing the
  // route against a real bill rather than a made-up reference.
  const uuidMatch = merchantReference.match(
    /^BILL-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );

  let billId: string | null = null;
  let roomId: string | null = null;
  let tenantProfileId: string | null = null;

  if (uuidMatch) {
    const { data: bill, error: billError } = await db
      .from('bills')
      .select('id, room_id, tenant_profile_id')
      .eq('id', uuidMatch[1])
      .maybeSingle();

    // Not fatal, and deliberately so: Adyen has taken the resident's money and
    // this notification must still be recorded. But a failed read is not "no
    // such bill" - it leaves billId, roomId and tenantProfileId null and the
    // payment is stored attached to nobody, so it never pays the debt down. It
    // is logged loudly rather than vanishing into an `if (bill)`.
    if (billError) {
      console.error(
        `[adyen] the bill for this notification could not be read (${uuidMatch[1]}): ` +
        `${billError.message}. The payment will be recorded unlinked and will not ` +
        'reduce any outstanding balance until it is matched by hand.'
      );
    }

    if (bill) {
      billId = bill.id;
      roomId = bill.room_id;
      tenantProfileId = bill.tenant_profile_id;
    }
  }

  const minorUnits = Number(item.amount?.value ?? 0);
  const amount = Math.round(minorUnits) / 100;

  if (!(amount > 0)) {
    // Permanent for this notification - see the note on the pspReference check
    // above. Adyen sends a zero-value AUTHORISATION to verify a payment method;
    // there is no money in it, and retrying it forever helps nobody.
    await recordAudit({
      actorProfileId: null,          // nobody signed in; this is Adyen calling
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: '00000000-0000-0000-0000-000000000000',
      newValues: {
        pspReference,
        eventCode,
        minorUnits,
        note: 'Adyen notification carried a non-positive amount and was acknowledged without ' +
              'being recorded. No money is involved. Acknowledged deliberately so Adyen stops ' +
              'retrying a notification that can never succeed.',
      },
      ipAddress,
    });
    return { pspReference, eventCode, outcome: 'ignored', detail: 'non-positive amount' };
  }

  if (!roomId || !tenantProfileId) {
    // The payments table requires both, so this cannot be written as a payment.
    // Audited loudly instead, with everything needed to reconcile it by hand.
    await recordAudit({
      actorProfileId: null,
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: pspReference,
      newValues: {
        pspReference, eventCode, success: true, amount, merchantReference,
        note: 'VERIFIED Adyen authorisation that could not be matched to a bill - reconcile manually'
      },
      ipAddress
    });
    await notificationService.notify({
      title: 'Unmatched online payment received',
      message:
        `An authorised payment of PHP ${amount.toFixed(2)} (ref ${pspReference}) could not be ` +
        `matched to a bill. It has NOT been recorded as a payment. Reconcile it manually.`,
      type: 'Payment',
      priority: 'High',
      relatedEntityType: 'PAYMENT'
    }).catch(() => {});
    return { pspReference, eventCode, outcome: 'unmatched' };
  }

  /**
   * WHEN THE MONEY MOVED, NOT WHEN WE HEARD ABOUT IT.
   *
   * `paid_at` was `new Date()` - the server's clock at handling time - and that
   * timestamp dates the owner's ledger row: `admin.ts` derives the income row's
   * year, month and date_paid from it.
   *
   * Delivery here is not prompt and is not meant to be. There is ONE shared
   * Adyen webhook and Adyen cannot reach a laptop, so whoever is testing points
   * it at their own tunnel and the URL changes on every restart (B-03). Retries
   * are the normal case, not the exception. A resident paying at 22:00 on
   * 30 September whose notification lands on 2 October had their rent filed into
   * OCTOBER, in the ledger she actually runs her business on.
   *
   * `eventDate` is Adyen's own timestamp for the event. It is NOT among the
   * eight HMAC-signed fields, so it is corroborating evidence rather than proof -
   * which is exactly the situation BR-036 already has a posture for: prefer the
   * better figure, and RECORD the divergence rather than swallowing it.
   *
   * Bounded before it is trusted. A value in the future beyond a little clock
   * skew, or older than 90 days, is not a delivery delay - it is a wrong or
   * tampered field, and the server's own clock is the safer answer.
   */
  const now = Date.now();
  const { paidAt, fromGateway, lateByHours } = resolveEventTime(item.eventDate, now);

  // The property's calendar, not the server's - a delay that looks small in UTC
  // can still cross a month boundary in Manila, and vice versa.
  const eventMonth = fromGateway ? propertyParts(paidAt).date.slice(0, 7) : null;
  const deliveredMonth = propertyParts(new Date(now)).date.slice(0, 7);
  const crossedMonth = fromGateway && eventMonth !== deliveredMonth;

  // --- record it, unsettled ------------------------------------------------
  const { data: payment, error: payError } = await db
    .from('payments')
    .insert({
      bill_id: billId,
      tenant_profile_id: tenantProfileId,
      room_id: roomId,
      amount,
      payment_method: 'Adyen Online',
      payment_source: 'GCash (Adyen webhook)',
      // BR-017. The gateway does not get to decide that a debt is settled.
      verification_status: 'Pending Verification',
      transaction_reference: pspReference,
      paid_at: paidAt
    })
    .select('id')
    .single();

  if (payError) {
    /**
     * A unique violation here means the payment is ALREADY RECORDED, which is a
     * duplicate and not a failure.
     *
     * The lookup above catches the ordinary retry. It cannot catch two retries
     * running at the same moment - both read "not found", both insert - and
     * that is precisely when Adyen retries: when the first attempt has not
     * answered yet. Migration `024`, narrowed by `040`, put a unique index on
     * `transaction_reference` so the database refuses the second insert, because
     * no amount of checking-before-inserting closes a race between two
     * connections.
     *
     * Reporting that as `failed` would be worse than the duplicate it prevents.
     * `failed` makes the route answer **500**, Adyen retries on 500, and the
     * retry hits the same index - a notification that can never be acknowledged
     * and never stops coming. `duplicate` answers 200, which is what tells Adyen
     * the payment is safely with us.
     *
     * `23505` is PostgreSQL's `unique_violation`.
     */
    if (payError.code === '23505') {
      return { pspReference, eventCode, outcome: 'duplicate', detail: 'already recorded' };
    }
    return { pspReference, eventCode, outcome: 'failed', detail: payError.message };
  }

  await recordAudit({
    actorProfileId: null,
    action: 'PAYMENT_RECORD',
    entityType: 'PAYMENT',
    entityId: payment.id,
    newValues: {
      source: 'adyen-webhook',
      pspReference,
      merchantReference,
      amount,
      bill_id: billId,
      verification_status: 'Pending Verification',
      paid_at: paidAt,
      /**
       * Recorded whenever the notification was late enough to land in a
       * different MONTH from the payment, in the property's own calendar.
       *
       * That is the delay that matters. An hour late changes nothing she will
       * ever notice; a delay that carries a 30 September payment into October
       * moves it between two monthly reports, and the first person to spot it
       * would otherwise have no way to tell a late delivery from a wrong date.
       */
      ...(crossedMonth
        ? {
            late_delivery_note:
              `Adyen delivered this ${lateByHours} hour(s) after the event, which falls in a ` +
              'DIFFERENT MONTH. paid_at is the event time, so the ledger dates it when the ' +
              'money moved rather than when we heard about it.',
            delivered_month: deliveredMonth,
            event_month: eventMonth,
          }
        : {}),
    },
    ipAddress
  });

  await notificationService.notify({
    title: 'Online payment awaiting verification',
    message:
      `PHP ${amount.toFixed(2)} received via GCash (ref ${pspReference}). ` +
      `It is pending your verification and has not settled the bill.`,
    type: 'Payment',
    priority: 'High',
    relatedEntityType: 'PAYMENT',
    relatedEntityId: payment.id
  }).catch(() => {});

  return { pspReference, eventCode, outcome: 'recorded' };
}
