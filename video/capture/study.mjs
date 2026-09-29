// Pulls frames out of a reference video every `step` seconds and lays them out
// as contact sheets, so a video can be studied as stills.
//   node capture/study.mjs "<video path>" <outdir> [step]
import {chromium} from 'playwright';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [, , videoPath, outDir, stepArg] = process.argv;
const step = Number(stepArg || 0.5);
mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch({channel: 'msedge'});
const page = await browser.newPage({viewport: {width: 960, height: 540}});
// A page loaded from disk may play a video from disk; one set from a string may not.
const host = join(resolve(outDir), 'player.html');
writeFileSync(host, `<body style="margin:0;background:#000"><video id="v" src="${pathToFileURL(resolve(videoPath)).href}" style="width:960px;height:540px" muted preload="auto"></video></body>`);
await page.goto(pathToFileURL(host).href);
await page.waitForFunction(() => document.getElementById('v').readyState >= 1, null, {timeout: 20000});
const duration = await page.evaluate(() => document.getElementById('v').duration);
console.log('duration', duration);
const shots = [];
for (let t = 0; t < duration; t += step) {
  await page.evaluate((time) => new Promise((r) => { const v = document.getElementById('v'); v.onseeked = () => r(); v.currentTime = time; }), t);
  const buf = await page.locator('#v').screenshot();
  shots.push({t, b64: buf.toString('base64')});
}
const sheet = await browser.newPage({viewport: {width: 1600, height: 900}});
for (let s = 0; s * 16 < shots.length; s++) {
  const cells = shots.slice(s * 16, s * 16 + 16).map((x) => `<figure><img src="data:image/png;base64,${x.b64}"><figcaption>${x.t.toFixed(1)}s</figcaption></figure>`).join('');
  await sheet.setContent(`<style>body{margin:0;padding:10px;background:#111;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font:13px sans-serif;color:#aaa}figure{margin:0}img{width:100%;display:block}</style>${cells}`);
  await sheet.waitForTimeout(200);
  await sheet.screenshot({path: join(outDir, `sheet-${String(s + 1).padStart(2, '0')}.png`), fullPage: true});
}
console.log('sheets', Math.ceil(shots.length / 16));
await browser.close();
