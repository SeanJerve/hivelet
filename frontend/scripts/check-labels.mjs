/**
 * Every form control a person can type into must have a name.
 *
 * Run with `npm run check:labels` from `frontend/`. No build needed.
 *
 * WHY THIS EXISTS
 * ---------------
 * 27 of the application's 115 form controls had no accessible name - nearly a
 * quarter of every field in the product. A screen reader announces those as
 * "edit text, blank", and clicking the word beside them focuses nothing.
 *
 * They were not written carelessly. Every one had a label directly above it:
 *
 *     <div>
 *       <label class="mb-1.5 block text-xs text-ink-faint">Unit</label>
 *       <select v-model="editUnit">...</select>
 *     </div>
 *
 * It looks right on screen and is right in every way except the one that
 * matters - nothing connects the two. That is exactly the shape a check should
 * catch, because reading the template will not.
 *
 * Two of the screens it found were money forms: the collection editor and the
 * expense editor.
 *
 * WHAT COUNTS AS A NAME
 * ---------------------
 *   - a wrapping `<label>` (implicit association)
 *   - `<label for="x">` with a matching `id="x"` in the same template
 *   - `aria-label` or `aria-labelledby`
 *
 * A `placeholder` deliberately does NOT count. It disappears the moment
 * somebody types, which is the point at which they most need to know what the
 * field was - and assistive technology does not treat it as a name either.
 *
 * WHAT IT SKIPS
 * -------------
 * `type="hidden|submit|button|reset"` - nothing is typed into those.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const srcDir = path.join(root, 'src');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.vue')) files.push(full);
  }
})(srcDir);

const SKIP_TYPE = /type\s*=\s*"(hidden|submit|button|reset)"/;

let checked = 0;
const unnamed = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const open = source.indexOf('<template>');
  if (open === -1) continue;

  // Comments are not markup. A control quoted inside one is not rendered.
  //
  // They are BLANKED RATHER THAN REMOVED, and that is the whole reason this is
  // two lines instead of one. `m.index` below is an offset into this string,
  // and the line number is counted by slicing `source` with it. Deleting a
  // comment shortens the string, so every offset after it points somewhere
  // earlier in the file than the control really is, and the FAIL line sends
  // the reader to the wrong place.
  //
  // Measured rather than assumed: an unnamed input placed at the end of
  // ExpensesLedgerView's template - true line 1161, with 1,478 characters of
  // comment above it inside the template - was reported at line 1123. The
  // drift is exactly the comment text above the control, so it is worst in the
  // files that explain themselves best.
  //
  // Replacing each comment with spaces, and keeping its newlines, holds both
  // the length and the line count steady.
  const template = source
    .slice(open)
    .replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));

  for (const m of template.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const [, tag, attrs] = m;
    if (SKIP_TYPE.test(attrs)) continue;
    checked += 1;

    if (/aria-label|aria-labelledby/.test(attrs)) continue;

    const id = /\bid\s*=\s*"([^"]+)"/.exec(attrs);
    if (id && new RegExp(`for="${id[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(template)) {
      continue;
    }

    // A wrapping label: the nearest <label before this control has not closed.
    const before = template.slice(0, m.index);
    if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) continue;

    const line = source.slice(0, open + m.index).split('\n').length;
    unnamed.push({
      file: path.relative(root, file),
      line,
      tag,
      hint: (/v-model[^\s]*="([^"]+)"/.exec(attrs)?.[1] ?? attrs.trim()).slice(0, 34),
    });
  }
}

for (const u of unnamed) {
  console.log(`  FAIL  ${u.file}:${u.line}  <${u.tag}> ${u.hint} has no label, aria-label or id/for`);
}

console.log(
  `\n  ${unnamed.length === 0 ? 'OK  ' : 'FAIL'} ${checked} form control(s) across ${files.length} file(s)`
);
console.log(
  unnamed.length === 0
    ? '\nALL CHECKS PASSED'
    : `\n${unnamed.length} control(s) a screen reader would announce unnamed`
);
process.exit(unnamed.length === 0 ? 0 : 1);
