# Pre-testing audit, 29 September 2026

**The evening before the first test with real tenants.** An end-to-end check of the live system
for the things a real day of use would hit: can the tenants get in, does it hold up with several
people at once, what happens offline and on a weak signal, can it be installed, and is anything
inconsistent. Written by Claude on Loyd's machine; every figure below was measured today, with the
device and the time beside it. Chapter 4 cites this file in §4.3.1 and §4.3.6.

**Times are Philippine time (UTC+8).** Measuring machine: Acer Nitro ANV15-52, Intel Core
i5-13420H, 16 GB RAM, Windows 11 Home, Google Chrome 154.0.8037.58 driven by Playwright, on a home
broadband connection in the Philippines. The live system: `https://hivelet.vercel.app`, build
`3168bd4` (the `main` branch as pulled at 21:30).

**What this audit changed in the live database: one thing, on request.** Every tenant account was
reset (section 2). Everything else was read-only. Every write in the browser tests was blocked
inside the browser before it could leave the machine.

---

## 1. Automated verification

`npm run check:all` with the backend up, 21:45: **20 of 20 suites passed.** Endpoint and access
control 78/78; report reconciliation 490/490; payment gateway 73/73; record relations 30/30;
billing 15/15; ledger integrity passed (937 income rows, ₱8,086,250.00 remitted, the five known
receipt anomalies reported as always).

After the tenant reset at 21:54, `check:api` signs in as its seeded tenant and every tenant route
answers **428 PASSWORD_CHANGE_REQUIRED**. That is the reset working, not a fault. The suite still
signs in as a real tenant, which it should stop doing (`BLOCKED_FOR_SEAN.md` B-82).

## 2. Can the tenants get in?

| Checked | Result |
| :--- | :--- |
| Tenant accounts | 32, all active, all with a current unit; 1 administrator |
| Before the reset | All 32 tenant accounts shared **one** demo password (set 21 September, B-49) that the team had used while developing. Handing it to a tester would have opened every neighbour's account |
| Password reset in the app | **None**, at the time of the audit: no "forgot password", no administrator reset. Only onboarding a new tenant issued a password. Added the same night (F-2, B-83) |
| The reset, 21:54, after `npm run backup` | 32 of 32 tenants received their own random starting password; all 32 must choose their own at first sign-in; every session opened before 21:54 was signed out; lockouts cleared; the administrator's password verified unchanged |
| The gate, tested | The seeded tenant signs in with its new starting password and every tenant screen's data is refused (428) until the password is changed |

The starting passwords exist only in `credentials/` on the admin laptop (gitignored), as slips to
print and hand over in person. `scripts/reset-tenant-accounts.mjs --only <phone>` re-issues one
tenant's, which is the stop-gap for a lost slip until the app has a reset button.

## 3. The live site

| Checked | Result |
| :--- | :--- |
| `/api/health` | online; database connected; row-level security lockdown enforced |
| Security headers | HSTS (2 years, subdomains), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera, microphone, geolocation off) |
| Content Security Policy | Present but **report-only**: it reports violations, it does not block them. Worth enforcing after the defense once its reports are clean (design lane, `vercel.json`) |
| Unknown address | Served a proper "not found" page |
| Response times, single request | Pages 0.17 to 0.20 s; `/api/public/rooms` 0.34 s; `/api/health` 0.64 s |

## 4. Installable app and offline behaviour (Chapter 4, §4.2.7; FR-030)

Tested on the live site with a phone profile (390 × 844, Android Chrome user agent). 20 probes. The
first run reported the "Back online" probe as failed; checked by hand it passed, and the cause was
in the harness (an unused debugging session interfering with the offline switch). With that removed
the script, now `scripts/field-tests/offline-and-weak-signal.mjs`, reads **20/20** on the build
deployed later the same night.

