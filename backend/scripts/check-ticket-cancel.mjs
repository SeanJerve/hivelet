/**
 * Targeted test for a tenant cancelling their own repair request
 * (technical evaluators, 3 Oct 2026; POST /tenant/tickets/:ticketId/cancel).
 *
 * Run from backend/:  npm run build && node scripts/check-ticket-cancel.mjs
 *
 * Drives the real handler. The database client is a stub answering from the
 * fixture below and recording what it is asked to write, so nothing is read
 * or written anywhere. What it holds the route to:
 *   - only a Submitted request of the caller's own can be cancelled
 *   - In Progress is refused, with "send a note" instead
 *   - one cancellation an hour per tenant, the wait named in minutes
 *   - the update is guarded on Submitted, so a request started a moment ago
 *     is not closed over the landlady's head
 *   - nothing is deleted: Closed, closed_by = the tenant; a reason becomes a note
 *   - the landlady is notified and the activity record gets TICKET_CANCEL
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-ticket-cancel-placeholder-secret-0123456789',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { db } = await import('../dist/config/db.js');
const { default: tenantRouter } = await import('../dist/routes/tenant.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const TICKET = '00000000-0000-4000-8000-0000000000c1';
const ME = '00000000-0000-4000-8000-0000000000aa';
const SOMEONE_ELSE = '00000000-0000-4000-8000-0000000000bb';

let ticket;           // what maybeSingle answers
let recent;           // the caller's cancellations in the last hour
let raceLost;         // the guarded update matches no row
let writes;           // everything written

db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') {
        return (resolve) => {
          const names = calls.map((c) => c[0]);
          const arg = (name) => calls.find((c) => c[0] === name)?.[1];
          if (names.includes('insert')) writes.push({ table, op: 'insert', row: arg('insert')[0] });
          if (table === 'maintenance_tickets' && names.includes('update')) {
            const eqs = calls.filter((c) => c[0] === 'eq').map((c) => c[1]);
            writes.push({ table, op: 'update', patch: arg('update')[0], eqs });
            return resolve({ data: raceLost ? [] : [{ id: TICKET, ...arg('update')[0] }], error: null });
          }
          if (table === 'maintenance_tickets' && names.includes('gte')) return resolve({ data: recent, error: null });
          if (table === 'maintenance_tickets' && names.includes('maybeSingle')) return resolve({ data: ticket, error: null });
          if (table === 'profiles') {
            return resolve({ data: names.includes('maybeSingle') || names.includes('single') ? { id: 'admin-1' } : [{ id: 'admin-1' }], error: null });
          }
          return resolve({ data: names.includes('single') ? { id: 'x' } : null, error: null });
        };
      }
      return (...args) => { calls.push([prop, args]); return chain; };
    },
  });
  return chain;
};

const handler = tenantRouter.stack
  .find((l) => l.route?.path === '/tenant/tickets/:ticketId/cancel' && l.route.methods.post).route.stack.at(-1).handle;

function cancel({ status = 'Submitted', owner = ME, body = {}, recentRows = [], race = false } = {}) {
  ticket = { id: TICKET, title: 'Kitchen faucet', status, tenant_profile_id: owner };
  recent = recentRows;
  raceLost = race;
  writes = [];
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = {
      params: { ticketId: TICKET }, body, headers: {}, ip: '127.0.0.1', socket: {},
      user: { profileId: ME, role: 'tenant' }, get: () => undefined,
    };
    handler(req, res, (err) => resolve({ status: err?.statusCode ?? 500, error: String(err?.message ?? err) }));
  });
}

const updates = () => writes.filter((w) => w.op === 'update');
const inserts = (table) => writes.filter((w) => w.op === 'insert' && w.table === table).map((w) => w.row);

let r = await cancel();
check('a Submitted request of their own is cancelled', r.status, 200);
check('as Closed, closed by the tenant, nothing deleted', [updates()[0]?.patch.status, updates()[0]?.patch.closed_by], ['Closed', ME]);
check('the update is guarded on Submitted', updates()[0]?.eqs.some((e) => e[0] === 'status' && e[1] === 'Submitted'), true);
check('no reason, no note', inserts('ticket_messages').length, 0);
check('the activity record gets TICKET_CANCEL', inserts('audit_logs').map((a) => a.action), ['TICKET_CANCEL']);
check('the landlady is told', inserts('notifications').map((n) => n.title), ['Repair request cancelled']);

r = await cancel({ body: { reason: '  It fixed itself  ' } });
check('a reason is kept as a note on the request, trimmed', inserts('ticket_messages').map((m) => m.message_body), ['Cancelled this request. Reason: It fixed itself']);

r = await cancel({ status: 'In Progress' });
check('In Progress is refused', [r.status, updates().length], [409, 0]);
check('and says to send a note instead', /Send her a note/.test(r.error), true);

r = await cancel({ status: 'Resolved' });
check('a finished request is refused', [r.status, updates().length], [409, 0]);

r = await cancel({ owner: SOMEONE_ELSE });
check("another tenant's request does not exist for them", [r.status, updates().length], [404, 0]);

const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
r = await cancel({ recentRows: [{ closed_at: twentyMinutesAgo }] });
check('a second cancellation within the hour is refused', [r.status, updates().length], [429, 0]);
check('naming the wait', /in 40 minutes/.test(r.error), true);

r = await cancel({ race: true });
check('a request started a moment ago is not closed', r.status, 409);
check('and nothing is announced', [inserts('audit_logs').length, inserts('notifications').length], [0, 0]);

r = await cancel({ body: { reason: 'x'.repeat(501) } });
check('a reason over 500 characters is refused', [r.status, updates().length], [422, 0]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
