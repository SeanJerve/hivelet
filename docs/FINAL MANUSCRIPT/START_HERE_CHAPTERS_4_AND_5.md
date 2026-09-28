# Start here: finishing Chapters 4 and 5

**For whoever picks up the manuscript next, and for the Claude session they ask "what do I do with
Chapters 4 and 5?"** Written 2026-09-28 by Sean's session, after reviewing both chapters against
the system as it stands that evening.

## Where the chapters stand

- **Both chapters are drafted and current with the system.** Every number in them was read from
  the live system or a check run, with the date beside it. Chapter 4 was last brought up to date
  on 2026-09-28 (page names, the repair features, the test-data removal, Table 8 re-run, Table 23
  with every fix through that evening). Chapter 5 was re-checked against it the same day.
- **What is left is data only people can produce:** the survey, the walkthrough, device timings,
  security scan grades, screenshots, and the team's answers in `QUESTIONS_FOR_THE_TEAM.md`.
  Nothing left in either chapter can be finished by writing alone.
- **So the job is: collect a piece of data, hand it to Claude, Claude fills the matching section.**

## If you are Claude, do this when asked

1. `git pull`, then read this file, `README.md` (the writing rules) and
   `TEAM_TASKS_WE_DO_OURSELVES.md` (who does what) in this folder.
2. Ask the person which of the items below they have data for. **Never fill a `[DATA PENDING]`
   cell from expectation.** If they have nothing yet, give them the next item to go and collect
   (the order below is the order that unblocks the most).
3. When they hand you data, fill the section named in the table, write its interpretation
   paragraph from the numbers, and then re-check Chapter 5's matching summary and conclusion
   (every claim in Chapter 5 must follow from a result in Chapter 4).
4. Run `npm run check:canon` after every edit here; it checks these files for the locked wording.
5. Commit in small pieces with messages that say what was filled and from what data.

## What fills each pending part

| Pending part | Filled from | Who produces it | Blocked by question(s) |
| :--- | :--- | :--- | :--- |
| §4.1.1 Table 5, the "CONFIRM WITH THE OWNER" cell | How enquiries arrived before the system | Ask Mrs. Da Silva | Q6 |
| §4.3.4 Table 10, functional walkthrough | Notes from the 26 steps in `TESTING_REHEARSAL.md` (did, expected, happened, pass/fail) | A team member, signed in. Claude cannot sign in | Q12 |
| §4.3.5 Table 11, responsiveness | Load times per screen, with device, browser, network and date | A team member on a real laptop and phone | Q13 |
| §4.4.1 respondents; §4.4.3 to 4.4.10, Tables 12 to 22 | The Google Form responses exported to Sheets | Team runs the ISO/IEC 25010 survey | Q7 to Q11 |
| §4.4.2 how the overall score is computed | The team's choice: A (average of the group averages, recommended) or B | The team | Q11 |
| §4.4.8 Security, supporting evidence | Grades and screenshots from the four passive scanners in `TEAM_TASKS_WE_DO_OURSELVES.md` §2 | A team member. **Passive scanners only** | none |
| §4.4.11 Table 23, the "Survey results" row | Low-scoring survey items, and what was changed because of them | Claude, from the survey | survey first |
| §4.5 Table 25, stages 4 and 5 | Whether the owner and tenants have been trained and handed over, and whether the system has become her main record | The team, with the owner | none |
| Figures 4 to 8 | Screenshots (directory, public catalogue and enquiry form, income ledger, repairs board, tenant portal on a phone). Use the vacant unit or blur names | A team member | none |
| Chapter 5's `[DATA PENDING]` parts | Written last, from the finished Chapter 4 | Claude | all of the above |
| Abstract | Needs the survey means | Claude | survey first |

## Order of work

1. **Get `QUESTIONS_FOR_THE_TEAM.md` answered.** 17 short questions, all still blank. Q1 and Q2
   (which Word file is newest and who edits it) decide where the finished text goes; Q7 to Q11
   decide how the survey runs.
2. **Apply `FIXES_TO_CHAPTERS_1_TO_3.md`** to the Word file. Chapters 4 and 5 assume those fixes
   (33 units, the real technology stack, the gateway named correctly).
3. **Walkthrough** (Table 10). Do it before the survey: a survey should rate a system that already
   works.
4. **Device timings** (Table 11) and **passive security scans** (§4.4.8). Same afternoon is fine.
5. **Survey** (Tables 12 to 22). The instrument is `docs/chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md`;
   change the group label "Resident" to "Tenant" in the Google Form and nothing else.
6. **Screenshots**, then **Chapter 5's pending parts** and the **Abstract**.
7. **Paste into the Word file.** Delete every TEAM NOTE block and every `[DATA PENDING]` marker
   that has been filled.

## What this machine can and cannot do

- **Without `.env` and `credentials/`** (both gitignored, never pulled): 13 of the 20 check suites
  run; the live database cannot be read. **Table 8 (§4.3.1) needs all 20**, so re-running it
  belongs on Sean's machine. It was last run on 2026-09-28, all 20 passed.
- **Nobody's Claude can sign in to Hivelet.** The walkthrough and anything that needs a signed-in
  screen is a person's job; Claude writes it up from their notes.
- **Never run active scans against the live site** (form-filling spiders, password guessing,
  OWASP ZAP active scan). It holds the owner's real records and locks real accounts.

## Facts that must stay right in the text

These are checked by `npm run check:canon` or have been wrong before:

- **33 units, 32 occupied.** There is no "2% annual increase" rule; the owner sets rates by hand.
- **Adyen with GCash is configured and working**; it runs on Adyen's **test account**, so it
  moves no real money yet. Never call the gateway a mock, a simulator, or pending.
- **The 50% Share** is described only as a system-computed figure equal to half that row's Rent
  Amount, kept for ledger parity with the owner's spreadsheet. Never name who it is for.
- **Water is ₱200 per occupant per month for every unit, Linda's LF and LB included.** Never
  "fixed" water.
- **"Tenant", never "Resident".** The ledger pages are **Monthly Income** and **Monthly
  Expenses**, the names of the sheets in her workbook.
- **Historical receipts stay as she wrote them** (decided 2026-09-26); the five flagged ones are
  reported, not corrected.

## What changed on 2026-09-28 that the chapters now reflect

- **B-80 decided:** the public FAQ keeps offering GCash and now says no real money is charged yet
  (Chapter 5, recommendation 5; Table 23).
- **B-81 closed:** the one tenancy ended without an end date got it (migration 059, applied); both
  checks now fail on any new one (Table 23).
- **B-71 closed:** migration 054 applied; voiding a GCash settlement now reverses it on the bill.
