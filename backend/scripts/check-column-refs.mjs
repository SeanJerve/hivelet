/**
 * check:columns — every table, column, filter and write key in `backend/src`
 * must exist in the live database.
 *
 * WHY THIS SUITE EXISTS
 *
 * PostgREST answers a query naming a column the table does not have with
 * `42703: column X does not exist`. Nothing catches that at build time: it
 * typechecks, it lints, it deploys, and it fails the first time a person uses
 * the feature — often disguised, because the surrounding code turns the error
 * into something friendlier and wronger. Two were found on 2026-09-15:
 *
 *   POST /admin/inquiries/:id/messages  selected `full_name, email,
 *     phone_number` from `inquiries`, which has `prospect_name`,
 *     `prospect_email`, `prospect_phone`. The handler reported
 *     "Inquiry not found", blaming the record for a fault in the query, so
 *     every reply the landlady sent failed.
 *
 *   GET /admin/inquiries/:id/messages   ordered `inquiry_messages` by
 *     `created_at`, which that table does not have — it has `sent_at`. Reading
 *     a conversation returned a 500.
 *
 * Between them the entire enquiry conversation feature was dead, in a codebase
 * that otherwise passes seven verification suites.
 *
 * The column map is read from PostgREST's own OpenAPI document at runtime, not
 * written down here. A checklist that has to be maintained by hand goes stale,
 * which is the failure this audit spent its day correcting elsewhere.
 */
import dotenv from 'dotenv';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const backend = join(here, '..');
const repo = join(backend, '..');
dotenv.config({ path: join(repo, '.env') });

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) {
  console.error('check:columns — SUPABASE_URL / SUPABASE_SECRET_KEY are not set.');
  process.exit(2);
}

