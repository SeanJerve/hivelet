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

// ------------------------------------------------------------- idempotency --
console.log('\n3. IDEMPOTENCY — the same notification twice');

{
  const item = signedItem();
  const first = await post(item);
  const second = await post(item);
  check('the same notification delivered twice is accepted both times',
    first.status === 200 && second.status === 200, `HTTP ${first.status} then ${second.status}`);
}

// ------------------------------------------------------------- the footprint --
console.log('\n4. THE FOOTPRINT — what an hour of refusals left behind');

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
