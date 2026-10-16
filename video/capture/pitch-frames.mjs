// Stills from the pitch at the given times (seconds), side by side in out/pitch-frames.png.
//
//   node capture/pitch-frames.mjs 0.9 2.2 3.0 4.6       times in seconds
//   node capture/pitch-frames.mjs 18-21/0.5 --cols=4     every 0.5 s from 18 to 21
//   node capture/pitch-frames.mjs 2 9 21 --comp=PaperPitch  the paper pitch instead (out/paperpitch-frames.png)

import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {chromium} from 'playwright';
import {mkdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => Number((args.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1]);
const cols = opt('cols', 3), scale = opt('scale', 0.4);
const times = args.filter((a) => !a.startsWith('--')).flatMap((s) => {
  const m = s.match(/^([\d.]+)-([\d.]+)\/([\d.]+)$/);
  if (!m) return [Number(s)];
  const out = [];
  for (let t = Number(m[1]); t <= Number(m[2]) + 1e-9; t += Number(m[3])) out.push(Math.round(t * 100) / 100);
  return out;
});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const serveUrl = await bundle({entryPoint: join(root, 'src', 'index.ts'), publicDir: join(root, 'public')});
const id = (args.find((a) => a.startsWith('--comp=')) ?? '--comp=Pitch').split('=')[1];
const composition = await selectComposition({serveUrl, id, browserExecutable});
const outDir = join(root, 'out', id.toLowerCase());
mkdirSync(outDir, {recursive: true});
const shots = [];
for (const t of times) {
  const file = join(outDir, `t${t.toFixed(2)}.png`);
  await renderStill({composition, serveUrl, output: file, frame: Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps)), scale, browserExecutable});
  shots.push({t, file});
}
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined});
const page = await browser.newPage({viewport: {width: 1920, height: 900}});
const cells = shots.map((s) => `<figure><img src="data:image/png;base64,${readFileSync(s.file).toString('base64')}"><figcaption>${s.t.toFixed(2)} s</figcaption></figure>`).join('');
await page.setContent(`<style>body{margin:0;padding:10px;background:#111;display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;font:14px sans-serif;color:#5fc28e}figure{margin:0}img{width:100%;display:block}</style>${cells}`);
await page.waitForTimeout(200);
const sheet = id === 'Pitch' ? 'pitch-frames.png' : `${id.toLowerCase()}-frames.png`;
await page.screenshot({path: join(root, 'out', sheet), fullPage: true});
await browser.close();
console.log(shots.length, `stills -> out/${sheet}`);
