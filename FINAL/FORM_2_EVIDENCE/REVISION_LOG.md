# Revision log

**For Form 2, item 7** ("Revisions after testing are documented, and the revision log is up to date").
Hivelet: A Web-Based Apartment Management System for the Fe Galang Da Silva Boarding House.
Up to date on 10 November 2026.

Each row is one round of testing or review, what it found, and what was revised because of it. Every
figure comes from the paper or the test records named in the last column. Nothing here is new. The
git history of the repository holds every individual change with its reason, in about 2,000 commits.

## Summary

| | |
| :--- | :--- |
| Changes made in response to evaluation, 23 September to 7 October | **51** (Chapter 4, Table 4-19) |
| Defects found by the testing activities | **35**, of which **32 resolved** and **3 accepted** as low risk, with the reason recorded (Table 4-20) |
| Critical defects | **None** found in any activity |
| Test cases passed on the testing day, 30 September | **82 of 83** (98.8%) |
| Rerun of all 114 test cases, 4 November | **None failed**: 56 passed as written, 21 passed with wording the redesign had changed, 37 need a person |

## The log

| Date (2026) | Testing or review | What it found | Revision made | Status | Where it is recorded |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 12 to 14 Sep | Iteration 1: the system and its documents checked against each other | 22 recorded errors in the submitted documents. 15 defects in behavior, among them a partial payment that left no debt behind and cash recorded with nothing written to the books | All corrected. Seven automated check suites written, each defect covered by one | Done | Appendix M, Table M-19 |
| 23 Sep | The owner's review on a phone | Edit buttons that touch screens never showed. A tenant register wider than the phone | 4 changes | Done | Table 4-19 |
| 26 and 29 Sep | Screen-versus-database audit: every figure on every screen against a query of the live database | 6 defects no automated check had caught. Highest, high severity: a tenant's payments not shown, and a voided receipt shown as paid | All 6 fixed on 26 September (7 changes in all) | Done | Section 4.3.3, Table 4-9, Table 4-20 |
| 26 to 28 Sep | Development reviews: performance, requirements, team, client, mobile, checks and a final review | Repairs could not be logged for an empty unit. Page names differed between the menu, the tab and the heading | 11 changes | Done | Table 4-19 |
| 29 and 30 Sep | Pre-testing audit and Lighthouse | One shared starting password for every tenant. No way back for a forgotten password | 5 changes: each tenant given an own starting password, and the owner can reset one | Done | Table 4-19 |
| 30 Sep | Testing day: the owner's use, the 26-step walkthrough, three tenants, an Android phone | ₱0 shown instead of "—" with the connection cut. The "cannot tell whether it was saved" message late on Android. Changes not reaching the other person until a refresh | 3 changes. Both offline defects passed when re-tested on the same devices on 13 October | Done | Section 4.3.7, Appendix M, Table M-1, Table 4-20 |
| 1 Oct | The owner's own practice, from the testing day | Payments with no invoice number, for which she gives a slip | Acknowledgement receipts added | Done | Table 4-22, stage 4 |
| 2 Oct | Check of the evaluation account | An online payment refused for an amount owed (high) | Fixed | Done | Table 4-20 |
| 2 Oct | Security review and an outside probe | 12 findings. Highest: the hosting provider's visitor challenge could block payment notifications | 9 fixed. 3 accepted as low risk, each with its reason: sign-in attempt limits counted per server instance, signing out not revoking a token, a wide connection policy | Done | Section 4.4.4, Table 4-20 |
| 3 Oct | The technical evaluators' review | 14 comments, among them filters in a pop-up with an Apply button, no way for a tenant to withdraw a request, and contact detail and photo validation | All 14 addressed by 5 October | Done | Table 4-19, Table 4-20 |
| 7 Oct | Security review | Breached passwords were accepted | A new password is refused if it appears in a public list of breached passwords | Done | Section 4.2.6, Table M-19 |
| 30 Sep to 4 Oct | The ISO/IEC 25010 survey | Usability items rated 3 before the evaluators' changes. A tenant asked to see the deposit | 4 changes | Done | Table 4-19, Section 4.4 |
| 13 Oct | Audit of the live records against what each tenant's screen shows | Two tenants shown their August rent as overdue although the owner's receipts record both as paid (high) | Corrected the same day by two numbered migrations, after a backup | Done | Appendix M, Table M-27 |
| 1 to 7 Nov | Iteration 3: the interface redesign | The owner's and the team's daily reviews of every screen | The glass design in light and dark. Sign in, inquiry and conversation joined in one screen. A closed year's records can no longer be changed, and last year stays open until every December receipt is in. A tenant cannot cancel a repair once someone is sent. A GCash payment settles the oldest unpaid bill | Done | Section 4.2.1, Table M-19 |
| 2 to 6 Nov | Data corrections found in Iteration 3 | Sixteen units filed under the wrong kind. Old password hashes in 16 audit rows. A rehearsal test tenant left in the records. Two receipts whose rent period ran eleven months | Migrations 088, 089, 090 and 091, each applied after a backup and read back | Done | Table M-19 |
| 4 Nov | Rerun of all 114 test cases of Appendix L | None failed. 21 cases still pass but their wording names screens the redesign changed | The replacement wording is recorded beside each case | Done | `docs/TESTING_DAY/results/RERUN_2026-11-04.md` |
| 31 Oct to 10 Nov | Second round of users on the redesigned system: ten tenants and four prospective tenants did the tasks, and seventeen answered the ISO/IEC 25010 questionnaire | Every task completed: tenants 151 of 160 attempts without help, prospects 31 of 32. Help mostly at the first sign-in, from misreading the password slip | None needed. Rated 4.73 overall, and 4.58 with the first round | Done | Appendix M, Tables M-28 to M-30, Sections 4.3.7 and 4.4 |
| 4 and 6 Nov | Audits of every admin, tenant and public screen, then a click-by-click audit | Display and wording faults on several screens, among them a bill tile that named one month's charges over a two-month total and an emergency contact the browser wrongly required | Fixed, each in its own commit with the reason | Done | Git history, commits of 4 and 6 November |

## Still open

| What | Why it is open | Who |
| :--- | :--- | :--- |
| New screenshots of the screens (P16) | Figures 4-7 to 4-11 show the design before Iteration 3 | The team |
