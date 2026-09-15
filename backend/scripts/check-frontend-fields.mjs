/**
 * check:fields — every snake_case field the frontend reads off API JSON must be a
 * name the database (or the API, deliberately) actually produces.
 *
 * WHY THIS SUITE EXISTS
 *
 * `check:columns` catches a wrong column name in the backend, because PostgREST
 * answers one with `42703`. The frontend has no such backstop. A field that does
 * not exist is `undefined` — no error, no warning, nothing in the console — and
 * the carefully written fallback beside it then does its job perfectly, on
 * nothing. Four of these were found on 2026-09-15, all in code that typechecked
 * and shipped:
 *
 *   r.tenant_name            -> every occupied unit was labelled "Active Resident",
 *                               and that string was one empty occupant summary away
 *                               from being written into the owner's ledger as a
 *                               payer's name.
 *   l.entity_table           -> the Audit Trail read "system" for every row.
 *   l.old_values             -> the Audit Trail read "null (Initial record
 *                               insertion)" for every row. On an audit trail.
 *   l.user_agent             -> "not recorded", forever; no such column exists.
 *
 * WHAT THIS CHECK CANNOT DO
 *
 * It matches on NAME, not on table. A field that is a real column on some other
 * table passes even when it is wrong for the object being read — which is exactly
 * how `r.tenant_profile_id` on a room survived alongside `r.tenant_name`: the
 * first is a genuine column on `room_assignments`, so only its twin was flagged.
 * Making it table-aware means tracing which endpoint feeds which mapper, and that
 * is a larger piece of work. Recorded rather than overclaimed.
 *
 * It also sees only snake_case — and that is deliberate, not an omission. It was
 * measured on 2026-09-15 before being left this way.
 *
 * WHY THERE IS NO camelCase COMPANION
 *
 * snake_case works as a signal because in this codebase a snake_case property is
 * almost always a database column arriving over the API. camelCase carries no
 * such signal: it is the ordinary JavaScript naming convention, so an API field,
 * a local ref, a computed, and `addEventListener` are indistinguishable to a
 * static scan.
 *
 * A prototype confirmed it. Of 128 distinct camelCase properties read in
 * `frontend/src`, 121 do not appear in any `res.json()` literal, and the list is
 * dominated by `appendChild`, `createObjectURL`, `charAt`, `allSettled`,
 * `beforeEach`, alongside local names like `badgeClass` and `dateObj`. A check
 * built on that would report roughly 121 failures against a clean codebase. A
 * gate that is red on the day it ships teaches people to ignore red, so it was
 * not shipped.
 *
 * AND THE ENUMERATION THAT REPLACED IT WAS WRONG. READ THIS BEFORE TRUSTING IT.
 *
 * This header said, earlier on 2026-09-15: the API emits exactly ELEVEN camelCase
 * keys from `res.json()` literals, and all eleven were checked by hand. That was
 * offered as a bounded, exhaustive, dated fact. It was false.
 *
 * Re-scanned the same day, four ways, over the same unchanged source:
 *
 *   keys matching `name:` inside res.json(...)                    11, then 13
 *   the same, also accepting SHORTHAND properties `{ name }`      25
 *   the same, requiring the preceding delimiter to be `{` or `,`  16
 *
 * At least eighteen are real. Five the original scan never saw are
 * `waterRatePerOccupant`, `lindaFixedWaterCharge`, `lindaFixedWaterCharges`
 * (all three from `GET /public/rates`), `authTotal` and `grandTotal` -- every one
 * of them written as a SHORTHAND property, `{ waterRatePerOccupant }`, which a
 * scan looking for `name:` cannot see. Two more, `rlsLockdown` and
 * `gatewayStatus`, are real explicit keys that the tightened scan then dropped.
 *
 * The failure was not the regex. It was asserting a precise count from a single
 * scan that had never been made to fail against a key it was known to contain.
 * That is the same mistake this file exists to catch: a confident number produced
 * by a method nobody tested first.
 *
 * WHAT THE SURFACE ACTUALLY IS
 *
 * Not reliably enumerable by regex. A shorthand key and a value passed by name
 * are the same tokens, so `{ waterRatePerOccupant }` (a key) and
 * `{ data: withStatus }` (a value) cannot be told apart without parsing. Any
 * count written here is a FLOOR, not a total, and no exact count belongs in this
 * comment again.
 *
 * The keys confirmed emitted, and confirmed correctly spelled wherever the
 * frontend reads them, as at 2026-09-15:
 *
 *   sessionId, sessionData, clientKey, isLive, gatewayStatus   tenant.ts
 *   expiresIn                                                  auth.ts
 *   businessTotal, authTotal, grandTotal, unreadCount          admin.ts
 *   totalUnread, markedAllRead                                 admin.ts / tenant.ts
 *   redirectUrl                                                public.ts
 *   waterRatePerOccupant, lindaFixedWaterCharge,
 *     lindaFixedWaterCharges                                   public.ts
 *   authorizationModel, rlsLockdown                            health.ts
 *
 * The schema is read at runtime from PostgREST's OpenAPI document, not written
 * down here, so it cannot go stale.
 */
