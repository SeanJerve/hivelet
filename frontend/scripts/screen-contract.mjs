/**
 * Generates `docs/SCREEN_CONTRACT.md` — what every screen must still do.
 *
 * Run with `npm run contract` from `frontend/`. Reads source and writes one
 * document; touches neither the database nor the network.
 *
 * WHY THIS EXISTS
 * ---------------
 * The interface is being redesigned. The stated intent is a different look with
 * the same functions, and the risk in that is not visual — it is a screen that
 * comes back looking better and quietly no longer calls something.
 *
 * `check:reachable` catches a component nothing renders. `check:endpoints`
 * catches a route nothing calls. Between them they catch a whole screen or a
 * whole endpoint going missing. Neither catches the middle case: the screen is
 * there, the endpoint is there, and the button that joined them is gone.
 *
 * A person can catch that, given a list of what each screen was doing before.
 * This generates that list from the code, so it cannot drift from it.
 *
 * WHAT IT IS NOT
 * --------------
 * Not a check — it fails nothing and enforces nothing. It is a handover
 * document. The verbs below are read from the HTTP method, so "reads" and
 * "writes" are accurate; the plain-English purpose beside each path is a lookup
 * table maintained by hand, and a path with no entry prints as `—` rather than
 * inventing a description of itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const repo = path.resolve(root, '..');
const SRC = path.join(root, 'src');

/**
 * What each endpoint is FOR, in the owner's language rather than the router's.
 * Hand-maintained: a path missing from here prints as `—`, which is a prompt to
 * add it, not a silent gap.
 */
