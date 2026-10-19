/**
 * Targeted test for the administrator's Change number / password (B-111, Sean 19 Oct 2026):
 * `POST /auth/change-sign-in` in routes/auth.ts and `changeOwnSignIn` in services/authService.ts.
 *
 * Run from backend/:  npm run build && node scripts/check-sign-in-change.mjs
 *
 * WHY A STAND-IN. The success path changes a live credential: her number or her password, on the
 * one database there is. So, as check-concurrency.mjs does, this drives the REAL handler from
 * dist/ against a stand-in `db` that records every read and write and answers from a fixture.
 * Nothing is read from or written to any real database. The failure paths are also probed live
 * by check:api, which writes nothing (they all refuse before the update).
 *
 * What it holds the route to:
 *   - a tenant is refused; nothing to change, a bad number, a weak password: 422 before any read
 *   - a wrong current password and a wrong current number get the SAME 401 and sentence, and
 *     neither writes
 *   - a number another account signs in with is refused with the shared sentence, and not written
 *   - the current number is matched by its digits (+63 and spacing alike)
 *   - number only: only `phone_number` is written, the sessions are not ended, one PROFILE_UPDATE
 *     audit row with the number before and after
 *   - password only: a bcrypt hash of the new password and `password_changed_at` are written, the
 *     number is not, one AUTH_PASSWORD_CHANGE audit row
 *   - both: both writes in ONE update, both audit rows
 *   - every success hands back a token this server verifies, for the same profile
 *
 * The numbers below are built, not typed: no real or realistic number is written in this file.
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-sign-in-change-placeholder-secret-0123456789',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { default: bcrypt } = await import('bcryptjs');
const { db } = await import('../dist/config/db.js');
const { default: authRouter } = await import('../dist/routes/auth.js');
const { verifyToken, SIGN_IN_CHECK_FAILED } = await import('../dist/services/authService.js');
const { PHONE_TAKEN } = await import('../dist/services/contactDetails.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

// ------------------------------------------------------------------ fixture ----
/** A synthetic mobile: 09 then nine of one digit, spaced 4-3-4. Never a real number. */
const synthetic = (d) => {
  const digits = '09' + String(d).repeat(9);
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
};
const ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
const OTHER_ID = '00000000-0000-4000-8000-0000000000b2';
const PASSWORD = `Stand-in ${Math.random().toString(36).slice(2)} 7`;
const NUMBER_ON_FILE = synthetic(1);
const HASH = await bcrypt.hash(PASSWORD, 4);
/** Random, so the breach lookup (if reachable) never finds it. */
const freshPassword = () => `Nw${crypto.randomUUID().replace(/-/g, '')}9`;

let writes = [];
let audits = [];
let reads = 0;
/** Who `resolve_login_identifier` says signs in with a number, by digits. */
let signInOwners = {};

db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') {
        return (resolve, reject) => Promise.resolve().then(() => answer(table, calls)).then(resolve, reject);
      }
      return (...args) => { calls.push([prop, args]); return chain; };
    },
  });
  return chain;
};
db.rpc = async (fn, args) => {
  if (fn !== 'resolve_login_identifier') return { data: null, error: null };
  const digits = String(args.p_identifier).replace(/\D/g, '');
  return { data: signInOwners[digits] ? [{ id: signInOwners[digits] }] : [], error: null };
};

function answer(table, calls) {
  const has = (name) => calls.some((c) => c[0] === name);
  if (table === 'profiles' && has('update')) {
    writes.push(calls.find((c) => c[0] === 'update')[1][0]);
    return { data: null, error: null };
  }
  if (table === 'profiles') {
    reads++;
    return {
      data: { id: ADMIN_ID, password_hash: HASH, email: 'stand-in@hivelet.invalid', phone_number: NUMBER_ON_FILE, role: 'admin' },
      error: null,
    };
  }
  if (table === 'audit_logs') {
    const insert = calls.find((c) => c[0] === 'insert');
    if (insert) audits.push(insert[1][0]);
    return { data: null, error: null };
  }
  return { data: null, error: null };
}

const route = authRouter.stack.find((l) => l.route?.path === '/auth/change-sign-in' && l.route.methods.post);
const handler = route.route.stack.at(-1).handle;
check('the route is mounted behind requireAuth, requirePasswordCurrent and the failure count',
  route.route.stack.map((s) => s.name).slice(0, 2), ['requireAuth', 'requirePasswordCurrent']);

function call(body, role = 'admin') {
  writes = []; audits = []; reads = 0;
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = {
      params: {}, query: {}, body, headers: {}, ip: '127.0.0.1', socket: {}, get: () => undefined,
      user: { profileId: ADMIN_ID, role, email: 'stand-in@hivelet.invalid', mustChangePassword: false },
    };
    handler(req, res, (err) =>
      resolve({ status: err?.statusCode ?? 500, code: err?.code, message: String(err?.message ?? err), details: err?.details })
    );
  });
}

// ------------------------------------------------------- refusals before any read ----
let r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPhone: synthetic(2) }, 'tenant');
check('a tenant is refused, and nothing is read', [r.status, reads], [403, 0]);

