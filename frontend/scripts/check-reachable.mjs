/**
 * check:reachable — every source file under `frontend/src` must be reachable
 * from the application entry point by following imports.
 *
 * Run with `npm run check:reachable`. Reads files and writes nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-08-26, commit `8a34ec9` — "complete UI visual audit, speed-dial FABs,
 * smooth transitions, and header harmonization" — removed the notification
 * centre from `AppHeader.vue`: the `NotificationPopover` import, the bell, the
 * unread badge and the polling heartbeat. Nothing in that commit message
 * mentions notifications.
 *
 * From that moment `NotificationPopover.vue` was imported by no file, and
 * `notificationsStore.ts` was imported only by that orphan. Neither could be
 * rendered by any route. Meanwhile the backend went on writing notification
 * rows on five events and serving them from seven endpoints. Twenty days later
 * the table held 20 rows and every one was unread, because nothing in the
 * product was capable of reading one.
 *
 * A component no file imports cannot render. That is a fact a script can check
 * in a second, and no amount of reading a diff will reliably catch it: the
 * deletion looked like tidying, and the component it orphaned sits in a
 * different file that the diff never touches.
 *
 * WHAT IT CATCHES, AND WHAT IT DOES NOT
 * -------------------------------------
 * It catches a file becoming unreachable. It does NOT prove a reachable file is
 * rendered — a component can be imported and then guarded by a condition that
 * is never true, which is a different question and not one a static scan can
 * answer.
 *
 * Deleting an orphan is a legitimate resolution, but only after asking which
 * kind it is. Three unreachable modals deleted on 2026-09-15 were genuinely
 * superseded. `NotificationPopover` looked identical from here and was an
 * unplugged feature with a live backend behind it. **An orphan is a question,
 * not a verdict.**
 *
 * WHY IMPORT-FOLLOWING IS SUFFICIENT HERE
 * ---------------------------------------
 * `main.ts` registers no components globally (`app.component` appears nowhere),
 * so there is no implicit registration a scan would miss. `<component :is>` is
 * used in five places and every one holds a locally imported icon or ref, which
 * the import graph already covers. Vue SFCs using `<script setup>` must import
 * any component they render. If a global registration is ever added, this check
 * must learn about it or it will start reporting false orphans.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');
const ENTRY = path.join(SRC, 'main.ts');

const rel = (p) => path.relative(root, p).split(path.sep).join('/');

let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  OK    ${msg}`);

/** Every source file that could be reached, for the difference at the end. */
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|vue)$/.test(e) && !e.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/**
 * Resolve an import specifier the way Vite does for this project: the `@` alias
 * points at `src`, relative paths resolve against the importer, and a path with
 * no extension may be a `.ts`, a `.vue`, or a directory with an `index.ts`.
 */
function resolve(spec, importer) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('./') || spec.startsWith('../')) base = path.resolve(path.dirname(importer), spec);
  else return null; // a package, not our source

  const candidates = [base, `${base}.ts`, `${base}.vue`, path.join(base, 'index.ts'), path.join(base, 'index.vue')];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** `import x from 's'`, `import 's'`, `export ... from 's'`, and `import('s')`. */
const SPECS = [
  /\bimport\s+[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bexport\s+[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

if (!existsSync(ENTRY)) {
  console.log(`FAIL  no entry point at ${rel(ENTRY)}`);
  process.exit(1);
}

const reached = new Set();
const queue = [ENTRY];
const unresolved = [];

while (queue.length) {
  const file = queue.pop();
  if (reached.has(file)) continue;
  reached.add(file);

  const src = readFileSync(file, 'utf8');
  for (const re of SPECS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const spec = m[1];
      if (/\.(css|scss|png|jpe?g|svg|webp|json|ico|woff2?)$/i.test(spec)) continue;
      const target = resolve(spec, file);
      if (target) queue.push(target);
      else if (spec.startsWith('@/') || spec.startsWith('./') || spec.startsWith('../')) {
        unresolved.push({ from: rel(file), spec });
      }
    }
  }
}

const all = walk(SRC);
const orphans = all.filter((f) => !reached.has(f)).map(rel).sort();

console.log(`check:reachable — entry ${rel(ENTRY)}`);
console.log(`                 ${all.length} source files under src, ${reached.size} reachable\n`);

if (unresolved.length === 0) {
  pass('every relative import resolves to a file');
} else {
  for (const u of unresolved) fail(`${u.from} imports "${u.spec}", which resolves to no file`);
}

if (orphans.length === 0) {
  pass('no orphans — every source file is reachable from the entry point');
} else {
  for (const o of orphans) fail(`${o} is imported by no reachable file, so nothing can render or run it`);
  console.log('\n  An orphan is a question, not a verdict. Before deleting one, ask whether it is');
  console.log('  SUPERSEDED (something else does its job now) or UNPLUGGED (its job is not being');
  console.log('  done at all). NotificationPopover.vue looked exactly like the former and was');
  console.log('  the latter, with a live backend writing rows nobody could see.');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
