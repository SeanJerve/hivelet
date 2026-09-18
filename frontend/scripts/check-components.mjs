/**
 * Every component a template renders must be one the file can resolve.
 *
 * Run with `npm run check:components` from `frontend/`. No build needed.
 *
 * WHY THIS EXISTS
 * ---------------
 * `npm run build` exits 0 on a component that does not exist. Vue compiles an
 * unresolved PascalCase tag into a runtime `resolveComponent` call, which fails
 * only when that branch of the template is rendered - and `vue-tsc` does not
 * catch it either.
 *
 * It happened twice in one afternoon, both times while tidying imports:
 *
 *   RoomDirectoryView    `<AlertCircle>` was left in the "rates may be out of
 *                        date" banner after the icon was dropped from the
 *                        import list. That banner only renders when a fetch
 *                        fails, so nothing would have shown it until the day
 *                        the database was unreachable - which is the one day
 *                        it matters.
 *
 *   IncomeCollectionsView  four icons removed from the imports while the
 *                        template was being rewritten.
 *
 * The first is the dangerous shape: a broken error state looks fine until the
 * error happens.
 *
 * WHAT IT CHECKS
 * --------------
 * For each .vue file, every `<PascalCase>` tag in the template must be
 * accounted for by one of:
 *   - an import in the same file
 *   - a component registered globally in main.ts
 *   - a built-in (Transition, KeepAlive, RouterView, Suspense, ...)
 *
 * It does NOT check the reverse - an unused import is a lint concern, not a
 * runtime fault - and it does not resolve whether the imported path exists,
 * because the build already fails on that.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const srcDir = path.join(root, 'src');

/** Vue's own, plus the router's. These never need importing. */
const BUILT_IN = new Set([
  'Transition',
  'TransitionGroup',
  'KeepAlive',
  'Teleport',
  'Suspense',
  'Component',
  'Slot',
  'RouterView',
  'RouterLink',
]);

const vueFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.vue')) vueFiles.push(full);
  }
})(srcDir);

/** Anything registered with `app.component(...)` is available everywhere. */
const globals = new Set();
const mainFile = path.join(srcDir, 'main.ts');
if (fs.existsSync(mainFile)) {
  const main = fs.readFileSync(mainFile, 'utf8');
  for (const m of main.matchAll(/\.component\(\s*['"]([A-Za-z0-9_-]+)['"]/g)) {
    globals.add(m[1]);
  }
}

/**
 * The template block only. A PascalCase word in the script is a type or a
 * value, not a tag, and `<Foo>` inside a comment is not rendered either.
 */
function templateOf(source) {
  const open = source.indexOf('<template>');
  if (open === -1) return '';
  const close = source.lastIndexOf('</template>');
  if (close <= open) return '';
  return source.slice(open, close).replace(/<!--[\s\S]*?-->/g, '');
}

let failures = 0;
let tagsChecked = 0;

for (const file of vueFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const template = templateOf(source);
  if (!template) continue;

  // Imports, `const Foo = ...`, and anything the script defines by name.
  const script = source.slice(0, source.indexOf('<template>'));
  const declared = new Set();
  for (const m of script.matchAll(/\bimport\s+([A-Z][A-Za-z0-9_]*)\s+from/g)) declared.add(m[1]);
  for (const m of script.matchAll(/\bimport\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\s+as\s+/).pop().trim();
      if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) declared.add(name);
    }
  }
  // `const Foo = defineAsyncComponent(...)`, `const Icon = computed(...)`, etc.
  for (const m of script.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=/g)) {
    declared.add(m[1]);
  }

  const used = new Set();
  for (const m of template.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)) used.add(m[1]);

  for (const tag of used) {
    tagsChecked++;
    if (BUILT_IN.has(tag) || globals.has(tag) || declared.has(tag)) continue;
    failures++;
    console.log(`  FAIL  ${path.relative(root, file)}  <${tag}> is rendered but never imported`);
  }
}

console.log(
  `\n  ${failures === 0 ? 'OK  ' : 'FAIL'} ${tagsChecked} component tag(s) across ${vueFiles.length} file(s)`
);
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} unresolved component(s)`);
process.exit(failures === 0 ? 0 : 1);
