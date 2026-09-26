/**
 * Targeted test for two list reads (BLOCKED_FOR_SEAN.md B-75 and B-77):
 *
 * - GET /tenant/my-income-records must not hand a voided receipt to the
 *   tenant: it keeps `verification_status = 'Verified'`, so the portal listed
 *   it as a real payment.
 * - GET /admin/payments must read past PostgREST's 1,000-row cap, and page
 *   on a unique last key.
 *
 * Run from backend/:  npm run build && node scripts/check-list-reads.mjs
 *
 * Drives the real route handlers. The database client is a stub that applies
 * the filters it is given to the fixtures below, so nothing is read or written.
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-list-reads-placeholder-secret-0123456789ab',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { db } = await import('../dist/config/db.js');
const { default: adminRouter } = await import('../dist/routes/admin.js');
const { default: tenantRouter } = await import('../dist/routes/tenant.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const TENANT = '00000000-0000-4000-8000-0000000000aa';
const tables = {
  monthly_income_records: [
    { id: 'r1', tenant_profile_id: TENANT, date_paid: '2026-08-05', voided_at: null, verification_status: 'Verified' },
    { id: 'r2', tenant_profile_id: TENANT, date_paid: '2026-09-22', voided_at: '2026-09-22T09:00:00Z', verification_status: 'Verified' },
    { id: 'r3', tenant_profile_id: 'someone-else', date_paid: '2026-08-01', voided_at: null, verification_status: 'Verified' },
  ],
  // 2,345 payments: more than two PostgREST pages.
  payments: Array.from({ length: 2345 }, (_, i) => ({ id: `p${String(i).padStart(5, '0')}`, paid_at: '2026-09-01T00:00:00Z' })),
};
const PAGE_CAP = 1000;
const orders = [];

db.from = (table) => {
  const filters = [];
  let range = null;
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') {
        return (resolve) => {
          let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          const [a, b] = range ?? [0, rows.length - 1];
          rows = rows.slice(a, Math.min(b + 1, a + PAGE_CAP));   // what PostgREST does
          resolve({ data: rows, error: null });
        };
      }
      return (...args) => {
        if (prop === 'eq') filters.push((r) => r[args[0]] === args[1]);
        if (prop === 'is') filters.push((r) => (r[args[0]] ?? null) === args[1]);
        if (prop === 'range') range = args;
        if (prop === 'order' && table === 'payments') orders.push(args[0]);
        return chain;
      };
    },
  });
  return chain;
};

const handlerOf = (router, path) =>
  router.stack.find((l) => l.route?.path === path && l.route.methods.get).route.stack.at(-1).handle;

function call(handler, profileId) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = { params: {}, query: {}, body: {}, headers: {}, user: { profileId, role: 'tenant' }, get: () => undefined };
    handler(req, res, (err) => resolve({ status: err?.statusCode ?? 500, error: String(err?.message ?? err) }));
  });
}

const mine = await call(handlerOf(tenantRouter, '/tenant/my-income-records'), TENANT);
check("a tenant's receipts leave out the voided one", mine.payload?.data?.map((r) => r.id), ['r1']);

const all = await call(handlerOf(adminRouter, '/admin/payments'), 'admin');
check('the payments list reads every row past the 1,000 cap', all.payload?.data?.length, 2345);
check('with no row twice', new Set(all.payload?.data?.map((r) => r.id)).size, 2345);
check('paged on a unique last key', orders.slice(0, 2), ['paid_at', 'id']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