const PURPOSE = new Map([
  ['GET /public/rooms', 'the public unit catalogue'],
  ['GET /public/rooms/:id', 'one unit, for the detail modal'],
  ['GET /public/clusters', 'the five property clusters'],
  ['GET /public/rates', 'the water rate and the two Linda fixed charges'],
  ['POST /public/inquiries', 'a prospect sends an enquiry'],
  ['POST /auth/login', 'sign in'],
  ['POST /auth/logout', 'sign out, recorded in the audit trail'],
  ['POST /auth/register', 'create an account'],
  ['GET /auth/me', 'who am I'],
  ['PATCH /auth/me', 'edit my own profile'],
  ['POST /auth/change-password', 'change my own password'],
  ['GET /admin/rooms', 'the unit directory'],
  ['POST /admin/rooms', 'add a unit'],
  ['PATCH /admin/rooms/:id', "edit a unit — the rate change writes room_price_history by trigger"],
  ['GET /admin/tenants', 'the resident directory'],
  ['POST /admin/tenants', 'onboard a resident — writes profile, tenancy and unit status'],
  ['PATCH /admin/tenants/:id', 'edit a resident'],
  ['POST /admin/tenants/:id/vacate', 'end a tenancy and free the unit'],
  ['GET /admin/bills', 'bills with the overdue overlay — NOTHING CALLS THIS (A-11)'],
  ['GET /admin/payments', 'payments awaiting verification'],
  ['PATCH /admin/payments/:id/verify', 'verify a payment — atomic, settles the bill and the ledger together'],
  ['GET /admin/income-records', "the owner's income ledger"],
  ['POST /admin/income-records', 'record an on-site collection — the money path'],
  ['PATCH /admin/income-records/:id', 'correct a receipt'],
  ['DELETE /admin/income-records/:id', 'void a receipt'],
  ['GET /admin/expense-entries', 'the expense ledger'],
  ['POST /admin/expense-entries', 'add an expense and its area allocations — atomic'],
  ['PATCH /admin/expense-entries/:id', 'edit an expense and re-allocate — atomic'],
  ['DELETE /admin/expense-entries/:id', 'delete an expense'],
  ['GET /admin/expense-categories', 'the thirteen expense categories'],
  ['GET /admin/tickets', 'the maintenance board'],
  ['POST /admin/tickets', 'raise a ticket — also sets the unit Under Maintenance'],
  ['PATCH /admin/tickets/:id', 'move a ticket, and the unit status with it'],
  ['DELETE /admin/tickets/:id', 'delete a ticket'],
  ['POST /admin/tickets/:id/messages', 'reply on a ticket'],
  ['GET /admin/inquiries', 'enquiries from the public site'],
  ['PATCH /admin/inquiries/:id', 'advance or close an enquiry'],
  ['POST /admin/inquiries/:id/messages', 'reply to a prospect'],
  ['GET /admin/inquiries/:id/messages', 'what has already been said to a prospect'],
  ['GET /admin/audit-logs', 'the audit trail'],
  ['GET /admin/notifications', "the administrator's notifications"],
  ['GET /tenant/my-rooms', 'my unit'],
  ['GET /tenant/my-bills', 'my bills'],
  ['GET /tenant/my-payments', 'my payments'],
  ['GET /tenant/my-income-records', 'my receipts'],
  ['GET /tenant/my-tickets', 'my maintenance requests'],
  ['GET /tenant/my-profile', 'my details'],
  ['PUT /tenant/my-profile', 'edit my details'],
  ['GET /tenant/my-notifications', 'my notifications'],
  ['POST /tenant/tickets', 'file a maintenance request, with photos'],
  ['POST /tenant/tickets/:id/messages', 'reply on my ticket'],
  ['POST /tenant/payments/checkout', 'pay by GCash through Adyen'],
  ['POST /tenant/payments/adyen/verify-session', 'confirm the gateway session on return'],
  ['GET /tenant/tickets/:id/messages', "read my ticket thread - 404 for anyone else's"],
  ['GET /admin/tickets/:id/messages', 'read a ticket thread'],
  ['GET /admin/reports/income.xlsx', "the owner's income workbook, in her own layout"],
  ['GET /admin/reports/expenses.xlsx', 'the expense workbook, in her own layout'],
  ['GET /admin/reports/audit.xlsx', 'the audit trail as a workbook'],
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.vue') || e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** `api.get('/x')`, `api.post<T>(\`/x/${id}\`, …)`. */
const CALL = /api\.(get|getWithMeta|post|patch|put|delete)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)/g;

/**
 * A raw `fetch(\`${API_BASE}/some/path\`)`, where the path is written out. The
 * leading `/` is what requires that.
 *
 * Without it this also matched `${API_BASE}${PATH[kind]}`, and `tidy()` turned
 * the interpolation into a phantom `GET :id`. Both raw-fetch sites in this
 * codebase interpolate, so **every row this pattern ever produced was that
 * phantom** — one from the api client (skipped below) and one from
 * `downloadReport.ts`, whose three real endpoints it never saw at all. It has
 * never matched a real call. INDIRECT_PATH below is what finds those.
 */
const RAW = /API_BASE\}(\/[^`'"]+)/g;

/**
 * The fallback for a raw fetch whose path is assembled rather than written out
 * — `fetch(\`${API_BASE}${PATH[kind]}\`)` in `downloadReport.ts`.
 *
 * The endpoints are still in that file as literals; it keeps them that way on
 * purpose, and says so, because `check:endpoints` proves a route has a caller
 * by searching for its path. That reasoning was correct and it held — for
 * `check:endpoints`. It did not hold here, because this generator never looked
 * at literals, only at call expressions. One precondition, two readers, and
 * only one of them was checked. The three report exports were missing from a
 * document whose entire job is to notice a screen that quietly stopped calling
 * something.
 *
 * Scoped to files that actually make such a call, because a path literal on its
 * own is not evidence of a call: `authStore.ts` holds `/admin/overview` as a
 * ROUTER path, and collecting that would invent an endpoint that does not
 * exist. Verbs are assumed GET, the same assumption RAW already makes — a raw
 * helper that writes would need this revisited, and there is no such helper.
 */
const INDIRECT_CALL = /fetch\(\s*`\$\{API_BASE\}\$\{/;
const INDIRECT_PATH = /['"`](\/(?:admin|tenant|public|auth)\/[^'"`\s]+)['"`]/g;

/** `${...}` → `:id`, and a trailing query string dropped. */
const tidy = (p) =>
  p.replace(/\$\{[^}]*\}/g, ':id').replace(/\?.*$/, '').replace(/\/$/, '');

const byFile = new Map();

for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  if (rel.startsWith('router/')) continue;
  // The api client itself is the transport, not a screen. Its own
  // `fetch(`${API_BASE}${path}`)` matched the raw-fetch pattern and produced a
  // phantom `GET :id` row.
  if (rel === 'lib/api.ts') continue;

  const src = fs
    .readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\w])\/\/[^\n]*/gm, '$1');

  const calls = new Set();
  for (const m of src.matchAll(CALL)) {
    const verb = m[1] === 'getWithMeta' ? 'GET' : m[1].toUpperCase();
    calls.add(`${verb} ${tidy(m[2])}`);
  }
  for (const m of src.matchAll(RAW)) calls.add(`GET ${tidy(m[1])}`);
  if (INDIRECT_CALL.test(src)) {
    for (const m of src.matchAll(INDIRECT_PATH)) calls.add(`GET ${tidy(m[1])}`);
  }

  if (calls.size) byFile.set(rel, [...calls].sort());
}

