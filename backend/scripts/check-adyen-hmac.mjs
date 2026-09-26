/**
 * Verifies the Adyen webhook HMAC implementation, and two things around it that
 * decide money: the checkout session expires inside its hold, and a gateway
 * event is described to the owner as what actually happened (FINAL_REVIEW F1, F4).
 *
 * Run with `npm run check:adyen` from `backend/`. Builds first, touches nothing,
 * and needs no credentials.
 *
 * NOTE ON WHAT THIS PROVES. These assertions verify the algorithm against Adyen's
 * published example and against Adyen's OWN library (`@adyen/api-library`'s
 * HmacValidator): the eight-field payload order, the raw join, hex key decoding,
 * HMAC-SHA256, base64 output, and constant-time comparison. They do NOT prove the
 * key on a server is the one Adyen signs with - only a real signed notification
 * proves that. Send a test webhook from Customer Area -> Developers -> Webhooks ->
 * Test, and read the server log.
 *
 * Until 2026-09-25 this file asserted that `:` and `\` inside a value were
 * escaped, and its "independent computation" called buildSignedPayload itself, so
 * it could not notice the escaping was not Adyen's rule. It now asks the library.
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  buildSignedPayload,
  computeSignature,
  verifyNotificationItem,
  isWebhookConfigured,
  resolveEventTime,
  cleanHmacKey,
  hmacKeyFingerprint
} from '../dist/services/adyenWebhook.js';
import { fingerprint as scriptFingerprint } from './hmac-fingerprint.mjs';

// Adyen's own signer, loaded by path: importing the whole library takes over a minute.
const AdyenHmac = createRequire(import.meta.url)('@adyen/api-library/lib/src/utils/hmacValidator.js').default;
const adyen = new AdyenHmac();

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const KEY = '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA0EB';

const base = {
  pspReference: '7914073381342284',
  originalReference: '',
  merchantAccountCode: 'TestMerchant',
  merchantReference: 'TestPayment-1407325143704',
  amount: { value: 1130, currency: 'EUR' },
  eventCode: 'AUTHORISATION',
  success: 'true'
};

// --- payload construction --------------------------------------------------
check('eight fields, colon separated, empty originalReference preserved',
  buildSignedPayload(base),
  '7914073381342284::TestMerchant:TestPayment-1407325143704:1130:EUR:AUTHORISATION:true');

// Joined RAW, as Adyen's library does for notifications: no escaping.
check('a colon inside a value is NOT escaped',
  buildSignedPayload({ ...base, merchantReference: 'a:b' }),
  '7914073381342284::TestMerchant:a:b:1130:EUR:AUTHORISATION:true');

check('a backslash inside a value is NOT escaped',
  buildSignedPayload({ ...base, merchantReference: 'x\\y' }),
  '7914073381342284::TestMerchant:x\\y:1130:EUR:AUTHORISATION:true');

check('boolean success is stringified',
  buildSignedPayload({ ...base, success: true }),
  '7914073381342284::TestMerchant:TestPayment-1407325143704:1130:EUR:AUTHORISATION:true');

// --- Adyen's published example, with its own key ----------------------------
const PUBLISHED_KEY = '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056';
check("Adyen's published example signs to Adyen's published signature",
  computeSignature(base, PUBLISHED_KEY), 'coqCmt/IZ4E3CzPvMY8zTjQVL5hYJUiBRg8UU+iCWo0=');

// --- agrees with Adyen's own library, including awkward values ---------------
for (const [label, item] of [
  ['the plain example', base],
  ['a colon in merchantReference', { ...base, merchantReference: 'INV:42' }],
  ['a backslash in merchantReference', { ...base, merchantReference: 'x\\y' }],
  ['a backslash then a colon', { ...base, merchantReference: 'x\\:y' }],
  ['a missing originalReference', { ...base, originalReference: undefined }],
  ['a real GCash-shaped reference', { ...base, merchantReference: 'BILL-4f1c2e2a-9b7d-4d1e-8a0b-2c3d4e5f6a7b-1790240000000', amount: { value: 890000, currency: 'PHP' } }],
]) {
  check(`matches Adyen's library: ${label}`, computeSignature(item, PUBLISHED_KEY), adyen.calculateHmac(item, PUBLISHED_KEY));
}

// --- a key as pasted into a dashboard ---------------------------------------
// Buffer.from(hex, 'hex') stops silently at the first non-hex character, so a
// wrapping quote or a leading space used to turn the key into a different one.
for (const [label, pasted] of [
  ['wrapped in double quotes', `"${PUBLISHED_KEY}"`],
  ['wrapped in single quotes', `'${PUBLISHED_KEY}'`],
  ['with a leading space', ` ${PUBLISHED_KEY}`],
  ['with a trailing newline', `${PUBLISHED_KEY}\n`],
]) {
  check(`a key ${label} still verifies`,
    verifyNotificationItem({ ...base, additionalData: { hmacSignature: 'coqCmt/IZ4E3CzPvMY8zTjQVL5hYJUiBRg8UU+iCWo0=' } }, pasted), true);
}
check('cleaning leaves a genuinely wrong key wrong',
  verifyNotificationItem({ ...base, additionalData: { hmacSignature: 'coqCmt/IZ4E3CzPvMY8zTjQVL5hYJUiBRg8UU+iCWo0=' } }, `"${'AB'.repeat(32)}"`), false);
check('cleanHmacKey strips one pair of quotes and the whitespace, nothing else', cleanHmacKey(`  "AB12"  `), 'AB12');

// --- the fingerprint the server logs equals the one the script prints --------
check('server and script fingerprints agree, however the key was pasted',
  [hmacKeyFingerprint(PUBLISHED_KEY), hmacKeyFingerprint(`"${PUBLISHED_KEY}"`), scriptFingerprint(` ${PUBLISHED_KEY}\n`)],
  Array(3).fill(scriptFingerprint(PUBLISHED_KEY)));

// --- signature matches an independent implementation -----------------------
const independent = createHmac('sha256', Buffer.from(KEY, 'hex'))
  .update('7914073381342284::TestMerchant:TestPayment-1407325143704:1130:EUR:AUTHORISATION:true', 'utf8').digest('base64');
check('HMAC matches an independent computation', computeSignature(base, KEY), independent);

// --- verification ----------------------------------------------------------
const signed = { ...base, additionalData: { hmacSignature: independent } };
check('accepts a correctly signed item', verifyNotificationItem(signed, KEY), true);

// Every field must be covered by the signature. If any of these were excluded,
// an attacker could alter that field and keep the signature valid.
for (const [label, mutated] of [
  ['amount value',      { ...signed, amount: { value: 999999, currency: 'EUR' } }],
  ['currency',          { ...signed, amount: { value: 1130, currency: 'PHP' } }],
  ['pspReference',      { ...signed, pspReference: 'OTHER' }],
  ['merchantReference', { ...signed, merchantReference: 'OTHER' }],
  ['merchantAccount',   { ...signed, merchantAccountCode: 'OTHER' }],
  ['eventCode',         { ...signed, eventCode: 'CANCELLATION' }],
  ['success flag',      { ...signed, success: 'false' }]
]) {
  check(`rejects a tampered ${label}`, verifyNotificationItem(mutated, KEY), false);
}

check('rejects a wrong signature', verifyNotificationItem({ ...base, additionalData: { hmacSignature: 'AAAA' } }, KEY), false);
check('rejects a missing signature', verifyNotificationItem(base, KEY), false);
check('rejects the placeholder key', verifyNotificationItem(signed, 'mock_hmac_key'), false);
check('rejects a wrong key', verifyNotificationItem(signed, 'AA'.repeat(32)), false);
check('does not throw on rubbish input', verifyNotificationItem({}, KEY), false);

// --- configuration guard ---------------------------------------------------
check('placeholder key is not "configured"', isWebhookConfigured('mock_hmac_key'), false);
check('empty key is not "configured"', isWebhookConfigured(''), false);
check('non-hex key is not "configured"', isWebhookConfigured('zzzz'), false);
check('a real hex key is "configured"', isWebhookConfigured(KEY), true);

/**
 * A SHORT hex key is not "configured".
 *
 * Added 2026-09-16 after a mutation exposed that nothing pinned the length. The
 * existing cases were '' (empty), 'zzzz' (not hex) and the 64-character key, so
 * relaxing `length >= 32` to `>= 2` broke none of them - and a two-character key
 * would then have counted as a real one.
 */
