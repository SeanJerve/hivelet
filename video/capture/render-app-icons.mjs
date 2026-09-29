// Renders every picture of the Hivelet mark the site ships, from the one source,
// frontend/public/favicon.svg: a green hexagon, the same cell the hive in the
// film is built from, with a minimal H under a roof.
//
//   icon-192.png, icon-512.png     the manifest's `any` icons: the hexagon as it
//                                  is, on transparent, like the tab icon
//   apple-touch-icon.png           iOS fills transparency with black and rounds
//                                  the square itself, so the hexagon sits on the
//                                  site's own canvas colour
//   maskable-icon-192/512.png      Android cuts its own shape out of a full-bleed
//                                  square and keeps only a centred circle of 40%
//                                  radius, so the hexagon is drawn smaller (R 196
//                                  of 512, inside that circle) on a darker green
//   og-image.jpg                   the picture a shared link shows: the mark,
//                                  the property's name and the building photo.
//                                  JPEG so the service worker's `**/*.png`
//                                  precache never downloads it for every visitor
//
// Run after changing favicon.svg:  node video/capture/render-app-icons.mjs

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'public');
const mark = readFileSync(join(pub, 'favicon.svg'), 'utf8');
const inner = mark.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const svg = (body, size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${body}</svg>`;

// The hexagon at R 196, and the glyph scaled with it, for the maskable icons.
const SMALL_HEX = 'M224.82 78 Q256 60 287.18 78 L394.56 140 Q425.74 158 425.74 194 L425.74 318 Q425.74 354 394.56 372 L287.18 434 Q256 452 224.82 434 L117.44 372 Q86.26 354 86.26 318 L86.26 194 Q86.26 158 117.44 140 Z';
const glyph = inner.replace(/<path d="M217[^>]*\/>/, '');
const maskable = `<rect width="512" height="512" fill="#0e4a30" /><path d="${SMALL_HEX}" fill="#17603f" /><g transform="translate(256 256) scale(0.803) translate(-256 -256)">${glyph}</g>`;
const apple = `<rect width="512" height="512" fill="#fafaf9" /><g transform="translate(256 256) scale(0.84) translate(-256 -256)">${inner}</g>`;

const ICONS = [
  ['icon-192.png', 192, inner, true],
  ['icon-512.png', 512, inner, true],
  ['apple-touch-icon.png', 180, apple, false],
  ['maskable-icon-192.png', 192, maskable, false],
  ['maskable-icon-512.png', 512, maskable, false],
];

const browser = await chromium.launch();
for (const [file, size, body, transparent] of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(body, size)}</body></html>`);
  await page.screenshot({ path: join(pub, file), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('wrote', file);
}

// The link preview, 1200x630 as Facebook and Messenger crop it.
const photo = readFileSync(join(pub, 'fe-galang-building.webp')).toString('base64');
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.setContent(`<html><head>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600&family=Plus+Jakarta+Sans:wght@400;600&display=block" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; display: flex; background: #0f1b15; font-family: 'Plus Jakarta Sans', sans-serif; }
  .text { width: 560px; box-sizing: border-box; padding: 64px 56px; display: flex; flex-direction: column; justify-content: space-between; color: #fff; }
  .brand { display: flex; align-items: center; gap: 16px; font-family: Sora; font-weight: 600; font-size: 30px; letter-spacing: -0.03em; }
  h1 { font-family: Sora; font-weight: 500; font-size: 50px; line-height: 1.08; letter-spacing: -0.035em; margin: 0; }
  p { margin: 18px 0 0; font-size: 22px; line-height: 1.45; color: rgba(238,245,240,0.72); }
  .url { font-size: 18px; font-weight: 600; color: #5fc28e; }
  .photo { flex: 1; background: url(data:image/webp;base64,${photo}) center / cover; position: relative; }
  .photo::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #0f1b15 0%, rgba(15,27,21,0) 22%); }
</style></head><body>
  <div class="text">
    <div class="brand">${svg(inner, 56)}Hivelet</div>
    <div><h1>Fe Galang Da Silva Boarding House</h1><p>Rooms for rent in Legazpi City. See the units and their rates, and ask to view one.</p></div>
    <div class="url">hivelet.vercel.app</div>
  </div>
  <div class="photo"></div>
</body></html>`);
await og.waitForLoadState('networkidle');
await og.evaluate(() => document.fonts.ready);
await og.screenshot({ path: join(pub, 'og-image.jpg'), type: 'jpeg', quality: 88 });
console.log('wrote og-image.jpg');
await browser.close();
