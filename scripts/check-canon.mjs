/**
 * check:canon — the locked wording stays locked.
 *
 * Run with `npm run check:canon` from the repo root. Reads files only.
 *
 * WHY THIS EXISTS
 * ---------------
 * Four things about this project are settled and keep coming back anyway:
 *
 *   1. BR-035. `fifty_percent_share` is described ONLY as a system-computed
 *      figure equal to half that row's Rent Amount, kept for ledger parity with
 *      the owner's historical spreadsheet. No party, recipient, purpose or
 *      destination is ever named for it.
 *   2. There is no rate escalation of any kind. The owner sets rates by hand;
 *      only the change history is kept. The former "2% annual increase" was
 *      withdrawn in full, client-confirmed 2026-09-13.
 *   3. The property has 33 units, not 32.
 *   4. The payment gateway is committed and working — never a mock, a
 *      simulator, or "pending consultation".
 *
 * Every one of those is written down in at least three documents. None of that
 * stopped the retired framings from sitting in four LIVE specification files on
 * 2026-09-16, including two that instruct the next contributor what to write:
 *
 *   .agents/AGENTS.md:30            "2% annual price increase history"
 *   AI_DEVELOPMENT_WORKFLOW.md:343  the same sentence
 *   docs/UI_DESIGN_SPECIFICATION.md:39, :48   the same sentence again, twice
 *   docs/UI_DESIGN_SYSTEM_GUIDELINES.md:10    "32 rentable units across 3 floors"
 *
 * An instruction file is the worst place for a retired framing, because it
 * reproduces itself: the next contributor is told to write the thing the rule
 * forbids. Prose cannot enforce a wording rule. This can.
 *
 * WHAT IS DELIBERATELY NOT A FAILURE
 * ----------------------------------
 * Two kinds of file legitimately contain the banned strings.
 *
 * A RECORD. `docs/module_01_submission/` is what the group actually submitted,
 * and the errata sheet says in its own preamble: "We publish corrected artifacts
 * and this sheet together rather than silently reissuing the documents."
 * Rewriting a submitted document to match today's facts would destroy that
 * posture. Those files carry a banner instead, and so do the dated
 * `docs/superpowers/` plans. A banner in the first 30 lines excuses the file.
 *
 * A PROHIBITION. A line whose job is to ban, correct, retire or quote-as-wrong
 * one of these strings has to contain it. Excused per LINE, not per file — so a
 * careless new use inside CONTINUE_HERE.md or the defense pack is still caught.
 *
 * THE SHAPES IT READS  (this list IS the guarantee)
 *   co-owner / co-owners / co-ownership      any case
 *   50/50
 *   owner share / owner's share              also "owners share"
 *   landlady share / landlady's share
 *   2% annual | 2% increase | 2% price | annual rate escalation
 *   32 units | 32 rooms | 32-unit | 32-room | 32 rentable | 32 residential
 *   payment gateway called mock / simulator / pending consultation
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIR = new Set([
  'node_modules', '.git', 'dist', 'build', '.vite', 'coverage',
  'VIDEO PRESENTATION DOCS',
  // A snapshot of what the live database CONTAINED at a moment. Rewriting one
  // would make it lie about the thing it exists to record. Where a backup shows
  // banned wording, the fix is a migration against the live row, not an edit
  // here - see `025_revenue_share_setting_wording.sql`.
  'backups',
  // `.agent/tmp` is scratch: brainstorm mockups kept while a design was being
  // chosen. Not a document anyone reads from, and not worth a banner each.
  'tmp',
]);

/**
 * Repo-relative directories skipped by PATH, not by bare name - `SKIP_DIR`
 * matches any directory anywhere called e.g. `tmp`, which is too blunt here.
 *
 * `.claude/skills` is vendored third-party skill libraries. Their prose is
 * about other people's products and trips the BR-035 shapes on subjects that
 * have nothing to do with this property: an iPad doc says "Split View (50/50
 * or 70/30)", an App Store doc says "revenue-share" about splitting money
 * between developers. Neither names a party to `fifty_percent_share`.
 *
 * KNOWN COST, read this before adding a skill of our own here: the header of
 * this file argues an instruction file is the WORST place for a retired
 * framing, because the next contributor is told to write the thing the rule
 * forbids. Skills are instruction files. Nothing below this line is checked,
 * so a Hivelet-authored skill can reintroduce banned wording unseen. If we
 * ever write our own skill, exclude the vendored subdirectories individually
 * instead of the whole tree.
 */
const SKIP_PATH = new Set([
  path.join('.claude', 'skills'),
]);
const EXT = new Set(['.md', '.ts', '.vue', '.sql', '.mjs', '.js', '.cjs', '.json', '.html']);

