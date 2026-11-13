# Prompts for finalizing the paper (Lloyd)

Two prompts to paste into Claude Code on Lloyd's laptop, in the hivelet folder. Paste each one as it
is. Written 12 November 2026, when the paper moved from writing to finalizing.

---

## Prompt 1: say this first, in every new session

```text
Before doing anything, get up to date and tell me where we stand. Do not change any file yet.

1. Pull: git pull --ff-only origin main. If it fails, tell me why and stop.
2. Read CLAUDE.md, FINAL/00_READ_ME_FIRST.md, FINAL/00_TO_DO_CHECKLIST.md and
   FINAL/00_PROMPTS_FOR_FINALIZING.md.
3. Read the last 20 commit messages (git log -20). The commit messages hold the reasoning.
4. Tell me in plain words, short: what changed since my last session, which checklist items are
   still open, and which of them are mine (Lloyd). Then wait for my instruction.

Rules for the whole session: never edit the numbered files in FINAL/ by hand (edit FINAL/_src/ or
docs/FINAL MANUSCRIPT/ and run node scripts/manuscript/build-final.mjs); never write to the live
database; the repository is public, so no names of tenants, no signed forms and no scans; commit in
small pieces with real messages and push to main when a piece is done.
```

---

## Prompt 2: the final realign-and-check pass (give this to Fable)

Run it once, after Prompt 1, before Lloyd replaces the chapters in the team's Word file. It may take
a while. It changes the sources only where something is wrong, and says what it changed.