const res = await fetch(`${URL_}/rest/v1/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!res.ok) {
  console.error(`check:columns — could not read the schema (HTTP ${res.status}).`);
  process.exit(2);
}
const spec = await res.json();
const defs = spec.definitions || spec.components?.schemas || {};
const COLS = new Map(
  Object.entries(defs).map(([t, d]) => [t, new Set(Object.keys(d.properties || {}))])
);

/**
 * table -> (foreign key column -> table it points at), read from the same
 * document. PostgREST states it in each column's description:
 *
 *   "Note:
This is a Foreign Key to `rooms.id`.<fk table='rooms' column='id'/>"
 *
 * Needed because an embedded select is usually written `rooms:room_id (...)`
 * here, which names the key rather than the table.
 */
const FKS = new Map(
  Object.entries(defs).map(([t, d]) => {
    const m = new Map();
    for (const [col, prop] of Object.entries(d.properties || {})) {
      const fk = /<fk table='([^']+)'/.exec(prop.description || '');
      if (fk) m.set(col, fk[1]);
    }
    return [t, m];
  })
);

const FILTERS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'order', 'contains'];
const findings = [];

/** Split a PostgREST select list on top-level commas only. */
function splitTop(s) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/**
 * Resolves what an embedded select is actually reaching into.
 *
 * PostgREST accepts several spellings, and this codebase uses the one that is
 * hardest to read:
 *
 *   profiles (full_name)                  the table, plainly
 *   author:profiles (full_name)           aliased
 *   author:profiles!fk_x (full_name)      aliased, with a constraint hint
 *   profiles:sender_id (full_name)        embedded THROUGH A FOREIGN KEY COLUMN
 *
 * In that last form the target table is named BEFORE the colon and `sender_id`
 * is the key to travel along - the opposite way round from the others. It is
 * the form used almost everywhere here: `rooms:room_id`, `bills:bill_id`,
 * `profiles:tenant_profile_id`.
 *
 * Returns the table whose columns the inner list belongs to, or null.
 */
function resolveEmbed(parent, head) {
  const before = head.includes(':') ? head.slice(0, head.indexOf(':')).trim() : '';
  const after = head.split(':').pop().trim();
  const strip = (s) => (s.endsWith('!inner') ? s.slice(0, -'!inner'.length) : s.split('!')[0]);

  const a = strip(after);
  if (COLS.has(a)) return a;              // alias:table, or a bare table
  const viaFk = FKS.get(parent)?.get(a);
  if (viaFk) return viaFk;                // table:fk_column - travel the key

  const b = strip(before);
  if (COLS.has(b)) {
    /**
     * The table is named before the colon. That is a reverse embed - one row
     * reaching its many children - and the key lives on the CHILD, pointing
     * back here: `maintenance_tickets:room_id` read from `rooms`.
     *
     * So the key has to be a real column of that child table, and ideally one
     * that points back at this parent. Without this the name before the colon
     * was taken on trust, and `profiles:nonexistent_id` resolved happily to
     * `profiles` - a select PostgREST would refuse at runtime.
     */
    if (FKS.get(b)?.get(a) === parent || COLS.get(b)?.has(a)) return b;
    return null;
  }
  return null;
}

function checkSelect(table, sel, file, line) {
  for (const item of splitTop(sel)) {
    if (item.includes('(')) {
      const head = item.slice(0, item.indexOf('(')).trim();
      const inner = item.slice(item.indexOf('(') + 1, item.lastIndexOf(')'));
      const target = resolveEmbed(table, head);
      if (target) checkSelect(target, inner, file, line);
      else findings.push([file, line, table, head, 'relation']);
      continue;
    }
    let name = item.split(':').pop().trim().split('->')[0].trim();
    if (!name || name === '*' || name.startsWith('count')) continue;
    if (!COLS.get(table)?.has(name)) findings.push([file, line, table, name, 'select']);
  }
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.ts')) out.push(p);
  }
  return out;
}

for (const file of walk(join(backend, 'src'))) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(repo, file);

  for (const m of text.matchAll(/\.from\(\s*'([a-z_]+)'\s*\)/g)) {
    const table = m[1];
    const line = text.slice(0, m.index).split('\n').length;
    if (!COLS.has(table)) {
      findings.push([rel, line, table, '-', 'table']);
      continue;
    }
    const next = text.indexOf('.from(', m.index + m[0].length);
    const chunk = text.slice(m.index + m[0].length, next === -1 ? undefined : next).slice(0, 4000);

    const sm = chunk.match(/\.select\(\s*'([^']*)'/s);
    if (sm) {
      let raw = sm[1];
      for (const c of chunk.slice(sm.index + sm[0].length, sm.index + 1400).matchAll(/^\s*\+\s*'([^']*)'/gm)) {
        raw += c[1];
      }
      checkSelect(table, raw, rel, line + chunk.slice(0, sm.index).split('\n').length - 1);
    }

    for (const fm of chunk.matchAll(new RegExp(`\\.(${FILTERS.join('|')})\\(\\s*'([^']+)'`, 'g'))) {
      const col = fm[2].split('.').pop().trim().split(' ')[0];
      if (col && !col.startsWith('(') && !COLS.get(table).has(col)) {
        findings.push([rel, line + chunk.slice(0, fm.index).split('\n').length - 1, table, col, `.${fm[1]}()`]);
      }
    }

    /**
     * `.insert(` is NOT always followed by an object literal. The bulk form
     *
     *     .insert(input.attachments.map((a) => ({ ticket_id, file_url })))
     *
     * used to slip past entirely, because the matcher required `.insert(` then
     * a brace. A wrong key there is a 42703 at runtime and a LOST WRITE, which
     * is worse than the wrong-select case this suite was built for - and the
     * `.update({...})` form beside it was being checked all along, so the gap
     * was an inconsistency rather than a decision.
     *
     * Now: take the balanced argument to the call, and check the first object
     * literal inside it. `.insert(someVariable)` has no literal to read and is
     * skipped, as before.
     */
    for (const om of chunk.matchAll(/\.(insert|update|upsert)\(/g)) {
      const open = chunk.indexOf('(', om.index);
      let pdepth = 0;
      let argEnd = -1;
      for (let k = open; k < chunk.length; k++) {
        if (chunk[k] === '(') pdepth++;
        else if (chunk[k] === ')' && --pdepth === 0) {
          argEnd = k;
          break;
        }
      }
      if (argEnd === -1) continue;
      const start = chunk.indexOf('{', open);
      if (start === -1 || start > argEnd) continue;
      let depth = 0;
      let i = start;
      for (; i < chunk.length; i++) {
        if (chunk[i] === '{') depth++;
        else if (chunk[i] === '}' && --depth === 0) break;
      }
      const body = chunk.slice(start + 1, i);
      let d = 0;
      for (const km of body.matchAll(/([{}[\]])|(?:^|,)\s*([a-z_][a-z0-9_]*)\s*:/gm)) {
        if (km[1]) {
          d += '{['.includes(km[1]) ? 1 : -1;
          continue;
        }
        if (d !== 0) continue;
        if (!COLS.get(table).has(km[2])) {
          const ln = line + chunk.slice(0, om.index + km.index).split('\n').length - 1;
          findings.push([rel, ln, table, km[2], om[1]]);
        }
      }
    }
  }
}

