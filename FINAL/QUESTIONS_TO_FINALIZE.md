# Questions to finalize the paper: answered 13 October 2026

Sean answered every question on 13 October 2026. This file records the answers, what each one
changed, and the few things still pending. **When Sean asks "what is still needed?", start from
Section 1.**

## 1. Still pending (ask again when asked what is still needed)

| # | What | Why it is still open |
| :--- | :--- | :--- |
| P1 | **The owner's signature** on the acceptance form (Appendix O), then one sentence in Section 4.3.7 | Sean: "noted, ask me again" (E1). She is happy with the system, but the guide accepts acceptance results only with a signed form |
| P2 | **The prompt-log export on Lloyd's laptop**: `node scripts/ai-use/export-prompt-log.mjs` | Sean: "ask me again" (E2). It also answers which models Lloyd's machine used (A18, left pending on purpose) |
| P3 | **The front matter in Word**: the defense date and room, each member's Curriculum Vitae, the title page | Sean: "ask me again" (E3) |
| P4 | **The Acknowledgement**: who to thank | A team decision (D8); Claude drafts it once the names are given |
| P5 | **Where the AI-use statement goes**, and whether the prompt log is attached | The adviser was not sure (C2). The statement is ready outside the repository, in `_AI_USE (not in repo)/` |
| P6 | ~~Did the technical evaluator get the source code?~~ **Answered 13 Oct: no, he did not ask for it.** Chapters 3 and 4 now say he reviewed the running system without inspecting the code, so Maintainability rests on the measured evidence more than on his rating | Done |
| P7 | ~~The street name~~ **Answered 13 Oct: Sampaguita.** Fixed in Chapter 1 and on the public site (four places said "Sapaguita") | Done |
| P8 | **Move-in dates**: the system cannot edit a tenancy's move-in date today (editing a tenant leaves it unchanged; only a move to another unit sets it, to that day) | Sean expected she could edit it. The recommendation is removed as asked. **Looked at 13 Oct, not built:** it is not a display field. `start_date` decides which months a tenant is shown as owing (standing counts from the later of the day after her last receipt and the move-in date, so a later date can hide months owed, and a tenant with no receipts would be shown owing back to an earlier one), and which tenancy a receipt is credited to (`tenancyForPeriod`; unit 1a has overlapping tenancies where a changed date moves receipts between tenants). Safe to add after the defense with those two rules decided; not worth the risk before it |
| P9 | Make the repository private before the defense | Decided (E4) |
| P10 | **Scans for Appendices A and B**: the signed letter of request to the owner, and the adviser appointment papers | Found 13 Oct: the 18 September manuscript has only their headings |
| P11 | **The technical evaluator may re-rate after reviewing the code** (Sean, 13 Oct). If he does, export the survey CSV again and send it; Claude reruns `compute-survey.mjs` and updates Tables 4-14 to 4-18, Maintainability in 4.4.3, Chapter 3 Participants ("did not inspect the source code") and Chapter 5 | Waiting on the evaluator |
| P12 | **More respondents** (Sean, 13 Oct): more technical evaluators and tenants answer the same Google Form; then the same: send the CSV, Claude recomputes every table and updates the counts (now 6) everywhere they appear | Waiting on the team |
| P13 | **Unit PH and the test tenant** (B-106): move loydtest out after the defense demo | Decision for Sean |
| P14 | **The owner's September and October receipts.** Her records in the system stop at August (15 receipts that month, none since), so the Overview reads "Not entered yet" for October and four tenants (1a, 1c, 2c, F1) see an amount due for a period her workbook had not marked paid at the end of August. Entering them **on Monthly Income** settles those bills; an import does not (B-107) | Found in the audit, 13 Oct. For the owner |
| P15 | ~~Run migration 082~~ **Done 13 Oct (082 and 083).** (B-107): two tenants, 1d and F2B, are shown an overdue amount for August, which they paid | Found in the audit, 13 Oct. For Sean, before the defense |

## 2. The answers, and what each changed