const BANNED = [
  /**
   * BR-035 forbids naming a party, recipient, purpose OR DESTINATION. The first
   * four spellings here name a party. `revenue share` and `profit share` name a
   * PURPOSE, and were missed entirely - which is how
   * `'Income record generated with 50% revenue share calculated.'` sat in a toast
   * an administrator reads every time she verifies a payment, with this check
   * green over the top of it.
   */
  ['BR-035 wording', /\bco-?owner(?:ship|s)?\b|\b50\/50\b|\bowner'?s?\s+share\b|\blandlad(?:y|ies)'?s?\s+share\b|\brevenue[-\s]shar(?:e|es|ing)\b|\bprofit[-\s]shar(?:e|es|ing)\b/i],
  ['retired rate escalation', /\b2\s*%\s*(?:annual|increase|price)|annual\s+rate\s+escalation/i],
  /**
   * `(?<!other )` and `(?<!remaining )` because "the other 32 units" is correct
   * arithmetic when the total is 33 - one unit had a wrong photo, the other 32
   * shared a stock image. The session report says exactly that, and it is right.
   */
  ['wrong unit count', /(?<!other\s)(?<!remaining\s)\b32[\s-](?:units?|rooms?|rentable|residential)\b/i],
  /**
   * Deliberately narrow. An earlier version matched any 'mock' or 'simulate'
   * within 40 characters of 'payment', which fired on the local cashier
   * page's `btn-simulate-scan` and on every sentence about unauthenticated
   * payment endpoints. Neither describes the GATEWAY as a mock, which is the
   * only thing the rule forbids.
   *
   * The local cashier page genuinely does simulate a GCash scan - it is the
   * fallback used when Adyen is NOT configured, and `refuseWhenGatewayConfigured`
   * turns it off when Adyen is. Labelling it honestly is correct.
   */
  ['gateway misdescribed', /\bmock(?:ed)?[\s-]+(?:gateway|adyen|payment|checkout)\b|\b(?:gateway|adyen)\b[^.\n]{0,20}\bis\s+(?:a\s+)?(?:mock|simulat)|\b(?:simulated|demo|fake)\s+(?:payment\s+)?gateway\b|pending\s+consultation/i],
];

/**
 * Is this match a CITATION rather than an assertion?
 *
 * Every document that bans a phrase has to write the phrase down. So do the
 * errata rows, the "say this, not that" tables in the filming script, and every
 * audit finding that quotes the line it is correcting. All of them put the
 * phrase in quotation marks or backticks - and the ones asserting it as fact do
 * not:
 *
 *   | "32 units" | 33 units |                    cited   - a correction table
 *   `GET /api/public/payments/mock-gateway`      cited   - naming a route
 *   32 rentable units across 3 floors            ASSERTED - this is the bug
 *
 * That distinction does the whole job, and it does it per MATCH rather than per
 * line or per file: a careless new use inside the defense pack is still caught,
 * even though the file is full of legitimate quoted ones.
 *
 * An earlier version of this check tried a list of prohibition words instead -
 * "banned", "do not", "retired", "superseded" and twenty more. It kept needing
 * another word, it excused whole lines that merely happened to contain one, and
 * it failed on a wrapped list where "Do not say" sat on the line above. The
 * list is gone.
 */
function isCited(line, start, end) {
  const spans = [];
  // Markdown strikethrough is how this project retires a sentence in place -
  // `docs/08_OPEN_DECISIONS.md:56` still carries the withdrawn rate decision that
  // way, which is the right thing to do with a decision someone may ask about.
  for (const re of [
    /"[^"]*"/g, /'[^']*'/g, /`[^`]*`/g,
    /“[^”]*”/g, /‘[^’]*’/g,   // a document that has been through a word processor
    /\*\*[^*]*\*\*/g, /~~[\s\S]*?~~/g,
  ]) {
    for (const m of line.matchAll(re)) spans.push([m.index, m.index + m[0].length]);
  }
  return spans.some(([a, b]) => start >= a && end <= b);
}

/**
 * Registers of defects. Naming the wrong thing IS their content, in prose rather
 * than in quotation marks, so the citation rule cannot help them:
 *
 *   | E-20 | A 2% annual rate-escalation feature described as system behaviour |
 *
 * Excused by name, each with its reason, rather than by pattern - and the
 * documents people actually SPEAK from (the defense pack, the filming script,
 * the presentation index, CONTINUE_HERE) are deliberately NOT on this list. A
 * careless new use in one of those still fails.
 */
const REGISTERS = new Map([
  ['docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md', 'the errata sheet itself'],
  ['docs/claude_pipeline/outputs/PHASE1_TRACEABILITY_MATRIX.md', 'carries the errata and remediation tables'],
  ['docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md', 'the rule-mismatch register'],
  ['docs/claude_pipeline/outputs/PHASE1_ARCHITECTURE_AND_PATTERN.md', 'the architecture audit table'],
  ['docs/claude_pipeline/outputs/PHASE1_DFD_TRACEABILITY.md', 'states the errata posture'],
  ['docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md', 'defines the bans'],
  ['docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md', 'instructs a writer in the bans'],
]);

