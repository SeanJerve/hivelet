/**
 * measure:citations — how many of the traceability matrix's route citations still
 * point at the route they name.
 *
 * NOT one of the nine verification suites, and deliberately not wired as a gate.
 * A gate that is red on the day it ships teaches people to ignore red. This is a
 * measurement you run when you want the number, and the number as of
 * 2026-09-15 is: 6 of 83 correct.
 *
 * WHY THE NUMBER IS THAT BAD, AND WHY IT IS NOT ANYONE'S CARELESSNESS
 *
 * A citation like (`admin.ts:730`) is a promise about a line number in a file
 * that grows. `admin.ts` is now past 2,900 lines; a route cited at 730 sits at
 * 1065. Every insertion above a citation invalidates it silently, and nothing
 * in a markdown file can notice. The document was accurate when written.
 *
 * THE DURABLE FIX IS NOT RENUMBERING
 *
 * Renumbering 83 citations buys accuracy until the next commit. The file name
 * and the route path are stable identifiers and should be what a citation
 * carries; a line number is a convenience that cannot survive a living
 * codebase. Recorded rather than done, because rewriting the table is a large
 * mechanical edit and the call belongs to whoever owns the document.
 *
 * Run: node scripts/measure-doc-citations.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..', '..');
const BACK = join(repo, 'backend', 'src');
const DOC = join(
  repo, 'docs', 'claude_pipeline', 'outputs', 'PHASE1_TRACEABILITY_MATRIX.md'
);

const byName = new Map();
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (e.endsWith('.ts')) {
      if (!byName.has(e)) byName.set(e, []);
      byName.get(e).push(p);
    }
  }
})(BACK);

const text = readFileSync(DOC, 'utf8');
const PAT = /`(GET|POST|PATCH|PUT|DELETE)\s+(\/api\/[^`]+)`\s*\(`([a-zA-Z]+\.ts):(\d+)`\)/g;

let ok = 0;
const misses = [];

for (const m of text.matchAll(PAT)) {
  const [, method, rawRoute, fname, lineStr] = m;
  const line = Number(lineStr);
  const paths = byName.get(fname);
  if (!paths) continue;

  // routes/<file> wins: backend/src/types/auth.ts would otherwise shadow
  // backend/src/routes/auth.ts and report every auth citation as a miss.
  const chosen = paths.find((p) => p.includes(`${sep}routes${sep}`)) ?? paths[0];
  const src = readFileSync(chosen, 'utf8').split('\n');

  // The router registers the path without the /api prefix.
  const needle = rawRoute.trim().replace('/api', '').replace(/\?.*$/, '');

  // +/- 6 lines: a router.post() and its path literal sit a line or two apart,
  // and a middleware list can push them further.
  const window = src.slice(Math.max(0, line - 7), line + 6).join('\n');
  if (window.includes(needle)) {
    ok += 1;
  } else {
    const actual = src.reduce((acc, l, i) => (l.includes(needle) ? [...acc, i + 1] : acc), []);
    misses.push({ method, route: rawRoute.trim(), fname, line, actual: actual.slice(0, 3) });
  }
}

const total = ok + misses.length;
console.log(`measure:citations — ${total} route citations in the traceability matrix\n`);
console.log(`  resolve to the route they name : ${ok}`);
console.log(`  point somewhere else           : ${misses.length}\n`);
for (const x of misses) {
  console.log(
    `  ${x.method.padEnd(6)} ${x.route.padEnd(46)} cited ${x.fname}:${String(x.line).padEnd(5)}` +
    ` actually ${x.actual.length ? x.actual.join(', ') : 'not found'}`
  );
}
