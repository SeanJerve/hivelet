// Appendix K (User's Manual) screenshots, Figures K-1 to K-16, with red numbered callouts.
// Sample data only: it drives a copy of harness.html, so no tenant's name is ever in a figure.
//
// 1. Copy video/capture/harness.html to frontend/_harness-manual.html (gitignored) and in the copy:
//      full_name: 'Michelle'  ->  full_name: 'Landlady'
//      each `mustChangePassword: false }`  ->  `mustChangePassword: params.get('mcp') === '1' }`, and for the
//      tenant also `mustCompleteContact: params.get('mcp') === '1'` (the first sign-in window, Figure K-2).
// 2. Start the frontend dev server (port 5173), then from video/: node capture/manual-shots.mjs [name part]
// 3. Shrink: wider than 2000 px to 1800 px, 256-colour PNG (about 7 MB for all 16).
// Files ending -phone.png are capped at 6.5 in tall by build-manuscript-docx.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173/_harness-manual.html';
const OUT = 'C:/Users/LloydCuario/OneDrive/Desktop/hivelet/hivelet/docs/FINAL MANUSCRIPT/figures/';
const only = process.argv[2];

const btn = (n) => (p) => p.getByRole('button', { name: n, exact: false }).locator('visible=true').first();
const lnk = (n) => (p) => p.getByRole('link', { name: n, exact: false }).first();
const head = (n) => (p) => p.getByRole('heading', { name: n, exact: false }).locator('visible=true').first();
const lab = (n) => (p) => p.getByLabel(n, { exact: false }).locator('visible=true').first();
const txt = (n) => (p) => p.getByText(n, { exact: true }).first();
const css = (s) => (p) => p.locator(s).first();
const cmb = (n) => (p) => p.getByRole('combobox', { name: n, exact: false }).locator('visible=true').first();
// the card (nearest bordered ancestor) around an element
const card = (f) => async (p) => { const h = await f(p).elementHandle(); return h.evaluateHandle((e) => {
  let x = e; while (x && x.parentElement) { const s = getComputedStyle(x); if ((parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== 'none') && x.getBoundingClientRect().width > 200 && x !== e) return x; x = x.parentElement; } return e; }); };

