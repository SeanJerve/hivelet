/**
 * check:endpoints — every registered route must have a caller, or be listed
 * here with a reason.
 *
 * Run with `npm run check:endpoints`. Reads files and writes nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * `check:reachable` asks the frontend question: can anything render this
 * component? This asks the backend one: does anything call this route?
 *
 * Both were written on 2026-09-16 after the notification centre was found
 * unplugged. Its frontend half was an orphaned component; its backend half was
 * seven endpoints faithfully serving a caller that no longer existed. Either
 * check alone would have caught it.
 *
 * AN ENDPOINT WITH NO CALLER IS ONE OF THREE THINGS
 * -------------------------------------------------
 *   EXTERNAL     something other than this browser calls it - a gateway
 *                webhook, an operations probe, a redirect target.
 *   SUPERSEDED   a different route does the job now. Harmless, but it is an
 *                untested surface that still answers, and it should be deleted
 *                or wired.
 *   UNPLUGGED    the job is not being done at all. This is the dangerous one,
 *                and it is invisible: the endpoint is correct, tested, and
 *                answers perfectly. Nobody asks it anything.
 *
 * The check cannot tell these apart - a person must. So every uncalled route
 * has to be named below with which kind it is and why. A route that appears
 * with no entry fails the run.
 *
 * WHY THE KNOWN ENTRIES DO NOT JUST GO QUIET
 * ------------------------------------------
 * An allowlist is where defects go to be forgotten, which is the exact decay
 * this audit spent two days correcting in other registers. So the SUPERSEDED
 * and UNPLUGGED entries are PRINTED on every run, every time, with their
 * remediation row. Green here means "no NEW uncalled route", never "nothing to
 * do".
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..', '..');
const ROUTES = path.join(repo, 'backend', 'src', 'routes');
const FE = path.join(repo, 'frontend', 'src');

/**
 * Every route with no caller in `frontend/src`, and why. Keyed "METHOD /path"
 * exactly as registered. Adding an entry is a decision, not a formality: say
 * which of the three kinds it is and what makes that true.
 */
const NO_BROWSER_CALLER = new Map([
  ['GET /health', { kind: 'EXTERNAL', why: 'operations probe; the handoff asks for rlsLockdown=enforced before any work' }],
  ['POST /public/payments/adyen/webhook', { kind: 'EXTERNAL', why: "Adyen calls it; HMAC-verified, asserted by check:adyen" }],
  ['GET /public/payments/local-cashier', { kind: 'EXTERNAL', why: 'gateway-return page reached by browser navigation, not by fetch; 404 whenever a gateway is configured' }],
  ['POST /public/payments/local-cashier/complete', { kind: 'EXTERNAL', why: 'gateway return; single-use session token, writes only Pending Verification' }],

  ['GET /admin/bills', { kind: 'UNPLUGGED', row: 'A-11', why: 'the administrator has no bills screen; the FR-013 overdue overlay is computed for a caller that does not exist' }],

]);

