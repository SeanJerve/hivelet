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
| Content Security Policy | Was **report-only**; **enforcing since 30 Sep** morning, after a GCash checkout on the live site produced no report from it (`vercel.json`) |
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

**The owner's eight screens** (Overview, Rooms and rates, Tenants, Monthly Income, Monthly Expenses,
Repairs, Inquiries, Activity) were measured later the same night, signed in as the administrator on
the local build against the live records, writes blocked (`scripts/field-tests/owner-screens-layout.mjs`):
**no screen wider than the window at 360, 390, 768 or 1366 px, and no WCAG A/AA violation at 390 or
1366 px.** One scan flagged 3 contrast issues on Monthly Expenses at 1366 px; re-scanned after 4 and
8 seconds it showed 0 (the same mid-animation effect). This is the first measurement of the owner's
screens on phone widths with real data, after the client called them "messy" on a phone on
23 September; the fixes of that day had been checked on replicas only.

## 7b. Lighthouse, the landing page (30 September)

Lighthouse 12.8 run locally in Chrome 154 against `https://hivelet.vercel.app/public`, three runs
each, median reported (PageSpeed Insights' shared daily quota was used up, so Google's own servers
could not run it). Mobile uses Lighthouse's simulated slow 4G phone; desktop its desktop preset.

| | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| :--- | --: | --: | --: | --: | --: | --: |
| Desktop, before the fix (00:20) | 76 | 100 | 100 | 100 | 1.2 s | **0.50** |
| Desktop, after the fix (00:50) | **95** | 100 | 100 | 100 | 1.4 s | **0** |
| Mobile, before | 73 | 100 | 100 | 100 | 4.8 s | 0 (one run 0.97) |
| Mobile, after | 70 | 100 | 100 | 100 | 5.6 s | 0 |

**The fix (F-19, `App.vue`):** until the first page's code arrived, the page area was empty and the
footer sat in view; the page then shoved it 466 px down, one jump scored 0.50. A full-height
placeholder now holds the space. Measured A/B on two local production builds under the same
throttling: CLS 0.501-0.516 without it, 0.016 with it.

**Mobile, left as it is, on purpose:** the largest element is the "Hivelet" wordmark, text that waits
4.9 s because the whole page is drawn by JavaScript. The levers are pre-rendering the landing page,
loading the Google Fonts stylesheet without blocking (822 ms), and smaller photo sizes for phones
(about 410 KB). Each changes delivery or appearance; none was made the night before real users
test. They are Chapter 5, recommendation 11. The mobile runs vary by a few points with the network
(73 before, 70 after, all CLS 0); Table 11's real-phone timings are the measurement that counts.

**The next morning, the photographs (5fd9b4d, 720ab23).** PageSpeed Insights had its quota back, so
these are Google's runs (Lighthouse 13.5, emulated Moto G Power, slow 4G), mobile, `/`:

| PageSpeed, mobile, 30 Sep | Performance | Accessibility | Best practices | SEO | FCP | LCP |
| :--- | --: | --: | --: | --: | --: | --: |
| Before | 76 | 100 | 100 | 100 | 2.6 s | 5.3 s |
| Phones sent the part of each photo they show (10:15) | **86** | 100 | 100 | 100 | 2.6 s | **3.5 s** |
| Service-worker script deferred (10:19) | 86 | 100 | 100 | 100 | 2.6 s | 3.5 s |

An upright phone's hero shows only the middle of the 1,790-pixel building photo, so phones now get
that middle, 600 pixels at full resolution (145 KB, was 290 KB), whenever the screen is narrower
than 2:3; drawn at four phone sizes it differs from the full file by 2 levels in 255 on average,
re-compression only. The gate gets an 800-pixel copy on narrow screens (136 KB, was 361 KB).
Tablets and computers are unchanged. The deferred script took 510 ms out of the render-blocking
list but moved no metric, because the Google Fonts stylesheet (750 ms) is the longer wait and is
what remains; self-hosting the two typefaces changes the lettering on every screen and adds a
package the other machine must install, so it waits until after testing day.

