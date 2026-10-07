# 6. Implementation Plan

What was built, in what order, and what gets built next. The record of the past is the git history
(1,595 commits from 24 July to 7 October 2026) and `docs/12_ITERATION_HISTORY.md`; the forward plan
comes from Chapter 5's recommendations and the open items in `BLOCKED_FOR_SEAN.md`.

---

## 1. What has been built

The system was built in three Agile iterations (Chapter 3, §3.2).

| Phase | Dates | What was built | Exit |
| :--- | :--- | :--- | :--- |
| **Iteration 1: Construction** | 24 Jul to 28 Aug 2026 | Vue and Express on Supabase; admin and tenant portals and the public site; four roles over one permission matrix with row-level security on every table; the two ledgers in her layout; repairs, inquiries, notifications, audit trail; her workbook moved in (937 income rows, 1,327 expense allocations) | A working system with her real records |
| **Iteration 2: Verification and correction** | 12 to 14 Sep 2026 | Checked that the system and its documents said the same thing: 22 recorded errors corrected; the business rule register rebuilt; automated check suites; the Excel exports | Every claim traceable to evidence |
| **Iteration 3: Consolidation and testing** | 15 Sep 2026 onward | The owner's answers (rates, overdue rule, water, Linda's units); Adyen with GCash working end to end on the test account (26 Sep); the screen-versus-database audit (6 defects fixed); the phone review fixes; live updates every 5 seconds; offline reading; the testing day (30 Sep); the technical evaluators' 14 comments (3 to 5 Oct); recent actions; ISO-aligned evaluation and the survey (6 to 7 Oct); breached-password check | Chapter 4 and 5 complete |

Database changes: numbered migrations 001 to 079 (079 written, waiting on B-100), and 080 written on 7 Oct (B-104).

## 2. Before the defense (in this order)

| # | What | Who | Why first |
| :--- | :--- | :--- | :--- |
| 1 | Confirm Ann Kristine Diaz did not move out, then run **079** after a backup (B-100) | Sean | The owner's real books are wrong: 3G shows vacant, a ₱8,700 receipt is voided, February expenses read ₱25,000 high |
| 2 | Make the repository private (B-103, B-98) | Sean | Survey respondents' names are in its history |
| 3 | Run **080** (B-104) | Sean | Closes the audit-trail TRUNCATE gap; one line, changes no row |
| 4 | Put the current admin password in `credentials/creds.txt` (B-101), then `npm run check:all` | Sean | Four suites cannot sign in; Table 8's "all 20 pass" dates from 29 Sep |
| 5 | Re-test walkthrough step 23b on the owner's laptop | A team member | The one open defect, and the lowest Reliability rating points at it |
| 6 | Paste Chapters 4 and 5, the abstract and FIXES A to H8 into the Word file; renumber tables per chapter; regenerate the lists; delete team notes | Docs lane | The manuscript is still the 18 Sep version |
| 7 | Fix the appendices: L's "&lt;System Name&gt;"; D to H to match Figures 6 to 9; J as the survey used; add the consent form | Docs lane | |
| 8 | Hand over the user manual (Appendix K) to the owner, screen by screen, and note the date | Team, with the owner | Deployment stage 4, and her own lowest rating |
| 9 | Demo with the `loydtest` account, never the administrator's | Everyone | Every admin write lands in her books |

## 3. After the defense: what gets built next, in order

Ordered so that each step makes the next one safer.

| # | What | Basis | Size |
| :--- | :--- | :--- | :--- |
| 1 | **Service modules**: move the database work out of the route handlers (154 of 204 calls), one module per kind of record; split the 5,120-line `admin.ts` | Lowest-rated characteristic, Maintainability (Ch. 5, rec. 6) | Large; do it behind the existing check suites, one router at a time |
| 2 | **Automated browser tests** that sign in and run the 26 walkthrough steps against a copy of the data | Ch. 5, rec. 4 | Medium; makes step 1 safe |
| 3 | **Sign-in token in an httpOnly cookie**, and a **second factor** for the administrator | Ch. 4 §4.4.8; Ch. 5, rec. 3 | Medium; same-origin, so SameSite cookies plus the existing origin check |
| 4 | **Adyen to live**, with refunds of rejected GCash payments from inside the system | Ch. 5, rec. 3; B-24 | Medium; needs the live merchant account |
| 5 | **Faster first load on phones**: pre-render the public page, self-host the two fonts, reserve the space each figure takes | Ch. 5, rec. 5 | Small to medium |
| 6 | **Tenant sees their deposit** | A tenant's survey comment (Table 23) | Small |
| 7 | **Owner's open questions** answered and applied (move-in dates, 2f's missing months, F2F's headcount, categories) | Ch. 5, rec. 1; B-102 | Depends on her answers |
| 8 | **Full transition**: the system becomes her main record once both records agree | Deployment stage 5 | Her decision |

## 4. How each piece gets built (with Claude or by hand)

1. `git pull`, then read `CONTINUE_HERE.md` section 0.0 and `BLOCKED_FOR_SEAN.md`.
2. Write the change in the lane it belongs to (`backend/src/` and `database/migrations/` on Sean's side;
   `frontend/src/` and `docs/` on the other).
3. Any change to the database or to live data is a **new numbered migration**, run after
   `npm run backup`. Never an ad-hoc `UPDATE`.
4. Verify against the real thing: `npm run check:all` (read the summary table), open the screen at 375
   and 1440 px, and for a new check, break what it guards on purpose and see it fail.
5. Commit small with a message that says why; pull before pushing; Vercel deploys `main`.
6. Update the document that owns the fact: the PRD for a feature, the app flow for a page, the design
   brief for a look, the schema document for a table, this plan for the order.

## 5. The six documents

| # | Document | Answers |
| :--- | :--- | :--- |
| 1 | `01_PRODUCT_REQUIREMENTS.md` | What it does, feature by feature |
| 2 | `02_TECHNICAL_REQUIREMENTS.md` | What it is built on, and the rules for changing it |
| 3 | `03_APP_FLOW.md` | What happens on each click, and which page comes next |
| 4 | `04_DESIGN_BRIEF.md` | Colours, fonts, layout and words |
| 5 | `05_DATA_SCHEMA_AND_ACCESS.md` | Where the data lives and who can see it |
| 6 | `06_IMPLEMENTATION_PLAN.md` | What was built, and what gets built next |
