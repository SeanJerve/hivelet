// Picture against sound: renders the frame at every cue in src/cues.mjs and
// labels it with the sound and what it should belong to, as contact sheets in
// out/cues-N.png. Look at each: the named thing must be moving or arriving in
// that frame. Key taps are left out (they are computed from the typing itself).
//
//   node capture/cuecheck.mjs            every scene
//   node capture/cuecheck.mjs tenant     one scene

import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {chromium} from 'playwright';
import {mkdirSync, readFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tl = JSON.parse(readFileSync(join(root, 'src', 'timeline.json'), 'utf8'));
const {buildCues} = await import(pathToFileURL(join(root, 'src', 'cues.mjs')).href);
const cues = buildCues(tl);
const only = process.argv[2];

let t = 0;
const start = {};
for (const s of tl.scenes) { start[s.id] = t; t += s.frames; }
const list = Object.entries(cues).flatMap(([scene, arr]) => (only && scene !== only ? [] : arr
  .filter(([, name]) => !name.startsWith('key'))
  .map(([at, name, vol, what]) => ({scene, at, frame: start[scene] + at, name, vol, what}))));

const outDir = join(root, 'out', 'cues');
mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: join(root, 'src', 'index.ts'), publicDir: join(root, 'public')});
const composition = await selectComposition({serveUrl, id: 'Hivelet'});
for (const c of list) {
  c.file = join(outDir, `${String(c.frame).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, output: c.file, frame: c.frame, scale: 0.4});
}
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1800, height: 900}});
for (let s = 0; s * 16 < list.length; s++) {
  const cells = list.slice(s * 16, s * 16 + 16).map((c) => `<figure><img src="data:image/png;base64,${readFileSync(c.file).toString('base64')}"><figcaption><b>${c.scene} ${c.at}</b> · ${c.name}<br>${c.what}</figcaption></figure>`).join('');
  await page.setContent(`<style>body{margin:0;padding:10px;background:#111;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font:13px sans-serif;color:#bbb}figure{margin:0}img{width:100%;display:block}b{color:#5fc28e}figcaption{margin-top:4px;line-height:1.3}</style>${cells}`);
  await page.waitForTimeout(200);
  await page.screenshot({path: join(root, 'out', `cues-${s + 1}.png`), fullPage: true});
}
await browser.close();
console.log(list.length, 'cues checked,', Math.ceil(list.length / 16), 'sheets');
