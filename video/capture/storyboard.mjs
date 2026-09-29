// Renders frames from the video into out/frames/, and a contact sheet with one
// frame from the middle of each scene into out/storyboard.png, for review.
//
//   node capture/storyboard.mjs              one frame per scene
//   node capture/storyboard.mjs 400 812 1180 these frames only

import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {chromium} from 'playwright';
import {mkdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'out', 'frames');
mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: join(root, 'src', 'index.ts'), publicDir: join(root, 'public')});
const composition = await selectComposition({serveUrl, id: 'Hivelet'});

// Scene boundaries, read from the same table the video uses.
const src = readFileSync(join(root, 'src', 'timeline.ts'), 'utf8');
const scenes = [...src.matchAll(/\['(\w+)', (\d+)\]/g)].map((m) => ({id: m[1], dur: Number(m[2])}));
let t = 0;
for (const s of scenes) { s.from = t; t += s.dur; }

const asked = process.argv.slice(2).map(Number);
const frames = asked.length ? asked.map((f) => ({id: `f${f}`, frame: f})) : scenes.map((s) => ({id: s.id, frame: s.from + Math.round(s.dur * 0.62)}));

for (const {id, frame} of frames) {
  const output = join(outDir, `${String(frame).padStart(4, '0')}-${id}.png`);
  await renderStill({composition, serveUrl, output, frame, scale: 0.5});
  console.log('frame', frame, id);
}

if (!asked.length) {
  // Inlined, because a page set from a string may not load files from disk.
  const cells = frames.map(({id, frame}) => {
    const data = readFileSync(join(outDir, `${String(frame).padStart(4, '0')}-${id}.png`)).toString('base64');
    return `<figure><img src="data:image/png;base64,${data}"><figcaption>${id} · ${(frame / 30).toFixed(1)}s</figcaption></figure>`;
  }).join('');
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 2000, height: 1200}});
  await page.setContent(`<style>body{margin:0;padding:24px;background:#101713;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;font:15px sans-serif;color:#a9baaf}figure{margin:0}img{width:100%;display:block;border-radius:6px}figcaption{margin-top:6px}</style>${cells}`);
  await page.waitForTimeout(500);
  await page.screenshot({path: join(root, 'out', 'storyboard.png'), fullPage: true});
  await browser.close();
  console.log('storyboard written');
}
