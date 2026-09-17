/**
 * Verifies that the interface's colours come from the design tokens.
 *
 * Run with `npm run check:tokens` from `frontend/`, after a build.
 *
 * WHY THIS EXISTS
 * ---------------
 * `src/index.css` declared a full token palette - around fifty named roles - and
 * not one component used it. Every colour was written as a Tailwind arbitrary
 * value instead: 1,879 hex literals across 32 files, including 270 uses of
 * #0c66e4 as the primary action colour while the token named `--primary` held a
 * different colour entirely (#1e2532). The palette was documentation, not
 * configuration - the same failure as a settings table nothing reads.
 *
 * Two things are checked:
 *   1. Every utility listed in EXPECTED resolves, through the built CSS, to the
 *      exact hex it replaced. This is what makes the migration provably a
 *      refactor rather than a repaint.
 *   2. The number of raw hex literals left in templates has not grown. The
 *      remaining tail is status colours used once or twice and SVG presentation
 *      attributes, which cannot take a class.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/** utility class -> [css property, the hex it must resolve to] */
const EXPECTED = {
  'text-muted-foreground': ['color', '#71717a'],
  'text-foreground': ['color', '#1c1917'],
  'border-border': ['border-color', '#e7e5e4'],
  'bg-primary': ['background-color', '#0c66e4'],
  'text-primary': ['color', '#0c66e4'],
  'bg-background': ['background-color', '#fafaf9'],
  'border-border-strong': ['border-color', '#dfe1e6'],
  'bg-muted': ['background-color', '#f5f5f4'],
  'text-ink-navy': ['color', '#172b4d'],
  'bg-surface-sunken': ['background-color', '#f4f5f7'],
  'text-foreground-soft': ['color', '#57534e'],
  'text-accent-ink': ['color', '#8a5814'],
  'bg-neutral-dark': ['background-color', '#1e2532'],
  'text-accent': ['color', '#f59e0b'],
  'text-muted-foreground-soft': ['color', '#a1a1aa'],
};

/**
 * Ratchet. Lower this when the tail shrinks; never raise it.
 *
 * 97 -> 94 on 2026-09-15. Three dead modals were deleted that day -
 * LiveChatheadModal, TenantLoginModal and GuestEntryModal, none of them
 * reachable - and their raw literals went with them. Leaving the budget at 97
 * would have quietly licensed three new ones, which is the opposite of what a
 * ratchet is for.
 *
 * 94 -> 84 on 2026-09-16. Two more unreachable files deleted: TenantPortalView
 * (670 lines, never routed, a strict subset of the four tenant views that
 * replaced it - and still receiving bug fixes in five separate commits) and
 * ConfirmModal (superseded by the PIN confirmation pattern).
 *
 * 84 -> 83 on 2026-09-17. The public hero was rebuilt as a full-bleed editorial
 * section and its one literal went with it: `border-[#334155]`, a slate border
 * that had no token behind it, is now `border-white/10` against the same
 * `bg-neutral-dark` field.
 *
 * 83 -> 72 on 2026-09-18. Eleven at once, and only two of them were decisions:
 * the footer's `bg-[#0b132b]` became `bg-neutral-dark`, and the Facebook mark's
 * `text-[#1877F2]` went when that row became a text link. The other nine were
 * the rose and slate stops inside the SVG route overlay on the location map -
 * a red line drawn to Bicol University, deleted with the static map it sat on
 * when that section became a live embed.
 *
 * 84 -> 51 on 2026-09-18. The admin and tenant overviews and the workspace
 * sidebar moved onto the workspace tokens (docs/DESIGN_GUIDELINE.md), taking
 * 33 raw literals with them, most of them SVG chart strokes.
 *
 * 51 -> 41 later the same day, when every dialog moved onto WsModal and the
 * hand-built overlays and their icon chips went with it.
 */
const MAX_RAW_HEX = 41;

const assetDir = path.join(root, 'dist', 'assets');
if (!fs.existsSync(assetDir)) {
  console.error('dist/assets not found - run `npx vite build` first.');
  process.exit(1);
}
const cssFile = fs.readdirSync(assetDir).find((f) => f.endsWith('.css'));
const css = fs.readFileSync(path.join(assetDir, cssFile), 'utf8');

// `:root` values, so `var(--x)` can be followed to a hex.
const vars = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));

let fail = 0;

/**
 * Every `selectors { declarations }` rule in the bundle.
 *
 * Parsed rather than pattern-matched per class. Searching for one class with
 * `[^{]*` silently walks past the closing brace into the NEXT rule - which is
 * how an earlier version of this check reported `.text-muted-foreground` as
 * #a1a1aa, the value belonging to `.text-muted-foreground-soft` two rules later.
 */
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1].split(',').map((x) => x.trim()),
  body: m[2],
}));

console.log(`bundle: ${cssFile}  (${rules.length} rules)
`);

for (const [cls, [prop, want]] of Object.entries(EXPECTED)) {
  const rule = rules.find((r) => r.selectors.includes('.' + cls));
  if (!rule) {
    console.log(`  MISSING  .${cls}`);
    fail++;
    continue;
  }
  const raw = new RegExp(`(?:^|;)\s*${prop}:\s*([^;]+)`).exec(rule.body)?.[1]?.trim() ?? '?';
  const ref = /^var\(--(?:color-)?([a-z0-9-]+)\)$/.exec(raw);
  const got = ref ? vars[ref[1]] : raw;
  const ok = String(got).toLowerCase() === want.toLowerCase();
  if (!ok) fail++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} .${cls.padEnd(28)} -> ${String(got).padEnd(9)} (want ${want})`);
}

// --- the ratchet ---------------------------------------------------------
const vueFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.vue')) vueFiles.push(p);
  }
})(path.join(root, 'src'));

let rawHex = 0;
for (const f of vueFiles) {
  rawHex += (fs.readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{6}/g) ?? []).length;
}
const withinBudget = rawHex <= MAX_RAW_HEX;
if (!withinBudget) fail++;
console.log(
  `\n  ${withinBudget ? 'OK  ' : 'FAIL'} raw hex literals in templates: ${rawHex} (budget ${MAX_RAW_HEX})`
);

console.log(fail === 0 ? '\nALL CHECKS PASSED' : `\n${fail} check(s) failed`);
process.exit(fail === 0 ? 0 : 1);
