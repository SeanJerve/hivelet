# After testing: what to do, in order

**For the technical lead and the team, the moment the last tester leaves.** Written 2026-09-30.
Four stages: **collect** (before anyone goes home), **clean up** the live system, **type up** the
sheets into four small files, and **hand over** to Claude, who turns them into Chapter 4.

Nothing here needs code changes. Everything that would is written down for Sean instead.

---

## Stage 1. Before anyone leaves (15 minutes)

- [ ] **Every observation sheet is complete.** Each case has a result code (P, PH, F or NT), a
      start and end time, and the observer's signature. A blank result becomes NT, not P.
- [ ] **Consent forms** (Form 1) are signed for every person on the attendance sheet (Form 5),
      including prospects. Keep them together.
- [ ] **The landlady's acceptance certificate** (Form 6). Ask Michelle to sign only if she is
      willing after seeing the system; an honest "not yet" is a result too. Fill the date and the
      commit that was live (`git log -1 --format=%h origin/main`).
- [ ] **Photos and recordings** are copied off every phone into the evidence folder on the shared
      drive the same hour (guide §7: `CASEID_who_device_HHMM.ext`). Phones leave; files do not come
      back.
- [ ] **Survey count.** Open the Google Form's Responses tab and check the number matches the
      number of people who tested. Anyone missing: send them the link now.
- [ ] **Tenants keep their slip** (or throw it away themselves) and get the one-page tenant guide.
      Nobody on the team keeps a photo of a slip.

---

## Stage 2. Clean up the live system (30 minutes; the landlady and the technical lead together)

The system is live. **Only test records are removed; real ones stay as real work.**

| What | Where (admin side) | How |
| :--- | :--- | :--- |
| Repair requests with **TEST** in the title | **Repairs** | Open it, **Delete repair**, confirm. A tenant's real request stays: Michelle handles it as real work |
| Inquiries with **TEST** in the message | **Inquiries** | Open it, **Close inquiry** (it stays on record as "Nothing came of it"; there is no delete, which is right) |
| A GCash payment waiting for verification (someone finished one by mistake) | **Monthly Income**, the verification queue | **Reject**, confirm. Adyen's test account moved no money. Write it in the defect log |
| Anything named **REHEARSAL**, and unit **PH** | Tenants, Monthly Income | Undo in the order of the guide §8 (vacate, never delete a profile; void the receipt; PH back to ₱30,000) |
| The bill raised in **A-20** on PH, if that case was run | Nowhere on screen | Write down its date and amount (Activity page, "Bill created"). **Do not try to remove it**: no screen deletes a bill. Sean removes it later with a reviewed migration |

Then the read-only checks (both safe; neither signs in or writes):

```bash
node scripts/testing-day-watch.mjs
```

```bash
npm run check:ledger
```

- The ledger check should end **ALL CHECKS PASSED**, with **952 income rows plus the real
  receipts Michelle recorded today**. Write down which receipts were real (receipt number and
  unit), because the difference must be exactly those.
- The watch shows how many tenants activated their account, any account still **LOCKED**, and any
  GCash payment still waiting. A locked tenant unlocks on their own when the time on the sign-in
  message runs out; if they also forgot the password, Michelle uses **Reset password** (Tenants >
  Edit) and gives them the new slip.
- Screenshot both into `00_admin_laptop/`.
- **Do not run `npm run check:all`** until Sean says so. Its `check:api` and `check:relations` sign in
  as the landlady and put test entries on her Activity page. Some tenant checks also answer 428
  now that tenants have changed their starting passwords; that is expected.
- Stop the watch if it is running (Ctrl+C).
- Tell the group: **"Testing finished."** Pushes to main resume **when Sean says**, not before.

---

## Stage 3. Type up the sheets (the same evening, one to two hours)

Make one folder **outside the repository**, next to it: `Desktop/hivelet/hivelet-results-2026-09-30/`
(the repository is `Desktop/hivelet/hivelet`, so from inside it the folder is
`../hivelet-results-2026-09-30`).
The typed files hold testers' words, and the repository is not the place for them. Tester codes
only, never names: **PR1, PR2 ...** prospects, **T1 ... T5** tenants, **L** the landlady.

