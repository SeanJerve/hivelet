// Films the real Hivelet screens for the video.
//
// Needs the frontend dev server on http://localhost:5173 (npm run dev:frontend
// from the repository root). Copies harness.html into frontend/ for the length
// of the run, drives each page with Playwright, and deletes the copy after.
//
// Nothing leaves this machine: every request that is not localhost or Google
// Fonts is aborted, and the harness answers the app's API calls itself. No one
// signs in and nothing is written.
//
//   node capture/capture.mjs            all shots
//   node capture/capture.mjs income     only shots whose name contains "income"

import { chromium } from 'playwright';
import { copyFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SHOTS } from './shots.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const harnessCopy = join(root, 'frontend', '_harness-video.html');
const outDir = join(here, '..', 'public', 'shots');
const BASE = 'http://localhost:5173';
const only = process.argv[2];

mkdirSync(outDir, { recursive: true });
copyFileSync(join(here, 'harness.html'), harnessCopy);
// The building photo and the app icon appear in the video as they are on the site.
// And the floor plan the public page shows for unit B3B.
mkdirSync(join(here, '..', 'public', 'floorplans'), { recursive: true });
for (const asset of ['fe-galang-building.webp', 'icon-512.png', 'floorplans/back3rdfloor.png']) {
  copyFileSync(join(root, 'frontend', 'public', asset), join(here, '..', 'public', asset));
}

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch();
const problems = [];
try {
  for (const shot of SHOTS) {
    if (only && !shot.name.includes(only)) continue;
    const context = await browser.newContext({ ...VIEWPORTS[shot.device || 'desktop'], reducedMotion: 'reduce', colorScheme: 'light' });
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      const allowed = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
        || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
      return allowed ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });

    const qs = new URLSearchParams({ role: shot.role || 'admin', route: shot.route });
    await page.goto(`${BASE}/_harness-video.html?${qs}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__harnessReady === true, null, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);

    // Each step's screenshot is a separate frame the video animates between.
    const steps = shot.steps || [{ snap: '' }];
    let i = 0;
    for (const step of steps) {
      if (step.click) await page.locator(step.click).first().click();
      if (step.clickText) await page.getByText(step.clickText, { exact: step.exact ?? false }).first().click();
      if (step.clickRole) await page.getByRole(step.clickRole[0], { name: step.clickRole[1] }).first().click();
      if (step.fill) await page.locator(step.fill[0]).first().fill(step.fill[1]);
      if (step.select) await page.locator(step.select[0]).first().selectOption(step.select[1]);
      if (step.eval) await page.evaluate(step.eval);
      if (step.scroll != null) await page.evaluate((y) => window.scrollTo(0, y), step.scroll);
      if (step.wait) await page.waitForTimeout(step.wait); else await page.waitForTimeout(500);
      if (step.snap !== undefined) {
        const file = `${shot.name}${step.snap ? '-' + step.snap : ''}.png`;
        await page.screenshot({ path: join(outDir, file), fullPage: !!shot.fullPage });
        console.log('  saved', file);
      }
      i++;
    }

    const unmocked = await page.evaluate(() => window.__unmocked || []);
    if (unmocked.length || errors.length) problems.push({ shot: shot.name, unmocked, errors: errors.slice(0, 6) });
    await context.close();
  }
} finally {
  await browser.close();
  rmSync(harnessCopy, { force: true });
}

if (problems.length) {
  console.log('\nThings to look at:');
  for (const p of problems) console.log(JSON.stringify(p, null, 2));
}
