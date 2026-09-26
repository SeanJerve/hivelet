/**
 * Targeted test for docs/FINAL_REVIEW.md F12: a resident coming back from GCash
 * was told "Could not confirm your payment here" after a payment that went
 * through (first successful GCash test payment, 2026-09-26, NDQW3Z5ZQL8MNB75).
 *
 * Run from backend/:  npm run build && node scripts/check-adyen-return.mjs
 *
 * Drives the real `adyenService.confirmRedirect`. `fetch` answers as Adyen does
 * and the database client is a stub, so nothing is read or written anywhere.
 * No checkout session is opened first: on Vercel the return request can land on
 * an instance that never saw the checkout, and it has to work there too.
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-adyen-return-placeholder-secret-0123456789',
  SUPABASE_URL: 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'placeholder',
  SUPABASE_ANON_KEY: 'placeholder',
  ADYEN_API_KEY: 'test_api_key',
  ADYEN_MERCHANT_ACCOUNT: 'HiveletECOM',
  ADYEN_CLIENT_KEY: 'test_client_key',
  ADYEN_HMAC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ADYEN_ENVIRONMENT: 'TEST',
});

const { db } = await import('../dist/config/db.js');
const { adyenService } = await import('../dist/services/adyenService.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const BILL = '487f7ba5-aaba-409d-8780-59a7757cb739';
const OWNER = 'tenant-owner';
const PSP = 'NDQW3Z5ZQL8MNB75';

// --- Adyen -----------------------------------------------------------------
let adyenReply;               // what /payments/details answers
let lastRequest = null;
globalThis.fetch = async (url, init = {}) => {
  lastRequest = { url: String(url), method: init.method ?? 'GET', headers: init.headers, body: init.body };
  if (String(url).endsWith('/payments/details') && init.method === 'POST') {
    const { status, body } = adyenReply;
    return { ok: status < 300, status, json: async () => body };
  }
  // The session-result endpoint does not accept a redirectResult.
  return { ok: false, status: 422, json: async () => ({ message: 'Invalid sessionResult' }) };
};

// --- database ----------------------------------------------------------------
let paymentRows = [];
const audits = [];
db.from = (table) => {
  const filters = [];
  let inserted = null;
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') {
        return (resolve) => {
          if (table === 'bills') {
            const id = filters.find((f) => f[0] === 'eq' && f[1] === 'id')?.[2];
            return resolve({ data: id === BILL ? { id: BILL, tenant_profile_id: OWNER } : null, error: null });
          }
          if (table === 'payments') {
            const rows = paymentRows.filter((r) => filters.every(([op, col, v]) =>
              op === 'eq' ? r[col] === v : op === 'neq' ? r[col] !== v : true));
            return resolve({ data: rows, error: null });
          }
          if (table === 'audit_logs') audits.push(inserted);
          return resolve({ data: null, error: null });
        };
      }
      return (...args) => {
        if (prop === 'eq' || prop === 'neq') filters.push([prop, args[0], args[1]]);
        if (prop === 'insert') inserted = args[0];
        return chain;
      };
    },
  });
  return chain;
};

const authorised = { status: 200, body: { resultCode: 'Authorised', pspReference: PSP, merchantReference: `BILL-${BILL}-1790417782246` } };

// 1. The shape of 2026-09-26: authorised, webhook row already in.
adyenReply = authorised;
paymentRows = [{ transaction_reference: PSP, verification_status: 'Pending Verification' }];
let r = await adyenService.confirmRedirect('redirect-blob', OWNER).catch((e) => ({ threw: e.message }));
check('an authorised GCash payment is confirmed on return', r, { status: 'completed', confirmed: true, recorded: true });
check('it asks Adyen with POST /payments/details', [lastRequest.method, lastRequest.url.endsWith('/v71/payments/details')], ['POST', true]);
check('carrying the redirectResult as details', JSON.parse(lastRequest.body), { details: { redirectResult: 'redirect-blob' } });
check('with the API key', lastRequest.headers['x-api-key'], 'test_api_key');
const audit = [].concat(audits.at(-1) ?? [])[0];
check('the audit row is marked as the return, not as a second payment',
  audit?.new_values?.status ?? audit?.newValues?.status, 'Confirmed On Return');

// 2. The webhook has not landed yet.
paymentRows = [];
r = await adyenService.confirmRedirect('redirect-blob', OWNER);
check('confirmed but not yet recorded reads as "being recorded"', r, { status: 'completed', confirmed: true, recorded: false });

// 3. A rejected row with the same reference is not this payment's record.
paymentRows = [{ transaction_reference: PSP, verification_status: 'Rejected' }];
r = await adyenService.confirmRedirect('redirect-blob', OWNER);
check('a rejected row does not count as recorded', r.recorded, false);

// 4. Somebody else's redirectResult.
paymentRows = [];
r = await adyenService.confirmRedirect('redirect-blob', 'another-tenant').catch((e) => ({ statusCode: e.statusCode }));
check("another tenant's payment is not disclosed", r, { statusCode: 404 });

// 5. A reference that is not one of our bills.
adyenReply = { status: 200, body: { resultCode: 'Authorised', pspReference: PSP, merchantReference: 'SOMETHING-ELSE' } };
r = await adyenService.confirmRedirect('redirect-blob', OWNER).catch((e) => ({ statusCode: e.statusCode }));
check('a payment for no known bill is not disclosed', r, { statusCode: 404 });

// 6. Outcomes other than success use the words the page already has.
for (const [resultCode, status] of [['Refused', 'refused'], ['Cancelled', 'canceled'], ['Pending', 'paymentPending'], ['Received', 'paymentPending'], ['Error', 'error']]) {
  adyenReply = { status: 200, body: { resultCode, pspReference: PSP, merchantReference: `BILL-${BILL}-1` } };
  r = await adyenService.confirmRedirect('redirect-blob', OWNER);
  check(`${resultCode} is reported as "${status}", not confirmed`, [r.status, r.confirmed], [status, false]);
}

// 7. Adyen refuses the token itself.
adyenReply = { status: 422, body: { message: 'Invalid redirectResult' } };
r = await adyenService.confirmRedirect('forged', OWNER).catch((e) => ({ statusCode: e.statusCode }));
check('a token Adyen rejects is refused (422), not a confirmation', r, { statusCode: 422 });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
