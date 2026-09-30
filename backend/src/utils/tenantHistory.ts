/**
 * Who lived in which unit, month by month, read from the receipts.
 *
 * WHY THE RECEIPTS AND NOT THE ACCOUNTS
 * -------------------------------------
 * The tenant accounts cannot answer "who lived in 2f in March 2025": 32 of the
 * 35 tenancies carry the import's placeholder move-in date (1 July 2026, see
 * IMPORT_PLACEHOLDER_START_DATE), and tenants who left before the system was
 * built have no account at all. Her ledger does know: one receipt per unit per
 * month from January 2024, each with the name she wrote on it. That is the
 * history, and this module reads it (Sean's request, 2026-09-30).
 *
 * WHY NAMES ARE MATCHED, AND HOW CAREFULLY
 * ----------------------------------------
 * A name is written by hand on every receipt, so one person appears in several
 * spellings: "Sancueza France" then "France Sacueza" in the same unit, extra
 * spaces inside a name, "M.Juselle", a surname in lower case. Her records are
 * never changed for this (Sean, 2026-09-26: what she wrote is the record);
 * the matching is done when the history is shown, and the screen lists every
 * other spelling it folded in, so no merge is hidden.
 *
 * Two names are one person when, after case, spaces, full stops and initials
 * are set aside and "Ma" is read as "Maria":
 *   - they have the same words, in any order; or
 *   - every word of the shorter name matches its own word of the longer one,
 *     the longer has at most one extra word (a middle name), and each match
 *     is exact or a typo: one letter off for words of 6 to 8 letters, two for
 *     longer. Words under 6 letters must match exactly, because short first
 *     names differ by one letter all the time: Jade and Jana Marmol are two
 *     people, and so would be Mark and Mary.
 * A single-word name ("Krishnaveni") matches only itself.
 *
 * Only names in the SAME unit are folded together. Across units the same
 * words in any order are reported as "also in", which is how a tenant who
 * moved from 2c to 2f shows up, and nothing fuzzier: two units' look-alikes
 * are more likely to be two people.
 *
 * Plain TypeScript with no imports, so it can be run and tested on its own.
 *
 * TWO IDENTICAL COPIES: frontend/src/lib/tenantHistory.ts (the screen) and
 * backend/src/utils/tenantHistory.ts (the Excel download). The backend is
 * deployed on its own and cannot import from the frontend, so the file is
 * copied whole; `check:reports` fails if the two differ by one byte. Change
 * one, copy it over the other.
 */

export interface HistoryReceipt {
  unit: string;
  year?: number;
  month?: number;
  contact: string;
  datePaid: string;
  rentFor: string;
  invoice: string;
}

export interface CurrentTenant {
  name: string;
  unitCode: string;
  status: string;
}

export interface HistoryPerson {
  unit: string;
  /** The name to show: the tenant account's, when this is a current tenant, else her most used spelling. */
  name: string;
  /** Every other spelling folded into this person, as written. */
  otherSpellings: string[];
  livesHereNow: boolean;
  /** Other units the same name paid for, at any time. */
  alsoIn: string[];
  /** Within the chosen period. */
  receipts: number;
  months: number[];
  first: { year: number; month: number };
  last: { year: number; month: number };
  /** Filled for a single month: what each receipt of that month covered, when it was paid, its number. */
  covers: string[];
  paidOn: string[];
  receiptNumbers: string[];
}

/** Spaces tidied, nothing else changed: how a spelling is shown. */
export function tidyName(raw: string): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

const GENERIC = new Set(['tenant', 'walk-in resident', 'active resident', 'resident', 'n/a', 'na', '-']);

/** The words a name is compared by. */
export function nameWords(raw: string): string[] {
  return tidyName(raw)
    .toLowerCase()
    .replace(/[.,;:()"]/g, ' ')
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w === 'ma' ? 'maria' : w))
    .filter((w, _i, all) => w.length > 1 || all.length === 1);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.max(a.length, b.length);
  const allowed = n >= 9 ? 2 : n >= 6 ? 1 : 0;
  return allowed > 0 && editDistance(a, b) <= allowed;
}

/** Same words in any order, ignoring case, spaces, full stops and initials. */
export function sameWords(a: string, b: string): boolean {
  const wa = nameWords(a);
  const wb = nameWords(b);
  return wa.length > 0 && wa.length === wb.length && [...wa].sort().join(' ') === [...wb].sort().join(' ');
}

/** The rule in the header: one person written two ways. */
export function samePerson(a: string, b: string): boolean {
  const wa = nameWords(a);
  const wb = nameWords(b);
  if (!wa.length || !wb.length) return false;
  if (sameWords(a, b)) return true;
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  if (short.length < 2 || long.length - short.length > 1) return false;
  const used = new Set<number>();
  for (const w of short) {
    const k = long.findIndex((v, i) => !used.has(i) && wordsMatch(w, v));
    if (k < 0) return false;
    used.add(k);
  }
  return true;
}

