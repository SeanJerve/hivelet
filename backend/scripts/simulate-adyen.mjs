/**
 * simulate:adyen — drive the real webhook with real signatures, before a person does.
 *
 * Run with `npm run simulate:adyen` from `backend/`, with the API up.
 *
 * WHY THIS EXISTS
 * ---------------
 * TESTING_REHEARSAL.md step 15 has a person pay through GCash. That step proves
 * the whole chain at once and proves nothing about WHICH part failed when it
 * does. This exercises every path the gateway can take that does NOT involve
 * taking money, so the manual test is the last unknown rather than the first.
 *
 * Every notification below is signed with the REAL HMAC key, the same way Adyen
 * signs, and posted to the REAL endpoint. Nothing is stubbed. If the signature
 * construction, the Basic Auth, the currency guard or the acknowledgement
 * behaviour is wrong, this says so.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It never simulates a SUCCESSFUL payment for a real bill. That would write a
 * `payments` row against somebody's tenancy and an income row behind it, and
 * this is a live database with no staging copy.
 *
 * Every case here is one the system must REFUSE or IGNORE, so the expected
 * footprint is: no payment rows, no bills, no income rows. The handler does
 * write an audit row for some refusals - deliberately, because a malformed
 * notification is not routine - so every pspReference is prefixed `SIMULATION-`
 * and the run reports exactly what it left behind.
 *
 * READ THE FOOTPRINT AT THE END. If it says a payment row appeared, something
 * is wrong and the manual test should not go ahead.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { computeSignature } from '../dist/services/adyenWebhook.js';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const API = process.env.SIMULATE_API ?? 'http://127.0.0.1:5000/api';
const WEBHOOK = `${API}/public/payments/adyen/webhook`;
const HMAC = process.env.ADYEN_HMAC_KEY;
const MERCHANT = process.env.ADYEN_MERCHANT_ACCOUNT;
const WH_USER = process.env.ADYEN_WEBHOOK_USER;
const WH_PASS = process.env.ADYEN_WEBHOOK_PASSWORD;

if (!HMAC || !MERCHANT) {
  console.error('simulate:adyen — ADYEN_HMAC_KEY / ADYEN_MERCHANT_ACCOUNT are not set.');
  process.exit(2);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

let pass = 0;
let fail = 0;
const failures = [];
const check = (label, ok, detail = '') => {
  ok ? pass++ : (fail++, failures.push(label));
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
};

const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

/** A notification item, signed exactly as Adyen signs it. */
function signedItem(overrides = {}) {
  const item = {
    pspReference: `SIMULATION-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    originalReference: '',
    merchantAccountCode: MERCHANT,
    merchantReference: 'SIMULATION-no-such-bill',
    amount: { value: 100, currency: 'PHP' },
    eventCode: 'AUTHORISATION',
    success: 'true',
    eventDate: new Date().toISOString(),
    ...overrides,
  };
  item.additionalData = { hmacSignature: computeSignature(item, HMAC) };
  return item;
}

async function post(item, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && WH_USER && WH_PASS) headers.Authorization = basic(WH_USER, WH_PASS);
  const r = await fetch(WEBHOOK, {
    method: 'POST',
    headers,
    body: JSON.stringify({ notificationItems: [{ NotificationRequestItem: item }] }),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body, basicAuth: Boolean(r.headers.get('www-authenticate')) };
}

const count = async (table, filter) => {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filter ?? {})) q = q.eq(k, v);
  return (await q).count ?? 0;
};

const before = {
  payments: await count('payments'),
  bills: await count('bills'),
  income: await count('monthly_income_records'),
  audit: await count('audit_logs'),
};

console.log('simulate:adyen — driving the real webhook with real signatures\n');
console.log(`  endpoint   ${WEBHOOK}`);
console.log(`  merchant   ${MERCHANT}`);
console.log(`  basic auth ${WH_USER && WH_PASS ? 'configured' : 'NOT configured'}`);
console.log(`  before     ${before.payments} payments, ${before.bills} bills, ${before.income} income rows\n`);

// ---------------------------------------------------------------- the door --
console.log('1. THE DOOR — nothing gets in without both credentials and a signature');

{
  const r = await post(signedItem(), { auth: false });
  check('no Authorization header is refused', r.status === 401 && r.basicAuth, `HTTP ${r.status}`);
}
{
  const headers = { 'Content-Type': 'application/json', Authorization: basic(WH_USER, 'wrong') };
  const res = await fetch(WEBHOOK, {
    method: 'POST', headers,
    body: JSON.stringify({ notificationItems: [{ NotificationRequestItem: signedItem() }] }),
  });
  check('a wrong password is refused at the door',
    res.status === 401 && Boolean(res.headers.get('www-authenticate')), `HTTP ${res.status}`);
}
{
  const item = signedItem();
  item.additionalData.hmacSignature = 'not-a-valid-signature';
  const r = await post(item);
  check('a forged signature is refused past the door',
    r.status === 401 && !r.basicAuth, `HTTP ${r.status}`);
}
{
  // Correct signature, then one field altered - the signature no longer covers it.
  const item = signedItem();
  item.amount = { value: 999999, currency: 'PHP' };
  const r = await post(item);
  check('an amount changed after signing is refused',
    r.status === 401 && !r.basicAuth, `HTTP ${r.status}`);
}

// --------------------------------------------------- what it declines to bank --
console.log('\n2. WHAT IT DECLINES TO BANK — correctly signed, still not money');

{
  const r = await post(signedItem({ amount: { value: 5000, currency: 'JPY' } }));
  check('another currency is acknowledged and NOT banked as pesos',
    r.status === 200, `HTTP ${r.status} — a retry cannot make JPY into PHP`);
}
{
  const r = await post(signedItem({ merchantAccountCode: 'SomeoneElsesAccount' }));
  check('another merchant account is acknowledged and not recorded', r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await post(signedItem({ amount: { value: 0, currency: 'PHP' } }));
  check('a zero-value authorisation is acknowledged, not retried forever',
    r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await post(signedItem({ eventCode: 'CAPTURE' }));
  check('a non-AUTHORISATION event is acknowledged without ledger effect', r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await post(signedItem({ success: 'false' }));
  check('a REFUSED authorisation is acknowledged and not banked', r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await post(signedItem());
  check('a payment for a bill that does not exist is acknowledged, not 500',
    r.status === 200, `HTTP ${r.status} — Adyen must stop retrying an unmatchable notification`);
}

// ------------------------------------------- when the money goes back out --
console.log('\n3. WHEN THE MONEY GOES BACK OUT — refunds, chargebacks, cancellations');

/**
 * These events change no ledger row on purpose (BR-048: reversing a payment is
 * the administrator's decision, not the gateway's), so the thing to prove is
 * that she is TOLD. Until 2026-09-20 every non-AUTHORISATION event wrote an
 * audit row and nothing else - a chargeback and a routine capture were handled
 * identically, and the first she would have known of money leaving was a bank
 * balance that did not reconcile.
 *
 * The CAPTURE case at the end is the one that makes the others mean something.
 * A rule that notifies on everything is not a rule.
 */
const notifCount = async () =>
  (await db.from('notifications').select('*', { count: 'exact', head: true })).count ?? 0;

// A real recorded Adyen payment, so the "names the payment" path is exercised
// for real rather than asserted. Read-only; nothing about this row is touched.
const { data: realPayments } = await db
  .from('payments')
  .select('transaction_reference, amount, rooms(room_number)')
  .eq('payment_method', 'Adyen Online')
  .not('transaction_reference', 'is', null)
  .limit(1);
const realRef = realPayments?.[0]?.transaction_reference ?? null;
const realRoom = realPayments?.[0]?.rooms?.room_number ?? null;

{
  const n0 = await notifCount();
  const r = await post(signedItem({ eventCode: 'CHARGEBACK', originalReference: realRef ?? '' }));
  const n1 = await notifCount();
  check('a CHARGEBACK is acknowledged and RAISES a notification',
    r.status === 200 && n1 === n0 + 1, `HTTP ${r.status}, ${n1 - n0} notification(s)`);

  if (realRef) {
    const { data: raised } = await db
      .from('notifications')
      .select('message, priority')
      .like('message', `%${realRef}%`)
      .order('created_at', { ascending: false })
      .limit(1);
    const msg = raised?.[0]?.message ?? '';
    check('the chargeback notification NAMES the unit and the amount, not just a reference',
      msg.includes(`unit ${realRoom}`) && /PHP [\d,]+\.\d\d/.test(msg),
      realRoom ? `looked for "unit ${realRoom}" and a peso figure` : 'no unit to look for');
    check('a chargeback is raised at Emergency priority',
      raised?.[0]?.priority === 'Emergency', `priority ${raised?.[0]?.priority ?? 'none'}`);
  }
}
{
  const n0 = await notifCount();
  const r = await post(signedItem({ eventCode: 'REFUND', originalReference: realRef ?? '' }));
  const n1 = await notifCount();
  check('a REFUND is acknowledged and raises a notification',
    r.status === 200 && n1 === n0 + 1, `HTTP ${r.status}, ${n1 - n0} notification(s)`);
}
{
  const n0 = await notifCount();
  const r = await post(signedItem({ eventCode: 'CANCELLATION', originalReference: realRef ?? '' }));
  const n1 = await notifCount();
  check('a CANCELLATION is acknowledged and raises a notification',
    r.status === 200 && n1 === n0 + 1, `HTTP ${r.status}, ${n1 - n0} notification(s)`);
}
{
  // The discriminator. A capture is routine and must NOT reach her inbox, or
  // the inbox stops being read and the chargeback goes unnoticed with it.
  const n0 = await notifCount();
  const r = await post(signedItem({ eventCode: 'CAPTURE', originalReference: realRef ?? '' }));
  const n1 = await notifCount();
  check('a routine CAPTURE is acknowledged and raises NOTHING',
    r.status === 200 && n1 === n0, `HTTP ${r.status}, ${n1 - n0} notification(s) — an inbox ` +
    'that cries wolf on every event is an inbox nobody reads');
}
{
  // None of the four above may touch the ledger, whatever else they do.
  const p = await count('payments');
  check('none of the reversal events changed a payment row', p === before.payments,
    `${before.payments} -> ${p}`);
}

// ------------------------------------------------------------- idempotency --
console.log('\n4. IDEMPOTENCY — the same notification twice');

{
  const item = signedItem();
  const first = await post(item);
  const second = await post(item);
  check('the same notification delivered twice is accepted both times',
    first.status === 200 && second.status === 200, `HTTP ${first.status} then ${second.status}`);
}

// ------------------------------------------------------------- the footprint --
console.log('\n5. THE FOOTPRINT — what an hour of refusals left behind');

const after = {
  payments: await count('payments'),
  bills: await count('bills'),
  income: await count('monthly_income_records'),
  audit: await count('audit_logs'),
};

check('no payment row was created', after.payments === before.payments,
  `${before.payments} -> ${after.payments}`);
check('no bill was raised', after.bills === before.bills, `${before.bills} -> ${after.bills}`);
check('no income row was written', after.income === before.income,
  `${before.income} -> ${after.income}`);
console.log(`  ..    ${after.audit - before.audit} audit row(s) written, which is intended — ` +
            'a refused or malformed notification is not routine and is recorded on purpose');

/**
 * CLEAN UP AFTER YOURSELF.
 *
 * Two of the paths above work exactly as intended and RAISE A HIGH-PRIORITY
 * NOTIFICATION to the administrator - an unmatched payment, and one on an
 * unexpected account or currency. That is the right response to a real
 * notification and pure noise from a simulated one, and the first run of this
 * script put five of them in the owner's inbox.
 *
 * They are operational messages, not the audit trail, so removing them is
 * legitimate in a way that removing an audit row would not be. Every reference
 * this script generates is prefixed `SIMULATION-`, which is what makes them
 * findable without touching anything real.
 *
 * The AUDIT rows stay. They record that a malformed notification was refused,
 * which is true and worth keeping - and `audit_logs` revokes DELETE anyway.
 */
const { data: cleaned, error: cleanError } = await db
  .from('notifications')
  .delete()
  .like('message', '%SIMULATION-%')
  .select('id');

if (cleanError) {
  console.log(`\n  !!    could not clear simulated notifications: ${cleanError.message}`);
  console.log('        remove them by hand, or they will look like real unmatched payments.');
} else {
  console.log(`\n  ..    cleared ${cleaned?.length ?? 0} simulated notification(s) from the ` +
              'administrator inbox - raised correctly, meaningless here');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFAILED:');
  for (const f of failures) console.log(`  - ${f}`);
  console.log('\nDo not run the manual GCash test until these are understood.');
}

/**
 * WHAT ONLY A REAL PAYMENT CAN PROVE, and what to watch for when you do it:
 *
 *   1. The Drop-in actually renders. It never did until 2026-09-20 - it mounted
 *      into a container that had not been drawn yet, so residents saw an empty
 *      box. If you see the GCash button, that fix holds.
 *   2. The amount matches the bill. Rent now comes from the owner's confirmed
 *      rate card (migration 045) and water is 200 a head for every unit
 *      including LF and LB (BR-040 errata).
 *   3. The return leg says something. Nothing read `redirectResult` before
 *      2026-09-20; you should now come back to a confirmation rather than a
 *      silent page.
 *   4. The bill stops inviting payment. It should show the amount as sent and
 *      awaiting verification, and a second tap should be refused.
 *   5. The payment is dated when you paid, not when the notification arrived.
 */
console.log(`
Only a real payment can prove the five things listed at the foot of this file:
the Drop-in renders, the amount is right, the return leg speaks, the bill stops
asking, and paid_at is when you paid. Everything else is covered above.`);

process.exit(fail === 0 ? 0 : 1);
