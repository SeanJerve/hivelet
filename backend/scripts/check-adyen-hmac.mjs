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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
