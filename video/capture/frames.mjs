// Any frames of one scene, side by side, for checking motion by eye: renders
// each frame (local to the scene) and tiles them into out/frames.png with the
// frame number under each.
//
//   node capture/frames.mjs act1 900 1010 1040 1080
//   node capture/frames.mjs guests 0-120/20      every 20th frame from 0 to 120
//   node capture/frames.mjs act1 900 --scale=0.6 --cols=2

import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {chromium} from 'playwright';
import {mkdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tl = JSON.parse(readFileSync(join(root, 'src', 'timeline.json'), 'utf8'));
const args = process.argv.slice(2);
const opt = (k, d) => Number((args.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1]);
const [scene, ...specs] = args.filter((a) => !a.startsWith('--'));
const scale = opt('scale', 0.4), cols = opt('cols', 4);

let t = 0;
const start = {};
for (const s of tl.scenes) { start[s.id] = t; t += s.frames; }
if (!(scene in start)) throw new Error(`no scene ${scene}`);
const frames = specs.flatMap((s) => {
  const m = s.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (!m) return [Number(s)];
  const out = [];
  for (let f = Number(m[1]); f <= Number(m[2]); f += Number(m[3])) out.push(f);
  return out;
});

const outDir = join(root, 'out', 'frames');
mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: join(root, 'src', 'index.ts'), publicDir: join(root, 'public')});
const composition = await selectComposition({serveUrl, id: 'Hivelet'});
const shots = [];
for (const f of frames) {
  const file = join(outDir, `${scene}-${String(f).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, output: file, frame: start[scene] + f, scale});
  shots.push({f, file});
}
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1920, height: 900}});
const cells = shots.map((s) => `<figure><img src="data:image/png;base64,${readFileSync(s.file).toString('base64')}"><figcaption>${scene} ${s.f}</figcaption></figure>`).join('');
await page.setContent(`<style>body{margin:0;padding:10px;background:#111;display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;font:14px sans-serif;color:#5fc28e}figure{margin:0}img{width:100%;display:block}figcaption{margin-top:4px}</style>${cells}`);
await page.waitForTimeout(200);
await page.screenshot({path: join(root, 'out', 'frames.png'), fullPage: true});
await browser.close();
console.log(shots.length, 'frames ->', join(root, 'out', 'frames.png'));
