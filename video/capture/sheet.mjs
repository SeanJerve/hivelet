// Tiles chosen frames from out/frames/ into out/spot.png for a quick look.
//   node capture/sheet.mjs 120 470 519
import {chromium} from 'playwright';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
const dir = join(out, 'frames');
const want = process.argv.slice(2).map((w) => w.padStart(4, '0') + '-f');
const files = readdirSync(dir).filter((f) => want.some((w) => f.startsWith(w))).sort();
const cells = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}"><figcaption>${f}</figcaption></figure>`).join('');
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1800, height: 900}});
await page.setContent(`<style>body{margin:0;padding:12px;background:#111;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font:13px sans-serif;color:#aaa}figure{margin:0}img{width:100%;display:block}</style>${cells}`);
await page.screenshot({path: join(out, 'spot.png'), fullPage: true});
await browser.close();
console.log('spot.png', files.length, 'frames');