```text
We are finalizing the Hivelet capstone paper for the defense in the last week of November 2026.
Do one careful pass that makes every part of the paper agree with every other part and with the
recorded data, then rebuild and push. Work through the steps in order. Fix what is wrong; do not
rewrite what is right. Do not invent any number, date, name or result: every figure must come from
the data files or the existing paper.

THE FIXED FACTS (the paper must say exactly these, everywhere they appear):
- The property: 33 units, 32 occupied by tenants (unit PH holds the team's test tenant until after
  the defense). There is no "2% annual increase" rule.
- Michelle manages the boarding house for its owner: the paper calls her "the landlady". "The owner"
  only for the proprietor ("the owner's merchant onboarding documents", and the locked BR-035 line
  "ledger parity with the owner's historical spreadsheet").
- Booking and reservation management means: a public unit list, an inquiry the landlady answers, a
  unit she can mark Reserved, and moving the person in from the inquiry. Nothing is booked or paid
  online.
- GCash through Adyen works end to end in Adyen's test environment, takes no real money, is optional
  and not live, because going live needs the owner's merchant onboarding documents. Never "mock",
  "simulator", "pending consultation" or "under development".
- Tests: 82 of 83 executed tests passed (98.8 percent), no critical defect. The re-run after the redesign, 4 to 13 November 2026: of the 114 test cases, 99 passed, the 8
  timings were taken, 7 could not be run, none failed (Appendix L, last part). 51 optimizations.
- First round (Iteration 2, 30 September to 18 October 2026): the landlady, 3 tenants and 1
  prospective tenant (users 4.75) and 5 technical evaluators (4.34); all ten together 4.59. Three
  tenants: 34 task attempts completed, 31 without help.
- Second round (Iteration 3, the redesigned system): tasks by 10 tenants (151 of 160 without help,
  94 percent) and 4 prospective tenants (31 of 32, 97 percent), no times recorded. Survey: the
  landlady, 10 tenants and 3 prospective tenants, users 4.84 overall (Functional Suitability 4.80,
  Performance Efficiency 4.86, Compatibility 4.79, Usability 4.80, Reliability 4.78, Security 5.00,
  Portability 4.83; pooled 4.80). Three technical evaluators on 12 November 2026, on the live system,
  signed in by a team member who stayed with them, given no password: 4.90 overall (Functional
  Suitability 4.93, Performance Efficiency 4.89, Compatibility 5.00, Usability 4.87, Reliability 4.83,
  Security 4.93, Maintainability 4.73, Portability 5.00). Three answers are left out: two prospective
  tenants who answered another group's section, and one the team made while testing the form.
- The landlady accepted the system and signed the acceptance form on 12 November 2026 (Appendix O).
- The tenants and the landlady signed consent forms; prospective tenants and technical evaluators
  agreed through the privacy notice that opens the Google Form, anonymously.

STEPS
1. Recompute the survey from the data, do not trust the text: run
   node scripts/survey/compute-survey.mjs on docs/TESTING_DAY/results/ROUND_2_ISO_IEC_25010_Software_Quality_Assessment.csv
   joined with the rows of TECHNICAL_2026-11-12_ISO_IEC_25010_Software_Quality_Assessment.csv, and on
   ROUND_1_ISO_IEC_25010_Software_Quality_Assessment.csv. The users' composite is the mean of the
   landlady's, tenants' and prospective tenants' group means. Confirm every figure above. If the data
   disagrees with a figure above, stop and tell me; do not change the data.
2. Read the whole paper in order: FINAL/01_ABSTRACT.md to FINAL/08_APPENDICES.md and
   FINAL/appendices/. For every number, date, count and name of a group, check it agrees with the
   facts above and with every other place it appears (abstract, Chapter 1 objectives, Chapter 3
   respondents and statistical treatment, Chapter 4 tables and text, Chapter 5 summary, conclusions
   and recommendations, Appendices M and O). Check every table and figure cited exists with that
   number, and every in-text citation is in the references and every reference is cited.
3. Check the wording rules: no em dashes, en dashes or semicolons in the prose; "Tenant", never
   "Resident"; no email address asked for or shown anywhere; the landlady and owner rule above; the
   locked BR-035 wording; the Adyen wording; every sentence there for a reason.
4. Fix what is wrong in the sources only (FINAL/_src/ or docs/FINAL MANUSCRIPT/), never in the
   numbered FINAL files. Then run, in order:
     node scripts/manuscript/build-final.mjs
     node scripts/manuscript/build-slides.mjs
     node scripts/manuscript/build-manuscript-docx.mjs
     node scripts/manuscript/build-defense-folder.mjs
     npm run check:canon
   and read every result. A failed check is not done.
5. Bring the slides (scripts/manuscript/build-slides.mjs), the study guides (FINAL/STUDY_GUIDE_*.md)
   and FINAL/DEFENSE_PRESENTATION_SCRIPT.md in line with the paper: same figures, same words.
6. Update FINAL/00_TO_DO_CHECKLIST.md: tick what is done, and add anything you found that only a
   person can settle, said in plain words with what to do.
7. Commit in small pieces with real messages, push to main, and pull in the main folder.
8. Report to me, short and plain: what you checked, what you changed and why (one line each), what
   you found but did not change, and what is left for a person. Then list exactly what I must change
   in the team's Word file (checklist item 6b), in order.
```

---

## What finalizing still changes (for the team)

The paper's text is done and checked. What finalizing changes is the **team's Word file**, by hand,
in this order (checklist item 6b):

1. Replace everything from **1 INTRODUCTION** to the end of the appendices with the same part of
   `FINAL/CLAUDE MANUSCRIPT/CLAUDE MANUSCRIPT.docx`, rebuilt after Prompt 2.
2. Paste the Abstract onto the Abstract page.
3. Put the scans in: Appendix O (the landlady's signed form), Appendix A (letter of request, after Sir
   Jayvee signs), Appendix B (adviser appointment), Appendix P (the blank consent form PDF).
4. Put the appendices in order A to R, then the five CVs.
5. Add the Acknowledgement (checklist item 7).
6. Fill the defense date and room once scheduled, and write Prof. Rodriguez's degrees one way.
7. Update the table of contents last.
8. Save a PDF and read it once from start to end before printing.