check('a short hex key is not "configured"', isWebhookConfigured('AABB'), false);
check('31 hex characters is not "configured"', isWebhookConfigured('A'.repeat(31)), false);
check('32 hex characters is "configured"', isWebhookConfigured('A'.repeat(32)), true);

/**
 * MUST FAIL CLOSED when the computation itself throws.
 *
 * `verifyNotificationItem` wraps `computeSignature` in try/catch. Nothing
 * asserted which way that catch returns, so changing it to `return true` -
 * accepting every notification whose signature could not even be computed -
 * broke no test at all. That is the worst possible direction for a verifier to
 * fail, because the caller is by definition untrusted.
 *
 * The item below has a getter that throws when the payload is assembled.
 */
const throwsOnRead = { additionalData: { hmacSignature: 'AAAA' } };
Object.defineProperty(throwsOnRead, 'amount', {
  get() { throw new Error('deliberate'); },
  enumerable: true,
});
check('a throwing item is REJECTED, never accepted',
  verifyNotificationItem(throwsOnRead, KEY), false);

/**
 * The comparison must stay constant-time.
 *
 * This one cannot be proven by result: `===` and `timingSafeEqual` return the
 * same boolean, so every behavioural assertion above passes either way. The
 * difference is only observable as timing, which a test cannot measure
 * reliably. So it is asserted against the SOURCE - the one place in this suite
 * where that is the honest thing to do.
 */