| Probe | Result |
| :--- | :--- |
| Service worker installs and controls the page on the first visit | Yes. 67 files kept for offline use |
| Manifest meets the install criteria | `standalone`, start URL `/`, icons 192 and 512 px, maskable icons |
| Offline: open `/`, `/public`, `/inquire`, `/login`, `/privacy`, `/terms` | The app opens every one (about 1.5 s) instead of the browser's "no internet" page |
| Offline: open `/tenant`, `/tenant/payments`, `/admin`, `/admin/income` while signed out | The app opens and sends the visitor to sign-in. No personal data is kept on the device |
| Offline banner | "No connection. You can read what is already loaded, but nothing can be saved or paid until it is back." appears the moment the connection drops, and on a page opened offline |
| Back online | "Back online" notice appears |
| Public units offline | Served from the phone's memory |
| API stalled (connected, no answers) | Public units shown from memory after 3.1 s |

This matches what Chapter 4 promises and no more: the app opens and says honestly what it cannot
do; personal and financial data needs the connection.

## 5. Weak signal (Chrome network throttling, public page)

| Network | First visit: page ready | First visit: units on screen | Returning visitor: units on screen |
| :--- | --: | --: | --: |
| Fast 3G (1.6 Mbps, 150 ms) | 1.03 s | 1.60 s | 0.32 s |
| Slow 3G (400 kbps, 400 ms) | 3.07 s | 4.64 s | 0.32 s |

A returning visitor on Slow 3G sees units in a third of a second because the installed app already
holds its own files.

**One gap found and fixed: requests had no deadline.** A weak signal usually stalls rather than
fails, and the app waited for as long as the browser did (minutes), with the button stuck on
"Sending…". Since commit `e32ad01` a page gives up after **25 s** and says it could not reach the
server; a save gives up after **45 s** and says it **cannot tell whether it was saved, so check
before sending again**, because a save that timed out may still have arrived. Verified in the
browser with the API held open: the enquiry form showed that message at 46 s with the typed fields
kept; the public page showed "We cannot show you which units are free right now" at 27 s. With the
change removed, the same stall still showed nothing at 41 s. **This fix reaches the live site only
when `main` is pushed and deployed.**

## 6. Several users at once

Read-only; no user action was simulated that writes.

**A. Live site, public pages.** 12 simultaneous visitors for 60 s, each pausing 0.25 to 0.75 s
between requests like a person: **1,085 requests, 0 errors.**

| Endpoint | Requests | Median | 95th percentile | Slowest |
| :--- | --: | --: | --: | --: |
| `/` | 182 | 71 ms | 127 ms | 934 ms |
| `/public` | 179 | 71 ms | 177 ms | 647 ms |
| `/inquire` | 181 | 70 ms | 217 ms | 960 ms |
| `/api/public/rates` | 182 | 155 ms | 374 ms | 856 ms |
| `/api/public/rooms` | 182 | 215 ms | 339 ms | 481 ms |
| `/api/health` | 179 | 247 ms | 519 ms | 1,190 ms |

**B. The owner's screens, live database.** 6 simultaneous readers for 45 s through the local
backend (the same code as the live site, against the same live database), signed in once as the
administrator: **285 requests, 0 errors.**

| Endpoint | Requests | Median | 95th percentile | Slowest |
| :--- | --: | --: | --: | --: |
| `/admin/tenants` | 27 | 397 ms | 489 ms | 744 ms |
| `/admin/rooms` | 28 | 412 ms | 610 ms | 734 ms |
| `/admin/income-records` (2026) | 29 | 498 ms | 804 ms | 1,783 ms |
| `/admin/expense-entries` (2026) | 28 | 420 ms | 645 ms | 688 ms |
| `/admin/payments` | 29 | 413 ms | 638 ms | 865 ms |
| `/admin/bills` | 28 | 440 ms | 584 ms | 590 ms |
| `/admin/tickets` | 30 | 407 ms | 467 ms | 540 ms |
| `/admin/inquiries` | 30 | 400 ms | 525 ms | 675 ms |
| `/admin/notifications` | 30 | 619 ms | 801 ms | 898 ms |
| `/auth/me` | 26 | 409 ms | 616 ms | 675 ms |

Both loads are several times what three to five tenants and one owner produce. What this does not
cover: several people **writing** at once. The code guards were read instead (section 8), and
tomorrow's Session 3 tests it with people.

## 7. Layout and accessibility, public pages

Seven public pages (`/public`, `/inquire`, `/login`, `/privacy`, `/terms`, `/category/studio`, a
"not found" page) at 360, 390 and 1366 px wide:

