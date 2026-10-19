# Blocked for Sean

The work queue: what is waiting on a person, not on code. **Add to it rather than stopping**, one
short entry each, with enough detail to act on cold.

The full history (B-00 to B-105, 4,300 lines) was archived on 13 October 2026 to
`_ARCHIVE (not in repo)/2026-10-13 cleanup/BLOCKED_FOR_SEAN.md`, on Sean's machine only. Look there
for the detail behind any entry below.

## The paper

Everything still needed for the manuscript is in `FINAL/QUESTIONS_TO_FINALIZE.md`, Section 1
(P1 to P10): the owner's signature, the prompt-log export on Lloyd's laptop, the front matter, the
Acknowledgement, where the AI statement goes, the move-in date question, the repository going
private, and the scans for Appendices A and B.

## The system: entries whose heading did not say done

The archive was scanned by heading on 13 October 2026. These did not say done, resolved or applied;
**confirm each against its entry in the archive before acting**, since some were settled in the
text without the heading changing.

| Entry | What it is |
| :--- | :--- |
| B-105 | Two identical receipts with no invoice number, or two acknowledgement receipts, sent at the same instant are both saved. A decision for Sean (Chapter 4, Section 4.3.6 names the limit) |
| B-84 | Website safety audit of 29 September: the content security policy and the rate-limit call |
| B-37 | Eleven write routes have no automated exercise; the walkthrough was their test |
| B-40 | Unit 2f: three months with no receipt (the owner said they stay blank, 12 October) |
| B-11 | Sixteen ended tenancies do not record when they ended |
| B-15 | The on-site payment form can ask for water the ledger will never record |
| B-25 | `check:columns` asks for a file nothing can regenerate |
| B-01 | The public landing showed every unit as vacant when `/public/rooms` failed |
| B-03 | The Adyen webhook serves one address at a time (production since 24 September; see CLAUDE.md) |
| B-67 | Two unit descriptions still stated a retired water rule |
| B-82, B-101 | Credentials for `check:api` and `check:relations`: `credentials/creds.txt` must hold the current passwords |

## New (13 October 2026)