let failures = 0;
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  OK    ${m}`);

function walk(dir, exts) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist') continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((x) => e.endsWith(x))) out.push(p);
  }
  return out;
}

/** Comments out, so a path or a guard NAMED in prose is never counted as one. */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

const routes = [];
for (const f of walk(ROUTES, ['.ts'])) {
  const src = stripComments(readFileSync(f, 'utf8'));
  const re = /router\.(get|post|patch|put|delete)\(\s*['"]([^'"]+)['"]([\s\S]*?)asyncHandler/g;
  let m;
  while ((m = re.exec(src))) {
    routes.push({
      key: `${m[1].toUpperCase()} ${m[2]}`,
      method: m[1].toUpperCase(),
      route: m[2],
      file: path.basename(f),
      // Everything registered between the path and the handler: the guards.
      middleware: m[3],
    });
  }
}

/**
 * The paths the frontend actually passes to the api helper - NOT every string in
 * every file.
 *
 * The first version of this check searched the whole of `frontend/src` for each
 * route's path fragments, and it gave a false pass. `/admin/audit-logs` is both
 * an API path and a **vue-router path**: the router registers a page at it and
 * the sidebar links to it. Delete the real `api.getWithMeta('/admin/audit-logs')`
 * call and the endpoint still looked called, because the navigation entry
 * matched.
 *
 * That is the failure this whole check exists to catch, so it had to be found
 * before the check was trusted - and it was, by deliberately unplugging that
 * exact endpoint and watching the check stay green.
 */
const callPaths = new Set();
for (const f of walk(FE, ['.ts', '.vue'])) {
  // The router names PAGES, not endpoints, and several page paths collide with
  // API paths. It also imports the api helper, so "imports api" alone is not
  // enough of a filter - the directory has to be excluded outright.
  if (f.includes(`${path.sep}router${path.sep}`)) continue;

  const src = readFileSync(f, 'utf8');
  // Only files that actually talk to the API: they call the helper, or they
  // build a URL from API_BASE (the two .xlsx exports use raw fetch, because a
  // workbook cannot come back through a JSON helper). AppSidebar holds `to:`
  // navigation paths and does neither, so its page links cannot be mistaken
  // for calls.
  //
  // Matching on the import specifier instead does NOT work: authStore and
  // notificationsStore import `./api` relatively, and a filter looking for
  // 'lib/api' silently dropped every route they call - including all seven
  // notification routes and POST /auth/login.
  if (!/\bapi\s*\./.test(src) && !src.includes('API_BASE')) continue;

  // Any API-shaped literal in such a file. Not just the argument of `api.get(`:
  // the notifications store assigns `const endpoint = isAdmin ? '/admin/...'`
  // and passes the VARIABLE, and an argument-only scan reported all seven
  // notification routes as uncalled - a false alarm on the one feature this
  // check was written for.
  // Comments first. A file that talks to the API may also MENTION a path it does
  // not call - and `/admin/bills` is on the UNPLUGGED list, so one stray comment
  // would quietly flip it to "called".
  const code = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\w])\/\/[^\n]*/gm, '$1');

  // Any API-shaped path, wherever it sits in the file, with `${...}` normalised
  // to the same wildcard a route param uses.
  //
  // Anchoring to the opening quote did not work: the two workbook exports are
  // raw `fetch(`${API_BASE}/admin/reports/income.xlsx?...`)` calls - a workbook
  // cannot come back through the JSON helper - so the literal begins with the
  // interpolation, not with the path. Anchoring also truncated
  // `/admin/tenants/${id}/vacate` at the `$`.
  const re = /(\/(?:admin|tenant|public|auth|health)[A-Za-z0-9_\-./]*(?:\$\{[^}]*\}[A-Za-z0-9_\-./?=&]*)*)/g;
  let m;
  while ((m = re.exec(code))) callPaths.add(m[1].replace(/\$\{[^}]*\}/g, ''));
}
const callBlob = [...callPaths].join('\n');

/**
 * A route is "called" when every literal segment of its path appears among the
 * call paths above. Params are wildcards because the frontend interpolates them,
 * so `/admin/tickets/:id/messages` is matched by a call containing
 * `/admin/tickets/` and `/messages`.
 */
function isCalled(route) {
  const parts = route.replace(/:[A-Za-z0-9_]+/g, '').split('').filter((s) => s.length > 2);
  return parts.length > 0 && parts.every((p) => callBlob.includes(p));
}

const uncalled = routes.filter((r) => !isCalled(r.route));

console.log(`check:endpoints — ${routes.length} routes registered, ${routes.length - uncalled.length} called from frontend/src\n`);

const undocumented = uncalled.filter((r) => !NO_BROWSER_CALLER.has(r.key));
if (undocumented.length === 0) {
  pass('every route with no browser caller is accounted for below');
} else {
  for (const r of undocumented) {
    fail(`${r.key} has no caller in frontend/src and no entry in this check`);
  }
  console.log('\n  Decide which it is before adding an entry:');
  console.log('    EXTERNAL   - a webhook, a probe, a redirect target');
  console.log('    SUPERSEDED - another route does the job now');
  console.log('    UNPLUGGED  - the job is not being done at all');
}

/** Entries listed here but now called: the allowlist itself can go stale. */
const stale = [...NO_BROWSER_CALLER.keys()].filter(
  (k) => !uncalled.some((r) => r.key === k) && routes.some((r) => r.key === k)
);
if (stale.length === 0) pass('no stale entries - every route listed here really is uncalled');
else for (const k of stale) fail(`${k} is listed as uncalled but the frontend now calls it - remove the entry`);

const gone = [...NO_BROWSER_CALLER.keys()].filter((k) => !routes.some((r) => r.key === k));
if (gone.length === 0) pass('every route listed here still exists');
else for (const k of gone) fail(`${k} is listed here but no longer registered - remove the entry`);

const byKind = (kind) => uncalled.filter((r) => NO_BROWSER_CALLER.get(r.key)?.kind === kind);

for (const kind of ['UNPLUGGED', 'SUPERSEDED']) {
  const rows = byKind(kind);
  if (!rows.length) continue;
  console.log(`\n  ${kind} — ${rows.length} route(s), reported every run so they are not forgotten:`);
  for (const r of rows) {
    const e = NO_BROWSER_CALLER.get(r.key);
    console.log(`    ${r.key}`);
    console.log(`      ${e.row ? e.row + ': ' : ''}${e.why}`);
  }
}

/* ========================================================================== *
 * THE GUARD CENSUS — which writes a stranger can reach
 *
 * Added 2026-09-19, after `POST /auth/register` was found public, unthrottled,
 * and inserting a live `profiles` row with `account_status: 'active'`.
 *
 * It had been missed for a reason worth designing against. `rateLimit.ts` said
 * in its header that `POST /public/inquiries` was *"the only genuinely open
 * write in the system"*, and listed the other public writes to prove it - but
 * the list was of `routes/public.ts`, and register is in `routes/auth.ts`. The
 * census could not have produced its own counterexample, and it closed anyway.
 * That is the same failure as the DFD closure proof that enumerated
 * `FULL_DATABASE_SCHEMA.sql` and therefore could not find `property_areas`.
 *
 * So this one enumerates EVERY route file, and it is a check rather than a
 * sentence, because a sentence is what went stale.
 *
 * A write route (anything but GET) must carry `requireAuth` or
 * `requirePermission`, or be named below with why it cannot.
 * ========================================================================== */

/**
 * Write routes that are deliberately reachable without a token. Each says what
 * guards it INSTEAD, because "public" and "unguarded" are not the same thing.
 */
const OPEN_WRITES = new Map([
  ['POST /auth/login', 'public by necessity. Guarded per ACCOUNT rather than per address - profiles.failed_login_count and locked_until - which is the direction that protects a resident, since an attacker changes address more easily than they change whose account they guess at. Deliberately not rate limited: rateLimit.ts explains why, and the suites sign in on every run'],
  ['POST /auth/register', 'public by necessity. Rate limited, 5 per 15 minutes per address. It inserts a live profiles row and runs bcrypt before deciding anything, so unthrottled it is both inbox spam and a CPU sink'],
  ['POST /public/payments/local-cashier/complete', 'refuseWhenGatewayConfigured returns 404 whenever Adyen is configured, which it is - verified live, not assumed. It exists only for an environment with no gateway at all'],
  ['POST /public/payments/adyen/webhook', 'Adyen calls it. Basic Auth plus an HMAC signature verified inside the handler, so the guard cannot appear in the middleware chain. 29 signature checks in check:adyen, and an unsigned POST answers 401 - verified live'],
]);

const GUARDED = /requireAuth|requirePermission/;
const writeRoutes = routes.filter((r) => r.method !== 'GET');
const openWrites = writeRoutes.filter((r) => !GUARDED.test(r.middleware));

console.log(
  `\ncheck:endpoints — guard census: ${routes.length} routes, ${writeRoutes.length} of them writes\n`
);

const unexplained = openWrites.filter((r) => !OPEN_WRITES.has(r.key));
if (unexplained.length === 0) {
  pass(`every write route requires a token, or is one of the ${OPEN_WRITES.size} explained below`);
} else {
  for (const r of unexplained) {
    fail(
      `${r.key} (${r.file}) is a write with no requireAuth and no requirePermission, and no entry here`
    );
  }
  console.log('\n  Either guard it, or add an entry saying what guards it instead.');
}

/** The allowlist decays in the other direction too: a route that got a guard. */
const nowGuarded = [...OPEN_WRITES.keys()].filter(
  (k) => !openWrites.some((r) => r.key === k) && routes.some((r) => r.key === k)
);
if (nowGuarded.length === 0) pass('no stale entries - every route listed as open really is open');
else for (const k of nowGuarded) fail(`${k} is listed as an open write but now carries a guard - remove the entry`);

const openGone = [...OPEN_WRITES.keys()].filter((k) => !routes.some((r) => r.key === k));
if (openGone.length === 0) pass('every route listed as an open write still exists');
else for (const k of openGone) fail(`${k} is listed as an open write but is no longer registered - remove the entry`);

console.log(
  `\n  OPEN WRITES — ${openWrites.length}, printed every run so the list is never assumed:`
);
for (const r of openWrites) {
  console.log(`    ${r.key}`);
  console.log(`      ${OPEN_WRITES.get(r.key) ?? '(no reason recorded)'}`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
