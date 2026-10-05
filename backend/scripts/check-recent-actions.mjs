/**
 * Targeted test for "Your recent actions" (GET /auth/me/recent-actions).
 *
 * Run from backend/:  npm run build && node scripts/check-recent-actions.mjs
 *
 * Drives the real handler on a stub database. What it holds the route to,
 * because it reads the audit trail the adviser kept off the site (judgement
 * log 3.9):
 *   - it asks only for the CALLER's rows (actor_profile_id = the token's profile)
 *   - it never asks for sign-ins, sign-outs, refused requests or downloads
 *   - a tenant's allow-list has no administrator actions
 *   - what comes back is a sentence, never an action code, never more than three
 *   - two identical sentences in a row are one
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-recent-actions-placeholder-secret-0123456789',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { db } = await import('../dist/config/db.js');
const { default: router } = await import('../dist/routes/recentActions.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const ME = '00000000-0000-4000-8000-0000000000aa';
let auditRows = [];
let auditQuery = null;

db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') {
        return (resolve) => {
          if (table === 'audit_logs') {
            auditQuery = calls;
            return resolve({ data: auditRows, error: null });
          }
          if (table === 'rooms') return resolve({ data: [{ id: 'r2b', room_number: '2b' }], error: null });
          if (table === 'maintenance_tickets') return resolve({ data: [{ id: 't1', title: 'Leaking faucet', room_id: 'r2b' }], error: null });
          if (table === 'bills') return resolve({ data: [{ id: 'b1', total_amount: 4700 }], error: null });
          return resolve({ data: [], error: null });
        };
      }
      return (...args) => { calls.push([prop, args]); return chain; };
    },
  });
  return chain;
};

const handler = router.stack
  .find((l) => l.route?.path === '/auth/me/recent-actions' && l.route.methods.get).route.stack.at(-1).handle;

function ask(role, rows) {
  auditRows = rows;
  auditQuery = null;
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      set() { return this; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = { params: {}, query: { profileId: 'someone-else' }, body: {}, headers: {}, ip: '127.0.0.1', socket: {},
      user: { profileId: ME, role }, get: () => undefined };
    handler(req, res, (err) => resolve({ status: err?.statusCode ?? 500, error: String(err?.message ?? err) }));
  });
}

const row = (id, action, extra = {}) => ({ id, action, entity_type: 'X', entity_id: 't1', previous_values: null, new_values: null, created_at: `2026-10-05T0${id}:00:00Z`, ...extra });

let r = await ask('admin', [
  row('1', 'PAYMENT_RECORD', { new_values: { id: 'm1', room_id: 'r2b', month: 10, year: 2026, remitted_amount: 8800 } }),
  row('2', 'TICKET_STATUS_CHANGE', { new_values: { status: 'Resolved', title: 'Leaking faucet', rooms: { room_number: '2b' } } }),
  row('3', 'TICKET_STATUS_CHANGE', { new_values: { status: 'Resolved', title: 'Leaking faucet', rooms: { room_number: '2b' } } }),
  row('4', 'SOMETHING_NEW'),
  row('5', 'EXPENSE_CREATE', { new_values: { entry: { total_expenses: 6000 } } }),
  row('6', 'INQUIRY_DELETE', { previous_values: { prospect_name: 'Ana' } }),
]);
const eqs = (auditQuery ?? []).filter((c) => c[0] === 'eq').map((c) => c[1]);
const asked = (auditQuery ?? []).find((c) => c[0] === 'in')?.[1]?.[1] ?? [];
check('answers', r.status, 200);
check("asks only for the caller's rows, whatever the request says", eqs, [['actor_profile_id', ME]]);
check('never asks for sign-ins, sign-outs, refused requests or downloads',
  ['AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_ACCESS_DENIED', 'LEDGER_EXPORT', 'AUDIT_CORRECTION'].filter((a) => asked.includes(a)), []);
check('three at most, newest first, the repeated sentence once, the unknown action left out',
  r.payload.data.map((a) => a.text), [
    'Recorded a payment: 2B, October 2026, ₱8,800.',
    'Marked the repair “Leaking faucet” in 2B resolved.',
    'Recorded an expense of ₱6,000.',
  ]);
check('a link to where it happened', r.payload.data[0].link, '/admin/income?year=2026&month=10&highlight=m1');
check('no action code in any sentence', r.payload.data.some((a) => /[A-Z]{3,}_[A-Z]/.test(a.text)), false);
check('only id, at, text and link go out', Object.keys(r.payload.data[0]).sort(), ['at', 'id', 'link', 'text']);

r = await ask('tenant', [
  row('1', 'PAYMENT_RECORD', { entity_id: 'b1', new_values: { status: 'Checkout Session Initiated' } }),
  row('2', 'PAYMENT_RECORD', { entity_id: 'b1', new_values: { status: 'Checkout Session Initiated' } }),
  row('3', 'TICKET_CREATE', { new_values: { title: 'Leaking faucet' } }),
]);
const tenantAsked = (auditQuery ?? []).find((c) => c[0] === 'in')?.[1]?.[1] ?? [];
check("a tenant's allow-list has no administrator actions",
  tenantAsked.filter((a) => /^(EXPENSE_|TENANT_|INQUIRY_|ROOM_|PAYMENT_VERIFY|PAYMENT_CORRECT|TICKET_DELETE|BILL_)/.test(a)), []);
check('a tenant reads their own in their own words', r.payload.data.map((a) => a.text), [
  'Started a GCash payment of ₱4,700.',
  'Sent a repair request: “Leaking faucet”.',
]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
