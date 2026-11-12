# Needs your attention

Updated 12 November 2026. **The same items as a checklist, each explained, are in [00_TO_DO_CHECKLIST.md](00_TO_DO_CHECKLIST.md).** Everything that still waits on a person, in one list. The detail behind
each item is in `QUESTIONS_TO_FINALIZE.md` (P numbers), `BLOCKED_FOR_SEAN.md` (B numbers, in the
repository's top folder) and `DEFENSE_CHECKLIST_STATUS.md` (Form 2 item numbers). What the team will
bring later is also in [TO_FOLLOW.md](TO_FOLLOW.md).

**Everything for the defense checklist, one folder per Form 2 item:** `_DEFENSE CHECKLIST/` in the
hivelet folder, outside the code, committed so both machines have it. **The repository is public until
it is made private (P9): a signed scan put there is published by the next commit.** Its `00 STATUS` file says which items are ready and which are
missing. Put each signed scan in its item's folder, then rebuild it with
`node scripts/manuscript/build-defense-folder.mjs`, which never deletes a file the team put there.

Nothing here is a fault in the system. All 21 check suites passed on 10 November, the document and
live-record checks passed again on 12 November, and the paper agrees with the screens as they are.

## 1. For the pre-defense clearance (Form 2)

| What | Form 2 item | Who |
| :--- | :--- | :--- |
| **The owner's signature** on the acceptance form, Appendix O. Print `docs/FINAL MANUSCRIPT/UAT_SIGN_OFF_FORM.docx`. She signs only if she agrees. Then Claude adds one sentence to Section 4.3.7 (P1) | 9 | Team, with the owner |
| **An acceptance form or MOA.** None exists. Ask the Faculty-in-Charge whether the signed UAT form serves, or whether Module 06's form is separate | 10 | Team |
| **The similarity check** on the full manuscript, and its report | 5 | Team |
| **The consultation record**: print it (in folders 16 and 17), fill in the session before the final defense, and have Sir Jayvee sign each session. He is both advisers, so one record serves both items | 2, 16, 17 | Team |
| **Forms 3A and 3B**, signed, with the four diagram annexes (Appendices D to H) attached to 3B | 18, 19 | Team, with the advisers |
| **The Form 1 template**: check the paper's layout and reference style against it. It is not in the repository | 1, 4 | Team |
| **The mock defense**: hold it, then send its recommendations and Claude records what was done | 20, 21 | Team |
| **Slide 1** (names, adviser, date), a **backup copy** of the system and the slides, and **five printed copies** | 22, 23 | Team |
| **The repository**: if it is made private before the defense (P9), add the Programming Adviser as a collaborator | 11 | Sean |

Ready to attach, done 10 November: the Literature Map (Appendix R, item 3), the revision log (item 7)
and the deployment report (item 10), the last two in `FORM_2_EVIDENCE/`.

## 2. For the paper

| What | Who |
| :--- | :--- |
| **The front matter**: title page, approval sheet, defense date and room, each member's Curriculum Vitae (P3) | Team |
| **The Acknowledgement**: who to thank. Claude drafts it once given the names (P4) | Team |
| **Scans** of the signed letter of request and the adviser appointment papers, for Appendices A and B (P10) | Team |
| **The AI-use statement**: where it goes, and whether the prompt log is attached (P5). The adviser should also confirm the AI disclosure in Section 3.1.1 (P21). The prompt log is exported on Lloyd's laptop with `node scripts/ai-use/export-prompt-log.mjs` (P2) | Adviser, Lloyd |
| **Scans of the second round's ten tenant consent forms** (signed on paper), kept private in `_CONSENT_FORMS (not in repo)/`. Prospects and evaluators consented through the questionnaire, as Chapter 3 now says | Team |
| **Consent forms**: "Research team member present" is blank on all four originals (the landlady's and three tenants', 30 September). F1 agreed to no photos or recording, so F1 appears in none | Team |

## 3. For the system

| What | Who |
| :--- | :--- |
| **Ask the owner** whether F1's August rent was paid (no August receipt is recorded), and whether 2c's water is for 4 people as her receipt says (B-115) | Sean |
| **The design and wording calls** left from the 6 November audit (B-121). Its first two were settled the same day | Sean |
| **Move the test tenant out of unit PH** after the defense demonstration (B-106) | Sean |
| Later, after the defense: whether the owner may edit a move-in date (P8), and two identical receipts with no invoice number at the same instant (B-105) | A decision |

## 4. The day before the defense

The steps are in `DEMO_SCRIPT.md`: the backup, one sign-in as the owner and as the test tenant, the
installed app opened once on the demonstration phone, one GCash test payment rejected, the offline
fallback on the laptop, no test items in Repairs or Inquiries, the owner asked about showing her
screens, and slide 1 filled in. The speakers' names in `DEFENSE_PRESENTATION_SCRIPT.md` are the
team's to fill.
