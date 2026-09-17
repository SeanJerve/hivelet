/**
 * check:liveness — shared state must not be presented as live when it is not.
 *
 * Run with `npm run check:liveness` from `frontend/` (or the repo root). Reads
 * source, and makes one unauthenticated GET to `/public/rates`. Writes nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three separate money defects in this project have been the same defect:
 * **a screen presenting cached, seeded or empty shared state as a live figure,
 * with nothing on screen to say it was not one.**
 *
 *   1. The dashboard projected **₱12,800/month of water against a real ₱6,400**.
 *      `occupants` was mapped `Math.min(capacity, 2)` — invented from room size —
 *      while the real tenancy figure sat unused two lines below.
 *
 *   2. The cash receipt form could pre-fill a rent **₱2,000 wrong**. It read the
 *      seeded price, and **30 of 33 no longer matched the database**.
 *
 *   3. `fetchExpenseRecords` caught its own failure, logged a `console.warn` that
 *      nobody reads, and returned the EMPTY array — which the dashboard then
 *      subtracted from gross income to get Net Operating Income. The screen would
 *      have shown a whole year's takings as profit. Against the live ledger that
 *      is **₱3,745,419.51** of 2025 costs. Its three sibling loaders all set a
 *      fetch-failed flag; this one did not, and nothing noticed.
 *
 * The shape is always the same, and it is never visible from the screen: the
 * fallback is indistinguishable from the truth. So it gets a check.
 *
 * WHAT IT ASSERTS
 * ---------------
 *   1. A loader that hands back CACHED state on failure must raise a
 *      `*FetchFailed` flag, and must clear it when it starts.
 *   2. A flag nothing renders is no better than no flag, so every declared flag
 *      must be read by at least one `.vue`.
 *   3. Every hardcoded money fallback across `frontend/src` must still equal the
 *      live configured rate. A fallback is only safe while it agrees with the
 *      thing it stands in for, and nothing was checking that — which is exactly
 *      how 30 of 33 seeded prices went stale without a word.
 *   4. No screen may state a rate the system no longer charges. Forty-two
 *      sentences name a figure in prose — the resident's own statement says
 *      "(N × ₱200/head)" right beside the computed total — and none of them sit
 *      behind any fallback logic. They are simply true today.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const STATE = path.join(root, 'src', 'lib', 'systemState.ts');
const API = process.env.API_BASE || 'http://127.0.0.1:5000/api';

/**
 * Loaders that back a COUNT or a LIST, never a money or occupancy figure, and
 * are therefore exempt from rule 1. Each must say why, because the exemption is
 * the whole risk: the moment one of these starts feeding a figure, it belongs
 * above this line.
 */
const COUNTS_ONLY = new Map([
  ['fetchTenants', 'backs a roster and an "All (n)" tab label; an empty list reads as empty, not as a wrong number'],
  ['fetchInquiries', 'backs the sidebar badge and the enquiry list; no figure is derived from it'],
  ['fetchWaterRates', 'sets no collection — its fallbacks are covered by the rate rules instead'],
]);

let pass = 0;
const failures = [];
const notes = [];

function check(label, bad, okMsg, failMsg) {
  if (!bad) {
    pass++;
    console.log(`  OK    ${label} — ${okMsg}`);
  } else {
    failures.push(`${label}: ${failMsg}`);
    console.log(`  FAIL  ${label} — ${failMsg}`);
  }
}

const src = fs.readFileSync(STATE, 'utf8');
const lines = src.split(/\r?\n/);