- **No page scrolls sideways** at any width.
- **axe-core 4, WCAG 2 A and AA rules: no violations** on any page at 390 and 1366 px. One scan
  reported 18 contrast issues on `/category/studio` at 390 px; re-scanned after the page finished
  its entrance animation it reported 0, so the first scan caught text mid-fade.

Signed-in screens were not scanned: that needs a sign-in, which is tomorrow's.

## 8. Writing twice, and writing at the same time (read from the code)

| Path | Guard |
| :--- | :--- |
| Tenant repair request, note, profile | Button disabled while sending, and the handler refuses a second call (Enter pressed twice) |
| Admin forms (income, expenses, tenants, rooms, repairs, inquiries) | Buttons disabled while saving |
| Same receipt recorded twice | Refused (walkthrough step 19). A read-then-write in code, not a database constraint: two administrators pressing Save in the same instant is not covered (judgement log § 3.6b). There is one administrator |
| Same online payment verified twice | Row locked and re-checked; the second returns "already done" |
| Online payment reference | Unique index (migration 024) |
| Sign-in failures from one connection | 30 per 15 minutes, **shared by everyone on the house wifi**. Five wrong passwords lock one account for 15 minutes |
| Enquiries from one connection | 10 per 15 minutes, shared by the house wifi too |

## 9. Findings

| # | Finding | Status |
| :--- | :--- | :--- |
| F-1 | Every tenant account shared one password the team had used | **Fixed 29 Sep**: unique starting passwords, forced change (section 2) |
| F-2 | No way to reset a forgotten password in the app | **Fixed** in `8cf0e80` (B-83): Tenants > Edit > Reset password. Verified 15/15 against the live database and 7/7 in the interface |
| F-3 | Requests had no deadline on a stalled connection | **Fixed** in `e32ad01`; live after the next deploy |
| F-4 | `check:api` signs in as a real tenant | Queued (B-82): give the suites their own test tenant |
| F-5 | Content Security Policy is report-only | Recommendation, after the defense |
| F-6 | The house wifi shares one sign-in failure counter and one enquiry counter | Not a defect; written into the testing guide so testers are not surprised |
| F-7 | The repository's root scripts (`backup`, `rotate-demo-passwords`, `reset-tenant-accounts`) import packages the root `package.json` does not declare | **Fixed** the same night on Sean's machine: the three packages are declared in the root `package.json` (backend's versions), and `npm run install:all` installs the root too. They had resolved on Sean's PC only from a stray `node_modules` in his user folder; `npm run backup` then ran from the project's own (21,837 rows, 937 income records) |
| F-8 | The forced "Set your password" window, which every tenant meets first, asked for a "Current password" without saying it is the slip's, called the reset accounts "created", and had no way out but closing the browser | **Fixed** in `91b874a`: it asks for the "Starting password (the one you just signed in with)" and has a Sign out button. Verified 17/17 on the local build with every server answer faked (no real account) |
| F-10 | **All 32 tenants' screens say they are overdue.** The last receipt in the ledger is dated 8 August 2026 (August 13 receipts, September none, against about 30 a month before). Tenant screens were audited against the database the same night and matched; the records are what is behind | **For the owner and the team before the tenant sessions**: the owner enters the receipts she has collected, or each tester is told first (`TESTING_DAY_GUIDE.md`, the CAUTION box) |
| F-11 | A photo from a phone (2 to 5 MB) was refused by the repair form, whose request carries at most about 700 KB of image | **Fixed** in `caf0115`: the photo is made smaller in the browser first; a 7.5 MB worst case became 373 KB in 0.2 s |
| F-9 | After F-3, three tenant screens would have headed a timed-out save "not sent" or "failed", inviting a duplicate | **Fixed** in `6b778d1`: "could not confirm", with the check-first message |

## 10. What this audit cannot say

- Nothing here was done **signed in as a tenant** through the screens, or by a person. That is
  tomorrow, and it is the part the manuscript needs most.
- The phone profile is Chrome's emulation, not a real phone. Tomorrow's Session 4 repeats the
  offline and install cases on real Android and iPhone handsets.
- The load test measured reads. Simultaneous writes are covered by the code guards in section 8 and
  by Session 3 tomorrow, not by a machine.
