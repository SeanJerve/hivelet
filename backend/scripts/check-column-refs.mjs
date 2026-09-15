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
import { readdirSync, readFileSync, statSync } from 'node:fs';
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

function checkSelect(table, sel, file, line) {
  for (const item of splitTop(sel)) {
    if (item.includes('(')) {
      // embedded relation: `alias:fk (cols)` or `table (cols)`
      const head = item.slice(0, item.indexOf('(')).trim();
      const inner = item.slice(item.indexOf('(') + 1, item.lastIndexOf(')'));
      const rel = head.split(':').pop().trim();
      const base = rel.endsWith('!inner') ? rel.slice(0, -'!inner'.length) : rel.split('!')[0];
      if (COLS.has(base)) checkSelect(base, inner, file, line);
      else if (!COLS.get(table)?.has(base)) findings.push([file, line, table, base, 'relation']);
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

    for (const om of chunk.matchAll(/\.(insert|update|upsert)\(\s*\{/g)) {
      const start = chunk.indexOf('{', om.index);
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