r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE });
check('nothing new to set is a 422 naming the new number', [r.status, Boolean(r.details?.newPhone?.[0]), reads], [422, true, 0]);

r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPhone: '12345' });
check('a new number that is not a PH mobile is refused', [r.status, r.details?.newPhone?.[0]],
  [422, 'Enter a Philippine mobile number, for example 0917 123 4567.']);

r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPassword: 'Short1' });
check('a new password under 10 characters is refused', [r.status, r.details?.newPassword?.[0]],
  [422, 'New password must be at least 10 characters.']);

r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPassword: 'onlyletterslong' });
check('a new password with no number is refused', [r.status, r.details?.newPassword?.[0]],
  [422, 'New password must contain a number.']);

r = await call({ currentPhone: NUMBER_ON_FILE, newPhone: synthetic(2) });
check('a missing current password is refused', [r.status, Boolean(r.details?.currentPassword)], [422, true]);

r = await call({ currentPassword: PASSWORD, newPhone: synthetic(2) });
check('a missing current number is refused', [r.status, Boolean(r.details?.currentPhone)], [422, true]);

// ----------------------------------------------------- wrong current credentials ----
const wrongPassword = await call({ currentPassword: PASSWORD + 'x', currentPhone: NUMBER_ON_FILE, newPhone: synthetic(2) });
check('a wrong current password: 401 INVALID_CREDENTIALS, nothing written',
  [wrongPassword.status, wrongPassword.code, wrongPassword.message, writes.length, audits.length],
  [401, 'INVALID_CREDENTIALS', SIGN_IN_CHECK_FAILED, 0, 0]);

const wrongNumber = await call({ currentPassword: PASSWORD, currentPhone: synthetic(3), newPhone: synthetic(2) });
check('a wrong current number: the same 401 and the same sentence, nothing written',
  [wrongNumber.status, wrongNumber.code, wrongNumber.message, writes.length, audits.length],
  [401, 'INVALID_CREDENTIALS', SIGN_IN_CHECK_FAILED, 0, 0]);
check('the sentence does not say which one was wrong',
  /number or password/.test(SIGN_IN_CHECK_FAILED) && wrongPassword.message === wrongNumber.message, true);

// ---------------------------------------------------------------- the number ----
signInOwners = { [synthetic(4).replace(/\D/g, '')]: OTHER_ID };
r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPhone: synthetic(4) });
check('a number another account signs in with is refused, and not written',
  [r.status, r.details?.phone_number?.[0], writes.length], [409, PHONE_TAKEN, 0]);
signInOwners = {};

r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPhone: NUMBER_ON_FILE.replace(/ /g, '') });
check('the same number as now, and no password, is nothing to change', [r.status, writes.length], [422, 0]);

const intl = '+63 ' + NUMBER_ON_FILE.slice(1);
r = await call({ currentPassword: PASSWORD, currentPhone: intl, newPhone: synthetic(5) });
check('the current number is matched by digits (+63 form accepted)', r.status, 200);

r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPhone: synthetic(5) });
check('number only: 200, and only phone_number is written', [r.status, writes], [200, [{ phone_number: synthetic(5) }]]);
check('number only: one PROFILE_UPDATE audit row, number before and after',
  audits.map((a) => [a.action, a.previous_values?.phone_number, a.new_values?.phone_number]),
  [['PROFILE_UPDATE', NUMBER_ON_FILE, synthetic(5)]]);
check('number only: the answer says so, with a token for the same profile',
  [r.payload?.data?.phoneChanged, r.payload?.data?.passwordChanged, verifyToken(r.payload?.data?.token).sub],
  [true, false, ADMIN_ID]);

// -------------------------------------------------------------- the password ----
let next = freshPassword();
r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPassword: next });
const w = writes[0] ?? {};
check('password only: 200, one write, no phone_number in it', [r.status, writes.length, 'phone_number' in w], [200, 1, false]);
check('password only: the hash is of the new password, and password_changed_at is set',
  [await bcrypt.compare(next, w.password_hash ?? ''), typeof w.password_changed_at, w.must_change_password, w.failed_login_count],
  [true, 'string', false, 0]);
check('password only: one AUTH_PASSWORD_CHANGE audit row', audits.map((a) => a.action), ['AUTH_PASSWORD_CHANGE']);
check('password only: a fresh token for the same profile', verifyToken(r.payload?.data?.token).sub, ADMIN_ID);

// ------------------------------------------------------------------- both ----
next = freshPassword();
r = await call({ currentPassword: PASSWORD, currentPhone: NUMBER_ON_FILE, newPhone: synthetic(6), newPassword: next });
check('both: one update carrying the number and the hash',
  [r.status, writes.length, writes[0]?.phone_number, await bcrypt.compare(next, writes[0]?.password_hash ?? '')],
  [200, 1, synthetic(6), true]);
check('both: two audit rows', audits.map((a) => a.action).sort(), ['AUTH_PASSWORD_CHANGE', 'PROFILE_UPDATE']);
check('both: the message names both', r.payload?.data?.message, 'Number and password updated.');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
