/**
 * Verifies the Adyen webhook HMAC implementation.
 *
 * Run with `npm run check:adyen` from `backend/`. Builds first, touches nothing,
 * and needs no credentials.
 *
 * NOTE ON WHAT THIS PROVES. These assertions verify the algorithm against its
 * specification: the eight-field payload order, the escaping rules, hex key
 * decoding, HMAC-SHA256, base64 output, and constant-time comparison. They do NOT
 * prove interoperability with Adyen's servers, because that can only be proven by
 * a real signed notification. Send a test webhook from
 * Customer Area -> Developers -> Webhooks -> Test, and confirm this accepts it.
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  buildSignedPayload,
  computeSignature,
  verifyNotificationItem,
  isWebhookConfigured
} from '../dist/services/adyenWebhook.js';

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

// A colon inside a value must be escaped, or an attacker could shift the field
// boundaries and make one field masquerade as two.
check('colon inside a value is escaped',
  buildSignedPayload({ ...base, merchantReference: 'a:b' }),
  '7914073381342284::TestMerchant:a\\:b:1130:EUR:AUTHORISATION:true');

// Backslash must be escaped FIRST, otherwise the escape character introduced for
// a colon could itself be forged by a value containing a backslash.
check('backslash is escaped, and escaped before the colon',
  buildSignedPayload({ ...base, merchantReference: 'x\\y' }),
  '7914073381342284::TestMerchant:x\\\\y:1130:EUR:AUTHORISATION:true');

check('backslash followed by colon',
  buildSignedPayload({ ...base, merchantReference: 'x\\:y' }),
  '7914073381342284::TestMerchant:x\\\\\\:y:1130:EUR:AUTHORISATION:true');

check('boolean success is stringified',
  buildSignedPayload({ ...base, success: true }),
  '7914073381342284::TestMerchant:TestPayment-1407325143704:1130:EUR:AUTHORISATION:true');

// --- signature matches an independent implementation -----------------------
const independent = createHmac('sha256', Buffer.from(KEY, 'hex'))
  .update(buildSignedPayload(base), 'utf8').digest('base64');
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
