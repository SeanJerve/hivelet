// Paper textures for the paper pitch, rendered once from SVG noise into public/paper/tex/:
//   grain.png   fine tooth and specks, near white, to multiply over any paper colour
//   fibers.png  long soft fibres, for kraft and the table
//   crumple.png creases, for a sheet that has been folded and handled
// Each tile is seamless (stitchTiles), so it repeats without a seam.   node capture/paper-textures.mjs

import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'paper', 'tex');
mkdirSync(out, {recursive: true});
const S = 512;
const svg = {
  // Fine grain: high-frequency noise mapped to a narrow band just under white.
  grain: `<filter id="f" x="0" y="0"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/>
    <feComponentTransfer><feFuncR type="table" tableValues="0.80 1 1"/><feFuncG type="table" tableValues="0.80 1 1"/><feFuncB type="table" tableValues="0.80 1 1"/></feComponentTransfer></filter>
    <rect width="${S}" height="${S}" filter="url(#f)"/>`,
  // Fibres: noise stretched along x, a little darker, softly mottled.
  fibers: `<filter id="f" x="0" y="0"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves="4" seed="9" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/>
    <feComponentTransfer><feFuncR type="table" tableValues="0.72 0.97 1"/><feFuncG type="table" tableValues="0.72 0.97 1"/><feFuncB type="table" tableValues="0.72 0.97 1"/></feComponentTransfer></filter>
    <rect width="${S}" height="${S}" filter="url(#f)"/>`,
  // Creases: low-frequency ridges, lit from one side, kept faint.
  crumple: `<filter id="f" x="0" y="0"><feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" seed="21" stitchTiles="stitch" result="n"/>
    <feDiffuseLighting in="n" surfaceScale="6" lighting-color="#fff"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting>
    <feComponentTransfer><feFuncR type="table" tableValues="0.80 1"/><feFuncG type="table" tableValues="0.80 1"/><feFuncB type="table" tableValues="0.80 1"/></feComponentTransfer></filter>
    <rect width="${S}" height="${S}" filter="url(#f)"/>`,
};
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page = await browser.newPage({viewport: {width: S, height: S}});
for (const [name, body] of Object.entries(svg)) {
  await page.setContent(`<body style="margin:0"><svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">${body}</svg></body>`);
  await page.screenshot({path: join(out, `${name}.png`), clip: {x: 0, y: 0, width: S, height: S}});
}
await browser.close();
console.log('wrote', Object.keys(svg).map((n) => `${n}.png`).join(', '));
