# Needs your attention

Everything that is waiting on a person, as of 13 October 2026, in the order to do it. Nothing here
can be done by Claude. When one is done, tell Claude and it updates the paper, the tables and the
Word file to match. The detail behind each is in `QUESTIONS_TO_FINALIZE.md` (P numbers) and
`BLOCKED_FOR_SEAN.md` (B numbers).

---

## First: check the Word file (10 minutes)

Word on the laptop stopped exporting PDFs at 19:49 on 13 October, so the last layout fix was checked
inside the file but not by eye.

1. Open `FINAL/CLAUDE MANUSCRIPT/CLAUDE MANUSCRIPT.docx` in Word. If it asks to update fields, say
   **Yes** (it fills the Table of Contents, List of Tables and List of Figures).
2. Look at three places:
   - **Appendix N, the data dictionary**: every table fits inside the right margin and its last
     column (Description) is not cut off.
   - **Table 3-1** (Chapter 3) and **Table 4-5** (Chapter 4): each sits whole on one page with its
     caption, not split with one row at the bottom of a page.
   - **The List of Tables and List of Figures**, after the Table of Contents: they are filled in.
3. Try **File > Save As > PDF**. Tell Claude whether it worked. If it does, Claude can do the full
   page-by-page check itself again.

When pasting into the final document: keep each caption's style (Table Caption or Figure Caption),
or the two lists will not find them.

---

## The system

| # | What to do | Why |
| :-- | :--- | :--- |
| 1 | **The owner enters her September and October receipts on the Monthly Income screen** (P14) | Her records in the system stop at August. Entering them on Monthly Income also clears the open bills four tenants see (1a, 1c, 2c, F1). Not through an import: only Monthly Income settles bills |
| 2 | **Put the owner's current password in `credentials/creds.txt`** (B-101) | The last two of the 21 checks (check:api, check:relations) need it. The old one was refused, and each wrong try uses one of her five attempts |
| 3 | **Make the GitHub repository private** before the defense (P9) | Decided; only you can change it |
| 4 | **Move the test tenant loydtest out of unit PH after the defense** (B-106, P13) | Until then the public site shows no vacant unit (it counts 33 of 33 occupied; really 32) |
| 5 | Decide later, no rush: **may the owner edit a move-in date?** (P8) | Not built on purpose: the date decides which months a tenant is shown owing, and which tenant a receipt is credited to. Safe after the defense once those two rules are decided |
| 6 | Decide later, no rush: **two identical receipts with no invoice number sent at the same instant are both saved** (B-105) | Named as a limit in Chapter 4, Section 4.3.6; the payment form's confirmation step makes it unlikely |

## The defense, the day before (from `DEMO_SCRIPT.md`)

1. Run `npm run backup`.
2. Sign in once on the live site as the owner and as loydtest, so neither is locked on the day.
3. On the demo phone: sign in as loydtest, **Add to Home Screen**, and after the last push open the
   installed app once (it shows the previous version until it has been opened once).
4. Make one GCash test payment end to end, then **reject** it (never verify it).
5. Put the defense film and `FINAL/CLAUDE MANUSCRIPT/images/` on the laptop as an offline fallback.
6. Check Repairs and Inquiries have no test items left (cleared on 13 October).
7. **Ask the owner** whether the panel may see her own screens.
8. Fill in **slide 1** of `FINAL/HIVELET DEFENSE SLIDES.pptx`: the team members, the adviser and the
   defense date (in square brackets now).

---

## The paper

| # | What is needed | Then Claude |
| :-- | :--- | :--- |
| P1 | **The owner's signature** on the acceptance form, scanned into Appendix O | Adds one sentence to Chapter 4, Section 4.3.7 (the yellow TO DO there) |
| P10 | **Scans for Appendix A** (the signed letter of request to the owner) **and Appendix B** (the adviser appointment papers) | Nothing; they go in as images |
| — | **Appendix P**: the blank informed consent form as a PDF or scan | Nothing; it goes in as is |
| P3 | **The front matter in Word**: title page, approval sheet, defense date and room, each member's Curriculum Vitae | Can draft the CV pages with blanks if you want |
| P4 | **The Acknowledgement**: who to thank | Drafts it once you give the names |
| P5 | **Where the AI-use statement goes**, and whether the prompt log is attached: ask the adviser | Places it; the statement is ready, outside the repository, in `_AI_USE (not in repo)/` |
| P2 | **The prompt-log export on Lloyd's laptop**: `node scripts/ai-use/export-prompt-log.mjs` | Adds it to the AI-use statement |
| P11 | **If the technical evaluator re-rates** after seeing the code: export the survey answers (CSV) and send them | Recomputes Tables 4-14 to 4-18 and updates Chapters 3 to 5 and the slides |
| P12 | **If more people answer the survey** (evaluators, tenants): send the new CSV | Same: every table and every count of respondents (now 6) |

---

## For the team to study (written 16 October 2026)

- `STUDY_GUIDE_TEAM_REVIEWER.md`: the whole capstone in one sitting, the numbers to know, a tour of
  every screen, tips for the defense and the demo, and a 25-question self-quiz.
- `STUDY_GUIDE_DEFENSE_QA.md`: the panel's likely questions, each with a short answer and the section
  or table that proves it, including the hard ones.
