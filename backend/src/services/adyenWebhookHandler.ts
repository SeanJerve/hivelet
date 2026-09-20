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
import { config } from '../config/env.js';
import { recordAudit } from './auditService.js';
import { notificationService } from './notificationService.js';
import type { NotificationPriority } from './notificationService.js';
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
 * THE EVENTS WHERE MONEY MOVES THE OTHER WAY.
 *
 * Only an AUTHORISATION creates money here, and that is correct. But the branch
 * below used to treat EVERYTHING else identically - "acknowledged, no ledger
 * effect" - and that sentence is true of a CAPTURE and dangerously incomplete
 * for a CHARGEBACK.
 *
 * The situation it misses: a resident pays through GCash, the payment is
 * recorded and verified, and days later the money is taken back - by a dispute,
 * or by Mrs Fe herself refunding from the Adyen Customer Area because somebody
 * paid the wrong bill. Adyen tells us. We write an audit row and answer 200.
 * Her ledger still says the rent is in. Nothing in the app ever says otherwise,
 * and the first she learns of it is a bank balance that does not reconcile.
 *
 * WHY THIS DOES NOT REVERSE THE LEDGER ITSELF. It would be easy to void the
 * payment row here, and it would be wrong. BR-048 puts ledger authorship with
 * the administrator, and BR-017 already refuses to let the gateway decide that a
 * debt is settled - letting it decide unilaterally that one is UNsettled is the
 * same mistake facing the other way. A reversal also has a human question behind
 * it that no webhook can answer: does the resident still owe this, or was the
 * refund the correction? So the posture is BR-036's - warn, never silently
 * accept. She gets told, loudly, with the tenant and the unit named, and the
 * void goes through the attributed path she already has.
 *
 * `false` here means "worth recording, not worth waking anyone" - a capture or a
 * report is routine. Anything absent from this map keeps the old behaviour.
 */
