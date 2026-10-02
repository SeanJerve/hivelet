# Next phase: after the 3 Oct evaluation

Sean's list, 2026-10-02, in the order it is meant to run. Each part says where to start, what is
already true, and what "done" means. Read `CLAUDE.md` first in any session; its rules still hold.

**After the evaluation:** move loydtest out of PH (Tenants > Move them out), so occupancy reads 32 of 33.
(B-98 was closed by Sean on 2 Oct.)

## 1. Code documentation and clean-up

**Start:** `git ls-files | wc -l`, then the root: about 20 handoff and session `.md` files sit there
(`CONTINUE_HERE.md`, `CONTINUE_FOR_LOYD.md`, `HANDOFF_NEXT_SESSION.md`, `PASTE_THIS_IN_CLAUDE_APP.md`,
`RESTART_THE_TUNNEL.md`, `SESSION_REPORT_2026-09-15.md`, `CLOUD_HANDOFF.md`, ...), plus `.agent/` (a
copied skills library, thousands of lines, not part of Hivelet), `docs/chapter 4 tenative/`, `video/`,
`database/migrations/APPLY_PHASE2.sql` and `_TEST_FIXTURE_production_drift.sql`, and 20+ remote
`worktree-agent-*` branches.

**Rules for it:**
- Move, do not delete, anything a document links to: `npm run check:copies`, `check:canon`,
  `check:rules` and `check:matrix` read documents and fail on broken references. Run all four after
  every move. Archive superseded handoffs into `docs/archive/` with a one-line index.
- Never touch `database/migrations/` numbering, `audit_logs`, or `database/FULL_DATABASE_SCHEMA.sql`
  (CLAUDE.md rules 1 and 2).
- Code: the dead code found so far is small (unused computeds such as `ledgerNote` in
  `AdminOverviewView.vue`, and `perOccupantWaterText` callers). Remove only with `vue-tsc` run after the
  last edit; a template can still use what the script no longer does (it happened on 2 Oct, b1e5235).
- Documentation for the defense: one `docs/ARCHITECTURE.md` (frontend, backend, database, the
  payment and offline flows, one diagram each), generated `docs/SCREEN_CONTRACT.md` (`npm run
  contract`), and the existing `README.md` brought up to the deployed system.

**Done when:** the root holds only what a new reader needs (README, CLAUDE.md, the four handoffs
named for seats, BLOCKED_FOR_SEAN, CLIENT_MEETING_QUESTIONS, TESTING_REHEARSAL), every check passes,
and the remote has only `main` and branches someone is using.

## 2. Chapter 5 and connecting all chapters

**Start:** `docs/FINAL MANUSCRIPT/START_HERE_CHAPTERS_4_AND_5.md`, then `GUIDE_ALIGNMENT_CH4_CH5.md`
and `FIXES_TO_CHAPTERS_1_TO_3.md`.

**What is already true (2 Oct):** every testing table in Chapter 4 (10, 11, 11A to 11D) matches its
raw file in `docs/TESTING_DAY/results/`; the scan evidence is in `results/evidence/`; nothing changed
on 2 Oct contradicts the chapters.

**What it waits for:** the **survey export** (Google Form > Responses > CSV). Then
`node scripts/survey/compute-survey.mjs responses.csv --method=A --out=tables.md` gives Tables 12 and
14 to 22; the interpretation paragraphs, Table 23's survey row, Chapter 5's conclusions and the
abstract follow from them. Also add the technical evaluators' findings and recommendations from
3 Oct to Chapter 4 (defects) and Chapter 5 (recommendations).

**Also for Chapter 4:** the 2 Oct security results (`docs/AUDIT_2026-10-02_SECURITY_ACCESSIBILITY.md`
§4), defects B-97 (evaluation account could not pay) and the CORS 500, and the iteration figures from
`ITERATIONS DOCUMENTATION/side-by-side/` (keep the sample-data note). Regenerate
`CHAPTER_4_RESULTS_AND_DISCUSSION.docx` from the markdown at the end.

**Done when:** no `[DATA PENDING]` left; every Chapter 5 conclusion points to a Chapter 4 result,
every Chapter 4 result to an objective in Chapter 1 and a method in Chapter 3; `check:canon` passes.

## 3. Studying the codebase for the defense

**Start:** `docs/SCREEN_CONTRACT.md` (every screen and the API calls it makes), `docs/02_BUSINESS_RULES.md`,
and `docs/13_AUDIT_JUDGEMENT_LOG.md` §3 (the deliberate design calls a panel is most likely to ask
about: bills raised on demand, the receipt guard, Linda's units outside the grand total).

**A useful way to do it:** each member takes one flow and can explain it end to end, screen to
database: recording a payment (`OnsitePaymentModal.vue` > `POST /admin/income-records` >
`monthly_income_records`), paying online (Adyen Drop-in > webhook > `settle_verified_payment`),
sign-in and roles (`authStore.ts`, `requirePermission`, RLS), offline (service worker,
`offlineCache.ts`), and the workbooks (`*ReportExport.ts`). Questions to rehearse: why Express in
front of Supabase instead of the browser reading it; why no data is ever deleted, only voided; how a
tenant is kept out of another tenant's records; what happens when the connection drops mid-save.

## 4. Final polish before the defense

Codebase: the evaluators' recommendations first, then the checks (`check:all` with `.env` on Sean's
machine), a last `npm audit`, the Supabase security advisor, Lighthouse on the live site. Manuscript:
one read-through for consistent terms (Boarding House, Monthly Income, 33 units; BR-035 wording;
never "mock" for the gateway), figures numbered and cited, the abstract last. The team: a dry run of
the presentation with the live site on a phone, and the answers to section 3's questions.