Copy each template from `scripts/survey/`, delete its example row, and fill it in:

| File to make | Copy of | One row per | Columns |
| :--- | :--- | :--- | :--- |
| `observations.csv` | `uat-observations-template.csv` | person per task (prospects PR-01 to PR-09, tenants T-01 to T-18, landlady A cases) | `tester, device, case, start, end, success, errors, help_given, said` |
| `walkthrough.csv` | `walkthrough-results-template.csv` | walkthrough step the landlady did (A-05 to A-32, or Table 10 step numbers) | `step, result, actual, notes` |
| `timings.csv` | `timings-template.csv` | timing case per device (PF-01 to PF-08; laptop, phone) | `case, device, run1, run2, run3` |
| `responses.csv` | the survey export | respondent | as Google exports it |

**Rules for typing, so the numbers are right:**

- `success` is exactly **P**, **PH**, **F** or **NT**. PR-09 (the open question) is always **NT**.
  Anything else stops the script with a warning.
- `start` and `end` are clock times, `10:02` or `10:02:10`. Leave both blank if nobody timed it.
- `errors` is a number (wrong turns). Blank means 0.
- `help_given` says the level and the time: `level 2 at 10:14`.
- `said` keeps the tester's own words, in the language they used, with the code in front:
  `C "saan ang bill ko?"`. Codes: **S** slow, **C** confusing, **N** lost their way, **E** error,
  **+** liked it.
- `result` in the walkthrough is exactly **Pass**, **Fail**, **Pass after fix** or **Not done**.
- Timings use a decimal point (1.8), not a comma.
- Save as **CSV UTF-8** (Excel: File > Save As > "CSV UTF-8"). Plain "CSV" in Excel can garble ñ
  and Filipino text.

**The survey export:** Google Forms > **Responses** > the green **Sheets** icon > in the sheet,
**File > Download > Comma-separated values (.csv)**. Save it as `responses.csv`. Do not edit it or
sort it.

**Also collect, into the same folder or the evidence folder:**

- The **defect log** (Form 3). A clear photo of each page is enough.
- **Part C** (everyone at once) and **Part CO** (browsers and devices): result per row, as written
  on the sheet. A photo is enough.
- The **scan results** from `ISO_METRICS_TOOLS_GUIDE.md`, each a screenshot showing the grade **and
  the date**: Mozilla Observatory, securityheaders.com, SSL Labs, PageSpeed (mobile and desktop),
  WAVE, PWABuilder, UptimeRobot (uptime % and response time for the day), SonarCloud if it was run.
- Anything **Michelle** said out loud that stood out, especially a complaint, in her words.

---

## Stage 4. Run the numbers (5 minutes; optional, Claude can do it)

From the repository folder (`Desktop/hivelet/hivelet`). Each prints to the screen and changes
nothing unless `--write` or `--out` is given.

```bash
node scripts/survey/compute-uat.mjs ../hivelet-results-2026-09-30/observations.csv
```

Table 11C (tenants), a proposed Table 11E (prospects), and every case, device and quote.

```bash
node scripts/survey/compute-survey.mjs ../hivelet-results-2026-09-30/responses.csv --method=A --out=survey-tables.md
```

Tables 12 and 14 to 22, and every open comment. Check the line under Table 12: "N response(s) had
an unrecognised answer to Q1" means the form's Q1 wording was changed by hand; send the file anyway.

```bash
node scripts/survey/fill-walkthrough.mjs ../hivelet-results-2026-09-30/walkthrough.csv
```

```bash
node scripts/survey/fill-timings.mjs ../hivelet-results-2026-09-30/timings.csv
```

These two print Table 10 and Table 11 as they would be filled. **Leave `--write` to Claude**: it
edits the chapter, and the chapter is shared.

---

## Stage 5. Hand over to Claude