| Entry | What it is |
| :--- | :--- |
| B-110 | **IN PROGRESS (19 Oct): the survey goes from 9 to 10 respondents** (a fifth technical evaluator, 18 Oct 6:28 pm). Source: the repo-root `IEC-25010-Software-Quality-Assessment.csv` (gitignored; 10 rows now, the 9-row one in `backups/survey/`). New Table 22 (method A): FS 4.79, PE 4.48, Compat 4.55, Usab 4.42, Rel 4.61, Sec 4.68 (n 6), Maint 4.32 (n 5), Port 4.86; **overall 4.59** (was 4.53); **every characteristic now Very High Quality**; method B 4.47, where Usability is lowest. Ranks unchanged from B-109. Same places as B-109 to update, plus **the video** (`video/src`, the results scene shows 4.53; re-render) and **the slides** (by hand). **Done:** Chapter 4 §4.4 tables and prose; Appendix M (49 rows); Abstract; Chapters 3 and 5; study guides, defense script, iteration history, QUESTIONS D2, NEEDS P11; video source (End.tsx counts to 459, SCENES.md). **Left:** whatever is not listed as done here |
| B-109 | **Done 18 Oct except the slides: the survey went from 6 to 9 respondents** (Sean's decision: recompute with all 9). Three more technical evaluators answered on 15, 16 and 18 Oct, after reviewing the **demo copy** (hivelet-demo.vercel.app, sample data), not the live site; the text must say so. Source: `IEC-25010-Software-Quality-Assessment.csv` in the repo root (gitignored, now the 9-row export; the 6-row one is in `backups/survey/`). Recompute: `node scripts/survey/compute-survey.mjs IEC-25010-Software-Quality-Assessment.csv --out=<file>`. New Table 22: FS 4.77, PE 4.44, Compat 4.52, **Usability 4.37 (now Very High Quality)**, Rel 4.56, Sec 4.60 (n 5), Maint 4.15 (n 4), Port 4.83; **overall still 4.53**; method B (every answer pooled) 4.39. Ranks: Port, FS, Sec, Rel, Compat, PE, Usab, Maint. Consequence: Usability no longer "High Quality", so "rated and measured disagree on Usability" no longer holds. **Done:** Chapter 4 §4.4 (Tables 12, 12A, 12B, 22, 22A, prose, §4.4.4); Appendix M Tables M-2 to M-16 (49 rows); Abstract; Chapter 3 (participants, administration); Chapter 5 (5.1, item 4, conclusion 4, recommendation 6). **Left:** only the slides (below). Study guides, defense script, QUESTIONS D2 and NEEDS P11 also updated. Places to change: Chapter 4 §4.4 (Tables 12, 12A, 12B, 22, 22A and their prose, §4.4.4 Security), Appendix M Tables M-2 to M-17, the Abstract, Chapter 3 (respondents), Chapter 5 (5.1, conclusion 4, recommendation 6), the study guides and the defense script in FINAL/, then `node scripts/manuscript/build-final.mjs`. **Not changeable here:** `FINAL/HIVELET DEFENSE SLIDES.pptx` (edit by hand: 4.53 stays; per-characteristic scores and "6 respondents" change). The video shows only 4.53, still right |
| B-108 | **Done 15 Oct: demo live** (health 200, database connected, lockdown enforced; set through the Vercel dashboard after the script could not take a paste in the app terminal). Optional: the demo secret key was pasted into a chat, so rotate it in the hivelet-demo Supabase project and update SUPABASE_SECRET_KEY on Vercel. Was: the demo copy for outside evaluators needed its two secrets (15 Oct). hivelet-demo.vercel.app runs on its own Supabase project (org hivelet-demo) with invented data; its pages load but its API fails until it has `SUPABASE_SECRET_KEY` and `JWT_SECRET`. Run `node scripts/demo/set-demo-secrets.mjs` and paste the **demo** project's secret key (Supabase > hivelet-demo project > Project Settings > API Keys > Secret keys); it sets both and redeploys. Then sign in once with `owner.demo@example.com` from `credentials/demo-evaluator-accounts.txt` to confirm. Everything else: `scripts/demo/README.md` |
| B-107 | **Done 13 Oct: 082 and 083 applied** (082 settled the bills; 083 named the administrator as verifier, which check:ledger BR-017 requires; ledger unchanged at 952 rows, PHP 8,214,100.00; backup 2026-10-13T09-16-20). Was: Tenants of **1d** and **F2B** see an overdue amount (₱7,450 and ₱10,400) for their August period, which they paid on 12 and 25 August. The bills were raised on demand on 26 September; the August receipts arrived on 30 September through migration 062, an insert, and only a receipt recorded on Monthly Income settles open bills. 082 does what that route would have done: one Verified cash payment per bill with the receipt's number and date, then Paid, plus an audit row; it refuses unless both bills still match their receipts (checked read-only on 13 Oct: they do). Steps: `npm run backup`, run `database/migrations/082_two_bills_her_august_receipts_already_paid.sql` in the Supabase SQL editor, then the two VERIFY queries in its header (expected: both Paid; 0 rows). To stop a repeat, `database/import-ledger-update.mjs` now lists every open bill its receipts pay and refuses `--apply` unless `--leave-bills-open` is passed (rule in `database/billsCoveredBy.mjs`, test beside it, mutation-tested) |
| B-106 | **The test tenant loydtest has been the tenant of PH since 1 October**, PH being the one vacant unit: the live site counts 33 of 33 occupied and shows no vacancy, though the property has 32 occupied; one open test bill of ₱30,400 sits on PH (its receipts are voided and its payments rejected). Useful for the defense demo (FINAL/DEMO_SCRIPT.md); afterwards move loydtest out through Tenants, so PH shows vacant again. A person decides; not changed by Claude |
