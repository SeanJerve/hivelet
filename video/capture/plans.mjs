// The floor plans as the app draws them since the redesign: with no white sheet behind them.
//
// The app multiplies each plan into the page (`plan-on-page` in frontend/src/glass.css,
// mix-blend-mode: multiply). The film's layers are grouped under masks and cameras, where a
// blend mode cannot reach the background, so this writes each plan once as ink on nothing:
// every pixel black, as opaque as the plan was dark there. Drawn over any page that is exactly
// what multiplying the plan into it gives.
//
// Reads frontend/public/floorplans/<name>.webp, writes public/floorplans/<name>.png.
//
//   node capture/plans.mjs
//
// A machine without Playwright's own browser names one: PLAYWRIGHT_CHROMIUM_EXECUTABLE.

import {chromium} from 'playwright';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', '..', 'frontend', 'public', 'floorplans');
const to = join(here, '..', 'public', 'floorplans');
// The plans the film shows: B3B's floor on the public page, and 1A's on the tenant's Overview.
const PLANS = ['back3rdfloor', 'ground'];

mkdirSync(to, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined});
const page = await browser.newPage();
for (const name of PLANS) {
  const src = `data:image/webp;base64,${readFileSync(join(from, `${name}.webp`)).toString('base64')}`;
  const png = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const lum = (0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2]) * (d.data[i + 3] / 255) + 255 * (1 - d.data[i + 3] / 255);
      d.data[i] = d.data[i + 1] = d.data[i + 2] = 0;
      d.data[i + 3] = Math.round(255 - lum);
    }
    g.putImageData(d, 0, 0);
    return c.toDataURL('image/png').split(',')[1];
  }, src);
  writeFileSync(join(to, `${name}.png`), Buffer.from(png, 'base64'));
  console.log('wrote', `${name}.png`);
}
await browser.close();