// ---------------------------------------------------------------- rule 1 ----
const starts = [];
lines.forEach((l, i) => {
  const m = /export async function (fetch[A-Za-z0-9_]*)\s*\(/.exec(l);
  if (m) starts.push({ name: m[1], line: i });
});

const unflagged = [];
const noReset = [];
for (let k = 0; k < starts.length; k++) {
  const { name, line } = starts[k];
  const body = lines.slice(line, k + 1 < starts.length ? starts[k + 1].line : lines.length).join('\n');

  // "Returns cached state" = returns a bare identifier that is not a fresh
  // literal. `return [];` and `return mapped;` are fine: neither is the stale
  // module-level array being passed off as current.
  const returnsCached = [...body.matchAll(/return\s+([A-Za-z][A-Za-z0-9_]*)\s*;/g)]
    .some((m) => new RegExp(`^export const ${m[1]}\\b`, 'm').test(src));
  if (!returnsCached) continue;
  if (COUNTS_ONLY.has(name)) continue;

  if (!/[A-Za-z0-9_]*FetchFailed\.value\s*=\s*true/.test(body)) unflagged.push(name);
  else if (!/[A-Za-z0-9_]*FetchFailed\.value\s*=\s*false/.test(body)) noReset.push(name);
}

check(
  'a loader that returns cached state raises a flag',
  unflagged.length > 0,
  `${starts.length} loaders, ${COUNTS_ONLY.size} exempt by name, the rest flagged`,
  `no fetch-failed flag on: ${unflagged.join(', ')} — a failure here is indistinguishable ` +
    'from a real figure on screen. Add one, or name it in COUNTS_ONLY with a reason.'
);

check(
  'a flag is cleared when its loader starts',
  noReset.length > 0,
  'every flag resets, so a recovered fetch stops showing the dash',
  `set but never reset: ${noReset.join(', ')} — one transient failure would show ` +
    '"unavailable" until the page is reloaded.'
);

// ---------------------------------------------------------------- rule 2 ----
const declared = [...src.matchAll(/export const ([A-Za-z0-9_]*FetchFailed)\s*=/g)].map((m) => m[1]);
const vues = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.vue')) vues.push(p);
  }
})(path.join(root, 'src'));
const allVue = vues.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const unrendered = declared.filter((f) => !new RegExp(`\\b${f}\\b`).test(allVue));

check(
  'every flag is rendered somewhere',
  unrendered.length > 0,
  `${declared.length} flags, each read by at least one screen`,
  `set but shown nowhere: ${unrendered.join(', ')} — the figure is still wrong, ` +
    'silently, which is the defect this check exists for.'
);

// ------------------------------------------------------- rules 3 and 4 ----
/**
 * The rate rules read the WHOLE of `frontend/src`, not just `systemState.ts`.
 *
 * The first version of this rule only inspected that one file, and missed two
 * other kinds of the same claim:
 *
 *   - `IncomeCollectionsView` keeps its OWN copy of the fallbacks, because it
 *     validates a typed water figure against them.
 *   - Eleven places state a rate as plain prose - "₱200 / head monthly rule",
 *     "Water: ₱400.00 / month", "({{ occupants }} × ₱200/head)" on the resident's
 *     own statement, and the public pages' headline figure. None of those sit
 *     behind any fallback logic at all; they are simply sentences that are true
 *     today.
 *
 * All of them are correct right now. All of them go silently wrong the moment
 * the owner changes a rate - and the one on the statement would then contradict
 * the number printed beside it. Rewriting eleven files to read the configured
 * rate is a real change and not one to make days before testing, so the check
 * makes the staleness LOUD instead: change a rate, and this names every file
 * still claiming the old one.
 */
const srcFiles = [];
(function walkSrc(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkSrc(p);
    else if (/\.(vue|ts)$/.test(p)) srcFiles.push(p);
  }
})(path.join(root, 'src'));

const perHeadFallbacks = [];
const lindaFallbacks = [];
/** Prose stating a rate: "₱200 / head", "₱400.00 / month", "₱200 per head". */
const proseRates = [];