const REVERSAL_EVENTS: Record<string, { priority: NotificationPriority; meaning: string }> = {
  CHARGEBACK: { priority: 'Emergency',
    meaning: 'the money has been TAKEN BACK by the payer’s bank or wallet provider' },
  SECOND_CHARGEBACK: { priority: 'Emergency',
    meaning: 'the money has been taken back a SECOND time after a dispute was lost' },
  NOTIFICATION_OF_CHARGEBACK: { priority: 'High',
    meaning: 'a dispute has been OPENED against this payment; the money is at risk but has not moved yet' },
  REQUEST_FOR_INFORMATION: { priority: 'High',
    meaning: 'the payer has queried this payment and Adyen needs evidence, usually within a deadline' },
  CHARGEBACK_REVERSED: { priority: 'Medium',
    meaning: 'a dispute was resolved in your favour and the money has been RETURNED to you' },
  REFUND: { priority: 'High',
    meaning: 'this payment has been refunded to the payer' },
  CANCEL_OR_REFUND: { priority: 'High',
    meaning: 'this payment has been cancelled or refunded' },
  CANCELLATION: { priority: 'High',
    meaning: 'this authorisation was cancelled before the money settled' },
  REFUND_FAILED: { priority: 'High',
    meaning: 'a refund was attempted and DID NOT go through - the payer has not been paid back' },
  REFUNDED_REVERSED: { priority: 'High',
    meaning: 'a refund was reversed and the money has come back to you' },
};

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
    const reversal = REVERSAL_EVENTS[eventCode];

    /**
     * NAME THE PAYMENT, NOT THE REFERENCE.
     *
     * "pspReference NFGS83KL was charged back" is a support ticket. "Unit 2e's
     * PHP 4,500 rent of 3 September has been charged back" is something she can
     * act on before the resident's next visit.
     *
     * `originalReference` is the pspReference of the AUTHORISATION being
     * modified, and it IS one of the eight HMAC-signed fields, so it is proof
     * rather than corroboration. Scoped to `payment_method = 'Adyen Online'` for
     * the same reason the idempotency lookup below is: migration 040 narrowed
     * the unique index to that predicate, and a lookup wider than its index can
     * find a row the index would allow to be a legitimate duplicate.
     *
     * If the lookup finds nothing the notification still goes out with the
     * reference alone - knowing less is not a reason to say nothing.
     *
     * But "we looked and there is no such payment" and "we could not look" are
     * different sentences, and only one of them is a reason for her to relax.
     * `check:writes` holds a ratchet on exactly this - a failed query must not
     * read as an empty result - and it caught this read the first time it ran.
     * Dropping the error would have had a chargeback on a real, recorded payment
     * announce itself as an unmatched reference on the day the database was
     * having trouble, which is the day she can least afford the wrong sentence.
     */
    let subject = '';
    const originalReference = String(item.originalReference ?? '').trim();
    if (reversal && originalReference) {
      const { data: original, error: originalError } = await db
        .from('payments')
        .select('id, amount, paid_at, verification_status, ' +
                'rooms(room_number), profiles!payments_tenant_profile_id_fkey(full_name)')
        .eq('transaction_reference', originalReference)
        .eq('payment_method', 'Adyen Online')
        .maybeSingle();

      // The embed makes supabase-js widen the row to a union it cannot narrow
      // here; the shape is asserted by the select above, not by the client types.
      const row = originalError ? null : (original as Record<string, any> | null);

      if (originalError) {
        subject =
          'Hivelet could NOT look up which payment this refers to - the lookup itself failed, ' +
          'so this may well be a payment you have already banked. Match it by reference on the ' +
          'Adyen dashboard. ';
      } else if (row) {
        const room = row.rooms?.room_number ?? 'an unknown unit';
        const who = row.profiles?.full_name ?? 'an unknown resident';
        const when = row.paid_at ? propertyParts(row.paid_at).date : 'an unknown date';
        subject =
          `It was PHP ${Number(row.amount).toFixed(2)} from ${who} (unit ${room}), paid ` +
          `${when} and currently recorded as "${row.verification_status}". `;
      } else {
        subject =
          'No payment with that reference is recorded in Hivelet, so nothing here needs voiding - ' +
          'but check the Adyen dashboard, because the money moved there. ';
      }
    }

    await recordAudit({
      actorProfileId: null,
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: pspReference,
      newValues: { pspReference, originalReference: originalReference || null,
                   merchantReference: item.merchantReference ?? null, eventCode, success,
                   note: reversal
                     ? `Adyen ${eventCode} acknowledged. The ledger was NOT changed - reversing a ` +
                       'recorded payment is the administrator’s decision (BR-048), not the ' +
                       'gateway’s. A high-priority notification was raised so she can void it ' +
                       'through the attributed path.'
                     : 'Adyen notification acknowledged, no ledger effect' },
      ipAddress
    });

    if (reversal) {
      await notificationService.notify({
        title: `Online payment: ${eventCode.replace(/_/g, ' ').toLowerCase()}`,
        message:
          `Adyen reports that ${reversal.meaning}. ${subject}` +
          'Hivelet has NOT changed the ledger, because reversing a payment is your decision and ' +
          'is recorded against your name. Check the Adyen dashboard, then void the payment here ' +
          'if the money really has gone back. ' +
          `Reference ${pspReference}${originalReference ? `, original payment ${originalReference}` : ''}.`,
        type: 'Payment',
        priority: reversal.priority,
        relatedEntityType: 'PAYMENT',
      }).catch(() => {});
    }

    return {
      pspReference, eventCode, outcome: 'ignored',
      detail: reversal ? `${eventCode} - administrator notified` : 'not an AUTHORISATION',
    };
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

  /**
   * THE CURRENCY AND THE MERCHANT ACCOUNT ARE SIGNED, AND WERE NEVER READ.
   *
   * `/100` is right for PHP and wrong for anything else. A zero-decimal currency
   * like JPY sends `value: 5000` for 5,000 yen, which this would bank as 50.00
   * pesos - a hundredfold understatement; a three-decimal currency errs the
   * other way. The conversion silently assumed a currency nobody had checked.
   *
   * Both fields ARE among the eight HMAC-signed values, so neither is forgeable -
   * this is not an attack surface, it is the difference between a gateway that
   * knows what it is banking and one that assumes. The session is pinned to PHP
   * and one merchant account, so anything else means the webhook is receiving
   * traffic it was not built for, and inventing a peso figure from it is the
   * worst available response.
   *
   * Acknowledged rather than failed, for the reason above: retrying cannot make
   * a JPY notification into a PHP one. Audited, because a payment arriving on
   * the wrong account is exactly the thing somebody needs to be told about.
   */
  const currency = String(item.amount?.currency ?? '').toUpperCase();
  const account = String(item.merchantAccountCode ?? '');
  const expectedAccount = config.adyen.merchantAccount;

  if (currency !== 'PHP' || (expectedAccount && account && account !== expectedAccount)) {
    await recordAudit({
      actorProfileId: null,
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: '00000000-0000-0000-0000-000000000000',
      newValues: {
        pspReference,
        eventCode,
        currency: currency || '(none)',
        merchantAccountCode: account || '(none)',
        note:
          'Adyen notification did not match this property: expected PHP on the configured ' +
          'merchant account. NOTHING WAS RECORDED - converting an unknown currency at 1/100 ' +
          'would have invented a peso figure. Acknowledged so Adyen stops retrying; the ' +
          'payment is on the Adyen dashboard and needs reconciling by hand.',
      },
      ipAddress,
    });
    await notificationService.notify({
      title: 'Online payment on an unexpected account or currency',
      message:
        `A payment (ref ${pspReference}) arrived as ${currency || 'an unknown currency'} on ` +
        `account "${account || 'unknown'}". It has NOT been recorded. Check the Adyen ` +
        'dashboard and reconcile it by hand.',
      type: 'Payment',
      priority: 'High',
      relatedEntityType: 'PAYMENT',
    }).catch(() => {});
    return { pspReference, eventCode, outcome: 'ignored', detail: `unexpected ${currency}/${account}` };
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
