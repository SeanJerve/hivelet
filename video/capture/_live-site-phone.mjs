// One-off: the public site as deployed, on a phone-sized screen, for Chapter 3's deployment phase.
import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('https://hivelet.vercel.app/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
console.log('title:', await page.title(), '| url:', page.url());
await browser.close();