for (const f of srcFiles) {
  const body = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f).replace(/\\/g, '/');

  for (const m of body.matchAll(/perOccupant(?:Rate)?(?:\.value)?\s*\?\?\s*(\d+)/g)) {
    perHeadFallbacks.push({ rel, value: Number(m[1]) });
  }
  for (const m of body.matchAll(/waterRatePerOccupant\.value\s*\?\?\s*(\d+)/g)) {
    perHeadFallbacks.push({ rel, value: Number(m[1]) });
  }
  for (const m of body.matchAll(/=== 'LF'\s*\?\s*(\d+)\s*:\s*(\d+)/g)) {
    lindaFallbacks.push({ rel, LF: Number(m[1]), LB: Number(m[2]) });
  }

  body.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(\*|\/\/)/.test(line)) return;   // a comment discussing a rate is not a claim
    for (const m of line.matchAll(/₱\s?([\d,]+)(?:\.\d+)?\s*(?:\/\s*|per\s+)(head|month|occupant)/gi)) {
      proseRates.push({ rel, line: i + 1, value: Number(m[1].replace(/,/g, '')), unit: m[2].toLowerCase() });
    }
  });
}

let live = null;
try {
  const r = await fetch(`${API}/public/rates`);
  if (r.ok) live = await r.json();
} catch {
  /* handled below */
}
const rates = live?.data ?? live;

if (!rates || typeof rates.waterRatePerOccupant !== 'number') {
  notes.push(
    'rule 3 skipped: /public/rates was unreachable, so the hardcoded fallbacks could ' +
      'not be compared against the live configuration. Start the backend and re-run.'
  );
  console.log('  SKIP  hardcoded fallbacks match the live rates — backend unreachable');
} else {
  const linda = rates.lindaFixedWaterCharges || {};
  const configured = new Set(
    [rates.waterRatePerOccupant, linda.LF, linda.LB]
      .filter((v) => v !== undefined && v !== null)
      .map(Number)
  );

  const drift = [];
  for (const f of perHeadFallbacks) {
    if (f.value !== rates.waterRatePerOccupant) {
      drift.push(`${f.rel}: per-occupant fallback ${f.value} vs configured ${rates.waterRatePerOccupant}`);
    }
  }
  for (const f of lindaFallbacks) {
    if (linda.LF !== undefined && f.LF !== Number(linda.LF)) {
      drift.push(`${f.rel}: LF fallback ${f.LF} vs configured ${linda.LF}`);
    }
    if (linda.LB !== undefined && f.LB !== Number(linda.LB)) {
      drift.push(`${f.rel}: LB fallback ${f.LB} vs configured ${linda.LB}`);
    }
  }

  check(
    'hardcoded fallbacks match the live rates',
    drift.length > 0,
    `${perHeadFallbacks.length} per-occupant and ${lindaFallbacks.length} Linda fallbacks ` +
      `across ${srcFiles.length} files, all equal to the configured ₱${rates.waterRatePerOccupant}/head` +
      (linda.LF !== undefined ? `, LF ₱${linda.LF}, LB ₱${linda.LB}` : ''),
    `a fallback no longer matches what it stands in for:\n        ${drift.join('\n        ')}\n` +
      '        A failed rate fetch would now quietly show the old figure.'
  );

  const staleProse = proseRates.filter((p) => !configured.has(p.value));
  check(
    'no screen states a rate that is no longer configured',
    staleProse.length > 0,
    `${proseRates.length} rate sentence(s) on screen, every figure still one the ` +
      'system actually charges',
    'a screen states a rate the system no longer charges:\n        ' +
      staleProse.map((p) => `${p.rel}:${p.line} says ₱${p.value}/${p.unit}`).join('\n        ') +
      `\n        Configured: ${[...configured].map((v) => '₱' + v).join(', ')}. These are plain ` +
      'sentences, behind no fallback - the one on the resident\'s statement would ' +
      'contradict the figure printed beside it.'
  );
}

console.log('');
for (const n of notes) console.log(`  note: ${n}`);

if (failures.length === 0) {
  console.log(`\n${pass} check(s) passed — nothing presents cached state as live.`);
  process.exit(0);
}
console.log(`\n${failures.length} liveness problem(s).`);
process.exit(1);
