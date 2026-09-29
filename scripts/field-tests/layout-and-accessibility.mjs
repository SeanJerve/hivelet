import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const axe = readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const pages = ['/public', '/inquire', '/login', '/privacy', '/terms', '/category/studio', '/nope-404'];
const out = [];
for (const w of [360, 390, 1366]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 780 : 800 }, isMobile: w < 800, hasTouch: w < 800 });
  await ctx.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : r.abort());
  const p = await ctx.newPage();
  for (const path of pages) {
    await p.goto('https://hivelet.vercel.app' + path, { waitUntil: 'networkidle' });
    await p.keyboard.press('Escape').catch(()=>{});
    await p.waitForTimeout(600);
    const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0,3).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0,2).join('.')) }));
    let ax = null;
    if (w === 390 || w === 1366) {
      await p.addScriptTag({ content: axe });
      ax = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }); return r.violations.map(v => `${v.impact}:${v.id}(${v.nodes.length})`); });
    }
    out.push({ w, path, overflow: ov.sw > ov.iw ? `${ov.sw}>${ov.iw} ${ov.wide.join(',')}` : 'none', axe: ax });
  }
  await ctx.close();
}
await b.close();
for (const o of out) console.log(String(o.w).padEnd(5), o.path.padEnd(18), 'overflow:', o.overflow.padEnd(10), o.axe ? 'a11y: ' + (o.axe.join(' ') || 'no WCAG A/AA violations') : '');