/** Files that cannot be edited, with the reason. */
const IMMUTABLE = new Map([
  [
    'database/FULL_DATABASE_SCHEMA.sql',
    'Standing instruction: this file is never edited. It does not describe the live ' +
      'database and has been wrong about it repeatedly — ask the catalogue instead.',
  ],
]);

const BANNER = /SUPERSEDED IN PART|\[!CAUTION\]|Historical (?:plan|design|record) — kept as a record/;

/**
 * A COMMENT LINE, IN ANY OF THE LANGUAGES HERE.
 *
 * The citation rule below excuses a banned phrase inside quotes, because in
 * prose that is how you forbid a phrase: you quote it and then say not to use
 * it. Every register in this repository is written that way.
 *
 * In CODE that reasoning inverts. Quotes there are string delimiters, so a
 * quoted banned phrase is not someone citing it - it is the literal text a user
 * reads on screen. The rule was therefore excusing the most live wording in the
 * repository, and two things sat behind it with this check green:
 *
 *   - the toast after verifying a payment, in `IncomeCollectionsView`
 *   - `'Revenue share percentage'`, seeded by migration `004` into a
 *     `system_settings` row that is still in the live database
 *
 * So: in `.md`, quotes may excuse. In code, only a COMMENT may - because a
 * comment explaining the ban is a citation, and an executable or data line
 * never is.
 */
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#|--)/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (SKIP_PATH.has(path.relative(root, p))) continue;
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const findings = [];
let frozenCount = 0;
let citedMatches = 0;
let registerCount = 0;
let scanned = 0;

for (const file of walk(root)) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (rel === 'scripts/check-canon.mjs') continue; // this file names them all
  scanned++;

  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');

  // `.md` is prose; everything else here is code or data. See COMMENT_LINE.
  const proseFile = path.extname(file) === '.md';

  const hits = [];
  lines.forEach((line, i) => {
    const mayCite = proseFile || COMMENT_LINE.test(line);
    for (const [kind, re] of BANNED) {
      const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      for (const m of line.matchAll(rx)) {
        if (mayCite && isCited(line, m.index, m.index + m[0].length)) { citedMatches++; continue; }
        hits.push({ line: i + 1, kind, text: line.trim().slice(0, 100) });
      }
    }
  });
  if (!hits.length) continue;

  if (IMMUTABLE.has(rel)) continue;
  if (REGISTERS.has(rel)) { registerCount++; continue; }
  if (BANNER.test(lines.slice(0, 30).join('\n'))) { frozenCount++; continue; }

  for (const h of hits) findings.push({ rel, ...h });
}

console.log('check:canon — the locked wording stays locked\n');
/**
 * A REFUSAL TO PASS HAVING READ NOTHING.
 *
 * Proved on 2026-09-17 by running this script against an empty tree: it
 * reported the locked wording intact having opened **zero files**, and exited
 * 0. This check is what holds BR-035, the 33-unit count and the gateway
 * description in place, so a silent green here is the most expensive kind.
 *
 * The floor is `> 0` rather than a number, because a hardcoded "at least 600
 * files" is itself a claim with a date on it. The count above is printed so a
 * collapse from 617 to 3 is visible to a person even when it is legal to the
 * machine.
 */
if (scanned === 0) {
  console.log('  FAIL  no files were read at all - this check examined NOTHING.');
  console.log('        Either the tree moved or the walk is broken. It is not a pass.');
  process.exit(1);
}

console.log(`               ${scanned} files read, ${frozenCount} carrying a record banner,`);
console.log(`               ${citedMatches} quoted citation(s) allowed (a phrase named in order to ban or correct it)`);
console.log(`               ${registerCount} defect register(s) excused by name`);
for (const [rel, why] of IMMUTABLE) console.log(`               ${rel} not read: ${why.split('.')[0]}.`);
console.log('');

if (findings.length === 0) {
  console.log('  OK    no live document carries a retired or banned framing');
  console.log('  OK    every record that does carries a banner saying so');
  console.log('\nALL CHECKS PASSED');
  process.exit(0);
}

for (const f of findings) {
  console.log(`  FAIL  ${f.rel}:${f.line}  [${f.kind}]`);
  console.log(`        ${f.text}`);
}
console.log(
  `\n${findings.length} banned or retired framing(s) in live documents.\n` +
    'Either reword it, or - if the file is a record of something already issued -\n' +
    'give it a banner in its first 30 lines saying so, the way\n' +
    'docs/module_01_submission/ and docs/superpowers/ do.'
);
process.exit(1);
