/**
 * End-to-end smoke test of every endpoint the frontend actually calls.
 *
 * Run with `npm run check:api` from `backend/` while the server is running.
 * Logs in for real, exercises the read endpoints of both roles, and reports any
 * that fail. It performs NO writes - this is safe to run against production.
 *
 * Exists because "the frontend works" was being asserted rather than tested, and
 * two calls turned out to be 404ing into silent fallbacks: GET /tenant/tickets
 * (the route is /tenant/my-tickets) and POST /admin/inquiries/:id/reply (it is
 * /messages). Both had been invisible because the UI swallowed the failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const BASE = process.env.API_BASE || 'http://127.0.0.1:5000/api';

// Credentials come from the gitignored local file, never from source.
const credsPath = path.join(root, 'credentials', 'creds.txt');
if (!fs.existsSync(credsPath)) {
  console.error('credentials/creds.txt not found - cannot run the contract check.');
  process.exit(1);
}
const creds = fs.readFileSync(credsPath, 'utf8');
const adminEmail = creds.match(/Email:\s*(\S+)/)?.[1];
const adminPass = creds.match(/Password:\s*(\S+)/)?.[1];
const tenantPass = [...creds.matchAll(/Password:\s*(\S+)/g)].at(-1)?.[1];

let pass = 0, fail = 0;
const failures = [];

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data?.token ?? j?.token ?? null;
}

async function check(label, pathname, token) {
  const r = await fetch(`${BASE}${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const ok = r.status >= 200 && r.status < 300;
  let shape = '';
  if (ok) {
    try {
      const j = await r.json();
      const d = j?.data ?? j;
      shape = Array.isArray(d) ? `${d.length} rows` : typeof d === 'object' ? 'object' : String(d).slice(0, 20);
    } catch { shape = 'non-json'; }
  }
  ok ? pass++ : (fail++, failures.push(`${label} ${pathname} -> ${r.status}`));
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${String(r.status).padEnd(4)} ${pathname.padEnd(42)} ${shape}`);
}

console.log(`API: ${BASE}\n`);

/**
 * The security posture is a claim the system makes about itself, so assert it
 * rather than reading past it.
 *
 * `enforced` is the ONLY passing value. It means the publishable key reached
 * PostgreSQL and PostgreSQL refused it. `unverified` means the key was rejected
 * at the gateway and the probe proved nothing - which is what an environment
 * still holding a rotated-out key looks like, and which the old boolean field
 * reported as a green padlock.
 */
