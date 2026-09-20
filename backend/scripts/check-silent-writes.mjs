/**
 * Fails if any database write in `backend/src` discards its result.
 *
 * Run with `npm run check:writes` from `backend/`. Reads source only; touches
 * neither the database nor the network.
 *
 * WHY THIS EXISTS
 * ---------------
 * supabase-js does not throw. Every call resolves to `{ data, error }`, so
 *
 *     await db.from('bills').update({ status: 'Due' }).eq('id', billId);
 *
 * is indistinguishable from success at the call site. `await` resolves, the
 * handler continues, and the response reports that the operation worked.
 *
 * A sweep on 2026-09-14 found **23** writes in exactly that shape, and the
 * consequences were not academic:
 *
 *   - The revert above runs when an administrator REJECTS a payment. Failing
 *     silently left the payment declined and the bill still reading Paid: money
 *     not collected, debt closed, nobody chasing it.
 *   - The vacate path closed a tenancy without checking. The tenant could be
 *     marked inactive while still holding an active assignment, so the unit
 *     never freed and the next assignment to it failed on a unique index much
 *     later, nowhere near the cause.
 *   - `registerFailedAttempt` writes the lockout counter. While that write is
 *     failing, lockout never engages and an account is open to unlimited
 *     guessing — the one failure nobody would ever notice.
 *
 * Every write must therefore declare what it wants to happen on failure, by
 * destructuring `error`, or by passing through `assertWritten` (fail loudly) or
 * `warnIfWriteFailed` (log and continue, for a write secondary to one that has
 * already committed). See `src/utils/checkedWrite.ts`.
 *
 * This check does not judge WHICH of the three is right — that is a decision per
 * call site. It only insists that one of them was made.
 *
 * WHAT IT MISSED UNTIL 2026-09-16
 * ------------------------------
 * The original matcher was anchored `^await db`, so it only ever saw the form
 * where the result is thrown away without being named. This passed it:
 *
 *     const result = await db.from('bills').update({ status: 'Due' });
 *     // ... and `result` is never looked at again
 *
 * That is the same silent write wearing a variable name, and it is the harder
 * one to spot by eye, because the line looks like it is doing something with the
 * outcome. Proved by deliberately deleting a live `warnIfWriteFailed` call: the
 * suite still reported ALL CHECKS PASSED.
 *
 * Three shapes now fail:
 *   1. `await db...` with the result discarded outright
 *   2. `const { data } = await db...` - destructured, but not `error`
 *   3. `const r = await db...` where `r.error` is never read and `r` is never
 *      handed to assertWritten / warnIfWriteFailed
 *
 * A sweep at the time of this change found 0 of all three: 43 writes destructure
 * `error`, 24 go through a helper, 1 is captured and examined.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');

const WRITE = /\.(insert|update|delete|upsert)\s*\(/;
/** `await db...`, or `const x = await db...` / `const { a, b } = await db...`. */
const DB_AWAIT = /^(?:(?:const|let)\s+(\{[^}]*\}|[A-Za-z0-9_$]+)\s*=\s*)?await\s+db\b/;
const WRAPPED = /(assertWritten|warnIfWriteFailed)\s*\(/;
/** How far ahead to look for the captured result being examined. */
const EXAMINE_WINDOW = 40;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** A single backslash, kept out of the template literals below for legibility. */
const BS = String.fromCharCode(92);

const findings = [];

/**
 * THE SAME SHAPE, ON THE READ SIDE.
 *
 * `const { data: room } = await db.from('rooms')...` with `error` left behind is
 * the write defect's twin: on a failed query `room` is `undefined`, which is
 * exactly what "no such row" looks like. The call site cannot tell a broken
 * request from an empty result, and every one of these sits in front of a
 * decision.
 *
 * A sweep on 2026-09-19 found 23 of them, and 13 were acting on the answer: the
 * duplicate-income guard wrote the same receipt into the ledger twice, the
 * unpaid-bill lookup raised a second bill for a period already billed, the unit
 * code behind the water model fell to '' and billed a Linda fixed-charge unit
 * per occupant (on BOTH the payment and the ledger-edit paths), the occupant
 * count fell to 1, vacate never freed the unit, an income row could be "moved"
 * to a unit that does not exist and silently stay put, a room photo was
 * inserted a second time instead of replaced, the unread badge cleared itself,
 * and the webhook attached a payment to nobody. Those 13 are fixed.
 *
 * The remaining 10 are counted, not failed. Unlike a write, a read that
 * discards its error is often harmless or actively safe - `tenant.ts:419`
 * checks ticket ownership this way and a failed read yields 404, which is the
 * correct answer to give, and the count at `admin.ts` line ~860 can only ever
 * be 0 because `idx_single_active_assignment_per_room` allows one active
 * assignment per room. Failing all ten would force `error` to be taken where it
 * changes nothing, and a check that demands meaningless edits gets silenced.
 *
 * So this is a ratchet. The census may fall freely; it may not rise. A new one
 * is a new decision made against an answer nobody checked, and it has to be
 * argued for by lowering the number here on purpose.
 */
const BARE_READ_BASELINE = 10;

let readsExamined = 0;
let readsTakingError = 0;
const bareReads = [];

/**
 * WHAT THIS CHECK ACTUALLY EXAMINED, AND A REFUSAL TO PASS ON NOTHING.
 *
 * Proved on 2026-09-17 by copying this script somewhere `../src` was an empty
 * directory. It scanned **zero files** and printed:
 *
 *     OK    every write declares what failure means
 *     ALL CHECKS PASSED                                     (exit 0)
 *
 * That is the worst failure a check can have. It guards every database write in
 * the system, and it was capable of reporting them all safe while having read
 * none of them - if `src` were renamed, moved, or the walk broke on a future
 * Node, nothing would have said so.
 *
 * The floor is `> 0` rather than a number. A hardcoded "at least 30 files" is
 * itself a claim with a date on it, and this project has been bitten four times
 * today by exactly that. The COUNT is printed instead, so a drop from 32 to 3 is
 * visible to a person even though it is legal to the machine.
 */
const scanned = walk(SRC).sort();

if (scanned.length === 0) {
  console.log('SILENT WRITES - every database write must declare what failure means\n');
  console.log(`  FAIL  no source files found under ${path.relative(root, SRC)}`);
  console.log('        This check examined NOTHING, so it proves nothing. Either the');
  console.log('        directory moved, or the walk is broken. It is not a pass.');
  process.exit(1);
}

for (const file of scanned) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    const bind = DB_AWAIT.exec(line.trim());
    if (!bind) return;

    // Already handed to a checked helper on the line above?
    for (let k = i - 1; k >= 0 && k >= i - 2; k--) {
      if (!lines[k].trim()) continue;
      if (WRAPPED.test(lines[k])) return;
      break;
    }

    // Collect the statement, up to the first line ending in a semicolon.
    const chunk = [];
    for (let j = i; j < Math.min(i + 30, lines.length); j++) {
      chunk.push(lines[j]);
      if (lines[j].trimEnd().endsWith(';')) break;
    }
    const stmt = chunk.join('\n');

    // Not a write. It is still a database call whose failure is invisible, so
    // it goes to the read census below rather than being ignored.
    if (!WRITE.test(stmt)) {
      if (/\.rpc\s*\(/.test(stmt)) return;
      readsExamined++;
      const rTarget = bind[1];
      if (!rTarget || !rTarget.startsWith('{')) return;
      if (/\berror\b/.test(rTarget)) {
        readsTakingError++;
        return;
      }
      const rTable = /\.from\(\s*['"]([^'"]+)/.exec(stmt);
      bareReads.push({
        file: path.relative(root, file).replace(/\\/g, '/'),
        line: i + 1,
        table: rTable ? rTable[1] : '?',
        shape: rTarget.replace(/\s+/g, ' '),
      });
      return;
    }

    const target = bind[1];
    let why;

    if (!target) {
      why = 'result discarded';
    } else if (target.startsWith('{')) {
      // Destructured. `error` must be among what was taken.
      if (/\berror\b/.test(target)) return;
      why = 'destructured ' + target.replace(/\s+/g, ' ') + ' - `error` not taken';
    } else {
      // Captured under a name. It has to be examined for this to mean anything.
      const rest = lines.slice(i + 1, i + 1 + EXAMINE_WINDOW).join('\n');
      const reads = new RegExp(BS + 'b' + target + BS + 's*' + BS + '.' + BS + 's*error' + BS + 'b');
      const hands = new RegExp(
        '(assertWritten|warnIfWriteFailed)' + BS + 's*' + BS + '(' + BS + 's*' + target + BS + 'b'
      );
      if (reads.test(rest) || hands.test(rest)) return;
      why = 'captured as `' + target + '` and never examined';
    }

    const op = WRITE.exec(stmt)[1];
    const table = /\.from\(\s*['"]([^'"]+)/.exec(stmt);
    findings.push({
      file: path.relative(root, file).replace(/\\/g, '/'),
      line: i + 1,
      op,
      table: table ? table[1] : '?',
      why,
    });
  });
}

console.log('SILENT WRITES - every database write must declare what failure means\n');

if (findings.length === 0) {
  console.log(`  OK    every write declares what failure means (${scanned.length} source files read)`);
  console.log('        (discarded, destructured without `error`, and captured-but-');
  console.log('         never-examined results all fail this check)');
} else {
  for (const f of findings) {
    console.log(`  FAIL  ${f.file}:${f.line}  ${f.op} on ${f.table} - ${f.why}`);
  }
  console.log(
    `\n${findings.length} write(s) do not say what failure means.\n` +
      'Destructure `error`, or pass the call through assertWritten / warnIfWriteFailed\n' +
      '(src/utils/checkedWrite.ts) so the intent on failure is explicit.'
  );
}

console.log('\nREAD CENSUS - a failed query must not read as an empty result\n');
console.log(
  `  ${readsExamined} read(s) examined, ${readsTakingError} take \`error\`, ` +
    `${bareReads.length} do not (ratchet: ${BARE_READ_BASELINE})`
);

const readsOverBudget = bareReads.length > BARE_READ_BASELINE;

if (bareReads.length > 0) {
  for (const r of bareReads) {
    console.log(`  ${readsOverBudget ? 'FAIL' : 'note'}  ${r.file}:${r.line}  ${r.table} - ${r.shape}`);
  }
}

if (readsOverBudget) {
  console.log(
    `\nThe census rose from ${BARE_READ_BASELINE} to ${bareReads.length}.\n` +
      'A read that discards `error` cannot tell a broken query from an empty\n' +
      'result, so whatever it decides next is decided on an answer nobody\n' +
      'checked. Destructure `error` and say what failure means - or, if this one\n' +
      'genuinely fails closed, lower BARE_READ_BASELINE deliberately and say why.'
  );
} else if (bareReads.length < BARE_READ_BASELINE) {
  console.log(
    `\n  note: down from ${BARE_READ_BASELINE}. Lower BARE_READ_BASELINE to ` +
      `${bareReads.length} to keep the ratchet tight.`
  );
}

/**
 * EVERY WRITE ROUTE MUST LEAVE A TRAIL, or be on the list below saying why not.
 *
 * Added 2026-09-19. A previous version of this audit answered the question by
 * grepping for the helper name and got it WRONG: `authService` writes to
 * `audit_logs` directly and never calls the helper, so sign-in looked unaudited
 * when it is not. This walks each `router.<verb>(` body by brace depth, and
 * where the body only delegates, the allow-list below names the service that
 * carries the audit and that claim was checked function by function.
 *
 * The four notification routes are on the list because marking a message read
 * records no financial or security fact. Everything else that writes, audits.
 *
 * WHAT THIS ACTUALLY GUARDS: a NEW write route appearing without an audit. It
 * is not a statement that the current nine are fine - it is a statement that
 * somebody looked at each of these nine once, wrote down why, and that the
 * tenth will not slip past.
 */
const AUDIT_RE = /auditFromRequest|recordAudit|from\(['"]audit_logs['"]\)|auditService\./;

const AUDITED_ELSEWHERE = new Map([
  ['/auth/login',                            'authService writes audit_logs directly (recordLoginAudit)'],
  ['/auth/register',                         'authService writes a TENANT_CREATE row before the login audit'],
  ['/public/payments/adyen/webhook',         'adyenWebhookHandler audits every branch, matched and unmatched'],
  ['/public/payments/local-cashier/complete','adyenService.recordLocalCheckoutPayment -> PAYMENT_RECORD'],
  ['/tenant/payments/adyen/verify-session',  'adyenService.confirmCheckout -> PAYMENT_RECORD'],
  ['/admin/notifications/:id/read',          'marking a message read is not a financial or security fact'],
  ['/admin/notifications/mark-all-read',     'as above'],
  ['/tenant/my-notifications/:id/read',      'as above'],
  ['/tenant/my-notifications/mark-all-read', 'as above'],
]);

const routeDir = path.join(SRC, 'routes');
let writeRoutes = 0;
const unaudited = [];

for (const f of fs.readdirSync(routeDir).filter((x) => x.endsWith('.ts'))) {
  const src = fs.readFileSync(path.join(routeDir, f), 'utf8');
  const re = /router\.(post|patch|put|delete)\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = re.lastIndex - 1, depth = 0, end = i;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = src.slice(re.lastIndex, end);
    const routePath = (body.match(/['"](\/[a-z0-9/:_-]+)['"]/i) ?? [])[1] ?? '(unknown)';
    writeRoutes++;
    if (AUDIT_RE.test(body)) continue;
    if (AUDITED_ELSEWHERE.has(routePath)) continue;
    unaudited.push(`${m[1].toUpperCase()} ${routePath}  (${f})`);
  }
}

/**
 * EVERY ROUTE DECLARES WHAT IT NEEDS.
 *
 * `admin.ts` gates the whole router with `router.use('/admin', requireAuth,
 * requireAdmin)`, so a route added without its own `requirePermission` is still
 * behind authentication and still admin-only - which is exactly why the omission
 * would be easy to miss. It is not a hole today; it is the belt that stops one.
 *
 * `tenant.ts` has `requireAuth` at the router level but NO role gate, so there a
 * missing `requirePermission` is the difference between "any signed-in tenant,
 * scoped to their own rows" and "any signed-in account at all". That one matters
 * immediately.
 *
 * Probed the live server before writing this: all 17 admin GET routes refuse a
 * tenant token, 403 or 401, every one. This is the static guard that keeps it
 * true for the eighteenth.
 *
 * A NOTE ON THE FIRST VERSION OF THAT PROBE, because it is the lesson. It
 * extracted routes with a single regex, found 14 of the 17, and reported "no
 * admin route answers a tenant" - a clean result on a sample missing three of
 * the routes worth checking. A count is the cheapest way to find out whether a
 * scanner is looking at everything, and it is worth spending.
 */
const GUARDED_ELSEWHERE = new Map([
  // Nothing yet. Add a route here only with the reason it needs no permission.
]);

/**
 * AND IT DECLARES ONE THAT MEANS WHAT THE ROUTE DOES.
 *
 * Declaring *a* permission is not the same as declaring the right one, and the
 * wrong one is worse than none: it reads as a deliberate decision.
 *
 * `POST /admin/tickets/:id/messages` declared `TICKET_COMMENT`, which TENANTS
 * held. That route posts into any thread and has no ownership check, by design -
 * the administrator is meant to see every ticket - so the only thing between a
 * resident and another resident's thread was the `requireAdmin` on the router.
 * It held, and this was never exploitable. But the second lock was reading as
 * though it let tenants in on purpose, and the day that handler moves, or the
 * router gate is relaxed for one endpoint, the declaration beside it would have
 * agreed.
 *
 * The rule: a permission the TENANT role holds may appear on an admin route only
 * if it is scoped `_OWN`. Four do - the notification routes, where the
 * administrator really is reading her own and every one filters by
 * `req.user.profileId`. `TICKET_COMMENT` was the one tenant permission whose
 * name carried no scope at all, which is exactly how it ended up somewhere
 * unscoped. It is now `TICKET_COMMENT_OWN` and `TICKET_COMMENT_ANY`.
 *
 * WHAT THIS DOES NOT PROVE, stated because the first version of this comment
 * overclaimed. It reads names, not behaviour. `_OWN` on an admin route is taken
 * as a promise that the handler filters by `req.user.profileId`, and nothing
 * here checks that it does. The rule catches the shape that actually occurred -
 * a tenant permission with no scope in its name landing on an unscoped route -
 * and a deliberately mis-named `_OWN` would walk past it.
 *
 * Read from `rbac.ts` rather than listed here, so adding a permission to the
 * tenant role brings it under this rule automatically. The spread is followed:
 * `TENANT_PERMISSIONS` opens with `...GUEST_PERMISSIONS`, and reading only the
 * literal entries missed three - including `INQUIRY_CREATE`, which tenants hold
 * and which carries no scope at all. Found by mutation-testing this rule, which
 * is the entire reason for mutation-testing a rule.
 */
const rbacSrc = fs.readFileSync(path.join(routeDir, '..', 'config', 'rbac.ts'), 'utf8');
const permBlock = (name) =>
  (rbacSrc.match(new RegExp(`const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\];`)) ?? [])[1] ?? '';
const namesIn = (block) => [...block.matchAll(/P\.([A-Z_]+)/g)].map((x) => x[1]);

const tenantBlock = permBlock('TENANT_PERMISSIONS');
const TENANT_HELD = new Set(namesIn(tenantBlock));
// `...GUEST_PERMISSIONS` and any other spread, followed by name.
for (const sp of tenantBlock.matchAll(/\.\.\.([A-Z_]+)/g)) {
  for (const n of namesIn(permBlock(sp[1]))) TENANT_HELD.add(n);
}
if (TENANT_HELD.size === 0) {
  console.log('\n  FAIL  could not read TENANT_PERMISSIONS from rbac.ts - the scope rule cannot run');
  process.exitCode = 1;
}

const routeFiles = ['admin.ts', 'tenant.ts'];
let guarded = 0;
const unguarded = [];
const misScoped = [];

for (const f of routeFiles) {
  const src = fs.readFileSync(path.join(routeDir, f), 'utf8');
  const re = /router\.(get|post|patch|put|delete)\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = re.lastIndex - 1, depth = 0, end = i;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = src.slice(re.lastIndex, end);
    const routePath = (body.match(/['"](\/[a-z0-9/:_-]+)['"]/i) ?? [])[1] ?? '(unknown)';

    if (f === 'admin.ts' && routePath.startsWith('/admin')) {
      for (const pm of body.matchAll(/requirePermission\s*\(\s*PERMISSIONS\.([A-Z_]+)\s*\)/g)) {
        const name = pm[1];
        if (TENANT_HELD.has(name) && !name.endsWith('_OWN')) {
          misScoped.push(`${m[1].toUpperCase()} ${routePath}  declares ${name}, which tenants hold`);
        }
      }
    }

    if (/requirePermission\s*\(/.test(body)) { guarded++; continue; }
    if (GUARDED_ELSEWHERE.has(routePath)) { guarded++; continue; }
    unguarded.push(`${m[1].toUpperCase()} ${routePath}  (${f})`);
  }
}

if (misScoped.length > 0) {
  console.log(`\n  FAIL  ${misScoped.length} admin route(s) declare a tenant permission that is not _OWN:`);
  for (const s of misScoped) console.log(`          ${s}`);
  console.log(
    '\n  requireAdmin on the router still holds, so this is not a hole. It is a\n' +
    '  declaration that says the opposite of what the route means, sitting where\n' +
    '  the second lock should be. Give the administrator\'s version its own name.'
  );
  process.exitCode = 1;
} else {
  console.log(
    `\n  OK    permission scope - no admin route declares an unscoped tenant permission ` +
    `(${TENANT_HELD.size} held by tenants)`
  );
}

if (unguarded.length > 0) {
  console.log(`\n  FAIL  ${unguarded.length} route(s) declare no permission:`);
  for (const u of unguarded) console.log(`          ${u}`);
  console.log(
    '\n  On the tenant router that is the difference between "this caller, their\n' +
    '  own rows" and "anyone signed in". On the admin router the router-level\n' +
    '  requireAdmin still holds, but the route should say what it needs.'
  );
} else {
  console.log(`\n  OK    permissions - all ${guarded} admin and tenant route(s) declare one`);
}

if (unaudited.length > 0) {
  console.log(`\n  FAIL  ${unaudited.length} write route(s) record nothing in audit_logs:`);
  for (const u of unaudited) console.log(`          ${u}`);
  console.log(
    '\n  A route that changes data and leaves no trail cannot be answered for\n' +
    '  later. Add an audit call, or - if it genuinely records no financial or\n' +
    '  security fact - add it to AUDITED_ELSEWHERE with the reason.'
  );
} else {
  console.log(
    `\n  OK    audit trail - ${writeRoutes} write route(s), ` +
    `${writeRoutes - AUDITED_ELSEWHERE.size} audit inline and ` +
    `${AUDITED_ELSEWHERE.size} are accounted for by name`
  );
}

if (findings.length > 0 || readsOverBudget || unaudited.length > 0 || unguarded.length > 0) process.exit(1);

console.log('\nALL CHECKS PASSED');
process.exit(0);
