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

  if (!pspReference) {
    return { pspReference: '', eventCode, outcome: 'failed', detail: 'no pspReference' };
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

  // --- idempotency --------------------------------------------------------
  const { data: existing, error: lookupError } = await db
    .from('payments')
    .select('id')
    .eq('transaction_reference', pspReference)
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
    const { data: bill } = await db
      .from('bills')
      .select('id, room_id, tenant_profile_id')
      .eq('id', uuidMatch[1])
      .maybeSingle();

    if (bill) {
      billId = bill.id;
      roomId = bill.room_id;
      tenantProfileId = bill.tenant_profile_id;
    }
  }

  const minorUnits = Number(item.amount?.value ?? 0);
  const amount = Math.round(minorUnits) / 100;

  if (!(amount > 0)) {
    return { pspReference, eventCode, outcome: 'failed', detail: 'non-positive amount' };
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
      paid_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (payError) {
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
      verification_status: 'Pending Verification'
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
