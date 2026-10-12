/**
 * Simultaneous saves (Chapter 4, Table 11F; Chapter 5, recommendation 4).
 *
 * Run from backend/:  npm run check:concurrency   (builds first)
 *
 * On 19 September the same receipt sent five times at once wrote five rows, and on 24 September two
 * GCash checkouts on one bill both opened. Both were fixed by a rule the database keeps (migration
 * 033's unique index, migration 051's conditional claim on the bill), and both fixes were proved once,
 * by hand. This repeats them on every run.
 *
 * It drives the REAL handlers (dist/routes/admin.js and tenant.js), many requests at the same instant,
 * against a stand-in database that keeps the same two rules the live one does:
 *   - receipts: one row per unit, invoice number and month among standing receipts; a second insert is
 *     refused with Postgres's 23505 naming the index, as the live index refuses it;
 *   - checkout: an UPDATE carrying the `.or(checkout_opened_at is null or older than 15 minutes)` filter
 *     changes the row only if the condition holds when it runs, one at a time, as a row lock makes the
 *     live UPDATE behave.
 * Nothing is read from or written to any real database, and Adyen is never called.
 *
 * What this does NOT prove is that the live database still has those rules. The suites read through
 * PostgREST, which cannot see indexes. That half is checked in the catalogue: migrations 033 and 051's
 * verification queries, and docs/FINAL MANUSCRIPT/CHAPTER_4 Table 11F's note (checked 12 Oct 2026).
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-concurrency-placeholder-secret-0123456789',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { db } = await import('../dist/config/db.js');
const { default: adminRouter } = await import('../dist/routes/admin.js');
const { default: tenantRouter } = await import('../dist/routes/tenant.js');
const { adyenService } = await import('../dist/services/adyenService.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

// ---------------------------------------------------------------- the stand-in database ----
// Every `db.from(table)...` chain is recorded and answered by `answer(table, calls)` when awaited.
// Each answer is given on a later turn of the event loop, so requests fired together really do
// interleave: all of them pass their reads before any of them writes, as on 19 September.
let answer = () => ({ data: null, error: null });
const tick = () => new Promise((r) => setImmediate(r));
db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') return (resolve, reject) => tick().then(() => answer(table, calls)).then(resolve, reject);
      return (...args) => { calls.push([prop, args]); return chain; };
    },
  });
  return chain;
};
db.rpc = async () => ({ data: null, error: null });
const has = (calls, name) => calls.some((c) => c[0] === name);
const arg = (calls, name) => calls.find((c) => c[0] === name)?.[1];
const eqOf = (calls, col) => calls.find((c) => c[0] === 'eq' && c[1][0] === col)?.[1][1];

function handlerOf(router, path) {
  return router.stack.find((l) => l.route?.path === path && l.route.methods.post).route.stack.at(-1).handle;
}
function call(handler, { body, user }) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = { params: {}, query: {}, body, headers: {}, ip: '127.0.0.1', socket: {}, user, get: () => undefined };
    handler(req, res, (err) => resolve({ status: err?.statusCode ?? 500, error: String(err?.message ?? err) }));
  });
}

// ---------------------------------------------------------------- 1. the same receipt, at once ----
const ROOM = { id: '00000000-0000-4000-8000-0000000000r1', capacity: 2 };
const TENANCY = {
  id: '00000000-0000-4000-8000-0000000000t1', tenant_profile_id: '00000000-0000-4000-8000-0000000000p1',
  anniversary_date: '2024-01-07', occupant_count: 1, start_date: '2024-01-07', end_date: null, is_active: true,
};
const ADMIN = { profileId: '00000000-0000-4000-8000-0000000000ad', role: 'admin', email: 'owner@example.invalid' };

let receipts;          // the standing rows the stand-in holds
let receiptIndex;      // false: as if migration 033 had never run
function receiptAnswer(table, calls) {
  if (table === 'rooms') return { data: ROOM, error: null };
  if (table === 'room_assignments') return { data: has(calls, 'maybeSingle') ? TENANCY : [TENANCY], error: null };
  if (table === 'system_settings') return { data: [{ key: 'water_rate_per_occupant', value: '200' }, { key: 'grace_period_days', value: '0' }], error: null };
  if (table === 'monthly_income_records') {
    if (has(calls, 'insert')) {
      const row = arg(calls, 'insert')[0];
      // The live index's own condition (catalogue, 12 Oct 2026): standing rows only, and not a receipt
      // with no invoice number (NULLs never match in a unique index) or an acknowledgement receipt.
      const indexed = row.invoice_number !== null && row.invoice_number !== 'Acknowledgement receipt';
      const clash = indexed && receipts.some((r) => r.room_id === row.room_id && r.invoice_number === row.invoice_number
        && r.year === row.year && r.month === row.month);
      if (clash && receiptIndex) {
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "idx_one_invoice_per_unit_per_month"' } };
      }
      const saved = { id: `rec-${receipts.length + 1}`, ...row };
      receipts.push(saved);
      return { data: saved, error: null };
    }
    // The handler's own duplicate read. It sees only what is already saved, which is the whole race.
    const matches = receipts.filter((r) => r.room_id === eqOf(calls, 'room_id') || eqOf(calls, 'room_id') === undefined)
      .filter((r) => eqOf(calls, 'invoice_number') === undefined || r.invoice_number === eqOf(calls, 'invoice_number'))
      .filter((r) => eqOf(calls, 'year') === undefined || r.year === eqOf(calls, 'year'))
      .filter((r) => eqOf(calls, 'month') === undefined || r.month === eqOf(calls, 'month'));
    return { data: matches.map((r) => ({ ...r, rooms: { room_number: '1A' } })), error: null };
  }
  if (has(calls, 'insert') || has(calls, 'update')) return { data: has(calls, 'single') ? { id: 'x' } : [], error: null };
  return { data: has(calls, 'single') || has(calls, 'maybeSingle') ? null : [], error: null };
}

const recordIncome = handlerOf(adminRouter, '/admin/income-records');
const receiptBody = {
  roomNumber: '1A', datePaid: '2026-10-07', contactName: 'Check tenant', invoiceNumber: '9999',
  rentAmount: 4500, occupants: 1, paymentMethod: 'Cash', monthsCovered: 1,
};
async function sendReceipts(n, { index = true, together = true, invoiceNumber = receiptBody.invoiceNumber } = {}) {
  receipts = []; receiptIndex = index; answer = receiptAnswer;
  const body = { ...receiptBody, invoiceNumber };
  if (together) return Promise.all(Array.from({ length: n }, () => call(recordIncome, { body, user: ADMIN })));
  const out = [];
  for (let i = 0; i < n; i++) out.push(await call(recordIncome, { body, user: ADMIN }));
  return out;
}
const tally = (results) => results.reduce((t, r) => ({ ...t, [r.status]: (t[r.status] ?? 0) + 1 }), {});

let r = await sendReceipts(1);
check('one receipt is saved', [tally(r), receipts.length], [{ 201: 1 }, 1]);

r = await sendReceipts(2);
check('the same receipt twice at once: one saved, one refused', [tally(r), receipts.length], [{ 201: 1, 409: 1 }, 1]);

r = await sendReceipts(5);
check('five at once: one saved, four refused', [tally(r), receipts.length], [{ 201: 1, 409: 4 }, 1]);
check('each refusal names the invoice, not a database error',
  r.filter((x) => x.status === 409).every((x) => /Invoice INV#9999 is already recorded for unit 1A/.test(x.error)), true);

r = await sendReceipts(10);
check('ten at once: still one saved', [tally(r), receipts.length], [{ 201: 1, 409: 9 }, 1]);

r = await sendReceipts(3, { together: false });
check('one after another: the handler\'s own read refuses the second', [tally(r), receipts.length], [{ 201: 1, 409: 2 }, 1]);

// Why the rule has to be the database's: without the index, the handler's read-then-write lets every
// simultaneous copy through. This is the 19 September result, kept as an assertion so that nobody
// "simplifies" the index away believing the handler's check is enough.
r = await sendReceipts(5, { index: false });
check('without the database rule, five at once write five rows (19 Sep)', receipts.length, 5);

// Receipts the index does not cover: no invoice number, or an acknowledgement receipt (since 30 Sep).
// One after another, the handler's own read still refuses the copy.
r = await sendReceipts(2, { together: false, invoiceNumber: '' });
check('no invoice number, one after another: the second is refused', [tally(r), receipts.length], [{ 201: 1, 409: 1 }, 1]);
r = await sendReceipts(2, { together: false, invoiceNumber: 'ACK' });
check('an acknowledgement receipt, one after another: the second is refused', [tally(r), receipts.length], [{ 201: 1, 409: 1 }, 1]);
// At the same instant nothing in the database stops them (B-105). Reported, not passed or failed:
// it is a fact about the live index, and the decision what to do about it is Sean's.
for (const [label, invoiceNumber] of [['no invoice number', ''], ['an acknowledgement receipt', 'ACK']]) {
  r = await sendReceipts(2, { invoiceNumber });
  console.log(`note: ${label}, twice at once: ${receipts.length} row(s) saved. The index exempts these (B-105).`);
}

// ---------------------------------------------------------------- 2. two checkouts on one bill ----
const ME = { profileId: '00000000-0000-4000-8000-0000000000p1', role: 'tenant', email: 'tenant@example.invalid' };
const BILL = '00000000-0000-4000-8000-0000000000b1';
let openedAt;          // bills.checkout_opened_at
let sessions;          // sessions Adyen was asked for
let sessionFails;      // Adyen refuses to create one

function checkoutAnswer(table, calls) {
  if (table === 'bills') {
    if (has(calls, 'update')) {
      const patch = arg(calls, 'update')[0];
      const guarded = calls.find((c) => c[0] === 'or')?.[1][0] ?? null;
      if ('checkout_opened_at' in patch && patch.checkout_opened_at !== null) {
        // The claim. The live UPDATE takes the row's lock, so two run one after the other, and each
        // tests the condition against what the other left. Without the `.or` filter it always wins.
        // The cutoff is the handler's own, read from its filter, so a change to the hold shows here.
        if (guarded !== null && !/checkout_opened_at\.is\.null/.test(guarded)) throw new Error('unexpected claim filter: ' + guarded);
        const cutoff = guarded?.match(/checkout_opened_at\.lt\."([^"]+)"/)?.[1];
        const free = openedAt === null || (cutoff !== undefined && new Date(openedAt) < new Date(cutoff));
        if (guarded === null || free) { openedAt = patch.checkout_opened_at; return { data: [{ id: BILL }], error: null }; }
        return { data: [], error: null };
      }
      openedAt = null;  // the release
      return { data: null, error: null };
    }
    if (has(calls, 'single') || has(calls, 'maybeSingle')) {
      return { data: { id: BILL, total_amount: 8800, status: 'Unpaid', tenant_profile_id: ME.profileId,
        rent_amount: 8000, water_amount: 800, due_date: '2026-10-07', checkout_opened_at: openedAt, rooms: { room_number: 'F2F' } }, error: null };
    }
    return { data: [], error: null };
  }
  if (table === 'payments') return { data: [], error: null };
  if (has(calls, 'insert') || has(calls, 'update')) return { data: has(calls, 'single') ? { id: 'x' } : [], error: null };
  return { data: has(calls, 'single') || has(calls, 'maybeSingle') ? null : [], error: null };
}
adyenService.createCheckoutSession = async (billId) => {
  await tick();
  if (sessionFails) throw Object.assign(new Error('Adyen refused the session (stand-in)'), { statusCode: 502 });
  sessions.push(billId);
  return { sessionId: `CS-${sessions.length}`, sessionData: 'x', clientKey: 'test_x', environment: 'test', isLive: false };
};

const checkout = handlerOf(tenantRouter, '/tenant/payments/checkout');
const open = () => call(checkout, { body: { billId: BILL }, user: ME });
function reset({ held = null, fails = false } = {}) { answer = checkoutAnswer; openedAt = held; sessions = []; sessionFails = fails; }

reset();
r = await Promise.all([open(), open()]);
check('two checkouts on one bill at once: one opens, one is refused', [tally(r), sessions.length], [{ 200: 1, 409: 1 }, 1]);
check('the refusal tells the tenant not to pay again', /you will not be charged\s+again/.test(r.find((x) => x.status === 409)?.error ?? ''), true);

reset();
r = await Promise.all(Array.from({ length: 5 }, open));
check('five at once: still one session', [tally(r), sessions.length], [{ 200: 1, 409: 4 }, 1]);

reset({ held: new Date(Date.now() - 16 * 60 * 1000).toISOString() });
r = await open();
check('16 minutes after an abandoned checkout, a new one opens', [r.status, sessions.length], [200, 1]);

reset({ held: new Date(Date.now() - 5 * 60 * 1000).toISOString() });
r = await open();
check('5 minutes after one was opened, it is still held', [r.status, sessions.length], [409, 0]);

reset({ fails: true });
r = await open();
check('when Adyen cannot open a session, the hold is released', [r.status, openedAt], [502, null]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