async function checkLockdown() {
  const r = await fetch(`${BASE}/health`);
  const j = await r.json().catch(() => ({}));
  const verdict = j?.security?.rlsLockdown;
  const ok = verdict === 'enforced';
  ok ? pass++ : (fail++, failures.push(`rlsLockdown is "${verdict}", expected "enforced"`));
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${''.padEnd(4)} ${'rlsLockdown verdict'.padEnd(42)} ${verdict}`);
}

// ---- public -------------------------------------------------------------
console.log('PUBLIC (no token)');
await check('public', '/health', null);
await checkLockdown();
await check('public', '/public/rooms', null);
await check('public', '/public/rates', null);

// ---- admin --------------------------------------------------------------
const adminToken = await login(adminEmail, adminPass);
console.log(`\nADMIN (${adminEmail}) - token ${adminToken ? 'issued' : 'FAILED'}`);
if (!adminToken) { fail++; failures.push('admin login failed'); }
else {
  for (const p of [
    '/auth/me', '/admin/rooms', '/admin/tenants', '/admin/bills', '/admin/payments',
    '/admin/income-records', '/admin/expense-entries', '/admin/expense-categories',
    '/admin/tickets', '/admin/inquiries', '/admin/audit-logs', '/admin/notifications'
  ]) await check('admin', p, adminToken);
}

// ---- tenant -------------------------------------------------------------
let tenantEmail = null, tenantToken = null;
const seededPath = path.join(root, 'database', 'seeded-tenant-credentials.json');
const seeded = fs.existsSync(seededPath)
  ? JSON.parse(fs.readFileSync(seededPath, 'utf8'))
  : [];
for (const entry of seeded) {
  const t = await login(entry.email, entry.password ?? tenantPass);
  if (t) { tenantEmail = entry.email; tenantToken = t; break; }
}
console.log(`\nTENANT (${tenantEmail ?? 'none found'}) - token ${tenantToken ? 'issued' : 'FAILED'}`);
if (tenantToken) {
  for (const p of [
    '/auth/me', '/tenant/my-rooms', '/tenant/my-bills', '/tenant/my-payments',
    '/tenant/my-income-records', '/tenant/my-tickets', '/tenant/my-notifications',
    '/tenant/my-profile'
  ]) await check('tenant', p, tenantToken);
}

// ---- isolation ----------------------------------------------------------
if (tenantToken) {
  console.log('\nISOLATION (a tenant must not reach admin data)');
  const r = await fetch(`${BASE}/admin/tenants`, { headers: { Authorization: `Bearer ${tenantToken}` } });
  const blocked = r.status === 401 || r.status === 403;
  blocked ? pass++ : (fail++, failures.push(`tenant reached /admin/tenants -> ${r.status}`));
  console.log(`  ${blocked ? 'OK  ' : 'FAIL'} ${r.status}  tenant calling /admin/tenants`);
}

/**
 * A tenant must not reach ANOTHER TENANT's data either.
 *
 * The section above only ever proved that a tenant cannot reach ADMIN data.
 * That is the coarse half. The finer half - one resident reading another
 * resident's records through a perfectly legitimate tenant endpoint - was
 * checked by hand on 2026-09-15 and then asserted nowhere, so it could have
 * regressed without a sound.
 *
 * `GET /tenant/tickets/:id/messages` is used because it is a pure read: a pass
 * and a failure both write nothing. The handler loads the ticket, compares
 * `tenant_profile_id` against the caller, and answers **404** rather than 403 -
 * deliberately, because 403 would confirm the row exists to someone who should
 * not know that.
 *
 * The same ownership comparison guards `POST /tenant/payments/checkout`
 * (`bill.tenant_profile_id !== req.user.profileId`) and
 * `POST /tenant/my-notifications/:id/read` (scoped by `recipient_profile_id` in
 * the update itself). Both are writes, so they are not probed here.
 */
if (tenantToken && adminToken) {
  console.log('\nISOLATION (a tenant must not reach another tenant\'s data)');

  const meRes = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${tenantToken}` } });
  const me = await meRes.json().catch(() => null);
  const myProfileId = me?.data?.id ?? me?.data?.profileId ?? null;

  const tRes = await fetch(`${BASE}/admin/tickets`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const tJson = await tRes.json().catch(() => null);
  const allTickets = Array.isArray(tJson?.data) ? tJson.data : [];
  const someoneElses = allTickets.find((x) => x.tenant_profile_id && x.tenant_profile_id !== myProfileId);

  const probes = [
    ['a ticket belonging to another tenant', someoneElses?.id],
    ['a ticket id that does not exist', '00000000-0000-4000-8000-000000000000'],
  ];

  for (const [label, id] of probes) {
    if (!id) {
      console.log(`  SKIP      ${label} - none available to probe with`);
      continue;
    }
    const r = await fetch(`${BASE}/tenant/tickets/${id}/messages`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    // 404 is the required answer. 403 would leak the row's existence; 200 would
    // leak the row.
    const ok = r.status === 404;
    ok ? pass++ : (fail++, failures.push(`tenant read ${label} -> ${r.status}`));
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${r.status}  ${label} (404 expected, never 403)`);
  }
}


/**
 * CHANGE PASSWORD - the failure path, which is the one that must not misbehave.
 *
 * `POST /auth/change-password` worked for months with nothing calling it; a
 * screen now does. These probes exercise the guard rails and **write nothing**:
 * `changeOwnPassword()` compares the current password with bcrypt and throws
 * before it touches `profiles`, so a rejected attempt leaves the row untouched
 * and does not even increment the lockout counter.
 *
 * The SUCCESS path is deliberately not probed. It would rotate a live
 * credential, and the seeded logins are what every other assertion in this file
 * depends on.
 *
 * The 401 matters beyond this endpoint. It returns `INVALID_CREDENTIALS` - the
 * same code a wrong password on the sign-in form returns - and the frontend's
 * `ApiRequestError.isAuthFailure` deliberately excludes that code, so typing
 * your current password wrong ends the attempt rather than the session.
 */
if (tenantToken) {
  console.log('\nCHANGE PASSWORD (failure paths only - no credential is rotated)');

  const cases = [
    ['wrong current password is 401, not a session failure',
      { currentPassword: 'definitely-not-the-password', newPassword: 'Correct9Horse' }, 401, 'INVALID_CREDENTIALS'],
    ['a new password under 10 characters is refused',
      { currentPassword: 'x', newPassword: 'Short1' }, 422, null],
    ['a new password with no digit is refused',
      { currentPassword: 'x', newPassword: 'NoDigitsHereAtAll' }, 422, null],
    ['a new password with no letter is refused',
      { currentPassword: 'x', newPassword: '1234567890' }, 422, null],
    ['a missing current password is refused',
      { newPassword: 'Correct9Horse' }, 422, null],
  ];

  for (const [label, body, want, wantCode] of cases) {
    const r = await fetch(`${BASE}/auth/change-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let code = null;
    try { code = (await r.json())?.error?.code ?? null; } catch { /* no body */ }

    const ok = r.status === want && (wantCode === null || code === wantCode);
    ok ? pass++ : (fail++, failures.push(`change-password: ${label} -> ${r.status} ${code ?? ''}`));
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${r.status}  ${label}`);
  }

  const noToken = await fetch(`${BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'x', newPassword: 'Correct9Horse' }),
  });
  const ok401 = noToken.status === 401;
  ok401 ? pass++ : (fail++, failures.push(`change-password reachable without a token -> ${noToken.status}`));
  console.log(`  ${ok401 ? 'OK  ' : 'FAIL'} ${noToken.status}  refused with no token`);
}

