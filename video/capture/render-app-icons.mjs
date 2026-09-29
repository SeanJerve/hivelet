// Renders the app's PNG icons from frontend/public/favicon.svg, so the icon a
// tenant installs on a phone is the same mark, in the same green, as the tab.
//
// The PNGs were drawn once in the app's old blue and never followed the move to
// the green workspace theme (theme-color was already #17603f). Run this after
// changing favicon.svg:  node video/capture/render-app-icons.mjs

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'public');
const rounded = readFileSync(join(pub, 'favicon.svg'), 'utf8');
// Maskable icons fill the whole square; the launcher cuts its own shape.
const square = rounded.replace(/rx="128"/, 'rx="0"');

const OUT = [
  ['icon-192.png', 192, rounded],
  ['icon-512.png', 512, rounded],
  ['apple-touch-icon.png', 180, rounded],
  ['maskable-icon-192.png', 192, square],
  ['maskable-icon-512.png', 512, square],
];

const browser = await chromium.launch();
for (const [file, size, svg] of OUT) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(pub, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('wrote', file);
}
await browser.close();