const views = [...byFile].filter(([f]) => f.startsWith('views/')).sort();
const rest = [...byFile].filter(([f]) => !f.startsWith('views/')).sort();

const lines = [];
lines.push('# Screen contract — what each screen must still do');
lines.push('');
lines.push('**Generated** by `npm run contract` in `frontend/`. Do not edit by hand: it is read');
lines.push('from the source every time, so it cannot drift from what the code actually calls.');
lines.push('');
lines.push('## Why');
lines.push('');
lines.push('The interface is being redesigned — a different look, the same functions. The risk in');
lines.push('that is not visual. It is a screen that comes back looking better and quietly no longer');
lines.push('calls something.');
lines.push('');
lines.push('`check:reachable` catches a component nothing renders. `check:endpoints` catches a route');
lines.push('nothing calls. Between them, a whole screen or a whole endpoint going missing is caught.');
lines.push('**Neither catches the middle case**: the screen is there, the endpoint is there, and the');
lines.push('button that joined them is gone.');
lines.push('');
lines.push('So: rebuild a screen, then check it against its row here. Every call listed was being made');
lines.push('before the redesign started.');
lines.push('');
lines.push('**Read the verbs literally.** `writes` means it changes the owner\'s data.');
lines.push('');

const render = (title, entries) => {
  lines.push(`## ${title}`);
  lines.push('');
  for (const [file, calls] of entries) {
    const writes = calls.filter((c) => !c.startsWith('GET'));
    lines.push(`### \`${file}\``);
    lines.push('');
    lines.push(`${calls.length} call(s), **${writes.length} of them write**.`);
    lines.push('');
    lines.push('| | Endpoint | What it is for |');
    lines.push('| :--- | :--- | :--- |');
    for (const c of calls) {
      const kind = c.startsWith('GET') ? 'reads' : '**writes**';
      lines.push(`| ${kind} | \`${c}\` | ${PURPOSE.get(c) ?? '—'} |`);
    }
    lines.push('');
  }
};

render('Screens', views);
render('Shared code — stores, modals, components', rest);

const totalCalls = [...byFile.values()].reduce((a, c) => a + c.length, 0);
const totalWrites = [...byFile.values()]
  .reduce((a, c) => a + c.filter((x) => !x.startsWith('GET')).length, 0);

lines.push('---');
lines.push('');
lines.push(
  `**${byFile.size} files make ${totalCalls} distinct calls, ${totalWrites} of which write.** ` +
  'Generated ' + new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) + '.'
);
lines.push('');

const out = path.join(repo, 'docs', 'SCREEN_CONTRACT.md');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`screen contract — ${byFile.size} files, ${totalCalls} calls, ${totalWrites} writes`);
console.log(`written to ${path.relative(repo, out).replace(/\\/g, '/')}`);

const missing = [...new Set([...byFile.values()].flat())].filter((c) => !PURPOSE.has(c));
if (missing.length) {
  console.log(`\n  ${missing.length} endpoint(s) with no purpose written down yet:`);
  for (const m of missing) console.log(`    ${m}`);
}
