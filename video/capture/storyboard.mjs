// Renders frames from the video for review: three moments from every scene,
// laid out as contact sheets in out/storyboard-N.png (four scenes per sheet).
//
//   node capture/storyboard.mjs               three frames per scene
//   node capture/storyboard.mjs 400 812 1180  these frames only (out/frames/)

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

// Scene lengths, read from the same table the video uses (src/timeline.json).
const scenes = JSON.parse(readFileSync(join(root, 'src', 'timeline.json'), 'utf8')).scenes.map((s) => ({id: s.id, dur: s.frames}));
let t = 0;
for (const s of scenes) { s.from = t; t += s.dur; }

const asked = process.argv.slice(2).map(Number);
const frames = asked.length
  ? asked.map((f) => ({id: `f${f}`, frame: f}))
  // Long scenes get a frame every 80; short ones three.
  : scenes.flatMap((s) => (s.dur > 400 ? Array.from({length: Math.floor(s.dur / 80)}, (_, k) => 40 + k * 80) : [0.22, 0.55, 0.88].map((k) => Math.round(s.dur * k)))
    .map((o) => ({id: s.id, frame: s.from + o})));

const file = ({id, frame}) => join(outDir, `${String(frame).padStart(4, '0')}-${id}.png`);
for (const fr of frames) {
  await renderStill({composition, serveUrl, output: file(fr), frame: fr.frame, scale: 0.5});
  console.log('frame', fr.frame, fr.id);
}

if (!asked.length) {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1800, height: 1000}});
  for (let sheet = 0; sheet * 12 < frames.length; sheet++) {
    const cells = frames.slice(sheet * 12, sheet * 12 + 12).map((fr) => {
      const data = readFileSync(file(fr)).toString('base64');
      return `<figure><img src="data:image/png;base64,${data}"><figcaption>${fr.id} · ${(fr.frame / 30).toFixed(1)}s</figcaption></figure>`;
    }).join('');
    await page.setContent(`<style>body{margin:0;padding:16px;background:#101713;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font:14px sans-serif;color:#a9baaf}figure{margin:0}img{width:100%;display:block;border-radius:4px}figcaption{margin-top:4px}</style>${cells}`);
    await page.waitForTimeout(300);
    await page.screenshot({path: join(root, 'out', `storyboard-${sheet + 1}.png`), fullPage: true});
    console.log('sheet', sheet + 1);
  }
  await browser.close();
}