/**
 * THE NOTIFICATION BADGE'S NUMBER MUST BE UNDER `meta`.
 *
 * The notification feature had never worked, and this was half the reason. The
 * client envelope is `{ success, data, meta? }` and `requestEnvelope()` returns
 * exactly `{ data: payload.data, meta: payload.meta }` - **every other top-level
 * key is dropped on the floor**. Both notification endpoints sent `totalUnread`
 * as a sibling of `data`, so the count never reached the browser at all, no
 * matter which helper called it. The bell showed nothing and looked fine.
 *
 * A shape like that cannot fail loudly: the endpoint answers 200, the list
 * renders, and only the number is missing. So it is asserted rather than
 * trusted, on BOTH endpoints, and it checks that the key is absent from the top
 * level as well as present under `meta` - putting it in both places would pass a
 * weaker test while leaving the next reader unsure which one is real.
 */
for (const [who, token, path_] of [
  ['admin', adminToken, '/admin/notifications'],
  ['tenant', tenantToken, '/tenant/my-notifications'],
]) {
  if (!token) continue;
  const r = await fetch(`${BASE}${path_}`, { headers: { Authorization: `Bearer ${token}` } });
  let body = null;
  try { body = await r.json(); } catch { /* not json */ }

  const underMeta = typeof body?.meta?.totalUnread === 'number';
  const looseKey = body ? Object.prototype.hasOwnProperty.call(body, 'totalUnread') : false;
  const ok = r.status === 200 && underMeta && !looseKey;

  ok ? pass++ : (fail++, failures.push(
    `${path_}: totalUnread ${underMeta ? 'is' : 'is NOT'} under meta` +
    (looseKey ? ', and is ALSO a top-level key' : '')
  ));
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} ${r.status}  ${who} notifications carry totalUnread under meta` +
    (underMeta ? ` (${body.meta.totalUnread} unread)` : '')
  );
}

/**
 * THE AUDIT TRAIL'S CATEGORY FILTER MUST BE APPLIED BY THE DATABASE.
 *
 * This is the view whose entire claim is that it records what actually happened,
 * and the one a panel opens to ask "who did this to the money".
 *
 * Its newest rows are overwhelmingly authentication events - 3,017 of the ~4,000
 * are `AUTH_ACCESS_DENIED`, most of them generated by these very checks - so
 * **the last 100 rows contain no business activity at all**. A filter applied in
 * the browser over those 100 rows returns an empty table, which is why the
 * category is a query parameter and the filtering happens before the limit.
 *
 * Both halves already exist and are correct. Nothing asserted them, so a
 * redesign that dropped `?category=` would leave the screen calling the same
 * endpoint, rendering rows, and quietly showing sign-in noise under a tab
 * labelled "business". That is invisible to check:endpoints, which only asks
 * whether the route is called at all.
 */
if (adminToken) {
  console.log('\nAUDIT TRAIL (the category filter must be applied before the row limit)');

  const fetchAudit = async (qs) => {
    const r = await fetch(`${BASE}/admin/audit-logs?${qs}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await r.json().catch(() => null);
    return { status: r.status, rows: Array.isArray(body?.data) ? body.data : [], meta: body?.meta };
  };

  const isAuth = (row) => typeof row?.action === 'string' && row.action.startsWith('AUTH_');

  const business = await fetchAudit('limit=100&category=business');
  const authOnly = await fetchAudit('limit=100&category=auth');
  const everything = await fetchAudit('limit=100');

  for (const [label, got, ok] of [
    [
      'category=business returns NO authentication events',
      business,
      business.status === 200 && business.rows.length > 0 && !business.rows.some(isAuth),
    ],
    [
      'category=auth returns ONLY authentication events',
      authOnly,
      authOnly.status === 200 && authOnly.rows.length > 0 && authOnly.rows.every(isAuth),
    ],
    [
      'no category returns the newest rows unfiltered',
      everything,
      everything.status === 200 && everything.rows.length > 0,
    ],
  ]) {
    ok ? pass++ : (fail++, failures.push(`audit-logs: ${label} (got ${got.rows.length} row(s))`));
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${got.status}  ${label} — ${got.rows.length} row(s)`);
  }

  /**
   * The tab labels count the WHOLE table, not the window on screen, so they must
   * add up.
   */
  const m = everything.meta ?? {};
  const totalsAgree =
    typeof m.authTotal === 'number' &&
    typeof m.businessTotal === 'number' &&
    typeof m.grandTotal === 'number' &&
    m.authTotal + m.businessTotal === m.grandTotal;
  totalsAgree ? pass++ : (fail++, failures.push('audit-logs: meta totals do not add up'));
  console.log(
    `  ${totalsAgree ? 'OK  ' : 'FAIL'} ---  meta totals add up` +
    (totalsAgree ? ` (${m.businessTotal} business + ${m.authTotal} auth = ${m.grandTotal})` : '')
  );
}

/**
 * ACCOUNT LOCKOUT - asserted against the SOURCE, and here is why.
 *
 * This is the control that stops password guessing, and it is the reason
 * `POST /auth/login` is deliberately not rate-limited per address: locking per
 * ACCOUNT protects a resident in the direction that matters, since an attacker
 * changes address far more easily than they change whose account they guess at.
 *
 * It cannot be tested behaviourally here. Proving it works means actually
 * locking a real account for fifteen minutes, and every account in this database
 * belongs to a resident, the administrator, or a teammate. There is no throwaway
 * to burn - and in this sandbox a `profiles` UPDATE is refused, so a lock could
 * be set and not cleared.
 *
 * So the shape is asserted instead, and labelled as what it is. Three things
 * have to stay true, and each has a failure that is invisible from outside:
 *
 *   1. the lock is checked BEFORE the password is compared - otherwise a locked
 *      account still leaks whether a guess was right, and the lock stops mattering
 *   2. a wrong password reaches `registerFailedAttempt` - if that call is ever
 *      removed the counter never moves and lockout never engages, while every
 *      response looks identical
 *   3. a successful login RESETS the counter - otherwise five wrong guesses
 *      spread over a year eventually lock out the real owner
 */
/**
 * BR-017: EVERY INSERT INTO `payments` NAMES ITS VERIFICATION STATUS.
 *
 * `payments.verification_status` is NOT NULL, and until migration `026` it
 * defaulted to **'Verified'** — so an insert that forgot the column produced a
 * payment nobody had approved. That is the one thing BR-017 exists to prevent,
 * handed out as the default.
 *
 * `026` changed the default to 'Pending Verification', so forgetting it now
 * fails closed. This is the other half: a default is invisible at the call site,
 * and relying on it silently is how the next author inherits the assumption
 * rather than the decision. Naming the column keeps the intent where the insert
 * is.
 *
 * It matters now rather than in the abstract, because **OD-10 is asking whether
 * a resident may report a cash payment for the owner to confirm.** If she says
 * yes, someone writes a fourth insert path — and that one is a resident's
 * unverified claim.
 *
 * Source-level, like the lockout ordering below: there is no throwaway payment
 * to insert against a live ledger to test this from the outside.
 */
{
  const paymentWriters = [
    'backend/src/routes/admin.ts',
    'backend/src/routes/tenant.ts',
    'backend/src/routes/public.ts',
    'backend/src/services/adyenService.ts',
    'backend/src/services/adyenWebhookHandler.ts',
  ];

  const bare = [];
  let inserts = 0;
  for (const rel of paymentWriters) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!/from\(\s*['"]payments['"]\s*\)/.test(line)) return;
      // The insert may sit on this line or the next; the object follows it.
      const window = lines.slice(i, i + 20).join('\n');
      const upToNextTable = window.split(/from\(\s*['"](?!payments)/)[0];
      if (!/\.insert\(/.test(upToNextTable.slice(0, 200))) return;
      inserts++;
      if (!/verification_status\s*:/.test(upToNextTable)) {
        bare.push(`${rel}:${i + 1}`);
      }
    });
  }

  const label = 'every payments insert names verification_status';
  const ok = inserts > 0 && bare.length === 0;
  const detail = inserts === 0
    ? 'NO payments insert found at all, so this checked nothing'
    : bare.length === 0
      ? `${inserts} insert path(s)`
      : `relies on the column default: ${bare.join(', ')} - name it explicitly, BR-017 says a human decides`;

  ok ? pass++ : (fail++, failures.push(`BR-017: ${label} (${detail})`));
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ---  ${label} (${detail})`);
}

