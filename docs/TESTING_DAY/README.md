# Testing day: start here

**One folder for the real-world test of Hivelet** with the three groups of people who will use it:
**prospective tenants**, **current tenants** and **the landlady** (throughout this folder, "the
landlady" is Michelle, who runs the boarding house and holds the administrator account; the
boarding house and its business belong to Mrs. Fe Galang Da Silva). Written 2026-09-30 from the
system as it is live that day. Read this page first, then the files in the order below.

> **The approach, set by the adviser: observe, do not interview.** People use the system for real
> tasks while the team watches and writes down what happens: where they hesitate, what they say
> ("ang bagal", "saan ito?"), what they get wrong, how long it takes. Help only when they are stuck,
> and write down that you helped. Questions come at the end, in the survey, not during the tasks.

---

## 1. The flow of the day

| Step | What | Who | Time | Produces |
| :-- | :--- | :--- | :-- | :--- |
| 0 | **Morning checks** (backup, site health, nobody deploys) | Technical lead | 15 min | Evidence folder `00_admin_laptop` |
| 1 | **Consent** (Form 1) | Everyone, before anything | 3 min each | Signed forms (appendix) |
| 2 | **The video**: the Hivelet trailer, watched before touching the system | Each group | length of the video | Note on the observation sheet that it was shown |
| 3a | **Prospective tenants**: the public website only | 2 to 3 people who do not live there | 10 to 15 min each | Observation sheets, Part PR |
| 3b | **Current tenants**: their own accounts | 3 to 5 tenants | 20 to 30 min each | Observation sheets, Part T |
| 3c | **The landlady**: her real work on the admin side | **Michelle**, who runs the boarding house and signs in as the administrator (migration 063). Mrs. Fe Galang Da Silva owns it | 60 to 90 min | Observation sheet, Part A; the walkthrough (Table 10) |
| 4 | **Everyone at once** (tenants and landlady, same time) | Those still present | 20 min | Part C |
| 5 | **Survey** (ISO/IEC 25010), right after each person's own session | Every tester | 5 to 10 min | Google Form responses |
| 6 | **Team measurements**: timings, offline, security and speed scans | The team | 1 to 2 hours, any time | `ISO_METRICS_TOOLS_GUIDE.md` |
| 7 | **Clean-up and hand-over** | Technical lead | 30 min | `AFTER_TESTING.md` |

Order matters in one place only: **the landlady first, or at least before the tenants.** She enters
the receipts she holds (the ledger runs to 31 August 2026), and tenants then see balances that match
her book.

---

## 2. Read these first, in this order

| # | File | Why | Time |
| :-- | :--- | :--- | :-- |
| 1 | This page | The flow and the rules | 5 min |
| 2 | [`OBSERVATION_PROTOCOL.md`](OBSERVATION_PROTOCOL.md) | **How to observe instead of interview**, what to write, when to help, and the task cards for all three groups (prospects new here) | 15 min |
| 3 | [`../FINAL MANUSCRIPT/TESTING_DAY_GUIDE.md`](../FINAL%20MANUSCRIPT/TESTING_DAY_GUIDE.md) | The full guide: seats, the night-before checklist, accounts and first sign-in, consent, evidence naming, what to do if something goes wrong | 20 min |
| 4 | [`../FINAL MANUSCRIPT/TESTING_DAY_TEST_CASES.md`](../FINAL%20MANUSCRIPT/TESTING_DAY_TEST_CASES.md) | Every case (landlady A, tenants T, public P, together C, offline O, timings PF, security S, browsers CO) | skim |
| 5 | [`ISO_METRICS_TOOLS_GUIDE.md`](ISO_METRICS_TOOLS_GUIDE.md) | **The eight ISO/IEC 25010 characteristics**: what evidence each needs, and step-by-step how to use each website (security, speed, accessibility, uptime) | 20 min |
| 6 | [`../chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md`](../chapter%204%20tenative/ISO_25010_SURVEY_INSTRUMENT.md) | The survey questions; the Google Form is built by a script in two minutes (see step 12 of the guide) | skim |
| 7 | [`AFTER_TESTING.md`](AFTER_TESTING.md) | **What to do the moment testing ends**: clean-up, typing up the sheets, what to send Claude | 10 min |

Also useful: [`../FINAL MANUSCRIPT/USER_MANUAL_APPENDIX_K.md`](../FINAL%20MANUSCRIPT/USER_MANUAL_APPENDIX_K.md)
(the manual; hand Part 1 to tenants afterwards) and the team page
https://claude.ai/artifact/RMWYXYAYjKoBNgjnXrmnUi (the same kit, readable on a phone).

---

## 3. Print these

Open each in Chrome, then Print (A4). All are in `docs/FINAL MANUSCRIPT/` unless noted.

| File | What | How many |
| :--- | :--- | :--- |
| `TESTING_DAY_FORMS_PRINT.html` | Consent (English and Filipino), observation sheet, defect log, timing sheet, attendance, the landlady's acceptance certificate | Consent and observation sheet: one per person (prospects, tenants, landlady). The rest: two each |
| `docs/TESTING_DAY/OBSERVATION_PROTOCOL_PRINT.html` | The protocol with the task cards (section 4 starts a new page) | One per facilitator and observer |
| `TENANT_QUICK_GUIDE_PRINT.html` | The one-page tenant guide, two per sheet | One per tenant, after their session |
| `credentials/tenant-starting-passwords.html` (admin laptop only, never shared) | Each tenant's sign-in slip | Only the testing tenants' slips |

---

## 4. Five rules

1. **The system is live.** Everything saved is real. Tests use the vacant unit `PH` and names starting
   `TEST` or `REHEARSAL`; tenants' own actions are their own real data.
2. **Nobody types a password for someone else**, and nobody photographs one.
3. **No GCash payment is completed.** The gateway is on Adyen's test account: no money moves, but a
   finished payment waits in the landlady's queue and must be rejected.
4. **Write what happened, not what should have.** A failure written down honestly is worth more to
   Chapter 4 than a pass from memory.
5. **Nobody deploys while people are testing**, and nobody runs `npm run check:all` on the day:
   `check:api` signs in as the landlady and fills her Activity page with test entries. The read-only
   `node scripts/testing-day-watch.mjs --every=60` is the one to leave running.

---

## 5. What is already known before the day

- **Tenants' "Amount due" counts only recorded receipts.** The ledger runs to 31 August 2026; September
  is not entered. 12 tenants show two or more periods due because their August line in her workbook has
  no date paid. Say so before they sign in (the guide's CAUTION box).
- **Every tenant signs in with a starting password on a slip** and must choose a new one straight away
  (at least 10 characters, a letter and a number). The landlady can reset a forgotten one: Tenants >
  Edit > Reset password.
- **Inquiries are now a conversation** (migration 065, live 30 Sep): the visitor gets a private link and
  a reference code, Michelle answers from Inquiries (**Save reply**), and the visitor reads it and writes
  back without an account. There is no online reservation or deposit. Prospects test PR-01 to PR-08b;
  the team runs P-06 and P-06b.
- **Measured the evening before and the morning of** (the audit report,
  `../FINAL MANUSCRIPT/AUDIT_REPORT_2026-09-30.md`): 0 errors with 12 users at once; offline 20/20;
  Mozilla Observatory A+, SSL Labs A+; no accessibility violations on 15 screens; desktop speed 95.
