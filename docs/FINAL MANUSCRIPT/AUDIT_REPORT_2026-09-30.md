# Hivelet audit report, 29-30 September 2026

**The end-to-end audit before and during the first test with the owner and real tenants.** Prepared
30 September 2026 by Claude on Loyd's machine, working alongside Sean's session. Every figure was
measured on the live system (`https://hivelet.vercel.app`, Supabase PostgreSQL) on the date given;
nothing is estimated. The detailed working is `PRE_TESTING_AUDIT_2026-09-29.md` (findings F-1 to
F-21, section numbers below refer to it).

---

## 1. Verdict

**Hivelet is fit for the acceptance test with the owner and tenants, with two conditions:**

1. **Tell tenants what "Amount due" counts.** It reflects only receipts the owner has recorded. After
   today's update the ledger runs to the end of August 2026; September is not entered yet, so every
   tenant shows at least one period due, and 12 show two or more (their August line in her workbook
   has no date paid).
2. **Decide B-86** (the imported expense dates) before Monthly Expenses figures are quoted in the
   manuscript for 2025 against 2026.

Nothing found is a data-loss, money-miscalculation or cross-tenant exposure defect. Every defect
found in the system during the audit was fixed and verified the same night or morning.

---

## 2. Scope and method

| | |
| :--- | :--- |
| When | 29 Sep 2026 21:30 to 30 Sep 2026 about 11:00 (Manila) |
| Where | The live site and live database, a local build connected to the live database, and a local build with every server answer faked |
| How | The 20 automated check suites; scripted browser tests (Playwright on Chrome 154) for offline, weak signal, installation, simultaneous users, timeouts and screen flows; axe-core 4 (WCAG 2 A/AA); Google Lighthouse 12.8; passive external scans (Mozilla HTTP Observatory, Qualys SSL Labs); read-only database queries; reading the code |
| Machine | Acer Nitro ANV15-52, Intel Core i5-13420H, 16 GB, Windows 11, home broadband, Philippines |
| Safety | Backups before every data change (`backups/2026-09-29T13-53-21`, `backups/2026-09-30T02-35-46`). Every browser test blocked writes inside the browser unless the test was of a write, and then used a faked server or the seeded test tenant, restored afterwards. On the testing day nothing signed in as the owner, so her Activity page shows no audit traffic |
| Standard | ISO/IEC 25010 product quality characteristics, the frame of Chapter 4, §4.4 |

---

## 3. Results by ISO/IEC 25010 characteristic

### Functional suitability

- **Automated suites, 30 Sep:** 18 of 20 run, **18 pass** (ledger integrity on 952 income rows,
  report reconciliation 548/0, payment gateway, billing, schema, fields, endpoints, wording and
  interface checks). `check:api` and `check:relations` are not run on the testing day because they
  sign in as the owner; their last run (29 Sep, before the tenant reset) passed.
- **Tenant screens against the database, 29 Sep:** Overview, Payments, Repairs and My details read
  with a tenant session matched the live records figure for figure (unit, rate, occupants, rent plus
  ₱200 per occupant, the period receipts reach, amount due). The owner's screens were matched on
  26 Sep. (Chapter 4, §4.3.3.)
- **New function:** the owner can reset a tenant's password (Tenants > Edit > Reset password), since
  none existed. Verified 15/15 against the live database and 7/7 in the interface.

### Performance efficiency

| Measure | Result |
| :--- | :--- |
| 12 simultaneous visitors, live public pages, 60 s | 1,085 requests, **0 errors**, 95th percentile ≤ 0.52 s |
| 6 simultaneous readers of the owner's data, live database, 45 s | 285 requests, **0 errors**, 95th percentile ≤ 0.80 s |
| Lighthouse, landing page, desktop (median of 3) | **Performance 95** (76 before F-19), LCP 1.4 s, layout shift 0 |
| Lighthouse, landing page, simulated slow phone | Performance about 70, LCP about 5.6 s (text waits for the page's code; Chapter 5 rec. 11) |
| Slow 3G, public page, returning visitor | Units on screen in 0.3 s (installed app's own files) |

### Compatibility

Chrome desktop and phone emulation throughout; Edge, Firefox, Safari and real phones are the testing
day's cases CO-01 to CO-06. The exported Excel workbooks reconcile with the database (548/0).

### Usability

- **No sideways scroll and no WCAG 2 A/AA violation** on the 7 public pages (360, 390, 1366 px) or the
  owner's 8 screens (360, 390, 768, 1366 px), axe-core 4. First measurement of the owner's screens on
  phone widths with real records since she found them hard to use on 23 Sep.
- Lighthouse accessibility, best practices and SEO **100** on phone and desktop.
- Fixed: the forced password window now asks for the "Starting password (the one you just signed in
  with)" and offers Sign out (F-8); a normal phone photo now attaches to a repair request (7.5 MB
  shrunk to 373 KB in 0.2 s, F-11); the landing page no longer jumps while loading (F-19); Sean's
  session fixed the owner-side equivalents (F-12 to F-18).