**Who is who.** Mrs. Fe Galang Da Silva owns the business; Michelle, Lloyd's mother, is the landlady
and runs it, and is the only administrator (A1 to A3). Chapter 3 now says the landlady runs it on
behalf of its owner, and that Chapter 4 calls her "the owner" in that role. No names in the paper.

**Interviews (A4).** With Michelle, from about February 2026. Nothing in the repository or the
archive records them (the repository begins on 24 July 2026); what is recorded is her workbook and
two rounds of written questions, 17 September and 12 October. Chapter 3, Section 3.2.1 says exactly
that.

**USB drive (A5).** Chapters 1, 4 and 5 now say "USB flash drive" instead of "removable storage".

**The testing day (A6 to A15).**
- No video was shown (it is for the final defense), so Chapter 3 no longer says one was.
- The help steps and thinking aloud were used; Chapter 3 gives the testers' own examples.
- Photos were taken for documentation, with permission; no screen was recorded.
- Signed consent forms are kept in hard copy. They do not go in the paper; Appendix P is the blank form.
- Tenants were chosen from those at home that evening, picked to cover cash payers, less app-confident
  users, Android and iPhone, and more than one cluster: "purposive and convenience sampling".
- The prospective tenant was invited by the team and sent the inquiry himself (one inquiry on 30
  September is in the database).
- The technical evaluator is an IT professional working in software quality assurance.
- Names on the survey were only to tell responses apart; Chapter 3 says so.

**AI use (A16, A17).** No AI tool in July and August apart from one change on 20 August; Lovable was
only tried, and every Lovable file (`AGENTS.md`) and mention is removed. The team approved each live
database change, so the statement keeps "approved". Note: the commit `a9ddd63` (21 August) is titled
"apply Lovable design system"; commit messages cannot change without rewriting history, which was
declined. Once the repository is private, no one outside the team sees it.

**Sources (A19, A20).** Ullah et al. corrected to **2018**, *Sustainability* 10(9), 3142, DOI
10.3390/su10093142; Sean confirmed it from the article page on 13 Oct. The 2021 details first supplied
matched no article. Kotkar et al. now links to the article itself.

**The Word file (A21, A22).** There is none yet; the team retypes from this folder into the final
format. No school format was given, so the paper follows APA 7.

**The owner side (B1 to B5).** B2: Chapter 4's deployment table now says the owner was guided through
the system on 30 September, so training and hand-over is done. B3: the move-in recommendation is
removed (see P8). B4: receipts whenever she wants; no change to the paper, as every figure is dated.
B5: the address is in Chapter 1, Section 1.4.

**The adviser (C1 to C8).** C1: Chapter 4 keeps one section per objective. C3: the certificates are
the team's. C4: Chapters 1 to 3 may be revised. C5: ISO/IEC 25040:2011 stays; the 2024 edition is
restructured, so citing it would not match the steps followed (README, Section 6, has the answer for
the panel). C6: the guides set no word limit for the Abstract. C7: Chapter 4 keeps everything
essential. C8 and D1: nothing about Lloyd's mother goes in the paper.

**Choices (D2 to D9).**
- D2: **done 19 Oct**: four more technical evaluators answered (15 to 18 Oct, on the demo copy), so the survey is now ten respondents, overall 4.59, recomputed with `compute-survey.mjs` through Chapters 3 to 5, Appendix M and the study guides (B-109). The slides still need it by hand.
- D3: Table 4-8 (automated verification) stays as dated. Automated testing of simultaneous saves is right: two people cannot
  press Save in the same millisecond on purpose, so the exact race can only be tested by a program;
  real people using it at the same time are reported separately (Appendix M, Table M-22).
- D4: Adyen stays on the test account; the support case (08657379) is already cited in Section 4.3.2.
- D5 to D7: Figure 2-2, the Gantt chart (Appendix C) and the child data flow diagrams (Appendix F)
  are drawn from the records by `scripts/build-chapter-4-diagrams.mjs`.
- D9: no GitHub access for the panel; Appendix Q gives the repository's layout instead.
