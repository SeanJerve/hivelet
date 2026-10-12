# Answers relayed 2026-10-12

Given by **John Lloyd M. Cuario** on 12 October 2026: the owner's questions from
`CLIENT_MEETING_QUESTIONS.md` (answered for her) and the team questions from `BLOCKED_FOR_SEAN.md`.
What each answer changed is beside it. Unit numbers and amounts only, no residents' names, as in
the questions file.

## For the owner

| # | Question | Answer | What it changed |
| :--- | :--- | :--- | :--- |
| 1 | F2F (B-102): 4 occupants or 1? | "Just record 4." | Nothing in the data (the tenancy already says 4). `check:ledger` accepts it; B-102 closed. |
| 2 | 2f, receipts 5063, 5090, 5106 (2g) | "Disregard the unused numbers; 2f has been blank for those months, still follow it." | Nothing. The three months stay blank; `check:ledger` keeps listing them as known gaps (it does not fail on them). |
| 3 | August and September 2026 (2b) | Updated records to be uploaded by Lloyd ("tomorrow", i.e. 13 Oct). | Waiting on the file. Entered as numbered migrations when it arrives. |
| 4 | 2025's PHP 2.56 million booked as personal (2e) | A renovation that year explains the gap between 2024 and 2025. | Nothing; confirmed as recorded. |
| 5 | Past Penthouse spending (2c) | Leave everything where it is. | Nothing. |
| 6 | Rent start day for 3c, B3B, 2g, 3d, 1e and the eleven that changed this year (2f-ii) | "All are true." | Confirms what her receipts show; no data change. |
| 7 | Headcounts: 1h, B3B, B3F up to 2; 2e, 3b, 3d, 3g down to 1; 1b and 1f hold 3 in 2-person units (2f-iii) | "Yes, all are true." | **Migration 081** set 1h, B3B and B3F to 2 (they read 1). The other six already matched. `check:ledger` BR-014 baseline now 1 (F2F). |
| 8 | Electricity PHP 12.50 per kWh on the website (3b) | Remove it; the charge comes from the electric company and is not recorded in the system. | Already gone from every page (only a code comment records its removal). |
| 9 | Meters read on the 25th (3b) | No; the electric meters are read on varying dates, and it does not concern the system. | Already gone from every page. |
| 10 | Should tenants report a cash payment? (3) | No; the administrators record every payment. | Nothing; that is how it works. |
| 11 | The big figure at the bottom of her income sheet | Yes, a year-to-date running total. | Confirms the workbook's YEAR TO DATE row (OD-01 settled). |
| 12 | Report dates as `3-Aug-24` | Yes. | Nothing; that is the format used. |
| 13 | Expense categories: fixed 13, or can she add her own? | Keep the 13, and she can also add her own. | **Being built** (add an expense kind from Monthly Expenses). |
| 14 | NPC registration or a named data protection officer? (3c) | No, it does not need it. | The privacy page names neither (unchanged); its source note records the answer. |
| 15 | Rejecting a GCash payment does not refund it (3d) | Acknowledged. | Nothing. |

## For the team (BLOCKED_FOR_SEAN)

| # | Item | Answer | What it changed |
| :--- | :--- | :--- | :--- |
| 16 | B-100: the 4 Oct late-night changes | Yes, all testing (Ann Kristine Diaz did not move out). | **Migration 079 applied**: the 3D receipt counts again, the February BDO expense back to PHP 63,000, the test expense voided, 3G occupied again. Remitted PHP 8,214,100.00 over 952 receipts. |
| 17 | B-104: migration 080 | Yes. | **Migration 080 applied**: the API's role can no longer TRUNCATE the audit trail. |
| 18 | B-103: make the repository private | Yes. | To be done on GitHub by the repository owner (Sean). Check Vercel still deploys afterwards. |
| 19 | B-101: put the owner's current password in `credentials/creds.txt` | No: a stored password is a data breach risk; it should stay locked. | No password is stored. The two suites that sign in as her (`check:api`, `check:relations`) stay off. Sean signs in once as the owner to reset the failed-sign-in count (3 of 5). |
| 20 | Unit codes in capitals; legal-page dates; centavos in Monthly Expenses | "Yes, do all." | Capitals kept ("1A"); legal pages now read "September 24, 2026"; Monthly Expenses shows centavos everywhere (PHP 23,000.00). |
| 21 | iPhone repair photo | Arrives as a normal photo. | B-99 phone check done. |
| 22 | Android phone-number spacing | Works; the cursor stays in place. | B-99 phone check done. |