### Reliability

- **Offline and weak signal (live, phone profile): 20/20.** The app opens on ten addresses without a
  connection, says "No connection" and "Back online", keeps no personal data on the device, and
  shows the public list from its cache after a stalled server (3.1 s).
- **A request can no longer hang (F-3):** reads stop at 25 s, saves at 45 s, and a save that timed
  out says it cannot tell whether it arrived, so it is not sent twice (F-9, F-12).
- **Machine rehearsal of the day's cases:** first sign-in 17/17; `/admin` as a tenant, offline
  relaunch, Back after sign-out 8/8; dropped and stalled saves keep what was typed.
- **Site availability on the testing day:** watched every minute from 10:20; `/api/health` answered
  200 throughout (0.39 s at 10:51).

### Security

| Measure | Result |
| :--- | :--- |
| Tenant accounts | **All 32 reset**, 29 Sep: each has its own starting password, must choose a new one at first sign-in, every older session ended (F-1). The shared demo password is dead |
| Mozilla HTTP Observatory | **A+, 115/100, 12/12** (30 Sep 02:51 UTC, after the policy was enforced; B, 75 the night before) |
| Qualys SSL Labs | **A+**, TLS 1.2 and 1.3 only, HSTS |
| Role separation | A tenant typing `/admin` is sent back; a foreign request id says "Not found" |
| Test suites vs real accounts | `check:api` no longer tries a stale or administrator password on a real tenant (F-4, with Sean's follow-up) |

### Maintainability and portability

- Every tool used is committed and re-runnable: `scripts/field-tests/` (offline, load, layout and
  accessibility, owner screens), `scripts/testing-day-watch.mjs`, `scripts/survey/` (survey, task,
  walkthrough and timing tables), `database/import-ledger-update.mjs`.
- Installable from the browser (manifest, service worker, maskable icons); 67 files cached for
  offline use.

---

## 4. Data: the ledger brought up to the end of August (migration 062)

The owner's updated workbook was compared line by line with the database, and only what was missing
was added. Nothing existing was changed or removed.

| | Added | Check |
| :--- | :--- | :--- |
| Income | 15 August receipts, rent ₱124,250 + water ₱3,600, all linked to their tenants | Income ledger 952 live records, remitted **₱8,214,100.00** = ₱8,086,250.00 + ₱127,850.00 |
| Expenses | 34 August entries, **₱234,244.78** | Equal to her August TOTALS row area by area (Boarding House 80,075.93; Main House 18,010.85; Back Apartment 7,000.00; Personal 129,158.00) |

Left out on purpose: 16 August lines with no date paid (tenants who have not paid), 1E's line
carried forward from July, 7 older lines the database holds corrected. Two typos read as meant (1H's
date, B1F's period year). A second run finds nothing to add.

---

## 5. Open items

| # | Item | Owner |
| :--- | :--- | :--- |
| B-86 | Imported expense dates: typed dates a day early; 647 blank-dated entries on the 1st of a 2025 month, 2026 ones included; one June 2026 electric bill differs from her workbook | Decision (team with the owner), then a migration |
| B-82 | The suites still use a real tenant as their fixture; they need a test tenant that does not appear in the owner's list | Sean |
| - | September 2026 receipts, and the 16 August tenants as they pay: entered by the owner in Monthly Income, not imported again | Owner |
| - | Real-device measurements (Table 11), the survey (Tables 12 to 22), the walkthrough (Table 10), tenant tasks (Table 11C) | The testing day |
| - | Mobile landing speed (about 5 s to text on a slow phone) | Chapter 5, rec. 11 |

---

## 6. Evidence

`PRE_TESTING_AUDIT_2026-09-29.md` (sections 1 to 10, findings F-1 to F-21); Chapter 4 §4.3.3,
§4.3.6, §4.4.8 and Table 23; `database/migrations/062_...sql`; `BLOCKED_FOR_SEAN.md` B-82 to B-86;
backups named above (on Loyd's laptop, gitignored).
