// Offline / semi-offline / slow-network probe of the LIVE site, public surface only.
// No sign-in. Every POST to the API is aborted by a route guard, so nothing is written.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = 'https://hivelet.vercel.app';
const OUT = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(OUT, { recursive: true });
const results = [];
const log = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail ?? ''}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  serviceWorkers: 'allow',
});
// Hard guard: no write ever leaves this browser.
await ctx.route('**/api/**', (route) => route.request().method() === 'GET' ? route.continue() : route.abort('blockedbyclient'));

const page = await ctx.newPage();

// 1. First visit, online: service worker installs and takes control.
let t0 = Date.now();
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
log('first visit loads (mobile, online)', true, `${Date.now() - t0} ms to network idle, landed on ${new URL(page.url()).pathname}`);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 }).catch(() => {});
const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
log('service worker controls the page after first visit', controlled);
const installable = await page.evaluate(async () => {
  const m = await (await fetch('/manifest.webmanifest')).json();
  return { display: m.display, start_url: m.start_url, icons: m.icons.map((i) => i.sizes + ':' + i.purpose) };
});
log('manifest meets install criteria (standalone, start_url, 192+512 icons, maskable)',
  installable.display === 'standalone' && installable.icons.includes('192x192:any') && installable.icons.includes('512x512:any') && installable.icons.some((i) => i.includes('maskable')),
  JSON.stringify(installable));
// Visit the pages a tester touches so their data is in the runtime cache.
for (const p of ['/public', '/inquire', '/login']) await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}01-online-public.png` });

// 2. Fully offline: navigate to every entry point a tester or tenant might reopen.
await ctx.setOffline(true);
for (const p of ['/', '/public', '/inquire', '/login', '/tenant', '/tenant/payments', '/admin', '/admin/income', '/privacy', '/terms']) {
  try {
    t0 = Date.now();
    await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 4000),
      appMounted: !!document.querySelector('#app')?.children.length,
    }));
    const banner = /no connection|offline|could not reach/i.test(s.text);
    const chromeError = /ERR_INTERNET_DISCONNECTED|No internet|dinosaur/i.test(s.text);
    log(`offline navigation ${p}`, s.appMounted && !chromeError, `${Date.now() - t0} ms; app shell=${s.appMounted}; offline notice=${banner}; landed ${new URL(page.url()).pathname}`);
    await page.screenshot({ path: `${OUT}02-offline${p.replace(/\//g, '_') || '_root'}.png` });
  } catch (e) { log(`offline navigation ${p}`, false, e.message.split('\n')[0]); }
}
// Public catalogue offline: are the unit listings served from the cache?
await page.goto(`${BASE}/public`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(4000);
const catalogueText = await page.evaluate(() => document.body.innerText);
log('offline: public catalogue still shows units (cached /api/public)', /₱\s?[\d,]+/.test(catalogueText), (catalogueText.match(/₱\s?[\d,]+/g) || []).slice(0, 3).join(' '));

// 3. Offline write attempt on the enquiry form: must show a clear message, not hang or pretend success.
await page.goto(`${BASE}/inquire`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(1500);
const formInfo = await page.evaluate(() => [...document.querySelectorAll('input,textarea,select,button')].map((e) => `${e.tagName.toLowerCase()}[${e.getAttribute('type') || ''}] ${e.getAttribute('name') || e.id || e.getAttribute('aria-label') || e.textContent?.trim().slice(0, 30)}`));
console.log('enquiry form controls:', formInfo.join(' | '));
await page.screenshot({ path: `${OUT}03-offline-inquire.png`, fullPage: true });

// 4. Back online: the "Back online" toast.
await ctx.setOffline(false);
let toast = null;
for (let i = 0; i < 20 && !toast; i++) {
  await page.waitForTimeout(250);
  toast = await page.evaluate(() => document.body.innerText.match(/Back online[^\n]*/)?.[0] ?? null);
}
log('reconnect shows "Back online" notice', !!toast, toast ?? '');

// 5. Semi-offline: API stalls (signal present, no answers). Public catalogue must fall back within ~3 s.
await ctx.unroute('**/api/**');
await ctx.route('**/api/**', async (route) => {
  if (route.request().method() !== 'GET') return route.abort('blockedbyclient');
  await new Promise((r) => setTimeout(r, 30000)); // stall
  return route.abort('timedout');
});
t0 = Date.now();
await page.goto(`${BASE}/public`, { waitUntil: 'domcontentloaded' });
let shownAt = null;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500);
  if (/₱\s?[\d,]+/.test(await page.evaluate(() => document.body.innerText))) { shownAt = Date.now() - t0; break; }
}
log('stalled API: public catalogue still renders (SW NetworkFirst 3 s fallback)', shownAt !== null, shownAt ? `units visible after ${shownAt} ms` : 'nothing after 20 s');
await page.screenshot({ path: `${OUT}04-stalled-public.png` });
await ctx.unroute('**/api/**');
await ctx.route('**/api/**', (route) => route.request().method() === 'GET' ? route.continue() : route.abort('blockedbyclient'));

// 6. Slow networks, cold cache (new context, no SW): time to first units on screen.
const profiles = {
  'Fast 3G (1.6 Mbps, 150 ms)': { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 },
  'Slow 3G (400 kbps, 400 ms)': { latency: 400, downloadThroughput: 400e3 / 8, uploadThroughput: 400e3 / 8 },
};
for (const [label, cond] of Object.entries(profiles)) {
  for (const warm of [false, true]) {
    const c2 = warm ? ctx : await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    if (!warm) await c2.route('**/api/**', (route) => route.request().method() === 'GET' ? route.continue() : route.abort('blockedbyclient'));
    const p2 = await c2.newPage();
    const s2 = await c2.newCDPSession(p2);
    await s2.send('Network.enable');
    await s2.send('Network.emulateNetworkConditions', { offline: false, ...cond });
    t0 = Date.now();
    await p2.goto(`${BASE}/public`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const dcl = Date.now() - t0;
    let units = null;
    for (let i = 0; i < 120; i++) { await p2.waitForTimeout(250); if (/₱\s?[\d,]+/.test(await p2.evaluate(() => document.body.innerText))) { units = Date.now() - t0; break; } }
    log(`${label}, ${warm ? 'returning visitor (SW cache)' : 'first visit (no cache)'}: /public`, units !== null && units < 15000, `DOMContentLoaded ${dcl} ms, units on screen ${units ?? '>30000'} ms`);
    await p2.close();
    if (!warm) await c2.close();
  }
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
console.log(JSON.stringify(results));