Open a Claude Code session in the repository and paste this, with the folder filled in:

> Testing is done. Results are in `<folder>`: observations.csv, walkthrough.csv, timings.csv,
> responses.csv, the defect log photos, Part C and CO photos, and the scan screenshots.
> Testers: N prospects, N tenants (units ...), and Michelle. Real receipts Michelle recorded today:
> (list). Anything unusual: (one or two lines). Follow `docs/TESTING_DAY/AFTER_TESTING.md`, Stage 6.

Stage 6 is what Claude does with it. It is listed so the team can check the work.

---

## Stage 6. What becomes of the results (Claude, then the team reviews)

| Result | Goes to | Notes |
| :--- | :--- | :--- |
| `observations.csv`, tenants | **Table 11C** and its paragraph (§4.3) | Completion without help = effectiveness; median time = efficiency |
| `observations.csv`, prospects | **Table 11E (proposed)** or a paragraph in §4.3 | Chapter 4 has no prospects table yet: the team chooses (see the decisions below) |
| `observations.csv`, the landlady; `walkthrough.csv` | **Table 10** (`fill-walkthrough.mjs --write`) and its paragraph | A step with no line stays [DATA PENDING]; nothing is filled from expectation |
| `timings.csv` | **Table 11** (`fill-timings.mjs --write`) | Medians of three runs |
| Part C sheet | **Table 11D** | Typed from the sheet, row by row |
| Part O / offline on real phones | The paragraph after Table 11D, compared with **Table 11A** | |
| Part CO | Compatibility paragraph in §4.4 | Which devices and browsers were really used |
| `responses.csv` | **Tables 12 to 22** and the interpretation under each | Method A unless the team decided otherwise (QUESTIONS_FOR_THE_TEAM Q11); stated in §4.4.2 |
| Scan screenshots | **§4.4.8** and the Security, Performance, Usability, Portability and Reliability paragraphs | Grade plus date, as each tool showed it |
| Quotes tagged S, C, N, E | The interpretation paragraphs; each real problem becomes a row in **Table 23** (issue, fix, status) | A fix nobody has made yet is "open", not "fixed" |
| Defect log | **Table 23**, and `BLOCKED_FOR_SEAN.md` for anything needing code | Numbered B-88 onward (B-87 is the last used) |
| All of the above | **Chapter 5**: findings, conclusions (objective by objective), recommendations; the **Abstract**'s numbers | Only after Chapter 4 is filled |
| Consent forms, certificate, photos (blurred) | The appendices | Blur names, phone numbers, emails and amounts first |

**Two things to write into the method (Chapter 3), because they happened:**

1. **Every tester watched the same Hivelet trailer before using the system.** Say so, with its
   length, in the procedure; say it was the only introduction given.
2. **Prospective tenants were a fourth group** (public website and the inquiry conversation, no
   account). The respondents section, Table 12 and the survey description must
   include them. Claude adds this to `FIXES_TO_CHAPTERS_1_TO_3.md`.

---

## Decisions the team makes (not Claude)

1. **Prospects in Chapter 4:** a new Table 11E, or two sentences in §4.3? (A table if three or more
   prospects tested; otherwise text.)
2. **Composite method** for the survey, if not already settled (Q11). With prospects, method A
   averages four group means for six characteristics and three for Security and Maintainability.
3. **What counts as a defect to fix before the defense**, and what goes to Chapter 5 as a
   recommendation. Sean's call on anything that needs code.

---

## Waiting for Sean (do not do these here)

- **B-86, migration 064** (expense dates as she wrote them): written and tested, **not applied**.
  Sean runs the backup, the diagnostic, then 064.
- **The A-20 bill on PH**, if raised: removal by a reviewed migration.
- **September receipts:** Michelle records them on screen as real work (A-23). The ledger in the
  system then runs past 31 August; nothing is imported for September.
- Any defect from today that needs code, queued in `BLOCKED_FOR_SEAN.md`.
- Pushes, deploys, and `check:all`: at Sean's word.