const seen = new Set();
const uniq = findings.filter((f) => {
  const k = f.join('|');
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log(`check:columns — ${COLS.size} tables read from the live schema\n`);

/**
 * AND THE SNAPSHOT THIS PROJECT IS TOLD TO TRUST MUST STILL BE TRUE
 * -----------------------------------------------------------------
 * `database/live_schema.csv` is the file the documents are instructed to believe,
 * because `database/FULL_DATABASE_SCHEMA.sql` has been wrong about this database
 * more than once. On 2026-09-16 that instruction was vindicated in the worst way:
 * the DFD's "closure proof" enumerated every `CREATE TABLE` in the SQL file,
 * found 20, and closed - while `property_areas` sat in production, absent from
 * that file entirely.
 *
 * But the CSV is a SNAPSHOT. Nothing regenerates it, and the next migration will
 * make it stale silently - which is precisely how the SQL file became
 * untrustworthy. A designated source of truth with no mechanism behind it is
 * just a file that happens to be right today.
 *
 * So it is compared, every run, against the catalogue it claims to describe.
 * Verified 2026-09-16: 21 tables and 211 columns, matching exactly.
 *
 * When this fails, regenerate the CSV from the live catalogue. Do not edit it by
 * hand to make the check pass - that recreates the problem it exists to prevent.
 */
{
  const csvPath = join(repo, 'database', 'live_schema.csv');
  if (!existsSync(csvPath)) {
    console.log('  FAIL  database/live_schema.csv is missing - the documents point at it');
    process.exit(1);
  }

  const csv = readFileSync(csvPath, 'utf8');
  const snapshot = new Map();
  for (const m of csv.matchAll(/Columns,([a-z_]+)\.([a-z_]+)/g)) {
    if (!snapshot.has(m[1])) snapshot.set(m[1], new Set());
    snapshot.get(m[1]).add(m[2]);
  }

  const problems = [];
  for (const [table, cols] of COLS) {
    const snap = snapshot.get(table);
    if (!snap) { problems.push(`${table} is in the database and not in the snapshot`); continue; }
    for (const c of cols) if (!snap.has(c)) problems.push(`${table}.${c} is in the database and not in the snapshot`);
    for (const c of snap) if (!cols.has(c)) problems.push(`${table}.${c} is in the snapshot and not in the database`);
  }
  for (const table of snapshot.keys()) {
    if (!COLS.has(table)) problems.push(`${table} is in the snapshot and not in the database`);
  }

  const snapCols = [...snapshot.values()].reduce((n, s) => n + s.size, 0);
  if (problems.length === 0) {
    console.log(`  OK    live_schema.csv matches the catalogue - ${snapshot.size} tables, ${snapCols} columns`);
  } else {
    for (const p of problems.slice(0, 20)) console.log(`  FAIL  ${p}`);
    if (problems.length > 20) console.log(`  FAIL  ...and ${problems.length - 20} more`);
    console.log('\n  Regenerate database/live_schema.csv from the live catalogue.');
    console.log('  Do NOT hand-edit it to pass - that is how the other schema file went wrong.');
    process.exit(1);
  }
}

if (uniq.length === 0) {
  console.log('  OK    every table, column, filter and write key resolves');
  console.log('\nALL CHECKS PASSED');
} else {
  for (const [file, line, table, name, kind] of uniq.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1])) {
    console.log(`  FAIL  ${file}:${line}  ${table}.${name}  [${kind}]`);
  }
  console.log(`\n${uniq.length} reference(s) the database cannot answer.`);
  process.exit(1);
}