/** "A, B" on one receipt is two people; a blank or generic name is nobody. */
export function payersOn(contact: string): string[] {
  return String(contact ?? '')
    .split(/,|&|\//)
    .map(tidyName)
    .filter((n) => n && !GENERIC.has(n.toLowerCase()) && !/^resident \d+$/i.test(n));
}

interface Collected {
  unit: string;
  spellings: Map<string, number>;
  latestSpelling: string;
  latestKey: number;
  hits: { year: number; month: number; r: HistoryReceipt }[];
}

const ymKey = (year: number, month: number) => year * 100 + month;

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jan to May", or "Jan, Mar to Apr" when there are gaps: the screen and the workbook both print this. */
export function monthsLabel(months: number[]): string {
  const ms = [...new Set(months)].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const m of ms) {
    const last = runs[runs.length - 1];
    if (last && m === last[1] + 1) last[1] = m;
    else runs.push([m, m]);
  }
  return runs
    .map(([a, b]) => (a === b ? SHORT_MONTHS[a - 1] : `${SHORT_MONTHS[a - 1]} to ${SHORT_MONTHS[b - 1]}`))
    .join(', ');
}

/**
 * Everyone who paid for a unit in `year` (and `month`, when given), folded as
 * described above, ordered by unit as `unitOrder` lists them (then by name of
 * the unit), then by when they first paid.
 */
export function buildTenantHistory(
  receipts: HistoryReceipt[],
  current: CurrentTenant[],
  period: { year: number; month: number | null },
  unitOrder: string[] = []
): HistoryPerson[] {
  // 1. Fold every receipt, all years, per unit: the folding must not depend
  //    on the period chosen, or a person's name would change with the filter.
  const byUnit = new Map<string, Collected[]>();
  for (const r of receipts) {
    const year = Number(r.year);
    const month = Number(r.month);
    if (!r.unit || !year || !month) continue;
    const unit = r.unit.toLowerCase();
    const people = byUnit.get(unit) ?? [];
    byUnit.set(unit, people);
    for (const payer of payersOn(r.contact)) {
      let p = people.find((c) => [...c.spellings.keys()].some((s) => samePerson(s, payer)));
      if (!p) {
        p = { unit: r.unit, spellings: new Map(), latestSpelling: payer, latestKey: 0, hits: [] };
        people.push(p);
      }
      p.spellings.set(payer, (p.spellings.get(payer) ?? 0) + 1);
      if (ymKey(year, month) >= p.latestKey) {
        p.latestKey = ymKey(year, month);
        p.latestSpelling = payer;
      }
      p.hits.push({ year, month, r });
    }
  }

  const livingNow = current.filter((t) => t.status === 'active');

  // 2. A name per person, and the period's figures.
  const out: HistoryPerson[] = [];
  for (const [unit, people] of byUnit) {
    for (const p of people) {
      const inPeriod = p.hits.filter((h) => h.year === period.year && (period.month === null || h.month === period.month));
      if (!inPeriod.length) continue;

      const spellings = [...p.spellings.keys()];
      const account = livingNow.find(
        (t) => t.unitCode.toLowerCase() === unit && spellings.some((s) => samePerson(s, t.name))
      );
      const mostUsed = [...p.spellings.entries()].sort(
        (a, b) => b[1] - a[1] || (a[0] === p.latestSpelling ? -1 : b[0] === p.latestSpelling ? 1 : 0)
      )[0][0];
      const name = account ? tidyName(account.name) : mostUsed;

      const alsoIn = [...byUnit.entries()]
        .filter(([u]) => u !== unit)
        .filter(([, others]) => others.some((o) => [...o.spellings.keys()].some((s) => sameWords(s, name) || spellings.some((mine) => sameWords(s, mine)))))
        .map(([, others]) => others[0].unit);

      const sorted = [...inPeriod].sort((a, b) => ymKey(a.year, a.month) - ymKey(b.year, b.month));
      out.push({
        unit: p.unit,
        name,
        otherSpellings: spellings.filter((s) => s !== name && tidyName(s).toLowerCase() !== name.toLowerCase()),
        livesHereNow: Boolean(account),
        alsoIn: [...new Set(alsoIn)],
        receipts: inPeriod.length,
        months: [...new Set(sorted.map((h) => h.month))],
        first: { year: sorted[0].year, month: sorted[0].month },
        last: { year: sorted[sorted.length - 1].year, month: sorted[sorted.length - 1].month },
        covers: period.month === null ? [] : sorted.map((h) => h.r.rentFor),
        paidOn: period.month === null ? [] : sorted.map((h) => h.r.datePaid),
        receiptNumbers: period.month === null ? [] : sorted.map((h) => h.r.invoice),
      });
    }
  }

  const order = new Map(unitOrder.map((u, i) => [u.toLowerCase(), i]));
  return out.sort((a, b) => {
    const ua = order.get(a.unit.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const ub = order.get(b.unit.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (ua !== ub) return ua - ub;
    const byCode = a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: 'base' });
    if (byCode) return byCode;
    return ymKey(a.first.year, a.first.month) - ymKey(b.first.year, b.first.month);
  });
}