Header scans the same morning, after the policy was enforced: **Mozilla HTTP Observatory A+, 115/100,
12 of 12** (about 10:07); **securityheaders.com A+** (10:05). securityheaders notes that Vercel sends
`access-control-allow-origin: *` on the static files; the API answers only the site's own origin.

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
| F-5 | Content Security Policy is report-only. Passive scans, 30 Sep 00:04-00:10: **Mozilla HTTP Observatory B (75/100, 11/12)**, its only failure this; **SSL Labs A+** (TLS 1.2/1.3; the second address A, HSTS not seen there). The Google Maps embed it would have blocked was removed on 21 Sep (4b62945) | **Enforced 30 Sep**, after the A-19 check (no report while Adyen loaded) and a scan of the built code (no eval, inline script or worker); B-84  **30 Sep: the policy is enforced (Sean, `8d734e5`); Observatory re-run 02:51 UTC: A+, 115/100, 12/12** |
| F-6 | The house wifi shares one sign-in failure counter and one enquiry counter | Not a defect; written into the testing guide so testers are not surprised |
| F-7 | The repository's root scripts (`backup`, `rotate-demo-passwords`, `reset-tenant-accounts`) import packages the root `package.json` does not declare | **Fixed** the same night on Sean's machine: the three packages are declared in the root `package.json` (backend's versions), and `npm run install:all` installs the root too. They had resolved on Sean's PC only from a stray `node_modules` in his user folder; `npm run backup` then ran from the project's own (21,837 rows, 937 income records) |
| F-8 | The forced "Set your password" window, which every tenant meets first, asked for a "Current password" without saying it is the slip's, called the reset accounts "created", and had no way out but closing the browser | **Fixed** in `91b874a`: it asks for the "Starting password (the one you just signed in with)" and has a Sign out button. Verified 17/17 on the local build with every server answer faked (no real account) |
| F-10 | **All 32 tenants' screens say they are overdue.** The last receipt in the ledger is dated 8 August 2026 (August 13 receipts, September none, against about 30 a month before). Tenant screens were audited against the database the same night and matched; the records are what is behind | **For the owner and the team before the tenant sessions**: the owner enters the receipts she has collected, or each tester is told first (`TESTING_DAY_GUIDE.md`, the CAUTION box) **30 Sep: August resolved by migration 062 (F-20);** tenants whose August line has no date paid still show as behind, as her book does |
| F-11 | A photo from a phone (2 to 5 MB) was refused by the repair form, whose request carries at most about 700 KB of image | **Fixed** in `caf0115`: the photo is made smaller in the browser first; a 7.5 MB worst case became 373 KB in 0.2 s |
| F-19 | The landing page jumped while loading: the footer, in view on an empty page, was shoved down when the page arrived (Lighthouse CLS 0.50, desktop performance 76) | **Fixed**: full-height placeholder until the first page renders. Live after deploy: CLS 0, desktop performance 95 (section 7b) |
| F-9 | After F-3, three tenant screens would have headed a timed-out save "not sent" or "failed", inviting a duplicate | **Fixed** in `6b778d1`: "could not confirm", with the check-first message |
| F-12 | F-9 had no owner-side twin: a timed-out save on Record payment read "Payment not recorded ... Nothing was written to the ledger. Please try again.", and 17 other owner toasts headed a timeout "Not saved" | **Fixed** in `163266e`: "Not confirmed" on a timeout everywhere, the ledger fetched again, a timed-out move-in points to Reset password. Harness: 45.7 s, form kept |
| F-13 | Record payment opened every receipt on today, whatever the unit, the night before the owner enters every receipt since 8 August; one left at the default would show the tenant paid a month ahead | **Fixed** in `a58f656`: Covering from starts the day after the tenant's last verified period (all 32 open on August 2026), per tenant not per unit (`PH` holds 2024 rows) |
| F-14 | The Record payment dialog lives for the whole session and kept the last receipt's OR number, garbage fee, months and typed rent | **Fixed** in `702955e`: cleared after a successful save; unit and date received kept |
| F-15 | The same-period warning printed "OR#OR#4988": every live receipt number carries its own prefix | **Fixed** in `305210c`: "receipt OR#4988" |
| F-16 | The owner's To verify queue did not say GCash payments are on the test account, where verifying marks a bill paid with nothing collected (B-80) | **Fixed** in `6db47b1`: the pay dialog's sentence, and "reject these" |
| F-17 | A tenant link to a repair that is not theirs opened nothing and said nothing (A-22 had nothing to observe) | **Fixed** in `0adf9a0`: "Not found", which names nothing about anyone else's |
| F-18 | Found running A-28: "Split across another area" added its part on the same area as the first, and the database takes one amount per area per expense, so an ordinary 60/40 split failed on save ("could not be recorded" with no reason, or a server error naming the constraint) | **Fixed** in `0a34e48` and `a097f76`: the new part starts with no area, the form and the server both refuse one area twice, in words. Harness: refused, then saved 60/40 with the area chosen |
| F-20 | The ledger stopped at 8 August 2026 | **Fixed 30 Sep** by migration 062 from her updated workbook, additive only: 15 August receipts (P127,850, all linked to their tenants), 34 August expenses (P234,244.78, equal to her August TOTALS row area by area). 16 August lines with no date paid and 1E's line carried from July left out on purpose. `check:ledger` clean on 952 rows, `check:reports` 548/0 |
| F-21 | The imported EXPENSE dates: typed dates a day early (032's defect, never fixed for expenses) and 647 blank-dated entries on the 1st of a 2025 month, 2026 ones included; one June bill differs from her workbook | **Open, B-86**: needs a decision, then a migration the import script can generate |

## 9b. Tomorrow's cases, rehearsed by machine first

On the local build with every server answer faked by the test (no real account, no backend), or,
where marked, against the live database through the local backend. They say the screens behave as
the cases expect; they do not replace a person doing them on a real phone.

| Cases | What was run | Result |
| :--- | :--- | :--- |
| T-01, T-02 | First sign-in, forced password window: opens, rules, Escape and tap-outside do not close it, weak or unchanged password refused, Sign out, change, reload onto the Overview | 17/17 |
| T-02 on weak wifi | Password change with the connection dropped: "could not reach the server, so nothing was changed", window stays, typed password kept | Pass |
| T-08, T-09 | Repair request with a 7.5 MB photo: shrunk to 373 KB in 0.2 s, sent, confirmed | Pass |
| O-06, O-12 | Repair request on a dropped connection (message at 1 s, text kept) and a stalled one ("cannot tell whether it was saved" at 45 s, text kept) | Pass |
| T-15, T-16, O-08 | `/admin` and `/admin/income` as a tenant (sent back to `/tenant`); relaunch with the API unreachable (still signed in, no ₱0.00); sign out (token gone), then Back (no tenant data) | 8/8 |
| A-36 | Owner resets a tenant's password: button, confirmation before any request, one request, one-time reveal, gone after Done | 7/7 |
| A-36, live | The reset route against the live database: every refusal, success, old session ended, audit row without the password; the test tenant's slip restored after | 15/15 |
| T-03 to T-13 screens, live | Tenant Overview, Payments, Repairs and My details read with the seeded tenant's session against the live records, writes blocked | Matched the database (§4.3.3) |
| T-10, T-12 | Tenant: a note on a repair (Send disabled until typed, one request, box cleared, note in the thread); My details (name locked, Save disabled until something changes, one request, "Details saved") | Pass |
| A-11, A-14 | Rooms and rates: PH to P30,500 saves (one PATCH; an empty photo field leaves the unit's photo alone, checked in the route); Tenants > Edit > With roommates, 1: one PATCH, occupants 2 | Pass |
| A-12, A-31 | Move someone in (one request; the one-time password shown once, naming the tenant); Move them out (button disabled until the unit code is typed, in any case; one request; "free to let again") | Pass |
| A-23 | Record payment: OR number, part-payment rent and fee posted as typed; the next receipt opens empty; Covering from starts after the tenant's last verified period; a stalled save says "Not confirmed" at 45 s and keeps the form | Pass, after F-12 to F-14 |
| A-26 | Inquiries: Save reply disabled until something is typed, one request, box cleared; Close inquiry asks first, then marks it Closed | Pass |
| A-27 | Repairs: In progress saves; Mark resolved saves Resolved; Delete repair asks first, one request, "no longer on the board" | Pass |
| A-28 | P100 expense, split 60/40, edit, repeat an area: the split with the area left unchosen, and one area twice, are refused in words with nothing sent; with the area chosen it saves P60 / P40, total P100 | Pass, after F-18 (failed before) |

## 10. What this audit cannot say

- Nothing here was done **signed in as a tenant** through the screens, or by a person. That is
  tomorrow, and it is the part the manuscript needs most.
- The phone profile is Chrome's emulation, not a real phone. Tomorrow's Session 4 repeats the
  offline and install cases on real Android and iPhone handsets.
- The load test measured reads. Simultaneous writes are covered by the code guards in section 8 and
  by Session 3 tomorrow, not by a machine.
