# Testing day results, 30 September 2026: who fills what

One file per part of the test cases. **Open your file, type the results straight into the table,
commit and push** (pull first: five people are editing this folder). Codes only, never names.

| File | Part | Cases | Owner |
| :--- | :--- | :-- | :--- |
| [`A_ADMIN_Lloyd.md`](A_ADMIN_Lloyd.md) | A. Landlady / administrator | A-01 to A-36 | **Lloyd** |
| [`T_TENANTS_Vince.md`](T_TENANTS_Vince.md) | T. Tenant tasks (pre-filled from what was read out) | T-01 to T-18 | **Vince** |
| [`P_PUBLIC_Kiel.md`](P_PUBLIC_Kiel.md) | P. Public site checks | P-01 to P-08 | **Kiel** |
| [`C_TOGETHER_Kiel.md`](C_TOGETHER_Kiel.md) | C. Everyone at once | C-01 to C-08 | **Kiel** |
| [`O_OFFLINE_Sean.md`](O_OFFLINE_Sean.md) | O. Offline, weak signal, install | O-01 to O-12 | **Sean** |
| [`S_SECURITY_Sean.md`](S_SECURITY_Sean.md) | S. Security | S-01 to S-12 | **Sean** |
| [`PF_TIMINGS_Eljohn.md`](PF_TIMINGS_Eljohn.md) | PF. Performance timings | PF-01 to PF-10 | **Eljohn** |
| [`CO_BROWSERS_Eljohn.md`](CO_BROWSERS_Eljohn.md) | CO. Browsers and devices | CO-01 to CO-06 | **Eljohn** |
| [`PR_PROSPECT_unassigned.md`](PR_PROSPECT_unassigned.md) | PR. Prospective tenant | PR-01 to PR-09 | closed by Claude: **not recorded** (all NT) |
| [`N_NEW_TODAY_unassigned.md`](N_NEW_TODAY_unassigned.md) | N. Shipped on 30 Sep | N-01 to N-03 | Claude (automated results; real phone NT) |

**The one rule:** write what happened. A case that was not done is **NT**, not a pass. A time that
was not measured stays blank ("not timed"), never estimated. Chapter 4 reports each part as it was
actually done, and a small or partly done part is reported honestly as that.

**Status, 1 Oct 2026:** every file is filled. T and C were corrected against the Activity log (read, never changed); each file says what was changed and why, and git keeps the versions as first pushed. `T_TABLE_11C.md` is Table 11C, computed from `T_observations.csv` (made from the T file by `scripts/survey/t-md-to-csv.mjs`).

Not in this folder, still needed: **the survey export** (Google Form > Responses > Sheets icon > File >
Download > CSV), the **defect log** (Form 3, a photo is fine), the **signed consent forms and Form 6**,
and the **scan screenshots**. When a file is filled, tell Claude its name; when all are in, paste the
hand-over message from `INSTRUCTIONS FOR TESTING.md`, Batch 11.

---

## Do these files fill the ISO/IEC 25010 evaluation? No, not by themselves

**The ISO/IEC 25010 ratings (Chapter 4, Tables 12 to 22) come only from the survey** (the Google
Form). These files are the **evidence behind** those ratings: what people could actually do, and what
was measured. Chapter 4 reports both for each characteristic.

| ISO/IEC 25010 characteristic | Rating (Tables 14 to 21) from | Evidence from these files | Also |
| :--- | :--- | :--- | :--- |
| Functional Suitability | Survey | **A**, **T**, **P**, **PR**, **N** | 20 check suites (Table 8) |
| Performance Efficiency | Survey | **PF**, **C** (C-01, C-07) | Table 11B (12 users, 0 errors); PageSpeed |
| Compatibility | Survey | **CO**, **C** (C-08), A-29 (Excel opens) | |
| Usability | Survey | **T** (Table 11C), **PR**, **A**, **P** (P-04, P-05) | WAVE, Lighthouse accessibility |
| Reliability | Survey | **O**, **C** (C-03 to C-06), A-30 | Table 11A (offline 20/20); UptimeRobot |
| Security | Survey (landlady and IT evaluators only) | **S**, **C** (C-02), T-15 to T-17, A-22 | Observatory, securityheaders.com, SSL Labs |
| Maintainability | Survey (**IT evaluators only**) | **none of these files** | The repository, documentation, check suites; SonarCloud if run |
| Portability | Survey | **O** (O-01 to O-03), **CO** | PWABuilder |

**So, to fill everything:**

1. **The survey export.** Without it Tables 12 to 22 stay empty, whatever these files say.
2. **At least a few IT evaluators** (faculty or developers outside the team) must answer the survey's
   technical section. They are the **only** source for Maintainability, and the main one for Security.
   If none have answered yet, send them the form link.
3. **These files** for the evidence paragraphs and Tables 10, 11, 11C and 11D.
4. **The scan screenshots** (Sean, Part S; Eljohn, PF-09 and PF-10) for §4.4.8 and §4.4.4.