const T = { w: 390, h: 844 }, A = { w: 1366, h: 900 };
const shots = [
  { f: 'appendix-k-01-sign-in-phone', role: 'public', route: '/login', vp: T, clip: 520,
    marks: [[1, [lab('Login ID')]], [2, [lab('Password')]], [3, [btn('Sign in')]]] },
  { f: 'appendix-k-02-set-password-phone', role: 'tenant&mcp=1', route: '/tenant', vp: { w: 390, h: 880 },
    marks: [[1, [lab('Your mobile number')]], [2, [lab('Starting password')]], [3, [lab('New password')]], [4, [lab('Confirm new password')]], [5, [btn('Save and continue')]]] },
  { f: 'appendix-k-03-tenant-overview-phone', role: 'tenant', route: '/tenant', vp: T, clip: 1130,
    marks: [[1, [card(head('Amount due'))]], [2, [head('Unit 1A'), txt('Not recorded')], { wide: true }], [3, [head('Payments'), txt('Recorded by the landlady')], { wide: true }], [4, [lnk('Request a repair')]]] },
  { f: 'appendix-k-04-tenant-payments-phone', role: 'tenant', route: '/tenant/payments', vp: T, clip: 844,
    marks: [[1, [card(btn('Pay with GCash'))]], [2, [btn('Pay with GCash')]], [3, [css('[role=tab] >> nth=0'), css('[role=tab] >> nth=1')]], [4, [btn('Filters')]]] },
  { f: 'appendix-k-05-tenant-repairs-phone', role: 'tenant', route: '/tenant/tickets', vp: T, clip: 940,
    marks: [[1, [lab('What needs fixing'), lab('Details')]], [2, [txt('Add a photo')]], [3, [btn('Send request')]], [4, [head('Your requests')]]] },
  { f: 'appendix-k-06-tenant-details-phone', role: 'tenant', route: '/tenant/profile', vp: T, clip: 870,
    marks: [[1, [lab('Your mobile number')]], [2, [btn('Change password')]], [3, [txt('Emergency contact'), lab('Their phone number')], { wide: true }], [4, [btn('Save')]]] },
  { f: 'appendix-k-07-tenant-menu-phone', role: 'tenant', route: '/tenant', vp: T, clip: 470, click: 'Account menu for',
    marks: [[1, [btn('Account menu for')]], [2, [btn('Change password')], { pad: -3 }], [3, [btn('Sign out')], { pad: -3 }], [4, [css('label:has-text("System")'), css('label:has-text("Dark")')]]] },
  { f: 'appendix-k-09-admin-overview', role: 'admin', route: '/admin/overview', vp: A, clip: 1230,
    marks: [[1, [btn('change the year shown')], { tr: true }], [2, [lnk('Move someone in/out'), lnk('Record payment')]], [3, [head('Needs your attention')]], [4, [head('Rent for'), btn('Record a payment for Unit 3E')]],
      [5, [head('Occupancy')]], [6, [head('Income and expenses')]], [7, [head('RECENTLY')]], [8, [btn('Notifications')]]] },
  { f: 'appendix-k-08-admin-menu', role: 'admin', route: '/admin/overview', vp: A, clip: 430, click: 'Account menu for the administrator',
    marks: [[1, [btn('Account menu for the administrator')], { tr: true }], [2, [btn('Change number / password')], { pad: -3 }], [3, [btn('Sign out')], { pad: -3 }], [4, [css('label:has-text("System")'), css('label:has-text("Dark")')]]] },
  { f: 'appendix-k-10-income', role: 'admin', route: '/admin/income', vp: A, clip: 900,
    marks: [[1, [btn('Record payment')]], [2, [head('Rent for')]], [3, [head('Income by cluster')]], [4, [css('[role=tab] >> nth=0'), css('[role=tab] >> nth=1')]], [5, [btn('Reject'), btn('Verify payment')]], [6, [btn('Download')]]] },
  { f: 'appendix-k-11-record-payment', role: 'admin', route: '/admin/income', vp: A, click: 'Record payment',
    marks: [[2, [cmb('Unit')]], [2, [cmb('Mode of payment')]], [2, [css('[role=dialog] input >> nth=3'), css('[role=dialog] input >> nth=5')]], [2, [css('[role=dialog] input >> nth=6')]], [3, [css('#onsite-occupants'), css('[role=dialog] input >> nth=1')]],
      [4, [css('#onsite-invoice')]], [5, [css('[role=dialog] button:has-text("Record payment")')]]] },
  { f: 'appendix-k-12-expenses', role: 'admin', route: '/admin/expenses', vp: A, clip: 900,
    marks: [[1, [btn('Record expense')], { tr: true }], [2, [cmb('What kind'), cmb('Order')]], [3, [btn('Edit Expense')]], [4, [btn('Download')], { tr: true }]] },
  { f: 'appendix-k-13-tenants', role: 'admin', route: '/admin/tenants', vp: A, clip: 900,
    marks: [[1, [btn('Move someone in')]], [2, [cmb('Year')], { tr: true }], [3, [btn('Edit Andrea Villanueva')], { tr: true }]] },
  { f: 'appendix-k-14-rooms', role: 'admin', route: '/admin/directory', vp: A, clip: 900,
    marks: [[1, [cmb('How to show'), cmb('Order')]], [2, [btn('Edit 1A')]]] },
  { f: 'appendix-k-15-repairs', role: 'admin', route: '/admin/tickets', vp: A, clip: 900,
    marks: [[1, [head('To dispatch')]], [2, [head('In progress')]], [3, [head('Done')]], [4, [btn('Mark resolved')]], [5, [btn('Log a repair')]], [6, [cmb('Status')]]] },
  { f: 'appendix-k-16-inquiries', role: 'admin', route: '/admin/inquiries', vp: A, clip: 900,
    marks: [[1, [css('main button:has-text("Waiting for an answer")')], { tr: true }], [2, [css('#reply')]], [3, [btn('Send reply')], { tr: true }], [4, [btn('Close inquiry')]], [5, [btn('Move them in')], { tr: true }], [6, [cmb('Status')]]] },
];

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const s of shots) {
  if (only && !s.f.includes(only)) continue;
  const page = await browser.newPage({ viewport: { width: s.vp.w, height: s.vp.h }, deviceScaleFactor: 2, colorScheme: 'light' });
  await page.goto(`${BASE}?role=${s.role}&route=${encodeURIComponent(s.route)}`);
  await page.waitForTimeout(3500);
  if (s.click) { await btn(s.click)(page).click(); await page.waitForTimeout(1200); }
  const boxes = [];
  for (const [n, fs, o = {}] of s.marks) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = 0;
    for (const fn of fs) {
      try {
        const loc = await fn(page);
        const b = loc.boundingBox ? await loc.boundingBox({ timeout: 2000 }) : await loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
        if (!b) throw new Error('no box');
        x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); ok++;
      } catch (e) { console.log(`  MISSING ${s.f} #${n}: ${String(e.message).split('\n')[0]}`); }
    }
    if (o.wide) { x0 = 12; x1 = s.vp.w - 12; }
    if (ok) boxes.push({ n, x0, y0, x1, y1, pad: o.pad ?? 4, tr: !!o.tr });
  }
  await page.evaluate((boxes) => {
    const sx = scrollX, sy = scrollY, W = document.documentElement.clientWidth;
    for (const b of boxes) {
      const pad = b.pad, r = document.createElement('div');
      Object.assign(r.style, { position: 'absolute', left: `${b.x0 + sx - pad}px`, top: `${b.y0 + sy - pad}px`, width: `${b.x1 - b.x0 + 2 * pad}px`, height: `${b.y1 - b.y0 + 2 * pad}px`,
        border: '3px solid #d32f2f', borderRadius: '10px', zIndex: 2147483647, pointerEvents: 'none', boxSizing: 'border-box' });
      const d = document.createElement('div');
      const outL = !b.tr && b.x0 - pad - 32 >= 0;
      const bl = outL ? b.x0 + sx - pad - 31 : Math.min(W - 28, b.x1 + sx + pad - 13);
      const bt0 = b.tr ? b.y1 + sy + pad - 13 : null;
      const bt = bt0 ?? (outL ? b.y0 + sy + (b.y1 - b.y0) / 2 - 13 : Math.max(2, b.y0 + sy - pad - 13));
      Object.assign(d.style, { position: 'absolute', left: `${bl}px`, top: `${bt}px`, width: '26px', height: '26px', borderRadius: '50%', background: '#d32f2f', color: '#fff',
        font: '700 15px/26px Arial, sans-serif', textAlign: 'center', zIndex: 2147483647, pointerEvents: 'none', boxShadow: '0 0 0 2px #fff' });
      d.textContent = String(b.n);
      document.body.append(r, d);
    }
  }, boxes);
  const clip = s.clip ? { x: 0, y: 0, width: s.vp.w, height: s.clip } : undefined;
  await page.screenshot({ path: `${OUT}${s.f}.png`, fullPage: !!s.clip && s.clip > s.vp.h, clip });
  console.log(`saved ${s.f} (${boxes.length}/${s.marks.length} callouts)`);
  await page.close();
}
await browser.close();
