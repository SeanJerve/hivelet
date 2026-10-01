// The owner's eight screens at phone, tablet and desktop widths: sideways overflow and axe-core
// WCAG 2 A/AA. Local build + local backend (live database), signed in as the administrator from
// credentials/creds.txt. Every non-GET except sign-in is blocked in the browser; prints
// measurements only, never record text. WIDTHS=390 limits the widths. See README.md.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const creds = readFileSync(new URL('../../credentials/creds.txt', import.meta.url), 'utf8');
const email = creds.match(/Email:\s*(\S+)/)[1];
const password = creds.match(/Password:\s*(\S+)/)[1];
const axe = readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const PAGES = ['/admin/overview', '/admin/directory', '/admin/tenants', '/admin/income', '/admin/expenses', '/admin/tickets', '/admin/inquiries'];
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const blocked = [];
for (const w of (process.env.WIDTHS ?? '360,390,768,1366').split(',').map(Number)) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 800 : 820 }, isMobile: w < 800, hasTouch: w < 800, serviceWorkers: 'block' });
  await ctx.route('**/api/**', (r) => {
    const m = r.request().method(); const path = new URL(r.request().url()).pathname;
    if (m === 'GET' || path.endsWith('/auth/login')) return r.continue();
    blocked.push(`${m} ${path}`); return r.abort('blockedbyclient');
  });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await p.fill('#login-email', email); await p.fill('#login-password', password);
  await p.click('button[type=submit]'); await p.waitForTimeout(2500);
  for (const path of PAGES) {
    await p.goto('http://localhost:5173' + path, { waitUntil: 'load' });
    await p.waitForTimeout(4000);
    const m = await p.evaluate(() => {
      const iw = window.innerWidth;
      const offenders = [...document.querySelectorAll('body *')].filter((e) => {
        const r = e.getBoundingClientRect(); if (!r.width || r.right <= iw + 1) return false;
        for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(s.overflowX)) return false; }
        return getComputedStyle(e).position !== 'fixed';
      });
      return { sw: document.documentElement.scrollWidth, iw, offenders: offenders.slice(0, 3).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 3).join('.')} right=${Math.round(e.getBoundingClientRect().right)}`), signedIn: !location.pathname.startsWith('/login') };
    });
    let ax = '';
    if (w === 390 || w === 1366) {
      await p.addScriptTag({ content: axe });
      const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.impact}:${x.id}(${x.nodes.length})`));
      ax = v.length ? v.join(' ') : 'none';
    }
    console.log(`${String(w).padEnd(5)} ${path.padEnd(18)} ${m.signedIn ? '' : 'NOT SIGNED IN '}page ${m.sw > m.iw ? `WIDER ${m.sw}>${m.iw}` : 'fits'}${m.offenders.length ? ' | sticks out: ' + m.offenders.join(', ') : ''}${ax ? ' | a11y: ' + ax : ''}`);
    if (w === 390) await p.screenshot({ path: `shots/owner${path.replace(/\//g, '_')}.png` });
  }
  await ctx.close();
}
await b.close();
console.log('writes blocked:', blocked.length ? [...new Set(blocked)].join(', ') : 'none attempted');