import dotenv from 'dotenv';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..', '..');
dotenv.config({ path: join(repo, '.env') });

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) {
  console.error('check:fields — SUPABASE_URL / SUPABASE_SECRET_KEY are not set.');
  process.exit(2);
}

const res = await fetch(`${URL_}/rest/v1/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!res.ok) {
  console.error(`check:fields — could not read the schema (HTTP ${res.status}).`);
  process.exit(2);
}
const spec = await res.json();
const defs = spec.definitions || spec.components?.schemas || {};

/** Every table name and every column name in the database. */
const KNOWN = new Set();
for (const [table, def] of Object.entries(defs)) {
  KNOWN.add(table);
  for (const col of Object.keys(def.properties || {})) KNOWN.add(col);
}

/**
 * Fields the API adds on top of the columns. Every entry names where it is
 * produced, so this list can be checked rather than trusted.
 */
const API_COMPUTED = new Map([
  ['effective_status', 'admin.ts + tenant.ts — isOverdue() overlay on a bill'],
  ['amount_paid', 'tenant.ts — summed from payments against the bill'],
  ['amount_outstanding', 'tenant.ts — bill total less amount_paid'],
]);

/**
 * Two entries were removed from the list above on 2026-09-15, and the reason is
 * worth keeping. `water_rate_per_occupant` and `linda_fixed_water_charges` were
 * listed as fields produced by public.ts from system_settings. They are not
 * fields. They are SETTINGS KEYS -- string literals inside `settingsService.ts`
 * naming rows in `system_settings`. The route that serves those values,
 * `GET /public/rates`, answers in camelCase: `waterRatePerOccupant`,
 * `lindaFixedWaterCharge`, `lindaFixedWaterCharges`.
 *
 * Nothing in `frontend/src` reads either snake_case name, so removing them broke
 * nothing today. But an allowlist entry for a field the API does not produce is a
 * HOLE, not a harmless extra: it pre-approves a name that would read as
 * `undefined` forever, which is the precise bug this check exists to catch.
 *
 * Every entry that remains names where it is produced, so the list can be checked
 * rather than trusted. Add nothing here without opening that file.
 */

const SRC = join(repo, 'frontend', 'src');
const findings = new Map();

/**
 * Comments are stripped before scanning.
 *
 * The very first run of this check flagged `r.tenant_name` at systemState.ts:558 — which is
 * the COMMENT explaining that the bug used to be there. A check that reports prose describing
 * a fixed bug teaches people to ignore it, so it strips comments first.
 *
 * Deliberately naive: block comments, HTML comments (half these files are .vue templates),
 * and line comments that are not part of a URL.
 */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\w])\/\/[^\n]*/gm, '$1');
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.ts') || e.endsWith('.vue')) out.push(p);
  }
  return out;
}

// `obj.some_snake_case` where obj is a short identifier — the mapper idiom.
const ACCESS = /\b([a-zA-Z_$][\w$]{0,12})\.([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g;

for (const file of walk(SRC)) {
  const rel = relative(repo, file);
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(ACCESS)) {
      const [, obj, field] = m;
      if (KNOWN.has(field) || API_COMPUTED.has(field)) continue;
      if (!findings.has(field)) findings.set(field, []);
      findings.get(field).push({ file: rel, line: i + 1, obj });
    }
  });
}

console.log(`check:fields — ${Object.keys(defs).length} tables read from the live schema`);
console.log(`               ${API_COMPUTED.size} API-computed fields allowed, each with a source\n`);

if (findings.size === 0) {
  console.log('  OK    every snake_case field the frontend reads is a name the API produces');
  console.log('\nALL CHECKS PASSED');
} else {
  for (const [field, uses] of [...findings].sort()) {
    const f = uses[0];
    console.log(`  FAIL  ${field}  — ${uses.length} use(s), first ${f.file}:${f.line} (${f.obj}.${field})`);
  }
  console.log(`\n${findings.size} field name(s) nothing produces. Each one reads as undefined at runtime.`);
  process.exit(1);
}