const verifierSource = readFileSync(
  new URL('../src/services/adyenWebhook.ts', import.meta.url), 'utf8'
);
check('the verifier still uses timingSafeEqual',
  /return\s+timingSafeEqual\(/.test(verifierSource), true);
// Not `provided !== 'string'` - that is a legitimate type guard, and asserting
// against it failed on the real source the first time this was written. What
// must never appear is a RETURN whose value is a direct comparison.
check('the verifier never returns a direct === comparison',
  /return\s+[^;\n]*[!=]==/.test(verifierSource), false);

/**
 * WHEN A PAYMENT IS DATED, AND WHEN THE GATEWAY'S WORD IS NOT TAKEN.
 *
 * `paid_at` dates the owner's ledger row. It used to be the moment we HANDLED
 * the notification, and delivery here is deliberately unreliable - one shared
 * webhook, a tunnel whose URL changes on every restart (B-03) - so a payment
 * made on 30 September could be filed into October.
 *
 * `eventDate` is Adyen's own timestamp and is NOT among the eight signed fields
 * above, so it is bounded before it is believed. These hold the boundaries
 * still: a plausible delay is honoured, an impossible one is not.
 */
const NOW = Date.parse('2026-09-20T12:00:00Z');
const HOUR = 3600000;
const et = (eventDate) => resolveEventTime(eventDate, NOW);

check('a two-day-late notification is dated when the money moved',
  et('2026-09-18T12:00:00Z').paidAt, '2026-09-18T12:00:00.000Z');
check('and the lateness is reported in hours', et('2026-09-18T12:00:00Z').lateByHours, 48);
check('a prompt notification is dated then too',
  et('2026-09-20T11:59:00Z').paidAt, '2026-09-20T11:59:00.000Z');
check('a missing eventDate falls back to our own clock',
  et(undefined).paidAt, new Date(NOW).toISOString());
check('an unparseable eventDate falls back', et('not a date').paidAt, new Date(NOW).toISOString());
check('an eventDate in the far future is NOT trusted',
  et('2027-01-01T00:00:00Z').fromGateway, false);
check('a small forward clock skew IS tolerated',
  et(new Date(NOW + 2 * 60 * 1000).toISOString()).fromGateway, true);
check('an eventDate older than 90 days is NOT trusted',
  et(new Date(NOW - 91 * 24 * HOUR).toISOString()).fromGateway, false);
check('89 days late is still a delivery delay, and trusted',
  et(new Date(NOW - 89 * 24 * HOUR).toISOString()).fromGateway, true);
check('a fallback never claims to come from the gateway', et(undefined).fromGateway, false);

/**
 * A CHECKOUT SESSION MUST NOT OUTLIVE THE HOLD THAT STOPS A SECOND ONE.
 *
 * The tenant checkout refuses a second session on a bill for CHECKOUT_HOLD_MS
 * after the first opens (migration 051). Adyen keeps a session payable for an
 * hour unless told otherwise, and the Drop-in stays mounted until the dialog is
 * closed - so without `expiresAt` a tab left open past the hold could take a
 * second full payment after a second session was opened and paid (FINAL_REVIEW
 * F1). Checked against the request body itself: `fetch` is replaced, so nothing
 * leaves this machine, and the environment values below are placeholders that
 * only make `isLiveConfigured()` true.
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-adyen-placeholder-secret-0123456789abcdef',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
  ADYEN_API_KEY: 'check-adyen-api-key',
  ADYEN_MERCHANT_ACCOUNT: 'CheckAdyenMerchant',
  ADYEN_CLIENT_KEY: 'test_checkadyenclientkey',
  ADYEN_HMAC_KEY: KEY,
  ADYEN_ENVIRONMENT: 'TEST',
});
const svc = await import('../dist/services/adyenService.js');
const realFetch = globalThis.fetch;
let sentBody = null;
globalThis.fetch = async (_url, init) => {
  sentBody = JSON.parse(String(init?.body ?? '{}'));
  return new Response(JSON.stringify({ id: 'CS_CHECK', sessionData: 'opaque' }), { status: 201 });
};
const opened = Date.now();
try {
  await svc.adyenService.createCheckoutSession(
    '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 6900
  );
} finally {
  globalThis.fetch = realFetch;
}
const HOLD_MS = svc.CHECKOUT_HOLD_MS ?? 15 * 60 * 1000;
const expiresMs = Date.parse(sentBody?.expiresAt ?? '');
check('the session request carries an expiresAt', Number.isFinite(expiresMs), true);
check('the session expires before the checkout hold lapses',
  Number.isFinite(expiresMs) && expiresMs <= opened + HOLD_MS, true);
check('but leaves the tenant at least ten minutes to pay',
  Number.isFinite(expiresMs) && expiresMs - opened >= 10 * 60 * 1000, true);
check('the amount still goes out in centavos', sentBody?.amount, { currency: 'PHP', value: 690000 });
const tenantRouteSource = readFileSync(new URL('../src/routes/tenant.ts', import.meta.url), 'utf8');
check('the tenant route takes the hold from adyenService rather than its own copy',
  /CHECKOUT_HOLD_MS\s*=/.test(tenantRouteSource), false);

/**
 * WHAT THE OWNER IS TOLD WHEN MONEY MOVES THE OTHER WAY - AND WHEN IT DID NOT.
 *
 * For a modification event Adyen's `success` says whether it happened. A REFUND
 * with success "false" is a refund Adyen refused: the money is still hers. It
 * was announced as "this payment has been refunded to the payer", with advice to
 * void the payment (FINAL_REVIEW F4). Driven through the real handler: the
 * database client and the notifier are replaced, so nothing is read or written.
 */
const { db: stubDb } = await import('../dist/config/db.js');
const { notificationService: stubNotifier } = await import('../dist/services/notificationService.js');
const { applyNotificationItem } = await import('../dist/services/adyenWebhookHandler.js');
const recordedPayment = {
  id: '00000000-0000-4000-8000-000000000003', amount: 6900, paid_at: '2026-09-03T02:00:00Z',
  verification_status: 'Verified', rooms: { room_number: '2e' }, profiles: { full_name: 'Test Tenant' },
};
const chain = () => new Proxy(() => {}, {
  get: (_t, prop) => prop === 'then'
    ? (resolve) => resolve({ data: recordedPayment, error: null })
    : () => chain(),
  apply: () => chain(),
});
const realFrom = stubDb.from;
const realNotify = stubNotifier.notify;
let told = [];
stubDb.from = () => chain();
stubNotifier.notify = async (opts) => { told.push(opts); return null; };
async function tell(eventCode, success) {
  told = [];
  const result = await applyNotificationItem({
    pspReference: 'MOD123', originalReference: 'AUTH123', merchantAccountCode: 'CheckAdyenMerchant',
    merchantReference: 'BILL-x', amount: { value: 690000, currency: 'PHP' }, eventCode, success,
  }, null);
  return { result, message: told[0]?.message ?? '', priority: told[0]?.priority ?? null, count: told.length };
}
try {
  const refunded = await tell('REFUND', 'true');
  check('a refund that happened is announced as one', /has been refunded to the payer/.test(refunded.message), true);
  check('and still advises voiding the payment', /void the payment/.test(refunded.message), true);

  const refused = await tell('REFUND', 'false');
  check('a refused refund is still reported, never silent', refused.count, 1);
  check('a refused refund is NOT announced as a refund', /has been refunded to the payer/.test(refused.message), false);
  check('a refused refund says it did not happen', /did NOT go through/.test(refused.message), true);
  check('and does not advise voiding a payment she still holds', /void the payment here/.test(refused.message), false);
  check('the payment it refers to is still named', /Test Tenant \(unit 2e\)/.test(refused.message), true);
  check('a refused refund is acknowledged, not retried', refused.result.outcome, 'ignored');

  const cancelRefused = await tell('CANCEL_OR_REFUND', false);
  check('a refused cancel-or-refund says it did not happen', /did NOT go through/.test(cancelRefused.message), true);

  const captureFailed = await tell('CAPTURE_FAILED', 'true');
  check('a failed capture is reported to the owner', captureFailed.count, 1);
  check('a failed capture warns against verifying', /do not verify/i.test(captureFailed.message), true);
  check('an expired authorisation is reported', (await tell('EXPIRE', 'true')).count, 1);
  check('a technical cancel is reported', (await tell('TECHNICAL_CANCEL', 'true')).count, 1);
  check('a routine capture still wakes nobody', (await tell('CAPTURE', 'true')).count, 0);
} finally {
  stubDb.from = realFrom;
  stubNotifier.notify = realNotify;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