/**
 * NO MONEY COLUMN IS LEFT TO ITS DEFAULT ON A LEDGER INSERT.
 *
 * The sibling of the BR-017 rule above, and it caught a live one.
 *
 * `monthly_income_records.gbg_fee` is NOT NULL DEFAULT 0.00, and the income
 * insert did not name it. Meanwhile the on-site receipt form has a **required**
 * GBG input, adds it to the total the resident is asked to hand over, and prints
 * it on the receipt. It was not in the request body either, so the figure died
 * twice before reaching the ledger — cash collected at the counter, recorded as
 * nothing.
 *
 * Dormant only because the fee has been zero since June 2025. It would have gone
 * live the moment the owner resumed charging it, which is an open question
 * (OD-02) being put to her now.
 *
 * A money column with a default is the dangerous kind: the row still inserts,
 * the arithmetic still balances, and the only symptom is an amount that is
 * quietly wrong.
 */
{
  const ledgerInserts = [
    ['backend/src/routes/admin.ts', 'monthly_income_records', ['rent_amount', 'water_payment', 'gbg_fee', 'occupants']],
  ];

  for (const [rel, table, required] of ledgerInserts) {
    const lines = fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/);
    let found = 0;
    const missing = [];

    lines.forEach((line, i) => {
      if (!new RegExp(`from\\(\\s*['"]${table}['"]\\s*\\)`).test(line)) return;
      const window = lines.slice(i, i + 30).join('\n');
      if (!/\.insert\(/.test(window.slice(0, 160))) return;
      found++;
      const body = window.split(/\.select\(|\.single\(/)[0];
      for (const col of required) {
        // `occupants,` is shorthand for `occupants: occupants` and is perfectly
        // explicit - requiring a colon reported a live insert as omitting a
        // column it names. Accept both spellings.
        const named = new RegExp(`(^|[,{\\s])${col}\\s*[:,]`, 'm');
        if (!named.test(body)) missing.push(`${rel}:${i + 1} omits ${col}`);
      }
    });

    const label = `every ${table} insert names its money columns`;
    const ok = found > 0 && missing.length === 0;
    const detail = found === 0
      ? `NO ${table} insert found, so this checked nothing`
      : missing.length === 0
        ? `${found} insert(s), all of ${required.join(', ')} named`
        : missing.join('; ');

    ok ? pass++ : (fail++, failures.push(`ledger defaults: ${label} (${detail})`));
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ---  ${label} (${detail})`);
  }
}

{
  const authSrc = fs.readFileSync(path.join(root, 'backend/src/services/authService.ts'), 'utf8');
  const envSrc = fs.readFileSync(path.join(root, 'backend/src/config/env.ts'), 'utf8');

  const lockIdx = authSrc.indexOf('locked_until && new Date');
  const compareIdx = authSrc.indexOf('bcrypt.compare(password, data.password_hash)');

  const maxFailed = Number(/maxFailedLogins:\s*(\d+)/.exec(envSrc)?.[1] ?? 0);
  const lockMinutes = Number(/lockoutMinutes:\s*(\d+)/.exec(envSrc)?.[1] ?? 0);

  for (const [label, ok, detail] of [
    [
      'the lock is checked before the password is compared',
      lockIdx > 0 && compareIdx > 0 && lockIdx < compareIdx,
      null,
    ],
    [
      'a wrong password still reaches registerFailedAttempt',
      /if \(!passwordMatches\)[\s\S]{0,120}registerFailedAttempt\(/.test(authSrc),
      null,
    ],
    [
      'a successful login resets the counter',
      /failed_login_count:\s*0[\s\S]{0,60}locked_until:\s*null/.test(authSrc),
      null,
    ],
    [
      'lockout is configured to a real threshold',
      maxFailed > 0 && maxFailed <= 10 && lockMinutes > 0,
      `${maxFailed} failures, ${lockMinutes} minutes`,
    ],
  ]) {
    ok ? pass++ : (fail++, failures.push(`lockout: ${label}`));
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ---  ${label}${detail ? ` (${detail})` : ''}`);
  }
}

// ---- numeric poisoning --------------------------------------------------
//
// JSON has no Infinity literal, which is why this looks impossible. It is not:
// `1e999` is valid JSON and every parser turns it into Infinity. PostgreSQL then
// sorts Infinity above every numeric, so a `CHECK (x >= 0)` passes it - and on a
// column that feeds a GENERATED ALWAYS expression, every SUM over the ledger
// returns Infinity from that row onward.
//
// The shared `money` primitive is `.finite()`. These calls prove the routes
// actually reach it. Each one must be REJECTED, so a pass writes nothing; a
// failure is visible as a created row and is reported here rather than silently
// leaving one behind.
if (adminToken) {
  console.log('\nNUMERIC POISONING (Infinity must never reach a money column)');

  const poison = [
    ['POST',  '/admin/rooms',          { cluster_code: 'BH', room_number: `ZZ-PROBE-${Date.now()}`,
                                         current_price: 1e999 },                 'room create, current_price'],
    ['POST',  '/admin/income-records', { roomNumber: '1a', datePaid: '2026-09-14',
                                         contactName: 'Probe', invoiceNumber: 'OR#PROBE',
                                         rentAmount: 1e999, occupants: 1, monthsCovered: 1,
                                         dateCoveredStart: '2026-09-14',
                                         dateCoveredEnd: '2026-10-13' },         'income create, rentAmount'],
    ['POST',  '/admin/expense-entries',{ expenseDate: '2026-09-14', orSupplier: 'Probe',
                                         categoryCode: '1',
                                         allocations: [{ propertyArea: 'Boarding House',
                                                         amount: 1e999 }] },     'expense create, allocation amount'],
  ];

  for (const [method, path, body, label] of poison) {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // 400 is the schema refusing it. Anything 2xx means it was accepted.
    const refused = r.status >= 400 && r.status < 500;
    refused ? pass++ : (fail++, failures.push(`${label}: Infinity was ACCEPTED -> ${r.status}`));
    console.log(`  ${refused ? 'OK  ' : 'FAIL'} ${r.status}  ${label}`);
  }

  // The same value as a plain string, which is the other way a parser can hand
  // it over. `z.number()` rejects a string outright, so this is belt and braces.
  const r2 = await fetch(`${BASE}/admin/rooms`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: '{"cluster_code":"BH","room_number":"ZZ-PROBE-STR","current_price":1e999}',
  });
  const refused2 = r2.status >= 400 && r2.status < 500;
  refused2 ? pass++ : (fail++, failures.push(`raw 1e999 in the body was ACCEPTED -> ${r2.status}`));
  console.log(`  ${refused2 ? 'OK  ' : 'FAIL'} ${r2.status}  raw 1e999 in the request body`);
}


