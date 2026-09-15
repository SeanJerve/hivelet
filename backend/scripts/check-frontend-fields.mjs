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
  ['water_rate_per_occupant', 'public.ts — from system_settings'],
  ['linda_fixed_water_charges', 'public.ts — BR-040 fixed charges'],
]);

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