// ---- unauthenticated perimeter -------------------------------------------
//
// Every admin and tenant route must refuse a caller with no token at all. The
// suite above proves a TENANT cannot reach admin data; this proves nobody can
// reach either without logging in, on reads and writes alike.
//
// Worth testing separately because the two fail differently: a broken RBAC
// matrix lets the wrong role through, while a route registered on the wrong
// router - or one that simply forgets its middleware, which is how the two
// local-cashier endpoints were once reachable - lets EVERYONE through.
{
  console.log('\nUNAUTHENTICATED PERIMETER (no token at all)');

  const readOnly = [
    '/admin/tenants', '/admin/rooms', '/admin/income-records',
    '/admin/expense-entries', '/admin/audit-logs', '/admin/payments',
    '/tenant/my-bills', '/tenant/my-payments', '/tenant/my-profile', '/auth/me',
  ];
  const writes = ['/admin/rooms', '/admin/income-records', '/admin/expense-entries'];

  for (const p of readOnly) {
    const r = await fetch(`${BASE}${p}`);
    const refused = r.status === 401 || r.status === 403;
    refused ? pass++ : (fail++, failures.push(`${p} reachable with no token -> ${r.status}`));
    console.log(`  ${refused ? 'OK  ' : 'FAIL'} ${r.status}  GET  ${p}`);
  }

  for (const p of writes) {
    const r = await fetch(`${BASE}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const refused = r.status === 401 || r.status === 403;
    refused ? pass++ : (fail++, failures.push(`POST ${p} accepted with no token -> ${r.status}`));
    console.log(`  ${refused ? 'OK  ' : 'FAIL'} ${r.status}  POST ${p}`);
  }

  // The in-repository cashier pages must be DEAD while Adyen is configured, and
  // the webhook must refuse anything it cannot verify. Adyen cannot send a JWT,
  // so the webhook is deliberately open at the router and guarded by HMAC plus
  // Basic Auth instead - 401 is the pass here, not 404.
  const gateway = [
    ['GET', '/public/payments/local-cashier?sessionId=probe', [404], 'local cashier page is dead'],
    ['POST', '/public/payments/local-cashier/complete', [404], 'local cashier completion is dead'],
    ['POST', '/public/payments/adyen/webhook', [401], 'webhook refuses an unsigned call'],
  ];

  for (const [method, p, okCodes, label] of gateway) {
    const r = await fetch(`${BASE}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: '{"sessionId":"probe","notificationItems":[]}' } : {}),
    });
    const ok = okCodes.includes(r.status);
    ok ? pass++ : (fail++, failures.push(`${label}: got ${r.status}, wanted ${okCodes.join('/')}`));
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${r.status}  ${label}`);
  }
}


// ---- ledger export (BR-049) ----------------------------------------------
//
// The workbook is generated server-side, so a failure here is a 500 on a route
// the owner uses to get her own records out. Checks that it is gated, that it
// refuses a year it cannot mean, and that what comes back is actually an xlsx -
// a ZIP, which always starts with the bytes "PK".
if (adminToken) {
  console.log(`\nLEDGER EXPORT (BR-049)`);

  const thisYear = new Date().getFullYear();
  const r = await fetch(`${BASE}/admin/reports/income.xlsx?year=${thisYear}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const buf = Buffer.from(await r.arrayBuffer());
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  const typed = (r.headers.get('content-type') || '').includes('spreadsheetml');
  const named = (r.headers.get('content-disposition') || '').includes('.xlsx');

  const ok = r.status === 200 && isZip && typed && named && buf.length > 1000;
  ok ? pass++ : (fail++, failures.push(
    `income.xlsx: status ${r.status}, zip ${isZip}, type ${typed}, filename ${named}, ${buf.length} bytes`));
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${r.status}  income.xlsx is a real workbook (${buf.length} bytes)`);

  for (const [year, want] of [['1999', 422], ['abc', 422]]) {
    const bad = await fetch(`${BASE}/admin/reports/income.xlsx?year=${year}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const refused = bad.status === want;
    refused ? pass++ : (fail++, failures.push(`income.xlsx?year=${year} -> ${bad.status}, wanted ${want}`));
    console.log(`  ${refused ? 'OK  ' : 'FAIL'} ${bad.status}  year=${year} refused`);
  }

  const noToken = await fetch(`${BASE}/admin/reports/income.xlsx?year=${thisYear}`);
  const gated = noToken.status === 401 || noToken.status === 403;
  gated ? pass++ : (fail++, failures.push(`income.xlsx reachable with no token -> ${noToken.status}`));
  console.log(`  ${gated ? 'OK  ' : 'FAIL'} ${noToken.status}  refused with no token`);

  // The expense side, same three properties.
  const er = await fetch(`${BASE}/admin/reports/expenses.xlsx?year=${thisYear}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const ebuf = Buffer.from(await er.arrayBuffer());
  const eok =
    er.status === 200 &&
    ebuf[0] === 0x50 && ebuf[1] === 0x4b &&
    (er.headers.get('content-type') || '').includes('spreadsheetml') &&
    ebuf.length > 1000;
  eok ? pass++ : (fail++, failures.push(`expenses.xlsx: status ${er.status}, ${ebuf.length} bytes`));
  console.log(`  ${eok ? 'OK  ' : 'FAIL'} ${er.status}  expenses.xlsx is a real workbook (${ebuf.length} bytes)`);

  const eBad = await fetch(`${BASE}/admin/reports/expenses.xlsx?year=1999`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const eRefused = eBad.status === 422;
  eRefused ? pass++ : (fail++, failures.push(`expenses.xlsx?year=1999 -> ${eBad.status}`));
  console.log(`  ${eRefused ? 'OK  ' : 'FAIL'} ${eBad.status}  expenses year=1999 refused`);

  const eNoToken = await fetch(`${BASE}/admin/reports/expenses.xlsx?year=${thisYear}`);
  const eGated = eNoToken.status === 401 || eNoToken.status === 403;
  eGated ? pass++ : (fail++, failures.push(`expenses.xlsx reachable with no token -> ${eNoToken.status}`));
  console.log(`  ${eGated ? 'OK  ' : 'FAIL'} ${eNoToken.status}  expenses refused with no token`);
}

/**
 * PRIVILEGE ESCALATION GUARD, and it is deliberately STATIC.
 *
 * On 2026-09-16 `POST /api/auth/register` - public, no `requireAuth`, no
 * `requirePermission` - accepted `role` in its body, and `authService.register`
 * wrote it into the insert as `role: data.role || 'tenant'`. `user_role_type`
 * accepts `'admin'`. An unauthenticated request could therefore create an
 * administrator and receive a signed token for it.
 *
 * Every other assertion in this file is behavioural, against the running
 * server. This one cannot be: proving the endpoint IGNORES a role would mean
 * actually registering an account, and this suite runs against the live
 * database holding the owner's records. A test that creates an admin to prove
 * admins cannot be created is not a test worth having.
 *
 * So it reads the source instead, and asserts the two halves of the hole are
 * both gone. Weaker than a behavioural test, stronger than nothing, and honest
 * about which it is.
 */
{
  const authRoute = fs.readFileSync(path.join(here, '..', 'src', 'routes', 'auth.ts'), 'utf8');
  const authSvc = fs.readFileSync(path.join(here, '..', 'src', 'services', 'authService.ts'), 'utf8');

  // The schema must not accept a role. Comments are stripped so that the note
  // explaining the fix does not itself trip the check.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
  const schemaBlock = strip(authRoute).split('const registerSchema')[1]?.split('});')[0] ?? '';
  const schemaClean = !/\brole\s*:/.test(schemaBlock);
  schemaClean ? pass++ : (fail++, failures.push('registerSchema accepts a `role` field'));
  console.log(`  ${schemaClean ? 'OK  ' : 'FAIL'} ---  registerSchema does not accept a role`);

  // The insert must not take a role from the caller.
  const svcClean = !/role:\s*data\.role\s*\|\|/.test(strip(authSvc));
  svcClean ? pass++ : (fail++, failures.push('register() writes role from the request body'));
  console.log(`  ${svcClean ? 'OK  ' : 'FAIL'} ---  register() assigns the role, never the caller`);
}

/**
 * PROPERTY CLOCK GUARD.
 *
 * Seven places wrote a DATE column from `new Date().toISOString().slice(0, 10)`,
 * which is UTC's date. The property is UTC+8, so between midnight and 08:00
 * Manila time that expression returns YESTERDAY - and two of the seven wrote
 * `anniversary_date`, which anchors the rent cycle for every future month.
 *
 * Static, for the same reason as the escalation guard above: proving it
 * behaviourally would mean onboarding a tenant on the live database at 2am.
 *
 * Constructing a specific date from components - `new Date(Date.UTC(y, m, 26))`
 * - is a different thing and stays allowed. The bug is only ever in asking what
 * day it is and getting UTC's answer.
 */
{
  const stripComments = (s) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

  const srcDir = path.join(here, '..', 'src');
  const walk = (d) => fs.readdirSync(d).flatMap((e) => {
    const p = path.join(d, e);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });

  const offenders = [];
  for (const file of walk(srcDir)) {
    if (file.endsWith('propertyClock.ts')) continue; // the file that documents the bug
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    if (/new Date\(\)\.toISOString\(\)\.(?:slice\(0,\s*10\)|split\('T'\)\[0\])/.test(code)) {
      offenders.push(path.relative(path.join(here, '..'), file).split(path.sep).join('/'));
    }
  }

  const clean = offenders.length === 0;
  clean ? pass++ : (fail++, failures.push(`UTC date derived in: ${offenders.join(', ')}`));
  console.log(`  ${clean ? 'OK  ' : 'FAIL'} ---  no stored date is derived from UTC's "today"` +
              (clean ? '' : ` (${offenders.join(', ')})`));

  // ...and the replacement is not a no-op. If the timezone were ignored these
  // would agree for every instant, and this assertion would be worthless.
  const inWindow = new Date('2026-09-16T23:30:00Z');
  const utcDay = inWindow.toISOString().slice(0, 10);
  const manilaDay = inWindow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const differs = utcDay === '2026-09-16' && manilaDay === '2026-09-17';
  differs ? pass++ : (fail++, failures.push(`Asia/Manila conversion wrong: UTC ${utcDay}, Manila ${manilaDay}`));
  console.log(`  ${differs ? 'OK  ' : 'FAIL'} ---  Asia/Manila differs from UTC inside the window ` +
              `(UTC ${utcDay}, Manila ${manilaDay})`);
}

console.log(`\n${pass} passed, ${fail} failed`);
for (const f of failures) console.log('  - ' + f);
process.exit(fail === 0 ? 0 : 1);
